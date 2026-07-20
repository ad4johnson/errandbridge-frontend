export type Confidence = "high" | "medium" | "low";
export type SourceType = "user" | "inferred" | "system";

export type FieldValue = {
	value: string;
	confidence: Confidence;
	source: SourceType;
};

export type ConversationStage =
	| "greeting"
	| "collecting"
	| "clarifying"
	| "ready"
	| "handoff";

export type ConciergeState = {
	serviceType?: FieldValue;
	pickupLocation?: FieldValue;
	dropoffLocation?: FieldValue;
	deadline?: FieldValue;
	notes?: FieldValue;
	specialRequirements?: FieldValue;
	routeType?: FieldValue;

	country?: FieldValue;
	city?: FieldValue;

	lastAskedFields: string[];
	clarificationCount: number;
	completedFields: string[];
	isReadyForRequest: boolean;
	currentSummary?: string;
	conversationStage: ConversationStage;

	history: Array<{
		role: "user" | "assistant";
		text: string;
		timestamp: string;
	}>;
};

export const initialConciergeState: ConciergeState = {
	lastAskedFields: [],
	clarificationCount: 0,
	completedFields: [],
	isReadyForRequest: false,
	conversationStage: "greeting",
	history: [],
};

export type ExtractionResult = {
	serviceType?: FieldValue;
	pickupLocation?: FieldValue;
	dropoffLocation?: FieldValue;
	deadline?: FieldValue;
	notes?: FieldValue;
	specialRequirements?: FieldValue;
	routeType?: FieldValue;
	country?: FieldValue;
	city?: FieldValue;
};

export const REQUIRED_FIELDS = [
	"serviceType",
	"pickupLocation",
	"dropoffLocation",
	"deadline",
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

export const FIELD_LABELS: Record<string, string> = {
	serviceType: "what needs to be done",
	pickupLocation: "where it should start",
	dropoffLocation: "where it should end",
	deadline: "when it needs to be handled",
	notes: "any key notes",
	specialRequirements: "any special requirements",
};

export type ConciergeTurn = {
	userText: string;
	assistantText: string;
	missing: RequiredField[];
	ready: boolean;
	summary: string;
	stage: ConversationStage;
	state: ConciergeState;
};

export type AssistantExtractionStrings = {
	serviceType?: string | null;
	pickupLocation?: string | null;
	dropoffLocation?: string | null;
	deadline?: string | null;
	notes?: string | null;
	specialRequirements?: string | null;
	routeType?: string | null;
	city?: string | null;
	country?: string | null;
};

export type PrefillRequest = {
	template?: string;
	description?: string;
	startLocation?: string;
	endLocation?: string;
	timing?: string;
	notes?: string;
};

export type ConciergeSession = {
	id: string;
	createdAt: number;
	updatedAt: number;
	state: ConciergeState;
};
