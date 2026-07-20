export function canUseSpeechSynthesis() {
	return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getSpeechRecognitionConstructor() {
	if (typeof window === "undefined") return null;
	return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function canUseSpeechRecognition() {
	return Boolean(getSpeechRecognitionConstructor());
}

export function createSpeechRecognition({
	lang = "en-GB",
	continuous = false,
	interimResults = true,
} = {}) {
	const Recognition = getSpeechRecognitionConstructor();
	if (!Recognition) return null;
	try {
		const recognition = new Recognition();
		recognition.lang = lang;
		recognition.continuous = continuous;
		recognition.interimResults = interimResults;
		return recognition;
	} catch {
		return null;
	}
}

export function cancelSpeech() {
	if (!canUseSpeechSynthesis()) return;
	try {
		window.speechSynthesis.cancel();
	} catch {
		// ignore
	}
}

export function speakText(
	text,
	{ lang = "en-GB", rate = 1, pitch = 1.02, onStart, onEnd, onError } = {},
) {
	if (!canUseSpeechSynthesis()) return false;
	const message = String(text || "").trim();
	if (!message) return false;

	try {
		window.speechSynthesis.cancel();
		const utterance = new window.SpeechSynthesisUtterance(message);
		utterance.lang = lang;
		utterance.rate = rate;
		utterance.pitch = pitch;
		if (typeof onStart === "function") utterance.onstart = onStart;
		if (typeof onEnd === "function") utterance.onend = onEnd;
		if (typeof onError === "function") utterance.onerror = onError;
		window.speechSynthesis.speak(utterance);
		return true;
	} catch {
		return false;
	}
}