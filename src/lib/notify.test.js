import { notify } from "./notify";

describe("notify", () => {
	it("exposes convenience helpers", () => {
		expect(typeof notify).toBe("function");
		expect(typeof notify.success).toBe("function");
		expect(typeof notify.info).toBe("function");
		expect(typeof notify.warning).toBe("function");
		expect(typeof notify.error).toBe("function");
	});

	it("dispatches an eb:toast event with type + dedupeKey", () => {
		const spy = jest.spyOn(window, "dispatchEvent");
		try {
			notify.success("Hello", { dedupeKey: "test-key", durationMs: 1234 });
			expect(spy).toHaveBeenCalled();
			const event = spy.mock.calls[0][0];
			expect(event.type).toBe("eb:toast");
			expect(event.detail).toEqual(
				expect.objectContaining({
					message: "Hello",
					type: "success",
					dedupeKey: "test-key",
					durationMs: 1234,
				}),
			);
		} finally {
			spy.mockRestore();
		}
	});
});
