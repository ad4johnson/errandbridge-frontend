import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
	ADMIN_DISPATCH_DISABLED,
	ADMIN_DISPATCH_ENABLED,
	ADMIN_DISPATCH_PERMANENTLY_DISABLED,
} from "./pilotDispatchState";
import "./AdminDashboardModal.css";

export const formatAdminFileSize = (value) => {
	const bytes = Number(value);
	if (!Number.isFinite(bytes) || bytes <= 0) return "-";
	if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
	if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${bytes} B`;
};

const VISIT_MAP_WIDTH = 920;
const VISIT_MAP_HEIGHT = 440;

const COUNTRY_CENTROIDS = {
	AE: { lat: 24.35, lng: 53.85 },
	AU: { lat: -25.27, lng: 133.77 },
	CA: { lat: 56.13, lng: -106.35 },
	DE: { lat: 51.17, lng: 10.45 },
	ES: { lat: 40.46, lng: -3.75 },
	FR: { lat: 46.22, lng: 2.21 },
	GB: { lat: 55.38, lng: -3.44 },
	GH: { lat: 7.95, lng: -1.02 },
	IE: { lat: 53.14, lng: -7.69 },
	IN: { lat: 20.59, lng: 78.96 },
	KE: { lat: -0.02, lng: 37.91 },
	NG: { lat: 9.08, lng: 8.68 },
	NL: { lat: 52.13, lng: 5.29 },
	QA: { lat: 25.35, lng: 51.18 },
	SA: { lat: 23.89, lng: 45.08 },
	US: { lat: 39.83, lng: -98.58 },
	ZA: { lat: -30.56, lng: 22.94 },
};

const CITY_COORDINATES = {
	"abuja||NG": { lat: 9.0765, lng: 7.3986 },
	"accra||GH": { lat: 5.6037, lng: -0.187 },
	"badagry|lagos|NG": { lat: 6.415, lng: 2.8813 },
	"benin city|edo|NG": { lat: 6.335, lng: 5.6037 },
	"birmingham||GB": { lat: 52.4862, lng: -1.8904 },
	"canary wharf|london|GB": { lat: 51.5054, lng: -0.0235 },
	"dubai||AE": { lat: 25.2048, lng: 55.2708 },
	"ibadan|oyo|NG": { lat: 7.3775, lng: 3.947 },
	"ikeja|lagos|NG": { lat: 6.6018, lng: 3.3515 },
	"ilorin|kwara|NG": { lat: 8.4966, lng: 4.5421 },
	"ikorodu|lagos|NG": { lat: 6.6194, lng: 3.5105 },
	"lagos||NG": { lat: 6.5244, lng: 3.3792 },
	"lagos|lagos|NG": { lat: 6.5244, lng: 3.3792 },
	"lekki|lagos|NG": { lat: 6.4698, lng: 3.5852 },
	"london||GB": { lat: 51.5072, lng: -0.1276 },
	"manchester||GB": { lat: 53.4808, lng: -2.2426 },
	"new york||US": { lat: 40.7128, lng: -74.006 },
	"port harcourt|rivers|NG": { lat: 4.8156, lng: 7.0498 },
	"toronto||CA": { lat: 43.6532, lng: -79.3832 },
	"victoria island|lagos|NG": { lat: 6.4281, lng: 3.4219 },
	"yaba|lagos|NG": { lat: 6.5095, lng: 3.3711 },
};

const normalizeVisitMapText = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");

const buildVisitMapKey = (entry = {}) => {
	const city = normalizeVisitMapText(entry.city);
	const region = normalizeVisitMapText(entry.region);
	const country = String(entry.country || "").trim().toUpperCase();
	return `${city}|${region}|${country}`;
};

const resolveVisitMapCoordinates = (entry = {}) => {
	const cityKey = buildVisitMapKey(entry);
	if (CITY_COORDINATES[cityKey]) return CITY_COORDINATES[cityKey];

	const country = String(entry.country || "").trim().toUpperCase();
	return COUNTRY_CENTROIDS[country] || null;
};

const projectVisitMapCoordinates = ({ lat, lng }) => ({
	x: ((Number(lng) + 180) / 360) * VISIT_MAP_WIDTH,
	y: ((90 - Number(lat)) / 180) * VISIT_MAP_HEIGHT,
});

const sortByNewestFirst = (items = []) =>
	[...(Array.isArray(items) ? items : [])].sort((a, b) => {
		const timeB = new Date(b?.created_at || b?.createdAt || 0).getTime();
		const timeA = new Date(a?.created_at || a?.createdAt || 0).getTime();
		if (timeB !== timeA) return timeB - timeA;
		return Number(b?.id || 0) - Number(a?.id || 0);
	});

export function groupPilotDocumentsByPilot(items = []) {
	const groups = new Map();
	for (const doc of sortByNewestFirst(items)) {
		const key = String(doc?.pilot_email || doc?.pilot_name || doc?.pilot_id || doc?.id || "pilot");
		if (!groups.has(key)) {
			groups.set(key, {
				key,
				pilotId: doc?.pilot_id ?? null,
				pilotName: doc?.pilot_name || "Pilot",
				pilotEmail: doc?.pilot_email || "",
				documents: [],
			});
		}
		groups.get(key).documents.push(doc);
	}
	return [...groups.values()];
}

export function groupAdminAttachmentsByOwner(items = []) {
	const groups = new Map();
	for (const attachment of sortByNewestFirst(items)) {
		const key = String(
			attachment?.owner_email || attachment?.owner_name || attachment?.user_id || attachment?.id || "owner",
		);
		if (!groups.has(key)) {
			groups.set(key, {
				key,
				userId: attachment?.user_id ?? null,
				ownerName: attachment?.owner_name || attachment?.owner_email || `User #${attachment?.user_id ?? "-"}`,
				ownerEmail: attachment?.owner_email || "",
				attachments: [],
			});
		}
		groups.get(key).attachments.push(attachment);
	}
	return [...groups.values()];
}

export const getAdminIssueDisplay = (issue = {}) => ({
	id: issue?.errand_id ?? issue?.id ?? null,
	referenceNumber: issue?.reference_number || null,
	reason: issue?.issue_reason || issue?.type || "Reported issue",
	notes: issue?.issue_notes || issue?.description || "No details provided.",
	status: issue?.issue_status || issue?.status || "open",
	errandStatus: issue?.errand_status || "-",
	reportedAt: issue?.issue_reported_at || issue?.created_at || null,
	preferredResolution: issue?.issue_preferred_resolution || null,
});

const ADMIN_ERRAND_FILTERS = [
	{ key: "all", label: "All" },
	{ key: "pending", label: "Pending" },
	{ key: "assigned", label: "Assigned" },
	{ key: "in_progress", label: "In Progress" },
	{ key: "cancelled", label: "Cancelled" },
];

const ADMIN_ERRAND_SORT_OPTIONS = [{ key: "newest", label: "Newest first" }];

const ADMIN_ERRAND_GROUP_ORDER = {
	pending: 0,
	assigned: 1,
	in_progress: 2,
	cancelled: 3,
};

export const normalizeAdminErrandStatus = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");

export const formatAdminErrandQueueNumber = (index) =>
	`#${String(Number(index) + 1).padStart(4, "0")}`;

export const getAdminErrandGroupKey = (statusKey) => {
	if (["pending", "submitted"].includes(statusKey)) return "pending";
	if (["assigned", "approved", "accepted"].includes(statusKey)) return "assigned";
	if (["in_progress", "picked_up", "in_transit", "delivered"].includes(statusKey)) {
		return "in_progress";
	}
	if (statusKey === "completed") return "completed";
	if (statusKey === "cancelled") return "cancelled";
	return "pending";
};

export const getAdminErrandStatusMeta = (statusKey) => {
	switch (statusKey) {
		case "pending":
		case "submitted":
			return { label: "Pending", tone: "pending" };
		case "assigned":
		case "approved":
			return { label: "Assigned", tone: "assigned" };
		case "accepted":
			return { label: "Accepted", tone: "assigned" };
		case "in_progress":
			return { label: "In Progress", tone: "active" };
		case "picked_up":
			return { label: "Picked up", tone: "active" };
		case "in_transit":
			return { label: "In transit", tone: "active" };
		case "delivered":
			return { label: "Delivered", tone: "active" };
		case "completed":
			return { label: "Completed", tone: "completed" };
		case "cancelled":
			return { label: "Cancelled", tone: "cancelled" };
		default:
			return {
				label: String(statusKey || "Unknown").replace(/_/g, " "),
				tone: "pending",
			};
	}
};

const truncateAdminErrandSummary = (value, maxLength = 150) => {
	const text = String(value || "").trim().replace(/\s+/g, " ");
	if (!text) return "";
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

const formatAdminErrandDate = (value) => {
	if (!value) return "-";
	const ts = new Date(value).getTime();
	if (!Number.isFinite(ts)) return "-";
	return new Date(value).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
};

const buildAdminErrandPilotLookup = (pilots = []) =>
	new Map(
		(Array.isArray(pilots) ? pilots : [])
			.map((pilot) => [Number(pilot?.id), pilot])
			.filter(([id]) => Number.isFinite(id)),
	);

const getAdminErrandPilotLabel = (errand, pilotLookup) => {
	const directName = String(errand?.pilot_name || "").trim();
	if (directName) return directName;

	const pilot = pilotLookup.get(Number(errand?.pilot_id));
	if (pilot) {
		const fullName = `${pilot.first_name || ""} ${pilot.last_name || ""}`.trim();
		return fullName || pilot.email || `Pilot #${pilot.id}`;
	}

	if (errand?.pilot_email) return errand.pilot_email;
	return "Unassigned";
};

const buildAdminErrandSearchText = (errand, pilotLookup) =>
	[
		errand?.title,
		errand?.reference_number,
		errand?.referenceNumber,
		errand?.customer_name,
		errand?.customer_email,
		errand?.customer_phone,
		getAdminErrandPilotLabel(errand, pilotLookup),
		errand?.pilot_email,
		errand?.pickup_location,
		errand?.dropoff_location,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

export const buildAdminErrandQueue = ({
	errands = [],
	pilots = [],
	statusFilter = "all",
	sortKey = "newest",
	searchQuery = "",
}) => {
	const pilotLookup = buildAdminErrandPilotLookup(pilots);
	const queryTerms = String(searchQuery || "")
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean);

	return [...(Array.isArray(errands) ? errands : [])]
		.map((errand) => {
			const statusKey = normalizeAdminErrandStatus(errand?.status);
			const groupKey = getAdminErrandGroupKey(statusKey);
			const createdAt = errand?.created_at || errand?.createdAt || null;
			const createdAtMs = new Date(createdAt || 0).getTime();
			const reference =
				errand?.reference_number ||
				errand?.referenceNumber ||
				`#${errand?.id ?? "-"}`;

			return {
				errand,
				statusKey,
				groupKey,
				statusMeta: getAdminErrandStatusMeta(statusKey),
				reference,
				pilotLabel: getAdminErrandPilotLabel(errand, pilotLookup),
				searchText: buildAdminErrandSearchText(errand, pilotLookup),
				createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
				summary: truncateAdminErrandSummary(
					errand?.description || errand?.note || "",
				),
			};
		})
		.filter((item) => item.groupKey !== "completed")
		.filter((item) => statusFilter === "all" || item.groupKey === statusFilter)
		.filter((item) => queryTerms.every((term) => item.searchText.includes(term)))
		.sort((a, b) => {
			const groupDelta =
				(ADMIN_ERRAND_GROUP_ORDER[a.groupKey] ?? 99) -
				(ADMIN_ERRAND_GROUP_ORDER[b.groupKey] ?? 99);
			if (groupDelta !== 0) return groupDelta;

			if (sortKey === "newest" && b.createdAtMs !== a.createdAtMs) {
				return b.createdAtMs - a.createdAtMs;
			}

			return Number(b.errand?.id || 0) - Number(a.errand?.id || 0);
		})
		.map((item, index) => ({
			...item,
			queueNumber: formatAdminErrandQueueNumber(index),
		}));
};

const getPilotDispatchStatusKey = (pilot) => {
	const key = String(pilot?.admin_dispatch_status || ADMIN_DISPATCH_ENABLED)
		.trim()
		.toLowerCase();
	if (key === ADMIN_DISPATCH_DISABLED) return ADMIN_DISPATCH_DISABLED;
	if (key === ADMIN_DISPATCH_PERMANENTLY_DISABLED) {
		return ADMIN_DISPATCH_PERMANENTLY_DISABLED;
	}
	return ADMIN_DISPATCH_ENABLED;
};

const normalizeAdminLocationText = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const normalizeAdminSupportType = (value) => {
	const raw = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, "_");
	if (["standard_assistance", "standard", "foot"].includes(raw)) {
		return "standard_assistance";
	}
	if (
		[
			"bike_support",
			"bike",
			"bicycle",
			"motorbike",
			"motorcycle",
			"scooter",
		].includes(raw)
	) {
		return "bike_support";
	}
	if (["car_support", "car", "vehicle"].includes(raw)) {
		return "car_support";
	}
	return "flexible";
};

const normalizeAdminVehicleType = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, "_");

const pilotHasBikeSupport = (pilot) => {
	const vehicleType = normalizeAdminVehicleType(pilot?.vehicle_type);
	return Boolean(
		pilot?.hasBike ||
		pilot?.has_bike ||
		[
			"bike",
			"bike_support",
			"bicycle",
			"motorbike",
			"motorcycle",
			"scooter",
		].includes(vehicleType),
	);
};

const pilotHasCarSupport = (pilot) => {
	const vehicleType = normalizeAdminVehicleType(pilot?.vehicle_type);
	return Boolean(
		pilot?.hasCar ||
		pilot?.has_car ||
		["car", "saloon", "sedan", "suv", "van", "truck"].includes(vehicleType),
	);
};

const pilotHasCrossCityAccess = (pilot) =>
	Boolean(pilot?.crossCityAvailable || pilot?.cross_city_available);

