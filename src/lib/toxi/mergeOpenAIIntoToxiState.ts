import type { ConciergeState, ExtractionResult } from "./conciergeEngine";
import { mergeExtractionIntoState } from "./conciergeEngine";

import type { OpenAIToxiResponse } from "./callOpenAIToxi";
import { openAIResponseToExtractionResult } from "./toxiOpenAIAdapter";

// Merge OpenAI extracted fields into the current deterministic Toxi state,
// using the existing confidence-based merge rules.
export function mergeOpenAIIntoToxiState(
	current: ConciergeState,
	res: OpenAIToxiResponse,
): ConciergeState {
	const extraction: ExtractionResult = openAIResponseToExtractionResult(res);
	return mergeExtractionIntoState(current, extraction);
}
