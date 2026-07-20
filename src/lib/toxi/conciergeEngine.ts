// Stable public facade for the Toxi concierge engine.
//
// Keep this file as the compatibility layer so existing imports (e.g. landing widget)
// don't need to change while the implementation lives in modular core files.

export type {
	Confidence,
	SourceType,
	FieldValue,
	ConversationStage,
	ConciergeState,
	ExtractionResult,
	RequiredField,
	ConciergeTurn,
	AssistantExtractionStrings,
	PrefillRequest,
	ConciergeSession,
} from "./core/types";

export { initialConciergeState, REQUIRED_FIELDS, FIELD_LABELS } from "./core/types";

export {
	normalizeAirport,
	findCities,
	extractDeadline,
	extractRoute,
	extractServiceType,
	extractNotes,
	extractFieldsDeterministically,
	toExtractionResultFromAssistant,
} from "./core/extractor";

export {
	mergeField,
	mergeExtractionIntoState,
	getMissingFields,
	isReadyForRequest,
	detectConflicts,
	getFieldsToAsk,
} from "./core/stateMachine";

export {
	buildCollectingReply,
	buildClarificationReply,
	buildReadyReply,
	buildFallbackReply,
	getLiveSummary,
	makeSummary,
} from "./core/uiMappers";

export {
	buildPrefillRequest,
	createConciergeSession,
	processUserMessage,
	stepConcierge,
} from "./core/controller";

export { recommendTemplate } from "./core/templateRecommendations";