const getPilotServiceRadiusKm = (pilot) => {
	const raw =
		pilot?.serviceRadius || pilot?.service_radius_km || pilot?.service_radius || null;
	const numeric = Number(raw);
	return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getPilotServiceAreaText = (pilot) => {
	const city = normalizeAdminLocationText(pilot?.city);
	if (city) return city;
	return normalizeAdminLocationText(pilot?.state_province || pilot?.state);
};

const getPilotAvailabilityKey = (pilot) =>
	String(pilot?.availability || pilot?.pilot_availability || "offline")
		.trim()
		.toLowerCase();

const getErrandLocationHaystack = (errand) =>
	normalizeAdminLocationText(
		[errand?.pickup_location, errand?.dropoff_location].filter(Boolean).join(" "),
	);

const getErrandDistanceKm = (errand) => {
	const numeric = Number(errand?.distance_km);
	return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const evaluatePilotErrandFit = (errand, pilot) => {
	const supportType = normalizeAdminSupportType(errand?.support_type || errand?.supportType);
	const reasons = [];
	let isMatch = true;
	let score = 0;

	if (supportType === "bike_support") {
		if (!pilotHasBikeSupport(pilot)) {
			isMatch = false;
		} else {
			reasons.push("bike-ready");
			score += 40;
		}
	}

	if (supportType === "car_support") {
		if (!pilotHasCarSupport(pilot)) {
			isMatch = false;
		} else {
			reasons.push("car-ready");
			score += 40;
		}
	}

	const distanceKm = getErrandDistanceKm(errand);
	if (distanceKm != null) {
		const serviceRadiusKm = getPilotServiceRadiusKm(pilot);
		if (serviceRadiusKm != null) {
			if (distanceKm > serviceRadiusKm) {
				isMatch = false;
			} else {
				reasons.push(`${Math.round(serviceRadiusKm)}km radius`);
				score += 10;
			}
		}
		if (distanceKm > 30) {
			if (!pilotHasCrossCityAccess(pilot)) {
				isMatch = false;
			} else {
				reasons.push("cross-city enabled");
				score += 12;
			}
		}
	}

	const serviceArea = getPilotServiceAreaText(pilot);
	const locationHaystack = getErrandLocationHaystack(errand);
	if (!serviceArea || !locationHaystack || !locationHaystack.includes(serviceArea)) {
		isMatch = false;
	} else {
		reasons.push(`${serviceArea} area`);
		score += 30;
	}

	if (supportType === "standard_assistance" || supportType === "flexible") {
		score += 8;
		if (supportType === "flexible") {
			reasons.push("flexible support");
		}
	}

	return {
		isMatch,
		reasons: reasons.filter(Boolean),
		score,
		supportType,
	};
};

export const rankPilotsForErrandAssignment = ({
	errand,
	pilots = [],
	activePilotIds = new Set(),
}) => {
	const activeIds = activePilotIds instanceof Set ? activePilotIds : new Set(activePilotIds || []);
	return [...(Array.isArray(pilots) ? pilots : [])]
		.map((pilot) => {
			const fit = evaluatePilotErrandFit(errand, pilot);
			const rating = Number(pilot?.rating ?? 0);
			const isDispatchEnabled =
				getPilotDispatchStatusKey(pilot) === ADMIN_DISPATCH_ENABLED;
			const isOnline = getPilotAvailabilityKey(pilot) === "online";
			const isActive = activeIds.has(Number(pilot?.id));
			return {
				pilot,
				fit,
				rating: Number.isFinite(rating) ? rating : 0,
				isDispatchEnabled,
				isOnline,
				isActive,
			};
		})
		.sort((a, b) => {
			if (a.isDispatchEnabled !== b.isDispatchEnabled) {
				return a.isDispatchEnabled ? -1 : 1;
			}
			if (a.fit.isMatch !== b.fit.isMatch) {
				return a.fit.isMatch ? -1 : 1;
			}
			if (a.isActive !== b.isActive) {
				return a.isActive ? 1 : -1;
			}
			if (a.isOnline !== b.isOnline) {
				return a.isOnline ? -1 : 1;
			}
			if (a.fit.score !== b.fit.score) {
				return b.fit.score - a.fit.score;
			}
			if (a.rating !== b.rating) {
				return b.rating - a.rating;
			}
			return Number(a.pilot?.id || 0) - Number(b.pilot?.id || 0);
		});
};

export const getSuggestedPilotForErrand = ({
	errand,
	pilots = [],
	activePilotIds = new Set(),
}) => {
	const ranked = rankPilotsForErrandAssignment({ errand, pilots, activePilotIds });
	return (
		ranked.find(
			(entry) => entry.isDispatchEnabled && entry.fit.isMatch && !entry.isActive,
		) ||
		ranked.find((entry) => entry.isDispatchEnabled && entry.fit.isMatch) ||
		ranked.find((entry) => entry.isDispatchEnabled && !entry.isActive) ||
		ranked[0] ||
		null
	);
};

const getPilotDispatchTone = (status) => {
	if (status === ADMIN_DISPATCH_PERMANENTLY_DISABLED) {
		return {
			label: "Blocked",
			chipBackground: "#fef2f2",
			chipBorder: "#fecaca",
			chipText: "#991b1b",
			switchBackground: "#e5e7eb",
			switchThumbTransform: "translateX(0)",
		};
	}
	if (status === ADMIN_DISPATCH_DISABLED) {
		return {
			label: "Disabled",
			chipBackground: "#fffbeb",
			chipBorder: "#fde68a",
			chipText: "#92400e",
			switchBackground: "#cbd5e1",
			switchThumbTransform: "translateX(0)",
		};
	}
	return {
		label: "Enabled",
		chipBackground: "#f0fdf4",
		chipBorder: "#bbf7d0",
		chipText: "#166534",
		switchBackground: "#22c55e",
		switchThumbTransform: "translateX(20px)",
	};
};

function AdminPilotDispatchControl({
	pilot,
	handleUpdatePilotDispatchStatus,
	runButtonAction,
	isButtonBusy,
	renderBusyButtonContent,
}) {
	const dispatchStatus = getPilotDispatchStatusKey(pilot);
	const dispatchTone = getPilotDispatchTone(dispatchStatus);
	const pilotName = `${pilot?.first_name || ""} ${pilot?.last_name || ""}`.trim() || pilot?.email || `Pilot #${pilot?.id}`;
	const toggleKey = `pilot-dispatch-toggle-${pilot?.id}`;
	const blockKey = `pilot-dispatch-block-${pilot?.id}`;
	const restoreKey = `pilot-dispatch-restore-${pilot?.id}`;
	const isBlocked = dispatchStatus === ADMIN_DISPATCH_PERMANENTLY_DISABLED;
	const isEnabled = dispatchStatus === ADMIN_DISPATCH_ENABLED;
	const toggleBusy = isButtonBusy(toggleKey);
	const toggleAction = isEnabled ? "disable" : "enable";
	const toggleBusyLabel = isEnabled ? "Disabling…" : "Enabling…";

	return (
		<div style={{ display: "grid", gap: 8, minWidth: 0 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						padding: "4px 9px",
						borderRadius: 999,
						fontSize: 11,
						fontWeight: 800,
						background: dispatchTone.chipBackground,
						border: `1px solid ${dispatchTone.chipBorder}`,
						color: dispatchTone.chipText,
					}}
				>
					{dispatchTone.label}
				</span>
				<button
					type="button"
					role="switch"
					aria-checked={isEnabled}
					aria-label={`Dispatch access for ${pilotName}`}
					disabled={isBlocked || toggleBusy}
					onClick={() =>
						void runButtonAction(
							toggleKey,
							() => handleUpdatePilotDispatchStatus?.(pilot.id, toggleAction),
							{ busyLabel: toggleBusyLabel },
						)
					}
					style={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 8,
						minWidth: 100,
						padding: "5px 8px 5px 10px",
						borderRadius: 999,
						border: "1px solid #d1d5db",
						background: isBlocked ? "#f8fafc" : "#ffffff",
						color: "#0f172a",
						cursor: isBlocked || toggleBusy ? "not-allowed" : "pointer",
						opacity: isBlocked ? 0.72 : toggleBusy ? 0.86 : 1,
						fontSize: 11,
						fontWeight: 800,
					}}
				>
					<span style={{ whiteSpace: "nowrap" }}>
						{toggleBusy
							? toggleBusyLabel
							: isBlocked
								? "Locked"
								: isEnabled
									? "On"
									: "Off"}
					</span>
					<span
						aria-hidden="true"
						style={{
							position: "relative",
							width: 42,
							height: 22,
							borderRadius: 999,
							background: dispatchTone.switchBackground,
							transition: "background 0.2s ease",
							flexShrink: 0,
						}}
					>
						<span
							style={{
								position: "absolute",
								top: 2,
								left: 2,
								width: 18,
								height: 18,
								borderRadius: 999,
								background: "#ffffff",
								boxShadow: "0 4px 10px rgba(15, 23, 42, 0.18)",
								transform: dispatchTone.switchThumbTransform,
								transition: "transform 0.2s ease",
							}}
						/>
					</span>
				</button>
			</div>
			<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
				{isBlocked ? (
					<button
						type="button"
						onClick={() =>
							void runButtonAction(
								restoreKey,
								() => handleUpdatePilotDispatchStatus?.(pilot.id, "enable"),
								{ busyLabel: "Restoring…" },
							)
						}
						disabled={isButtonBusy(restoreKey)}
						style={{
							padding: "5px 9px",
							borderRadius: 8,
							border: "1px solid #bbf7d0",
							background: "#f0fdf4",
							color: "#166534",
							fontSize: 11,
							fontWeight: 800,
							cursor: isButtonBusy(restoreKey) ? "not-allowed" : "pointer",
							opacity: isButtonBusy(restoreKey) ? 0.82 : 1,
						}}
					>
						{renderBusyButtonContent(restoreKey, "Restore", "Restoring…")}
					</button>
				) : (
					<button
						type="button"
						onClick={() =>
							void runButtonAction(
								blockKey,
								() => handleUpdatePilotDispatchStatus?.(pilot.id, "permanently_disable"),
								{ busyLabel: "Blocking…" },
							)
						}
						disabled={isButtonBusy(blockKey)}
						style={{
							padding: "5px 9px",
							borderRadius: 8,
							border: "1px solid #fecaca",
							background: "#fff",
							color: "#b91c1c",
							fontSize: 11,
							fontWeight: 800,
							cursor: isButtonBusy(blockKey) ? "not-allowed" : "pointer",
							opacity: isButtonBusy(blockKey) ? 0.82 : 1,
						}}
					>
						{renderBusyButtonContent(blockKey, "Block", "Blocking…")}
					</button>
				)}
			</div>
		</div>
	);
}

function AdminPilotDispatchPolicyControls({
	policy,
	handleUpdatePilotDispatchPolicy,
	runButtonAction,
	isButtonBusy,
	renderBusyButtonContent,
}) {
	const showAllJobs = Boolean(policy?.show_all_jobs_to_pilots);
	const radiusMiles = Number(policy?.open_pool_radius_miles || 5);
	const allowedRadiusOptions = Array.isArray(policy?.allowed_open_pool_radius_miles)
		? policy.allowed_open_pool_radius_miles
		: [5, 10, 15, 20];
	const visibilityToggleKey = "pilot-dispatch-policy-visibility";

	return (
		<section
			aria-label="Pilot dispatch policy"
			style={{
				display: "grid",
				gap: 12,
				padding: 14,
				margin: "12px 12px 0 12px",
				background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
				border: "1px solid #dbeafe",
				borderRadius: 16,
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
				<div style={{ display: "grid", gap: 4 }}>
					<p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#4338ca", textTransform: "uppercase", letterSpacing: "0.04em" }}>
						Pilot dispatch policy
					</p>
					<h3 style={{ margin: 0, fontSize: 17, color: "#0f172a" }}>Global visibility and radius controls</h3>
					<p style={{ margin: 0, fontSize: 13, color: "#475569", maxWidth: 620 }}>
						When enabled, pilots can see all open-pool errands but still cannot accept errands that fail city/service-area or radius policies. Dedicated admin-assigned errands remain actionable.
					</p>
				</div>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						padding: "8px 12px",
						borderRadius: 999,
						background: showAllJobs ? "#dcfce7" : "#e2e8f0",
						color: showAllJobs ? "#166534" : "#334155",
						fontSize: 12,
						fontWeight: 800,
					}}
				>
					{showAllJobs ? "Show-all visibility enabled" : "Matching-only visibility"}
				</div>
			</div>

			<div style={{ display: "grid", gap: 8 }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
					<div style={{ display: "grid", gap: 3 }}>
						<strong style={{ fontSize: 13, color: "#0f172a" }}>Pilot can see all jobs</strong>
						<span style={{ fontSize: 12, color: "#64748b" }}>
							Pilots still need to satisfy dispatch policy before they can accept.
						</span>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={showAllJobs}
						aria-label="Pilot can see all jobs"
						onClick={() =>
							void runButtonAction(
								visibilityToggleKey,
								() =>
									handleUpdatePilotDispatchPolicy?.({
										show_all_jobs_to_pilots: !showAllJobs,
									}),
								{ busyLabel: showAllJobs ? "Disabling…" : "Enabling…" },
							)
						}
						disabled={isButtonBusy(visibilityToggleKey)}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 10,
							padding: "6px 10px",
							borderRadius: 999,
							border: "1px solid #cbd5e1",
							background: "#fff",
							cursor: isButtonBusy(visibilityToggleKey) ? "not-allowed" : "pointer",
							opacity: isButtonBusy(visibilityToggleKey) ? 0.82 : 1,
						}}
					>
						<span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
							{renderBusyButtonContent(
								visibilityToggleKey,
								showAllJobs ? "On" : "Off",
								showAllJobs ? "Disabling…" : "Enabling…",
							)}
						</span>
						<span
							aria-hidden="true"
							style={{
								position: "relative",
								width: 42,
								height: 22,
								borderRadius: 999,
								background: showAllJobs ? "#22c55e" : "#cbd5e1",
							}}
						>
							<span
								style={{
									position: "absolute",
									top: 2,
									left: 2,
									width: 18,
									height: 18,
									borderRadius: 999,
									background: "#fff",
									boxShadow: "0 4px 10px rgba(15, 23, 42, 0.18)",
									transform: showAllJobs ? "translateX(20px)" : "translateX(0)",
									transition: "transform 0.2s ease",
								}}
							/>
						</span>
					</button>
				</div>

				<div style={{ display: "grid", gap: 6 }}>
					<div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
						<div style={{ display: "grid", gap: 3 }}>
							<strong style={{ fontSize: 13, color: "#0f172a" }}>Open-pool dispatch radius</strong>
							<span style={{ fontSize: 12, color: "#64748b" }}>
								Pilots may still see more jobs when visibility is enabled, but open-pool acceptance is locked to this radius.
							</span>
						</div>
						<div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>
							Current: {radiusMiles} miles
						</div>
					</div>
					<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
						{allowedRadiusOptions.map((radiusOption) => {
							const radiusKey = `pilot-dispatch-policy-radius-${radiusOption}`;
							const isActive = radiusMiles === Number(radiusOption);
							return (
								<button
									key={radiusOption}
									type="button"
									onClick={() =>
										void runButtonAction(
											radiusKey,
											() =>
												handleUpdatePilotDispatchPolicy?.({
													open_pool_radius_miles: radiusOption,
												}),
											{ busyLabel: "Updating…" },
										)
									}
									disabled={isButtonBusy(radiusKey)}
									style={{
										padding: "8px 12px",
										borderRadius: 10,
										border: `1px solid ${isActive ? "#4f46e5" : "#cbd5e1"}`,
										background: isActive ? "#eef2ff" : "#fff",
										color: isActive ? "#3730a3" : "#334155",
										fontSize: 12,
										fontWeight: 800,
										cursor: isButtonBusy(radiusKey) ? "not-allowed" : "pointer",
										opacity: isButtonBusy(radiusKey) ? 0.82 : 1,
									}}
								>
									{renderBusyButtonContent(radiusKey, `${radiusOption} mi`, "Updating…")}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}

const AdminDashboardModal = ({
	open,
	onClose,
	apiBaseUrl,
	authToken,
	state,
	setters,
	actions,
	helpers,
}) => {
	const {
		adminTab,
		adminLoading,
		adminCustomerSearch,
		adminCustomerFilter,
		adminCustomers,
		adminSelectedCustomerIds,
		adminCustomerCardId,
		adminPilotDispatchPolicy,
		adminErrandsList,
		adminPilots,
		adminPilotAssignments,
		adminArchivedErrands,
		adminPromoCodes,
		adminAttachmentNotice,
		adminPilotDocuments,
		adminPilotEmploymentApplications,
		adminAttachments,
		adminIncidents,
		selectedIncident,
		adminIncidentMessages,
		incidentUpdateDraft,
		incidentNotifyCustomer,
		incidentUpdateSending,
		adminSupportConversations,
		selectedSupportConversation,
		adminSupportMessages,
		supportReplyDraft,
		supportReplySending,
		adminAvailabilityEvents,
		adminIssues,
		adminStats,
		adminCallSessions,
		selectedCallSession,
		adminCallEvents,
		adminStatsRefreshing,
	} = state;

	const {
		setAdminTab,
		setAdminCustomerSearch,
		setAdminCustomerFilter,
		setAdminSelectedCustomerIds,
		setAdminCustomerCardId,
		setAdminPilotAssignments,
		setAdminAttachmentNotice,
		setIncidentUpdateDraft,
		setIncidentNotifyCustomer,
		setSupportReplyDraft,
		setSelectedCallSession,
	} = setters;

	const {
		handlePurgeUnverifiedCustomers,
		handleDeleteCustomer,
		handleBulkDeleteCustomers,
		handleNavigateAdminTab,
		handleSelectErrandDetail,
		handleAssignPilotToErrand,
		handleUpdatePilotDispatchStatus,
		handleUpdatePilotDispatchPolicy,
		handleDeleteErrand,
		handleAssignErrand,
		handleApproveErrand,
		handleCompleteErrand,
		handleDownloadPilotDocument,
		handleViewPilotDocument,
		handleReviewPilotDocument,
		handleDownloadPilotEmploymentAttachment,
		handleViewPilotEmploymentAttachment,
		handleDownloadAdminAttachment,
		handleViewAdminAttachment,
		handleReviewAttachment,
		handleSelectIncident,
		loadIncidentMessages,
		handleResolveIncident,
		handleSendIncidentUpdate,
		handleSelectSupportConversation,
		loadSupportMessages,
		handleSendSupportMessage,
		handleResolveIssue,
		handleGeneratePromoCode,
	} = actions;

	const { getInitials, getAvatarColor } = helpers;

	const formatStatusStepLabel = (step) => {
		const key = String(step || "").toLowerCase();
		const map = {
			accepted: "Accepted",
			picked_up: "Errand Started",
			in_progress: "In Progress",
			delivered: "Delivered",
			completed: "Completed",
		};
		if (map[key]) return map[key];
		return String(step || "").replace(/_/g, " ");
	};

	const formatFunnelStageLabel = (stage) => {
		const key = String(stage || "").toLowerCase();
		if (key === "picked_up") return "Errand Started";
		return String(stage || "").replace(/_/g, " ");
	};

	const formatCountryLabel = useCallback((value) => {
		const raw = String(value || "").trim();
		if (!raw) return "Unknown";
		if (raw.toLowerCase() === "unknown") return "Unknown";
		const upper = raw.toUpperCase();
		if (/^[A-Z]{2}$/.test(upper)) {
			try {
				const dn = new Intl.DisplayNames(["en"], { type: "region" });
				return dn.of(upper) || upper;
			} catch {
				return upper;
			}
		}
		return raw;
	}, []);

	const formatLocationLabel = useCallback((entry) => {
		if (!entry) return "Unknown";
		const country = formatCountryLabel(entry.country);
		const region = String(entry.region || "").trim();
		const city = String(entry.city || "").trim();
		if (!region && !city) return country || "Unknown";
		return [city, region, country].filter(Boolean).join(" · ");
	}, [formatCountryLabel]);

	const STATUS_STEPS = [
		"accepted",
		"picked_up",
		"in_progress",
		"delivered",
		"completed",
	];

	const closeCustomerCardIfClickOutside = (event) => {
		if (!adminCustomerCardId) return;
		if (typeof setAdminCustomerCardId !== "function") return;
		const target = event?.target;
		if (target && typeof target.closest === "function") {
			if (target.closest("[data-admin-profile-card]")) return;
		}
		setAdminCustomerCardId(null);
	};

	const toggleCustomerSelection = (userId) => {
		if (!setAdminSelectedCustomerIds) return;
		setAdminSelectedCustomerIds((prev) => {
			const current = Array.isArray(prev) ? prev : [];
			const id = Number(userId);
			if (!Number.isFinite(id)) return current;
			return current.includes(id)
				? current.filter((v) => v !== id)
				: [...current, id];
		});
	};

	const clearCustomerSelection = () => {
		setAdminSelectedCustomerIds?.([]);
	};

	const incidentReference =
		selectedIncident?.errand_reference ||
		selectedIncident?.reference_number ||
		(selectedIncident?.errand_id
			? `#${selectedIncident.errand_id}`
			: "your errand");

	const visitCountries = adminStats?.visits_by_country || [];
	const visitLocations = adminStats?.visits_by_location || [];
	const visitLocations24h = useMemo(
		() => (Array.isArray(adminStats?.visits_last_24h_by_location) ? adminStats.visits_last_24h_by_location : []),
		[adminStats],
	);
	const recentVisits24h = useMemo(
		() => (Array.isArray(adminStats?.visits_recent_24h) ? adminStats.visits_recent_24h : []),
		[adminStats],
	);
	const visitSources = adminStats?.visits_by_source || [];
	const errandFunnel = adminStats?.errand_funnel || {};
	const funnelEntries = Object.entries(errandFunnel);

	const activePilotStatuses = new Set([
		"assigned",
		"accepted",
		"in_progress",
		"picked_up",
		"delivered",
	]);
	const activePilotIds = new Set(
		(adminErrandsList || [])
			.filter(
				(errand) =>
					errand?.pilot_id &&
					activePilotStatuses.has((errand.status || "").toLowerCase()),
			)
			.map((errand) => Number(errand.pilot_id))
			.filter((id) => Number.isFinite(id)),
	);
	const formatPilotAvailability = (pilot) =>
		String(pilot?.availability || "offline").toLowerCase() === "online"
			? "Online"
			: "Offline";
	const formatPilotDispatch = (pilot) => {
		const key = getPilotDispatchStatusKey(pilot);
		if (key === ADMIN_DISPATCH_PERMANENTLY_DISABLED) return "Blocked";
		if (key === ADMIN_DISPATCH_DISABLED) return "Disabled";
		return "Enabled";
	};

	const [archiveExpanded, setArchiveExpanded] = useState(true);
	const [expandedPilotDocumentGroups, setExpandedPilotDocumentGroups] = useState({});
	const [expandedAttachmentGroups, setExpandedAttachmentGroups] = useState({});
	const [adminErrandStatusFilter, setAdminErrandStatusFilter] = useState("all");
	const [adminErrandSort, setAdminErrandSort] = useState("newest");
	const [adminErrandSearch, setAdminErrandSearch] = useState("");
	const [buttonActivity, setButtonActivity] = useState({});
	const [promoUserIdDraft, setPromoUserIdDraft] = useState("");
	const [promoPercentOffDraft, setPromoPercentOffDraft] = useState("10");
	const [promoMaxRedemptionsDraft, setPromoMaxRedemptionsDraft] = useState("1");
	const [promoSourceDraft, setPromoSourceDraft] = useState("admin_manual");
	const [statsDetailView, setStatsDetailView] = useState(null);
	const [stats24hViewMode, setStats24hViewMode] = useState("locations");
	const [stats24hSelectedPoint, setStats24hSelectedPoint] = useState(null);
	const openStatsDetail = (kind) => {
		if (kind === "visits24h") {
			setStats24hViewMode("locations");
			setStats24hSelectedPoint(null);
		}
		setStatsDetailView(kind);
	};
	const closeStatsDetail = () => {
		setStatsDetailView(null);
		setStats24hSelectedPoint(null);
	};

	const normalizedApiBase = useMemo(() => {
		const raw = String(apiBaseUrl || "").trim();
		if (!raw) return "";
		return raw.endsWith("/") ? raw.slice(0, -1) : raw;
	}, [apiBaseUrl]);

	const currentTabHasContent = useMemo(() => {
		switch (adminTab) {
			case "customers":
				return (adminCustomers || []).length > 0;
			case "errands":
				return (adminErrandsList || []).length > 0;
			case "archive":
				return (adminArchivedErrands || []).length > 0;
			case "promo-codes":
				return (adminPromoCodes || []).length > 0;
			case "attachments":
				return (adminAttachments || []).length > 0 || (adminPilotDocuments || []).length > 0;
			case "pilot-applications":
				return (adminPilotEmploymentApplications || []).length > 0;
			case "incidents":
				return (adminIncidents || []).length > 0;
			case "support":
				return (adminSupportConversations || []).length > 0;
			case "availability":
				return (adminAvailabilityEvents || []).length > 0;
			case "issues":
				return (adminIssues || []).length > 0;
			case "calls":
				return (adminCallSessions || []).length > 0;
			case "stats":
				return Boolean(adminStats);
			default:
				return false;
		}
	}, [
		adminArchivedErrands,
		adminAttachments,
		adminAvailabilityEvents,
		adminCallSessions,
		adminCustomers,
		adminErrandsList,
		adminIncidents,
		adminIssues,
		adminPilotDocuments,
		adminPilotEmploymentApplications,
		adminPromoCodes,
		adminStats,
		adminSupportConversations,
		adminTab,
	]);

	const groupedPilotDocuments = useMemo(
		() => groupPilotDocumentsByPilot(adminPilotDocuments),
		[adminPilotDocuments],
	);
	const groupedAdminAttachments = useMemo(
		() => groupAdminAttachmentsByOwner(adminAttachments),
		[adminAttachments],
	);
	const adminErrandQueue = useMemo(
		() =>
			buildAdminErrandQueue({
				errands: adminErrandsList,
				pilots: adminPilots,
				statusFilter: adminErrandStatusFilter,
				sortKey: adminErrandSort,
				searchQuery: adminErrandSearch,
			}),
		[
			adminErrandSearch,
			adminErrandSort,
			adminErrandStatusFilter,
			adminErrandsList,
			adminPilots,
		],
	);
	const groupedAdminErrandQueue = useMemo(() => {
		const groups = new Map();
		adminErrandQueue.forEach((item) => {
			if (!groups.has(item.groupKey)) {
				groups.set(item.groupKey, {
					key: item.groupKey,
					label:
						ADMIN_ERRAND_FILTERS.find((filter) => filter.key === item.groupKey)?.label ||
						getAdminErrandStatusMeta(item.statusKey).label,
					items: [],
				});
			}
			groups.get(item.groupKey).items.push(item);
		});
		return [...groups.values()].sort(
			(a, b) =>
				(ADMIN_ERRAND_GROUP_ORDER[a.key] ?? 99) -
				(ADMIN_ERRAND_GROUP_ORDER[b.key] ?? 99),
		);
	}, [adminErrandQueue]);

	const visit24hMapSummary = useMemo(() => {
		const grouped = new Map();
		let unresolved = 0;

		visitLocations24h.forEach((entry) => {
			const count = Number.isFinite(Number(entry?.count)) ? Number(entry.count) : 0;
			if (!count) return;

			const coordinates = resolveVisitMapCoordinates(entry);
			if (!coordinates) {
				unresolved += count;
				return;
			}

			const key = `${coordinates.lat}:${coordinates.lng}`;
			const existing = grouped.get(key) || {
				key,
				coordinates,
				count: 0,
				labels: [],
			};
			existing.count += count;
			existing.labels.push(formatLocationLabel(entry));
			grouped.set(key, existing);
		});

		const points = [...grouped.values()]
			.sort((a, b) => b.count - a.count)
			.map((point) => ({
				...point,
				labels: [...new Set(point.labels)],
				position: projectVisitMapCoordinates(point.coordinates),
				label: point.labels[0] || "Resolved location",
			}));

		return {
			points,
			unresolved,
			resolved: points.reduce((sum, point) => sum + point.count, 0),
		};
	}, [formatLocationLabel, visitLocations24h]);

	const filteredRecentVisits24h = useMemo(() => {
		const rows = Array.isArray(recentVisits24h) ? recentVisits24h : [];
		if (!stats24hSelectedPoint?.key) return rows;

		return rows.filter((visit) => {
			const coordinates = resolveVisitMapCoordinates(visit);
			if (!coordinates) return false;
			return `${coordinates.lat}:${coordinates.lng}` === stats24hSelectedPoint.key;
		});
	}, [recentVisits24h, stats24hSelectedPoint]);

	const selectStats24hPoint = useCallback((point) => {
		if (!point?.key) return;
		setStats24hSelectedPoint({ key: point.key, label: point.label || "Selected location" });
		setStats24hViewMode("recent");
	}, []);

	const showStats24hVisitOnMap = useCallback((visit) => {
		const coordinates = resolveVisitMapCoordinates(visit);
		if (!coordinates) return;
		setStats24hSelectedPoint({
			key: `${coordinates.lat}:${coordinates.lng}`,
			label: formatLocationLabel(visit),
		});
		setStats24hViewMode("map");
	}, [formatLocationLabel]);

	const clearStats24hPointFilter = useCallback(() => {
		setStats24hSelectedPoint(null);
	}, []);

	useEffect(() => {
		setExpandedPilotDocumentGroups((prev) => {
			const next = {};
			groupedPilotDocuments.forEach((group) => {
				next[group.key] = prev[group.key] ?? false;
			});
			return next;
		});
	}, [groupedPilotDocuments]);

	useEffect(() => {
		setExpandedAttachmentGroups((prev) => {
			const next = {};
			groupedAdminAttachments.forEach((group) => {
				next[group.key] = prev[group.key] ?? false;
			});
			return next;
		});
	}, [groupedAdminAttachments]);

	const togglePilotDocumentGroup = useCallback((groupKey) => {
		setExpandedPilotDocumentGroups((prev) => ({
			...prev,
			[groupKey]: !prev[groupKey],
		}));
	}, []);

	const toggleAttachmentGroup = useCallback((groupKey) => {
		setExpandedAttachmentGroups((prev) => ({
			...prev,
			[groupKey]: !prev[groupKey],
		}));
	}, []);

	const setButtonActivityState = useCallback((key, label) => {
		if (!key) return;
		setButtonActivity((prev) => {
			if (!label) {
				if (!(key in prev)) return prev;
				const next = { ...prev };
				delete next[key];
				return next;
			}
			if (prev[key] === label) return prev;
			return { ...prev, [key]: label };
		});
	}, []);

	const isButtonBusy = useCallback(
		(key) => Boolean(key && buttonActivity[key]),
		[buttonActivity],
	);

	const renderBusyButtonContent = useCallback(
		(key, idleContent, busyContent = null) => {
			const activityLabel = key ? buttonActivity[key] : "";
			if (!activityLabel) return idleContent;
			return (
				<span className="admin-action-feedback">
					<span className="admin-inline-spinner" aria-hidden="true" />
					<span>{busyContent || activityLabel}</span>
				</span>
			);
		},
		[buttonActivity],
	);

	const runButtonAction = useCallback(
		async (key, action, options = {}) => {
			if (!key || typeof action !== "function" || buttonActivity[key]) return;
			const { busyLabel = "Working…", minDurationMs = 450 } = options;
			const startedAt = Date.now();
			setButtonActivityState(key, busyLabel);
			try {
				return await action();
			} finally {
				const elapsed = Date.now() - startedAt;
				const remaining = Math.max(0, minDurationMs - elapsed);
				if (remaining > 0) {
					await new Promise((resolve) => setTimeout(resolve, remaining));
				}
				setButtonActivityState(key, null);
			}
		},
		[buttonActivity, setButtonActivityState],
	);

	const openAdminTab = useCallback(
		(tab) => {
			setAdminCustomerCardId?.(null);
			if (typeof handleNavigateAdminTab === "function") {
				handleNavigateAdminTab(tab);
				return;
			}
			setAdminTab?.(tab);
		},
		[handleNavigateAdminTab, setAdminCustomerCardId, setAdminTab],
	);

	function renderCompactAttachmentAuditRow(att) {
			const viewKey = `audit-attachment-view-${att.id}`;
			const downloadKey = `audit-attachment-download-${att.id}`;
			const approveKey = `audit-attachment-approve-${att.id}`;
			const rejectKey = `audit-attachment-reject-${att.id}`;
			return (
				<tr key={att.id} className="admin-attachment-row" style={{ borderBottom: "1px solid #e5e7eb" }}>
					<td style={{ padding: "12px" }}>
						<div style={{ fontWeight: 600 }}>{att.filename?.substring(0, 40) || "Attachment"}</div>
						<div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>#{att.id}</div>
					</td>
					<td style={{ padding: "12px" }}>
						<button
							type="button"
							onClick={() => openErrandContext(att)}
							style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid #dbeafe", background: "#f8fafc", color: "#1e3a8a", fontWeight: 700, cursor: "pointer" }}
						>
							{att.reference_number || `Errand #${att.errand_id}`}
						</button>
						<div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{att.errand_title || "Errand attachment"}</div>
					</td>
					<td style={{ padding: "12px", fontSize: 12 }}>{formatAdminFileSize(att.sizeBytes)}</td>
					<td style={{ padding: "12px" }}>
						<span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: att.review_status === "approved" ? "#dcfce7" : att.review_status === "rejected" ? "#fee2e2" : "#e0e7ff", color: att.review_status === "approved" ? "#166534" : att.review_status === "rejected" ? "#991b1b" : "#3730a3" }}>
							{String(att.review_status || "pending").toUpperCase()}
						</span>
					</td>
					<td style={{ padding: "12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
						<button
							type="button"
							onClick={() => void runButtonAction(viewKey, () => handleViewAdminAttachment?.(att.id, att.filename), { busyLabel: "Viewing…" })}
							disabled={isButtonBusy(viewKey)}
							aria-busy={isButtonBusy(viewKey) || undefined}
							aria-label="View attachment"
							style={{ padding: "4px 8px", fontSize: 11, background: "#e0f2fe", border: "1px solid #0284c7", borderRadius: 4, cursor: isButtonBusy(viewKey) ? "not-allowed" : "pointer", fontWeight: 600, color: "#075985", opacity: isButtonBusy(viewKey) ? 0.8 : 1 }}
							title="View"
						>
							{renderBusyButtonContent(viewKey, "👁️", "Viewing…")}
						</button>
						<button
							type="button"
							onClick={() => void runButtonAction(downloadKey, () => handleDownloadAdminAttachment?.(att.id, att.filename), { busyLabel: "Downloading…" })}
							disabled={isButtonBusy(downloadKey)}
							aria-busy={isButtonBusy(downloadKey) || undefined}
							aria-label="Download attachment"
							style={{ padding: "4px 8px", fontSize: 11, background: "#f3f4f6", border: "1px solid #9ca3af", borderRadius: 4, cursor: isButtonBusy(downloadKey) ? "not-allowed" : "pointer", fontWeight: 600, color: "#374151", opacity: isButtonBusy(downloadKey) ? 0.8 : 1 }}
							title="Download"
						>
							{renderBusyButtonContent(downloadKey, "⬇️", "Downloading…")}
						</button>
						<button
							type="button"
							onClick={() => void runButtonAction(approveKey, () => handleReviewAttachment(att.id, "approve"), { busyLabel: "Approving…" })}
							disabled={isButtonBusy(approveKey)}
							aria-busy={isButtonBusy(approveKey) || undefined}
							aria-label="Approve attachment"
							style={{ padding: "4px 8px", fontSize: 11, background: "#dcfce7", border: "1px solid #166534", borderRadius: 4, cursor: isButtonBusy(approveKey) ? "not-allowed" : "pointer", fontWeight: 600, color: "#166534", opacity: isButtonBusy(approveKey) ? 0.8 : 1 }}
						>
							{renderBusyButtonContent(approveKey, "✅", "Approving…")}
						</button>
						<button
							type="button"
							onClick={() => void runButtonAction(rejectKey, () => handleReviewAttachment(att.id, "reject"), { busyLabel: "Rejecting…" })}
							disabled={isButtonBusy(rejectKey)}
							aria-busy={isButtonBusy(rejectKey) || undefined}
							aria-label="Reject attachment"
							style={{ padding: "4px 8px", fontSize: 11, background: "#fee2e2", border: "1px solid #991b1b", borderRadius: 4, cursor: isButtonBusy(rejectKey) ? "not-allowed" : "pointer", fontWeight: 600, color: "#991b1b", opacity: isButtonBusy(rejectKey) ? 0.8 : 1 }}
						>
							{renderBusyButtonContent(rejectKey, "✗", "Rejecting…")}
						</button>
					</td>
				</tr>
			);
	}

	const openCustomerContext = useCallback(
		(userId) => {
			const numericUserId = Number(userId);
			if (!Number.isFinite(numericUserId)) return;
			setAdminCustomerCardId?.(numericUserId);
			openAdminTab("customers");
		},
		[openAdminTab, setAdminCustomerCardId],
	);

	const openErrandContext = useCallback(
		(attachment) => {
			if (!attachment?.errand_id || typeof handleSelectErrandDetail !== "function") return;
			handleSelectErrandDetail({
				id: attachment.errand_id,
				reference_number: attachment.reference_number,
				title: attachment.errand_title || attachment.filename || attachment.original_filename || "Errand",
				status: attachment.errand_status,
			});
		},
		[handleSelectErrandDetail],
	);

	const renderLinkedUserMetaBox = useCallback(
		({
			title,
			name,
			email,
			userId,
			countLabel,
			accentBg,
			accentBorder,
			accentText,
			buttonLabel,
		}) => (
			<div
				style={{
					border: `1px solid ${accentBorder}`,
					borderRadius: 12,
					padding: 12,
					background: accentBg,
					display: "grid",
					gap: 10,
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						gap: 12,
						flexWrap: "wrap",
						alignItems: "center",
					}}
				>
					<div>
						<div
							style={{
								fontSize: 11,
								fontWeight: 800,
								color: accentText,
								textTransform: "uppercase",
								letterSpacing: 0.4,
							}}
						>
							{title}
						</div>
						<div style={{ fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
							{name || "Unknown user"}
						</div>
						<div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
							{email || "No email on file"}
							{countLabel ? ` • ${countLabel}` : ""}
						</div>
					</div>
					{Number.isFinite(Number(userId)) && (
						<button
							type="button"
							onClick={() => openCustomerContext(userId)}
							style={{
								padding: "8px 12px",
								borderRadius: 999,
								border: `1px solid ${accentBorder}`,
								background: "#fff",
								color: accentText,
								fontWeight: 800,
								cursor: "pointer",
							}}
						>
							{buttonLabel}
						</button>
					)}
				</div>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
						gap: 8,
					}}
				>
					<div
						style={{
							padding: "8px 10px",
							borderRadius: 10,
							background: "rgba(255,255,255,0.82)",
							border: `1px solid ${accentBorder}`,
						}}
					>
						<div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
							Linked user ID
						</div>
						<div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, marginTop: 4 }}>
							{Number.isFinite(Number(userId)) ? userId : "-"}
						</div>
					</div>
					<div
						style={{
							padding: "8px 10px",
							borderRadius: 10,
							background: "rgba(255,255,255,0.82)",
							border: `1px solid ${accentBorder}`,
						}}
					>
						<div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
							Link status
						</div>
						<div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, marginTop: 4 }}>
							{Number.isFinite(Number(userId))
								? "Linked to individual user"
								: "Awaiting user link"}
						</div>
					</div>
				</div>
			</div>
		),
		[openCustomerContext],
	);

	const adminBearerToken =
		(authToken || "").trim() || localStorage.getItem("authToken") || "";

	const [chatTranscriptOpen, setChatTranscriptOpen] = useState(false);
	const [chatTranscriptErrand, setChatTranscriptErrand] = useState(null);
	const [chatTranscriptMessages, setChatTranscriptMessages] = useState([]);
	const [chatTranscriptLoading, setChatTranscriptLoading] = useState(false);
	const [chatTranscriptError, setChatTranscriptError] = useState(null);

	const closeChatTranscript = useCallback(() => {
		setChatTranscriptOpen(false);
		setChatTranscriptErrand(null);
		setChatTranscriptMessages([]);
		setChatTranscriptLoading(false);
		setChatTranscriptError(null);
	}, []);

	const loadChatTranscript = useCallback(
		async (errand) => {
			if (!errand?.id) return;
			if (!normalizedApiBase) {
				setChatTranscriptError("API base URL is not configured.");
				return;
			}
			if (!adminBearerToken) {
				setChatTranscriptError("Sign in again to view chat transcripts.");
				return;
			}
			setChatTranscriptLoading(true);
			setChatTranscriptError(null);
			try {
				const res = await fetch(
					`${normalizedApiBase}/api/v1/errands/${encodeURIComponent(errand.id)}/messages?limit=200`,
					{
						headers: {
							Authorization: `Bearer ${adminBearerToken}`,
						},
					},
				);
				const payload = await res.json().catch(() => ({}));
				if (!res.ok) {
					throw new Error(payload.detail || "Unable to load chat transcript");
				}
				setChatTranscriptMessages(
					Array.isArray(payload.messages) ? payload.messages : [],
				);
			} catch (err) {
				setChatTranscriptError(
					err?.message || "Unable to load chat transcript",
				);
			} finally {
				setChatTranscriptLoading(false);
			}
		},
		[adminBearerToken, normalizedApiBase],
	);

	const openChatTranscript = useCallback(
		async (errand) => {
			setChatTranscriptErrand(errand);
			setChatTranscriptOpen(true);
			await loadChatTranscript(errand);
		},
		[loadChatTranscript],
	);

	const [chatReportItems, setChatReportItems] = useState([]);
	const [chatReportQuery, setChatReportQuery] = useState(() => {
		if (typeof window === "undefined") return "";
		return localStorage.getItem("adminChatReportQuery") || "";
	});
	const [chatReportStatus, setChatReportStatus] = useState(() => {
		if (typeof window === "undefined") return "";
		return localStorage.getItem("adminChatReportStatus") || "";
	});
	const [chatReportLoading, setChatReportLoading] = useState(false);
	const [chatReportError, setChatReportError] = useState(null);

	const loadChatReport = useCallback(async () => {
		if (!normalizedApiBase) {
			setChatReportError("API base URL is not configured.");
			return;
		}
		if (!adminBearerToken) {
			setChatReportError("Sign in again to view chat reports.");
			return;
		}
		setChatReportLoading(true);
		setChatReportError(null);
		try {
			const params = new URLSearchParams();
			params.set("limit", "300");
			if (chatReportQuery && chatReportQuery.trim())
				params.set("q", chatReportQuery.trim());
			if (chatReportStatus && chatReportStatus.trim())
				params.set("status", chatReportStatus.trim());

			const res = await fetch(
				`${normalizedApiBase}/admin/errand-chats?${params.toString()}`,
				{
					headers: {
						Authorization: `Bearer ${adminBearerToken}`,
					},
				},
			);
			const payload = await res.json().catch(() => ([]));
			if (!res.ok) {
				const detail = payload?.detail || "Unable to load chat report";
				throw new Error(detail);
			}
			setChatReportItems(Array.isArray(payload) ? payload : payload.chats || []);
		} catch (err) {
			setChatReportError(err?.message || "Unable to load chat report");
		} finally {
			setChatReportLoading(false);
		}
	}, [
		adminBearerToken,
		normalizedApiBase,
		chatReportQuery,
		chatReportStatus,
	]);

	useEffect(() => {
		if (!open) return;
		if (adminTab !== "chats") return;
		void loadChatReport();
	}, [adminTab, open, loadChatReport]);

	const downloadChatTranscript = useCallback(() => {
		try {
			const errand = chatTranscriptErrand;
			const ref = errand?.reference_number || errand?.referenceNumber || errand?.id;
			const blob = new Blob(
				[
					JSON.stringify(
						{
							errand: {
								id: errand?.id,
								reference: ref,
								title: errand?.title || null,
							},
							messages: chatTranscriptMessages,
						},
						null,
						2,
					),
				],
				{ type: "application/json" },
			);
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `errand-chat-${ref || "transcript"}.json`;
			document.body.appendChild(link);
			link.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(link);
		} catch (err) {
			console.error("Failed to download chat transcript", err);
		}
	}, [chatTranscriptErrand, chatTranscriptMessages]);
	const normalizeCount = (value) => {
		const n = Number(value);
		return Number.isFinite(n) ? n : 0;
	};
	const renderBarRows = (rows, getKey, getLabel, getCount) => {
		const safeRows = Array.isArray(rows) ? rows : [];
		const max = Math.max(1, ...safeRows.map((r) => normalizeCount(getCount(r))));
		return safeRows.map((row, idx) => {
			const count = normalizeCount(getCount(row));
			const pct = Math.max(0, Math.min(100, (count / max) * 100));
			return (
				<div key={getKey(row)} className="admin-stats-row">
					<div className="admin-stats-badge">{idx + 1}</div>
					<div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
						{getLabel(row)}
					</div>
					<div className="admin-stats-bar" aria-hidden="true">
						<span style={{ width: `${pct}%` }} />
					</div>
					<div
						style={{
							fontSize: 13,
							fontWeight: 800,
							color: "#0f172a",
							textAlign: "right",
						}}
					>
						{count}
					</div>
				</div>
			);
		});
	};

	if (!open) return null;

	const customerAlertTemplates = [
		{
			key: "payment_success",
			label: "Payment success",
			message: `Payment confirmed for ${incidentReference}. We’ve created your errand and are assigning a pilot now.`,
		},
		{
			key: "errand_created",
			label: "Errand created",
			message: `Your errand ${incidentReference} is created and queued for assignment. We’ll notify you once a pilot is assigned.`,
		},
		{
			key: "pilot_assigned",
			label: "Pilot assigned",
			message: `A pilot has been assigned to ${incidentReference}. We’ll keep you updated as the errand progresses.`,
		},
		{
			key: "completion",
			label: "Completion",
			message: `Your errand ${incidentReference} is complete. Proof has been recorded and is available in your dashboard.`,
		},
		{
			key: "manual_payout",
			label: "Manual pilot payout",
			message: `Manual pilot payout has been processed for ${incidentReference}. Your completion timeline remains available in your dashboard.`,
		},
	];

	return (
		<div
			data-tour="admin-dashboard-modal"
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 1000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				overflowY: "auto",
				paddingTop: 20,
				paddingBottom: 20,
				paddingLeft: 10,
				paddingRight: 10,
			}}
			role="dialog"
			aria-modal="true"
			aria-label="Admin dashboard"
		>
			{/* Backdrop (click to close) */}
			<button
				type="button"
				aria-label="Close admin dashboard"
				onClick={onClose}
				style={{
					position: "absolute",
					inset: 0,
					background: "#0007",
					border: "none",
					cursor: "pointer",
					zIndex: 0,
				}}
			/>
			<div
				style={{
					background: "#fff",
					borderRadius: 16,
					padding: 24,
					width: "100%",
					maxWidth: 1400,
					maxHeight: "90vh",
					boxShadow: "0 8px 32px #0003",
					position: "relative",
					boxSizing: "border-box",
					display: "flex",
					flexDirection: "column",
					overflowY: "auto",
					zIndex: 1,
				}}
				onMouseDownCapture={closeCustomerCardIfClickOutside}
			>
				{/* Close Button */}
				<button
					type="button"
					onClick={onClose}
					style={{
						position: "absolute",
						top: 12,
						right: 16,
						background: "none",
						border: "none",
						fontSize: 28,
						cursor: "pointer",
						color: "#888",
						zIndex: 10,
					}}
				>
					&times;
				</button>

				{/* Header */}
				<h1
					style={{
						fontSize: 32,
						fontWeight: 700,
						marginBottom: 24,
						color: "#1f2937",
					}}
				>
					👨‍💼 Admin Dashboard
				</h1>

				{chatTranscriptOpen && (
					<div
						style={{
							position: "fixed",
							inset: 0,
							zIndex: 2000,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							padding: 12,
						}}
						role="dialog"
						aria-modal="true"
						aria-label="Errand chat transcript"
					>
						<button
							type="button"
							onClick={closeChatTranscript}
							aria-label="Close transcript"
							style={{
								position: "absolute",
								inset: 0,
								border: "none",
								background: "rgba(15, 23, 42, 0.55)",
								cursor: "pointer",
							}}
						/>
						<div
							style={{
								position: "relative",
								background: "#fff",
								width: "min(860px, 100%)",
								maxHeight: "85vh",
								borderRadius: 14,
								boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
								overflow: "hidden",
								display: "flex",
								flexDirection: "column",
							}}
						>
							<div
								style={{
									padding: "12px 14px",
									borderBottom: "1px solid #e5e7eb",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 10,
								}}
							>
								<div>
									<div style={{ fontWeight: 800, color: "#0f172a" }}>
										💬 Chat transcript
									</div>
									<div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
										Errand{" "}
										{chatTranscriptErrand?.reference_number
											? chatTranscriptErrand.reference_number
											: `#${chatTranscriptErrand?.id || "-"}`}
										{chatTranscriptErrand?.title
											? ` • ${chatTranscriptErrand.title}`
											: ""}
									</div>
								</div>
								<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
									<button
										type="button"
										onClick={() => loadChatTranscript(chatTranscriptErrand)}
										disabled={chatTranscriptLoading}
										style={{
											padding: "6px 10px",
											borderRadius: 999,
											border: "1px solid #d1d5db",
											background: "#f3f4f6",
											fontWeight: 700,
											fontSize: 12,
											cursor: chatTranscriptLoading ? "not-allowed" : "pointer",
										}}
									>
										{chatTranscriptLoading ? "Refreshing…" : "Refresh"}
									</button>
									<button
										type="button"
										onClick={downloadChatTranscript}
										style={{
											padding: "6px 10px",
											borderRadius: 999,
											border: "1px solid #c7d2fe",
											background: "#eef2ff",
											color: "#4338ca",
											fontWeight: 800,
											fontSize: 12,
											cursor: "pointer",
										}}
									>
										⬇️ Download
									</button>
									<button
										type="button"
										onClick={closeChatTranscript}
										style={{
											padding: "6px 10px",
											borderRadius: 999,
											border: "1px solid #fecaca",
											background: "#fff",
											color: "#b91c1c",
											fontWeight: 800,
											fontSize: 12,
											cursor: "pointer",
										}}
									>
										Close
									</button>
								</div>
							</div>

							<div
								style={{
									padding: 14,
									overflowY: "auto",
									background: "#f8fafc",
									flex: 1,
								}}
							>
								{chatTranscriptError && (
									<div
										style={{
											padding: 10,
											borderRadius: 10,
											border: "1px solid #fecaca",
											background: "#fef2f2",
											color: "#991b1b",
											fontSize: 12,
											fontWeight: 700,
										}}
									>
										⚠️ {chatTranscriptError}
									</div>
								)}

								{chatTranscriptLoading && chatTranscriptMessages.length === 0 ? (
									<div style={{ color: "#64748b", fontSize: 13 }}>
										Loading messages…
									</div>
								) : chatTranscriptMessages.length === 0 ? (
									<div style={{ color: "#64748b", fontSize: 13 }}>
										No messages yet.
									</div>
								) : (
									<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
										{chatTranscriptMessages.map((msg) => (
											<div
												key={msg.id}
												style={{
													border: "1px solid #e5e7eb",
													borderRadius: 12,
													padding: 10,
													background: msg.mine ? "#eef2ff" : "#fff",
												}}
											>
												<div
													style={{
														fontSize: 11,
														color: "#64748b",
														display: "flex",
														justifyContent: "space-between",
														gap: 8,
														marginBottom: 6,
													}}
												>
													<span style={{ fontWeight: 800, color: "#0f172a" }}>
														{msg.sender_name || msg.sender_type || "User"}
														{msg.sender_type ? ` • ${String(msg.sender_type).toUpperCase()}` : ""}
													</span>
													<span>
														{msg.created_at
															? new Date(msg.created_at).toLocaleString()
															: "-"}
													</span>
												</div>
												<div style={{ fontSize: 13, color: "#111827", whiteSpace: "pre-wrap" }}>
													{msg.message}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Tab Navigation */}
				<div
					className="admin-tabs"
					role="tablist"
					aria-label="Admin sections"
					data-tour="admin-tabs"
				>
					{[
						"customers",
						"errands",
						"chats",
						"archive",
						"promo-codes",
						"attachments",
						"pilot-applications",
						"incidents",
						"support",
						"availability",
						"issues",
						"calls",
						"stats",
					].map((tab) => (
						<button
							type="button"
							key={tab}
							data-tour={`admin-tab-${tab}`}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setAdminCustomerCardId?.(null);
								if (typeof handleNavigateAdminTab === "function") {
									handleNavigateAdminTab(tab);
									return;
								}
								setAdminTab?.(tab);
							}}
							className={
								adminTab === tab
									? "admin-tab-btn admin-tab-btn--active"
									: "admin-tab-btn"
							}
							role="tab"
							aria-selected={adminTab === tab}
							aria-current={adminTab === tab ? "page" : undefined}
						>
							{tab === "customers" && "👥 Customers"}
							{tab === "errands" && "📦 Errands"}
							{tab === "chats" && "🧵 Chats"}
							{tab === "archive" && "🗂️ Archive"}
							{tab === "promo-codes" && "🏷️ Promo Codes"}
							{tab === "attachments" && "📎 Attachments"}
							{tab === "pilot-applications" && "🧑‍✈️ Pilot Applications"}
							{tab === "incidents" && "🚨 Incidents"}
							{tab === "support" && "💬 Support"}
							{tab === "availability" && "⏱️ Availability"}
							{tab === "issues" && "🔍 Issues"}
							{tab === "calls" && "📞 Calls"}
							{tab === "stats" && "📊 Statistics"}
						</button>
					))}
				</div>

				{/* Content Loading */}
				{adminLoading && !currentTabHasContent && (
					<div style={{ textAlign: "center", padding: "40px 20px" }}>
						<div style={{ fontSize: 24 }}>⏳ Loading...</div>
					</div>
				)}

				{adminLoading && currentTabHasContent && (
					<div
						style={{
							marginBottom: 12,
							padding: "10px 12px",
							borderRadius: 12,
							border: "1px solid #bfdbfe",
							background: "#eff6ff",
							color: "#1d4ed8",
							fontSize: 12,
							fontWeight: 700,
						}}
					>
						Refreshing {adminTab.replace(/-/g, " ")}… keeping the last results visible.
					</div>
				)}

				{/* CUSTOMERS TAB */}
				{adminTab === "customers" && !adminLoading && (
					<div
						style={{
							overflowX: "auto",
							flex: 1,
							borderRadius: 8,
							border: "1px solid #e5e7eb",
						}}
						onMouseDownCapture={closeCustomerCardIfClickOutside}
					>
						<AdminPilotDispatchPolicyControls
							policy={adminPilotDispatchPolicy}
							handleUpdatePilotDispatchPolicy={handleUpdatePilotDispatchPolicy}
							runButtonAction={runButtonAction}
							isButtonBusy={isButtonBusy}
							renderBusyButtonContent={renderBusyButtonContent}
						/>
						<div
							style={{
								display: "flex",
								gap: 8,
								padding: "12px 12px 0 12px",
								flexWrap: "wrap",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<input
								type="text"
														data-tour="admin-customer-search"
								value={adminCustomerSearch}
								onChange={(e) => {
									const next = e.target.value;
									setAdminCustomerSearch(next);
									localStorage.setItem("adminCustomerSearch", next);
								}}
								placeholder="Search name or email"
								style={{
									padding: "8px 12px",
									borderRadius: 8,
									border: "1px solid #d1d5db",
									fontSize: 12,
									minWidth: 220,
								}}
							/>
							{[
								{ key: "all", label: "All" },
								{ key: "clients", label: "Clients" },
								{ key: "pilots", label: "Pilots" },
							].map((filter) => (
								<button
									key={filter.key}
									type="button"
									onClick={() => setAdminCustomerFilter(filter.key)}
									style={{
										padding: "6px 12px",
										borderRadius: 999,
										border: "1px solid #d1d5db",
										background:
											adminCustomerFilter === filter.key ? "#e0e7ff" : "#fff",
										color:
											adminCustomerFilter === filter.key
												? "#4338ca"
												: "#374151",
										fontSize: 12,
										fontWeight: 600,
										cursor: "pointer",
									}}
								>
									{filter.label}
								</button>
							))}
							<button
								type="button"
														data-tour="admin-purge-unverified-customers"
								onClick={() => void runButtonAction("purge-unverified-customers", () => handlePurgeUnverifiedCustomers?.(), { busyLabel: "Deleting…" })}
								disabled={isButtonBusy("purge-unverified-customers")}
								aria-busy={isButtonBusy("purge-unverified-customers") || undefined}
								style={{
									padding: "6px 12px",
									borderRadius: 8,
									border: "1px solid #fecaca",
									background: "#fef2f2",
									color: "#991b1b",
									fontSize: 12,
									fontWeight: 700,
									cursor: isButtonBusy("purge-unverified-customers") ? "not-allowed" : "pointer",
									opacity: isButtonBusy("purge-unverified-customers") ? 0.8 : 1,
								}}
							>
								{renderBusyButtonContent("purge-unverified-customers", "🧹 Delete unverified", "Deleting…")}
							</button>
							<button
								type="button"
														data-tour="admin-delete-selected-customers"
								onClick={() => void runButtonAction("delete-selected-customers", () => handleBulkDeleteCustomers?.(adminSelectedCustomerIds), { busyLabel: "Deleting…" })}
								disabled={!adminSelectedCustomerIds?.length || isButtonBusy("delete-selected-customers")}
								aria-busy={isButtonBusy("delete-selected-customers") || undefined}
								style={{
									padding: "6px 12px",
									borderRadius: 8,
									border: "1px solid #fecaca",
									background: adminSelectedCustomerIds?.length ? "#fff" : "#f9fafb",
									color: adminSelectedCustomerIds?.length ? "#b91c1c" : "#9ca3af",
									fontSize: 12,
									fontWeight: 800,
									cursor: adminSelectedCustomerIds?.length && !isButtonBusy("delete-selected-customers") ? "pointer" : "not-allowed",
									opacity: isButtonBusy("delete-selected-customers") ? 0.8 : 1,
								}}
								title={
									adminSelectedCustomerIds?.length
										? `Delete ${adminSelectedCustomerIds.length} selected user(s)`
										: "Select one or more users to delete"
								}
							>
								{renderBusyButtonContent("delete-selected-customers", "🗑 Delete selected", "Deleting…")}
							</button>
							{Boolean(adminSelectedCustomerIds?.length) && (
								<button
									type="button"
															data-tour="admin-clear-customer-selection"
									onClick={clearCustomerSelection}
									style={{
										padding: "6px 10px",
										borderRadius: 8,
										border: "1px solid #e5e7eb",
										background: "#fff",
										color: "#374151",
										fontSize: 12,
										fontWeight: 700,
										cursor: "pointer",
									}}
									title="Clear selection"
								>
									Clear
								</button>
							)}
						</div>
						<table
							style={{
								width: "100%",
								borderCollapse: "collapse",
								fontSize: 13,
								minWidth: "600px",
							}}
						>
							<thead style={{ position: "sticky", top: 0, zIndex: 5 }}>
								<tr
									style={{
										background: "#f3f4f6",
										borderBottom: "2px solid #e5e7eb",
									}}
								>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
											minWidth: "44px",
										}}
									>
										<input
											type="checkbox"
											checked={
												adminCustomers.length > 0 &&
												(adminSelectedCustomerIds?.length || 0) ===
													adminCustomers.length
											}
											onChange={(e) => {
												if (!setAdminSelectedCustomerIds) return;
												if (e.target.checked) {
													setAdminSelectedCustomerIds(
														adminCustomers
															.map((u) => Number(u?.id))
															.filter((id) => Number.isFinite(id)),
													);
												} else {
													setAdminSelectedCustomerIds([]);
												}
											}}
											title="Select all"
										/>
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
											minWidth: "50px",
										}}
									>
										ID
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
											minWidth: "180px",
										}}
									>
										Email
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
											minWidth: "140px",
										}}
									>
										Name
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
											minWidth: "90px",
										}}
									>
										Role
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
											minWidth: "120px",
										}}
									>
										Phone
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
											minWidth: "100px",
										}}
									>
										City
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
											minWidth: "80px",
										}}
									>
										Verified
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
											minWidth: "100px",
										}}
									>
										Availability
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
											minWidth: "130px",
										}}
									>
										Dispatch access
									</th>
										<th
											style={{
												padding: "10px",
												textAlign: "left",
												fontWeight: 600,
												color: "#374151",
												whiteSpace: "nowrap",
												minWidth: "90px",
											}}
										>
											Actions
										</th>
								</tr>
							</thead>
							<tbody>
								{adminCustomers
									.filter((cust) => {
										if (adminCustomerFilter === "pilots")
											return Boolean(cust.is_pilot);
										if (adminCustomerFilter === "clients")
											return !cust.is_pilot;
										return true;
									})
									.filter((cust) => {
										if (!adminCustomerSearch.trim()) return true;
										const query = adminCustomerSearch.trim().toLowerCase();
										const name =
											`${cust.first_name || ""} ${cust.last_name || ""}`.toLowerCase();
										const email = (cust.email || "").toLowerCase();
										return name.includes(query) || email.includes(query);
									})
									.map((cust) => {
										const initials = getInitials(
											cust.first_name,
											cust.last_name,
											cust.email,
										);
										const avatarSeed =
											cust.email ||
											`${cust.first_name || ""}${cust.last_name || ""}`;
										const avatarColor = getAvatarColor(avatarSeed);
										return (
											<tr
												key={cust.id}
												className="admin-customer-row"
												style={{
													borderBottom: "1px solid #e5e7eb",
													transition: "background 0.15s",
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.background = "#f9fafb";
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.background = "transparent";
												}}
											>
												<td style={{ padding: "10px" }}>
													<input
														type="checkbox"
														checked={Boolean(
															adminSelectedCustomerIds?.includes(Number(cust.id)),
														)}
														onChange={() => toggleCustomerSelection(cust.id)}
														onClick={(e) => e.stopPropagation()}
														title="Select user"
													/>
												</td>
												<td style={{ padding: "10px" }}>{cust.id}</td>
												<td
													style={{
														padding: "10px",
														fontSize: 12,
														color: "#666",
													}}
												>
													{cust.email}
												</td>
												<td style={{ padding: "10px", position: "relative" }}>
													<div
														data-admin-profile-card
														style={{
															display: "flex",
															alignItems: "center",
															gap: 8,
														}}
													>
														<button
															type="button"
															onClick={(event) => {
																event.stopPropagation();
																setAdminCustomerCardId((prev) =>
																	prev === cust.id ? null : cust.id,
																);
															}}
															style={{
																width: 28,
																height: 28,
																borderRadius: "50%",
																border: "none",
																padding: 0,
																background: avatarColor,
																color: "#fff",
																fontWeight: 700,
																fontSize: 12,
																display: "inline-flex",
																alignItems: "center",
																justifyContent: "center",
																cursor: "pointer",
																overflow: "hidden",
															}}
														>
															{cust.profile_image_url ? (
																<img
																	src={cust.profile_image_url}
																	alt={cust.first_name || "Profile"}
																	loading="lazy"
																	decoding="async"
																	width={28}
																	height={28}
																	style={{
																		width: "100%",
																		height: "100%",
																		objectFit: "cover",
																	}}
																/>
															) : (
																initials
															)}
														</button>
														<div
															style={{
																display: "flex",
																flexDirection: "column",
																gap: 2,
															}}
														>
															<span style={{ fontWeight: 600 }}>
																{cust.first_name} {cust.last_name}
															</span>
															<span style={{ fontSize: 11, color: "#9ca3af" }}>
																{cust.is_pilot ? "Pilot" : "Client"}
															</span>
														</div>
													</div>
													{adminCustomerCardId === cust.id && (
														<div
															data-admin-profile-card
															className="admin-profile-popover"
															style={{
																position: "absolute",
																top: "100%",
																left: 0,
																marginTop: 8,
																background: "#ffffff",
																border: "1px solid #e5e7eb",
																borderRadius: 12,
																padding: 16,
																width: 260,
																boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
																zIndex: 20,
															}}
														>
															<div
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: 12,
																	marginBottom: 12,
																}}
															>
																<div
																	style={{
																		width: 56,
																		height: 56,
																		borderRadius: 14,
																		background: avatarColor,
																		color: "#fff",
																		fontWeight: 700,
																		fontSize: 18,
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		overflow: "hidden",
																	}}
																>
																	{cust.profile_image_url ? (
																		<img
																			src={cust.profile_image_url}
																			alt={cust.first_name || "Profile"}
																			loading="lazy"
																			decoding="async"
																			width={56}
																			height={56}
																			style={{
																				width: "100%",
																				height: "100%",
																				objectFit: "cover",
																			}}
																		/>
																	) : (
																		initials
																	)}
																</div>
																<div>
																	<div
																		style={{ fontWeight: 700, fontSize: 14 }}
																	>
																		{cust.first_name} {cust.last_name}
																	</div>
																	<div
																		style={{ fontSize: 12, color: "#6b7280" }}
																	>
																		{cust.is_pilot ? "Pilot" : "Client"}
																	</div>
																</div>
															</div>
															<div
																style={{
																	display: "grid",
																	gap: 6,
																	fontSize: 12,
																	color: "#374151",
																}}
															>
																<div>
																	<strong>Email:</strong> {cust.email}
																</div>
																<div>
																	<strong>Phone:</strong> {cust.phone || "-"}
																</div>
																<div>
																	<strong>City:</strong> {cust.city || "-"}
																</div>
																<div>
																	<strong>Verified:</strong>{" "}
																	{cust.is_email_verified ? "Yes" : "No"}
																</div>
																{cust.is_pilot ? (
																	<>
																		<div>
																			<strong>Availability:</strong> {formatPilotAvailability(cust)}
																		</div>
																		<div>
																			<strong>Dispatch:</strong> {formatPilotDispatch(cust)}
																		</div>
																		{cust.admin_dispatch_note ? (
																			<div>
																				<strong>Note:</strong> {cust.admin_dispatch_note}
																			</div>
																		) : null}
																	</>
																) : null}
															</div>
														</div>
													)}
												</td>
												<td style={{ padding: "10px" }}>
													<span
														style={{
															display: "inline-block",
															padding: "4px 8px",
															borderRadius: 999,
															fontSize: 11,
															fontWeight: 600,
															background: cust.is_pilot ? "#dcfce7" : "#dbeafe",
															color: cust.is_pilot ? "#166534" : "#1e3a8a",
															whiteSpace: "nowrap",
														}}
													>
														{cust.is_pilot ? "Pilot" : "Client"}
													</span>
												</td>
												<td style={{ padding: "10px", fontSize: 12 }}>
													{cust.phone || "-"}
												</td>
												<td style={{ padding: "10px", fontSize: 12 }}>
													{cust.city || "-"}
												</td>
												<td style={{ padding: "10px" }}>
													<span
														style={{
															display: "inline-block",
															padding: "4px 8px",
															borderRadius: 4,
															fontSize: 11,
															fontWeight: 600,
															background: cust.is_email_verified
																? "#dcfce7"
																: "#fee2e2",
															color: cust.is_email_verified
																? "#166534"
																: "#991b1b",
															whiteSpace: "nowrap",
														}}
													>
														{cust.is_email_verified ? "✓ Yes" : "✗ No"}
													</span>
												</td>
												<td style={{ padding: "10px" }}>
													{cust.is_pilot ? (
														<span
															style={{
																display: "inline-block",
																padding: "4px 8px",
																borderRadius: 999,
																fontSize: 11,
																fontWeight: 700,
																background:
																	String(cust.availability || "offline").toLowerCase() === "online"
																		? "#dcfce7"
																		: "#e2e8f0",
																color:
																	String(cust.availability || "offline").toLowerCase() === "online"
																		? "#166534"
																		: "#334155",
															}}
														>
															{formatPilotAvailability(cust)}
														</span>
													) : (
														<span style={{ color: "#9ca3af", fontSize: 12 }}>-</span>
													)}
												</td>
												<td style={{ padding: "10px" }}>
													{cust.is_pilot ? (
															<AdminPilotDispatchControl
																pilot={cust}
																handleUpdatePilotDispatchStatus={handleUpdatePilotDispatchStatus}
																runButtonAction={runButtonAction}
																isButtonBusy={isButtonBusy}
																renderBusyButtonContent={renderBusyButtonContent}
															/>
													) : (
														<span style={{ color: "#9ca3af", fontSize: 12 }}>-</span>
													)}
												</td>
														<td style={{ padding: "10px" }}>
																				<button
																type="button"
																					data-tour="admin-delete-customer"
																onClick={(event) => {
																	event.preventDefault();
																	event.stopPropagation();
																						void runButtonAction(`delete-customer-${cust.id}`, () => handleDeleteCustomer?.(cust), { busyLabel: "Deleting…" });
																}}
																					disabled={isButtonBusy(`delete-customer-${cust.id}`)}
																					aria-busy={isButtonBusy(`delete-customer-${cust.id}`) || undefined}
																style={{
																	padding: "6px 10px",
																	borderRadius: 8,
																	border: "1px solid #fecaca",
																	background: "#fff",
																	color: "#b91c1c",
																	fontSize: 12,
																	fontWeight: 700,
																						cursor: isButtonBusy(`delete-customer-${cust.id}`) ? "not-allowed" : "pointer",
																						opacity: isButtonBusy(`delete-customer-${cust.id}`) ? 0.8 : 1,
																}}
																title="Delete this user"
															>
																					{renderBusyButtonContent(`delete-customer-${cust.id}`, "🗑 Delete", "Deleting…")}
															</button>
														</td>
											</tr>
										);
									})}
							</tbody>
						</table>
						{adminCustomers.length === 0 && (
							<div
								style={{
									textAlign: "center",
									padding: "40px 20px",
									color: "#999",
								}}
							>
								No customers found
							</div>
						)}
					</div>
				)}

				{/* ERRANDS TAB */}
				{adminTab === "errands" && (
					<div
						data-tour="admin-errands-section"
						style={{
							flex: 1,
							maxHeight: 600,
							overflowY: "auto",
							borderRadius: 8,
							border: "1px solid #e5e7eb",
							padding: 12,
							background: "#fff",
						}}
					>
						<div className="admin-errand-queue-toolbar">
							<div className="admin-errand-queue-toolbar-top">
								<div className="admin-errand-queue-count">
									{adminErrandQueue.length} errand{adminErrandQueue.length === 1 ? "" : "s"}
									 {adminErrandStatusFilter === "all"
										? "in queue"
										: `in ${
											ADMIN_ERRAND_FILTERS.find(
												(filter) => filter.key === adminErrandStatusFilter,
											)?.label?.toLowerCase() || adminErrandStatusFilter
										}`}
								</div>
								<label className="admin-errand-sort-control">
									<span>Sort</span>
									<select
										value={adminErrandSort}
										onChange={(event) => setAdminErrandSort(event.target.value)}
									>
										{ADMIN_ERRAND_SORT_OPTIONS.map((option) => (
											<option key={option.key} value={option.key}>
												{option.label}
											</option>
										))}
									</select>
								</label>
							</div>

							<div className="admin-errand-filter-row">
								{ADMIN_ERRAND_FILTERS.map((filter) => (
									<button
										key={filter.key}
										type="button"
										className={`admin-errand-filter-chip${
											adminErrandStatusFilter === filter.key
												? " admin-errand-filter-chip--active"
												: ""
										}`}
										onClick={() => setAdminErrandStatusFilter(filter.key)}
									>
										{filter.label}
									</button>
								))}
							</div>

							<input
								type="search"
								role="searchbox"
								className="admin-errand-search-input"
								placeholder="Search by ref, client, pilot, or location"
								aria-label="Search errands"
								value={adminErrandSearch}
								onChange={(event) => setAdminErrandSearch(event.target.value)}
							/>
						</div>

						{adminErrandQueue.length === 0 ? (
							<div className="admin-errand-queue-empty">
								{adminLoading && !currentTabHasContent
									? "Loading errands…"
									: adminErrandsList.length === 0
										? "No errands found"
										: "No errands match your current filters."}
							</div>
						) : (
							<div className="admin-errand-queue-groups" data-tour="admin-errands-grid">
								{groupedAdminErrandQueue.map((group) => (
									<section key={group.key} className="admin-errand-queue-group">
										<div className="admin-errand-queue-group-header">
											<h3 className="admin-errand-queue-group-title">{group.label}</h3>
											<span className="admin-errand-queue-group-count">
												{group.items.length}
											</span>
										</div>
										<div className="admin-errand-queue-grid">
											{group.items.map((item) => {
												const { errand, statusKey, statusMeta, queueNumber, reference, pilotLabel, summary } = item;
												const currentStatus = (errand.status || "").toLowerCase();
												const currentIndex = STATUS_STEPS.indexOf(currentStatus);
												const rankedPilotEntries = rankPilotsForErrandAssignment({
													errand,
													pilots: adminPilots,
													activePilotIds,
												});
												const suggestedPilotEntry = getSuggestedPilotForErrand({
													errand,
													pilots: adminPilots,
													activePilotIds,
												});
												const suggestedPilot = suggestedPilotEntry?.pilot || null;
												const suggestionLabel = suggestedPilotEntry?.fit?.reasons?.length
													? suggestedPilotEntry.fit.reasons.slice(0, 2).join(" · ")
													: suggestedPilotEntry?.isDispatchEnabled
														? "best available now"
														: "dispatch currently restricted";
												const suggestedPilotId = suggestedPilot?.id ? Number(suggestedPilot.id) : null;
												const selectedPilotId =
													adminPilotAssignments[errand.id] ??
													errand.pilot_id ??
													suggestedPilotId ??
													"";
												return (
													<div
														key={errand.id}
														className="admin-errand-queue-card"
														data-tour="admin-errand-card"
													>
														<button
															type="button"
															data-tour="admin-view-errand-details"
															onClick={() => handleSelectErrandDetail(errand)}
															aria-label={`Open errand ${reference}`}
															style={{
																width: "100%",
																background: "transparent",
																border: "none",
																padding: 0,
																textAlign: "left",
																cursor: "pointer",
															}}
														>
															<div className="admin-errand-card-header">
																<div className="admin-errand-card-header-main">
																	<div className="admin-errand-card-queue-ref">
																		{queueNumber} • Ref {reference}
																	</div>
																	<div className="admin-errand-card-title">
																		{errand.title || "Errand request"}
																	</div>
																</div>
																<span className={`admin-errand-status-badge admin-errand-status-badge--${statusMeta.tone}`}>
																	{statusMeta.label}
																</span>
															</div>

															{summary && (
																<p className="admin-errand-card-summary">{summary}</p>
															)}

															<div className="admin-errand-card-meta">
																<div className="admin-errand-meta-row">
																	<div className="admin-errand-meta-label">Client</div>
																	<div className="admin-errand-meta-value">
																		{errand.customer_name || "Customer"}
																	</div>
																</div>
																<div className="admin-errand-meta-row">
																	<div className="admin-errand-meta-label">Route</div>
																	<div className="admin-errand-meta-value">
																		{errand.pickup_location || "-"} → {errand.dropoff_location || "-"}
																	</div>
																</div>
																<div className="admin-errand-meta-row">
																	<div className="admin-errand-meta-label">Pilot</div>
																	<div className="admin-errand-meta-value">{pilotLabel}</div>
																</div>
																<div className="admin-errand-meta-row">
																	<div className="admin-errand-meta-label">Created</div>
																	<div className="admin-errand-meta-value">
																		{formatAdminErrandDate(errand.created_at || errand.createdAt)}
																	</div>
																</div>
															</div>

															<div className="admin-errand-progress-row">
																{STATUS_STEPS.map((step) => {
																	const stepIndex = STATUS_STEPS.indexOf(step);
																	const isActive = currentStatus === step;
																	const isDone =
																		currentIndex >= 0 && stepIndex >= 0 && stepIndex < currentIndex;
																	return (
																		<span
																			key={`${errand.id}-step-${step}`}
																			className={`admin-errand-progress-chip${
																				isActive
																					? " admin-errand-progress-chip--active"
																					: isDone
																						? " admin-errand-progress-chip--done"
																						: ""
																			}`}
																		>
																			{formatStatusStepLabel(step)}
																		</span>
																	);
																})}
															</div>
														</button>

														{(statusKey === "pending" || statusKey === "submitted") &&
															!errand.pilot_id &&
															adminPilots.length > 0 && (
																<div className="admin-errand-assigner">
																	<div className="admin-errand-assigner-row">
																		<select
																			value={selectedPilotId}
																			onChange={(event) =>
																				setAdminPilotAssignments((prev) => ({
																					...prev,
																					[errand.id]: event.target.value,
																				}))
																			}
																			onClick={(event) => event.stopPropagation()}
																		>
																			<option value="">Select pilot</option>
																			{rankedPilotEntries.map(({ pilot, fit, isDispatchEnabled, isOnline, isActive }) => (
																				<option key={pilot.id} value={pilot.id}>
																					{pilot.first_name} {pilot.last_name} ({pilot.email})
																					{fit?.isMatch ? " · fit" : ""}
																					{isOnline ? " · online" : ""}
																					{isActive ? " · busy" : ""}
																					{!isDispatchEnabled ? " · dispatch off" : ""}
																					{Number.isFinite(Number(pilot.rating))
																						? ` · ${Number(pilot.rating).toFixed(1)}★`
																						: ""}
																				</option>
																			))}
																		</select>
																		<button
																			type="button"
																			className="admin-errand-action-btn admin-errand-action-btn--info"
																			onClick={(event) => {
																				event.stopPropagation();
																				void runButtonAction(
																					`assign-pilot-${errand.id}`,
																					() => handleAssignPilotToErrand(errand.id, selectedPilotId),
																					{ busyLabel: "Assigning…" },
																				);
																			}}
																			disabled={isButtonBusy(`assign-pilot-${errand.id}`)}
																			aria-busy={isButtonBusy(`assign-pilot-${errand.id}`) || undefined}
																		>
																			{renderBusyButtonContent(`assign-pilot-${errand.id}`, "Assign Pilot", "Assigning…")}
																		</button>
																	</div>
																	{suggestedPilot && (
																		<div className="admin-errand-assigner-note">
																			Suggested: {suggestedPilot.first_name} {suggestedPilot.last_name}
																			{Number.isFinite(Number(suggestedPilot.rating))
																				? ` (${Number(suggestedPilot.rating).toFixed(1)}★)`
																				: ""}
																			{suggestionLabel ? ` · ${suggestionLabel}` : ""}
																		</div>
																	)}
																</div>
															)}

														<div className="admin-errand-actions">
															<button
																type="button"
																className="admin-errand-action-btn admin-errand-action-btn--neutral"
																data-tour="admin-view-errand-details"
																onClick={(event) => {
																	event.stopPropagation();
																	handleSelectErrandDetail(errand);
																}}
															>
																View Details
															</button>
															<button
																type="button"
																className="admin-errand-action-btn admin-errand-action-btn--info"
																onClick={(event) => {
																	event.stopPropagation();
																	void openChatTranscript(errand);
																}}
																title="View client/pilot chat transcript"
															>
																Chat
															</button>

{["pending", "submitted", "cancelled"].includes(statusKey) && (
																<button
																	type="button"
																	className="admin-errand-action-btn admin-errand-action-btn--danger"
																	data-tour="admin-delete-errand"
																	onClick={(event) => {
																		event.stopPropagation();
																		void runButtonAction(
																			`delete-errand-${errand.id}`,
																			() => handleDeleteErrand(errand),
																			{ busyLabel: "Deleting…" },
																		);
																	}}
																	disabled={isButtonBusy(`delete-errand-${errand.id}`)}
																	aria-busy={isButtonBusy(`delete-errand-${errand.id}`) || undefined}
																>
																	{renderBusyButtonContent(`delete-errand-${errand.id}`, "Delete", "Deleting…")}
																</button>
															)}

															{(statusKey === "pending" || statusKey === "submitted") && (
																<button
																	type="button"
																	className="admin-errand-action-btn admin-errand-action-btn--primary"
																	onClick={(event) => {
																		event.stopPropagation();
																		void runButtonAction(
																			`assign-errand-${errand.id}`,
																			() => handleAssignErrand(errand.id),
																			{ busyLabel: "Assigning…" },
																		);
																	}}
																	disabled={isButtonBusy(`assign-errand-${errand.id}`)}
																	aria-busy={isButtonBusy(`assign-errand-${errand.id}`) || undefined}
																>
																	{renderBusyButtonContent(`assign-errand-${errand.id}`, "Assign", "Assigning…")}
																</button>
															)}

															{(statusKey === "assigned" || statusKey === "approved") && (
																<>
																	<button
																		type="button"
																		className="admin-errand-action-btn admin-errand-action-btn--success"
																		onClick={(event) => {
																			event.stopPropagation();
																			void runButtonAction(
																				`approve-errand-${errand.id}`,
																				() => handleApproveErrand(errand.id),
																				{ busyLabel: "Approving…" },
																			);
																		}}
																		disabled={isButtonBusy(`approve-errand-${errand.id}`)}
																		aria-busy={isButtonBusy(`approve-errand-${errand.id}`) || undefined}
																	>
																		{renderBusyButtonContent(`approve-errand-${errand.id}`, "Approve", "Approving…")}
																	</button>
																	<button
																		type="button"
																		className="admin-errand-action-btn admin-errand-action-btn--danger"
																		onClick={(event) => {
																			event.stopPropagation();
																			void runButtonAction(
																				`complete-errand-${errand.id}`,
																				() => handleCompleteErrand(errand.id),
																				{ busyLabel: "Completing…" },
																			);
																		}}
																		disabled={isButtonBusy(`complete-errand-${errand.id}`)}
																		aria-busy={isButtonBusy(`complete-errand-${errand.id}`) || undefined}
																	>
																		{renderBusyButtonContent(`complete-errand-${errand.id}`, "Done", "Completing…")}
																	</button>
																</>
															)}

															{(statusKey === "picked_up" || statusKey === "in_transit") && (
																<button
																	type="button"
																	className="admin-errand-action-btn admin-errand-action-btn--danger"
																	onClick={(event) => {
																		event.stopPropagation();
																		void runButtonAction(
																			`complete-errand-${errand.id}`,
																			() => handleCompleteErrand(errand.id),
																			{ busyLabel: "Completing…" },
																		);
																	}}
																	disabled={isButtonBusy(`complete-errand-${errand.id}`)}
																	aria-busy={isButtonBusy(`complete-errand-${errand.id}`) || undefined}
																>
																	{renderBusyButtonContent(`complete-errand-${errand.id}`, "Mark Complete", "Completing…")}
																</button>
															)}

															{(statusKey === "completed" || statusKey === "delivered") && (
																<div className="admin-errand-state-label admin-errand-state-label--completed">
																	✓ Complete
																</div>
															)}

															{statusKey === "cancelled" && (
																<div className="admin-errand-state-label admin-errand-state-label--cancelled">
																	Cancelled
																</div>
															)}
														</div>
													</div>
												);
											})}
										</div>
									</section>
								))}
							</div>
						)}
					</div>
				)}

				{/* CHATS TAB */}
				{adminTab === "chats" && !adminLoading && (
					<div
						style={{
							flex: 1,
							maxHeight: 600,
							overflowY: "auto",
							borderRadius: 8,
							border: "1px solid #e5e7eb",
							padding: 12,
							background: "#fff",
						}}
					>
						<div
							style={{
								display: "flex",
								gap: 10,
								flexWrap: "wrap",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 12,
							}}
						>
							<div style={{ fontWeight: 800, color: "#111827" }}>
								Chat report
							</div>
							<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
								<input
									type="text"
									value={chatReportQuery}
									onChange={(e) => {
										const next = e.target.value;
										setChatReportQuery(next);
										try {
											localStorage.setItem("adminChatReportQuery", next);
										} catch {
											// ignore
										}
								}}
									placeholder="Search ref, customer, pilot"
									style={{
										padding: "8px 12px",
										borderRadius: 10,
										border: "1px solid #d1d5db",
										fontSize: 12,
										minWidth: 240,
									}}
								/>
								<select
									value={chatReportStatus}
									onChange={(e) => {
										const next = e.target.value;
										setChatReportStatus(next);
										try {
											localStorage.setItem("adminChatReportStatus", next);
										} catch {
											// ignore
										}
								}}
									style={{
										padding: "8px 12px",
										borderRadius: 10,
										border: "1px solid #d1d5db",
										fontSize: 12,
										background: "#fff",
									}}
									title="Filter by errand status"
								>
									<option value="">All statuses</option>
									<option value="pending">pending</option>
									<option value="submitted">submitted</option>
									<option value="assigned">assigned</option>
									<option value="approved">approved</option>
									<option value="accepted">accepted</option>
									<option value="in_progress">in_progress</option>
									<option value="picked_up">picked_up</option>
									<option value="delivered">delivered</option>
									<option value="completed">completed</option>
								</select>
								<button
									type="button"
									onClick={() => void runButtonAction("chat-report-refresh", () => loadChatReport(), { busyLabel: "Refreshing…" })}
									disabled={chatReportLoading || isButtonBusy("chat-report-refresh")}
									aria-busy={chatReportLoading || isButtonBusy("chat-report-refresh") || undefined}
									style={{
										padding: "8px 12px",
										borderRadius: 999,
										border: "1px solid #c7d2fe",
										background: chatReportLoading || isButtonBusy("chat-report-refresh") ? "#eef2ff" : "#e0e7ff",
										color: "#3730a3",
										fontWeight: 700,
										cursor: chatReportLoading || isButtonBusy("chat-report-refresh") ? "not-allowed" : "pointer",
									}}
								>
									{chatReportLoading
										? renderBusyButtonContent("chat-report-refresh", "🔄 Refresh", "Refreshing…")
										: renderBusyButtonContent("chat-report-refresh", "🔄 Refresh", "Refreshing…")}
								</button>
							</div>
						</div>

						{chatReportError && (
							<div
								style={{
									marginBottom: 12,
									padding: "10px 12px",
									borderRadius: 10,
									border: "1px solid #fecaca",
									background: "#fef2f2",
									color: "#991b1b",
									fontSize: 12,
								}}
							>
								{chatReportError}
							</div>
						)}

						{chatReportLoading && chatReportItems.length === 0 ? (
							<div style={{ textAlign: "center", padding: 30, color: "#6b7280" }}>
								Loading chats…
							</div>
						) : chatReportItems.length === 0 ? (
							<div style={{ textAlign: "center", padding: 30, color: "#6b7280" }}>
								No chats found.
							</div>
						) : (
							<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
								{chatReportItems.map((row) => {
									const ref = row.reference_number || `#${row.errand_id}`;
									const lastAt = row.last_message_at
										? new Date(row.last_message_at).toLocaleString()
										: "-";
									return (
										<div
											key={`${row.errand_id}-${row.last_message_at || ""}`}
											style={{
												border: "1px solid #e5e7eb",
												borderRadius: 12,
												padding: 12,
												background: "#f9fafb",
											}}
										>
											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													gap: 10,
													alignItems: "flex-start",
												}}
											>
												<div style={{ flex: 1, minWidth: 0 }}>
													<div style={{ fontWeight: 800, color: "#111827" }}>
														{ref}
														<span
															style={{
																marginLeft: 8,
																fontSize: 11,
																fontWeight: 700,
																color: "#6b7280",
															}}
														>
															({row.status || "-"})
														</span>
													</div>
													<div style={{ fontSize: 12, color: "#374151", marginTop: 6 }}>
														<strong>Customer:</strong> {row.customer_name || row.customer_email || "-"}
													</div>
													<div style={{ fontSize: 12, color: "#374151" }}>
														<strong>Pilot:</strong> {row.pilot_name || row.pilot_email || "-"}
													</div>
													<div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
														<strong>Messages:</strong> {row.message_count ?? 0} · <strong>Last:</strong> {lastAt}
													</div>
													{row.last_message && (
														<div
															style={{
																marginTop: 8,
																fontSize: 12,
																color: "#111827",
																background: "#fff",
																border: "1px solid #e5e7eb",
																borderRadius: 10,
																padding: 10,
																lineHeight: 1.4,
																whiteSpace: "pre-wrap",
															}}
														>
															{String(row.last_message).slice(0, 240)}
															{String(row.last_message).length > 240 ? "…" : ""}
														</div>
													)}
												</div>
												<div style={{ flexShrink: 0 }}>
													<button
														type="button"
														onClick={() =>
															openChatTranscript({
																id: row.errand_id,
																reference_number: row.reference_number,
																status: row.status,
																customer_email: row.customer_email,
																pilot_id: row.pilot_id,
															})
													}
														style={{
															padding: "8px 12px",
															borderRadius: 999,
															border: "1px solid #0891b2",
															background: "#ecfeff",
															color: "#0e7490",
															fontWeight: 800,
															cursor: "pointer",
														}}
														title="Open full transcript"
													>
														Open transcript
													</button>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* ARCHIVE TAB */}
				{adminTab === "archive" && !adminLoading && (
					<div
						style={{
							flex: 1,
							maxHeight: 600,
							overflowY: "auto",
							borderRadius: 8,
							border: "1px solid #e5e7eb",
							padding: 12,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 12,
							}}
						>
							<div style={{ fontWeight: 700, fontSize: 16, color: "#1f2937" }}>
								Archived Errands
							</div>
							<button
								type="button"
								onClick={() => setArchiveExpanded((prev) => !prev)}
								style={{
									background: "#eef2ff",
									border: "1px solid #c7d2fe",
									color: "#4338ca",
									borderRadius: 999,
									padding: "4px 10px",
									fontSize: 12,
									fontWeight: 600,
									cursor: "pointer",
								}}
							>
								{archiveExpanded ? "Hide" : "Expand"}
							</button>
						</div>
						{adminArchivedErrands.length === 0 ? (
							<div
								style={{
									textAlign: "center",
									padding: "24px 20px",
									color: "#999",
								}}
							>
								No completed errands yet
							</div>
						) : (
							archiveExpanded && (
								<div
									style={{
										display: "grid",
										gridTemplateColumns:
											"repeat(auto-fill, minmax(280px, 1fr))",
										gap: 12,
									}}
								>
									{adminArchivedErrands.map((errand) => {
										/* eslint-disable jsx-a11y/prefer-tag-over-role */
										const card = (
											<div
												key={errand.id}
												className="admin-archive-card"
												style={{
													background:
														"linear-gradient(135deg, #ffffff 0%, #ecfdf5 50%, #eef2ff 100%)",
													border: "1px solid #e2e8f0",
													borderRadius: 8,
													padding: 12,
													boxShadow: "0 6px 16px rgba(16, 185, 129, 0.12)",
													transition:
														"transform 0.2s ease, box-shadow 0.2s ease",
													cursor: "pointer",
												}}
											>
												<button
													type="button"
													onClick={() => handleSelectErrandDetail(errand)}
													aria-label={`Open errand ${errand.reference_number || errand.id}`}
													style={{
														width: "100%",
														background: "transparent",
														border: "none",
														padding: 0,
														textAlign: "left",
														cursor: "pointer",
													}}
												>
													<div
														style={{
															display: "flex",
															justifyContent: "space-between",
															alignItems: "flex-start",
															marginBottom: 8,
															gap: 8,
														}}
													>
														<div style={{ flex: 1, minWidth: 0 }}>
															<div
																style={{
																	fontSize: 11,
																	color: "#9ca3af",
																	marginBottom: 2,
																}}
															>
																Ref:{" "}
																{errand.reference_number || `#${errand.id}`}
															</div>
															<div
																style={{
																	fontSize: 13,
																	fontWeight: 700,
																	color: "#1f2937",
																	overflow: "hidden",
																	textOverflow: "ellipsis",
																	whiteSpace: "nowrap",
																}}
															>
																{errand.title}
															</div>
														</div>
														<span
															style={{
																display: "inline-block",
																padding: "3px 6px",
																borderRadius: 4,
																fontSize: 10,
																fontWeight: 600,
																whiteSpace: "nowrap",
																flexShrink: 0,
																background: "#dcfce7",
																color: "#166534",
															}}
														>
															COMPLETED
														</span>
													</div>

													{(errand.description || errand.note) && (
														<div
															style={{
																fontSize: 11,
																color: "#6b7280",
																marginBottom: 8,
																lineHeight: 1.4,
																overflow: "hidden",
																textOverflow: "ellipsis",
																display: "-webkit-box",
																WebkitLineClamp: 2,
																WebkitBoxOrient: "vertical",
															}}
														>
															{errand.description || errand.note}
														</div>
													)}

													<div
														style={{
															marginBottom: 8,
															fontSize: 11,
															color: "#6b7280",
															lineHeight: 1.4,
														}}
													>
														<div>
															📍{" "}
															{errand.pickup_location?.substring(0, 28) || "-"}
														</div>
														<div>
															🏁{" "}
															{errand.dropoff_location?.substring(0, 28) || "-"}
														</div>
													</div>

													<div
														style={{
															marginBottom: 8,
															fontSize: 11,
															color: "#6b7280",
															lineHeight: 1.4,
														}}
													>
														<div>👤 {errand.customer_name || "Customer"}</div>
														<div>📧 {errand.customer_email || "-"}</div>
													</div>

													<div
														style={{
															marginBottom: 8,
															fontSize: 10,
															color: "#9ca3af",
															lineHeight: 1.3,
														}}
													>
														<div>
															{errand.created_at
																? new Date(errand.created_at).toLocaleString(undefined, {
																		dateStyle: "medium",
																		timeStyle: "short",
																	})
																: "-"}
														</div>
													</div>
												</button>

												<button
													type="button"
													onClick={(event) => {
														event.stopPropagation();
														handleSelectErrandDetail(errand);
													}}
													style={{
														width: "100%",
														padding: "6px 8px",
														fontSize: 11,
														background: "#f3f4f6",
														border: "1px solid #d1d5db",
														borderRadius: 4,
														cursor: "pointer",
														fontWeight: 600,
														color: "#374151",
													}}
												>
													View Details
												</button>
											</div>
										);
										/* eslint-enable jsx-a11y/prefer-tag-over-role */
										return card;
									})}
								</div>
							)
						)}
					</div>
				)}

				{/* PROMO CODES TAB */}
				{adminTab === "promo-codes" && !adminLoading && (
					<div
						style={{
							flex: 1,
							maxHeight: 600,
							overflowY: "auto",
							borderRadius: 8,
							border: "1px solid #e5e7eb",
							padding: 12,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 12,
								marginBottom: 12,
								flexWrap: "wrap",
							}}
						>
							<div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
								Promo Codes
							</div>
							<div style={{ fontSize: 12, color: "#64748b" }}>
								Generate one-off discount codes (optionally tied to a user).
							</div>
						</div>

						<div
							style={{
								border: "1px solid #e2e8f0",
								borderRadius: 12,
								padding: 12,
								background: "#f8fafc",
								marginBottom: 14,
							}}
						>
							<div style={{ fontWeight: 800, marginBottom: 10, color: "#0f172a" }}>
								Generate a promo code
							</div>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
									gap: 10,
									alignItems: "end",
								}}
							>
								<div>
									<div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
										User ID (optional)
									</div>
									<input
										type="number"
										value={promoUserIdDraft}
										onChange={(e) => setPromoUserIdDraft(e.target.value)}
										placeholder="e.g. 123"
										style={{
											width: "100%",
											padding: "8px 10px",
											borderRadius: 10,
											border: "1px solid #cbd5e1",
											fontSize: 13,
										}}
									/>
								</div>
								<div>
									<div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
										Percent off
									</div>
									<input
										type="number"
										min={1}
										max={90}
										value={promoPercentOffDraft}
										onChange={(e) => setPromoPercentOffDraft(e.target.value)}
										style={{
											width: "100%",
											padding: "8px 10px",
											borderRadius: 10,
											border: "1px solid #cbd5e1",
											fontSize: 13,
										}}
									/>
								</div>
								<div>
									<div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
										Max redemptions
									</div>
									<input
										type="number"
										min={1}
										max={50}
										value={promoMaxRedemptionsDraft}
										onChange={(e) => setPromoMaxRedemptionsDraft(e.target.value)}
										style={{
											width: "100%",
											padding: "8px 10px",
											borderRadius: 10,
											border: "1px solid #cbd5e1",
											fontSize: 13,
										}}
									/>
								</div>
								<div>
									<div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
										Source
									</div>
									<input
										type="text"
										value={promoSourceDraft}
										onChange={(e) => setPromoSourceDraft(e.target.value)}
										placeholder="admin_manual"
										style={{
											width: "100%",
											padding: "8px 10px",
											borderRadius: 10,
											border: "1px solid #cbd5e1",
											fontSize: 13,
										}}
									/>
								</div>
								<button
									type="button"
									onClick={() => {
										const userIdValue = promoUserIdDraft.trim()
											? Number(promoUserIdDraft)
											: null;
										const percentValue = Number(promoPercentOffDraft || 10);
										const maxValue = Number(promoMaxRedemptionsDraft || 1);
										void runButtonAction("promo-generate", () =>
											handleGeneratePromoCode?.({
												user_id: Number.isFinite(userIdValue) ? userIdValue : null,
												percent_off: Number.isFinite(percentValue) ? percentValue : 10,
												max_redemptions: Number.isFinite(maxValue) ? maxValue : 1,
												source: promoSourceDraft.trim() || "admin_manual",
											}),
											{ busyLabel: "Generating…" },
										);
									}}
									disabled={isButtonBusy("promo-generate")}
									aria-busy={isButtonBusy("promo-generate") || undefined}
									style={{
										padding: "10px 12px",
										borderRadius: 12,
										border: "1px solid #1d4ed8",
										background: "#2563eb",
										color: "#fff",
										fontWeight: 800,
										cursor: isButtonBusy("promo-generate") ? "not-allowed" : "pointer",
										opacity: isButtonBusy("promo-generate") ? 0.8 : 1,
										whiteSpace: "nowrap",
									}}
									title="Generate a new promo code"
								>
									{renderBusyButtonContent("promo-generate", "Generate", "Generating…")}
								</button>
							</div>
						</div>

						<div style={{ fontWeight: 800, marginBottom: 10, color: "#0f172a" }}>
							Recent promo codes
						</div>
						{(adminPromoCodes || []).length === 0 ? (
							<div style={{ padding: "20px 10px", color: "#64748b" }}>
								No promo codes found.
							</div>
						) : (
							<div style={{ overflowX: "auto" }}>
								<table
									style={{
										width: "100%",
										borderCollapse: "collapse",
										fontSize: 12,
										minWidth: 780,
									}}
								>
									<thead>
										<tr style={{ background: "#f1f5f9" }}>
											<th style={{ padding: 10, textAlign: "left" }}>Code</th>
											<th style={{ padding: 10, textAlign: "left" }}>% off</th>
											<th style={{ padding: 10, textAlign: "left" }}>User</th>
											<th style={{ padding: 10, textAlign: "left" }}>Redeemed</th>
											<th style={{ padding: 10, textAlign: "left" }}>Source</th>
											<th style={{ padding: 10, textAlign: "left" }}>Created</th>
										</tr>
									</thead>
									<tbody>
										{(adminPromoCodes || []).map((p) => {
											const redeemedCount = Number(p?.redeemed_count ?? 0);
											const max = Number(p?.max_redemptions ?? 1);
											const redeemedLabel = `${redeemedCount}/${max}`;
											const userLabel = p?.user_email
												? `${p.user_email}${p.user_id ? ` (#${p.user_id})` : ""}`
												: p?.user_id
													? `#${p.user_id}`
													: "-";
											return (
												<tr
													key={p.id}
													style={{ borderBottom: "1px solid #e2e8f0" }}
												>
													<td style={{ padding: 10, fontWeight: 800 }}>
														{p.display_code || p.code}
													</td>
													<td style={{ padding: 10 }}>{p.percent_off}%</td>
													<td style={{ padding: 10 }}>{userLabel}</td>
													<td style={{ padding: 10 }}>{redeemedLabel}</td>
													<td style={{ padding: 10 }}>{p.source || "-"}</td>
													<td style={{ padding: 10 }}>
														{p.created_at
															? new Date(p.created_at).toLocaleString()
															: "-"}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}

				{/* ATTACHMENTS TAB */}
				{adminTab === "attachments" && !adminLoading && (
					<div style={{ display: "grid", gap: 16 }}>
						{adminAttachmentNotice && (
							<div
								style={{
									marginBottom: 12,
									padding: "10px 12px",
									borderRadius: 8,
									border: `1px solid ${adminAttachmentNotice.type === "error" ? "#fecaca" : "#bbf7d0"}`,
									background:
										adminAttachmentNotice.type === "error"
											? "#fef2f2"
											: "#f0fdf4",
									color:
										adminAttachmentNotice.type === "error"
											? "#991b1b"
											: "#166534",
									fontSize: 13,
									fontWeight: 600,
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 12,
								}}
							>
								<span>{adminAttachmentNotice.message}</span>
								<button
									type="button"
									onClick={() => setAdminAttachmentNotice(null)}
									style={{
										background: "transparent",
										border: "none",
										color: "inherit",
										cursor: "pointer",
										fontWeight: 700,
									}}
								>
									✕
								</button>
							</div>
						)}
						<div
							style={{
								padding: "12px 14px",
								border: "1px solid #fde68a",
								borderRadius: 12,
								background: "linear-gradient(135deg, #fff7ed, #fffbeb)",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 12,
								flexWrap: "wrap",
							}}
						>
							<div
								style={{
									fontWeight: 800,
									color: "#92400e",
								}}
							>
								Pilot blockage / unable-to-proceed reports live in the Incidents tab.
								<div style={{ fontSize: 12, fontWeight: 500, marginTop: 4, color: "#a16207" }}>
									Use Attachments for files; use Incidents for pilot operational reports after acceptance.
								</div>
							</div>
							<button
								type="button"
								onClick={() => openAdminTab("incidents")}
								style={{
									padding: "8px 12px",
									borderRadius: 999,
									border: "1px solid #f59e0b",
									background: "#fff",
									color: "#92400e",
									fontWeight: 800,
									cursor: "pointer",
								}}
							>
								Open Incidents
							</button>
						</div>

						<div
							style={{
								border: "1px solid #e5e7eb",
								borderRadius: 12,
								padding: 16,
								background: "#fffdf5",
							}}
						>
							<div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
								Pilot documents grouped by individual
							</div>
							<div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
								Review each pilot’s uploads as a bundle instead of hunting file-by-file.
							</div>
							<div style={{ display: "grid", gap: 12, marginTop: 14 }}>
								{groupedPilotDocuments.length === 0 ? (
									<div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
										No pilot documents uploaded
									</div>
								) : (
									groupedPilotDocuments.map((group) => (
										<div
											key={group.key}
											style={{
												border: "1px solid #fde68a",
												borderRadius: 12,
												overflow: "hidden",
												background: "#fff",
											}}
										>
											<button
												type="button"
												onClick={() => togglePilotDocumentGroup(group.key)}
												aria-expanded={Boolean(expandedPilotDocumentGroups[group.key])}
												aria-controls={`pilot-doc-group-${group.key}`}
												style={{
													padding: "12px 14px",
													background: "#fffbeb",
													display: "flex",
													justifyContent: "space-between",
													gap: 12,
													alignItems: "center",
													flexWrap: "wrap",
													width: "100%",
													border: "none",
													cursor: "pointer",
													textAlign: "left",
												}}
											>
												<div>
													<div style={{ fontWeight: 800, color: "#92400e" }}>{group.pilotName}</div>
													<div style={{ fontSize: 12, color: "#a16207" }}>
														{group.pilotEmail || "No email on file"} • {group.documents.length} document{group.documents.length === 1 ? "" : "s"}
													</div>
												</div>
												<span style={{ fontWeight: 800, color: "#92400e" }}>
													{expandedPilotDocumentGroups[group.key] ? "Hide details ▾" : "Expand details ▸"}
												</span>
											</button>
											{expandedPilotDocumentGroups[group.key] && (
												<div id={`pilot-doc-group-${group.key}`} style={{ padding: 12, display: "grid", gap: 12 }}>
													{renderLinkedUserMetaBox({
														title: "Pilot record",
														name: group.pilotName,
														email: group.pilotEmail,
														userId: group.pilotId,
														countLabel: `${group.documents.length} document${group.documents.length === 1 ? "" : "s"}`,
														accentBg: "#fff7ed",
														accentBorder: "#fde68a",
														accentText: "#92400e",
														buttonLabel: "Open linked user",
													})}
													<div style={{ overflowX: "auto" }}>
														<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
															<thead>
																<tr style={{ background: "#fff7ed", borderBottom: "1px solid #fde68a" }}>
																	<th style={{ padding: "10px 12px", textAlign: "left" }}>Document</th>
																	<th style={{ padding: "10px 12px", textAlign: "left" }}>Type</th>
																	<th style={{ padding: "10px 12px", textAlign: "left" }}>Status</th>
																	<th style={{ padding: "10px 12px", textAlign: "left" }}>Actions</th>
																</tr>
															</thead>
															<tbody>
																{group.documents.map((doc) => (
																	<tr key={doc.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
																		<td style={{ padding: "10px 12px", fontWeight: 600 }}>{doc.original_filename || "Document"}</td>
																		<td style={{ padding: "10px 12px", fontSize: 12 }}>{doc.document_type || "document"}</td>
																		<td style={{ padding: "10px 12px" }}>
																			<span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: doc.status === "approved" ? "#dcfce7" : doc.status === "rejected" ? "#fee2e2" : "#e0e7ff", color: doc.status === "approved" ? "#166534" : doc.status === "rejected" ? "#991b1b" : "#3730a3" }}>
																				{(doc.status || "pending").toUpperCase()}
																			</span>
																		</td>
																		<td style={{ padding: "10px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
																			{(() => {
																				const viewKey = `pilot-doc-view-${doc.id}`;
																				const downloadKey = `pilot-doc-download-${doc.id}`;
																				const approveKey = `pilot-doc-approve-${doc.id}`;
																				const rejectKey = `pilot-doc-reject-${doc.id}`;
																				return (
																					<>
																						<button type="button" onClick={() => void runButtonAction(viewKey, () => handleViewPilotDocument?.(doc.id, doc.original_filename), { busyLabel: "Viewing…" })} disabled={isButtonBusy(viewKey)} aria-busy={isButtonBusy(viewKey) || undefined} aria-label="View pilot document" style={{ padding: "4px 8px", fontSize: 11, background: "#e0f2fe", border: "1px solid #0284c7", borderRadius: 6, cursor: isButtonBusy(viewKey) ? "not-allowed" : "pointer", fontWeight: 700, color: "#075985", opacity: isButtonBusy(viewKey) ? 0.8 : 1 }} title="View">{renderBusyButtonContent(viewKey, "👁️", "Viewing…")}</button>
																						<button type="button" onClick={() => void runButtonAction(downloadKey, () => handleDownloadPilotDocument(doc.id, doc.original_filename), { busyLabel: "Downloading…" })} disabled={isButtonBusy(downloadKey)} aria-busy={isButtonBusy(downloadKey) || undefined} aria-label="Download pilot document" style={{ padding: "4px 8px", fontSize: 11, background: "#f3f4f6", border: "1px solid #9ca3af", borderRadius: 6, cursor: isButtonBusy(downloadKey) ? "not-allowed" : "pointer", fontWeight: 700, color: "#374151", opacity: isButtonBusy(downloadKey) ? 0.8 : 1 }} title="Download">{renderBusyButtonContent(downloadKey, "⬇️", "Downloading…")}</button>
																						<button type="button" onClick={() => void runButtonAction(approveKey, () => handleReviewPilotDocument(doc.id, "approve"), { busyLabel: "Approving…" })} disabled={isButtonBusy(approveKey)} aria-busy={isButtonBusy(approveKey) || undefined} aria-label="Approve pilot document" style={{ padding: "4px 8px", fontSize: 11, background: "#dcfce7", border: "1px solid #166534", borderRadius: 6, cursor: isButtonBusy(approveKey) ? "not-allowed" : "pointer", fontWeight: 700, color: "#166534", opacity: isButtonBusy(approveKey) ? 0.8 : 1 }}>{renderBusyButtonContent(approveKey, "✅", "Approving…")}</button>
																						<button type="button" onClick={() => void runButtonAction(rejectKey, () => handleReviewPilotDocument(doc.id, "reject"), { busyLabel: "Rejecting…" })} disabled={isButtonBusy(rejectKey)} aria-busy={isButtonBusy(rejectKey) || undefined} aria-label="Reject pilot document" style={{ padding: "4px 8px", fontSize: 11, background: "#fee2e2", border: "1px solid #991b1b", borderRadius: 6, cursor: isButtonBusy(rejectKey) ? "not-allowed" : "pointer", fontWeight: 700, color: "#991b1b", opacity: isButtonBusy(rejectKey) ? 0.8 : 1 }}>{renderBusyButtonContent(rejectKey, "✗", "Rejecting…")}</button>
																					</>
																				);
																			})()}
																		</td>
																	</tr>
																))}
															</tbody>
														</table>
													</div>
												</div>
											)}
										</div>
									))
								)}
							</div>
						</div>

						<div
							style={{
								border: "1px solid #e5e7eb",
								borderRadius: 12,
								padding: 16,
								background: "#fff",
							}}
						>
							<div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>Errand attachments grouped by owner</div>
							<div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
								Click an owner tag to jump to Customers, or an errand tag to open the related errand detail.
							</div>
							<div style={{ display: "grid", gap: 12, marginTop: 14 }}>
								{groupedAdminAttachments.length === 0 ? (
									<div style={{ textAlign: "center", padding: "20px", color: "#999" }}>No attachments found</div>
								) : (
									groupedAdminAttachments.map((group) => (
										<div key={group.key} style={{ border: "1px solid #dbeafe", borderRadius: 12, overflow: "hidden", background: "#f8fafc" }}>
											<button
												type="button"
												onClick={() => toggleAttachmentGroup(group.key)}
												aria-expanded={Boolean(expandedAttachmentGroups[group.key])}
												aria-controls={`attachment-group-${group.key}`}
												style={{ padding: "12px 14px", background: "#eff6ff", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", width: "100%", border: "none", cursor: "pointer", textAlign: "left" }}
											>
												<div>
													<div style={{ fontWeight: 800, color: "#1d4ed8" }}>{group.ownerName}</div>
													<div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{group.ownerEmail || `User #${group.userId ?? "-"}`} • {group.attachments.length} file{group.attachments.length === 1 ? "" : "s"}</div>
												</div>
												<span style={{ fontWeight: 800, color: "#1d4ed8" }}>
													{expandedAttachmentGroups[group.key] ? "Hide details ▾" : "Expand details ▸"}
												</span>
											</button>
											{expandedAttachmentGroups[group.key] && (
												<div id={`attachment-group-${group.key}`} style={{ display: "grid", gap: 12, padding: 12 }}>
													{renderLinkedUserMetaBox({
														title: "Client / owner record",
														name: group.ownerName,
														email: group.ownerEmail,
														userId: group.userId,
														countLabel: `${group.attachments.length} file${group.attachments.length === 1 ? "" : "s"}`,
														accentBg: "#eff6ff",
														accentBorder: "#bfdbfe",
														accentText: "#1d4ed8",
														buttonLabel: "Open linked user",
													})}
													<div style={{ display: "grid", gap: 8 }}>
														{group.attachments.map((att) => (
															<div key={att.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) auto auto auto", gap: 10, alignItems: "center", padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0" }}>
																<div style={{ minWidth: 0 }}>
																	<div style={{ fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.filename || att.original_filename || "Attachment"}</div>
																	<div style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
																		<button type="button" onClick={() => openErrandContext(att)} style={{ padding: "4px 8px", borderRadius: 999, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, cursor: "pointer" }}>
																			{att.reference_number || `Errand #${att.errand_id}`}
																		</button>
																		<span>{formatAdminFileSize(att.sizeBytes)}</span>
																		<span>{att.created_at ? new Date(att.created_at).toLocaleString() : "-"}</span>
																	</div>
																</div>
																<span style={{ display: "inline-flex", padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: att.review_status === "approved" ? "#dcfce7" : att.review_status === "rejected" ? "#fee2e2" : "#e0e7ff", color: att.review_status === "approved" ? "#166534" : att.review_status === "rejected" ? "#991b1b" : "#3730a3" }}>
																	{String(att.review_status || "pending").toUpperCase()}
																</span>
																<div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
																	{(() => {
																		const viewKey = `group-attachment-view-${att.id}`;
																		const downloadKey = `group-attachment-download-${att.id}`;
																		const approveKey = `group-attachment-approve-${att.id}`;
																		const rejectKey = `group-attachment-reject-${att.id}`;
																		return (
																			<>
																				<button type="button" onClick={() => void runButtonAction(viewKey, () => handleViewAdminAttachment?.(att.id, att.filename), { busyLabel: "Viewing…" })} disabled={isButtonBusy(viewKey)} aria-busy={isButtonBusy(viewKey) || undefined} aria-label="View attachment" style={{ padding: "4px 8px", fontSize: 11, background: "#e0f2fe", border: "1px solid #0284c7", borderRadius: 6, cursor: isButtonBusy(viewKey) ? "not-allowed" : "pointer", fontWeight: 700, color: "#075985", opacity: isButtonBusy(viewKey) ? 0.8 : 1 }} title="View">{renderBusyButtonContent(viewKey, "👁️", "Viewing…")}</button>
																				<button type="button" onClick={() => void runButtonAction(downloadKey, () => handleDownloadAdminAttachment?.(att.id, att.filename), { busyLabel: "Downloading…" })} disabled={isButtonBusy(downloadKey)} aria-busy={isButtonBusy(downloadKey) || undefined} aria-label="Download attachment" style={{ padding: "4px 8px", fontSize: 11, background: "#f3f4f6", border: "1px solid #9ca3af", borderRadius: 6, cursor: isButtonBusy(downloadKey) ? "not-allowed" : "pointer", fontWeight: 700, color: "#374151", opacity: isButtonBusy(downloadKey) ? 0.8 : 1 }} title="Download">{renderBusyButtonContent(downloadKey, "⬇️", "Downloading…")}</button>
																				<button type="button" onClick={() => void runButtonAction(approveKey, () => handleReviewAttachment(att.id, "approve"), { busyLabel: "Approving…" })} disabled={isButtonBusy(approveKey)} aria-busy={isButtonBusy(approveKey) || undefined} aria-label="Approve attachment" style={{ padding: "4px 8px", fontSize: 11, background: "#dcfce7", border: "1px solid #166534", borderRadius: 6, cursor: isButtonBusy(approveKey) ? "not-allowed" : "pointer", fontWeight: 700, color: "#166534", opacity: isButtonBusy(approveKey) ? 0.8 : 1 }}>{renderBusyButtonContent(approveKey, "✅", "Approving…")}</button>
																				<button type="button" onClick={() => void runButtonAction(rejectKey, () => handleReviewAttachment(att.id, "reject"), { busyLabel: "Rejecting…" })} disabled={isButtonBusy(rejectKey)} aria-busy={isButtonBusy(rejectKey) || undefined} aria-label="Reject attachment" style={{ padding: "4px 8px", fontSize: 11, background: "#fee2e2", border: "1px solid #991b1b", borderRadius: 6, cursor: isButtonBusy(rejectKey) ? "not-allowed" : "pointer", fontWeight: 700, color: "#991b1b", opacity: isButtonBusy(rejectKey) ? 0.8 : 1 }}>{renderBusyButtonContent(rejectKey, "✗", "Rejecting…")}</button>
																			</>
																		);
																	})()}
																</div>
															</div>
														))}
													</div>
												</div>
											)}
										</div>
									))
								)}
							</div>
						</div>

						<div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}>
							<div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb" }}>
								<div style={{ fontWeight: 800, color: "#0f172a" }}>All attachment files</div>
								<div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Grouped by user so you can scan each owner once and expand only the files you need.</div>
							</div>
							<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
								<thead>
									<tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
										<th style={{ padding: "12px", textAlign: "left" }}>Owner / File</th>
										<th style={{ padding: "12px", textAlign: "left" }}>Errand</th>
										<th style={{ padding: "12px", textAlign: "left" }}>Size</th>
										<th style={{ padding: "12px", textAlign: "left" }}>Status</th>
										<th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
									</tr>
								</thead>
								<tbody>
									{groupedAdminAttachments.map((group) => (
										<Fragment key={`audit-${group.key}`}>
											<tr style={{ background: "#eff6ff", borderBottom: "1px solid #dbeafe" }}>
												<td colSpan={6} style={{ padding: "12px" }}>
													<div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
														<div style={{ display: "grid", gap: 4 }}>
															<button type="button" onClick={() => openCustomerContext(group.userId)} style={{ justifySelf: "start", padding: "4px 10px", borderRadius: 999, border: "1px solid #bfdbfe", background: "#fff", color: "#1d4ed8", fontWeight: 800, cursor: Number.isFinite(Number(group.userId)) ? "pointer" : "default" }}>
																{group.ownerName}
															</button>
															<div style={{ fontSize: 11, color: "#475569" }}>{group.ownerEmail || `User #${group.userId ?? "-"}`} • {group.attachments.length} file{group.attachments.length === 1 ? "" : "s"}</div>
														</div>
														<button type="button" onClick={() => toggleAttachmentGroup(group.key)} aria-expanded={Boolean(expandedAttachmentGroups[group.key])} aria-controls={`audit-attachment-group-${group.key}`} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #bfdbfe", background: "#fff", color: "#1d4ed8", fontWeight: 700, cursor: "pointer" }}>
															{expandedAttachmentGroups[group.key] ? "Hide files ▾" : "Show files ▸"}
														</button>
													</div>
												</td>
											</tr>
											{expandedAttachmentGroups[group.key]
												? group.attachments.map((att) => renderCompactAttachmentAuditRow(att))
												: null}
										</Fragment>
									))}
								</tbody>
							</table>
							{adminAttachments.length === 0 && (
								<div style={{ textAlign: "center", padding: "40px 20px", color: "#999" }}>
									No attachments found
								</div>
							)}
						</div>
					</div>
				)}

				{/* PILOT APPLICATIONS TAB */}
				{adminTab === "pilot-applications" && !adminLoading && (
					<div style={{ overflowX: "auto" }}>
						<table
							style={{
								width: "100%",
								borderCollapse: "collapse",
								fontSize: 13,
							}}
						>
							<thead>
								<tr
									style={{
										background: "#f8fafc",
										borderBottom: "2px solid #e5e7eb",
									}}
								>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Applicant
									</th>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Contact
									</th>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Location
									</th>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Submitted
									</th>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Status
									</th>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Documents
									</th>
								</tr>
							</thead>
							<tbody>
								{adminPilotEmploymentApplications.map((app) => (
									<tr
										key={app.id}
										style={{ borderBottom: "1px solid #e5e7eb" }}
									>
										<td style={{ padding: "12px" }}>
											<div style={{ fontWeight: 600 }}>
												{`${app.first_name || ""} ${app.last_name || ""}`.trim() ||
													"Applicant"}
											</div>
											<div style={{ fontSize: 12, color: "#6b7280" }}>
												#{app.id}
											</div>
										</td>
										<td style={{ padding: "12px" }}>
											<div style={{ fontSize: 12 }}>{app.email || "-"}</div>
											<div style={{ fontSize: 12, color: "#6b7280" }}>
												{app.phone || "-"}
											</div>
										</td>
										<td style={{ padding: "12px", fontSize: 12 }}>
											<div>{app.city || "-"}</div>
											<div style={{ color: "#6b7280" }}>
												{app.country || "-"}
											</div>
										</td>
										<td style={{ padding: "12px", fontSize: 12 }}>
											{app.created_at
												? new Date(app.created_at).toLocaleString()
												: "-"}
										</td>
										<td style={{ padding: "12px" }}>
											<span
												style={{
													display: "inline-block",
													padding: "4px 8px",
													borderRadius: 999,
													fontSize: 11,
													fontWeight: 600,
													background: "#e0e7ff",
													color: "#3730a3",
												}}
											>
												{(app.status || "submitted").toUpperCase()}
											</span>
										</td>
										<td style={{ padding: "12px" }}>
											<div
												style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
											>
												{(app.attachments || []).length === 0 && (
													<span style={{ fontSize: 12, color: "#9ca3af" }}>
														No files
													</span>
												)}
												{(app.attachments || []).map((att) => (
													<div
														key={att.id}
														style={{ display: "flex", gap: 6, alignItems: "center" }}
													>
														<button
															type="button"
															onClick={() => void runButtonAction(`pilot-employment-view-${att.id}`, () =>
																handleViewPilotEmploymentAttachment?.(
																	att.id,
																	att.original_filename,
																),
																{ busyLabel: "Viewing…" },
															)}
															disabled={isButtonBusy(`pilot-employment-view-${att.id}`)}
														style={{
															padding: "4px 8px",
															fontSize: 11,
															background: "#e0f2fe",
															border: "1px solid #0284c7",
															borderRadius: 6,
																cursor: isButtonBusy(`pilot-employment-view-${att.id}`) ? "not-allowed" : "pointer",
															fontWeight: 700,
															color: "#075985",
																opacity: isButtonBusy(`pilot-employment-view-${att.id}`) ? 0.8 : 1,
														}}
														title="View"
													>
															{renderBusyButtonContent(`pilot-employment-view-${att.id}`, `👁️ ${att.label || "file"}`, "Viewing…")}
													</button>
														<button
															type="button"
															onClick={() => void runButtonAction(`pilot-employment-download-${att.id}`, () =>
																handleDownloadPilotEmploymentAttachment(
																	att.id,
																	att.original_filename,
																),
																{ busyLabel: "Downloading…" },
															)}
															disabled={isButtonBusy(`pilot-employment-download-${att.id}`)}
														style={{
															padding: "4px 8px",
															fontSize: 11,
															background: "#f3f4f6",
															border: "1px solid #cbd5f5",
															borderRadius: 6,
																cursor: isButtonBusy(`pilot-employment-download-${att.id}`) ? "not-allowed" : "pointer",
															fontWeight: 700,
															color: "#1f2937",
																opacity: isButtonBusy(`pilot-employment-download-${att.id}`) ? 0.8 : 1,
														}}
														title="Download"
													>
															{renderBusyButtonContent(`pilot-employment-download-${att.id}`, "⬇️", "Downloading…")}
													</button>
													</div>
												))}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
						{adminPilotEmploymentApplications.length === 0 && (
							<div
								style={{
									textAlign: "center",
									padding: "40px 20px",
									color: "#999",
								}}
							>
								No pilot applications yet
							</div>
						)}
					</div>
				)}

				{/* INCIDENTS TAB */}
				{adminTab === "incidents" && !adminLoading && (
					<div
						data-tour="admin-incidents-section"
						style={{
							display: "grid",
							gridTemplateColumns: "minmax(260px, 1fr) 2fr",
							gap: 16,
							minHeight: 360,
						}}
					>
						<div
							data-tour="admin-incidents-list"
							style={{
								border: "1px solid #e5e7eb",
								borderRadius: 8,
								overflowY: "auto",
								maxHeight: 520,
							}}
						>
							{adminIncidents.length === 0 ? (
								<div
									style={{
										textAlign: "center",
										padding: "40px 20px",
										color: "#999",
									}}
								>
									No incidents found
								</div>
							) : (
								adminIncidents.map((incident) => {
									const isSelected = selectedIncident?.id === incident.id;
									return (
										<button
											type="button"
											key={incident.id}
											data-tour="admin-incident-item"
											onClick={() => handleSelectIncident(incident)}
											style={{
												width: "100%",
												textAlign: "left",
												border: "none",
												borderBottom: "1px solid #e5e7eb",
												padding: 12,
												background: isSelected ? "#eef2ff" : "#fff",
												cursor: "pointer",
											}}
										>
											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													gap: 8,
													marginBottom: 6,
												}}
											>
												<div
													style={{
														fontSize: 13,
														fontWeight: 600,
														color: "#1f2937",
													}}
												>
													{incident.incident_type || "Incident"}
												</div>
												<span
													style={{
														padding: "2px 6px",
														borderRadius: 4,
														fontSize: 10,
														fontWeight: 600,
														background:
															incident.status === "open"
																? "#fee2e2"
																: "#dcfce7",
														color:
															incident.status === "open"
																? "#991b1b"
																: "#166534",
													}}
												>
													{(incident.status || "open").toUpperCase()}
												</span>
											</div>
											<div style={{ fontSize: 11, color: "#6b7280" }}>
												Errand:{" "}
												{incident.errand_reference || `#${incident.errand_id}`}
											</div>
											{incident.errand_title && (
												<div
													style={{
														fontSize: 11,
														color: "#9ca3af",
														marginTop: 2,
													}}
												>
													{incident.errand_title}
												</div>
											)}
											<div
												style={{ fontSize: 10, color: "#9ca3af", marginTop: 6 }}
											>
												{incident.created_at
													? new Date(incident.created_at).toLocaleString()
													: "-"}
											</div>
											{incident.description && (
												<div
													style={{
														fontSize: 12,
														color: "#374151",
														marginTop: 8,
														lineHeight: 1.4,
													}}
												>
													{incident.description.length > 120
														? `${incident.description.slice(0, 120)}...`
														: incident.description}
												</div>
											)}
										</button>
									);
								})
							)}
						</div>
						<div
							data-tour="admin-incident-detail"
							style={{
								border: "1px solid #e5e7eb",
								borderRadius: 8,
								padding: 16,
								minHeight: 320,
								display: "flex",
								flexDirection: "column",
							}}
						>
							{!selectedIncident ? (
								<div
									style={{
										textAlign: "center",
										color: "#9ca3af",
										marginTop: 40,
									}}
								>
									Select an incident to view details
								</div>
							) : (
								<>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "flex-start",
											gap: 12,
										}}
									>
										<div>
											<h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>
												{selectedIncident.incident_type || "Incident"}
											</h3>
											<div
												style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}
											>
												Errand:{" "}
												{selectedIncident.errand_reference ||
													`#${selectedIncident.errand_id}`}
											</div>
											{selectedIncident.errand_title && (
												<div style={{ fontSize: 12, color: "#6b7280" }}>
													{selectedIncident.errand_title}
												</div>
											)}
										</div>
										<div
											style={{
												display: "flex",
												gap: 8,
												flexWrap: "wrap",
												justifyContent: "flex-end",
											}}
										>
											<button
												type="button"
												onClick={() => void runButtonAction(`incident-refresh-${selectedIncident.id}`, () =>
													loadIncidentMessages(selectedIncident.id),
													{ busyLabel: "Refreshing…" },
												)}
												disabled={isButtonBusy(`incident-refresh-${selectedIncident.id}`)}
												style={{
													padding: "6px 10px",
													fontSize: 12,
													background: "#f3f4f6",
													border: "1px solid #d1d5db",
													borderRadius: 6,
													cursor: isButtonBusy(`incident-refresh-${selectedIncident.id}`) ? "not-allowed" : "pointer",
													fontWeight: 600,
													color: "#374151",
													opacity: isButtonBusy(`incident-refresh-${selectedIncident.id}`) ? 0.8 : 1,
												}}
											>
												{renderBusyButtonContent(`incident-refresh-${selectedIncident.id}`, "Refresh", "Refreshing…")}
											</button>
											<button
												type="button"
												onClick={() => void runButtonAction(`incident-resolve-${selectedIncident.id}`, () => handleResolveIncident?.(), { busyLabel: "Resolving…" })}
												disabled={
													(selectedIncident.status || "").toLowerCase() ===
													"resolved" || isButtonBusy(`incident-resolve-${selectedIncident.id}`)
												}
												style={{
													padding: "6px 10px",
													fontSize: 12,
													background:
														(selectedIncident.status || "").toLowerCase() ===
														"resolved"
															? "#e5e7eb"
															: "#dcfce7",
													border: "1px solid #16a34a",
													borderRadius: 6,
													cursor:
														(selectedIncident.status || "").toLowerCase() ===
														"resolved" || isButtonBusy(`incident-resolve-${selectedIncident.id}`)
															? "not-allowed"
															: "pointer",
													fontWeight: 600,
													color:
														(selectedIncident.status || "").toLowerCase() ===
														"resolved"
															? "#9ca3af"
															: "#166534",
												}}
											>
												{(selectedIncident.status || "").toLowerCase() ===
												"resolved"
													? "Resolved"
													: renderBusyButtonContent(`incident-resolve-${selectedIncident.id}`, "Mark resolved", "Resolving…")}
											</button>
										</div>
									</div>
									<div
										style={{
											marginTop: 12,
											fontSize: 13,
											color: "#374151",
											background: "#f9fafb",
											padding: 12,
											borderRadius: 8,
											border: "1px solid #e5e7eb",
										}}
									>
										{selectedIncident.description ||
											"No description available."}
									</div>
									<div
										style={{
											marginTop: 16,
											fontSize: 13,
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Updates
									</div>
									<div style={{ marginTop: 8, flex: 1, overflowY: "auto" }}>
										{adminIncidentMessages.length === 0 ? (
											<div style={{ color: "#9ca3af" }}>No updates yet.</div>
										) : (
											adminIncidentMessages.map((msg) => (
												<div
													key={msg.id}
													style={{
														padding: "8px 0",
														borderBottom: "1px solid #f3f4f6",
													}}
												>
													<div
														style={{
															fontSize: 10,
															color: "#9ca3af",
															marginBottom: 4,
														}}
													>
														{(msg.sender_type || "system").toUpperCase()} •{" "}
														{msg.created_at
															? new Date(msg.created_at).toLocaleString()
															: "-"}
													</div>
													<div style={{ fontSize: 12, color: "#374151" }}>
														{msg.message}
													</div>
												</div>
											))
										)}
									</div>
									<div
										style={{
											marginTop: 16,
											borderTop: "1px solid #e5e7eb",
											paddingTop: 12,
										}}
									>
										<div
											style={{
												fontSize: 13,
												fontWeight: 600,
												color: "#374151",
												marginBottom: 8,
											}}
										>
											Send update to customer
										</div>
										<div
											style={{
												marginBottom: 10,
												display: "flex",
												flexWrap: "wrap",
												gap: 8,
											}}
										>
											{customerAlertTemplates.map((template) => (
												<button
													key={template.key}
													type="button"
													onClick={() => {
														setIncidentUpdateDraft(template.message);
														setIncidentNotifyCustomer(true);
													}}
													style={{
														padding: "6px 10px",
														fontSize: 11,
														borderRadius: 999,
														border: "1px solid #c7d2fe",
														background: "#eef2ff",
														color: "#4338ca",
														fontWeight: 600,
														cursor: "pointer",
													}}
												>
													{template.label}
												</button>
											))}
										</div>
										<textarea
											value={incidentUpdateDraft}
											onChange={(e) => setIncidentUpdateDraft(e.target.value)}
											placeholder="Share the latest update with the client..."
											style={{
												width: "100%",
												minHeight: 80,
												padding: 10,
												borderRadius: 8,
												border: "1px solid #d1d5db",
												fontSize: 13,
												resize: "vertical",
											}}
										/>
										<label
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												marginTop: 8,
												fontSize: 12,
												color: "#6b7280",
											}}
										>
											<input
												type="checkbox"
												checked={incidentNotifyCustomer}
												onChange={(e) =>
													setIncidentNotifyCustomer(e.target.checked)
												}
											/>
											Email the customer with this update
										</label>
										<button
											type="button"
											data-tour="admin-send-incident-update"
											onClick={handleSendIncidentUpdate}
											disabled={
												incidentUpdateSending || !incidentUpdateDraft.trim()
											}
											style={{
												marginTop: 10,
												padding: "8px 12px",
												fontSize: 12,
												background:
													incidentUpdateSending || !incidentUpdateDraft.trim()
														? "#e5e7eb"
														: "#2563eb",
												color:
													incidentUpdateSending || !incidentUpdateDraft.trim()
														? "#9ca3af"
														: "#fff",
												border: "none",
												borderRadius: 6,
												cursor:
													incidentUpdateSending || !incidentUpdateDraft.trim()
														? "not-allowed"
														: "pointer",
												fontWeight: 600,
											}}
										>
											{incidentUpdateSending ? renderBusyButtonContent("incident-send-update", "Send update", "Sending…") : "Send update"}
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				)}

				{/* SUPPORT TAB */}
				{adminTab === "support" && !adminLoading && (
					<div
						data-tour="admin-support-section"
						style={{
							display: "grid",
							gridTemplateColumns: "minmax(260px, 1fr) 2fr",
							gap: 16,
							minHeight: 360,
						}}
					>
						<div
							data-tour="admin-support-list"
							style={{
								border: "1px solid #e5e7eb",
								borderRadius: 8,
								overflowY: "auto",
								maxHeight: 520,
							}}
						>
							{adminSupportConversations.length === 0 ? (
								<div
									style={{
										textAlign: "center",
										padding: "40px 20px",
										color: "#999",
									}}
								>
									No support tickets found
								</div>
							) : (
								adminSupportConversations.map((conversation) => {
									const isSelected =
										selectedSupportConversation?.id === conversation.id;
									const handoffRequested = Boolean(
										conversation.handoff_requested,
									);
									const sessionLabel = conversation.session_id
										? conversation.session_id.slice(0, 8)
										: `#${conversation.id}`;
									return (
										<button
											type="button"
											key={conversation.id}
											data-tour="admin-support-ticket"
											onClick={() =>
												handleSelectSupportConversation(conversation)
											}
											style={{
												width: "100%",
												textAlign: "left",
												border: "none",
												borderBottom: "1px solid #e5e7eb",
												padding: 12,
												background: isSelected ? "#ecfeff" : "#fff",
												cursor: "pointer",
											}}
										>
											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													gap: 8,
													marginBottom: 6,
												}}
											>
												<div
													style={{
														fontSize: 13,
														fontWeight: 600,
														color: "#1f2937",
													}}
												>
													Session {sessionLabel}
												</div>
												<span
													style={{
														padding: "2px 6px",
														borderRadius: 4,
														fontSize: 10,
														fontWeight: 600,
														background: handoffRequested
															? "#fee2e2"
															: "#dcfce7",
														color: handoffRequested ? "#991b1b" : "#166534",
													}}
												>
													{handoffRequested ? "HANDOFF" : "ACTIVE"}
												</span>
											</div>
											<div style={{ fontSize: 11, color: "#6b7280" }}>
												Status: {conversation.status || "open"}
											</div>
											<div
												style={{ fontSize: 10, color: "#9ca3af", marginTop: 6 }}
											>
												Updated:{" "}
												{conversation.updated_at
													? new Date(conversation.updated_at).toLocaleString()
													: "-"}
											</div>
										</button>
									);
								})
							)}
						</div>
						<div
							data-tour="admin-support-detail"
							style={{
								border: "1px solid #e5e7eb",
								borderRadius: 8,
								padding: 16,
								minHeight: 320,
								display: "flex",
								flexDirection: "column",
							}}
						>
							{!selectedSupportConversation ? (
								<div
									style={{
										textAlign: "center",
										color: "#9ca3af",
										marginTop: 40,
									}}
								>
									Select a support ticket to view the conversation
								</div>
							) : (
								<>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "flex-start",
											gap: 12,
										}}
									>
										<div>
											<h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>
												Support Ticket
											</h3>
											<div
												style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}
											>
												Session:{" "}
												{selectedSupportConversation.session_id ||
													selectedSupportConversation.id}
											</div>
											<div style={{ fontSize: 12, color: "#6b7280" }}>
												Status: {selectedSupportConversation.status || "open"}
											</div>
										</div>
										<button
											type="button"
											onClick={() => void runButtonAction(`support-refresh-${selectedSupportConversation.id}`, () =>
												loadSupportMessages(selectedSupportConversation.id),
												{ busyLabel: "Refreshing…" },
											)}
											disabled={isButtonBusy(`support-refresh-${selectedSupportConversation.id}`)}
											style={{
												padding: "6px 10px",
												fontSize: 12,
												background: "#f3f4f6",
												border: "1px solid #d1d5db",
												borderRadius: 6,
												cursor: isButtonBusy(`support-refresh-${selectedSupportConversation.id}`) ? "not-allowed" : "pointer",
												fontWeight: 600,
												color: "#374151",
												opacity: isButtonBusy(`support-refresh-${selectedSupportConversation.id}`) ? 0.8 : 1,
											}}
										>
											{renderBusyButtonContent(`support-refresh-${selectedSupportConversation.id}`, "Refresh", "Refreshing…")}
										</button>
									</div>
									<div
										style={{
											marginTop: 16,
											fontSize: 13,
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Conversation
									</div>
									<div style={{ marginTop: 8, flex: 1, overflowY: "auto" }}>
										{adminSupportMessages.length === 0 ? (
											<div style={{ color: "#9ca3af" }}>No messages yet.</div>
										) : (
											adminSupportMessages.map((msg) => (
												<div
													key={msg.id}
													style={{
														padding: "8px 0",
														borderBottom: "1px solid #f3f4f6",
													}}
												>
													<div
														style={{
															fontSize: 10,
															color: "#9ca3af",
															marginBottom: 4,
														}}
													>
														{(msg.sender_type || "system").toUpperCase()} •{" "}
														{msg.created_at
															? new Date(msg.created_at).toLocaleString()
															: "-"}
													</div>
													<div style={{ fontSize: 12, color: "#374151" }}>
														{msg.message}
													</div>
												</div>
											))
										)}
									</div>
									<div
										style={{
											marginTop: 16,
											borderTop: "1px solid #e5e7eb",
											paddingTop: 12,
										}}
									>
										<div
											style={{
												fontSize: 13,
												fontWeight: 600,
												color: "#374151",
												marginBottom: 8,
											}}
										>
											Send update
										</div>
										<textarea
											data-tour="admin-support-reply"
											value={supportReplyDraft}
											onChange={(e) => setSupportReplyDraft(e.target.value)}
											placeholder="Reply to the customer..."
											style={{
												width: "100%",
												minHeight: 80,
												padding: 10,
												borderRadius: 8,
												border: "1px solid #d1d5db",
												fontSize: 13,
												resize: "vertical",
											}}
										/>
										<button
											type="button"
											data-tour="admin-support-send"
											onClick={handleSendSupportMessage}
											disabled={
												supportReplySending || !supportReplyDraft.trim()
											}
											style={{
												marginTop: 10,
												padding: "8px 12px",
												fontSize: 12,
												background:
													supportReplySending || !supportReplyDraft.trim()
														? "#e5e7eb"
														: "#0ea5e9",
												color:
													supportReplySending || !supportReplyDraft.trim()
														? "#9ca3af"
														: "#fff",
												border: "none",
												borderRadius: 6,
												cursor:
													supportReplySending || !supportReplyDraft.trim()
														? "not-allowed"
														: "pointer",
												fontWeight: 600,
											}}
										>
											{supportReplySending ? renderBusyButtonContent("support-send-update", "Send update", "Sending…") : "Send update"}
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				)}

				{/* AVAILABILITY TAB */}
				{adminTab === "availability" && !adminLoading && (
					<div
						style={{
							overflowX: "auto",
							flex: 1,
							borderRadius: 8,
							border: "1px solid #e5e7eb",
						}}
					>
						<div
							style={{
								padding: "14px 16px",
								borderBottom: "1px solid #e5e7eb",
								background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
							}}
						>
							<div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
								Availability audit log
							</div>
							<div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
								This feed records pilot availability requests, reminders, and yes/no responses for active errands. It is functioning when those events exist; an empty table usually means no availability prompts have been sent yet.
							</div>
						</div>
						<table
							style={{
								width: "100%",
								borderCollapse: "collapse",
								fontSize: 13,
								minWidth: "700px",
							}}
						>
							<thead>
								<tr
									style={{
										background: "#f3f4f6",
										borderBottom: "2px solid #e5e7eb",
									}}
								>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
										}}
									>
										Time
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
										}}
									>
										Event
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
										}}
									>
										Errand
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
										}}
									>
										Pilot ID
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
										}}
									>
										Customer
									</th>
									<th
										style={{
											padding: "10px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
											whiteSpace: "nowrap",
										}}
									>
										Note
									</th>
								</tr>
							</thead>
							<tbody>
								{adminAvailabilityEvents.map((event) => (
									<tr
										key={event.id}
										style={{ borderBottom: "1px solid #e5e7eb" }}
									>
										<td
											style={{
												padding: "10px",
												fontSize: 12,
												color: "#6b7280",
											}}
										>
											{event.created_at
												? new Date(event.created_at).toLocaleString()
												: "-"}
										</td>
										<td
											style={{ padding: "10px", fontWeight: 600, fontSize: 12 }}
										>
											{(event.event_type || "").replace(/_/g, " ")}
										</td>
										<td style={{ padding: "10px" }}>
											<div style={{ fontWeight: 600 }}>
												{event.errand_reference || `#${event.errand_id}`}
											</div>
											<div style={{ fontSize: 12, color: "#6b7280" }}>
												{event.errand_title || "Errand"}
											</div>
										</td>
										<td style={{ padding: "10px", fontSize: 12 }}>
											{event.pilot_id || "-"}
										</td>
										<td style={{ padding: "10px", fontSize: 12 }}>
											<div>{event.customer_name || "Customer"}</div>
											<div style={{ color: "#6b7280" }}>
												{event.customer_email || "-"}
											</div>
										</td>
										<td
											style={{
												padding: "10px",
												fontSize: 12,
												color: "#6b7280",
											}}
										>
											{event.note || "-"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
						{adminAvailabilityEvents.length === 0 && (
							<div
								style={{
									textAlign: "center",
									padding: "40px 20px",
									color: "#64748b",
								}}
							>
								No availability events yet. Once pilots receive or answer availability prompts, they will appear here.
							</div>
						)}
					</div>
				)}

				{/* ISSUES TAB */}
				{adminTab === "issues" && !adminLoading && (
					<div style={{ display: "grid", gap: 14 }}>
						<div
							style={{
								padding: "12px 14px",
								border: "1px solid #fde68a",
								borderRadius: 12,
								background: "linear-gradient(135deg, #fff7ed, #fffbeb)",
								display: "flex",
								justifyContent: "space-between",
								gap: 12,
								alignItems: "center",
								flexWrap: "wrap",
							}}
						>
							<div>
								<div style={{ fontWeight: 800, color: "#92400e" }}>
									Pilot “unable to proceed” reports appear under Incidents.
								</div>
								<div style={{ fontSize: 12, color: "#a16207", marginTop: 4 }}>
									Issues is for errand-level dispute metadata; Incidents is the operational queue from pilots.
								</div>
							</div>
							<button
								type="button"
								onClick={() => openAdminTab("incidents")}
								style={{
									padding: "8px 12px",
									borderRadius: 999,
									border: "1px solid #f59e0b",
									background: "#fff",
									color: "#92400e",
									fontWeight: 800,
									cursor: "pointer",
								}}
							>
								Open Incidents
							</button>
						</div>
						<div style={{ overflowX: "auto" }}>
						<table
							style={{
								width: "100%",
								borderCollapse: "collapse",
								fontSize: 13,
							}}
						>
							<thead>
								<tr
									style={{
										background: "#f3f4f6",
										borderBottom: "2px solid #e5e7eb",
									}}
								>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Errand
									</th>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Type
									</th>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Details
									</th>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Status
									</th>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Reported
									</th>
									<th
										style={{
											padding: "12px",
											textAlign: "left",
											fontWeight: 600,
											color: "#374151",
										}}
									>
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{adminIssues.map((issue) => {
									const view = getAdminIssueDisplay(issue);
									return (
									<tr
										key={view.id}
										style={{ borderBottom: "1px solid #e5e7eb" }}
									>
										<td style={{ padding: "12px" }}>
											<div style={{ fontWeight: 700 }}>{view.referenceNumber || `#${view.id}`}</div>
											<div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
												Customer #{issue.user_id} • Errand status: {String(view.errandStatus || "-").replace(/_/g, " ")}
											</div>
										</td>
										<td style={{ padding: "12px", fontWeight: 700 }}>{view.reason}</td>
										<td style={{ padding: "12px", fontSize: 12 }}>
											<div>{view.notes}</div>
											{view.preferredResolution && (
												<div style={{ marginTop: 6, color: "#6366f1", fontWeight: 600 }}>
													Preferred: {view.preferredResolution}
												</div>
											)}
										</td>
										<td style={{ padding: "12px" }}>
											<span
												style={{
													display: "inline-block",
													padding: "4px 8px",
													borderRadius: 4,
													fontSize: 11,
													fontWeight: 600,
													background:
														view.status === "open" ? "#fee2e2" : view.status === "rejected" ? "#fef3c7" : "#dcfce7",
													color:
														view.status === "open" ? "#991b1b" : view.status === "rejected" ? "#92400e" : "#166534",
												}}
											>
												{String(view.status || "open").toUpperCase()}
											</span>
										</td>
										<td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>
											{view.reportedAt ? new Date(view.reportedAt).toLocaleString() : "-"}
										</td>
										<td style={{ padding: "12px", display: "flex", gap: 6 }}>
											{view.status === "open" && (
												<>
													<button
														type="button"
														onClick={() => void runButtonAction(`issue-resolve-${view.id}`, () => handleResolveIssue(view.id, "resolved"), { busyLabel: "Resolving…" })}
														disabled={isButtonBusy(`issue-resolve-${view.id}`)}
														style={{
															padding: "4px 8px",
															fontSize: 11,
															background: "#dcfce7",
															border: "1px solid #166534",
															borderRadius: 4,
															cursor: isButtonBusy(`issue-resolve-${view.id}`) ? "not-allowed" : "pointer",
															opacity: isButtonBusy(`issue-resolve-${view.id}`) ? 0.8 : 1,
															fontWeight: 600,
															color: "#166534",
														}}
													>
														{renderBusyButtonContent(`issue-resolve-${view.id}`, "✓", "Resolving…")}
													</button>
													<button
														type="button"
														onClick={() => void runButtonAction(`issue-reject-${view.id}`, () => handleResolveIssue(view.id, "rejected"), { busyLabel: "Rejecting…" })}
														disabled={isButtonBusy(`issue-reject-${view.id}`)}
														style={{
															padding: "4px 8px",
															fontSize: 11,
															background: "#fee2e2",
															border: "1px solid #991b1b",
															borderRadius: 4,
															cursor: isButtonBusy(`issue-reject-${view.id}`) ? "not-allowed" : "pointer",
															opacity: isButtonBusy(`issue-reject-${view.id}`) ? 0.8 : 1,
															fontWeight: 600,
															color: "#991b1b",
														}}
													>
														{renderBusyButtonContent(`issue-reject-${view.id}`, "✗", "Rejecting…")}
													</button>
												</>
											)}
											{view.status !== "open" && (
												<span style={{ fontSize: 11, color: "#999" }}>-</span>
											)}
										</td>
									</tr>
									);
								})}
							</tbody>
						</table>
						</div>
						{adminIssues.length === 0 && (
							<div
								style={{
									textAlign: "center",
									padding: "40px 20px",
									color: "#999",
								}}
							>
								No issues found
							</div>
						)}
					</div>
				)}

				{/* CALLS TAB */}
				{adminTab === "calls" && !adminLoading && (
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "minmax(260px, 1fr) minmax(320px, 2fr)",
							gap: 16,
						}}
					>
						<div
							style={{
								border: "1px solid #e5e7eb",
								borderRadius: 12,
								padding: 16,
								background: "#fff",
							}}
						>
							<div style={{ fontWeight: 700, marginBottom: 12 }}>
								Call Sessions
							</div>
							{adminCallSessions.length === 0 ? (
								<div style={{ fontSize: 12, color: "#9ca3af" }}>
									No call sessions yet.
								</div>
							) : (
								<div
									style={{ display: "flex", flexDirection: "column", gap: 10 }}
								>
									{adminCallSessions.map((session) => (
										<button
											key={session.id}
											type="button"
											onClick={() => setSelectedCallSession(session)}
											style={{
												border:
													selectedCallSession?.id === session.id
														? "2px solid #6366f1"
														: "1px solid #e5e7eb",
												borderRadius: 10,
												padding: 10,
												background: "#f8fafc",
												textAlign: "left",
												cursor: "pointer",
											}}
										>
											<div style={{ fontWeight: 700, color: "#1f2937" }}>
												Errand #{session.errand_id}
											</div>
											<div style={{ fontSize: 12, color: "#6b7280" }}>
												Status: {session.status}
											</div>
											<div style={{ fontSize: 12, color: "#6b7280" }}>
												{session.created_at
													? new Date(session.created_at).toLocaleString()
													: "-"}
											</div>
										</button>
									))}
								</div>
							)}
						</div>

						<div
							style={{
								border: "1px solid #e5e7eb",
								borderRadius: 12,
								padding: 16,
								background: "#fff",
							}}
						>
							<div style={{ fontWeight: 700, marginBottom: 12 }}>
								Call Events & Transcript
							</div>
							{!selectedCallSession ? (
								<div style={{ fontSize: 12, color: "#9ca3af" }}>
									Select a session to view events.
								</div>
							) : adminCallEvents.length === 0 ? (
								<div style={{ fontSize: 12, color: "#9ca3af" }}>
									No events recorded.
								</div>
							) : (
								<div
									style={{ display: "flex", flexDirection: "column", gap: 10 }}
								>
									<button
										type="button"
										onClick={async () => {
											try {
												const token = localStorage.getItem("authToken");
												const response = await fetch(
													`${process.env.REACT_APP_API_BASE_URL || ""}/admin/calls/${selectedCallSession.id}/transcript/download`,
													{
														headers: { Authorization: `Bearer ${token}` },
													},
												);
												if (!response.ok) return;
												const blob = await response.blob();
												const url = window.URL.createObjectURL(blob);
												const link = document.createElement("a");
												link.href = url;
												link.download = `call-transcript-session-${selectedCallSession.id}.json`;
												document.body.appendChild(link);
												link.click();
												window.URL.revokeObjectURL(url);
												document.body.removeChild(link);
											} catch (err) {
												console.error("Failed to download transcript", err);
											}
										}}
										style={{
											alignSelf: "flex-start",
											padding: "6px 12px",
											borderRadius: 999,
											border: "1px solid #c7d2fe",
											background: "#eef2ff",
											color: "#4338ca",
											fontWeight: 600,
											cursor: "pointer",
										}}
									>
										⬇️ Download transcript
									</button>
									{adminCallEvents.map((event) => (
										<div
											key={event.id}
											style={{
												border: "1px solid #e5e7eb",
												borderRadius: 10,
												padding: 10,
												background: "#f9fafb",
											}}
										>
											<div style={{ fontWeight: 700, color: "#1f2937" }}>
												{event.event_type}
											</div>
											<div style={{ fontSize: 12, color: "#6b7280" }}>
												{event.created_at
													? new Date(event.created_at).toLocaleString()
													: "-"}
											</div>
											<pre
												style={{
													marginTop: 8,
													fontSize: 11,
													whiteSpace: "pre-wrap",
													color: "#374151",
												}}
											>
												{JSON.stringify(event.payload, null, 2)}
											</pre>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}

				{/* STATISTICS TAB */}
				{adminTab === "stats" && (
					<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
						{statsDetailView && (
							<div
								className="admin-stats-detail-overlay"
								role="dialog"
								aria-modal="true"
								aria-label="Statistics details"
								onMouseDown={(event) => {
									if (event.target === event.currentTarget) closeStatsDetail();
								}}
							>
								<div className="admin-stats-detail-panel">
									<div className="admin-stats-detail-header">
										<div>
											<div className="admin-stats-detail-title">
												{statsDetailView === "countries" && "Top Countries"}
												{statsDetailView === "locations" && "Top Locations"}
												{statsDetailView === "visits24h" && "Visits (24h)"}
												{statsDetailView === "sources" && "Visit Sources"}
												{statsDetailView === "funnel" && "Errand Funnel"}
											</div>
											<div className="admin-stats-detail-subtitle">
												{statsDetailView === "visits24h"
													? stats24hViewMode === "recent"
													? stats24hSelectedPoint?.label
														? `Most recent tracked visits for ${stats24hSelectedPoint.label}.`
														: "Most recent tracked visits with timestamps."
														: stats24hViewMode === "map"
															? "Approximate map-style view of the last 24 hours of traffic."
															: "Grouped visit locations from the last 24 hours."
													: "Click outside (or ×) to close."}
											</div>
										</div>
										<button
											type="button"
											className="admin-stats-detail-close"
											onClick={closeStatsDetail}
											aria-label="Close statistics details"
										>
											×
										</button>
									</div>

									{statsDetailView === "countries" && (
										<div style={{ display: "grid", gap: 8 }}>
											{visitCountries.length === 0 ? (
												<div style={{ fontSize: 13, color: "#64748b" }}>
													No country data yet.
												</div>
											) : (
												renderBarRows(
													visitCountries,
													(entry) => entry.country,
														(entry) => formatCountryLabel(entry.country),
													(entry) => entry.count,
												)
											)}
										</div>
									)}

										{statsDetailView === "locations" && (
											<div style={{ display: "grid", gap: 8 }}>
												{visitLocations.length === 0 ? (
													<div style={{ fontSize: 13, color: "#64748b" }}>
														No location data yet.
													</div>
												) : (
													renderBarRows(
														visitLocations,
														(entry) =>
															`${entry.country || "Unknown"}-${entry.region || ""}-${entry.city || ""}`,
														(entry) => formatLocationLabel(entry),
														(entry) => entry.count,
													)
												)}
											</div>
										)}

										{statsDetailView === "visits24h" && (
											<div style={{ display: "grid", gap: 12 }}>
												<div
													style={{
														display: "flex",
														gap: 8,
														flexWrap: "wrap",
													}}
												>
													{[
														{ key: "locations", label: "Top locations" },
														{ key: "recent", label: "Recent visits" },
														{ key: "map", label: "Map" },
													].map((option) => {
														const active = stats24hViewMode === option.key;
														return (
															<button
																key={option.key}
																type="button"
																onClick={() => setStats24hViewMode(option.key)}
																style={{
																	padding: "7px 12px",
																	borderRadius: 999,
																	border: `1px solid ${active ? "#8b5cf6" : "#d1d5db"}`,
																	background: active ? "#f5f3ff" : "#fff",
																	color: active ? "#6d28d9" : "#475569",
																	fontSize: 12,
																	fontWeight: 800,
																	cursor: "pointer",
																}}
															>
																{option.label}
															</button>
														);
													})}
												</div>

												{stats24hViewMode === "locations" && (
													<div style={{ display: "grid", gap: 8 }}>
														{visitLocations24h.length === 0 ? (
															<div style={{ fontSize: 13, color: "#64748b" }}>
																No visit locations recorded in the last 24 hours.
															</div>
														) : (
															renderBarRows(
																visitLocations24h,
																(entry) =>
																	`${entry.country || "Unknown"}-${entry.region || ""}-${entry.city || ""}`,
																(entry) => formatLocationLabel(entry),
																(entry) => entry.count,
															)
														)}
													</div>
												)}

												{stats24hViewMode === "recent" && (
													<div style={{ display: "grid", gap: 8 }}>
														{stats24hSelectedPoint?.label && (
															<div
																style={{
																	display: "flex",
																	alignItems: "center",
																	justifyContent: "space-between",
																	gap: 12,
																	padding: "10px 12px",
																	borderRadius: 12,
																	background: "#f5f3ff",
																	border: "1px solid #ddd6fe",
																}}
															>
																<div style={{ fontSize: 12, color: "#5b21b6", fontWeight: 700 }}>
																	Showing visits for <strong>{stats24hSelectedPoint.label}</strong>
																</div>
																<button
																	type="button"
																	onClick={clearStats24hPointFilter}
																	style={{
																		padding: "6px 10px",
																		borderRadius: 999,
																		border: "1px solid #c4b5fd",
																		background: "#fff",
																		color: "#6d28d9",
																		fontSize: 11,
																		fontWeight: 800,
																		cursor: "pointer",
																	}}
																>
																	Clear filter
																</button>
															</div>
														)}
														{filteredRecentVisits24h.length === 0 ? (
															<div style={{ fontSize: 13, color: "#64748b" }}>
																{stats24hSelectedPoint?.label
																	? `No recent visits matched ${stats24hSelectedPoint.label}.`
																	: "No recent visits were captured in the last 24 hours."}
															</div>
														) : (
															filteredRecentVisits24h.map((visit, index) => {
																const visitCoordinates = resolveVisitMapCoordinates(visit);
																const canShowOnMap = Boolean(visitCoordinates);
																return (
																<div
																	key={`${visit.created_at || "visit"}-${visit.page || "page"}-${index}`}
																	style={{
																		display: "grid",
																		gridTemplateColumns: "minmax(145px, 170px) minmax(160px, 1.3fr) minmax(120px, 0.9fr) minmax(120px, 0.8fr)",
																		gap: 10,
																		alignItems: "center",
																		padding: "10px 12px",
																		borderRadius: 12,
																		background: index % 2 === 0 ? "rgba(15, 23, 42, 0.03)" : "#fff",
																		border: "1px solid rgba(148, 163, 184, 0.16)",
																	}}
																>
																	<div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
																		{visit.created_at ? new Date(visit.created_at).toLocaleString() : "-"}
																	</div>
																	<div style={{ minWidth: 0 }}>
																		<div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
																			{formatLocationLabel(visit)}
																		</div>
																		<div style={{ fontSize: 11, color: "#64748b", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
																			{visit.page || "/"}
																		</div>
																	</div>
																	<div style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>
																		Source: {visit.source || "unknown"}
																	</div>
																	<div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
																		<span
																			style={{
																				display: "inline-flex",
																				padding: "4px 8px",
																				borderRadius: 999,
																				background: "#eef2ff",
																				color: "#4338ca",
																				fontSize: 11,
																				fontWeight: 800,
																			}}
																		>
																			Visit #{index + 1}
																		</span>
																		{canShowOnMap && (
																			<button
																				type="button"
																				onClick={() => showStats24hVisitOnMap(visit)}
																				aria-label={`Show ${formatLocationLabel(visit)} on map`}
																				style={{
																					padding: "5px 8px",
																					borderRadius: 999,
																					border: "1px solid #c7d2fe",
																					background: "#eef2ff",
																					color: "#4338ca",
																					fontSize: 11,
																					fontWeight: 800,
																					cursor: "pointer",
																				}}
																			>
																				Show on map
																			</button>
																		)}
																	</div>
																</div>
																);
															})
														)}
													</div>
												)}

												{stats24hViewMode === "map" && (
													<div style={{ display: "grid", gap: 12 }}>
														<div style={{ fontSize: 12, color: "#475569" }}>
															Click a map bubble or location row to jump into filtered recent visits.
														</div>
														<div
															style={{
																border: "1px solid #e2e8f0",
																borderRadius: 16,
																padding: 12,
																background: "linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)",
															}}
														>
															<svg
																viewBox={`0 0 ${VISIT_MAP_WIDTH} ${VISIT_MAP_HEIGHT}`}
																style={{ width: "100%", height: "auto", display: "block" }}
																role="img"
																aria-label="24 hour visits map"
															>
																<rect x="0" y="0" width={VISIT_MAP_WIDTH} height={VISIT_MAP_HEIGHT} rx="24" fill="url(#visit-map-bg)" />
																<defs>
																	<linearGradient id="visit-map-bg" x1="0" y1="0" x2="0" y2="1">
																		<stop offset="0%" stopColor="#eff6ff" />
																		<stop offset="100%" stopColor="#dbeafe" />
																	</linearGradient>
																</defs>
																{[0.2, 0.4, 0.6, 0.8].map((fraction) => (
																	<line
																		key={`h-${fraction}`}
																		x1="24"
																		y1={Math.round(VISIT_MAP_HEIGHT * fraction)}
																		x2={VISIT_MAP_WIDTH - 24}
																		y2={Math.round(VISIT_MAP_HEIGHT * fraction)}
																		stroke="rgba(59,130,246,0.16)"
																		strokeWidth="1"
																	/>
																))}
																{[0.166, 0.333, 0.5, 0.666, 0.833].map((fraction) => (
																	<line
																		key={`v-${fraction}`}
																		x1={Math.round(VISIT_MAP_WIDTH * fraction)}
																		y1="20"
																		x2={Math.round(VISIT_MAP_WIDTH * fraction)}
																		y2={VISIT_MAP_HEIGHT - 20}
																		stroke="rgba(59,130,246,0.12)"
																		strokeWidth="1"
																	/>
																))}
																{[
																	{ text: "Americas", x: 130, y: 54 },
																	{ text: "Europe / Africa", x: 430, y: 54 },
																	{ text: "Middle East / Asia", x: 680, y: 54 },
																].map((label) => (
																	<text key={label.text} x={label.x} y={label.y} fill="rgba(30,64,175,0.48)" fontSize="18" fontWeight="700">
																		{label.text}
																	</text>
																))}
																{visit24hMapSummary.points.map((point, index) => {
																	const radius = 8 + Math.min(26, Math.sqrt(point.count) * 3.2);
																	const isActive = stats24hSelectedPoint?.key === point.key;
																	return (
																		<g
																			key={point.key || index}
																			role="button"
																			tabIndex={0}
																			aria-label={`Show visits for ${point.label}`}
																			onClick={() => selectStats24hPoint(point)}
																			onKeyDown={(event) => {
																				if (event.key === "Enter" || event.key === " ") {
																					event.preventDefault();
																					selectStats24hPoint(point);
																				}
																			}}
																			style={{ cursor: "pointer" }}
																		>
																			<title>{`Show visits for ${point.label}`}</title>
																			<circle cx={point.position.x} cy={point.position.y} r={radius} fill={isActive ? "rgba(129, 140, 248, 0.34)" : "rgba(147, 51, 234, 0.22)"} stroke={isActive ? "#4338ca" : "rgba(109, 40, 217, 0.85)"} strokeWidth={isActive ? "3" : "2"} />
																			<circle cx={point.position.x} cy={point.position.y} r={Math.max(4, radius / 2.8)} fill={isActive ? "#4338ca" : "#7c3aed"} />
																			<text x={point.position.x} y={point.position.y - radius - 8} textAnchor="middle" fill="#4c1d95" fontSize="12" fontWeight="800">
																				{point.count}
																			</text>
																		</g>
																	);
																})}
															</svg>
														</div>
														<div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#475569" }}>
															<span><strong style={{ color: "#0f172a" }}>{visit24hMapSummary.resolved}</strong> resolved visits</span>
															<span><strong style={{ color: "#0f172a" }}>{visit24hMapSummary.unresolved}</strong> unresolved visits</span>
															<span>Approximate placement uses known city coordinates or country centroids.</span>
														</div>
														{visit24hMapSummary.points.length === 0 && (
															<div style={{ fontSize: 13, color: "#64748b" }}>
																No map-resolvable visits yet for the last 24 hours.
															</div>
														)}
														{visit24hMapSummary.points.length > 0 && (
															<div style={{ display: "grid", gap: 8 }}>
																{visit24hMapSummary.points.slice(0, 8).map((point) => (
																	<button
																		type="button"
																		key={point.key}
																		onClick={() => selectStats24hPoint(point)}
																		style={{
																			display: "flex",
																			justifyContent: "space-between",
																			gap: 12,
																			fontSize: 13,
																			color: "#334155",
																			padding: "8px 10px",
																			borderRadius: 12,
																			background: stats24hSelectedPoint?.key === point.key ? "#eef2ff" : "rgba(255,255,255,0.7)",
																			border: `1px solid ${stats24hSelectedPoint?.key === point.key ? "#c7d2fe" : "rgba(226, 232, 240, 0.9)"}`,
																			cursor: "pointer",
																		}}
																		aria-label={`Show visits for ${point.label}`}
																	>
																		<span>{point.label}</span>
																		<strong style={{ color: "#0f172a" }}>{point.count}</strong>
																	</button>
																))}
															</div>
														)}
													</div>
												)}
											</div>
										)}

									{statsDetailView === "sources" && (
										<div style={{ display: "grid", gap: 8 }}>
											{visitSources.length === 0 ? (
												<div style={{ fontSize: 13, color: "#64748b" }}>
													No sources recorded yet.
												</div>
											) : (
												renderBarRows(
													visitSources,
													(entry) => entry.source,
													(entry) => entry.source,
													(entry) => entry.count,
												)
											)}
										</div>
									)}

									{statsDetailView === "funnel" && (
										<div style={{ display: "grid", gap: 8 }}>
											{funnelEntries.length === 0 ? (
												<div style={{ fontSize: 13, color: "#64748b" }}>
													No funnel data yet.
												</div>
											) : (
												renderBarRows(
													funnelEntries,
													([stage]) => stage,
													([stage]) => String(stage).replace(/_/g, " "),
													([, count]) => count,
												)
											)}
										<div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
											Tip: stages with higher counts get longer bars for quick scanning.
										</div>
									</div>
									)}
								</div>
							</div>
						)}
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								gap: 12,
								flexWrap: "wrap",
							}}
						>
							<div style={{ fontSize: 13, color: "#6b7280" }}>
								Auto-refreshes every 60s.
							</div>
							<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
								<button
									type="button"
									onClick={() => void runButtonAction("stats-reload", () => actions.reloadAdminStats?.(), { busyLabel: "Refreshing…" })}
									disabled={adminStatsRefreshing || isButtonBusy("stats-reload")}
									style={{
										padding: "6px 12px",
										borderRadius: 999,
										border: "1px solid #c7d2fe",
										background: "#eef2ff",
										color: "#4338ca",
										fontWeight: 600,
										cursor: adminStatsRefreshing || isButtonBusy("stats-reload") ? "not-allowed" : "pointer",
										opacity: adminStatsRefreshing || isButtonBusy("stats-reload") ? 0.7 : 1,
									}}
								>
									{adminStatsRefreshing || isButtonBusy("stats-reload")
										? renderBusyButtonContent("stats-reload", "🔄 Reload stats", "Refreshing…")
										: "🔄 Reload stats"}
								</button>
								<button
									type="button"
									onClick={() => void runButtonAction("stats-reset", () => actions.resetAdminStats?.(), { busyLabel: "Resetting…" })}
									disabled={adminStatsRefreshing || !actions.resetAdminStats || isButtonBusy("stats-reset")}
									style={{
										padding: "6px 12px",
										borderRadius: 999,
										border: "1px solid #fecaca",
										background: "#fef2f2",
										color: "#b91c1c",
										fontWeight: 700,
										cursor:
											adminStatsRefreshing || !actions.resetAdminStats || isButtonBusy("stats-reset")
												? "not-allowed"
												: "pointer",
										opacity:
											adminStatsRefreshing || !actions.resetAdminStats || isButtonBusy("stats-reset") ? 0.7 : 1,
									}}
									title="Deletes visit analytics rows (requires password)"
								>
									{renderBusyButtonContent("stats-reset", "🔒 Reset stats", "Resetting…")}
								</button>
							</div>
						</div>
						{!adminStats && (
							<div style={{ fontSize: 13, color: "#6b7280" }}>
								Loading stats…
							</div>
						)}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
								gap: 16,
							}}
						>
							<div
								className="admin-stats-card"
								style={{
									background:
										"linear-gradient(135deg, #eef2ff 0%, #dbeafe 100%)",
									borderRadius: 12,
									padding: 20,
									textAlign: "center",
									boxShadow: "0 12px 24px rgba(59, 130, 246, 0.18)",
									border: "1px solid #bfdbfe",
								}}
							>
								<div
									style={{ fontSize: 32, fontWeight: 700, color: "#2563eb" }}
								>
									{adminStats?.total_users || 0}
								</div>
								<div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
									Total Users
								</div>
							</div>
							<div
								className="admin-stats-card"
								style={{
									background:
										"linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%)",
									borderRadius: 12,
									padding: 20,
									textAlign: "center",
									boxShadow: "0 12px 24px rgba(16, 185, 129, 0.18)",
									border: "1px solid #bbf7d0",
								}}
							>
								<div
									style={{ fontSize: 32, fontWeight: 700, color: "#10b981" }}
								>
									{adminStats?.verified_users || 0}
								</div>
								<div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
									Verified Users
								</div>
							</div>
							<div
								className="admin-stats-card"
								style={{
									background:
										"linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)",
									borderRadius: 12,
									padding: 20,
									textAlign: "center",
									boxShadow: "0 12px 24px rgba(249, 115, 22, 0.2)",
									border: "1px solid #fed7aa",
								}}
							>
								<div
									style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b" }}
								>
									{adminStats?.pending_issues || 0}
								</div>
								<div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
									Open Issues
								</div>
							</div>
							<div
								className="admin-stats-card"
								style={{
									background:
										"linear-gradient(135deg, #f5f3ff 0%, #e9d5ff 100%)",
									borderRadius: 12,
									padding: 20,
									textAlign: "center",
									boxShadow: "0 12px 24px rgba(139, 92, 246, 0.2)",
									border: "1px solid #ddd6fe",
								}}
							>
								<div
									style={{ fontSize: 32, fontWeight: 700, color: "#8b5cf6" }}
								>
									{adminStats?.total_errands || 0}
								</div>
								<div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
									Total Errands
								</div>
							</div>
						</div>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
								gap: 16,
							}}
						>
							<div
								className="admin-stats-card"
								style={{
									background:
										"linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
									borderRadius: 12,
									padding: 20,
									textAlign: "center",
									boxShadow: "0 10px 20px rgba(56, 189, 248, 0.2)",
									border: "1px solid #bae6fd",
								}}
							>
								<div
									style={{ fontSize: 32, fontWeight: 700, color: "#0284c7" }}
								>
									{adminStats?.visits_total || 0}
								</div>
								<div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
									Total Visits
								</div>
							</div>
							<div
								role="button"
								tabIndex={0}
								className={
									visitLocations24h.length
										? "admin-stats-card admin-stats-clickcard"
										: "admin-stats-card admin-stats-clickcard admin-stats-clickcard--disabled"
								}
								onClick={() => {
									if (!visitLocations24h.length) return;
									openStatsDetail("visits24h");
								}}
								onKeyDown={(event) => {
									if (!visitLocations24h.length) return;
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										openStatsDetail("visits24h");
									}
								}}
								style={{
									background:
										"linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
									borderRadius: 12,
									padding: 20,
									textAlign: "center",
									boxShadow: "0 10px 20px rgba(236, 72, 153, 0.2)",
									border: "1px solid #fbcfe8",
								}}
							>
								<div
									style={{ fontSize: 32, fontWeight: 700, color: "#db2777" }}
								>
									{adminStats?.visits_last_24h || 0}
								</div>
								<div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
									Visits (24h)
								</div>
								<div
									style={{
										fontSize: 12,
										color: "#be185d",
										marginTop: 8,
										fontWeight: 600,
									}}
								>
									{visitLocations24h.length
										? "View locations →"
										: "No location detail yet"}
								</div>
							</div>
						</div>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
								gap: 16,
							}}
						>
							<div
								role="button"
								tabIndex={0}
								className={
									visitCountries.length
										? "admin-stats-clickcard"
										: "admin-stats-clickcard admin-stats-clickcard--disabled"
								}
								onClick={() => {
									if (!visitCountries.length) return;
									openStatsDetail("countries");
								}}
								onKeyDown={(event) => {
									if (!visitCountries.length) return;
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										openStatsDetail("countries");
									}
								}}
								style={{
									border: "1px solid #e5e7eb",
									borderRadius: 12,
									padding: 16,
									background:
										"linear-gradient(135deg, rgba(238, 242, 255, 0.7) 0%, rgba(219, 234, 254, 0.6) 100%)",
								}}
							>
								<div
									style={{
										fontSize: 14,
										fontWeight: 700,
										color: "#374151",
										marginBottom: 8,
									}}
								>
									Top Countries
								</div>
								{visitCountries.length === 0 ? (
									<div style={{ fontSize: 12, color: "#9ca3af" }}>
										No visits yet.
									</div>
								) : (
									<div
										style={{ display: "flex", flexDirection: "column", gap: 6 }}
									>
											{visitCountries.slice(0, 4).map((entry) => (
											<div
												key={entry.country}
												style={{
													display: "flex",
													justifyContent: "space-between",
													fontSize: 13,
													color: "#4b5563",
												}}
											>
												<span>{formatCountryLabel(entry.country)}</span>
												<span style={{ fontWeight: 600 }}>{entry.count}</span>
											</div>
										))}
											<div style={{ marginTop: 6, fontSize: 12, color: "#4338ca" }}>
												View details →
											</div>
									</div>
								)}
							</div>

							<div
								role="button"
								tabIndex={0}
								className={
									visitLocations.length
										? "admin-stats-clickcard"
										: "admin-stats-clickcard admin-stats-clickcard--disabled"
								}
								onClick={() => {
									if (!visitLocations.length) return;
									openStatsDetail("locations");
								}}
								onKeyDown={(event) => {
									if (!visitLocations.length) return;
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										openStatsDetail("locations");
									}
								}}
								style={{
									border: "1px solid #e5e7eb",
									borderRadius: 12,
									padding: 16,
									background:
										"linear-gradient(135deg, rgba(240, 253, 250, 0.7) 0%, rgba(204, 251, 241, 0.6) 100%)",
								}}
							>
								<div
									style={{
										fontSize: 14,
										fontWeight: 700,
										color: "#374151",
										marginBottom: 8,
									}}
								>
									Top Locations
								</div>
								{visitLocations.length === 0 ? (
									<div style={{ fontSize: 12, color: "#9ca3af" }}>
										No location data yet.
									</div>
								) : (
									<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
										{visitLocations.slice(0, 4).map((entry) => (
											<div
												key={`${entry.country || "Unknown"}-${entry.region || ""}-${entry.city || ""}`}
												style={{
													display: "flex",
													justifyContent: "space-between",
													fontSize: 13,
													color: "#4b5563",
													gap: 10,
												}}
											>
												<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
													{formatLocationLabel(entry)}
												</span>
												<span style={{ fontWeight: 600 }}>{entry.count}</span>
											</div>
										))}
										<div style={{ marginTop: 6, fontSize: 12, color: "#0f766e" }}>
											View details →
										</div>
									</div>
								)}
							</div>

							<div
								role="button"
								tabIndex={0}
								className={
									visitSources.length
										? "admin-stats-clickcard"
										: "admin-stats-clickcard admin-stats-clickcard--disabled"
								}
								onClick={() => {
									if (!visitSources.length) return;
									openStatsDetail("sources");
								}}
								onKeyDown={(event) => {
									if (!visitSources.length) return;
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										openStatsDetail("sources");
									}
								}}
								style={{
									border: "1px solid #e5e7eb",
									borderRadius: 12,
									padding: 16,
									background:
										"linear-gradient(135deg, rgba(236, 253, 245, 0.7) 0%, rgba(220, 252, 231, 0.6) 100%)",
								}}
							>
								<div
									style={{
										fontSize: 14,
										fontWeight: 700,
										color: "#374151",
										marginBottom: 8,
									}}
								>
									Visit Sources
								</div>
								{visitSources.length === 0 ? (
									<div style={{ fontSize: 12, color: "#9ca3af" }}>
										No sources recorded.
									</div>
								) : (
									<div
										style={{ display: "flex", flexDirection: "column", gap: 6 }}
									>
											{visitSources.slice(0, 4).map((entry) => (
											<div
												key={entry.source}
												style={{
													display: "flex",
													justifyContent: "space-between",
													fontSize: 13,
													color: "#4b5563",
												}}
											>
												<span>{entry.source}</span>
												<span style={{ fontWeight: 600 }}>{entry.count}</span>
											</div>
										))}
											<div style={{ marginTop: 6, fontSize: 12, color: "#047857" }}>
												View details →
											</div>
									</div>
								)}
							</div>

							<div
								role="button"
								tabIndex={0}
								className={
									funnelEntries.length
										? "admin-stats-clickcard"
										: "admin-stats-clickcard admin-stats-clickcard--disabled"
								}
								onClick={() => {
									if (!funnelEntries.length) return;
									openStatsDetail("funnel");
								}}
								onKeyDown={(event) => {
									if (!funnelEntries.length) return;
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										openStatsDetail("funnel");
									}
								}}
								style={{
									border: "1px solid #e5e7eb",
									borderRadius: 12,
									padding: 16,
									background:
										"linear-gradient(135deg, rgba(245, 243, 255, 0.7) 0%, rgba(233, 213, 255, 0.6) 100%)",
								}}
							>
								<div
									style={{
										fontSize: 14,
										fontWeight: 700,
										color: "#374151",
										marginBottom: 8,
									}}
								>
									Errand Funnel
								</div>
								{funnelEntries.length === 0 ? (
									<div style={{ fontSize: 12, color: "#9ca3af" }}>
										No errand activity yet.
									</div>
								) : (
									<div
										style={{ display: "flex", flexDirection: "column", gap: 6 }}
									>
											{funnelEntries.slice(0, 6).map(([stage, count]) => (
											<div
												key={stage}
												style={{
													display: "flex",
													justifyContent: "space-between",
													fontSize: 13,
													color: "#4b5563",
												}}
											>
																						<span>{formatFunnelStageLabel(stage)}</span>
												<span style={{ fontWeight: 600 }}>{count}</span>
											</div>
										))}
											<div style={{ marginTop: 6, fontSize: 12, color: "#6d28d9" }}>
												View details →
											</div>
									</div>
								)}
							</div>
						</div>

						<div style={{ fontSize: 12, color: "#9ca3af" }}>
							Last updated:{" "}
							{adminStats?.last_updated
								? new Date(adminStats.last_updated).toLocaleString()
								: "-"}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default AdminDashboardModal;
