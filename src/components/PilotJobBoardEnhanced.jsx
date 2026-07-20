/**
 * Enhanced Pilot Job Board
 * Features:
 * - Smart sorting (distance, earnings, rating)
 * - Filtering (distance, pay, customer rating)
 * - Search by location
 * - Performance optimization with React.memo
 * - Estimated earnings calculation
 * - Smart refresh (adaptive refresh rate)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./PilotJobBoardEnhanced.css";
import { notify } from "../lib/notify";
import {
	formatPilotPotentialPayout,
	getPilotEarnings,
} from "./pilotEarnings";
import { normalizePilotStats } from "./pilotStats";
import {
	ADMIN_DISPATCH_ENABLED,
	getAdminDispatchLabel,
	getPilotAvailabilityLabel,
	normalizePilotDispatchState,
} from "./pilotDispatchState";

const getEndingLocationValue = (job) => {
	const raw =
		job?.dropoff_location ||
		job?.delivery_location ||
		job?.dropoffLocation ||
		job?.end_location ||
		job?.endLocation ||
		"";
	return String(raw || "").trim();
};

const formatEndingLocation = (job, fallback = "Not provided") => {
	const value = getEndingLocationValue(job);
	return value || fallback;
};

const formatRouteLabel = (job) => {
	const pickupRaw = job?.pickup_location || job?.pickupLocation || "";
	const pickup = String(pickupRaw || "").trim();
	const pickupLabel = pickup || "Pickup pending";
	const ending = getEndingLocationValue(job);
	if (!ending) return pickupLabel;
	return `${pickupLabel} → ${ending}`;
};

const JOB_CATEGORY_ORDER = [
	"All",
	"Documents",
	"Delivery",
	"Airport",
	"Property",
	"Grocery",
];

const HELP_REASON_OPTIONS = [
	{ value: "delay", label: "Delay" },
	{ value: "vehicle_issue", label: "Vehicle issue" },
	{ value: "wrong_assignment", label: "Wrong assignment" },
	{ value: "customer_issue", label: "Customer issue" },
	{ value: "safety", label: "Safety concern" },
];

const ACTIVE_QUEUE_FILTER_OPTIONS = [
	{ value: "all", label: "All" },
	{ value: "queued", label: "Queued" },
	{ value: "live", label: "Live" },
];

const getJobCategory = (job) => {
	const haystack = `${job?.title || ""} ${job?.description || ""} ${job?.note || ""}`.toLowerCase();
	if (/certificate|document|visa|passport|paper|collection/.test(haystack)) {
		return "Documents";
	}
	if (/airport|travel|terminal|flight/.test(haystack)) {
		return "Airport";
	}
	if (/grocery|market|shopping|store|supermarket/.test(haystack)) {
		return "Grocery";
	}
	if (/property|inspection|home support|house|apartment|real estate/.test(haystack)) {
		return "Property";
	}
	if (/delivery|dropoff|dispatch|parcel|package/.test(haystack)) {
		return "Delivery";
	}
	return "Delivery";
};

const buildProofSummary = (job) => {
	const items = buildChecklistItems(job?.description || job?.note || "");
	if (!items.length) return "Proof: photo / confirmation required";
	if (items.length === 1) return `Proof: ${items[0]}`;
	return `Proof: ${items.slice(0, 2).join(" • ")}`;
};

const buildChecklistItems = (text) => {
	if (!text) return [];
	const normalized = text.toString().replace(/\r\n/g, "\n");
	return normalized
		.split(/\n|•|-\s/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => line.replace(/^([•\-*]|\d+[).])\s*/i, "").trim())
		.filter(Boolean);
};

const formatPickupWindow = (errand) => {
	const start = errand?.pickup_time_slot_start;
	const end = errand?.pickup_time_slot_end;
	const date = errand?.pickup_time_slot_date;

	if (start || end) {
		const startLabel = start
			? new Date(start).toLocaleTimeString([], {
				hour: "numeric",
				minute: "2-digit",
			})
			: "TBD";
		const endLabel = end
			? new Date(end).toLocaleTimeString([], {
				hour: "numeric",
				minute: "2-digit",
			})
			: null;
		return endLabel ? `${startLabel} – ${endLabel}` : startLabel;
	}

	if (date) {
		return new Date(date).toLocaleDateString([], {
			month: "short",
			day: "numeric",
		});
	}

	return "Schedule pending";
};

const getActiveChecklistPreview = (items) => {
	if (!items?.length) return "No extra steps noted yet.";
	if (items.length === 1) return items[0];
	if (items.length === 2) return `${items[0]} • ${items[1]}`;
	return `${items[0]} • ${items[1]} • ${items.length - 2} more`;
};

const getActiveStatusTone = (status) => {
	const key = normalizeStatusKey(status);
	if (["completed", "delivered"].includes(key)) return "done";
	if (["in_progress", "picked_up"].includes(key)) return "live";
	if (["accepted", "assigned"].includes(key)) return "queued";
	return "neutral";
};

const getTrackingStatusLabel = (status) => {
	return normalizeStatusKey(status) === "assigned"
		? "Tracking starts after acceptance"
		: "Live tracking active";
};

const INITIAL_VISIBLE_OPEN_JOBS = 3;
const MAX_ACCEPT_DISTANCE_MILES = 5;
const PILOT_AUTO_REFRESH_INTERVAL_MS = 2 * 60 * 1000;

const normalizePilotDispatchPolicy = (source = {}) => {
	const radiusMiles = Number(source?.open_pool_radius_miles || source?.openPoolRadiusMiles);
	const normalizedRadius = [5, 10, 15, 20].includes(radiusMiles)
		? radiusMiles
		: MAX_ACCEPT_DISTANCE_MILES;
	return {
		showAllJobsToPilots: Boolean(
			source?.show_all_jobs_to_pilots ?? source?.showAllJobsToPilots,
		),
		openPoolRadiusMiles: normalizedRadius,
		allowedOpenPoolRadiusMiles: Array.isArray(
			source?.allowed_open_pool_radius_miles ?? source?.allowedOpenPoolRadiusMiles,
		)
			? source.allowed_open_pool_radius_miles || source.allowedOpenPoolRadiusMiles
			: [5, 10, 15, 20],
	};
};

const buildVisibilityOnlyReason = (reason, dispatchPolicy = null) => {
	const radiusMiles = normalizePilotDispatchPolicy(dispatchPolicy).openPoolRadiusMiles;
	const trimmedReason = String(reason || "").trim();
	if (!trimmedReason) {
		return `Visible for awareness only. Open-pool acceptance is limited to ${radiusMiles} miles and your service area.`;
	}
	return `${trimmedReason}. You can still see this errand, but only pilots inside the ${radiusMiles} mile dispatch radius and matching service area can accept it.`;
};

const getDispatchPolicyRadiusKm = (dispatchPolicy) =>
	normalizePilotDispatchPolicy(dispatchPolicy).openPoolRadiusMiles * 1.60934;

const getErrandDistanceKm = (errand) => {
	if (!errand) return null;
	const distance = Number(errand.distance_km);
	return Number.isFinite(distance) ? distance : null;
};

const getAcceptanceBlockReason = (errand) =>
	errand?.acceptance_block_reason || errand?.acceptanceBlockReason || "";

const matchesDispatchPolicy = (errand) =>
	errand?.matches_dispatch_policy !== false && errand?.matchesDispatchPolicy !== false;

const getAssignedPilotId = (errand) =>
	errand?.pilot_id ||
	errand?.pilotId ||
	errand?.assigned_pilot_id ||
	errand?.assignedPilotId ||
	errand?.assigned_to ||
	errand?.assignedTo ||
	errand?.assigned_pilot ||
	errand?.pilot_assigned_id ||
	null;

const getCurrentPilotId = (user) =>
	user?.pilot_id || user?.pilotId || user?.id || user?.userId || null;

const isDedicatedErrandForPilot = (errand, currentPilotId = null) => {
	const assignedPilotId = getAssignedPilotId(errand);
	if (!assignedPilotId || !currentPilotId) return false;
	return String(assignedPilotId) === String(currentPilotId);
};

const enrichJob = (job) => ({
	...job,
	estimatedEarnings: getPilotEarnings(job),
	pilotEarnings: getPilotEarnings(job),
	estimatedTime: job.distance_km ? Math.ceil(job.distance_km / 40) : 30,
});

const canAcceptErrand = (errand, currentPilotId = null, dispatchPolicy = null) => {
	if (!errand) return false;
	const status = (errand.status || "").toLowerCase();
	if (!["assigned", "approved", "submitted", "pending"].includes(status))
		return false;
	const assignedPilotId = getAssignedPilotId(errand);
	if (
		assignedPilotId &&
		currentPilotId &&
		String(assignedPilotId) !== String(currentPilotId)
	) {
		return false;
	}
	if (isDedicatedErrandForPilot(errand, currentPilotId)) {
		return true;
	}
	if (getAcceptanceBlockReason(errand)) {
		return false;
	}
	const distanceKm = getErrandDistanceKm(errand);
	if (distanceKm === null) return true;
	return distanceKm <= getDispatchPolicyRadiusKm(dispatchPolicy);
};

const getDisableReason = (errand, currentPilotId = null, dispatchPolicy = null) => {
	const assignedPilotId = getAssignedPilotId(errand);
	const status = (errand?.status || "").toLowerCase();
	if (status === "assigned" && !assignedPilotId) {
		return "Awaiting admin assignment confirmation";
	}
	if (
		assignedPilotId &&
		currentPilotId &&
		String(assignedPilotId) !== String(currentPilotId)
	) {
		return "Assigned to another pilot";
	}
	if (isDedicatedErrandForPilot(errand, currentPilotId)) {
		return "";
	}
	const acceptanceBlockReason = getAcceptanceBlockReason(errand);
	if (acceptanceBlockReason) {
		return buildVisibilityOnlyReason(acceptanceBlockReason, dispatchPolicy);
	}
	const distanceKm = getErrandDistanceKm(errand);
	const radiusMiles = normalizePilotDispatchPolicy(dispatchPolicy).openPoolRadiusMiles;
	if (distanceKm > getDispatchPolicyRadiusKm(dispatchPolicy)) {
		return buildVisibilityOnlyReason(
			`Errand is outside the ${radiusMiles} mile radius`,
			dispatchPolicy,
		);
	}
	return "";
};

const LEGACY_PILOT_STARTED_ERRANDS_KEY = "eb_pilot_started_errands_v1";
const DISMISSED_OPEN_ERRANDS_KEY_PREFIX = "eb_pilot_dismissed_open_errands_v1:";

const pilotStartedErrandsKeyFor = (pilotId) =>
	`${LEGACY_PILOT_STARTED_ERRANDS_KEY}:${pilotId ? String(pilotId) : "anon"}`;

const dismissedOpenErrandsKeyFor = (pilotId) =>
	`${DISMISSED_OPEN_ERRANDS_KEY_PREFIX}${pilotId ? String(pilotId) : "anon"}`;

