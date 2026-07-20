// Shared API base URL resolver (used by lightweight entrypoints like LandingApp).
// App.js and RootApp.js also compute API_BASE_URL internally; this helper keeps
// new standalone widgets from duplicating too much logic.

// CRA/Webpack only inlines `process.env.REACT_APP_*` when accessed with a
// literal property (dot notation). A dynamic lookup like `process.env[key]`
// will not be inlined and (with Webpack 5) `process` may be undefined at
// runtime in the browser/WKWebView.
//
// We therefore capture a *static* snapshot using dot-notation so it is
// inlined at build time, but still prefer runtime `process.env` when it
// exists (Node/Jest tests).
const STATIC_ENV = {
	NODE_ENV: process.env.NODE_ENV,
	PUBLIC_URL: process.env.PUBLIC_URL,
	REACT_APP_API_BASE: process.env.REACT_APP_API_BASE,
	REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
	REACT_APP_LOCAL_API_BASE: process.env.REACT_APP_LOCAL_API_BASE,
	REACT_APP_FORCED_API_BASE: process.env.REACT_APP_FORCED_API_BASE,
	REACT_APP_FORCE_API_BASE: process.env.REACT_APP_FORCE_API_BASE,
	REACT_APP_USE_DEVICE_API: process.env.REACT_APP_USE_DEVICE_API,
	REACT_APP_DEVICE_API_BASE: process.env.REACT_APP_DEVICE_API_BASE,
	REACT_APP_CAPACITOR_API_BASE: process.env.REACT_APP_CAPACITOR_API_BASE,
	REACT_APP_CAPACITOR_API_BASE_IOS: process.env.REACT_APP_CAPACITOR_API_BASE_IOS,
	REACT_APP_CAPACITOR_API_BASE_ANDROID:
		process.env.REACT_APP_CAPACITOR_API_BASE_ANDROID,
	REACT_APP_CAPACITOR_USE_HOSTED_API:
		process.env.REACT_APP_CAPACITOR_USE_HOSTED_API,
	REACT_APP_CAPACITOR_HOSTED_API_BASE:
		process.env.REACT_APP_CAPACITOR_HOSTED_API_BASE,
	REACT_APP_CAPACITOR_HOSTED_API_BASE_URL:
		process.env.REACT_APP_CAPACITOR_HOSTED_API_BASE_URL,
};

const readEnv = (key) => {
	try {
		const isJestRuntime =
			typeof process !== "undefined" &&
			process.env &&
			typeof process.env.JEST_WORKER_ID !== "undefined";
		if (isJestRuntime && typeof process !== "undefined" && process.env) {
			// In tests we want `withEnv()` changes to be observed immediately.
			return process.env[key];
		}
		return STATIC_ENV[key];
	} catch {
		return STATIC_ENV[key];
	}
};

const isCapacitorSchemeRuntime = () => {
	if (typeof window === "undefined") return false;
	try {
		const protocol = String(window.location?.protocol || "").toLowerCase();
		// Capacitor typically serves the app from capacitor://localhost (or ionic://localhost).
		return protocol === "capacitor:" || protocol === "ionic:";
	} catch {
		return false;
	}
};

const isCapacitorRuntime = () => {
	if (typeof window === "undefined") return false;
	// Prefer the official bridge object when present, but fall back to scheme detection.
	return typeof window.Capacitor !== "undefined" || isCapacitorSchemeRuntime();
};

const getCapacitorPlatform = () => {
	if (typeof window === "undefined") return null;

	// If the bridge object exists, use it.
	if (typeof window.Capacitor !== "undefined") {
		return (
			window.Capacitor?.getPlatform?.() ||
			(/Android/i.test(window.navigator?.userAgent || "")
				? "android"
				: "ios")
		);
	}

	// Fallback: when running in a native WebView, the bridge can occasionally be
	// unavailable at module-evaluation time. The URL scheme is still reliable.
	if (isCapacitorSchemeRuntime()) {
		return /Android/i.test(window.navigator?.userAgent || "") ? "android" : "ios";
	}

	return null;
};

export const RUNTIME_API_BASE_OVERRIDE_KEY = "eb_runtime_api_base_override";

