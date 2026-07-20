import type { AssistantExtractionStrings } from "./conciergeEngine";
import { toExtractionResultFromAssistant } from "./conciergeEngine";

import type { OpenAIToxiResponse } from "./callOpenAIToxi";

export type ToxiPayload = {
	text: string;
	summary?: string[];
	ready?: boolean;
	actionLink?: {
		label: string;
		href: string;
		icon?: "arrow" | "login" | "track" | "payment" | "support";
		variant?: "primary" | "secondary" | "ghost";
	};
	suggestedPatch?: Partial<{
		serviceType: string;
		pickupLocation: string;
		dropoffLocation: string;
		deadline: string;
		notes: string;
		specialRequirements: string;
		tier: "standard" | "priority" | "concierge";
		higherProof: boolean;
		airportCoordination: boolean;
		routeType: string;
		city: string;
		country: string;
	}>;
	meta?: {
		intent?: string;
		confidence?: "low" | "medium" | "high";
		missingFields?: string[];
		needsClarification?: boolean;
		source?: "openai" | "fallback";
	};
};

function compactPatch(patch: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(patch || {})) {
		if (value !== null && value !== undefined && String(value).trim() !== "") {
			out[key] = value;
		}
	}
	return out;
}

function buildSummary(fields: OpenAIToxiResponse["fields"]): string[] {
	const rows: string[] = [];
	if (fields.serviceType) rows.push(`Task: ${fields.serviceType}`);
	if (fields.pickupLocation) rows.push(`Pickup: ${fields.pickupLocation}`);
	if (fields.dropoffLocation)
		rows.push(`Ending location: ${fields.dropoffLocation}`);
	if (fields.deadline) rows.push(`Timing: ${fields.deadline}`);
	return rows;
}

export function adaptOpenAIToToxiPayload(res: OpenAIToxiResponse): ToxiPayload {
	const patch = compactPatch((res as any).patch || {});
	const summary = buildSummary(res.fields);

	return {
		text: String(res.reply_text || "").trim(),
		summary,
		ready:
			Boolean(res.fields.serviceType) &&
			Boolean(res.fields.pickupLocation) &&
			Boolean(res.fields.dropoffLocation) &&
			Boolean(res.fields.deadline),
		actionLink: res.actionLink || undefined,
		suggestedPatch: Object.keys(patch).length ? (patch as any) : undefined,
		meta: {
			intent: res.intent,
			confidence: res.confidence,
			missingFields: Array.isArray(res.missingFields) ? res.missingFields : [],
			needsClarification: Boolean(res.needsClarification),
			source: res.mode === "fallback" ? "fallback" : "openai",
		},
	};
}

export function openAIResponseToAssistantExtractionStrings(
	res: OpenAIToxiResponse,
): AssistantExtractionStrings {
	return {
		serviceType: res.fields.serviceType,
		pickupLocation: res.fields.pickupLocation,
		dropoffLocation: res.fields.dropoffLocation,
		deadline: res.fields.deadline,
		notes: res.fields.notes,
		specialRequirements: res.fields.specialRequirements,
		routeType: (res.fields as any).routeType ?? null,
		city: (res.fields as any).city ?? null,
		country: (res.fields as any).country ?? null,
	};
}

export function openAIResponseToExtractionResult(res: OpenAIToxiResponse) {
	return toExtractionResultFromAssistant(openAIResponseToAssistantExtractionStrings(res));
}
