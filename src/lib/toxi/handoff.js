// Toxi concierge handoff (sessionStorage)
//
// Purpose:
// - Landing concierge captures a structured prefill payload.
// - After signup/login, /client/create consumes it and pre-fills the real create form.
//
// Design notes:
// - Stored in sessionStorage (tab-scoped) to reduce cross-user leakage.
// - Payload is validated and expires after a short TTL.

export const TOXI_CONCIERGE_HANDOFF_KEY = "eb_toxi_concierge_handoff_v1";

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const safeSessionGet = (key) => {
	if (typeof window === "undefined") return null;
	try {
		return window.sessionStorage?.getItem(key) || null;
	} catch {
		return null;
	}
};

const safeSessionSet = (key, value) => {
	if (typeof window === "undefined") return false;
	try {
		window.sessionStorage?.setItem(key, value);
		return true;
	} catch {
		return false;
	}
};

const safeSessionRemove = (key) => {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage?.removeItem(key);
	} catch {
		// ignore
	}
};

const isPlainObject = (value) =>
	Boolean(value && typeof value === "object" && !Array.isArray(value));

export function writeToxiConciergeHandoff(payload) {
	if (!isPlainObject(payload)) return false;
	const version = Number(payload.version);
	const createdAt = Number(payload.createdAt);
	if (version !== 1) return false;
	if (!Number.isFinite(createdAt) || createdAt <= 0) return false;
	if (!isPlainObject(payload.prefill)) return false;
	return safeSessionSet(TOXI_CONCIERGE_HANDOFF_KEY, JSON.stringify(payload));
}

export function readToxiConciergeHandoff({ ttlMs = DEFAULT_TTL_MS, now = Date.now() } = {}) {
	const raw = safeSessionGet(TOXI_CONCIERGE_HANDOFF_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!isPlainObject(parsed)) return null;
		if (Number(parsed.version) !== 1) return null;
		const createdAt = Number(parsed.createdAt);
		if (!Number.isFinite(createdAt) || createdAt <= 0) return null;
		if (Number.isFinite(ttlMs) && ttlMs > 0 && now - createdAt > ttlMs) return null;
		if (!isPlainObject(parsed.prefill)) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function clearToxiConciergeHandoff() {
	safeSessionRemove(TOXI_CONCIERGE_HANDOFF_KEY);
}

export function consumeToxiConciergeHandoff(options) {
	const payload = readToxiConciergeHandoff(options);
	clearToxiConciergeHandoff();
	return payload;
}