export const getCapacitorHostedBaseUrl = () =>
	readEnv("REACT_APP_CAPACITOR_HOSTED_API_BASE") ||
	readEnv("REACT_APP_CAPACITOR_HOSTED_API_BASE_URL") ||
	readEnv("REACT_APP_API_BASE") ||
	readEnv("REACT_APP_API_BASE_URL") ||
	"https://api.errandbridge.com";

const isPrivateIpv4Host = (hostname) => {
	const normalized = String(hostname || "").trim();
	if (!normalized) return false;
	if (/^10\./.test(normalized)) return true;
	if (/^192\.168\./.test(normalized)) return true;
	const match = normalized.match(/^172\.(\d{1,3})\./);
	if (!match) return false;
	const octet = Number(match[1]);
	return Number.isFinite(octet) && octet >= 16 && octet <= 31;
};

const sanitizeRuntimeOverride = (value) => {
	const trimmed = String(value || "").trim();
	if (!trimmed) return undefined;

	try {
		const parsed = new URL(trimmed);
		if (!parsed.hostname) return undefined;
		if (!/^(https?:)$/i.test(parsed.protocol)) return undefined;

		const hostname = String(parsed.hostname || "").trim();
		// Guard against typos like "http://172.0.0:8001" (3 octets) which can never
		// be reached as an IPv4 host.
		if (/^\d+\.\d+\.\d+$/.test(hostname)) return undefined;
		// Guard against the common mistaken "172.0.0.x" range (private is 172.16-31).
		if (/^172\.0\.0\./.test(hostname)) return undefined;

		// Runtime overrides are expected to be API *base* URLs; strip path/query/hash.
		parsed.pathname = "";
		parsed.search = "";
		parsed.hash = "";

		return parsed.toString().replace(/\/+$/, "");
	} catch {
		return undefined;
	}
};

export function getRuntimeApiBaseOverride() {
	if (typeof window === "undefined") return undefined;
	try {
		const value = window.localStorage?.getItem?.(RUNTIME_API_BASE_OVERRIDE_KEY);
		const sanitized = sanitizeRuntimeOverride(value);
		if (!sanitized && value) {
			window.localStorage?.removeItem?.(RUNTIME_API_BASE_OVERRIDE_KEY);
		}
		return sanitized;
	} catch {
		return undefined;
	}
}

export function setRuntimeApiBaseOverride(value) {
	if (typeof window === "undefined") return;
	try {
		const sanitized = sanitizeRuntimeOverride(value);
		if (!sanitized) {
			window.localStorage?.removeItem?.(RUNTIME_API_BASE_OVERRIDE_KEY);
			return;
		}
		window.localStorage?.setItem?.(RUNTIME_API_BASE_OVERRIDE_KEY, sanitized);
	} catch {
		// ignore storage failures
	}
}

export function isLoopbackApiBaseUrl(baseUrl) {
	const raw = String(baseUrl || "").trim();
	if (!raw) return false;
	try {
		const parsed = new URL(raw);
		return ["localhost", "127.0.0.1"].includes(parsed.hostname);
	} catch {
		return raw.includes("localhost") || raw.includes("127.0.0.1");
	}
}

export function isHostedApiBaseUrl(baseUrl) {
	const raw = String(baseUrl || "").trim();
	if (!raw) return false;

	// Treat the canonical production API host as "hosted" even if the current
	// environment overrides REACT_APP_API_BASE to a localhost/LAN URL.
	const CANONICAL_HOSTED_HOSTS = new Set(["api.errandbridge.com"]);
	const hostedBase = String(getCapacitorHostedBaseUrl() || "").trim();
	try {
		const candidate = new URL(raw);
		const candidateHost = String(candidate.hostname || "").trim().toLowerCase();
		if (CANONICAL_HOSTED_HOSTS.has(candidateHost)) return true;
		if (!hostedBase) return false;
		const hosted = new URL(hostedBase);
		const hostedHost = String(hosted.hostname || "").trim().toLowerCase();
		return Boolean(candidateHost && hostedHost && candidateHost === hostedHost);
	} catch {
		if (/^https?:\/\//i.test(raw) && raw.toLowerCase().includes("api.errandbridge.com")) {
			return true;
		}
		return hostedBase ? raw === hostedBase : false;
	}
}

