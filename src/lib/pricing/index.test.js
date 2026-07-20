import {
	estimateDistanceKmFromLocations,
	matchPilotCapabilities,
	priceErrand,
} from "./index";

describe("priceErrand", () => {
	test("prices a documents errand with bike support and priority uplift", () => {
		const breakdown = priceErrand({
			categoryId: "documents",
			template: "Passport Collection",
			supportType: "bike_support",
			startLocation: "Passport Office, Lagos",
			endLocation: "Home, Lagos",
			distanceKm: 8,
			priority: "priority",
			currency: "GBP",
		});

		expect(breakdown.total.currency).toBe("GBP");
		expect(breakdown.meta.distanceKm).toBe(8);
		expect(breakdown.total.minor).toBe(7200);
	});

	test("uses single-location pricing when no ending point is supplied", () => {
		const breakdown = priceErrand({
			categoryId: "property",
			supportType: "standard_assistance",
			startLocation: "Victoria Island, Lagos",
			endLocation: "",
			priority: "standard",
			currency: "GBP",
		});

		expect(breakdown.meta.distanceKm).toBeNull();
		expect(breakdown.total.minor).toBe(8500);
	});
});

describe("pricing helpers", () => {
	test("estimates same-city text routes conservatively", () => {
		const estimate = estimateDistanceKmFromLocations("Ikeja, Lagos", "Lekki, Lagos");
		expect(estimate.distanceKm).toBe(8);
	});

	test("matches pilot capabilities against support type and route length", () => {
		expect(
			matchPilotCapabilities({
				supportType: "bike_support",
				distanceKm: 6,
				pilot: { hasBike: true, available: true, verified: true, serviceRadius: 10 },
			}),
		).toBe(true);

		expect(
			matchPilotCapabilities({
				supportType: "car_support",
				distanceKm: 40,
				pilot: { hasCar: true, crossCityAvailable: false, available: true, verified: true },
			}),
		).toBe(false);
	});
});
