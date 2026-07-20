import type {
	ConciergeState,
	ExtractionResult,
	FieldValue,
	RequiredField,
} from "./types";
import { REQUIRED_FIELDS } from "./types";
import { extractFieldsDeterministically } from "./extractor";

const confidenceScore: Record<"low" | "medium" | "high", number> = {
	low: 1,
	medium: 2,
	high: 3,
};

export function mergeField(
	existing?: FieldValue,
	incoming?: FieldValue,
): FieldValue | undefined {
	if (!incoming) return existing;
	if (!existing) return incoming;

	if (confidenceScore[incoming.confidence] > confidenceScore[existing.confidence]) {
		return incoming;
	}

	if (
		confidenceScore[incoming.confidence] ===
			confidenceScore[existing.confidence] &&
		incoming.value.length > existing.value.length
	) {
		return incoming;
	}

	return existing;
}

export function mergeExtractionIntoState(
	state: ConciergeState,
	extraction: ExtractionResult,
): ConciergeState {
	const nextState: ConciergeState = {
		...state,
		serviceType: mergeField(state.serviceType, extraction.serviceType),
		pickupLocation: mergeField(state.pickupLocation, extraction.pickupLocation),
		dropoffLocation: mergeField(state.dropoffLocation, extraction.dropoffLocation),
		deadline: mergeField(state.deadline, extraction.deadline),
		notes: mergeField(state.notes, extraction.notes),
		specialRequirements: mergeField(
			state.specialRequirements,
			extraction.specialRequirements,
		),
		routeType: mergeField(state.routeType, extraction.routeType),
		city: mergeField(state.city, extraction.city),
		country: mergeField(state.country, extraction.country),
	};

	nextState.completedFields = REQUIRED_FIELDS.filter((field) => {
		const val = (nextState as any)[field] as FieldValue | undefined;
		return Boolean(val && val.confidence !== "low");
	});

	return nextState;
}

export function getMissingFields(state: ConciergeState): RequiredField[] {
	return REQUIRED_FIELDS.filter((field) => {
		const value = (state as any)[field] as FieldValue | undefined;
		return !value || value.confidence === "low";
	});
}

export function isReadyForRequest(state: ConciergeState): boolean {
	return REQUIRED_FIELDS.every((field) => {
		const val = (state as any)[field] as FieldValue | undefined;
		return Boolean(val && (val.confidence === "medium" || val.confidence === "high"));
	});
}

export function detectConflicts(state: ConciergeState): string[] {
	const conflicts: string[] = [];

	const pickup = state.pickupLocation?.value?.toLowerCase();
	const dropoff = state.dropoffLocation?.value?.toLowerCase();
	if (pickup && dropoff && pickup === dropoff) {
		conflicts.push("pickup_dropoff_same");
	}

	return conflicts;
}

export function getFieldsToAsk(
	state: ConciergeState,
	missing: RequiredField[],
): RequiredField[] {
	if (missing.length === 0) return [];

	const orderedMissing = REQUIRED_FIELDS.filter((field) => missing.includes(field));

	return [orderedMissing[0]];
}

export function extractAndMergeMessage(
	userText: string,
	state: ConciergeState,
	aiExtraction?: ExtractionResult,
): { nextState: ConciergeState; missing: RequiredField[]; conflicts: string[] } {
	const deterministic = extractFieldsDeterministically(userText);

	const extraction: ExtractionResult = {
		serviceType: mergeField(deterministic.serviceType, aiExtraction?.serviceType),
		pickupLocation: mergeField(
			deterministic.pickupLocation,
			aiExtraction?.pickupLocation,
		),
		dropoffLocation: mergeField(
			deterministic.dropoffLocation,
			aiExtraction?.dropoffLocation,
		),
		deadline: mergeField(deterministic.deadline, aiExtraction?.deadline),
		notes: mergeField(deterministic.notes, aiExtraction?.notes),
		specialRequirements: mergeField(
			deterministic.specialRequirements,
			aiExtraction?.specialRequirements,
		),
		routeType: mergeField(deterministic.routeType, aiExtraction?.routeType),
		country: mergeField(deterministic.country, aiExtraction?.country),
		city: mergeField(deterministic.city, aiExtraction?.city),
	};

	const nextState = mergeExtractionIntoState(state, extraction);
	const conflicts = detectConflicts(nextState);
	const missing = getMissingFields(nextState);
	return { nextState, missing, conflicts };
}
