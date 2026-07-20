import { resolveToxiHandoffSelection } from "./handoffTemplateResolver";
import { CATALOG_TEMPLATES } from "../../data/serviceCatalogV2";

describe("resolveToxiHandoffSelection", () => {
	test("keeps exact catalog templates intact across the full template catalog", () => {
		for (const template of CATALOG_TEMPLATES) {
			const name = String(template?.name || "").trim();
			if (!name) continue;

			expect(
				resolveToxiHandoffSelection({ template: name, description: `${name} request` }),
			).toEqual(
				expect.objectContaining({
					templateName: name,
					matchSource: "exact",
				}),
			);
		}
	});

	test("keeps exact catalog templates intact and exposes the matching lane", () => {
		const result = resolveToxiHandoffSelection({
			template: "Passport / Visa Pickup",
			description: "Collect my passport from the consulate.",
		});

		expect(result).toMatchObject({
			templateName: "Passport / Visa Pickup",
			laneKey: "documents",
			categoryKey: "documents",
			matchSource: "exact",
		});
	});

	test("maps natural-language airport requests to the airport assistance catalog template", () => {
		const result = resolveToxiHandoffSelection({
			template: "Airport transport",
			description: "I need airport pickup from MMA2 and dropoff in Ibadan.",
			notes: "Flight arrives Monday evening.",
		});

		expect(result).toMatchObject({
			templateName: "Airport Pickup / Assistance",
			laneKey: "airport",
			categoryKey: "airport",
		});
		expect(result.matchSource).toBe("recommended");
	});

	it("maps grocery, pharmacy, courier, and legal requests to the expected templates", () => {
		expect(
			resolveToxiHandoffSelection({
				template: "grocery shopping + delivery",
				description: "Buy groceries from Ebeano and deliver to Ikoyi.",
			}),
		).toEqual(
			expect.objectContaining({
				templateName: "Grocery / Market Run",
				categoryKey: "shopping",
			}),
		);

		expect(
			resolveToxiHandoffSelection({
				description: "Pick up a prescription from the pharmacy and drop it off in Ikoyi.",
			}),
		).toEqual(
			expect.objectContaining({
				templateName: "Medical / Pharmacy Pickup",
				categoryKey: "health",
			}),
		);

		expect(
			resolveToxiHandoffSelection({
				description: "Send a parcel from Yaba to Ikeja before noon.",
			}),
		).toEqual(
			expect.objectContaining({
				templateName: "Courier / Document Delivery",
				matchSource: "recommended",
			}),
		);

		expect(
			resolveToxiHandoffSelection({
				template: "legal / notary",
				description: "File an affidavit at the court registry.",
			}),
		).toEqual(
			expect.objectContaining({
				templateName: "Legal / Notary",
				categoryKey: "legal",
			}),
		);
	});
});
