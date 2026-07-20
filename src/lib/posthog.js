import { getStoredCookieConsent } from "../components/cookies/cookie-consent";

const DEFAULT_API_HOST = "https://app.posthog.com";

let posthogInstance = null;
let posthogLoadPromise = null;
let posthogInitPromise = null;

async function loadPosthog() {
	if (posthogInstance) return posthogInstance;
	if (posthogLoadPromise) return posthogLoadPromise;

	posthogLoadPromise = import("posthog-js")
		.then((mod) => {
			posthogInstance = mod?.default || mod;
			return posthogInstance;
		})
		.catch((err) => {
			posthogLoadPromise = null;
			throw err;
		});

	return posthogLoadPromise;
}

async function ensurePosthogInit() {
	if (typeof window === "undefined") return null;
	if (!isPosthogEnabled()) return null;
	if (!hasAnalyticsConsent()) return null;

	const key = process.env.REACT_APP_POSTHOG_KEY;
	if (!key) return null;

	const apiHost = process.env.REACT_APP_POSTHOG_HOST || DEFAULT_API_HOST;

	if (posthogInitPromise) return posthogInitPromise;

	posthogInitPromise = loadPosthog()
		.then((posthog) => {
			try {
				// Idempotent init: posthog-js no-ops if already initialised.
				posthog.init(key, {
					api_host: apiHost,
					capture_pageview: false,
					// Respect user DNT if enabled by browser.
					respect_dnt: true,
				});
			} catch {
				// ignore
			}
			return posthog;
		})
		.catch(() => {
			posthogInitPromise = null;
			return null;
		});

	return posthogInitPromise;
}

export function isPosthogEnabled() {
	// Explicit toggle wins.
	const enabledFlag = (
		process.env.REACT_APP_POSTHOG_ENABLED || ""
	).toLowerCase();
	if (enabledFlag === "false" || enabledFlag === "0") return false;
	if (enabledFlag === "true" || enabledFlag === "1") return true;

	// Disable automatically in test.
	if (process.env.NODE_ENV === "test") return false;

	// Default: enabled only when a key is present.
	return Boolean(process.env.REACT_APP_POSTHOG_KEY);
}

export function hasAnalyticsConsent() {
	// In tests we always treat as no-consent to avoid noisy init.
	if (process.env.NODE_ENV === "test") return false;
	const consent = getStoredCookieConsent();
	return Boolean(consent?.consentGiven && consent?.analytics);
}

export function setPosthogConsent(enabled) {
	if (typeof window === "undefined") return;
	if (enabled) {
		// When enabling, initialise (idempotent) and opt-in.
		ensurePosthogInit()
			.then((posthog) => {
				posthog?.opt_in_capturing?.();
			})
			.catch(() => {
				// ignore
			});
		return;
	}

	// When disabling, opt-out and clear stored identifiers.
	loadPosthog()
		.then((posthog) => {
			posthog?.opt_out_capturing?.();
			posthog?.reset?.();
		})
		.catch(() => {
			// ignore
		});
}

export function initPosthog() {
	// Fire-and-forget: intentionally async so PostHog is not bundled/loaded
	// until analytics consent is granted.
	ensurePosthogInit();
	return null;
}

export function capturePosthog(event, props = {}) {
	ensurePosthogInit()
		.then((posthog) => {
			if (!posthog) return;
			posthog.capture?.(event, props);
		})
		.catch(() => {
			// ignore
		});
}

export function identifyPosthog(distinctId, props = {}) {
	if (!isPosthogEnabled()) return;
	if (!distinctId) return;
	ensurePosthogInit()
		.then((posthog) => {
			if (!posthog) return;
			posthog.identify?.(String(distinctId), props);
		})
		.catch(() => {
			// ignore
		});
}

// Back-compat default export (some older code may import the instance).
// This stays as a lightweight stub so the `posthog-js` package is not
// bundled unless consent is granted.
const posthogStub = {
	init: () => {},
	capture: () => {},
	identify: () => {},
	reset: () => {},
	opt_in_capturing: () => {},
	opt_out_capturing: () => {},
};

export default posthogStub;
