import { formatTemplateTitle } from "./displayNames";

describe("formatTemplateTitle", () => {
	test("aliases internal template keys to preferred display names", () => {
		expect(formatTemplateTitle("Personal Delivery")).toBe("Personal Errand");
	});

	test("title-cases fully lower-case inputs", () => {
		expect(formatTemplateTitle("grocery run")).toBe("Grocery Run");
	});

	test("preserves curated casing and acronyms", () => {
		expect(formatTemplateTitle("POS / ATM Follow-up")).toBe(
			"POS / ATM Follow-up",
		);
	});
});
