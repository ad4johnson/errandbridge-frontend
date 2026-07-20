import { CATALOG_TEMPLATES } from "../../../data/serviceCatalogV2";
import { recommendTemplate } from "./templateRecommendations";

describe("recommendTemplate", () => {
	test("recognizes exact template names across the full catalog", () => {
		for (const template of CATALOG_TEMPLATES) {
			const name = String(template?.name || "").trim();
			if (!name) continue;

			expect(recommendTemplate(name)).toEqual(
				expect.objectContaining({ template: name }),
			);
		}
	});

	test("recognizes descriptive phrases for a spread of catalog templates", () => {
		expect(
			recommendTemplate("Need a passport pickup from the visa centre with proof."),
		).toEqual(expect.objectContaining({ template: "Passport / Visa Pickup" }));

		expect(
			recommendTemplate("Submit an affidavit at the court registry and return the stamped receipt."),
		).toEqual(expect.objectContaining({ template: "Court / Registry Submission" }));

		expect(
			recommendTemplate("Please inspect the property site and send photo proof of progress."),
		).toEqual(expect.objectContaining({ template: "Site Check / Project Visit" }));

		expect(
			recommendTemplate("I need a welfare check for my mum and urgent verified updates."),
		).toEqual(expect.objectContaining({ template: "Urgent Welfare Check" }));

		expect(
			recommendTemplate("Coordinate a vendor pickup and confirmed delivery handoff for the office."),
		).toEqual(expect.objectContaining({ template: "Vendor / Delivery Coordination" }));

		expect(
			recommendTemplate("Pick up lab results from the clinic and deliver them privately."),
		).toEqual(expect.objectContaining({ template: "Lab Result / Test Collection" }));
	});
});