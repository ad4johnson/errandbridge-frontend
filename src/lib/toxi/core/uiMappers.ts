import type { ConciergeState, RequiredField } from "./types";
import { FIELD_LABELS } from "./types";

const FIELD_PROMPTS: Record<RequiredField, string> = {
	serviceType: "What needs to be handled?",
	pickupLocation: "Where should it start?",
	dropoffLocation: "Where should it end?",
	deadline: "When should it happen?",
};

function toLowerFirst(value: string): string {
	const text = String(value || "").trim();
	if (!text) return text;
	return text.charAt(0).toLowerCase() + text.slice(1);
}

function joinNatural(values: string[]): string {
	if (values.length <= 1) return values[0] || "";
	if (values.length === 2) return `${values[0]} and ${values[1]}`;
	return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function buildWarmSummary(state: ConciergeState): string {
	const parts: string[] = [];
	if (state.serviceType?.value) {
		parts.push(`the task as ${toLowerFirst(state.serviceType.value)}`);
	}
	if (state.pickupLocation?.value) {
		parts.push(`the start point as ${state.pickupLocation.value}`);
	}
	if (state.dropoffLocation?.value) {
		parts.push(`the ending point as ${state.dropoffLocation.value}`);
	}
	if (state.deadline?.value) {
		parts.push(`the timing as ${state.deadline.value}`);
	}

	if (!parts.length) return "";
	return `So far I’ve noted ${joinNatural(parts)}.`;
}

function buildFieldFollowUp(field: RequiredField, state: ConciergeState): string {
	if (field === "serviceType") {
		if (state.pickupLocation?.value || state.dropoffLocation?.value) {
			return "What exactly should ErrandBridge handle between those points?";
		}
		return "What exactly would you like ErrandBridge to handle?";
	}

	if (field === "pickupLocation") {
		if (state.serviceType?.value?.toLowerCase().includes("airport")) {
			return "Where should the pickup happen? If it’s an airport, you can name the airport or city.";
		}
		return "Where should it start?";
	}

	if (field === "dropoffLocation") {
		if (state.serviceType?.value?.toLowerCase().includes("pickup")) {
			return "Where should it end after pickup?";
		}
		return "Where should it end?";
	}

	return FIELD_PROMPTS[field];
}

export function getLiveSummary(state: ConciergeState): string[] {
	const rows: string[] = [];

	if (state.serviceType?.value) rows.push(`Task: ${state.serviceType.value}`);
	if (state.pickupLocation?.value)
		rows.push(`Starting point: ${state.pickupLocation.value}`);
	if (state.dropoffLocation?.value)
		rows.push(`Ending point: ${state.dropoffLocation.value}`);
	if (state.deadline?.value) rows.push(`Timing: ${state.deadline.value}`);

	return rows;
}

export const makeSummary = (state: ConciergeState): string => {
	const rows = getLiveSummary(state);
	return rows.length ? rows.map((r) => `• ${r}`).join("\n") : "(No details yet.)";
};

export function buildCollectingReply(
	state: ConciergeState,
	askFields: RequiredField[],
): string {
	const nextField = askFields[0];
	const askedBefore = Boolean(nextField && state.lastAskedFields?.includes(nextField));
	const summaryLead = buildWarmSummary(state);
	const nextPrompt = nextField
		? buildFieldFollowUp(nextField, state)
		: "Tell me the next missing detail.";
	const reminder = nextField
		? `I’m still missing ${FIELD_LABELS[nextField]}.`
		: "I’m still missing one key detail.";

	if (summaryLead) {
		return `${summaryLead} ${askedBefore ? reminder : nextPrompt}`.trim();
	}

	return `I’d be happy to help. ${nextPrompt}`;
}

export function buildClarificationReply(
	state: ConciergeState,
	conflicts: string[],
): string {
	if (conflicts.includes("pickup_dropoff_same")) {
		return "I may have the same place for both the start and the ending location. Is this staying in one location, or should I note a different ending location?";
	}

	const pickup = state.pickupLocation?.value || "";
	const dropoff = state.dropoffLocation?.value || "";
	const deadline = state.deadline?.value || "";
	return `I want to make sure I’ve captured this correctly for you. Can you confirm the start (${pickup}), the ending location (${dropoff}), and the timing (${deadline})?`;
}

export function buildReadyReply(state: ConciergeState): string {
	return (
		"Lovely - I have enough to carry this into your request.\n\n" +
		"Request summary:\n" +
		`• Task: ${state.serviceType?.value || ""}\n` +
		`• Starting point: ${state.pickupLocation?.value || ""}\n` +
		`• Ending point: ${state.dropoffLocation?.value || ""}\n` +
		`• Timing: ${state.deadline?.value || ""}\n\n` +
		"Continue with the request and ErrandBridge will carry these details into setup."
	);
}

export function buildFallbackReply(): string {
	return "I’m happy to help. Start with what needs to be handled, and I’ll guide the rest gently one step at a time.";
}
