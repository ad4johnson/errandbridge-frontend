import type {
	AssistantExtractionStrings,
	Confidence,
	ExtractionResult,
	FieldValue,
	SourceType,
} from "./types";

export const normalizeWhitespace = (input: string): string =>
	String(input || "").replace(/\s+/g, " ").trim();

const capitalize = (s: string): string =>
	s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export function normalizeAirport(text: string): string {
	const lower = String(text || "").toLowerCase();

	if (/\bmma\b/.test(lower)) return "MMA Airport, Lagos";
	if (/\bmmia\b/.test(lower)) return "MMIA Airport, Lagos";
	if (/\blos\b/.test(lower)) return "Murtala Muhammed Airport, Lagos";
	if (/\bairport\s+in\s+lagos\b/.test(lower)) return "Airport, Lagos";
	if (/\bairport\s+in\s+abuja\b/.test(lower)) return "Airport, Abuja";
	if (/\bheathrow\b/.test(lower)) return "Heathrow Airport";
	if (/\bgatwick\b/.test(lower)) return "Gatwick Airport";

	return normalizeWhitespace(text);
}

const KNOWN_CITIES = [
	"lagos",
	"ibadan",
	"ikeja",
	"lekki",
	"ikenne",
	"abuja",
	"ado",
	"london",
	"manchester",
	"birmingham",
];

export function findCities(text: string): string[] {
	const lower = String(text || "").toLowerCase();
	return KNOWN_CITIES.filter((city) => lower.includes(city)).map((c) =>
		capitalize(c),
	);
}

const cleanupLocation = (text: string): string => {
	let v = normalizeWhitespace(text);
	v = v
		.replace(/^(?:the\s+)?(?:pickup|pick\s*up|pickup point|collection point)\s+(?:is\s+)?/i, "")
		.replace(/^(?:the\s+)?(?:dropoff|drop\s*off|destination)\s+(?:is\s+)?/i, "")
		.replace(/^(?:at|from|in)\s+/i, "")
		.replace(/\b(?:and\s+)?(?:drive|take|transport|bring|deliver)\s+(?:him|her|them|someone|a friend|friend|a passenger|the passenger)\b.*$/i, "")
		.trim();
	// Strip trailing timing phrases that commonly follow the destination.
	v = v
		.replace(
			/\b(?:by|before)\b\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b.*$/i,
			"",
		)
		.replace(
			/\bon\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*$/i,
			"",
		)
		.replace(/\b(?:for|with)\s+(?:my|a|the)?\s*(?:friend|passenger|guest)\b.*$/i, "")
		.trim();
	return normalizeAirport(v);
};

const UI_LOCATION_PLACEHOLDER_PATTERNS = [
	/^(?:location|pickup(?:\s+location)?|drop\s*off(?:\s+location)?|destination)$/i,
	/^(?:where it should start|where it should end|when it needs to be handled|what needs to be handled)$/i,
	/^(?:change|update|add|edit|set|help me add|help me change)\b/i,
	/\b(?:pickup|drop\s*off|timing|location)\b.*\b(?:field|button|prompt)\b/i,
];

function isLikelyUiPlaceholder(value: string): boolean {
	const clean = normalizeWhitespace(value);
	if (!clean) return true;
	if (clean.length < 3) return true;
	return UI_LOCATION_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(clean));
}

const PERSON_TARGET_PATTERN =
	/(?:friend|passenger|guest|visitor|someone|him|her|them|person)/i;

const AIRPORT_PATTERN = /(?:airport|mma|mmia|murtala\s+muhammed|heathrow|gatwick)/i;

