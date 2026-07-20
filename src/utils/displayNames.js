const TEMPLATE_DISPLAY_ALIASES = {
	// Internal key used in historical templateData; UI copy prefers this name.
	"Personal Delivery": "Personal Errand",

	// App Store / demo dataset naming.
	// Keep these as the final, curated casing we want to display.
	"Courier / Document Delivery": "Document delivery",
	"Travel / Airport Assistance": "Airport pickup",
};

const ACRONYMS = new Set([
	"atm",
	"pos",
	"kyc",
	"id",
	"otp",
	"usps",
	"dhl",
	"fedex",
	"vfs",
	"mma",
	"mma2",
]);

const formatWordSegment = (segment) => {
	const raw = String(segment || "");
	if (!raw) return "";

	// Preserve anything already containing uppercase letters (brand/acronym) or digits.
	if (/[A-Z0-9]/.test(raw)) return raw;

	const lower = raw.toLowerCase();
	if (ACRONYMS.has(lower)) return lower.toUpperCase();

	return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const formatToken = (token) => {
	const raw = String(token || "");
	if (!raw) return "";
	if (raw === "/") return raw;

	// Preserve leading/trailing punctuation (rare but safe).
	// Avoid regex here to keep lint clean and logic easy to reason about.
	const OPENERS = new Set(["(", "[", "{", '"', "'"]);
	const CLOSERS = new Set([
		")",
		"]",
		"}",
		'"',
		"'",
		".",
		",",
		":",
		";",
		"!",
		"?",
	]);

	let leading = "";
	let core = raw;
	let trailing = "";

	while (core.length && OPENERS.has(core[0])) {
		leading += core[0];
		core = core.slice(1);
	}

	while (core.length && CLOSERS.has(core[core.length - 1])) {
		trailing = core[core.length - 1] + trailing;
		core = core.slice(0, -1);
	}

	const formatCore = (value) => {
		if (!value) return "";
		// Handle embedded slashes (e.g., Government/Immigration).
		return value
			.split("/")
			.map((part) => {
				// If the token already contains curated casing (e.g., Follow-up, KYC),
				// preserve it as-is.
				if (/[A-Z0-9]/.test(part)) return part;
				return part.split("-").map(formatWordSegment).join("-");
			})
			.join("/");
	};

	return `${leading}${formatCore(core)}${trailing}`;
};

export const formatTemplateTitle = (rawName) => {
	const name = String(rawName || "").trim();
	if (!name) return "";

	// If a template has a curated display alias, return it as-is (no further
	// token formatting) so we can preserve intentional casing.
	if (Object.hasOwn(TEMPLATE_DISPLAY_ALIASES, name)) {
		return TEMPLATE_DISPLAY_ALIASES[name];
	}

	const aliased = name;

	// Keep spacing stable while formatting tokens.
	return aliased.split(/\s+/).map(formatToken).join(" ");
};
