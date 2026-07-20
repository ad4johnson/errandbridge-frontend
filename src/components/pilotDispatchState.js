export const PILOT_AVAILABILITY_ONLINE = "online";
export const PILOT_AVAILABILITY_OFFLINE = "offline";
export const ADMIN_DISPATCH_ENABLED = "enabled";
export const ADMIN_DISPATCH_DISABLED = "disabled";
export const ADMIN_DISPATCH_PERMANENTLY_DISABLED = "permanently_disabled";

const normalizeAvailability = (value) => {
	const normalized = String(value || "").trim().toLowerCase();
	return normalized === PILOT_AVAILABILITY_ONLINE
		? PILOT_AVAILABILITY_ONLINE
		: PILOT_AVAILABILITY_OFFLINE;
};

const normalizeDispatchStatus = (value) => {
	const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
	if (normalized === ADMIN_DISPATCH_DISABLED) return ADMIN_DISPATCH_DISABLED;
	if (normalized === ADMIN_DISPATCH_PERMANENTLY_DISABLED) {
		return ADMIN_DISPATCH_PERMANENTLY_DISABLED;
	}
	return ADMIN_DISPATCH_ENABLED;
};

const defaultBlockReason = (availability, adminDispatchStatus) => {
	if (adminDispatchStatus === ADMIN_DISPATCH_PERMANENTLY_DISABLED) {
		return "Your pilot account has been permanently blocked from dispatch.";
	}
	if (adminDispatchStatus === ADMIN_DISPATCH_DISABLED) {
		return "Dispatch access is currently disabled by admin.";
	}
	if (availability !== PILOT_AVAILABILITY_ONLINE) {
		return "Go online to accept new errands.";
	}
	return "";
};

export const normalizePilotDispatchState = (source = {}) => {
	const availability = normalizeAvailability(
		source.availability ?? source.pilot_availability,
	);
	const adminDispatchStatus = normalizeDispatchStatus(
		source.admin_dispatch_status ?? source.adminDispatchStatus,
	);
	const canAcceptJobs =
		typeof source.can_accept_jobs === "boolean"
			? source.can_accept_jobs
			: typeof source.canAcceptJobs === "boolean"
				? source.canAcceptJobs
				: availability === PILOT_AVAILABILITY_ONLINE &&
					adminDispatchStatus === ADMIN_DISPATCH_ENABLED;
	const dispatchBlockReason =
		source.dispatch_block_reason ||
		source.dispatchBlockReason ||
		(canAcceptJobs ? "" : defaultBlockReason(availability, adminDispatchStatus));
	return {
		availability,
		adminDispatchStatus,
		canAcceptJobs,
		dispatchBlockReason,
		adminDispatchNote:
			source.admin_dispatch_note || source.adminDispatchNote || "",
	};
};

export const getPilotAvailabilityLabel = (availability) =>
	normalizeAvailability(availability) === PILOT_AVAILABILITY_ONLINE
		? "Online"
		: "Offline";

export const getAdminDispatchLabel = (status) => {
	const normalized = normalizeDispatchStatus(status);
	if (normalized === ADMIN_DISPATCH_DISABLED) return "Disabled";
	if (normalized === ADMIN_DISPATCH_PERMANENTLY_DISABLED) return "Permanent block";
	return "Enabled";
};