function extractPickupCue(text: string): FieldValue | undefined {
	const clean = normalizeWhitespace(text);
	const patterns = [
		/(?:pick\s*up|pickup|collect|meet|receive)\s+(?:my\s+|the\s+|a\s+)?(?:friend|passenger|guest|visitor|someone|him|her|them|person)?\s*(?:at|from|in)\s+(.+?)(?=$|\s+(?:and\s+)?(?:drive|take|transport|bring|deliver)\b|\s+to\s+|\s+(?:on|by|before)\b|[,.])/i,
		/(?:pickup|pick\s*up|collect(?:ion)?)\s+(?:is\s+)?(.+?)(?=$|\s+to\s+|\s+(?:on|by|before)\b|[,.])/i,
		/(?:from|at)\s+(.+?)(?=$|\s+to\s+|\s+(?:on|by|before)\b|[,.])/i,
	];

	for (const pattern of patterns) {
		const match = clean.match(pattern);
		if (!match?.[1]) continue;
		const value = cleanupLocation(match[1]);
		if (value.length < 3 || isLikelyUiPlaceholder(value)) continue;
		return { value, confidence: "high", source: "user" };
	}

	if (AIRPORT_PATTERN.test(clean)) {
		const airportWithCity = clean.match(
			/(?:at|from|in)?\s*((?:mma|mmia|murtala\s+muhammed|heathrow|gatwick|airport)(?:\s+airport)?(?:\s+in\s+[a-z\s]+)?)/i,
		);
		if (airportWithCity?.[1]) {
			const value = cleanupLocation(airportWithCity[1]);
			if (value.length >= 3 && !isLikelyUiPlaceholder(value)) {
				return { value, confidence: "medium", source: "inferred" };
			}
		}
	}

	return undefined;
}

function extractDropoffCue(text: string): FieldValue | undefined {
	const clean = normalizeWhitespace(text);
	const patterns = [
		/(?:drive|take|transport|bring|deliver|drop\s*off)\s+(?:my\s+|the\s+|a\s+)?(?:friend|passenger|guest|visitor|someone|him|her|them|person)?\s*to\s+(.+?)(?=$|\s+(?:on|by|before)\b|[,.])/i,
		/(?:drop\s*off|destination)\s+(?:is\s+)?(.+?)(?=$|\s+(?:on|by|before)\b|[,.])/i,
		/\bto\s+(.+?)(?=$|\s+(?:on|by|before)\b|[,.])/i,
	];

	for (const pattern of patterns) {
		const match = clean.match(pattern);
		if (!match?.[1]) continue;
		const candidateRaw = normalizeWhitespace(match[1]);
		if (/^(?:pick\s*up|pickup|collect|meet|receive|buy|get|do|help)\b/i.test(candidateRaw)) {
			continue;
		}
		const value = cleanupLocation(candidateRaw);
		if (value.length < 3 || isLikelyUiPlaceholder(value)) continue;
		return { value, confidence: "high", source: "user" };
	}

	return undefined;
}

