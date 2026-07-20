import {
	compareTimeInputValues,
	clampFutureDateInputValue,
	filterSchedulableTimeInputOptions,
	getCurrentTimeInputValue,
	getFutureDateInputAnchorValue,
	getFutureScheduleDateOptions,
	getTimeInputOptions,
	getNextTimeInputStepAfter,
	roundTimeInputUpToStep,
	validateFutureTimeWindow,
} from "./dateInput";

describe("dateInput future-date helpers", () => {
	test("anchors stale past dates to today for future-only pickers", () => {
		expect(
			getFutureDateInputAnchorValue("2026-04-01", {
				todayDate: "2026-04-10",
				fallback: "2026-04-10",
			}),
		).toBe("2026-04-10");
	});

	test("keeps valid future dates untouched", () => {
		expect(
			getFutureDateInputAnchorValue("2026-04-20", {
				todayDate: "2026-04-10",
				fallback: "2026-04-10",
			}),
		).toBe("2026-04-20");
	});

	test("still allows strict clamping to empty when callers want blank fallback", () => {
		expect(
			clampFutureDateInputValue("2026-04-01", {
				todayDate: "2026-04-10",
				fallback: "",
			}),
		).toBe("");
	});

		test("can lock schedule date options to today only", () => {
			expect(
				getFutureScheduleDateOptions({
					todayDate: "2026-04-27",
					selectedDate: "2026-05-01",
					todayOnly: true,
				}),
			).toEqual(["2026-04-27"]);
		});

		test("builds a future date range from the selected anchor", () => {
			expect(
				getFutureScheduleDateOptions({
					todayDate: "2026-04-27",
					selectedDate: "2026-04-29",
					daysAhead: 3,
				}),
			).toEqual(["2026-04-29", "2026-04-30", "2026-05-01"]);
		});
});

describe("dateInput time-window helpers", () => {
	test("compares HH:mm values deterministically", () => {
		expect(compareTimeInputValues("09:00", "09:00")).toBe(0);
		expect(compareTimeInputValues("09:15", "09:00")).toBe(1);
		expect(compareTimeInputValues("08:45", "09:00")).toBe(-1);
	});

	test("formats the current time as HH:mm", () => {
		expect(
			getCurrentTimeInputValue({ now: new Date("2026-04-11T14:07:00") }),
		).toBe("14:07");
	});

	test("rounds times up to the next step boundary", () => {
		expect(roundTimeInputUpToStep("14:07", { stepMinutes: 15 })).toBe(
			"14:15",
		);
		expect(roundTimeInputUpToStep("14:15", { stepMinutes: 15 })).toBe(
			"14:15",
		);
		expect(roundTimeInputUpToStep("23:59", { stepMinutes: 15 })).toBe(null);
	});

	test("computes the next step-aligned time strictly after the current time", () => {
		expect(getNextTimeInputStepAfter("14:07", { stepMinutes: 15 })).toBe(
			"14:15",
		);
		expect(getNextTimeInputStepAfter("14:15", { stepMinutes: 15 })).toBe(
			"14:30",
		);
		expect(getNextTimeInputStepAfter("23:50", { stepMinutes: 15 })).toBe(null);
	});

	test("builds step-aligned time options", () => {
		expect(getTimeInputOptions({ stepMinutes: 30 }).slice(0, 5)).toEqual([
			"00:00",
			"00:30",
			"01:00",
			"01:30",
			"02:00",
		]);
	});

	test("filters past times for today and keeps end times after the chosen start", () => {
		const options = getTimeInputOptions({ stepMinutes: 15 });

		expect(
			filterSchedulableTimeInputOptions(options, {
				date: "2026-04-27",
				todayDate: "2026-04-27",
				currentTime: "14:07",
			}).slice(0, 4),
		).toEqual(["14:15", "14:30", "14:45", "15:00"]);

		expect(
			filterSchedulableTimeInputOptions(options, {
				date: "2026-04-27",
				todayDate: "2026-04-27",
				currentTime: "14:07",
				minExclusiveTime: "15:00",
			}).slice(0, 3),
		).toEqual(["15:15", "15:30", "15:45"]);
	});

	test("rejects same-day start times that are already in the past", () => {
		expect(
			validateFutureTimeWindow({
				date: "2026-04-11",
				startTime: "13:45",
				todayDate: "2026-04-11",
				currentTime: "14:00",
			}),
		).toEqual({
			valid: false,
			code: "start_in_past",
			reason: "Start time must be later than the current time.",
		});
	});

	test("rejects end times that are not after the start time", () => {
		expect(
			validateFutureTimeWindow({
				date: "2026-04-12",
				startTime: "16:00",
				endTime: "15:45",
				todayDate: "2026-04-11",
				currentTime: "14:00",
			}),
		).toEqual({
			valid: false,
			code: "end_not_after_start",
			reason: "End time must be after the start time.",
		});
	});

	test("allows future windows on today and later dates", () => {
		expect(
			validateFutureTimeWindow({
				date: "2026-04-11",
				startTime: "14:15",
				endTime: "15:30",
				todayDate: "2026-04-11",
				currentTime: "14:00",
			}),
		).toEqual({ valid: true, code: null, reason: "" });

		expect(
			validateFutureTimeWindow({
				date: "2026-04-12",
				startTime: "08:00",
				endTime: "09:00",
				todayDate: "2026-04-11",
				currentTime: "14:00",
			}),
		).toEqual({ valid: true, code: null, reason: "" });
	});
});