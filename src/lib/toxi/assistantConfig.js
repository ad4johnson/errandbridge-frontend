export const TOXI_ASSISTANT_STORAGE_PREFIX = "toxi_v1_";
export const TOXI_VOICE_REPLIES_STORAGE_KEY = `${TOXI_ASSISTANT_STORAGE_PREFIX}voiceRepliesEnabled`;

function safeStorageGet(key) {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage?.getItem(key) ?? null;
	} catch {
		return null;
	}
}

function safeStorageSet(key, value) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage?.setItem(key, value);
	} catch {
		// ignore
	}
}

export function readVoiceRepliesPreference(fallback = false) {
	const raw = safeStorageGet(TOXI_VOICE_REPLIES_STORAGE_KEY);
	if (raw === null) return Boolean(fallback);
	return raw === "true";
}

export function writeVoiceRepliesPreference(enabled) {
	safeStorageSet(TOXI_VOICE_REPLIES_STORAGE_KEY, enabled ? "true" : "false");
}

export function buildToxiAssistantConfig({
	pathname,
	user,
	mode,
	surface,
	voiceRepliesEnabled,
} = {}) {
	const isLandingConcierge = !user && mode === "concierge";
	const isClientSupportAssistant = Boolean(user) && mode === "client_support";
	const assistantMode = Boolean(isLandingConcierge || isClientSupportAssistant);
	return {
		assistantMode,
		assistantName: "Toxi",
		simplifiedUI: Boolean(isLandingConcierge),
		allowSpeechInput: assistantMode,
		allowSpeechOutput: assistantMode,
		voiceRepliesEnabled: Boolean(voiceRepliesEnabled),
		persistSessionAcrossClose: Boolean(user),
		showTeaser: Boolean(isLandingConcierge),
		teaserText: isLandingConcierge
			? "Hi, I’m Toxi. I can help you figure out the safest way to get something done back home."
			: undefined,
		showBackToTop: assistantMode,
		storageNamespace: TOXI_ASSISTANT_STORAGE_PREFIX,
		pageKey: String(pathname || "/"),
		surface: String(surface || "landing_page"),
	};
}