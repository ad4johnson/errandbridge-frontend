import type {
	ConciergeSession,
	ConciergeState,
	ConciergeTurn,
	ExtractionResult,
	PrefillRequest,
	RequiredField,
} from "./types";
import { initialConciergeState } from "./types";
import { normalizeWhitespace } from "./extractor";
import {
	extractAndMergeMessage,
	getFieldsToAsk,
	getMissingFields,
	isReadyForRequest,
} from "./stateMachine";
import {
	buildClarificationReply,
	buildCollectingReply,
	buildFallbackReply,
	buildReadyReply,
	makeSummary,
} from "./uiMappers";

const safeId = (): string => {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		try {
			return (crypto as any).randomUUID();
		} catch {
			// ignore
		}
	}
	return String(Date.now() + Math.random());
};

export function buildPrefillRequest(state: ConciergeState): PrefillRequest {
	return {
		template: state.serviceType?.value,
		description: state.notes?.value || state.serviceType?.value,
		startLocation:
			state.pickupLocation?.value ||
			state.city?.value ||
			state.country?.value,
		endLocation: state.dropoffLocation?.value,
		timing: state.deadline?.value,
		notes: state.specialRequirements?.value || state.notes?.value,
	};
}

export function createConciergeSession(
	initial?: Partial<ConciergeState>,
): ConciergeSession {
	const now = Date.now();
	return {
		id: safeId(),
		createdAt: now,
		updatedAt: now,
		state: {
			...initialConciergeState,
			...(initial || {}),
		},
	};
}

export function processUserMessage(
	userText: string,
	state: ConciergeState,
	aiExtraction?: ExtractionResult,
): { nextState: ConciergeState; reply: string; missing: RequiredField[] } {
	let nextState = state;

	const { nextState: mergedState, conflicts } = extractAndMergeMessage(
		userText,
		state,
		aiExtraction,
	);

	nextState = mergedState;

	if (conflicts.length > 0) {
		nextState = {
			...nextState,
			conversationStage: "clarifying",
			clarificationCount: (nextState.clarificationCount || 0) + 1,
		};
		const reply = buildClarificationReply(nextState, conflicts);
		return { nextState, reply, missing: getMissingFields(nextState) };
	}

	nextState.isReadyForRequest = isReadyForRequest(nextState);
	if (nextState.isReadyForRequest) {
		nextState.conversationStage = "ready";
		nextState.currentSummary = buildReadyReply(nextState);
		nextState.lastAskedFields = [];
		return { nextState, reply: nextState.currentSummary, missing: [] };
	}

	const stillMissing = getMissingFields(nextState);
	const askFields = getFieldsToAsk(nextState, stillMissing);

	nextState.conversationStage = "collecting";

	const reply =
		askFields.length > 0
			? buildCollectingReply(nextState, askFields)
			: buildFallbackReply();

	nextState.lastAskedFields = askFields;

	return { nextState, reply, missing: stillMissing };
}

export function stepConcierge(
	session: ConciergeSession,
	userTextRaw: string,
	aiExtraction?: ExtractionResult,
): { session: ConciergeSession; turn: ConciergeTurn } {
	const userText = normalizeWhitespace(userTextRaw);
	const ts = new Date().toISOString();

	const { nextState, reply, missing } = processUserMessage(
		userText,
		session.state,
		aiExtraction,
	);

	const nextHistory = [
		...(session.state.history || []),
		{ role: "user" as const, text: userText, timestamp: ts },
		{ role: "assistant" as const, text: reply, timestamp: new Date().toISOString() },
	];

	const finalState: ConciergeState = {
		...nextState,
		history: nextHistory,
	};

	const nextSession: ConciergeSession = {
		...session,
		updatedAt: Date.now(),
		state: finalState,
	};

	return {
		session: nextSession,
		turn: {
			userText,
			assistantText: reply,
			missing,
			ready: Boolean(finalState.isReadyForRequest),
			summary: makeSummary(finalState),
			stage: finalState.conversationStage,
			state: finalState,
		},
	};
}
