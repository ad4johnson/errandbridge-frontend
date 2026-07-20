import {
	TOXI_CONCIERGE_HANDOFF_KEY,
	clearToxiConciergeHandoff,
	consumeToxiConciergeHandoff,
	readToxiConciergeHandoff,
	writeToxiConciergeHandoff,
} from "./handoff";

describe("toxi handoff", () => {
	beforeEach(() => {
		try {
			sessionStorage.removeItem(TOXI_CONCIERGE_HANDOFF_KEY);
		} catch {
			// ignore
		}
	});

	test("writes and reads a valid payload", () => {
		const payload = {
			version: 1,
			createdAt: 123456789,
			prefill: {
				template: "Courier / Document Delivery",
				description: "Deliver documents",
				startLocation: "Lekki",
				endLocation: "Ikeja",
				timing: "Tomorrow by 2pm",
				notes: "Call on arrival.",
			},
		};

		expect(writeToxiConciergeHandoff(payload)).toBe(true);
		const read = readToxiConciergeHandoff({ now: 123456789 });
		expect(read).toEqual(payload);
	});

	test("rejects invalid payloads", () => {
		expect(writeToxiConciergeHandoff(null)).toBe(false);
		expect(writeToxiConciergeHandoff({ version: 1 })).toBe(false);
		expect(
			writeToxiConciergeHandoff({
				version: 2,
				createdAt: Date.now(),
				prefill: {},
			}),
		).toBe(false);
		expect(readToxiConciergeHandoff()).toBe(null);
	});

	test("expires by TTL", () => {
		const now = 10000;
		const payload = {
			version: 1,
			createdAt: now - 5000,
			prefill: { description: "Expired" },
		};
		writeToxiConciergeHandoff(payload);
		// ttlMs smaller than age => expired.
		expect(readToxiConciergeHandoff({ ttlMs: 1000, now })).toBe(null);
	});

	test("consume clears the stored payload", () => {
		const payload = {
			version: 1,
			createdAt: 42,
			prefill: { description: "Hello" },
		};
		writeToxiConciergeHandoff(payload);
		expect(consumeToxiConciergeHandoff({ now: 42 })).toEqual(payload);
		expect(readToxiConciergeHandoff({ now: 42 })).toBe(null);
		clearToxiConciergeHandoff();
	});
});
