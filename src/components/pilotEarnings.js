const PLATFORM_FEE_SHARE = 0.3;
const PILOT_PAYOUT_SHARE = 1 - PLATFORM_FEE_SHARE;
const AMOUNT_TO_NGN_RATE = Number(
	process.env.REACT_APP_AMOUNT_TO_NGN_RATE || 1,
);

const sanitizeNumber = (value) => {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
};

export const getPilotEarnings = (jobOrAmount) => {
	const maybeJob =
		jobOrAmount && typeof jobOrAmount === "object" ? jobOrAmount : null;

	const serverNgn = sanitizeNumber(
		maybeJob?.payment_amount_ngn_major ?? maybeJob?.paymentAmountNgnMajor,
	);
	if (serverNgn !== null && serverNgn > 0) {
		return Math.round(serverNgn * PILOT_PAYOUT_SHARE);
	}

	const amount =
		maybeJob?.amount ??
		maybeJob?.payment_amount ??
		maybeJob?.paymentAmount ??
		jobOrAmount;
	const numericAmount = sanitizeNumber(amount);
	if (numericAmount === null) return 0;

	const netAmount = numericAmount * PILOT_PAYOUT_SHARE;
	const ngnAmount =
		netAmount * (Number.isFinite(AMOUNT_TO_NGN_RATE) ? AMOUNT_TO_NGN_RATE : 1);
	return Math.round(ngnAmount);
};

export const formatPilotPotentialPayout = (jobOrAmount) => {
	const payout = getPilotEarnings(jobOrAmount);
	return payout > 0
		? `₦${payout.toLocaleString()} potential payout`
		: "Estimated after confirmation";
};

export { PLATFORM_FEE_SHARE, PILOT_PAYOUT_SHARE };