import { computePriceEstimate } from "../../App";

describe("Mystery Shopper pricing", () => {
	it("returns the updated diaspora-first GBP baseline without NGN-scale inflation", () => {
		const templateCatalog = [
			{
				name: "Mystery Shopper",
				complexity: "medium",
				basePrice: {
					byCurrency: {
						GBP: { minCents: 3500, maxCents: 3500 },
						USD: { minCents: 4500, maxCents: 4500 },
						EUR: { minCents: 3500, maxCents: 3500 },
						NGN: { minCents: 1200000, maxCents: 1800000 },
					},
				},
				pricing: { includeComplexityInBase: true },
			},
		];

		const estimate = computePriceEstimate({
			templateCatalog,
			selectedTemplateName: "Mystery Shopper",
			currency: "GBP",
			sensitivityTier: "standard",
			schedule: { type: "now" },
		});

		expect(estimate.currency).toBe("GBP");
		expect(estimate.parts.baseCents).toBe(3640);
		expect(estimate.parts.complexityAddCents).toBe(0);
		expect(estimate.totalCents).toBe(3640);
	});
});
