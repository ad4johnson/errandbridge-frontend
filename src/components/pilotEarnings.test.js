import {
	formatPilotPotentialPayout,
	getPilotEarnings,
	PILOT_PAYOUT_SHARE,
	PLATFORM_FEE_SHARE,
} from "./pilotEarnings";

describe("pilot payout calculations", () => {
	test("applies the 30 percent platform fee to canonical NGN payment amounts", () => {
		expect(PLATFORM_FEE_SHARE).toBe(0.3);
		expect(PILOT_PAYOUT_SHARE).toBe(0.7);
		expect(
			getPilotEarnings({
				payment_amount_ngn_major: 10000,
				amount: 10000,
			}),
		).toBe(7000);
	});

	test("formats pilot-facing potential payout copy for trust", () => {
		expect(
			formatPilotPotentialPayout({ paymentAmountNgnMajor: 15000 }),
		).toBe("₦10,500 potential payout");
	});
});