import { notify } from "../notify";

const DEFAULT_INTERVAL_MS = 6000;

function titleForEvent(ev) {
	const title = (ev?.errandTitle || "").trim();
	if (title) return title;
	const ref = (ev?.referenceNumber || "").trim();
	if (ref) return ref;
	return ev?.errandId ? `Errand ${ev.errandId}` : "Errand";
}

function humanizeStatus(value) {
	const text = String(value || "").trim();
	if (!text) return "updated";
	return text
		.replace(/_/g, " ")
		.replace(/\s+/g, " ")
		.toLowerCase()
		.replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildToastForTimelineEvent(ev) {
	const title = titleForEvent(ev);
	const type = String(ev?.eventType || "status_update");
	const newStatus = ev?.newStatus ? String(ev.newStatus) : null;
	const note = typeof ev?.note === "string" ? ev.note.trim() : "";
	const noteSuffix = note ? ` - ${note.length > 120 ? `${note.slice(0, 117)}…` : note}` : "";

	// Reduce duplicate noise: the global errands list polling already toasts these.
	const alreadyToastedStatuses = new Set(["assigned", "accepted", "completed"]);

	switch (type) {
		case "pilot_started":
			return {
				message: `🚀 Operator started: "${title}"${noteSuffix}`,
				level: "info",
			};
		case "pilot_completed":
			return {
				message: `✅ Operator completed: "${title}"${noteSuffix}`,
				level: "success",
			};
		case "admin_attachment_approved":
			return {
				message: `✅ Document approved for "${title}"${noteSuffix}`,
				level: "success",
			};
		case "admin_attachment_rejected":
			return {
				message: `⚠️ Document rejected for "${title}"${noteSuffix}`,
				level: "warning",
			};
		case "issue_reported":
			return {
				message: `⚠️ Issue reported for "${title}"${noteSuffix}`,
				level: "warning",
			};
		case "admin_cancelled":
		case "client_cancelled":
			return {
				message: `🛑 Errand cancelled: "${title}"${noteSuffix}`,
				level: "warning",
			};
		case "status_update":
		default: {
			if (newStatus) {
				const key = String(newStatus).trim().toLowerCase();
				if (alreadyToastedStatuses.has(key)) return null;
				return {
					message: `Update: "${title}" is now ${humanizeStatus(newStatus)}${noteSuffix}`,
					level: key === "cancelled" ? "warning" : key === "delivered" ? "success" : "info",
				};
			}
			return {
				message: `Update on "${title}"${noteSuffix}`,
				level: "info",
			};
		}
	}
}

async function fetchTimelineEvents({
	apiBaseUrl,
	token,
	errandsFilterIds,
	sinceId,
	limit,
	order,
}) {
	const url = `${apiBaseUrl}/graphql`;
	const query = `query Timeline($sinceId: Int, $errandIds: [Int!], $limit: Int!, $order: SortOrder!) {\n  errandTimelineEvents(sinceId: $sinceId, errandIds: $errandIds, limit: $limit, order: $order) {\n    id\n    errandId\n    referenceNumber\n    errandTitle\n    eventType\n    oldStatus\n    newStatus\n    note\n    createdAt\n    userId\n  }\n}`;

	let safeLimit = 50;
	try {
		safeLimit = Number.parseInt(String(limit ?? 50), 10);
	} catch {
		safeLimit = 50;
	}
	if (!Number.isFinite(safeLimit)) safeLimit = 50;
	safeLimit = Math.max(1, Math.min(safeLimit, 200));

	const safeOrder = String(order || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
	const safeErrandIds = Array.isArray(errandsFilterIds) && errandsFilterIds.length
		? errandsFilterIds
		: null;

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({
			query,
			variables: {
				sinceId: sinceId ?? null,
				errandIds: safeErrandIds,
				limit: safeLimit,
				order: safeOrder,
			},
		}),
	});

	if (res.status === 401) {
		const err = new Error("Unauthorized");
		err.code = 401;
		throw err;
	}

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Activity poll failed (${res.status}): ${text}`);
	}

	const payload = await res.json();
	if (payload?.errors?.length) {
		throw new Error(
			payload.errors[0]?.message || "Activity poll GraphQL error",
		);
	}

	return payload?.data?.errandTimelineEvents || [];
}

export function createErrandActivityPoller({
	apiBaseUrl,
	getAuthToken,
	getErrandIds,
	getEnabled,
	onEvents,
	emitToasts = true,
	allowEmptyErrandIds = false,
	intervalMs = DEFAULT_INTERVAL_MS,
}) {
	let timer = null;
	let stopped = true;
	let inFlight = false;
	let queued = false;
	let sinceId = null;
	let primed = false;

	const emitToastsForEvents = (events) => {
		for (const ev of events || []) {
			const toast = buildToastForTimelineEvent(ev);
			if (!toast?.message) continue;
			notify(toast.message, {
				type: toast.level || "info",
				dedupeKey:
					ev?.id && ev?.errandId
						? `timeline:${String(ev.errandId)}:${String(ev.id)}`
						: undefined,
			});
		}
	};

	const emitEventsCallback = (events) => {
		if (typeof onEvents !== "function") return;
		try {
			onEvents(events || []);
		} catch (err) {
			// eslint-disable-next-line no-console
			console.warn("activity poll onEvents error", err);
		}
	};

	const tick = async () => {
		if (stopped) return;
		if (inFlight) {
			queued = true;
			return;
		}

		const enabled = typeof getEnabled === "function" ? !!getEnabled() : false;
		if (!enabled) return;

		const idsRaw = typeof getErrandIds === "function" ? getErrandIds() : [];
		// If getErrandIds returns null/undefined, interpret it as "no filter".
		// This enables admin/global polling (backend access-controlled).
		const watchAll = idsRaw == null;
		const ids = watchAll ? [] : (idsRaw || []);
		const uniqIds = Array.from(new Set((ids || []).filter(Boolean).map(String)));
		if (!watchAll && !uniqIds.length && !allowEmptyErrandIds) return;

		const token = typeof getAuthToken === "function" ? getAuthToken() : null;

		inFlight = true;
		try {
			// First tick after enabling: prime sinceId to the latest event id
			// so we don't replay existing history as "new" toasts.
			if (!primed) {
				const latest = await fetchTimelineEvents({
					apiBaseUrl,
					token,
					errandsFilterIds: watchAll
						? null
						: uniqIds.map((id) => Number(id)).filter(Number.isFinite),
					sinceId: null,
					limit: 1,
					order: "DESC",
				});
				const latestId = latest?.[0]?.id;
				sinceId = Number.isFinite(latestId) ? Number(latestId) : 0;
				primed = true;
				return;
			}

			const events = await fetchTimelineEvents({
				apiBaseUrl,
				token,
				errandsFilterIds: watchAll
					? null
					: uniqIds.map((id) => Number(id)).filter(Number.isFinite),
				sinceId,
				limit: 50,
				order: "ASC",
			});

			if (events?.length) {
				if (emitToasts) emitToastsForEvents(events);
				emitEventsCallback(events);
				const maxId = Math.max(
					sinceId || 0,
					...events.map((ev) => Number(ev?.id || 0)).filter(Number.isFinite),
				);
				sinceId = maxId;
			}
		} catch (err) {
			if (err?.code !== 401) {
				// eslint-disable-next-line no-console
				console.warn("activity poll error", err);
			}
		} finally {
			inFlight = false;
			if (!stopped && queued) {
				queued = false;
				void tick();
			}
		}
	};

	const start = () => {
		if (!stopped) return;
		if (typeof window === "undefined") return;
		if (typeof setInterval !== "function") return;
		stopped = false;
		void tick();
		timer = setInterval(() => void tick(), intervalMs);
	};

	const stop = () => {
		stopped = true;
		if (typeof window === "undefined") return;
		if (typeof clearInterval !== "function") return;
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	};

	const resetSnapshot = () => {
		sinceId = null;
		primed = false;
	};

	return { start, stop, resetSnapshot };
}