const normalizeStatusKey = (value) => {
	if (!value) return "";
	// Tolerate variants like "in progress" vs "in_progress".
	return String(value)
		.trim()
		.toLowerCase()
		.replace(/[-\s]+/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");
};

const clearLegacyPilotStartedErrands = () => {
	if (typeof window === "undefined") return;
	try {
		window.localStorage?.removeItem(LEGACY_PILOT_STARTED_ERRANDS_KEY);
	} catch {
		// ignore
	}
};

const readPilotStartedErrands = (pilotId) => {
	if (typeof window === "undefined") return new Set();
	try {
		const raw = window.localStorage?.getItem(pilotStartedErrandsKeyFor(pilotId));
		if (!raw) return new Set();
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return new Set();
		return new Set(parsed.map((id) => String(id)));
	} catch {
		return new Set();
	}
};

const readDismissedOpenErrands = (pilotId) => {
	if (typeof window === "undefined") return new Set();
	try {
		const raw = window.localStorage?.getItem(dismissedOpenErrandsKeyFor(pilotId));
		if (!raw) return new Set();
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return new Set();
		return new Set(parsed.map((id) => String(id)));
	} catch {
		return new Set();
	}
};

const writeDismissedOpenErrands = (pilotId, ids) => {
	if (typeof window === "undefined") return;
	try {
		window.localStorage?.setItem(
			dismissedOpenErrandsKeyFor(pilotId),
			JSON.stringify(Array.from(ids)),
		);
	} catch {
		// ignore
	}
};

const hasPilotStartedErrand = (errand, pilotId = null) => {
	if (!errand?.id) return false;
	if (errand?.started) return true;
	if (errand?.started_at || errand?.startedAt) return true;
	const statusKey = normalizeStatusKey(errand?.status);
	// If backend status already reflects progress, it's started.
	if (["picked_up", "in_progress", "delivered", "completed"].includes(statusKey)) {
		return true;
	}
	// Fallback: if tracking was started in this browser session but status didn't refresh yet.
	try {
		return readPilotStartedErrands(pilotId).has(String(errand.id));
	} catch {
		return false;
	}
};

const isErrandAssignedToPilot = (errand, pilotId = null) => {
	const assignedPilotId = getAssignedPilotId(errand);
	if (!assignedPilotId || !pilotId) return false;
	return String(assignedPilotId) === String(pilotId);
};

const isErrandOwnedByPilot = (errand, pilotId = null) => {
	if (!errand) return false;
	if (isErrandAssignedToPilot(errand, pilotId)) return true;
	if (isDedicatedErrandForPilot(errand, pilotId)) return true;
	return String(errand?._acceptedByPilotId || "") === String(pilotId || "");
};

// The /api/v1/pilots/jobs endpoint is already scoped to the current pilot, but
// older backend responses may omit pilot_id fields. Add a lightweight fallback
// so client-side ownership checks don't accidentally hide real active errands.
const ensureErrandOwnedByPilot = (errand, pilotId = null) => {
	if (!errand || !pilotId) return errand;
	const assignedPilotId = getAssignedPilotId(errand);
	const acceptedByPilotId = errand?._acceptedByPilotId || null;
	if (assignedPilotId || acceptedByPilotId) return errand;
	return {
		...errand,
		pilot_id: errand?.pilot_id ?? pilotId,
		pilotId: errand?.pilotId ?? pilotId,
		_acceptedByPilotId: pilotId,
	};
};

const canDeclineErrand = (errand, currentPilotId = null) => {
	if (!errand?.status) return false;
	if (hasPilotStartedErrand(errand, currentPilotId)) return false;

	const statusKey = normalizeStatusKey(errand.status);
	const assignedPilotId = getAssignedPilotId(errand);

	// Open pool (unassigned) errands: allow pilots to locally dismiss before accepting.
	if (!assignedPilotId) {
		return ["assigned", "approved", "submitted", "pending"].includes(statusKey);
	}

	// Assigned errands: only allow server decline when assigned to the current pilot.
	if (!currentPilotId) return false;
	if (String(assignedPilotId) !== String(currentPilotId)) return false;

	return ["assigned", "pending", "submitted"].includes(statusKey);
};

const getDeclineReason = (errand, currentPilotId = null) => {
	if (!errand?.status) return "Status unavailable";
	if (hasPilotStartedErrand(errand, currentPilotId)) {
		return "Cannot decline once the errand has started";
	}

	const assignedPilotId = getAssignedPilotId(errand);
	if (assignedPilotId && currentPilotId && String(assignedPilotId) !== String(currentPilotId)) {
		return "Assigned to another pilot";
	}
	if (!assignedPilotId) {
		return "Hide this errand from your list";
	}
	if (!canDeclineErrand(errand, currentPilotId)) {
		return `Cannot decline once ${String(errand.status).replace(/_/g, " ")}`;
	}
	return "";
};

const PilotJobBoardEnhanced = ({
	apiBaseUrl,
	token,
	onJobAccepted,
	user,
	onAuthError,
	onLogout,
	screenMode = "jobs",
	onSummaryChange,
	pilotDispatchState,
	onDispatchStateChange,
}) => {
	const [availableJobs, setAvailableJobs] = useState([]);
	const [acceptedJob, setAcceptedJob] = useState(null);
	const [activeJobs, setActiveJobs] = useState([]);
	const [completedJobs, setCompletedJobs] = useState([]);
	const [jobsLoading, setJobsLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const [error, setError] = useState(null);
	const [stats, setStats] = useState(() => normalizePilotStats());
	const [nowTime, setNowTime] = useState(() => new Date());
	const [availabilitySubmitting, setAvailabilitySubmitting] = useState(false);
	const [availabilityMessage, setAvailabilityMessage] = useState("");
	const [availabilityHistory, setAvailabilityHistory] = useState([]);
	const [serverDispatchState, setServerDispatchState] = useState(() =>
		normalizePilotDispatchState(user),
	);
	const [serverDispatchPolicy, setServerDispatchPolicy] = useState(() =>
		normalizePilotDispatchPolicy(),
	);
	const currentPilotId = useMemo(() => getCurrentPilotId(user), [user]);
	const [dismissedOpenErrandIds, setDismissedOpenErrandIds] = useState([]);
	const dismissedOpenErrandSet = useMemo(
		() => new Set((dismissedOpenErrandIds || []).map((id) => String(id))),
		[dismissedOpenErrandIds],
	);

	// Filter & Sort State
	const [sortBy, setSortBy] = useState("earnings"); // 'earnings', 'distance', 'rating'
	const [searchLocation, setSearchLocation] = useState("");
	const [minDistance, setMinDistance] = useState(0);
	const [maxDistance, setMaxDistance] = useState(50);
	const [minPay, setMinPay] = useState(0);
	const [showFilters, setShowFilters] = useState(false);
	const [showActiveFilters, setShowActiveFilters] = useState(false);
	const [activeCategory, setActiveCategory] = useState("All");
	const [activeQueueFilter, setActiveQueueFilter] = useState("all");
	const [openJobsExpanded, setOpenJobsExpanded] = useState(false);
	const [lastFetchTime, setLastFetchTime] = useState(null);
	const [archiveExpanded, setArchiveExpanded] = useState(false);
	const [activeBoardRefreshing, setActiveBoardRefreshing] = useState(false);
	const activeJobsSnapshotRef = useRef(new Map());
	const autoOpenedErrandIdRef = useRef(null);

	// Modal State
	const [selectedErrand, setSelectedErrand] = useState(null);
	const [showModal, setShowModal] = useState(false);
	const [modalShowAccept, setModalShowAccept] = useState(true);
	const [acceptWarningTarget, setAcceptWarningTarget] = useState(null);
	const [declineTarget, setDeclineTarget] = useState(null);
	const [helpTarget, setHelpTarget] = useState(null);
	const [helpReason, setHelpReason] = useState("delay");
	const [helpNotes, setHelpNotes] = useState("");
	const [helpSubmitting, setHelpSubmitting] = useState(false);
	const [helpFeedback, setHelpFeedback] = useState("");
	const [helpError, setHelpError] = useState("");
	const [expandedChecklistErrands, setExpandedChecklistErrands] = useState({});

	const authErrorHandler = onAuthError || onLogout;
	const effectiveDispatchState = useMemo(
		() =>
			normalizePilotDispatchState({
				...(user || {}),
				...(serverDispatchState || {}),
				...(pilotDispatchState || {}),
			}),
		[user, serverDispatchState, pilotDispatchState],
	);
	const dispatchAcceptBlockedReason = effectiveDispatchState.canAcceptJobs
		? ""
		: effectiveDispatchState.dispatchBlockReason;
	const effectiveDispatchPolicy = useMemo(
		() => normalizePilotDispatchPolicy(serverDispatchPolicy),
		[serverDispatchPolicy],
	);
	const dispatchPolicyRadiusMiles = effectiveDispatchPolicy.openPoolRadiusMiles;

	const activateAcceptedErrand = useCallback(
		(errand) => {
			if (!errand) return;
			const nextErrand = {
				...errand,
				_acceptedByPilotId: currentPilotId || errand?._acceptedByPilotId || null,
			};
			setAcceptedJob(nextErrand);
			onJobAccepted?.(nextErrand);
		},
		[currentPilotId, onJobAccepted],
	);

	useEffect(() => {
		// Load per-pilot dismissed open errands so “Decline” works pre-accept
		// by hiding an open job locally (without affecting other pilots).
		try {
			setDismissedOpenErrandIds(Array.from(readDismissedOpenErrands(currentPilotId)));
		} catch {
			setDismissedOpenErrandIds([]);
		}
	}, [currentPilotId]);

	useEffect(() => {
		clearLegacyPilotStartedErrands();
	}, [currentPilotId]);

	const dismissOpenErrand = useCallback(
		(errandId) => {
			if (!errandId) return;
			const idStr = String(errandId);
			setDismissedOpenErrandIds((prev) => {
				const next = new Set((Array.isArray(prev) ? prev : []).map((id) => String(id)));
				next.add(idStr);
				writeDismissedOpenErrands(currentPilotId, next);
				return Array.from(next);
			});
			// Optimistically remove it from the current list.
			setAvailableJobs((prev) =>
				(Array.isArray(prev) ? prev : []).filter((job) => String(job?.id) !== idStr),
			);
		},
		[currentPilotId],
	);

	const fetchAvailableJobs = useCallback(async () => {
		try {
			if (!apiBaseUrl) {
				setAvailableJobs([]);
				setError("Pilot API is not configured yet.");
				setJobsLoading(false);
				return;
			}
			if (!token) {
				setAvailableJobs([]);
				setError("Sign in to view available jobs.");
				setJobsLoading(false);
				return;
			}
			setJobsLoading(true);
			const response = await fetch(
				`${apiBaseUrl}/api/v1/pilots/available-jobs`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);
			if (response.status === 204 || response.status === 404) {
				setAvailableJobs([]);
				setLastFetchTime(new Date());
				setError(null);
				return;
			}
			if (response.status === 401) {
				authErrorHandler?.("Session expired. Please sign in again.");
				return;
			}
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json();
			if (data?.dispatch_state) {
				const nextDispatchState = normalizePilotDispatchState(data.dispatch_state);
				setServerDispatchState(nextDispatchState);
				onDispatchStateChange?.(nextDispatchState);
			}
			if (data?.dispatch_policy) {
				setServerDispatchPolicy(normalizePilotDispatchPolicy(data.dispatch_policy));
			}

			// Enrich job data with calculated fields
			const enrichedJobs = (data.errands || []).map(enrichJob);

			setAvailableJobs(enrichedJobs);
			setLastFetchTime(new Date());
			setError(null);
		} catch (err) {
			console.error("Error fetching jobs:", err);
			setError(err.message || "Failed to fetch jobs");
		} finally {
			setJobsLoading(false);
		}
	}, [apiBaseUrl, token, authErrorHandler, onDispatchStateChange]);

	const fetchStats = useCallback(async () => {
		try {
			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/stats`, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});
			if (response.status === 401) {
				authErrorHandler?.("Session expired. Please sign in again.");
				return;
			}
			if (response.ok) {
				const data = await response.json();
				setStats(normalizePilotStats(data));
			}
		} catch (err) {
			console.error("Stats error:", err);
		}
	}, [apiBaseUrl, token, authErrorHandler]);

	const fetchPilotJobs = useCallback(async () => {
		try {
			const [activeResponse, completedResponse] = await Promise.all([
				fetch(`${apiBaseUrl}/api/v1/pilots/jobs?status=active`, {
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				}),
				fetch(`${apiBaseUrl}/api/v1/pilots/jobs?status=completed`, {
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				}),
			]);

			if (activeResponse.status === 401 || completedResponse.status === 401) {
				authErrorHandler?.("Session expired. Please sign in again.");
				return;
			}

			if (activeResponse.ok) {
				const activeData = await activeResponse.json();
				const nextActiveJobs = (activeData.errands || [])
					.map(enrichJob)
					.map((errand) => ensureErrandOwnedByPilot(errand, currentPilotId));

				// If the pilot already has an accepted/in-progress errand (eg. refresh,
				// returning to the app, slow network), automatically open the action view.
				// This prevents the UI from staying on the job board while GPS/tracking
				// appears "stuck".
				if (
					!acceptedJob &&
					(screenMode === "jobs" || screenMode === "active") &&
					!showModal &&
					nextActiveJobs.length
				) {
					const owned = nextActiveJobs.filter((job) =>
						isErrandOwnedByPilot(job, currentPilotId),
					);
					const priority = [
						"in_progress",
						"picked_up",
						"pickup_started",
						"dropoff_started",
						"accepted",
					];
					const candidate =
						priority
							.map((key) =>
								owned.find(
									(job) => normalizeStatusKey(job?.status) === key,
								),
							)
							.find(Boolean) || null;

					if (candidate?.id != null) {
						const candidateId = String(candidate.id);
						// Don't auto-open queued-only assignments unless the pilot explicitly accepts.
						if (normalizeStatusKey(candidate?.status) !== "assigned") {
							if (autoOpenedErrandIdRef.current !== candidateId) {
								autoOpenedErrandIdRef.current = candidateId;
								activateAcceptedErrand(candidate);
							}
						}
					}
				}

				const prev = activeJobsSnapshotRef.current;
				const nextMap = new Map();
				for (const errand of nextActiveJobs) {
					const id = errand?.id != null ? String(errand.id) : "";
					if (!id) continue;
					const statusKey = normalizeStatusKey(errand?.status);
					nextMap.set(id, statusKey);
					if (prev.size && !prev.has(id) && statusKey === "assigned") {
						const ref =
							errand?.reference_number ||
							errand?.referenceNumber ||
							id;
						notify.success(
							`🆕 New errand assigned: ${errand?.title || "Errand"} (${ref})`,
							{ dedupeKey: `pilot-assigned-${id}` },
						);
					}
				}
				activeJobsSnapshotRef.current = nextMap;

				setActiveJobs(nextActiveJobs);
			}

			if (completedResponse.ok) {
				const completedData = await completedResponse.json();
				setCompletedJobs(
					(completedData.errands || [])
						.map(enrichJob)
						.map((errand) => ensureErrandOwnedByPilot(errand, currentPilotId)),
				);
			}
		} catch (err) {
			console.error("Error fetching pilot jobs:", err);
		}
	}, [
		apiBaseUrl,
		token,
		authErrorHandler,
		currentPilotId,
		acceptedJob,
		screenMode,
		showModal,
		activateAcceptedErrand,
	]);

	const fetchAvailabilityHistory = useCallback(async () => {
		try {
			const response = await fetch(
				`${apiBaseUrl}/api/v1/pilots/availability-history`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				},
			);
			if (!response.ok) {
				return;
			}
			const data = await response.json();
			setAvailabilityHistory(Array.isArray(data) ? data : data.events || []);
		} catch (err) {
			console.error("Error loading availability history:", err);
		}
	}, [apiBaseUrl, token]);

	const handleStartErrand = useCallback(
		(errand) => {
			activateAcceptedErrand(errand);
		},
		[activateAcceptedErrand],
	);

	const resetAcceptedErrand = useCallback(() => {
		setAcceptedJob(null);
		onJobAccepted?.(null);
	}, [onJobAccepted]);

	useEffect(() => {
		if (!acceptedJob?._acceptedByPilotId || !currentPilotId) return;
		if (String(acceptedJob._acceptedByPilotId) === String(currentPilotId)) return;
		resetAcceptedErrand();
		setSelectedErrand(null);
		setShowModal(false);
		setDeclineTarget(null);
		setAcceptWarningTarget(null);
	}, [acceptedJob, currentPilotId, resetAcceptedErrand]);

	const handleDeclineErrand = useCallback(
		async (errand) => {
			try {
				if (hasPilotStartedErrand(errand, currentPilotId)) {
					setError("Cannot decline once the errand has started.");
					setDeclineTarget(null);
					return;
				}

				const assignedPilotId = getAssignedPilotId(errand);
				const isOpenPool = !assignedPilotId;
				const isAssignedToMe =
					assignedPilotId &&
					currentPilotId &&
					String(assignedPilotId) === String(currentPilotId);

				if (!canDeclineErrand(errand, currentPilotId)) {
					setError(getDeclineReason(errand, currentPilotId));
					setDeclineTarget(null);
					return;
				}

				// Pre-accept decline: open-pool jobs are not assigned yet, so server decline
				// will 403. Treat Decline as a local dismiss for this pilot.
				if (isOpenPool) {
					dismissOpenErrand(errand.id);
					setDeclineTarget(null);
					if (selectedErrand?.id === errand.id) {
						setShowModal(false);
						setSelectedErrand(null);
					}
					return;
				}

				if (!isAssignedToMe) {
					setError("You can only decline errands assigned to you.");
					setDeclineTarget(null);
					return;
				}

				setActionLoading(true);
				const response = await fetch(
					`${apiBaseUrl}/api/v1/pilots/decline-job`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ errand_id: errand.id }),
					},
				);

				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(data.detail || "Unable to decline errand");
				}

				setAcceptedJob((prev) => (prev?.id === errand.id ? null : prev));
				setDeclineTarget(null);
				await fetchAvailableJobs();
				await fetchPilotJobs();
			} catch (err) {
				setError(err.message || "Unable to decline errand");
			} finally {
				setActionLoading(false);
			}
		},
		[
			apiBaseUrl,
			token,
			currentPilotId,
			dismissOpenErrand,
			fetchAvailableJobs,
			fetchPilotJobs,
			selectedErrand,
		],
	);

	const closeAcceptWarning = useCallback(() => {
		setAcceptWarningTarget(null);
	}, []);

	useEffect(() => {
		fetchAvailableJobs();
		fetchStats();
		fetchPilotJobs();
		fetchAvailabilityHistory();

		const interval = setInterval(() => {
			fetchAvailableJobs();
			fetchStats();
			fetchPilotJobs();
			fetchAvailabilityHistory();
		}, PILOT_AUTO_REFRESH_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [
		fetchAvailableJobs,
		fetchStats,
		fetchPilotJobs,
		fetchAvailabilityHistory,
	]);

	useEffect(() => {
		const interval = setInterval(() => setNowTime(new Date()), 30000);
		return () => clearInterval(interval);
	}, []);

	// Memoized filtered and sorted jobs
	const { openJobs, privateAssignedJobs } = useMemo(() => {
		const assignedToPilot = [];
		const openPool = [];
		availableJobs.forEach((job) => {
			const assignedPilotId = getAssignedPilotId(job);
			if (
				assignedPilotId &&
				currentPilotId &&
				String(assignedPilotId) === String(currentPilotId)
			) {
				assignedToPilot.push(job);
				return;
			}
			if (assignedPilotId) {
				return;
			}
			if (dismissedOpenErrandSet.has(String(job?.id))) {
				return;
			}
			openPool.push(job);
		});
		return { openJobs: openPool, privateAssignedJobs: assignedToPilot };
	}, [availableJobs, currentPilotId, dismissedOpenErrandSet]);

	const filteredAndSortedJobs = useMemo(() => {
		let jobs = [...openJobs];

		if (activeCategory !== "All") {
			jobs = jobs.filter((job) => getJobCategory(job) === activeCategory);
		}

		// Search filter
		if (searchLocation.trim()) {
			const search = searchLocation.toLowerCase();
			jobs = jobs.filter(
				(job) =>
					job.pickup_location?.toLowerCase().includes(search) ||
					job.dropoff_location?.toLowerCase().includes(search) ||
					job.delivery_location?.toLowerCase().includes(search) ||
					job.title?.toLowerCase().includes(search),
			);
		}

		// Distance filter
		jobs = jobs.filter((job) => {
			const distance = job.distance_km || 0;
			return distance >= minDistance && distance <= maxDistance;
		});

		// Pay filter
		jobs = jobs.filter(
			(job) => (job.pilotEarnings || getPilotEarnings(job)) >= minPay,
		);

		// Sorting
		jobs.sort((a, b) => {
			switch (sortBy) {
				case "earnings":
					return (
						(b.pilotEarnings || getPilotEarnings(b.amount)) -
						(a.pilotEarnings || getPilotEarnings(a.amount))
					);
				case "distance":
					return (a.distance_km || 0) - (b.distance_km || 0); // Closest first
				case "rating":
					return (b.customer_rating || 0) - (a.customer_rating || 0); // Highest rated first
				default:
					return 0;
			}
		});

		return jobs;
	}, [
		openJobs,
		activeCategory,
		searchLocation,
		minDistance,
		maxDistance,
		minPay,
		sortBy,
	]);

	const activeErrands = useMemo(() => {
		if (activeJobs.length > 0) return activeJobs;
		return acceptedJob ? [acceptedJob] : [];
	}, [activeJobs, acceptedJob]);

	const filteredActiveErrands = useMemo(() => {
		if (activeQueueFilter === "all") return activeErrands;
		return activeErrands.filter((job) => {
			const statusKey = normalizeStatusKey(job?.status);
			if (activeQueueFilter === "queued") {
				return ["accepted", "assigned", "pending", "submitted"].includes(statusKey);
			}
			if (activeQueueFilter === "live") {
				return ["picked_up", "in_progress", "delivered"].includes(statusKey);
			}
			return true;
		});
	}, [activeErrands, activeQueueFilter]);

	const hasBlockingActiveErrand = useCallback(
		(errandId) =>
			activeErrands.some((job) => {
				if (!job?.id) return false;
				if (String(job.id) === String(errandId)) return false;
				if (!isErrandOwnedByPilot(job, currentPilotId)) return false;
				return normalizeStatusKey(job.status) !== "assigned";
			}),
		[activeErrands, currentPilotId],
	);

	const openAcceptWarning = useCallback(
		(errand) => {
			if (!errand?.id) return;
			const acceptMode =
				normalizeStatusKey(errand?.status) === "assigned" || getAssignedPilotId(errand)
					? "assigned"
					: "available";
			if (acceptMode === "assigned" && hasBlockingActiveErrand(errand.id)) {
				setError("Complete your current active errand before accepting another one.");
				return;
			}
			if (dispatchAcceptBlockedReason) {
				setError(dispatchAcceptBlockedReason);
				return;
			}
			const acceptPolicyReason = getDisableReason(
				errand,
				currentPilotId,
				effectiveDispatchPolicy,
			);
			if (acceptPolicyReason) {
				setError(acceptPolicyReason);
				return;
			}
			setAcceptWarningTarget({
				errand,
				acceptMode,
			});
		},
		[
			currentPilotId,
			dispatchAcceptBlockedReason,
			effectiveDispatchPolicy,
			hasBlockingActiveErrand,
		],
	);

	const futureJob = useMemo(() => {
		const assignedJobs = activeErrands.filter(
			(job) => (job.status || "").toLowerCase() === "assigned",
		);
		if (!assignedJobs.length) return null;
		return assignedJobs.sort((a, b) => {
			const aTime = a.pickup_time_slot_start
				? new Date(a.pickup_time_slot_start).getTime()
				: 0;
			const bTime = b.pickup_time_slot_start
				? new Date(b.pickup_time_slot_start).getTime()
				: 0;
			return aTime - bTime;
		})[0];
	}, [activeErrands]);

	const futureJobCountdown = useMemo(() => {
		if (!futureJob?.pickup_time_slot_start) return null;
		const start = new Date(futureJob.pickup_time_slot_start);
		const diffMs = start - nowTime;
		const totalMinutes = Math.round(diffMs / 60000);
		return {
			minutes: totalMinutes,
			hours: Math.floor(totalMinutes / 60),
			remainderMinutes: Math.abs(totalMinutes % 60),
		};
	}, [futureJob?.pickup_time_slot_start, nowTime]);

	const isAvailabilityWindow =
		futureJobCountdown &&
		futureJobCountdown.minutes <= 60 &&
		futureJobCountdown.minutes > 0;

	const countdownLabel = useMemo(() => {
		if (!futureJobCountdown) return "Pickup window pending";
		if (futureJobCountdown.minutes <= 0) return "Start time now";
		if (futureJobCountdown.hours > 0) {
			return `${futureJobCountdown.hours}h ${futureJobCountdown.remainderMinutes}m`;
		}
		return `${futureJobCountdown.minutes}m`;
	}, [futureJobCountdown]);

	const handleAvailabilityResponse = useCallback(
		async (responseValue, targetErrandId, tokenParams = {}) => {
			if (!targetErrandId) return;
			setAvailabilitySubmitting(true);
			setAvailabilityMessage("");
			try {
				const params = new URLSearchParams({
					errand_id: targetErrandId,
					response: responseValue,
				});
				if (tokenParams?.pilotId) params.set("pilot_id", tokenParams.pilotId);
				if (tokenParams?.expires) params.set("expires", tokenParams.expires);
				if (tokenParams?.token) params.set("token", tokenParams.token);
				const response = await fetch(
					`${apiBaseUrl}/api/v1/pilots/availability-response?${params.toString()}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
					},
				);
				const data = await response.json().catch(() => ({}));
				if (!response.ok) {
					throw new Error(data.detail || "Unable to submit response");
				}
				setAvailabilityMessage(
					responseValue === "yes"
						? "✅ Availability confirmed. Thank you!"
						: "⚠️ Job released back to the queue.",
				);
				fetchAvailableJobs();
				fetchPilotJobs();
				fetchAvailabilityHistory();
			} catch (err) {
				setAvailabilityMessage(err.message || "Unable to submit response");
			} finally {
				setAvailabilitySubmitting(false);
			}
		},
		[
			apiBaseUrl,
			fetchAvailableJobs,
			fetchPilotJobs,
			fetchAvailabilityHistory,
			token,
		],
	);

	const openErrandHelp = useCallback((errand, presetReason = "delay") => {
		setHelpTarget(errand);
		setHelpReason(presetReason);
		setHelpNotes("");
		setHelpFeedback("");
		setHelpError("");
	}, []);

	const closeErrandHelp = useCallback(() => {
		setHelpTarget(null);
		setHelpReason("delay");
		setHelpNotes("");
		setHelpFeedback("");
		setHelpError("");
	}, []);

	const openAdminMail = useCallback((errand, subjectPrefix, bodyIntro) => {
		if (typeof window === "undefined") return;
		const subject = `${subjectPrefix}: ${errand?.title || "Errand request"} (${errand?.reference_number || `#${errand?.id}`})`;
		const body = [
			bodyIntro,
			"",
			`Errand: ${errand?.title || "Errand request"}`,
			`Reference: ${errand?.reference_number || `#${errand?.id}`}`,
			`Pickup: ${errand?.pickup_location || "Pending"}`,
			`Drop-off: ${formatEndingLocation(errand)}`,
			"",
			"Pilot summary:",
		].join("\n");
		window.location.href = `mailto:support@errandbridge.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	}, []);

	const handleHelpIncidentSubmit = useCallback(async () => {
		if (!helpTarget?.id) return;
		if (!helpNotes.trim()) {
			setHelpError("Please describe the issue before sending it to ErrandBridge Support.");
			return;
		}

		setHelpSubmitting(true);
		setHelpError("");
		setHelpFeedback("");

		try {
			const response = await fetch(`${apiBaseUrl}/api/v1/incidents/report`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					errand_id: helpTarget.id,
					incident_type: helpReason,
					description: helpNotes.trim(),
				}),
			});

			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(data.detail || "Unable to report issue");
			}

			setHelpFeedback(
				`Issue reported${data.incident_id ? ` (#${data.incident_id})` : ""}. ErrandBridge Support has been notified.`,
			);
			setHelpNotes("");
			window.setTimeout(() => {
				closeErrandHelp();
			}, 250);
			Promise.allSettled([fetchPilotJobs(), fetchAvailableJobs()]);
		} catch (err) {
			setHelpError(err.message || "Unable to report issue");
		} finally {
			setHelpSubmitting(false);
		}
	}, [
		apiBaseUrl,
		closeErrandHelp,
		token,
		helpTarget,
		helpReason,
		helpNotes,
		fetchPilotJobs,
		fetchAvailableJobs,
	]);

	const handlePauseFutureJobsRequest = useCallback(
		(errand) => {
			openAdminMail(
				errand,
				"Pilot availability pause request",
				"Hello ErrandBridge Support, please pause future job offers for me while I resolve a current errand issue.",
			);
		},
		[openAdminMail],
	);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const responseValue = params.get("availability");
		const errandId = params.get("errandId");
		if (!responseValue || !errandId) return;
		handleAvailabilityResponse(responseValue, errandId, {
			pilotId: params.get("pilotId") || undefined,
			expires: params.get("expires") || undefined,
			token: params.get("token") || undefined,
		});
		params.delete("availability");
		params.delete("errandId");
		params.delete("pilotId");
		params.delete("expires");
		params.delete("token");
		const newQuery = params.toString();
		const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ""}`;
		window.history.replaceState({}, document.title, newUrl);
	}, [handleAvailabilityResponse]);

	const visibleArchivedJobs = useMemo(() => {
		return archiveExpanded ? completedJobs : [];
	}, [archiveExpanded, completedJobs]);

	const archiveContentId = useMemo(
		() => `pilot-completed-archive-${screenMode}`,
		[screenMode],
	);

	const handleArchiveToggle = useCallback((event) => {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		setArchiveExpanded((prev) => !prev);
	}, []);

	const handleChecklistToggle = useCallback((errandId) => {
		if (!errandId) return;
		setExpandedChecklistErrands((prev) => ({
			...prev,
			[errandId]: !prev?.[errandId],
		}));
	}, []);

	const todayEarnings = useMemo(() => {
		const todayKey = new Date().toDateString();
		return completedJobs.reduce((sum, job) => {
			if (!job?.completed_at) return sum;
			return new Date(job.completed_at).toDateString() === todayKey
				? sum + getPilotEarnings(job)
				: sum;
		}, 0);
	}, [completedJobs]);

	const weeklyEarnings = useMemo(() => {
		const now = Date.now();
		const sevenDays = 7 * 24 * 60 * 60 * 1000;
		return completedJobs.reduce((sum, job) => {
			if (!job?.completed_at) return sum;
			const completedAt = new Date(job.completed_at).getTime();
			return now - completedAt <= sevenDays ? sum + getPilotEarnings(job) : sum;
		}, 0);
	}, [completedJobs]);

	const matchingJobsCount = useMemo(
		() => filteredAndSortedJobs.filter((job) => matchesDispatchPolicy(job)).length,
		[filteredAndSortedJobs],
	);

	useEffect(() => {
		onSummaryChange?.({
			availableCount: openJobs.length,
			matchingCount: matchingJobsCount,
			activeCount: activeErrands.length,
			completedCount: completedJobs.length,
			availabilityEvents: availabilityHistory.length,
		});
	}, [
		onSummaryChange,
		openJobs.length,
		matchingJobsCount,
		activeErrands.length,
		completedJobs.length,
		availabilityHistory.length,
	]);

	const formatStatusLabel = (status) => {
		if (!status) return "In Progress";
		const key = String(status).trim().toLowerCase();
		const map = {
			accepted: "Accepted",
			picked_up: "Errand Started",
			in_progress: "In Progress",
			delivered: "Delivered",
			completed: "Completed",
		};
		if (map[key]) return map[key];
		return String(status)
			.replace(/_/g, " ")
			.replace(/\b\w/g, (char) => char.toUpperCase());
	};

	const handleAcceptJob = useCallback(
		async (errandId) => {
			try {
				const selectedJob = availableJobs.find((job) => job.id === errandId);
				if (!selectedJob) {
					setError(
						"Unable to locate this errand. Please refresh and try again.",
					);
					return;
				}
				const assignedPilotId = getAssignedPilotId(selectedJob);
				if (
					assignedPilotId &&
					currentPilotId &&
					String(assignedPilotId) !== String(currentPilotId)
				) {
					setError("This errand is assigned to another pilot.");
					return;
				}
				const acceptPolicyReason = getDisableReason(
					selectedJob,
					currentPilotId,
					effectiveDispatchPolicy,
				);
				if (!canAcceptErrand(selectedJob, currentPilotId, effectiveDispatchPolicy)) {
					setError(
						acceptPolicyReason ||
							"Unable to accept this errand. Please try again later.",
					);
					return;
				}
				if (dispatchAcceptBlockedReason) {
					setError(dispatchAcceptBlockedReason);
					return;
				}

				setActionLoading(true);
				const response = await fetch(`${apiBaseUrl}/api/v1/pilots/accept-job`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ errand_id: errandId }),
				});
				if (response.ok) {
					const data = await response.json();
					activateAcceptedErrand(data.errand || data);
					// Refresh jobs after accepting
					fetchAvailableJobs();
					fetchPilotJobs();
				} else {
					const data = await response.json().catch(() => ({}));
					setError(
						data.detail ||
						(data.message ? String(data.message) : "Failed to accept job"),
					);
				}
			} catch (err) {
				setError(`Error: ${err.message}`);
			} finally {
				setActionLoading(false);
			}
		},
		[
			activateAcceptedErrand,
			apiBaseUrl,
			currentPilotId,
			effectiveDispatchPolicy,
			fetchAvailableJobs,
			fetchPilotJobs,
			token,
			availableJobs,
			dispatchAcceptBlockedReason,
		],
	);

	const handleAcceptAssignedErrand = useCallback(
		async (errand) => {
			if (!errand?.id) return;
			if (hasBlockingActiveErrand(errand.id)) {
				setError("Complete your current active errand before accepting another one.");
				return;
			}
			if (dispatchAcceptBlockedReason) {
				setError(dispatchAcceptBlockedReason);
				return;
			}
			try {
				setActionLoading(true);
				const response = await fetch(`${apiBaseUrl}/api/v1/pilots/accept-job`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ errand_id: errand.id }),
				});

				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					if (response.status === 403) {
						throw new Error(
							data.detail ||
							"You are not allowed to accept this errand.",
						);
					}
					throw new Error(data.detail || "Failed to accept errand");
				}

				const data = await response.json().catch(() => ({}));
				activateAcceptedErrand(data.errand || data);
				await fetchAvailableJobs();
				await fetchPilotJobs();
			} catch (err) {
				setError(err.message || "Unable to accept assigned errand");
			} finally {
				setActionLoading(false);
			}
		},
		[
			activateAcceptedErrand,
			apiBaseUrl,
			token,
			fetchAvailableJobs,
			fetchPilotJobs,
			hasBlockingActiveErrand,
			dispatchAcceptBlockedReason,
		],
	);

	const handleConfirmAcceptWarning = useCallback(async () => {
		if (!acceptWarningTarget?.errand) return;
		const target = acceptWarningTarget;
		setAcceptWarningTarget(null);
		if (target.acceptMode === "assigned") {
			await handleAcceptAssignedErrand(target.errand);
			return;
		}
		await handleAcceptJob(target.errand.id);
	}, [acceptWarningTarget, handleAcceptAssignedErrand, handleAcceptJob]);

	const resetFilters = useCallback(() => {
		setSearchLocation("");
		setMinDistance(0);
		setMaxDistance(50);
		setMinPay(0);
		setSortBy("earnings");
		setActiveCategory("All");
	}, []);

	const hasActiveSearch = searchLocation.trim().length > 0;
	const hasActiveDistanceFilter = minDistance !== 0 || maxDistance !== 50;
	const hasActivePayFilter = minPay > 0;
	const hasActiveCategoryFilter = activeCategory !== "All";
	const hasActiveSort = sortBy !== "earnings";
	const hasActiveFilters =
		hasActiveSearch ||
		hasActiveDistanceFilter ||
		hasActivePayFilter ||
		hasActiveCategoryFilter ||
		hasActiveSort;
	const activeFilterCount = [
		hasActiveSearch,
		hasActiveDistanceFilter,
		hasActivePayFilter,
		hasActiveCategoryFilter,
		hasActiveSort,
	].filter(Boolean).length;
	const searchQuery = searchLocation.trim();
	const filteredJobsCount = filteredAndSortedJobs.length;
	const searchQueryLabel =
		searchQuery.length > 32 ? `${searchQuery.slice(0, 32)}…` : searchQuery;
	const resultsSummaryCopy = hasActiveSearch
		? `Showing ${filteredJobsCount} result${filteredJobsCount === 1 ? "" : "s"} for “${searchQueryLabel}”`
		: hasActiveCategoryFilter
			? `Showing ${filteredJobsCount} ${activeCategory.toLowerCase()} errand${filteredJobsCount === 1 ? "" : "s"}`
			: `Showing ${filteredJobsCount} of ${openJobs.length} available ${openJobs.length === 1 ? "errand" : "errands"}`;
	const shouldCollapseOpenJobs =
		!jobsLoading &&
		filteredAndSortedJobs.length > INITIAL_VISIBLE_OPEN_JOBS &&
		!openJobsExpanded;
	const visibleOpenJobs = shouldCollapseOpenJobs
		? filteredAndSortedJobs.slice(0, INITIAL_VISIBLE_OPEN_JOBS)
		: filteredAndSortedJobs;
	const hiddenOpenJobsCount = Math.max(
		filteredAndSortedJobs.length - visibleOpenJobs.length,
		0,
	);

	const getTimeAgo = (date) => {
		if (!date) return "Just now";
		const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
		if (seconds < 60) return "Just now";
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		return `${Math.floor(seconds / 3600)}h ago`;
	};

	const renderHelpSheet = () => {
		if (!helpTarget) return null;
		const helpReasonLabelId = `pilot-help-reason-label-${helpTarget?.id || "active"}`;

		return (
			<div className="pilot-help-sheet-overlay">
				<button
					type="button"
					className="pilot-help-sheet-backdrop"
					onClick={closeErrandHelp}
					aria-label="Close errand help"
				/>
				<div className="pilot-help-sheet" role="dialog" aria-modal="true" aria-label="Errand help and support">
					<div className="pilot-help-sheet__handle" />
					<button
						type="button"
						className="pilot-help-sheet__close"
						onClick={closeErrandHelp}
						aria-label="Close help"
					>
						✕
					</button>

					<div className="pilot-help-sheet__header">
						<p className="pilot-help-sheet__eyebrow">Managed exception flow</p>
						<h3>Need help with this errand?</h3>
						<p className="pilot-help-sheet__subtitle">
							{helpTarget?.title || "Errand"} • {helpTarget?.reference_number || `#${helpTarget?.id}`}
						</p>
					</div>

					<div className="pilot-help-sheet__content">
						<p className="pilot-help-sheet__hint">
							Admin reviews this immediately and can release the errand back to dispatch for reassignment.
						</p>

						<div className="pilot-help-sheet__group">
							<p id={helpReasonLabelId} className="pilot-help-sheet__group-label">
								Issue type
							</p>
							<div
								className="pilot-help-reason-chips"
								role="group"
								aria-labelledby={helpReasonLabelId}
							>
								{HELP_REASON_OPTIONS.map((option) => (
									<button
										key={option.value}
										type="button"
										className={`pilot-help-reason-chip ${
											helpReason === option.value
												? "pilot-help-reason-chip--active"
												: ""
										}`}
										onClick={() => setHelpReason(option.value)}
										aria-pressed={helpReason === option.value}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>

						<div className="pilot-help-sheet__group">
							<label htmlFor="pilot-help-notes">Tell admin what happened</label>
							<textarea
								id="pilot-help-notes"
								rows={4}
								placeholder="Describe the issue so dispatch/admin can help with reassignment, support, or escalation."
								value={helpNotes}
								onChange={(event) => setHelpNotes(event.target.value)}
							/>
						</div>

						{helpError && <p className="pilot-help-sheet__error">⚠️ {helpError}</p>}
						{helpFeedback && <p className="pilot-help-sheet__success">✅ {helpFeedback}</p>}

						<div className="pilot-help-sheet__actions">
							<button
								type="button"
								className="btn-report-issue"
								onClick={handleHelpIncidentSubmit}
								disabled={helpSubmitting}
							>
								{helpSubmitting ? "Sending…" : "⚠️ Report issue"}
							</button>
							<button
								type="button"
								className="pilot-help-sheet__secondary"
								onClick={() =>
									openAdminMail(
										helpTarget,
										"Pilot support request",
										"Hello ErrandBridge Support, I need help with an accepted errand.",
									)
								}
							>
								📧 Contact admin
							</button>
							<button
								type="button"
								className="pilot-help-sheet__secondary"
								onClick={() => handlePauseFutureJobsRequest(helpTarget)}
							>
								🚫 Mark unavailable for future jobs
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	};

	const renderAcceptWarning = () => {
		if (!acceptWarningTarget?.errand) return null;
		const errand = acceptWarningTarget.errand;
		const payout = formatPilotPotentialPayout(errand);
		const routeLabel = formatRouteLabel(errand);
		const isAssigned = acceptWarningTarget.acceptMode === "assigned";

		return (
			<div className="accept-warning-overlay">
				<button
					type="button"
					className="accept-warning-backdrop"
					onClick={closeAcceptWarning}
					aria-label="Close acceptance warning"
				/>
				<div
					className="accept-warning-sheet"
					role="dialog"
					aria-modal="true"
					aria-label="Acceptance warning"
				>
					<div className="accept-warning-sheet__handle" />
					<p className="accept-warning-sheet__eyebrow">Cancellation warning</p>
					<h3>Accept this errand only if you can finish it</h3>
					<p className="accept-warning-sheet__intro">
						Once you accept <strong>{errand.title || "this errand"}</strong>, dispatch treats it as a committed job.
					</p>

					<div className="accept-warning-sheet__summary">
						<p><span>Route</span>{routeLabel}</p>
						<p><span>Payout</span>{payout}</p>
						<p><span>Reference</span>{errand.reference_number || `#${errand.id}`}</p>
					</div>

					<div className="accept-warning-sheet__alert" role="note" aria-label="Cancellation penalty details">
						<p className="accept-warning-sheet__alert-title">If you cancel after accepting:</p>
						<ul>
							<li>Your reliability score can be reduced.</li>
							<li>You may lose priority for the next available errands.</li>
							<li>Repeat cancellations can trigger admin review and temporary dispatch restrictions.</li>
						</ul>
					</div>

					<p className="accept-warning-sheet__footnote">
						{isAssigned
							? "This errand is already reserved for you, so accepting means you are confirming you’re available now."
							: `Only continue if you’re ready to head to pickup and complete the errand without dropping it back into the queue. Open-pool acceptance is limited to ${dispatchPolicyRadiusMiles} miles.`}
					</p>

					<div className="accept-warning-sheet__actions">
						<button
							type="button"
							className="accept-warning-sheet__secondary"
							onClick={closeAcceptWarning}
						>
							Go back
						</button>
						<button
							type="button"
							className="accept-warning-sheet__primary"
							onClick={handleConfirmAcceptWarning}
							disabled={actionLoading}
						>
							{actionLoading ? "Accepting…" : "I understand, accept errand"}
						</button>
					</div>
				</div>
			</div>
		);
	};

	const renderBoardHeader = (title, subtitle) => (
		<div className="board-header">
			<div className="header-content">
				<h2>{title}</h2>
				<p className="refresh-info">{subtitle}</p>
			</div>
			<div className="header-actions">
				<button
					type="button"
					className="btn-refresh"
					onClick={fetchAvailableJobs}
					disabled={jobsLoading}
					title="Refresh jobs"
					aria-label={jobsLoading ? "Loading jobs" : "Refresh jobs"}
				>
					<span className="btn-icon" aria-hidden="true">
						{jobsLoading ? "⏳" : "🔄"}
					</span>
					<span className="btn-label">
						{jobsLoading ? "Loading..." : "Refresh"}
					</span>
				</button>
				<button
					type="button"
					className={`btn-filters ${showFilters ? "active" : ""}`}
					onClick={() => setShowFilters(!showFilters)}
					title="Toggle filters"
					aria-label="Toggle filters"
				>
					<span className="btn-icon" aria-hidden="true">
						🎚️
					</span>
					<span className="btn-label">Filters</span>
				</button>
			</div>
		</div>
	);

	const handleRefreshActiveBoard = useCallback(async () => {
		setActiveBoardRefreshing(true);
		try {
			await Promise.allSettled([
				fetchAvailableJobs(),
				fetchPilotJobs(),
				fetchAvailabilityHistory(),
				fetchStats(),
			]);
		} finally {
			setActiveBoardRefreshing(false);
		}
	}, [
		fetchAvailabilityHistory,
		fetchAvailableJobs,
		fetchPilotJobs,
		fetchStats,
	]);

	const renderActiveBoardHeader = () => {
		const activeCountLabel = `${filteredActiveErrands.length} active right now`;
		const activeFilterCount = activeQueueFilter === "all" ? 0 : 1;

		return (
			<section className="active-board-header" aria-label="Active errands controls">
				<div className="active-board-header__headline">
					<h2>Active errands</h2>
					<div className="active-board-header__utility-row">
						<p className="active-board-header__count">{activeCountLabel}</p>
						<div className="active-board-header__actions">
							<button
								type="button"
								className="btn-refresh btn-refresh--compact"
								onClick={handleRefreshActiveBoard}
								disabled={activeBoardRefreshing}
								aria-label={activeBoardRefreshing ? "Refreshing active errands" : "Refresh active errands"}
								title="Refresh active errands"
							>
								<span className="btn-icon" aria-hidden="true">
									{activeBoardRefreshing ? "⏳" : "🔄"}
								</span>
								<span className="btn-label">
									{activeBoardRefreshing ? "Refreshing" : "Refresh"}
								</span>
							</button>
							<button
								type="button"
								className={`btn-filters btn-filters--compact ${showActiveFilters ? "active" : ""}`}
								onClick={() => setShowActiveFilters((prev) => !prev)}
								aria-expanded={showActiveFilters}
								aria-controls="pilot-active-filters"
								aria-label={showActiveFilters ? "Close active filters" : "Open active filters"}
								title={showActiveFilters ? "Close active filters" : "Open active filters"}
							>
								<span className="btn-icon" aria-hidden="true">🎚️</span>
								<span className="btn-label">Filters</span>
								{activeFilterCount > 0 ? (
									<span className="btn-count">{activeFilterCount}</span>
								) : null}
							</button>
						</div>
					</div>
				</div>
				{showActiveFilters ? (
					<div
						id="pilot-active-filters"
						className="active-board-header__filters"
						role="group"
						aria-label="Active errand filters"
					>
						{ACTIVE_QUEUE_FILTER_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								className={`active-board-header__filter-chip ${
									activeQueueFilter === option.value
										? "active-board-header__filter-chip--active"
										: ""
								}`}
								onClick={() => setActiveQueueFilter(option.value)}
								aria-pressed={activeQueueFilter === option.value}
							>
								{option.label}
							</button>
						))}
					</div>
				) : null}
			</section>
		);
	};

	const renderJobsControlCard = () => (
		<section className="jobs-control-card" aria-label="Job search and filters">
			<div className="jobs-control-card__header">
				<div className="jobs-control-card__copy">
					<div className="jobs-control-card__title-row">
						<p className="jobs-control-card__eyebrow">Jobs</p>
					</div>
					<h2>Available errands</h2>
				</div>
				<span className="jobs-control-card__stamp">
					Updated {getTimeAgo(lastFetchTime)}
				</span>
			</div>

			<div className="jobs-dispatch-banner" aria-live="polite">
				<div>
					<p className="jobs-dispatch-banner__label">Dispatch status</p>
					<p className="jobs-dispatch-banner__value">
						{effectiveDispatchState.adminDispatchStatus === ADMIN_DISPATCH_ENABLED
							? getPilotAvailabilityLabel(effectiveDispatchState.availability)
							: getAdminDispatchLabel(effectiveDispatchState.adminDispatchStatus)}
					</p>
				</div>
				<p className="jobs-dispatch-banner__copy">
					{dispatchAcceptBlockedReason || "You can accept new errands right now."}
				</p>
			</div>

			<div className={`jobs-search-shell ${hasActiveSearch ? "jobs-search-shell--active" : ""}`}>
				<label className="jobs-search-shell__label" htmlFor="pilot-search-location">
					Search errands
				</label>
				<div className="jobs-search-shell__field">
					<span className="jobs-search-shell__icon" aria-hidden="true">
						🔎
					</span>
					<input
						id="pilot-search-location"
						type="text"
						inputMode="search"
						placeholder="Search pickup, ending location, or errand title"
						value={searchLocation}
						onChange={(e) => setSearchLocation(e.target.value)}
						className="jobs-search-shell__input"
					/>
					{hasActiveSearch && (
						<button
							type="button"
							className="jobs-search-shell__clear"
							onClick={() => setSearchLocation("")}
							aria-label="Clear search"
						>
							✕
						</button>
					)}
				</div>
			</div>

			<div className="pilot-category-chips jobs-control-card__chips" role="tablist" aria-label="Errand categories">
				{JOB_CATEGORY_ORDER.map((item) => (
					<button
						key={item}
						type="button"
						className={`pilot-category-chips__item ${activeCategory === item ? "pilot-category-chips__item--active" : ""}`}
						onClick={() => setActiveCategory(item)}
						aria-pressed={activeCategory === item}
					>
						{item}
					</button>
				))}
			</div>

			<div className="jobs-summary-strip" aria-label="Jobs summary">
				<div className="jobs-summary-pill">
					<span className="jobs-summary-pill__label">Matching</span>
					<strong>{filteredAndSortedJobs.length}</strong>
					<span className="jobs-summary-pill__meta">open pool</span>
				</div>

				<div className="jobs-summary-pill">
					<span className="jobs-summary-pill__label">Assigned</span>
					<strong>{privateAssignedJobs.length}</strong>
					<span className="jobs-summary-pill__meta">reserved for you</span>
				</div>

				<div className="jobs-summary-pill">
					<span className="jobs-summary-pill__label">Today earnings</span>
					<strong>₦{todayEarnings.toLocaleString()}</strong>
					<span className="jobs-summary-pill__meta">
						{stats.completedToday || 0} completed errands
					</span>
				</div>

				<div className="jobs-summary-pill">
					<span className="jobs-summary-pill__label">Trust score</span>
					<strong>⭐ {Number.isFinite(Number(stats.rating)) ? Number(stats.rating).toFixed(1) : "4.8"}</strong>
					<span className="jobs-summary-pill__meta">pilot trust score</span>
				</div>
			</div>

			<div className="jobs-control-card__status-row jobs-control-card__status-row--polished">
				<p className="jobs-control-card__results-copy">{resultsSummaryCopy}</p>
				{hasActiveFilters && (
					<button
						type="button"
						className="btn-reset-filters btn-reset-filters--inline"
						onClick={resetFilters}
					>
						Reset all
					</button>
				)}
			</div>

			<div className="jobs-control-card__toolbar" aria-label="Jobs actions">
				<div className="jobs-control-card__toolbar-copy">
					<p className="jobs-control-card__toolbar-label">Jobs actions</p>
					<p className="jobs-control-card__toolbar-hint">
						Refresh the list or fine-tune what shows up below.
					</p>
				</div>
				<div className="jobs-control-card__actions jobs-control-card__actions--row">
					<button
						type="button"
						className="btn-refresh btn-refresh--jobs"
						onClick={fetchAvailableJobs}
						disabled={jobsLoading}
						title="Refresh jobs"
						aria-label={jobsLoading ? "Loading jobs" : "Refresh jobs"}
					>
						<span className="btn-icon" aria-hidden="true">
							{jobsLoading ? "⏳" : "🔄"}
						</span>
						<span className="btn-label">
							{jobsLoading ? "Loading..." : "Refresh"}
						</span>
					</button>
					<button
						type="button"
						className={`btn-filters btn-filters--jobs ${showFilters ? "active" : ""}`}
						onClick={() => setShowFilters((prev) => !prev)}
						aria-expanded={showFilters}
						aria-controls="pilot-jobs-advanced-filters"
						aria-label={showFilters ? "Close filters" : "Open filters"}
						title={showFilters ? "Close filters" : "Open filters"}
					>
						<span className="btn-icon" aria-hidden="true">
							🎚️
						</span>
						<span className="btn-label">{showFilters ? "Close filters" : "Filters"}</span>
						{activeFilterCount > 0 && (
							<span className="btn-count">{activeFilterCount}</span>
						)}
					</button>
				</div>
			</div>

			<div
				id="pilot-jobs-advanced-filters"
				className={`jobs-advanced-filters ${showFilters ? "jobs-advanced-filters--open" : ""}`}
			>
				<div className="jobs-advanced-filters__grid">
					<div className="filter-group filter-group--jobs">
						<label htmlFor="pilot-sort-by">Sort by</label>
						<select
							id="pilot-sort-by"
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value)}
							className="filter-select"
						>
							<option value="earnings">Highest earnings</option>
							<option value="distance">Closest first</option>
							<option value="rating">Best rated</option>
						</select>
					</div>

					<div className="filter-group filter-group--jobs">
						<label htmlFor="pilot-distance-range">
							Distance cap: {minDistance}-{maxDistance} km
						</label>
						<input
							id="pilot-distance-range"
							type="range"
							min="0"
							max="100"
							value={maxDistance}
							onChange={(e) => setMaxDistance(parseInt(e.target.value, 10))}
							className="filter-range__input"
						/>
					</div>

					<div className="filter-group filter-group--jobs">
						<label htmlFor="pilot-min-pay">
							Minimum earnings: ₦{minPay.toLocaleString()}
						</label>
						<input
							id="pilot-min-pay"
							type="range"
							min="0"
							max="50000"
							step="1000"
							value={minPay}
							onChange={(e) => setMinPay(parseInt(e.target.value, 10))}
							className="filter-range__input"
						/>
					</div>
				</div>
			</div>
		</section>
	);

	const renderJobSkeletons = () => (
		<div className="jobs-grid jobs-grid--feed jobs-grid--skeleton" aria-label="Loading errands">
			{Array.from({ length: 3 }).map((_, index) => (
				<div key={`job-skeleton-${index}`} className="pilot-errand-card pilot-errand-card--skeleton">
					<div className="job-skeleton job-skeleton--title" />
					<div className="job-skeleton job-skeleton--meta" />
					<div className="job-skeleton job-skeleton--meta short" />
					<div className="job-skeleton job-skeleton--block" />
					<div className="job-skeleton job-skeleton--footer" />
				</div>
			))}
		</div>
	);

	const renderAvailabilityHistory = () => (
		<div className="availability-history">
			<div className="availability-history__header">
				<h3>Availability History</h3>
				<span>{availabilityHistory.length} recent events</span>
			</div>
			{availabilityHistory.length === 0 ? (
				<div className="availability-history__empty">
					No availability confirmations yet.
				</div>
			) : (
				<div className="availability-history__list">
					{availabilityHistory.slice(0, 5).map((event) => (
						<div key={event.id} className="availability-history__item">
							<div>
								<div className="availability-history__title">
									{(event.event_type || "").replace(/_/g, " ")} • {event.errand_reference || `#${event.errand_id}`}
								</div>
								<div className="availability-history__meta">
									{event.errand_title || "Errand"}
								</div>
							</div>
							<div className="availability-history__time">
								{event.created_at ? new Date(event.created_at).toLocaleString() : "-"}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);

	return (
		<div className={`pilot-job-board-enhanced pilot-job-board-enhanced--${screenMode}`}>
			{screenMode === "jobs" && renderJobsControlCard()}
			{screenMode === "active" && renderActiveBoardHeader()}
			{screenMode === "earnings" && renderBoardHeader("Earnings", `Updated ${getTimeAgo(lastFetchTime)}`)}

			{futureJob && (
				<div className="future-job-banner">
					<div className="future-job-banner__main">
						<div className="future-job-banner__details">
							<div className="future-job-banner__title">
								Upcoming assigned errand
							</div>
							<div className="future-job-banner__subtitle">
								{futureJob.title || "Errand"} • Ref:{" "}
								{futureJob.reference_number || `#${futureJob.id}`}
							</div>
							<div className="future-job-banner__meta">
								Pickup: {futureJob.pickup_location || "Pickup location pending"}
								{getEndingLocationValue(futureJob)
									? ` → Ending: ${getEndingLocationValue(futureJob)}`
									: ""}
							</div>
							{futureJob.pickup_time_slot_start && (
								<div className="future-job-banner__meta">
									Pickup window starts:{" "}
									{new Date(futureJob.pickup_time_slot_start).toLocaleString()}
								</div>
							)}
						</div>
						<div className="future-job-banner__countdown">
							<span className="future-job-banner__countdown-label">
								Starts in
							</span>
							<span className="future-job-banner__countdown-value">
								{countdownLabel}
							</span>
						</div>
					</div>
					{availabilityMessage && (
						<div className="future-job-banner__message">
							{availabilityMessage}
						</div>
					)}
					{isAvailabilityWindow && (
						<div className="future-job-banner__actions">
							<span>Are you still available for this errand?</span>
							<button
								type="button"
								className="future-job-banner__btn future-job-banner__btn--yes"
								disabled={availabilitySubmitting}
								onClick={() => handleAvailabilityResponse("yes", futureJob.id)}
							>
								{availabilitySubmitting ? "Sending..." : "Yes, I can"}
							</button>
							<button
								type="button"
								className="future-job-banner__btn future-job-banner__btn--no"
								disabled={availabilitySubmitting}
								onClick={() => handleAvailabilityResponse("no", futureJob.id)}
							>
								No, release job
							</button>
						</div>
					)}
				</div>
			)}


			{/* Error Message */}
			{error && (
				<div className="alert alert-error">
					<span>⚠️ {error}</span>
					<button
						type="button"
						className="btn-dismiss"
						onClick={() => setError(null)}
					>
						Dismiss
					</button>
				</div>
			)}

			{screenMode === "jobs" && (
				<section className="jobs-feed-shell" aria-label="Available errands feed">
					{jobsLoading && !openJobs.length ? (
						<div className="loading-state loading-state--feed">
							<div className="spinner"></div>
							<div>
								<p className="loading-state__title">Checking nearby errands...</p>
								<p className="loading-state__subtitle">We’re refreshing the open pool for you.</p>
							</div>
						</div>
					) : null}

					{jobsLoading && !openJobs.length ? renderJobSkeletons() : null}

					{privateAssignedJobs.length > 0 && (
						<div className="private-assignments">
							<div className="private-assignments__header">
								<h3>🔒 Assigned to you</h3>
								<span>{privateAssignedJobs.length}</span>
							</div>
							<div className="jobs-grid jobs-grid--feed">
								{privateAssignedJobs.map((job) => (
									<PilotErrandCard
										key={`assigned-${job.id}`}
										errand={job}
										currentPilotId={currentPilotId}
										dispatchPolicy={effectiveDispatchPolicy}
										acceptBlockedReason={
											hasBlockingActiveErrand(job.id)
												? "Complete your current active errand first"
												: dispatchAcceptBlockedReason
										}
										onViewDetails={() => {
											setSelectedErrand(job);
											setModalShowAccept(true);
											setShowModal(true);
										}}
										onAccept={() => openAcceptWarning(job)}
									/>
								))}
							</div>
						</div>
					)}

					{!jobsLoading && filteredAndSortedJobs.length > 0 ? (
						<>
							<div className="jobs-grid jobs-grid--feed">
								{visibleOpenJobs.map((job) => {
									const disableCard = Boolean(
										getDisableReason(job, currentPilotId, effectiveDispatchPolicy),
									);
									return (
										<PilotErrandCard
											key={job.id}
											errand={job}
											isDisabled={disableCard}
											currentPilotId={currentPilotId}
											dispatchPolicy={effectiveDispatchPolicy}
											acceptBlockedReason={dispatchAcceptBlockedReason}
											onViewDetails={() => {
												setSelectedErrand(job);
												setModalShowAccept(true);
												setShowModal(true);
											}}
											onAccept={() => openAcceptWarning(job)}
										/>
									);
								})}
							</div>
							{filteredAndSortedJobs.length > INITIAL_VISIBLE_OPEN_JOBS ? (
								<div className="jobs-feed-actions">
									<p className="jobs-feed-actions__copy">
										{shouldCollapseOpenJobs
											? `Showing the first ${visibleOpenJobs.length} errands now.`
											: `Showing all ${filteredAndSortedJobs.length} matching errands.`}
									</p>
									<button
										type="button"
										className="btn-jobs-expand"
										onClick={() => setOpenJobsExpanded((prev) => !prev)}
										aria-expanded={openJobsExpanded}
									>
										{shouldCollapseOpenJobs
											? `Show more errands (${hiddenOpenJobsCount})`
											: "Show fewer errands"}
									</button>
								</div>
							) : null}
						</>
					) : null}

					{!jobsLoading && filteredAndSortedJobs.length === 0 ? (
						<div className="empty-state empty-state--feed">
							<p className="empty-icon">🧭</p>
							<p className="empty-title">
								{openJobs.length === 0
									? "No errands available right now"
									: "No errands match these filters"}
							</p>
							<p className="empty-subtitle">
								{openJobs.length === 0
									? "Pull to refresh or adjust filters to check again shortly."
									: "Try adjusting your search or filters to see more errands."}
							</p>
							{filteredAndSortedJobs.length === 0 && openJobs.length > 0 ? (
								<button
									type="button"
									className="btn-reset-filters"
									onClick={resetFilters}
								>
									Clear Filters
								</button>
							) : null}
						</div>
					) : null}
				</section>
			)}

			{screenMode === "active" && (
				<>
					{filteredActiveErrands.length > 0 ? (
						<div className="active-errand-section active-errand-section--tabbed">
							<div className="active-errand-header">
								<h3>🚗 Active queue</h3>
								<span className="active-errand-count">{filteredActiveErrands.length}</span>
							</div>
							<div className="active-errand-grid">
								{filteredActiveErrands.map((errand) => {
									const activeDescription = errand.description || errand.note || "";
									const activeItems = buildChecklistItems(activeDescription);
									const activeStatus = String(errand.status || "").toLowerCase();
									const trackingLabel = getTrackingStatusLabel(activeStatus);
									const checklistExpanded = Boolean(expandedChecklistErrands?.[errand.id]);
										const routeLabel = formatRouteLabel(errand);
									const distanceKm = getErrandDistanceKm(errand);
									const statusTone = getActiveStatusTone(activeStatus);
									const primaryChecklistText = getActiveChecklistPreview(activeItems);
									const timingLabel = formatPickupWindow(errand);

									return (
										<div key={errand.id} className={`active-errand-card active-errand-card--${statusTone}`}>
											<div className="active-job-header active-job-header--route">
												<div className="active-route-stack">
													<p className="active-route-kicker">Current route</p>
													<h4 className="delivery-title">{routeLabel}</h4>
													<p className="active-job-description active-job-description--muted">
														{errand.title || "Errand"}
														{errand.reference_number ? ` • ${errand.reference_number}` : ""}
													</p>
												</div>
												<div className="active-status-cluster">
													<span className={`active-status-pill active-status-pill--${statusTone}`}>
														{formatStatusLabel(errand.status)}
													</span>
													<span className="active-job-tracking">📍 {trackingLabel}</span>
												</div>
											</div>

											<div className="active-summary-grid">
												<div className="active-summary-chip">
													<span className="active-summary-chip__label">Potential payout</span>
													<strong>{formatPilotPotentialPayout(errand)}</strong>
												</div>
												<div className="active-summary-chip">
													<span className="active-summary-chip__label">Distance / ETA</span>
													<strong>
														{distanceKm !== null ? `${distanceKm.toFixed(1)} km` : "Distance pending"}
														 • {errand.estimatedTime || 30} min
													</strong>
												</div>
												<div className="active-summary-chip">
													<span className="active-summary-chip__label">Pickup window</span>
													<strong>{timingLabel}</strong>
												</div>
											</div>

											<div className="active-checklist-card">
												<div className="active-checklist-card__header">
													<div>
														<p className="active-checklist-card__eyebrow">Operational checklist</p>
														<p className="active-checklist-card__summary">{primaryChecklistText}</p>
													</div>
													<button
														type="button"
														className="active-checklist-toggle"
														onClick={() => handleChecklistToggle(errand.id)}
														aria-expanded={checklistExpanded}
														aria-controls={`active-checklist-${errand.id}`}
													>
														{checklistExpanded
															? "Hide steps"
															: activeItems.length > 0
																? `View steps (${activeItems.length})`
																: "Add steps"}
													</button>
												</div>
												{checklistExpanded && activeItems.length > 0 ? (
													<ul id={`active-checklist-${errand.id}`} className="active-checklist-list">
														{activeItems.map((item) => (
															<li key={`${errand.id}-active-${item}`}>{item}</li>
														))}
													</ul>
												) : (
													<p
														id={`active-checklist-${errand.id}`}
														className="active-checklist-fallback"
													>
														{activeDescription || "No special steps added yet. Use details if dispatch shares more context."}
													</p>
												)}
											</div>
											<div className="active-errand-actions">
												{activeStatus === "assigned" ? (
													<button
														type="button"
														className="btn-start-errand"
														onClick={() => openAcceptWarning(errand)}
														disabled={hasBlockingActiveErrand(errand.id)}
														title={
															hasBlockingActiveErrand(errand.id)
																? "Complete your current active errand first"
																: "Accept Errand"
														}
													>
														✅ Accept Errand
													</button>
												) : (
													<button type="button" className="btn-start-errand" onClick={() => handleStartErrand(errand)}>
														{hasPilotStartedErrand(errand)
															? "🧭 Open Active Errand"
															: "🚀 Start Errand"}
													</button>
												)}
												{activeStatus === "assigned" && !hasPilotStartedErrand(errand) ? (
													<button
														type="button"
														className="btn-decline-errand"
														disabled={!canDeclineErrand(errand, currentPilotId)}
														title={getDeclineReason(errand, currentPilotId)}
														onClick={() => {
															if (!canDeclineErrand(errand, currentPilotId)) {
																setError(getDeclineReason(errand, currentPilotId));
																return;
															}
															setDeclineTarget(errand);
														}}
													>
														❌ Not available
													</button>
												) : (
													<button
														type="button"
														className="btn-report-issue"
														onClick={() => openErrandHelp(errand, "delay")}
													>
														⚠️ Report issue
													</button>
												)}
												<button
													type="button"
													className="btn-view-errand"
													onClick={() => {
														setSelectedErrand(errand);
														setModalShowAccept(activeStatus === "assigned");
														setShowModal(true);
													}}
												>
													👀 View details
												</button>
											</div>
											{activeStatus !== "assigned" && (
												<button
													type="button"
													className="active-errand-help-link"
													onClick={() => openErrandHelp(errand)}
												>
													Need help with this errand?
												</button>
											)}
										</div>
									);
								})}
							</div>
						</div>
					) : activeErrands.length > 0 ? (
						<div className="empty-state empty-state--active">
							<p className="empty-icon">🎚️</p>
							<p className="empty-title">No errands match this filter</p>
							<p className="empty-subtitle">Try another filter or return to all active errands.</p>
							<button
								type="button"
								className="btn-reset-filters"
								onClick={() => setActiveQueueFilter("all")}
							>
								Show all active errands
							</button>
						</div>
					) : (
						<div className="empty-state empty-state--active">
							<p className="empty-icon">🚗</p>
							<p className="empty-title">No active errands yet</p>
							<p className="empty-subtitle">Accept a verified errand from Jobs to begin tracking, proof upload, and completion steps.</p>
						</div>
					)}
					{renderAvailabilityHistory()}
				</>
			)}

			{screenMode === "earnings" && (
				<>
					<div className="earnings-summary-grid">
						<div className="earnings-summary-card">
							<span className="earnings-summary-card__label">Today earnings</span>
							<span className="earnings-summary-card__value">₦{todayEarnings.toLocaleString()}</span>
						</div>
						<div className="earnings-summary-card">
							<span className="earnings-summary-card__label">Weekly earnings</span>
							<span className="earnings-summary-card__value">₦{weeklyEarnings.toLocaleString()}</span>
						</div>
						<div className="earnings-summary-card">
							<span className="earnings-summary-card__label">Pending payouts</span>
							<span className="earnings-summary-card__value">-</span>
							<span className="earnings-summary-card__hint">Awaiting payout summary endpoint</span>
						</div>
						<div className="earnings-summary-card">
							<span className="earnings-summary-card__label">Completed errands</span>
							<span className="earnings-summary-card__value">{completedJobs.length || stats.totalDeliveries || 0}</span>
						</div>
					</div>
					{renderAvailabilityHistory()}
				</>
			)}

			{/* Errand Details Modal */}
			{showModal && selectedErrand && (
				<ErrandModal
					errand={selectedErrand}
					onClose={() => {
						setShowModal(false);
						setModalShowAccept(true);
					}}
						onAccept={openAcceptWarning}
					onDecline={
						modalShowAccept
							? (errand) => {
								setShowModal(false);
								setModalShowAccept(true);
								setDeclineTarget(errand);
							}
							: undefined
					}
					isLoading={actionLoading}
					apiBaseUrl={apiBaseUrl}
					token={token}
					canViewAttachments={Boolean(user?.isAdmin)}
					showAccept={modalShowAccept}
					currentPilotId={currentPilotId}
					dispatchPolicy={effectiveDispatchPolicy}
					acceptBlockedReason={
						getAssignedPilotId(selectedErrand) && hasBlockingActiveErrand(selectedErrand.id)
							? "Complete your current active errand first"
							: dispatchAcceptBlockedReason
					}
				/>
			)}

			{renderAcceptWarning()}

			{renderHelpSheet()}

			{/* Jobs Count */}

			{/* Completed Errands Archive */}
			{(screenMode === "earnings" || screenMode === "active") && completedJobs.length > 0 && (
				<div className="archive-section">
					<div className="archive-header">
						<div>
							<h3>🗂️ Completed Errands</h3>
							<p className="archive-subtitle">
								All finished jobs are saved here for reference.
							</p>
						</div>
						{completedJobs.length > 0 && (
							<button
								type="button"
								className="btn-archive-toggle"
								onClick={handleArchiveToggle}
								aria-expanded={archiveExpanded}
								aria-controls={archiveContentId}
							>
								{archiveExpanded
									? "Collapse"
									: `Show all (${completedJobs.length})`}
							</button>
						)}
					</div>
					<div id={archiveContentId} className="archive-grid">
						{visibleArchivedJobs.map((errand) => (
							<div key={errand.id} className="archive-card archive-card--row">
								<div className="archive-card-main">
									<div className="archive-card-identity">
										<h4 className="archive-title">{errand.title || "Errand"}</h4>
										<p className="archive-location archive-location--inline">
											{formatRouteLabel(errand)}
										</p>
									</div>
									<div className="archive-card-subrow">
										<div className="archive-status-cluster">
											<span className="archive-status">✅ Completed</span>
											<span className="archive-completed-date">
												{errand.completed_at
													? `Completed ${new Date(errand.completed_at).toLocaleDateString()}`
													: "Completed"}
											</span>
										</div>
									</div>
								</div>
								<div className="archive-meta archive-meta--stack">
									<strong className="archive-payout">
										{errand.amount && errand.amount > 0
											? `₦${getPilotEarnings(errand).toLocaleString()}`
											: "-"}
									</strong>
									<span className="archive-payout-label">Pilot payout</span>
								</div>
							</div>
						))}
					</div>
					{completedJobs.length > 0 && !archiveExpanded && (
							<p className="archive-hint">
								All {completedJobs.length} completed errand{completedJobs.length === 1 ? " is" : "s are"} hidden.
								 Expand to view all.
							</p>
						)}
				</div>
			)}

			{declineTarget && (
				<div className="confirm-modal-overlay">
					<button
						type="button"
						className="confirm-modal-backdrop"
						onClick={() => setDeclineTarget(null)}
						aria-label="Close decline confirmation"
					/>
					<div className="confirm-modal">
						{!getAssignedPilotId(declineTarget) ? (
							<>
								<h3>Hide Errand?</h3>
								<p>
									Hide <strong>{declineTarget.title || "this errand"}</strong> from
									your list? (Other pilots can still see it.)
								</p>
							</>
						) : (
							<>
								<h3>Can’t take this errand?</h3>
								<p>
									Mark <strong>{declineTarget.title || "this errand"}</strong> as not
									available and release it back to dispatch?
								</p>
							</>
						)}
						<div className="confirm-modal-actions">
							<button
								type="button"
								className="btn-cancel"
								onClick={() => setDeclineTarget(null)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn-decline-errand"
								onClick={() => handleDeclineErrand(declineTarget)}
							>
								{!getAssignedPilotId(declineTarget)
									? "Hide"
									: "Confirm not available"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

// Memoized Job Card Component for Performance
const PilotErrandCard = React.memo(
	({
		errand,
		onViewDetails,
		onAccept,
		isDisabled = false,
		currentPilotId = null,
		dispatchPolicy = null,
		acceptBlockedReason = "",
	}) => {
		const getEarningsBadge = (amount) => {
			if (!amount || amount === 0) return "💼";
			if (amount >= 10000) return "💰💰💰";
			if (amount >= 5000) return "💰💰";
			return "💰";
		};

		const title = errand.title || "Errand";
		const displayAmount = formatPilotPotentialPayout(errand);
		const distanceKm = getErrandDistanceKm(errand);
		const radiusMiles = normalizePilotDispatchPolicy(dispatchPolicy).openPoolRadiusMiles;
		const distanceLabel = distanceKm
			? `${distanceKm.toFixed(1)} km`
			: "Calculating distance…";
		const timeLabel = `${errand.estimatedTime || 30} min`;
		const routeLabel = formatRouteLabel(errand);
		const disableReason = isDisabled
			? getDisableReason(errand, currentPilotId, dispatchPolicy)
			: acceptBlockedReason || "";
		const statusLabel = (errand.status || "").toLowerCase();
		const assignedPilotId = getAssignedPilotId(errand);
		const needsAssignment =
			!assignedPilotId &&
			!["assigned", "approved", "submitted", "pending"].includes(statusLabel);
		const category = getJobCategory(errand);
		const proofSummary = buildProofSummary(errand);
		const canQuickAccept =
			canAcceptErrand(errand, currentPilotId, dispatchPolicy) &&
			!isDisabled &&
			!acceptBlockedReason;
		const acceptActionReason = disableReason || acceptBlockedReason || "";

		return (
			<div
				className={`pilot-errand-card ${isDisabled ? "pilot-errand-card--disabled" : ""}`}
				title={
					isDisabled
						? acceptActionReason || `Out of range (limit ${radiusMiles} miles)`
						: title
				}
			>
				<div className="pilot-errand-card__top">
					<div>
						<p className="pilot-errand-card__title">{title}</p>
						<p className="pilot-errand-card__route">{routeLabel}</p>
					</div>
					<div className="pilot-errand-card__meta">
						<div className="pilot-errand-card__badge">{category}</div>
						<p className="pilot-errand-card__amount">{displayAmount}</p>
					</div>
				</div>
				<div className="pilot-errand-card__stats">
					<span>📍 {distanceLabel}</span>
					<span>🕒 {timeLabel}</span>
					<span>{getEarningsBadge(getPilotEarnings(errand))}</span>
				</div>
				<div className="pilot-errand-card__proof">{proofSummary}</div>
				{needsAssignment && (
					<div className="pilot-errand-card__notice">Waiting on admin assignment</div>
				)}
				<div className="pilot-errand-card__actions">
					<button type="button" className="pilot-errand-card__secondary" onClick={onViewDetails}>
						View details
					</button>
					<button
						type="button"
						className="pilot-errand-card__primary"
						onClick={onAccept}
						disabled={!canQuickAccept}
						title={!canQuickAccept ? acceptActionReason || `Open-pool acceptance is limited to ${radiusMiles} miles.` : "Accept errand"}
					>
						Accept
					</button>
				</div>
				{!canQuickAccept ? (
					<div className="pilot-errand-card__indicator pilot-errand-card__indicator--disabled">
						🚫 {acceptActionReason || "Unavailable"}
					</div>
				) : acceptBlockedReason ? (
					<div className="pilot-errand-card__indicator pilot-errand-card__indicator--info">
						ℹ️ {acceptBlockedReason}
					</div>
				) : null}
			</div>
		);
	},
);

PilotErrandCard.displayName = "PilotErrandCard";

// Errand Details Modal Component
const ErrandModal = React.memo(
	({
		errand,
		onClose,
		onAccept,
		onDecline,
		isLoading,
		apiBaseUrl,
		token,
		canViewAttachments,
		showAccept = true,
		currentPilotId = null,
		dispatchPolicy = null,
		acceptBlockedReason = "",
	}) => {
		const [attachments, setAttachments] = React.useState([]);
		const [sheetTranslateY, setSheetTranslateY] = React.useState(0);
		const [sheetDragging, setSheetDragging] = React.useState(false);
		const dragStartYRef = React.useRef(0);
		const dragActiveRef = React.useRef(false);
		const radiusMiles = normalizePilotDispatchPolicy(dispatchPolicy).openPoolRadiusMiles;
		const canAccept =
			canAcceptErrand(errand, currentPilotId, dispatchPolicy) &&
			!acceptBlockedReason;
		const distanceKm = getErrandDistanceKm(errand);
		const earningsNgn = getPilotEarnings(errand);
		const earningsLabel =
			earningsNgn > 0
				? `₦${earningsNgn.toLocaleString()} potential payout`
				: "Estimated after confirmation";
		const distanceLabel =
			distanceKm !== null ? `${distanceKm.toFixed(1)} km` : "Calculating distance…";
		const isAssignableStatus = [
			"assigned",
			"approved",
			"submitted",
			"pending",
		].includes((errand?.status || "").toLowerCase());
		const footerNote =
			acceptBlockedReason ||
			(!canAccept && isAssignableStatus
				? getDisableReason(errand, currentPilotId, dispatchPolicy) ||
				(distanceKm !== null
					? `Too far (${distanceKm.toFixed(1)} km). Limit is ${radiusMiles} miles.`
						: `Distance unavailable. You can only accept jobs within ${radiusMiles} miles.`)
				: "Potential payout is shown in naira until completion.");

		React.useEffect(() => {
			const onKeyDown = (event) => {
				if (event.key === "Escape") onClose?.();
			};
			document.addEventListener("keydown", onKeyDown);
			return () => document.removeEventListener("keydown", onKeyDown);
		}, [onClose]);

		const handleSheetPointerDown = (event) => {
			if (!event?.isPrimary) return;
			dragActiveRef.current = true;
			dragStartYRef.current = event.clientY;
			setSheetDragging(true);
			try {
				event.currentTarget.setPointerCapture(event.pointerId);
			} catch {
				// ignore
			}
		};

		const handleSheetPointerMove = (event) => {
			if (!dragActiveRef.current) return;
			const delta = Math.max(0, event.clientY - dragStartYRef.current);
			setSheetTranslateY(delta);
		};

		const finishSheetDrag = () => {
			if (!dragActiveRef.current) return;
			dragActiveRef.current = false;
			setSheetDragging(false);
			if (sheetTranslateY > 120) {
				onClose?.();
				setSheetTranslateY(0);
				return;
			}
			setSheetTranslateY(0);
		};

		// Fetch attachments when modal opens
		React.useEffect(() => {
			const fetchAttachments = async () => {
				try {
					const response = await fetch(
						`${apiBaseUrl}/errands/${errand.id}/attachments`,
						{
							headers: {
								Authorization: `Bearer ${token}`,
							},
						},
					);
					if (response.ok) {
						const data = await response.json();
						setAttachments(Array.isArray(data) ? data : data.attachments || []);
					}
				} catch (err) {
					console.error("Error fetching attachments:", err);
					setAttachments([]);
				}
			};

			if (errand?.id && canViewAttachments) {
				fetchAttachments();
			}
		}, [errand?.id, apiBaseUrl, token, canViewAttachments]);

		const getEarningsBadge = (amount) => {
			if (!amount || amount === 0) return "💼";
			if (amount >= 10000) return "💰💰💰";
			if (amount >= 5000) return "💰💰";
			return "💰";
		};

		const handleAcceptClick = () => {
			onAccept(errand);
		};

		const descriptionText = errand.description || errand.note || "";
		const descriptionItems = buildChecklistItems(descriptionText);
		const specialText = errand.note || "";
		const specialItems = buildChecklistItems(specialText);
		const showSpecialInstructions =
			Boolean(specialText?.trim()) &&
			Boolean(descriptionText?.trim()) &&
			specialText.trim() !== descriptionText.trim();

		return (
			<div className="errand-modal-overlay">
				<button
					type="button"
					className="errand-modal-backdrop"
					onClick={onClose}
					aria-label="Close errand details"
					style={{
						position: "absolute",
						inset: 0,
						background: "transparent",
						border: "none",
						padding: 0,
						margin: 0,
						cursor: "pointer",
					}}
				/>
				<div
					className={`errand-modal errand-modal--sheet ${sheetDragging ? "errand-modal--dragging" : ""}`}
					role="dialog"
					aria-modal="true"
					aria-label="Errand details"
					style={{ transform: `translateY(${sheetTranslateY}px)` }}
				>
					<div
						className="errand-modal-handle"
						role="button"
						tabIndex={0}
						aria-label="Drag down to close"
						onPointerDown={handleSheetPointerDown}
						onPointerMove={handleSheetPointerMove}
						onPointerUp={finishSheetDrag}
						onPointerCancel={finishSheetDrag}
					/>
					<button
						type="button"
						className="modal-close-btn"
						onClick={onClose}
						title="Close"
					>
						✕
					</button>

					<div className="modal-header modal-header--sheet-clean">
						<div className="modal-title-section">
							<h2 className="modal-title">
								{errand.title || "Errand Details"}
							</h2>
							<p className="modal-reference">
								Ref: {errand.reference_number || `#${errand.id}`}
							</p>
						</div>
						<div className="modal-earnings-badge">
							{getEarningsBadge(getPilotEarnings(errand))}
						</div>
					</div>

					<div className="modal-content">
						<p className="modal-tracking-note">
							📍 Live tracking will start after you accept this errand.
						</p>
						<section className="modal-section modal-section--summary">
							<h3 className="section-title">Quick summary</h3>
							<div className="modal-summary-list">
										<p><span>Pickup:</span> {errand.pickup_location || "Pickup location pending"}</p>
										<p><span>Ending location:</span> {formatEndingLocation(errand)}</p>
								<p><span>Customer:</span> {errand.customer_rating ? `${errand.customer_rating.toFixed(1)}★ rated customer` : "New customer"}</p>
								<p><span>Estimate:</span> {earningsLabel}</p>
							</div>
						</section>

						<section className="modal-section modal-section--description">
							<h3 className="section-title">What’s needed</h3>
							{descriptionItems.length > 1 ? (
								<ul className="modal-description-list">
									{descriptionItems.map((item) => (
										<li key={`${errand.id}-desc-${item}`}>{item}</li>
									))}
								</ul>
							) : (
								<p className="modal-description">
									{descriptionText || "No description provided"}
								</p>
							)}
						</section>

						<section className="modal-section">
							<h3 className="section-title">Customer</h3>
							<div className="customer-info">
								<div className="customer-header">
									<p className="customer-name">
										{errand.customer_name || "Customer"}
									</p>
									<span className="customer-rating">
										⭐{" "}
										{errand.customer_rating
											? errand.customer_rating.toFixed(1)
											: "New customer"}
									</span>
								</div>
								<p className="customer-contact" style={{ color: "#64748b" }}>
									Contact via ErrandBridge (masked calling)
								</p>
							</div>
						</section>

						{/* Attachments */}
						{canViewAttachments ? (
							attachments &&
							attachments.length > 0 && (
								<section className="modal-section">
									<h3 className="section-title">
										📎 Files ({attachments.length})
									</h3>
									<div
										style={{ display: "flex", flexDirection: "column", gap: 8 }}
									>
										{attachments.map((attachment) => (
											<div
												key={attachment.id}
												style={{
													padding: 10,
													background: "#fef3c7",
													border: "1px solid #fcd34d",
													borderRadius: 6,
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
												}}
											>
												<div>
													<p
														style={{
															margin: "0 0 4px 0",
															fontSize: 13,
															fontWeight: 600,
															color: "#92400e",
														}}
													>
														📄{" "}
														{attachment.original_filename ||
															attachment.filename ||
															"File"}
													</p>
													{attachment.size_bytes && (
														<p
															style={{
																margin: 0,
																fontSize: 12,
																color: "#78350f",
															}}
														>
															{(attachment.size_bytes / 1024).toFixed(2)} KB
														</p>
													)}
												</div>
												<button
													type="button"
													onClick={async () => {
														try {
															const response = await fetch(
																`${apiBaseUrl}/attachments/${attachment.id}`,
																{
																	headers: {
																		Authorization: `Bearer ${token}`,
																	},
																},
															);
															if (response.ok) {
																const blob = await response.blob();
																const url = window.URL.createObjectURL(blob);
																const link = document.createElement("a");
																link.href = url;
																link.download =
																	attachment.original_filename || "download";
																document.body.appendChild(link);
																link.click();
																window.URL.revokeObjectURL(url);
																document.body.removeChild(link);
															} else {
																alert("Failed to download file");
															}
														} catch (err) {
															console.error("Download error:", err);
															alert("Error downloading file");
														}
													}}
													style={{
														padding: "6px 12px",
														background: "#f59e0b",
														color: "#fff",
														border: "none",
														borderRadius: 4,
														fontSize: 12,
														fontWeight: 500,
														cursor: "pointer",
														marginLeft: 12,
														whiteSpace: "nowrap",
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.background = "#d97706";
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.background = "#f59e0b";
													}}
												>
													⬇️ Download
												</button>
											</div>
										))}
									</div>
								</section>
							)
						) : (
							<section className="modal-section">
								<h3 className="section-title">📎 Files</h3>
								<p className="modal-description" style={{ color: "#6b7280" }}>
									Attachments are shared with pilots after assignment and
									approval.
								</p>
							</section>
						)}

						{showSpecialInstructions && (
							<section className="modal-section">
								<h3 className="section-title">Special instructions</h3>
								{specialItems.length > 1 ? (
									<ul className="modal-description-list modal-description-list--highlight">
										{specialItems.map((item) => (
											<li key={`${errand.id}-note-${item}`}>{item}</li>
										))}
									</ul>
								) : (
									<p className="modal-description modal-description--highlight">
										{errand.note}
									</p>
								)}
							</section>
						)}

						<section className="modal-section">
							<h3 className="section-title">Errand details</h3>
							<div className="errand-details-grid">
								<div className="detail-item">
									<span className="detail-label">📏 Distance</span>
									<span className="detail-value">
										{distanceLabel}
									</span>
								</div>
								<div className="detail-item">
									<span className="detail-label">⏱️ Est. Time</span>
									<span className="detail-value">
										{errand.estimatedTime || 30} min
									</span>
								</div>
								<div className="detail-item">
									<span className="detail-label">
										💰 Your earnings (Business Tier · 4.5★)
									</span>
									<span className="detail-value earning">
										{earningsLabel}
									</span>
								</div>
							</div>
						</section>
					</div>

					<div className="modal-footer">
						<div
							className={`modal-footer__note ${!canAccept && isAssignableStatus ? "modal-footer__note--error" : ""}`}
							aria-live="polite"
						>
							{footerNote}
						</div>
						<div className="modal-footer__actions">
							{showAccept && isAssignableStatus && onDecline && !hasPilotStartedErrand(errand) && (
								<button
									type="button"
									className="btn-decline-modal"
									onClick={() => onDecline(errand)}
									disabled={isLoading || !canDeclineErrand(errand)}
									title={getDeclineReason(errand)}
								>
									Not available
								</button>
							)}
							{showAccept && isAssignableStatus && (
								<button
									type="button"
									className="btn-accept-modal"
									onClick={handleAcceptClick}
									disabled={isLoading || !canAccept}
								>
									{isLoading ? "⏳ Accepting..." : "✅ Accept Errand"}
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	},
);

ErrandModal.displayName = "ErrandModal";

export default PilotJobBoardEnhanced;
