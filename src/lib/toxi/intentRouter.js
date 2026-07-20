// Shared intent routing utilities for Toxi.
//
// Goals:
// - Classify a message into operational modes (track/create/update/proof/pricing/support)
//   BEFORE asking follow-up questions.
// - Keep deterministic concierge intake limited to Create intent.

/** @typedef {'track'|'create'|'update'|'proof'|'pricing'|'support'} ToxiIntentMode */
/** @typedef {'landing_page'|'client_dashboard'|'create_flow'|'tracking_page'|'client_errand_detail'} ToxiSurface */

export const TOXI_ERRAND_REF_REGEX = /\bEB[\s_-]*\d{1,6}[\s_-]*\d{1,10}\b/i;

export const normalizeForMatch = (raw) =>
	String(raw || "")
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

export function extractErrandReference(raw) {
	const text = String(raw || "").trim();
	if (!text) return null;
	const match = text.match(TOXI_ERRAND_REF_REGEX);
	if (!match) return null;

	return String(match[0])
		.replace(/[\s_]+/g, "-")
		.replace(/-+/g, "-")
		.toUpperCase();
}

export function extractErrandIdFromReference(ref) {
	const text = String(ref || "").trim();
	if (!text) return null;
	const match = text.match(/\bEB[\s_-]*(\d{1,6})[\s_-]*\d{1,10}\b/i);
	if (!match) return null;
	const id = Number(match[1]);
	if (!Number.isFinite(id) || id <= 0) return null;
	return id;
}

const hasAny = (text, needles) => needles.some((n) => text.includes(n));

export function routeToxiIntent(message, surface) {
	/** @type {ToxiSurface} */
	const resolvedSurface = surface || "landing_page";
	const raw = String(message || "");
	const text = normalizeForMatch(raw);

	const hasRef = Boolean(extractErrandReference(raw));

	const asksStatus =
		hasAny(text, [
			"status",
			"track",
			"tracking",
			"eta",
			"progress",
			"where is",
			"where s",
			"where's",
			"delivered",
			"completed",
			"arrived",
			"latest status",
			"check status",
			"update on",
		]) || /\bwhere\s+is\b/i.test(raw);

	const asksProof =
		hasAny(text, [
			"proof",
			"proof of delivery",
			"delivery proof",
			"receipt",
			"signature",
			"photo",
			"photos",
			"evidence",
			"attachment",
			"attachments",
		]) || /\bproof\b/i.test(raw);

	const asksPricing = hasAny(text, [
		"price",
		"pricing",
		"quote",
		"how much",
		"cost",
		"fee",
		"estimate",
	]);

	// Update intent (v1) focuses on changing existing details (not “update on status”).
	const asksUpdate =
		hasAny(text, ["change", "modify", "reschedule", "adjust", "edit"]) ||
		/\bupdate\s+(my|the)\b/i.test(raw);

	const asksSupport =
		hasAny(text, [
			"support",
			"help",
			"issue",
			"problem",
			"complaint",
			"refund",
			"dispute",
			"charged",
			"payment",
			"invoice",
			"login",
			"sign in",
			"cant sign",
			"can't sign",
			"account",
		]) || /\bcan\s*not\s+log\s*in\b/i.test(raw);

	const soundsCreate =
		hasAny(text, [
			"pickup",
			"dropoff",
			"drop off",
			"deliver",
			"delivery",
			"send",
			"new errand",
			"create",
			"book",
			"schedule",
			"buy",
			"shop",
			"shopping list",
			"courier",
			"parcel",
			"package",
			"letter",
			"envelope",
			"passport",
			"airport",
			"grocer",
			"grocery",
			"groceries",
			"market run",
			"supermarket",
			"pharmacy",
			"prescription",
			"medicine",
			"medication",
			"chemist",
			"legal",
			"notary",
			"court",
			"affidavit",
			"filing",
		]) || /\bi need\b/i.test(raw);

	// Dominance / precedence.
	if (hasRef && asksProof) return "proof";
	if (hasRef && asksUpdate) return "update";
	if (hasRef && asksStatus) return "track";

	if (asksProof) return "proof";
	if (asksStatus) return "track";
	if (asksUpdate) return "update";
	if (asksPricing) return "pricing";
	if (asksSupport) return "support";
	if (soundsCreate) return "create";

	// Surface-aware fallback.
	if (
		resolvedSurface === "client_dashboard" ||
		resolvedSurface === "tracking_page" ||
		resolvedSurface === "client_errand_detail"
	) {
		return "track";
	}
	return "create";
}
