export const COOKIE_CONSENT_KEY = "eb_cookie_consent_v1";

export const defaultConsent = {
	essential: true,
	analytics: false,
	functional: false,
	marketing: false,
	consentGiven: false,
	consentDate: undefined,
};

export function getStoredCookieConsent() {
	if (typeof window === "undefined") return null;

	try {
		const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return null;

		// Minimal validation + forward compatibility.
		return {
			...defaultConsent,
			...parsed,
			essential: true,
		};
	} catch {
		return null;
	}
}

export function saveCookieConsent(consent) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
	} catch {
		// ignore
	}
}

export function clearCookieConsent() {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(COOKIE_CONSENT_KEY);
	} catch {
		// ignore
	}
}
