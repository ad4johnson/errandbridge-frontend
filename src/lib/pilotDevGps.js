import { isLocalLikeApiBaseUrl } from "./apiBaseUrl";

const LOCAL_HOSTS = new Set([
	"localhost",
	"127.0.0.1",
	"host.docker.internal",
]);

const PRIVATE_IPV4_PATTERN =
	/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

export function isLocalDevHostname(hostname) {
	const normalized = String(hostname || "").trim().toLowerCase();
	if (!normalized) return false;
	return (
		LOCAL_HOSTS.has(normalized) ||
		PRIVATE_IPV4_PATTERN.test(normalized) ||
		normalized.endsWith(".local")
	);
}

export function canUsePilotDevGpsTestMode(apiBaseUrl) {
	if (typeof window === "undefined") return false;
	const runtimeHost = String(window.location?.hostname || "").trim().toLowerCase();
	return isLocalDevHostname(runtimeHost) || isLocalLikeApiBaseUrl(apiBaseUrl);
}
