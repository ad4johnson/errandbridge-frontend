export const toxiStructuredSchema = {
	name: "toxi_response",
	strict: true,
	// NOTE: In this repo, structured output is enforced server-side in
	// errandbridge-backend/app/routes/toxi_structured.py using OpenAI json_schema.
	// This object is retained as a documentation/compatibility reference.
	schema: {
		type: "object",
		additionalProperties: false,
		properties: {
			intent: {
				type: "string",
				enum: [
					"greeting",
					"new_request",
					"pricing",
					"patch",
					"redirect",
					"support",
					"status",
					"unknown",
				],
			},
			reply_text: { type: "string" },
			fields: { type: "object" },
			patch: { type: "object" },
			actionLink: { anyOf: [{ type: "null" }, { type: "object" }] },
			needsClarification: { type: "boolean" },
			missingFields: { type: "array", items: { type: "string" } },
			confidence: { type: "string", enum: ["low", "medium", "high"] },
		},
		required: [
			"intent",
			"reply_text",
			"fields",
			"patch",
			"actionLink",
			"needsClarification",
			"missingFields",
			"confidence",
		],
	},
} as const;

export type OpenAIToxiActionLink = {
	label: string;
	href: string;
	icon: "arrow" | "login" | "track" | "payment" | "support";
	variant: "primary" | "secondary" | "ghost";
};

export type OpenAIToxiFields = {
	serviceType: string | null;
	pickupLocation: string | null;
	dropoffLocation: string | null;
	deadline: string | null;
	notes: string | null;
	specialRequirements: string | null;
	tier: "standard" | "priority" | "concierge" | null;
	higherProof: boolean | null;
	airportCoordination: boolean | null;
	// Optional additive fields used by our deterministic engine.
	routeType?: string | null;
	city?: string | null;
	country?: string | null;
};

export type OpenAIToxiResponse = {
	// Present in our backend response to disambiguate openai vs fallback.
	mode?: "openai" | "fallback";
	intent:
		| "greeting"
		| "new_request"
		| "pricing"
		| "patch"
		| "redirect"
		| "support"
		| "status"
		| "unknown";
	reply_text: string;
	fields: OpenAIToxiFields;
	patch: OpenAIToxiFields;
	actionLink: null | OpenAIToxiActionLink;
	needsClarification: boolean;
	missingFields: string[];
	confidence: "low" | "medium" | "high";
};

const asNonEmptyString = (value: unknown): string | null => {
	if (value === null || value === undefined) return null;
	const v = String(value).trim();
	return v ? v : null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateOpenAIToxiResponse(value: unknown): OpenAIToxiResponse {
	if (!isPlainObject(value)) throw new Error("Invalid structured response.");
	const reply_text = asNonEmptyString(value.reply_text);
	if (!reply_text) throw new Error("Invalid reply_text.");

	if (!isPlainObject(value.fields)) throw new Error("Invalid fields.");
	if (!isPlainObject(value.patch)) throw new Error("Invalid patch.");
	if (!Array.isArray(value.missingFields)) throw new Error("Invalid missingFields.");

	// We keep this validation intentionally light; the backend enforces schema strictly.
	return value as OpenAIToxiResponse;
}

export async function callOpenAIToxi(args: {
	apiBaseUrl: string;
	token?: string | null;
	userText: string;
	mode: "landing" | "request_builder" | "client_support";
	pageContext?: Record<string, unknown>;
}): Promise<OpenAIToxiResponse> {
	if (!args.apiBaseUrl) throw new Error("Missing apiBaseUrl.");
	const userText = String(args.userText || "").trim();
	if (!userText) throw new Error("Missing userText.");

	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (args.token) headers.Authorization = `Bearer ${args.token}`;

	const res = await fetch(`${args.apiBaseUrl}/api/v1/toxi/structured`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			mode: args.mode,
			message: userText,
			page_context: args.pageContext || {},
		}),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.detail || `Structured assist failed (${res.status})`);
	}

	return validateOpenAIToxiResponse(data);
}