export function extractDeadline(text: string): FieldValue | undefined {
	const clean = normalizeWhitespace(text);
	const lower = clean.toLowerCase();
	if (!lower) return undefined;

	// Prefer combined patterns like "by 12pm on friday".
	const byOn = lower.match(
		/\bby\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
	);
	if (byOn) {
		return {
			value: `${capitalize(byOn[2])} by ${byOn[1]}`,
			confidence: "high",
			source: "user",
		};
	}
	const onBy = lower.match(
		/\bon\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b\s+by\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
	);
	if (onBy) {
		return {
			value: `${capitalize(onBy[1])} by ${onBy[2]}`,
			confidence: "high",
			source: "user",
		};
	}

	const patterns: RegExp[] = [
		/\b(today|tomorrow)\b/i,
		/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b(?:\s+by\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,
		/\bby\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i,
		/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i,
		/\bas soon as possible\b/i,
		/\bnext week\b/i,
	];

	for (const pattern of patterns) {
		const match = lower.match(pattern);
		if (match) {
			return {
				value: normalizeWhitespace(match[0]),
				confidence: "high",
				source: "user",
			};
		}
	}

	return undefined;
}

export function extractRoute(text: string): {
	pickupLocation?: FieldValue;
	dropoffLocation?: FieldValue;
} {
	const clean = normalizeWhitespace(text);

	const stopLeftStarts = [
		"need",
		"needs",
		"want",
		"wants",
		"would",
		"can",
		"could",
		"please",
		"help",
		"trying",
		"looking",
	];

	const scoreCandidate = (left: string, right: string): number => {
		const l = left.toLowerCase();
		const r = right.toLowerCase();
		let score = 0;
		for (const c of KNOWN_CITIES) {
			if (l.includes(c)) score += 2;
			if (r.includes(c)) score += 2;
		}
		if (/(airport|mma|mmia|heathrow|gatwick)/i.test(left)) score += 1;
		if (/(airport|mma|mmia|heathrow|gatwick)/i.test(right)) score += 1;
		return score;
	};

	const toRoute = (leftRaw: string, rightRaw: string) => {
		const left = cleanupLocation(leftRaw);
		const right = cleanupLocation(rightRaw);
		if (left.length < 3 || right.length < 3) return null;
		if (isLikelyUiPlaceholder(left) || isLikelyUiPlaceholder(right)) return null;

		const leftLowerRaw = normalizeWhitespace(leftRaw).toLowerCase();
		const rightLowerRaw = normalizeWhitespace(rightRaw).toLowerCase();

		// Guard against "need to ..." / "want to ..." verb phrases.
		if (
			/^(?:i|we|they|he|she|please)?\s*(need|needs|want|wants|would|can|could|help|trying|looking)\b/i.test(
				leftLowerRaw,
			)
		) {
			return null;
		}

		// Guard against extracting routes like "need you" -> "buy groceries".
		if (/^(buy|get|do|help|pick|deliver|collect|send|shop)\b/i.test(rightLowerRaw)) {
			return null;
		}

		const leftLower = left.toLowerCase();
		if (
			stopLeftStarts.some(
				(w) => leftLower.startsWith(w + " ") || leftLower === w,
			)
		) {
			return null;
		}

		return {
			pickupLocation: {
				value: left,
				confidence: "high" as const,
				source: "user" as const,
			},
			dropoffLocation: {
				value: right,
				confidence: "high" as const,
				source: "user" as const,
			},
		};
	};

	// Look across sentence-like segments; this avoids matching verb phrases like "need to buy".
	const segments = clean
		.split(/[.!?\n]+/)
		.map((s) => normalizeWhitespace(s))
		.filter(Boolean);

	let best:
		| {
			route: { pickupLocation: FieldValue; dropoffLocation: FieldValue };
			score: number;
		}
		| null = null;

	for (const seg of segments) {
		const fromTo = seg.match(/\bfrom\s+(.+?)\s+to\s+(.+)\b/i);
		if (fromTo) {
			const candidate = toRoute(fromTo[1], fromTo[2]);
			if (candidate) {
				const sc =
					scoreCandidate(
						candidate.pickupLocation.value,
						candidate.dropoffLocation.value,
					) + 3;
				if (!best || sc > best.score) best = { route: candidate, score: sc };
			}
			continue;
		}

		const arrow = seg.match(/\b(.+?)\s+to\s+(.+)\b/i);
		if (!arrow) continue;
		const candidate = toRoute(arrow[1], arrow[2]);
		if (!candidate) continue;

		const sc = scoreCandidate(
			candidate.pickupLocation.value,
			candidate.dropoffLocation.value,
		);
		if (!best || sc > best.score) best = { route: candidate, score: sc };
	}

	return best ? best.route : {};
}

export function extractServiceType(text: string): FieldValue | undefined {
	const lower = String(text || "").toLowerCase();
	const clean = normalizeWhitespace(text);
	const hasCourierMovement =
		/\b(send|deliver|delivery|drop\s*off|handoff|hand\s*off|bring|courier)\b/i.test(
			clean,
		) || /\bcourier\b/i.test(lower);
	const hasCourierPayload =
		/\b(parcel|package|packet|envelope|letter|document|documents|papers|file|files)\b/i.test(
			clean,
		);
	const hasPharmacyIntent =
		/\b(pharmacy|prescription|medicine|medication|chemist|drug|drugs|meds|medical item|medical items)\b/i.test(
			clean,
		);
	const hasGroceryIntent =
		/\b(grocery|groceries|market run|supermarket|shopping list|provisions|household items|essentials)\b/i.test(
			clean,
		);
	const hasLegalIntent =
		/\b(legal|notary|court|affidavit|registry|filing|file|filed|compliance|kyc)\b/i.test(
			clean,
		);

	if (
		AIRPORT_PATTERN.test(lower) &&
		/(pick\s*up|pickup|collect|meet|receive|transport|transfer|drive|take|drop\s*off)/i.test(lower)
	) {
		return {
			value: "airport pickup / transfer",
			confidence: "high",
			source: "inferred",
		};
	}

	if (
		PERSON_TARGET_PATTERN.test(lower) &&
		/(pick\s*up|pickup|collect|meet|receive|drive|take|transport|drop\s*off|bring)/i.test(lower)
	) {
		return {
			value: AIRPORT_PATTERN.test(lower)
				? "airport pickup / transfer"
				: "person pickup / transport",
			confidence: "high",
			source: "inferred",
		};
	}

	if (
		lower.includes("airport") &&
		(lower.includes("driver") ||
			lower.includes("pick up") ||
			lower.includes("pickup"))
	) {
		return { value: "airport pickup", confidence: "medium", source: "inferred" };
	}

	if (lower.includes("collect my car") || lower.includes("car collection")) {
		return {
			value: "car collection + transport",
			confidence: "medium",
			source: "inferred",
		};
	}

	if (lower.includes("passport")) {
		return {
			value: "passport / visa pickup",
			confidence: "high",
			source: "inferred",
		};
	}

	if (hasLegalIntent) {
		return {
			value: "legal / notary",
			confidence:
				/\b(court|notary|affidavit|registry|filing|compliance|kyc)\b/i.test(clean)
					? "high"
					: "medium",
			source: "inferred",
		};
	}

	if (hasPharmacyIntent) {
		return {
			value: "medical / pharmacy pickup",
			confidence: "high",
			source: "inferred",
		};
	}

	if (hasGroceryIntent) {
		return {
			value: "grocery shopping + delivery",
			confidence: "high",
			source: "inferred",
		};
	}

	if (lower.includes("certificate")) {
		return {
			value: "certificate collection",
			confidence: "high",
			source: "inferred",
		};
	}

	if (lower.includes("document") || lower.includes("office pickup")) {
		return {
			value: "official document / office pickup",
			confidence: "medium",
			source: "inferred",
		};
	}

	if (hasCourierMovement && hasCourierPayload) {
		return {
			value: "courier / delivery",
			confidence: "high",
			source: "inferred",
		};
	}

	if (lower.includes("delivery") || lower.includes("courier")) {
		return { value: "courier / delivery", confidence: "medium", source: "inferred" };
	}

	if (/\b(send|deliver|drop\s*off|bring)\b/i.test(clean) && /\b(package|parcel|document|letter|item)\b/i.test(clean)) {
		return {
			value: "courier / delivery",
			confidence: "high",
			source: "inferred",
		};
	}

	return undefined;
}

export function extractNotes(text: string): FieldValue | undefined {
	const clean = normalizeWhitespace(text);
	if (clean.length < 12) return undefined;
	return { value: clean, confidence: "medium", source: "user" };
}

export function extractFieldsDeterministically(text: string): ExtractionResult {
	const clean = normalizeWhitespace(text);
	const serviceType = extractServiceType(clean);
	const deadline = extractDeadline(clean);
	const route = extractRoute(clean);
	const pickupCue = extractPickupCue(clean);
	const dropoffCue = extractDropoffCue(clean);
	const notes = extractNotes(clean);

	const cities = findCities(clean);
	const city =
		cities.length > 0
			? ({
				value: cities[0],
				confidence: "medium" as const,
				source: "inferred" as const,
			} satisfies FieldValue)
			: undefined;

	return {
		serviceType,
		pickupLocation: route.pickupLocation || pickupCue,
		dropoffLocation: route.dropoffLocation || dropoffCue,
		deadline,
		notes,
		city,
	};
}

const toMaybeField = (
	value: unknown,
	confidence: Confidence,
	source: SourceType,
): FieldValue | undefined => {
	if (value === null || value === undefined) return undefined;
	const v = normalizeWhitespace(String(value));
	if (!v) return undefined;
	return { value: v, confidence, source };
};

export function toExtractionResultFromAssistant(
	extraction?: AssistantExtractionStrings | null,
): ExtractionResult {
	if (!extraction) return {};
	// Treat assistant extraction as inferred/medium by default.
	// The merge logic will keep explicit user-provided/high-confidence fields.
	return {
		serviceType: toMaybeField(extraction.serviceType, "medium", "inferred"),
		pickupLocation: toMaybeField(extraction.pickupLocation, "medium", "inferred"),
		dropoffLocation: toMaybeField(extraction.dropoffLocation, "medium", "inferred"),
		deadline: toMaybeField(extraction.deadline, "medium", "inferred"),
		notes: toMaybeField(extraction.notes, "low", "inferred"),
		specialRequirements: toMaybeField(
			extraction.specialRequirements,
			"medium",
			"inferred",
		),
		routeType: toMaybeField(extraction.routeType, "low", "inferred"),
		city: toMaybeField(extraction.city, "medium", "inferred"),
		country: toMaybeField(extraction.country, "medium", "inferred"),
	};
}
