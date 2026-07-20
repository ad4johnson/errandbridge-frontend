import { pickPersonalizedTemplateChips } from "./App";

describe("pickPersonalizedTemplateChips", () => {
	test("prefers recent templates when present in smart chips and caps at max", () => {
		const smartChips = [
			{ id: "a", label: "A", template: "Template A" },
			{ id: "b", label: "B", template: "Template B" },
			{ id: "c", label: "C", template: "Template C" },
			{ id: "d", label: "D", template: "Template D" },
			{ id: "e", label: "E", template: "Template E" },
		];

		const recentTemplates = ["Template D", "Template Z", "Template B"];

		const picked = pickPersonalizedTemplateChips({
			smartChips,
			recentTemplates,
			max: 4,
		});
		expect(picked.map((c) => c.template)).toEqual([
			"Template D",
			"Template B",
			"Template A",
			"Template C",
		]);
	});

	test("falls back to base ordering when no recents match", () => {
		const smartChips = [
			{ id: "a", label: "A", template: "Template A" },
			{ id: "b", label: "B", template: "Template B" },
			{ id: "c", label: "C", template: "Template C" },
			{ id: "d", label: "D", template: "Template D" },
		];

		const recentTemplates = ["Unknown 1", "Unknown 2"];

		const picked = pickPersonalizedTemplateChips({
			smartChips,
			recentTemplates,
			max: 4,
		});
		expect(picked.map((c) => c.template)).toEqual([
			"Template A",
			"Template B",
			"Template C",
			"Template D",
		]);
	});
});
