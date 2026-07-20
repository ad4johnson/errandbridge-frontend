import {
	extractErrandIdFromReference,
	extractErrandReference,
	routeToxiIntent,
} from "./intentRouter";

describe("intentRouter", () => {
	it("extractErrandReference normalizes common formats", () => {
		expect(extractErrandReference("ref EB-16-6704")).toBe("EB-16-6704");
		expect(extractErrandReference("EB 16 6704")).toBe("EB-16-6704");
		expect(extractErrandReference("EB_16_6704")).toBe("EB-16-6704");
	});

	it("extractErrandIdFromReference returns numeric id", () => {
		expect(extractErrandIdFromReference("EB-16-6704")).toBe(16);
		expect(extractErrandIdFromReference("EB 123 9999")).toBe(123);
		expect(extractErrandIdFromReference("nope")).toBe(null);
	});

	it("routes status + reference to track", () => {
		expect(
			routeToxiIntent(
				"What’s the status of my ref EB-16-6704?",
				"client_dashboard",
			),
		).toBe("track");
	});

	it("routes proof + reference to proof", () => {
		expect(
			routeToxiIntent("I need proof/receipt for EB-16-6704", "client_dashboard"),
		).toBe("proof");
	});

	it("routes update + reference to update", () => {
		expect(
			routeToxiIntent(
				"Please update my timing for EB-16-6704",
				"client_dashboard",
			),
		).toBe("update");
	});

	it("defaults ambiguous messages by surface", () => {
		expect(routeToxiIntent("Hi", "client_dashboard")).toBe("track");
		expect(routeToxiIntent("Hi", "landing_page")).toBe("create");
	});

	it("keeps document-heavy create intents out of proof mode", () => {
		expect(
			routeToxiIntent(
				"Need a courier to deliver legal documents from Ikeja to Lekki tomorrow morning.",
				"landing_page",
			),
		).toBe("create");
	});

	it("treats grocery and pharmacy requests as create intents", () => {
		expect(
			routeToxiIntent(
				"Please buy groceries from Ebeano in Lekki and bring them to Ikoyi tonight.",
				"landing_page",
			),
		).toBe("create");
		expect(
			routeToxiIntent(
				"Pick up my prescription from the pharmacy and deliver it to Victoria Island.",
				"landing_page",
			),
		).toBe("create");
	});
});
