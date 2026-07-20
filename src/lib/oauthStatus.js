export async function fetchOAuthStatus({
	apiBaseUrl,
	origin,
	role = "client",
	timeoutMs = 8000,
	fetchImpl = (...args) => fetch(...args),
}) {
	const normalizedBaseUrl = String(apiBaseUrl || "").trim().replace(/\/+$/, "");
	const normalizedOrigin = String(origin || "").trim().replace(/\/+$/, "");
	const normalizedRole = String(role || "client").trim() || "client";

	if (!normalizedBaseUrl) {
		throw new Error("Missing API base URL for OAuth status check");
	}
	if (!normalizedOrigin) {
		throw new Error("Missing frontend origin for OAuth status check");
	}

	const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
	const timeoutId = controller
		? setTimeout(() => controller.abort(), timeoutMs)
		: null;

	try {
		const response = await fetchImpl(
			`${normalizedBaseUrl}/auth/oauth/status?origin=${encodeURIComponent(
				normalizedOrigin,
			)}&role=${encodeURIComponent(normalizedRole)}`,
			controller ? { signal: controller.signal } : undefined,
		);
		const payload = await response.json().catch(() => null);
		if (!response.ok || !payload) {
			throw new Error(payload?.detail || "Unable to load social sign-in status");
		}
		return payload;
	} catch (error) {
		if (error?.name === "AbortError") {
			throw new Error("Timed out while checking social sign-in status");
		}
		throw error;
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
	}
}
