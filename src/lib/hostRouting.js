export const isPilotHostname = (hostname = "") => {
	const normalized = String(hostname || "").trim().toLowerCase();
	if (!normalized) return false;
	return normalized === "pilot.errandbridge.com" || normalized.startsWith("pilot.");
};

export const getCurrentHostname = () => {
	if (typeof window === "undefined") return "";
	return window.location?.hostname || "";
};

export const isPilotRuntimeHost = () => isPilotHostname(getCurrentHostname());