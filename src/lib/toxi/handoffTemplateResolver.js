import { findTemplateByName } from "../../data/serviceCatalogV2";
import { recommendTemplate } from "./core/templateRecommendations.ts";

const TEMPLATE_ALIAS_MAP = {
	"airport pickup / transport": "Airport Pickup / Assistance",
	"airport pickup / transfer": "Airport Pickup / Assistance",
	"courier / delivery": "Courier / Document Delivery",
	"courier delivery": "Courier / Document Delivery",
	"parcel delivery": "Courier / Document Delivery",
	"document courier": "Courier / Document Delivery",
	"grocery shopping + delivery": "Grocery / Market Run",
	"grocery / market run": "Grocery / Market Run",
	"medical / pharmacy pickup": "Medical / Pharmacy Pickup",
	"pharmacy pickup": "Medical / Pharmacy Pickup",
	"legal / notary": "Legal / Notary",
	"legal filing support": "Legal / Notary",
	custom: "Special Errand / Other",
};

function normalizeText(value) {
	return String(value || "").trim();
}

function normalizeTemplateAlias(name) {
	const normalized = normalizeText(name);
	if (!normalized) return "";
	const alias = TEMPLATE_ALIAS_MAP[normalized.toLowerCase()];
	return alias || normalized;
}

function resolveCatalogTemplateByName(name) {
	const normalized = normalizeTemplateAlias(name);
	if (!normalized) return null;
	return findTemplateByName(normalized) || null;
}

function buildCandidateTexts(prefill = {}) {
	const values = [prefill.template, prefill.description, prefill.notes]
		.map((value) => normalizeText(value))
		.filter(Boolean);
	return [...new Set(values)];
}

export function resolveToxiHandoffSelection(prefill = {}) {
	const candidateTexts = buildCandidateTexts(prefill);

	for (const candidate of candidateTexts) {
		const exactMatch = resolveCatalogTemplateByName(candidate);
		if (exactMatch) {
			return {
				templateName: exactMatch.name,
				laneKey: exactMatch.laneKey,
				categoryKey: exactMatch.categoryKey,
				template: exactMatch,
				matchSource: "exact",
				matchedText: candidate,
			};
		}
	}

	const combinedText = candidateTexts.join(" ").trim();
	if (!combinedText) return null;

	const recommendation = recommendTemplate(combinedText);
	const recommendedTemplate = resolveCatalogTemplateByName(recommendation?.template);
	if (!recommendedTemplate) return null;

	return {
		templateName: recommendedTemplate.name,
		laneKey: recommendedTemplate.laneKey,
		categoryKey: recommendedTemplate.categoryKey,
		template: recommendedTemplate,
		matchSource: recommendation?.reason ? "recommended" : "fallback",
		matchedText: combinedText,
		reason: recommendation?.reason,
	};
}
