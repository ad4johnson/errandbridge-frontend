import { createErrandActivityPoller } from "./errandActivityPoller";
import { notify } from "../notify";

jest.mock("../notify", () => ({
	notify: jest.fn(),
}));

describe("createErrandActivityPoller (timeline feed)", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		notify.mockClear();
		global.fetch = jest.fn();
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.resetAllMocks();
	});

	const flushMicrotasks = async (times = 10) => {
		// Allow pending promise continuations to run.
		// The poller does multiple awaits (fetch -> json -> tick continuation),
		// so flushing only once or twice can be flaky under fake timers.
		for (let i = 0; i < times; i += 1) {
			// eslint-disable-next-line no-await-in-loop
			await Promise.resolve();
		}
	};

	it("primes on first tick and toasts only new timeline events", async () => {
		const token = "test-token";
		const apiBaseUrl = "http://example.test";

		// 1) Prime call (DESC limit=1) -> latest id=10, no toasts.
		global.fetch
			.mockResolvedValueOnce({
				status: 200,
				ok: true,
				json: async () => ({
					data: {
						errandTimelineEvents: [
						{
							id: 10,
							errandId: 1,
							referenceNumber: "EB-1-0001",
							errandTitle: "Passport pickup",
							eventType: "status_update",
							oldStatus: "submitted",
							newStatus: "assigned",
							note: null,
							createdAt: "2026-04-14T00:00:00Z",
							userId: 123,
						},
					],
					},
				}),
			})
			// 2) Second tick (ASC sinceId=10) -> new events id=11,12.
			.mockResolvedValueOnce({
				status: 200,
				ok: true,
				json: async () => ({
					data: {
						errandTimelineEvents: [
						{
							id: 11,
							errandId: 1,
							referenceNumber: "EB-1-0001",
							errandTitle: "Passport pickup",
							eventType: "admin_attachment_approved",
							oldStatus: null,
							newStatus: null,
							note: "Approved",
							createdAt: "2026-04-14T00:01:00Z",
							userId: 999,
						},
						{
							id: 12,
							errandId: 1,
							referenceNumber: "EB-1-0001",
							errandTitle: "Passport pickup",
							eventType: "status_update",
							oldStatus: "assigned",
							newStatus: "picked_up",
							note: null,
							createdAt: "2026-04-14T00:02:00Z",
							userId: 9,
						},
					],
					},
				}),
			});

		const poller = createErrandActivityPoller({
			apiBaseUrl,
			getAuthToken: () => token,
			getErrandIds: () => [1],
			getEnabled: () => true,
			intervalMs: 1000,
		});

		poller.start();
		await flushMicrotasks();

		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(notify).not.toHaveBeenCalled();

		jest.advanceTimersByTime(1000);
		await flushMicrotasks();

		expect(global.fetch).toHaveBeenCalledTimes(2);
		expect(notify).toHaveBeenCalledTimes(2);

		expect(notify).toHaveBeenCalledWith(
			"✅ Document approved for \"Passport pickup\" - Approved",
			expect.objectContaining({ type: "success" }),
		);
		expect(notify).toHaveBeenCalledWith(
			"Update: \"Passport pickup\" is now Picked Up",
			expect.objectContaining({ type: "info" }),
		);

		poller.stop();
	});
});
