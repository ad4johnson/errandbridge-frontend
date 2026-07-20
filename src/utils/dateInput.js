export const getTodayDateInputValue = () => {
	const now = new Date();
	const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
	return local.toISOString().split("T")[0];
};

export const isValidDateInputValue = (value) =>
	typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

export const isValidTimeInputValue = (value) =>
	typeof value === "string" && /^\d{2}:\d{2}$/.test(value.trim());

export const compareTimeInputValues = (left, right) => {
	if (!isValidTimeInputValue(left) || !isValidTimeInputValue(right)) return null;
	if (left === right) return 0;
	return left > right ? 1 : -1;
};

const timeInputToMinutes = (value) => {
	if (!isValidTimeInputValue(value)) return null;
	const [hRaw, mRaw] = value.split(":");
	const h = Number(hRaw);
	const m = Number(mRaw);
	if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
	if (h < 0 || h > 23 || m < 0 || m > 59) return null;
	return h * 60 + m;
};

const minutesToTimeInput = (totalMinutes) => {
	if (!Number.isFinite(totalMinutes)) return null;
	const mins = Math.trunc(totalMinutes);
	if (mins < 0 || mins >= 24 * 60) return null;
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const roundTimeInputUpToStep = (
	value,
	{ stepMinutes = 15 } = {},
) => {
	const mins = timeInputToMinutes(value);
	const step = Math.trunc(Number(stepMinutes));
	if (mins === null) return null;
	if (!Number.isFinite(step) || step <= 0) return null;
	const remainder = mins % step;
	const rounded = remainder === 0 ? mins : mins + (step - remainder);
	return minutesToTimeInput(rounded);
};

// Returns the next step-aligned time strictly after the given time.
// Example: getNextTimeInputStepAfter("14:15", {stepMinutes: 15}) => "14:30"
export const getNextTimeInputStepAfter = (
	value,
	{ stepMinutes = 15 } = {},
) => {
	const mins = timeInputToMinutes(value);
	const step = Math.trunc(Number(stepMinutes));
	if (mins === null) return null;
	if (!Number.isFinite(step) || step <= 0) return null;
	const remainder = mins % step;
	const next = remainder === 0 ? mins + step : mins + (step - remainder);
	return minutesToTimeInput(next);
};

export const getCurrentTimeInputValue = ({ now = new Date() } = {}) => {
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
};

export const getTimeInputOptions = ({ stepMinutes = 15 } = {}) => {
	const step = Math.trunc(Number(stepMinutes));
	if (!Number.isFinite(step) || step <= 0) return [];

	const options = [];
	for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += step) {
		const value = minutesToTimeInput(totalMinutes);
		if (value) options.push(value);
	}

	return options;
};

export const validateFutureTimeWindow = ({
	date,
	startTime = "",
	endTime = "",
	todayDate = getTodayDateInputValue(),
	currentTime = getCurrentTimeInputValue(),
} = {}) => {
	if (!date || !isValidDateInputValue(date)) {
		return { valid: true, code: null, reason: "" };
	}

	if (startTime && !isValidTimeInputValue(startTime)) {
		return {
			valid: false,
			code: "invalid_start_time",
			reason: "Please select a valid start time.",
		};
	}

	if (endTime && !isValidTimeInputValue(endTime)) {
		return {
			valid: false,
			code: "invalid_end_time",
			reason: "Please select a valid end time.",
		};
	}

	if (startTime && endTime) {
		const endVsStart = compareTimeInputValues(endTime, startTime);
		if (endVsStart !== null && endVsStart <= 0) {
			return {
				valid: false,
				code: "end_not_after_start",
				reason: "End time must be after the start time.",
			};
		}
	}

	if (date === todayDate) {
		if (startTime) {
			const startVsNow = compareTimeInputValues(startTime, currentTime);
			if (startVsNow !== null && startVsNow <= 0) {
				return {
					valid: false,
					code: "start_in_past",
					reason: "Start time must be later than the current time.",
				};
			}
		}

		if (endTime) {
			const endVsNow = compareTimeInputValues(endTime, currentTime);
			if (endVsNow !== null && endVsNow <= 0) {
				return {
					valid: false,
					code: "end_in_past",
					reason: "End time must be later than the current time.",
				};
			}
		}
	}

	return { valid: true, code: null, reason: "" };
};

export const filterSchedulableTimeInputOptions = (
	timeOptions = [],
	{
		date = "",
		todayDate = getTodayDateInputValue(),
		currentTime = getCurrentTimeInputValue(),
		minExclusiveTime = "",
	} = {},
) => {
	const list = Array.isArray(timeOptions)
		? timeOptions.filter((value) => isValidTimeInputValue(value))
		: [];

	return list.filter((value) => {
		if (date === todayDate && isValidTimeInputValue(currentTime)) {
			const currentCmp = compareTimeInputValues(value, currentTime);
			if (currentCmp !== null && currentCmp <= 0) return false;
		}

		if (isValidTimeInputValue(minExclusiveTime)) {
			const minCmp = compareTimeInputValues(value, minExclusiveTime);
			if (minCmp !== null && minCmp <= 0) return false;
		}

		return true;
	});
};

export const clampFutureDateInputValue = (
	value,
	{ todayDate = getTodayDateInputValue(), fallback = "" } = {},
) => {
	if (!isValidDateInputValue(value)) return fallback;
	return value < todayDate ? fallback : value;
};

export const getFutureDateInputAnchorValue = (
	value,
	{ todayDate = getTodayDateInputValue(), fallback = todayDate || "" } = {},
) => {
	const normalizedFallback = isValidDateInputValue(fallback)
		? fallback
		: todayDate || "";
	return clampFutureDateInputValue(value, {
		todayDate,
		fallback: normalizedFallback,
	});
};

const dateInputValueToLocalDate = (value) => {
	if (!isValidDateInputValue(value)) return null;
	const [yearRaw, monthRaw, dayRaw] = value.split("-");
	const year = Number(yearRaw);
	const month = Number(monthRaw);
	const day = Number(dayRaw);
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return null;
	}
	return new Date(year, month - 1, day);
};

export const getFutureScheduleDateOptions = ({
	todayDate = getTodayDateInputValue(),
	selectedDate = "",
	todayOnly = false,
	daysAhead = 365,
} = {}) => {
	const fallback = todayDate || selectedDate || "";
	const anchor = todayOnly
		? fallback
		: getFutureDateInputAnchorValue(selectedDate || fallback, {
			todayDate: todayDate || fallback,
			fallback,
		});

	if (!anchor) return [];
	if (todayOnly) return [anchor];

	const start = dateInputValueToLocalDate(anchor);
	if (!start) return [];

	const totalDays = Math.max(1, Math.trunc(Number(daysAhead)) || 365);
	const options = [];
	for (let i = 0; i < totalDays; i += 1) {
		const dt = new Date(start);
		dt.setDate(start.getDate() + i);
		const year = dt.getFullYear();
		const month = String(dt.getMonth() + 1).padStart(2, "0");
		const day = String(dt.getDate()).padStart(2, "0");
		options.push(`${year}-${month}-${day}`);
	}

	return options;
};

export const clampPastDateInputValue = (
	value,
	{ todayDate = getTodayDateInputValue(), fallback = "" } = {},
) => {
	if (!isValidDateInputValue(value)) return fallback;
	return value > todayDate ? fallback : value;
};