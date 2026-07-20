import { capturePosthog, hasAnalyticsConsent, initPosthog, isPosthogEnabled } from "./posthog";

const EB_EVENT_BUFFER_KEY = "eb_event_buffer_v2";
const EB_SESSION_ID_KEY = "eb_session_id_v2";
const EB_AB_VARIANT_KEY = "eb_ab_variant_v2";

function safeStorageGet(storage, key) {
	try {
		return storage?.getItem(key) ?? null;
	} catch {
		return null;
	}
}

function safeStorageSet(storage, key, value) {
	try {
		storage?.setItem(key, value);
	} catch {
		// ignore
	}
}

function createId() {
	return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateSessionId() {
	if (typeof window === "undefined") return "ssr";
	const existing = safeStorageGet(window.sessionStorage, EB_SESSION_ID_KEY);
	if (existing) return existing;
	const next = createId();
	safeStorageSet(window.sessionStorage, EB_SESSION_ID_KEY, next);
	return next;
}

export function getOrCreateVariant() {
	if (typeof window === "undefined") return "A";
	const existing = safeStorageGet(window.sessionStorage, EB_AB_VARIANT_KEY);
	if (existing) return existing;
	const next = Math.random() < 0.5 ? "A" : "B";
	safeStorageSet(window.sessionStorage, EB_AB_VARIANT_KEY, next);
	return next;
}

function getPageProps() {
	if (typeof window === "undefined") {
		return { path: null, hash: null };
	}
	return {
		path: window.location.pathname,
		hash: window.location.hash,
	};
}

function bufferEvent(entry) {
	if (typeof window === "undefined") return;
	try {
		const raw = safeStorageGet(window.sessionStorage, EB_EVENT_BUFFER_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		const arr = Array.isArray(parsed) ? parsed : [];
		arr.push(entry);
		const capped = arr.length > 250 ? arr.slice(arr.length - 250) : arr;
		safeStorageSet(
			window.sessionStorage,
			EB_EVENT_BUFFER_KEY,
			JSON.stringify(capped),
		);
	} catch {
		// ignore
	}
}

// Naming contract helper.
export function track(event, props = {}) {
	if (typeof window === "undefined") return;

	const analyticsAllowed = isPosthogEnabled() && hasAnalyticsConsent();
	if (analyticsAllowed) {
		// Ensure PostHog is initialised (cheap idempotent call).
		initPosthog();
	}

	const entry = {
		ts: Date.now(),
		sessionId: getOrCreateSessionId(),
		variant: getOrCreateVariant(),
		event,
		props: {
			...getPageProps(),
			...props,
		},
	};

	bufferEvent(entry);

	if (analyticsAllowed) {
		capturePosthog(event, {
			...entry.props,
			session_id: entry.sessionId,
			variant: entry.variant,
			ts: new Date(entry.ts).toISOString(),
		});
	}

	if (process.env.NODE_ENV !== "production") {
		// eslint-disable-next-line no-console
		console.debug("[EB_TRACK]", entry);
	}
}

// Expose buffer + tracker for QA.
if (typeof window !== "undefined") {
	window.__ebTrack = track;
}