export function isLocalLikeApiBaseUrl(baseUrl) {
	const raw = String(baseUrl || "").trim();
	if (!raw) return false;
	if (isLoopbackApiBaseUrl(raw)) return true;
	try {
		const parsed = new URL(raw);
		const hostname = String(parsed.hostname || "").trim().toLowerCase();
		if (!hostname) return false;
		return (
			isPrivateIpv4Host(hostname) ||
			hostname.endsWith(".local") ||
			hostname === "host.docker.internal"
		);
	} catch {
		return false;
	}
}

export function buildPilotStorageKey(baseUrl) {
	if (!baseUrl) return "unknown";
	return String(baseUrl)
		.replace(/^https?:\/\//, "")
		.replace(/[^\w.-]/g, "_");
}

export function normalizeCapacitorLoopbackBaseUrl(baseUrl, platform) {
	const raw = String(baseUrl || "").trim();
	if (!raw) return raw;
	if (platform !== "ios") return raw;
	try {
		const parsed = new URL(raw);
		// In this repo, local dev backend is pinned to :8001.
		// Historically some builds used :8000; normalize stale loopback ports.
		if (["localhost", "127.0.0.1"].includes(parsed.hostname)) {
			if (!parsed.port || parsed.port === "8000") {
				parsed.port = "8001";
			}
		}
		return parsed.toString().replace(/\/$/, "");
	} catch {
		let normalized = raw;
		if (normalized.includes("http://localhost:8000")) {
			normalized = normalized.replace("http://localhost:8000", "http://localhost:8001");
		}
		if (normalized.includes("http://127.0.0.1:8000")) {
			normalized = normalized.replace("http://127.0.0.1:8000", "http://127.0.0.1:8001");
		}
		return normalized;
	}
}

export function getCapacitorLoopbackFallbackUrl(url, platform) {
	const raw = String(url || "").trim();
	if (!raw || platform !== "ios") return null;
	try {
		const parsed = new URL(raw);
		if (parsed.hostname === "localhost") {
			parsed.hostname = "127.0.0.1";
			return parsed.toString();
		}
		if (parsed.hostname === "127.0.0.1") {
			parsed.hostname = "localhost";
			return parsed.toString();
		}
		return null;
	} catch {
		if (raw.includes("http://localhost")) {
			return raw.replace("http://localhost", "http://127.0.0.1");
		}
		if (raw.includes("http://127.0.0.1")) {
			return raw.replace("http://127.0.0.1", "http://localhost");
		}
		return null;
	}
}

export function resolveApiBaseUrl() {
	const isCapacitor = isCapacitorRuntime();
	const isBuildProduction = readEnv("NODE_ENV") === "production";
	const runtimeHost =
		typeof window !== "undefined" ? String(window.location?.hostname || "") : "";
	const runtimeOverride = getRuntimeApiBaseOverride();
	const useDeviceApi = readEnv("REACT_APP_USE_DEVICE_API") === "true";
	const deviceApiBase = readEnv("REACT_APP_DEVICE_API_BASE");
	const inferredHost =
		typeof window !== "undefined" ? window.location.hostname : "";
	const isLocalHost = ["localhost", "127.0.0.1"].includes(inferredHost);
	// Keep desktop localhost separate from real-device/native testing. A local
	// `.env.development.local` may intentionally point device builds to a LAN IP,
	// but `npm start` on localhost should continue talking to the local backend
	// unless the user explicitly requests otherwise at runtime.
	const deviceApiEnabled = Boolean(
		useDeviceApi && deviceApiBase && !(!isCapacitor && isLocalHost),
	);
	const forceApiBase = readEnv("REACT_APP_FORCE_API_BASE") === "true";
	const useHostedCapacitorApi = readEnv("REACT_APP_CAPACITOR_USE_HOSTED_API") === "true";
	const shouldIgnoreRuntimeOverrideForDeviceApi = deviceApiEnabled;
	// If the build explicitly forces an API base (common for local native debugging),
	// ignore any persisted runtime override so we don't get "stuck" on a previous
	// hosted URL.
	const effectiveRuntimeOverride =
		forceApiBase || shouldIgnoreRuntimeOverrideForDeviceApi
			? undefined
			: runtimeOverride;
	const localApiBase =
		readEnv("REACT_APP_LOCAL_API_BASE") || "http://localhost:8001";

	if (isCapacitor) {
		const platform = getCapacitorPlatform() || "ios";
		// Capacitor local defaults:
		// - Android emulator: 10.0.2.2 (host machine)
		// - iOS simulator: localhost
		// - Live reload on device (server.url = http://<LAN_IP>:3000): use the *current* host
		//   so API calls hit http://<LAN_IP>:8001 instead of an unreachable localhost.
		const shouldUseDevHostAsApiBase =
			!isBuildProduction &&
			Boolean(runtimeHost) &&
			!new Set(["localhost", "127.0.0.1", "10.0.2.2"]).has(runtimeHost) &&
			(isPrivateIpv4Host(runtimeHost) ||
				runtimeHost.endsWith(".local") ||
				runtimeHost === "host.docker.internal");
		const capacitorLocalHost = shouldUseDevHostAsApiBase
			? runtimeHost
			: platform === "android"
				? "10.0.2.2"
				: "localhost";
		const capacitorLocalDefault = `http://${capacitorLocalHost}:8001`;
		const platformSpecificCapacitorBase =
			platform === "android"
				? readEnv("REACT_APP_CAPACITOR_API_BASE_ANDROID")
				: readEnv("REACT_APP_CAPACITOR_API_BASE_IOS");
		const capacitorHostedBase = getCapacitorHostedBaseUrl();
		const capacitorDefaultBase = isBuildProduction
			? capacitorHostedBase
			: capacitorLocalDefault;
		const forcedBase =
			readEnv("REACT_APP_FORCED_API_BASE") ||
			platformSpecificCapacitorBase ||
			readEnv("REACT_APP_CAPACITOR_API_BASE") ||
			capacitorDefaultBase;
		const resolved =
			(deviceApiEnabled
				? deviceApiBase
				: effectiveRuntimeOverride) ||
			(deviceApiEnabled
				? deviceApiBase
				: forceApiBase
					? forcedBase
					: useHostedCapacitorApi
						? capacitorHostedBase
						: capacitorDefaultBase);
		return normalizeCapacitorLoopbackBaseUrl(resolved, platform);
	}

	// Keep localhost web deterministic. A persisted runtime override is useful for
	// native shells and explicit remote testing, but on desktop localhost it can
	// silently strand the app on a stale LAN/hosted backend and surface only a
	// generic browser fetch failure. On localhost web, prefer the configured local
	// dev API unless the build explicitly forces a different base.
	const effectiveWebRuntimeOverride =
		!isCapacitor && isLocalHost && !forceApiBase ? undefined : runtimeOverride;

	const explicitApiBase =
		readEnv("REACT_APP_API_BASE") || readEnv("REACT_APP_API_BASE_URL");
	if (effectiveWebRuntimeOverride) {
		return effectiveWebRuntimeOverride;
	}
	if (explicitApiBase) {
		// Device testing toggle always wins (explicit and deterministic).
		if (deviceApiEnabled) return deviceApiBase;

		// Localhost QA footgun: a production build served from http://localhost:* will
		// still inline REACT_APP_API_BASE=https://api.errandbridge.com from
		// `.env.production`. That causes Stripe checkouts to return to production,
		// which cannot access localhost sessionStorage snapshots (=> no receipt).
		//
		// When the *runtime* host is localhost/127.0.0.1 and the explicit API base is
		// the hosted API, prefer the local backend unless the build explicitly forces
		// an API base. Users can still point to hosted via runtime override.
		if (!forceApiBase && isLocalHost && isHostedApiBaseUrl(explicitApiBase)) {
			return localApiBase;
		}

		return explicitApiBase;
	}

	const fallbackBase =
		!forceApiBase && isLocalHost
			? localApiBase
			: "https://api.errandbridge.com";
	return deviceApiEnabled ? deviceApiBase : fallbackBase;
}
