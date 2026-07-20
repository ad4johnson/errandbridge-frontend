import {
	createConciergeSession,
	stepConcierge,
} from "./conciergeEngine";

import { callOpenAIToxi } from "./callOpenAIToxi";
import {
	adaptOpenAIToToxiPayload,
	openAIResponseToExtractionResult,
} from "./toxiOpenAIAdapter";

const truthy = (value: unknown): boolean => {
	const v = String(value || "").trim().toLowerCase();
	return v === "1" || v === "true" || v === "yes" || v === "on";
};

export const isToxiOpenAiEnabled = (): boolean =>
	truthy(process.env.REACT_APP_TOXI_OPENAI_ENABLED);

export async function handleHybridToxiMessage(args: {
	apiBaseUrl: string;
	token?: string | null;
	userText: string;
	mode: "landing" | "request_builder" | "client_support";
	pageContext?: Record<string, unknown>;
	session?: ReturnType<typeof createConciergeSession> | null;
}) {
	const session = args.session || createConciergeSession();
	const userText = String(args.userText || "").trim();

	if (!isToxiOpenAiEnabled()) {
		const { session: nextSession, turn } = stepConcierge(session, userText);
		return {
			nextSession,
			turn,
			payload: {
				text: turn?.assistantText || "",
				meta: { source: "fallback" as const },
			},
			structured: null as any,
		};
	}

	try {
		const openaiRes = await callOpenAIToxi({
			apiBaseUrl: args.apiBaseUrl,
			token: args.token || null,
			userText,
			mode: args.mode,
			pageContext: args.pageContext || {},
		});

		// Convert OpenAI fields into the existing deterministic merge shape.
		const aiExtraction = openAIResponseToExtractionResult(openaiRes);
		const { session: nextSession, turn } = stepConcierge(
			session,
			userText,
			aiExtraction,
		);

		// Map OpenAI response into an additive payload.
		const payload = adaptOpenAIToToxiPayload(openaiRes);

		return {
			nextSession,
			turn,
			payload,
			structured: openaiRes,
		};
	} catch {
		const { session: nextSession, turn } = stepConcierge(session, userText);
		return {
			nextSession,
			turn,
			payload: {
				text: turn?.assistantText || "",
				meta: { source: "fallback" as const },
			},
			structured: null as any,
		};
	}
}
