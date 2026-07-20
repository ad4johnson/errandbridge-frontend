import { TEMPLATE_KEYWORDS } from "../../../data/templateData";
import { CATALOG_TEMPLATES } from "../../../data/serviceCatalogV2";

export type TemplateRecommendation = {
	template: string;
	reason?: string;
};

type RecommendationCandidate = {
	template: string;
	nameKey: string;
	phrases: string[];
	tokens: string[];
};

const TEMPLATE_KEYWORD_MAP = TEMPLATE_KEYWORDS as Record<
	string,
	readonly string[] | undefined
>;

const STOPWORDS = new Set([
	"a",
	"an",
	"and",
	"any",
	"at",
	"before",
	"by",
	"for",
	"from",
	"help",
	"i",
	"if",
	"in",
	"into",
	"it",
	"me",
	"my",
	"need",
	"of",
	"on",
	"or",
	"please",
	"the",
	"this",
	"to",
	"up",
	"with",
]);

const EXTRA_TEMPLATE_PHRASES: Record<string, string[]> = {
	"passport / visa pickup": [
		"passport pickup",
		"visa pickup",
		"permit pickup",
	],
	"embassy / consulate visit": ["embassy visit", "consulate visit"],
	"certificate collection": ["certificate pickup", "certificate collection"],
	"school document processing": ["school errand", "campus errand", "student document"],
	"legal document submission": ["legal submission", "document filing", "court document"],
	"notary / signature assistance": ["signature assistance", "notary visit"],
	"court / registry submission": ["court filing", "registry submission"],
	"kyc / verification follow-up": ["kyc follow up", "verification follow up", "compliance verification"],
	"legal / notary": ["legal filing", "notary support", "affidavit filing"],
	"sensitive document handoff": ["confidential document handoff", "sensitive handoff"],
	"compliance / filing support": ["regulator filing", "compliance filing"],
	"government office / immigration": ["immigration office", "government office"],
	"bank transaction": ["bank errand", "cash deposit", "cash withdrawal"],
	"card pickup / replacement": ["bank card pickup", "atm card replacement"],
	"account update / kyc": ["bank kyc", "account update"],
	"bill payment / settlement": ["bill payment", "settlement payment"],
	"pos / atm follow-up": ["atm follow up", "pos issue"],
	"cheque / draft processing": ["bank draft", "cheque processing"],
	"personal errand": ["everyday errand", "routine errand"],
	"family assistance": ["family support", "family errand"],
	"queue / appointment assistance": ["queue support", "appointment support"],
	"item return / exchange": ["return item", "exchange item"],
	"gift purchase / delivery": ["gift delivery", "buy a gift"],
	"home support visit": ["home visit", "home check"],
	"mystery shopper": ["shopping task", "shop for items"],
	"grocery / market run": ["grocery run", "market run", "supermarket shopping"],
	"food order pickup": ["food pickup", "restaurant pickup", "takeout pickup"],
	"laundry / dry cleaning": ["dry cleaning", "laundry pickup"],
	"electronics / repair pickup": ["repair pickup", "device pickup"],
	"courier / document delivery": ["parcel delivery", "send a parcel", "document courier", "local courier"],
	"construction / hardware supplies": ["hardware run", "construction supplies"],
	"inspection / verification": ["site inspection", "property verification"],
	"home services / repairs": ["repair visit", "home repair"],
	"tenant / agent property check": ["tenant check", "agent property check"],
	"utility / meter verification": ["meter reading", "utility check"],
	"site check / project visit": ["project site visit", "site check"],
	"airport pickup / assistance": ["airport pickup", "flight pickup"],
	"travel / airport assistance": ["airport assistance", "travel support"],
	"arrival coordination": ["hotel hospitality", "arrival coordination"],
	"luggage / handoff support": ["luggage handoff", "travel handoff"],
	"driver / pickup verification": ["driver verification", "pickup verification"],
	"family emergency support": ["family emergency", "urgent family support"],
	"urgent welfare check": ["welfare check", "urgent welfare visit"],
	"rapid family coordination": ["family coordination", "school emergency handoff"],
	"hospital / care follow-up": ["hospital follow up", "care follow up"],
	"emergency purchase / delivery": ["emergency purchase", "hospital supplies delivery"],
	"special errand / other": ["special errand", "custom errand"],
	"corporate logistics": ["business logistics", "company delivery"],
	"office supplies run": ["stationery run", "printer supplies"],
	"vendor / delivery coordination": ["vendor pickup", "vendor delivery"],
	"document drop / pickup": ["document dropoff", "business document pickup"],
	"office admin follow-up": ["admin follow up", "branch follow up"],
	"international parcel": ["international package", "cross border parcel", "customs parcel"],
	"medical / pharmacy pickup": ["pharmacy pickup", "prescription pickup", "medicine delivery"],
	"pet care / vet pickup": ["vet pickup", "pet care errand"],
	"lab result / test collection": ["lab result pickup", "test collection"],
	"caregiver supply run": ["caregiver supplies", "care supply run"],
	"medical appointment support": ["clinic appointment support", "hospital appointment support"],
};

