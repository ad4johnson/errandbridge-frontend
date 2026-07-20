import { buildToxiAssistantConfig } from "./assistantConfig";

describe("buildToxiAssistantConfig", () => {
	test("enables premium assistant mode for authenticated client support surfaces", () => {
		const config = buildToxiAssistantConfig({
			pathname: "/client",
			user: { id: "client-1" },
			mode: "client_support",
			surface: "client_dashboard",
			voiceRepliesEnabled: false,
		});

		expect(config.assistantMode).toBe(true);
		expect(config.assistantName).toBe("Toxi");
		expect(config.allowSpeechInput).toBe(true);
		expect(config.allowSpeechOutput).toBe(true);
		expect(config.showTeaser).toBe(false);
		expect(config.showBackToTop).toBe(true);
	});

	test("keeps request builder out of assistant mode for now", () => {
		const config = buildToxiAssistantConfig({
			pathname: "/client/create",
			user: { id: "client-1" },
			mode: "request_builder",
			surface: "create_flow",
			voiceRepliesEnabled: false,
		});

		expect(config.assistantMode).toBe(false);
		expect(config.showTeaser).toBe(false);
		expect(config.showBackToTop).toBe(false);
	});
});