const normalizeText = (value: string): string =>
	String(value || "")
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const unique = <T,>(values: T[]): T[] => [...new Set(values.filter(Boolean))];

const tokenize = (value: string): string[] =>
	normalizeText(value)
		.split(" ")
		.map((token) => token.trim())
		.filter((token) => token.length >= 3 && !STOPWORDS.has(token));

const buildNameFragments = (name: string): string[] => {
	const raw = String(name || "");
	const parts = raw
		.split(/[,&()/]+/)
		.map((part) => normalizeText(part))
		.filter((part) => part.length >= 3);
	return unique([normalizeText(raw), ...parts]);
};

const RECOMMENDATION_CANDIDATES: RecommendationCandidate[] = CATALOG_TEMPLATES.map((template) => {
	const name = String(template?.name || "").trim();
	const nameKey = normalizeText(name);
	const rawNameKey = name.toLowerCase();
	const legacyKeywords: readonly string[] = Array.isArray(TEMPLATE_KEYWORD_MAP[name])
		? TEMPLATE_KEYWORD_MAP[name] || []
		: [];
	const extraPhrases: string[] =
		EXTRA_TEMPLATE_PHRASES[nameKey] || EXTRA_TEMPLATE_PHRASES[rawNameKey] || [];
	const phrases = unique([
		...buildNameFragments(name),
		normalizeText(template?.description || ""),
		...(template?.requiredSkills || []).map((skill) => normalizeText(String(skill || ""))),
		...(template?.builderFields || []).map((field) => normalizeText(String(field || ""))),
		...legacyKeywords.map((keyword: string) => normalizeText(String(keyword || ""))),
		...extraPhrases.map((phrase) => normalizeText(phrase)),
	]).filter((phrase) => phrase.length >= 3);

	return {
		template: name,
		nameKey,
		phrases,
		tokens: unique(phrases.flatMap((phrase) => tokenize(phrase))),
	};
});

function scoreCandidate(input: string, inputTokens: string[], candidate: RecommendationCandidate): number {
	let score = 0;

	if (input.includes(candidate.nameKey)) score += 120;

	for (const phrase of candidate.phrases) {
		if (!phrase || phrase === candidate.nameKey) continue;
		if (phrase.length < 4) continue;
		if (input.includes(phrase)) {
			const wordCount = phrase.split(" ").filter(Boolean).length;
			score += wordCount >= 3 ? 36 : wordCount === 2 ? 22 : 12;
		}
	}

	for (const token of candidate.tokens) {
		if (inputTokens.includes(token)) {
			score += token.length >= 8 ? 5 : 3;
		}
	}

	const nameTokens = tokenize(candidate.nameKey);
	const matchedNameTokens = nameTokens.filter((token) => inputTokens.includes(token)).length;
	if (matchedNameTokens) score += matchedNameTokens * 8;

	return score;
}

export function recommendTemplate(serviceType?: string): TemplateRecommendation | null {
	const input = normalizeText(String(serviceType || ""));
	if (!input) return null;

	const inputTokens = unique(tokenize(input));
	let best: RecommendationCandidate | null = null;
	let bestScore = 0;

	for (const candidate of RECOMMENDATION_CANDIDATES) {
		const score = scoreCandidate(input, inputTokens, candidate);
		if (score > bestScore) {
			best = candidate;
			bestScore = score;
		}
	}

	if (!best || bestScore <= 0) {
		return {
			template: "Special Errand / Other",
			reason: "No specific template matched",
		};
	}

	return {
		template: best.template,
		reason:
			bestScore >= 120
				? `Matched template name: ${best.template}`
				: `Matched template keywords for ${best.template}`,
	};
}
