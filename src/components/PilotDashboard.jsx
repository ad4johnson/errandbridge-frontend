/**
 * Pilot Dashboard
 * Main screen for pilots - shows role selection and job board
 */

import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import PilotJobBoardEnhanced from "./PilotJobBoardEnhanced";
import PilotProfileSettings from "./PilotProfileSettings";
import { notify } from "../lib/notify";
import { normalizePilotStats } from "./pilotStats";
import {
	ADMIN_DISPATCH_DISABLED,
	ADMIN_DISPATCH_ENABLED,
	ADMIN_DISPATCH_PERMANENTLY_DISABLED,
	getPilotAvailabilityLabel,
	normalizePilotDispatchState,
	PILOT_AVAILABILITY_ONLINE,
} from "./pilotDispatchState";
import "./PilotDashboard.css";

const PUBLIC_ASSET_BASE = process.env.PUBLIC_URL || "";
const PILOT_LOGO_SMALL_URL = `${PUBLIC_ASSET_BASE}/EB-Logo3.png`;

const PilotDeliveryScreen = lazy(() => import("./PilotDeliveryScreen"));
const preloadPilotDeliveryScreen = () => import("./PilotDeliveryScreen");

const normalizeScrollTop = (value) => {
	const numericValue = Number(value);
	if (!Number.isFinite(numericValue) || numericValue <= 0) {
		return 0;
	}
	return numericValue;
};

const HEADER_DEBUG_STORAGE_KEY = "eb_debug_pilot_header";

const getHeaderDebugEnabled = () => {
	if (typeof window === "undefined") return false;
	try {
		const params = new URLSearchParams(window.location.search || "");
		const debugParam = params.get("debugHeader");
		if (debugParam === "1" || debugParam === "true") return true;
		return window.localStorage?.getItem(HEADER_DEBUG_STORAGE_KEY) === "true";
	} catch {
		return false;
	}
};

const describeScrollEventTarget = (target) => {
	if (!target) return "(none)";
	if (target === window) return "window";
	if (target === document) return "document";
	if (!(target instanceof Element)) return String(target);
	const tag = String(target.tagName || "").toLowerCase() || "element";
	const id = target.id ? `#${target.id}` : "";
	const className =
		target.classList && target.classList.length
			? `.${Array.from(target.classList).slice(0, 3).join(".")}`
			: "";
	return `${tag}${id}${className}`;
};

const shouldIgnoreHeaderScrollTarget = (target) => {
	if (!(target instanceof Element)) return false;
	// Ignore scroll interactions coming from sheets / modals so they don't collapse
	// the main header while the pilot is reading overlay content.
	return Boolean(
		target.closest(
			[
				".pilot-profile-sheet",
				".pilot-help-sheet",
				".accept-warning-sheet",
				".errand-modal",
				".modal-overlay",
			].join(","),
		),
	);
};

const isPlausiblePageScrollContainer = (target) => {
	if (typeof window === "undefined") return false;
	if (!(target instanceof Element)) return false;
	const clientHeight = Number(target.clientHeight) || 0;
	const scrollHeight = Number(target.scrollHeight) || 0;
	if (scrollHeight <= clientHeight + 1) return false;
	const viewportHeight = Number(window.innerHeight) || 0;
	if (!viewportHeight) return true;
	return clientHeight >= viewportHeight * 0.6;
};

const getScrollTopFromEventTarget = (event, rootElement = null) => {
	if (!event) return 0;
	const target = event.target;
	if (!(target instanceof Element)) return 0;
	if (rootElement && !(rootElement.contains(target) || target.contains(rootElement))) {
		return 0;
	}
	if (shouldIgnoreHeaderScrollTarget(target)) return 0;
	if (!isPlausiblePageScrollContainer(target)) return 0;
	return normalizeScrollTop(target.scrollTop);
};

const getHeaderScrollTop = ({ shellBody, shellContent }) => {
	if (typeof window === "undefined") {
		return 0;
	}

	return Math.max(
		normalizeScrollTop(window.scrollY),
		normalizeScrollTop(window.pageYOffset),
		normalizeScrollTop(document.scrollingElement?.scrollTop),
		normalizeScrollTop(document.documentElement?.scrollTop),
		normalizeScrollTop(document.body?.scrollTop),
		normalizeScrollTop(shellBody?.scrollTop),
		normalizeScrollTop(shellContent?.scrollTop),
	);
};

const HEADER_SCROLL_THRESHOLDS = {
	jobs: 96,
	active: 52,
	earnings: 52,
	profile: 132,
};

const HEADER_RELEASE_GAP = {
	jobs: 24,
	active: 16,
	earnings: 16,
	profile: 28,
};

const getHeaderMode = (scrollTop, activeTab, previousMode = "full") => {
	const threshold = HEADER_SCROLL_THRESHOLDS[activeTab] ?? HEADER_SCROLL_THRESHOLDS.jobs;
	const releaseGap = HEADER_RELEASE_GAP[activeTab] ?? 20;
	const releaseThreshold = Math.max(0, threshold - releaseGap);
	if (previousMode === "compact") {
		return scrollTop > releaseThreshold ? "compact" : "full";
	}
	return scrollTop >= threshold ? "compact" : "full";
};

const resolvePilotId = (value) =>
	value?.pilot_id || value?.pilotId || value?.id || value?.userId || null;

const PilotDashboard = ({ apiBaseUrl, token, user, onLogout }) => {
	const [activeTab, setActiveTab] = useState("jobs");
	const [view, setView] = useState("job-board"); // 'job-board' or 'errand'
	const [currentJob, setCurrentJob] = useState(null);
	const [errandStatus, setErrandStatus] = useState("idle"); // idle, in_progress, completed
	const [showSettings, setShowSettings] = useState(false);
	const [storedProfile, setStoredProfile] = useState(() => {
		if (typeof window === "undefined") return {};
		const key = user?.id ? `pilotProfile:${user.id}` : "pilotProfile:current";
		try {
			return JSON.parse(localStorage.getItem(key) || "{}");
		} catch (error) {
			console.warn("[PilotDashboard] Unable to parse stored profile", error);
			return {};
		}
	});
	const [liveProfile, setLiveProfile] = useState(null);
	const [profileOpen, setProfileOpen] = useState(false);
	const [profileSheetTranslateY, setProfileSheetTranslateY] = useState(0);
	const [profileSheetDragging, setProfileSheetDragging] = useState(false);
	const profileDragStartYRef = useRef(0);
	const profileDragActiveRef = useRef(false);
	const [pilotDataError, setPilotDataError] = useState(null);
	const [documents, setDocuments] = useState([]);
	const [documentsLoading, setDocumentsLoading] = useState(false);
	const documentsSnapshotRef = useRef(new Map());
	const documentsPrimedRef = useRef(false);
	const [showProfilePrompt, setShowProfilePrompt] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] = useState("personal");
	const previousTierStarsRef = useRef(null);
	const [tierCongratsOpen, setTierCongratsOpen] = useState(false);
	const completionReloadScheduledRef = useRef(false);
	const completionReloadTimeoutRef = useRef(null);
	const [stats, setStats] = useState(() => normalizePilotStats());
	const [availabilityUpdating, setAvailabilityUpdating] = useState(false);
	const [headerMode, setHeaderMode] = useState("full");
	const activeTabRef = useRef(activeTab);
	activeTabRef.current = activeTab;
	const headerModeRef = useRef(headerMode);
	headerModeRef.current = headerMode;
	const latestHeaderScrollTopRef = useRef(0);
	const dashboardRootRef = useRef(null);
	const [headerDebugEnabled, setHeaderDebugEnabled] = useState(() =>
		getHeaderDebugEnabled(),
	);
	const headerDebugEnabledRef = useRef(headerDebugEnabled);
	headerDebugEnabledRef.current = headerDebugEnabled;
	const [headerDebugSnapshot, setHeaderDebugSnapshot] = useState(null);
	const headerDebugSnapshotRef = useRef(headerDebugSnapshot);
	headerDebugSnapshotRef.current = headerDebugSnapshot;
	const [shellSummary, setShellSummary] = useState({
		availableCount: 0,
		matchingCount: 0,
		activeCount: 0,
		completedCount: 0,
		availabilityEvents: 0,
	});
	const shellBodyRef = useRef(null);
	const shellContentRef = useRef(null);

	useEffect(() => {
		return () => {
			if (completionReloadTimeoutRef.current) {
				clearTimeout(completionReloadTimeoutRef.current);
				completionReloadTimeoutRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const key = user?.id ? `pilotProfile:${user.id}` : "pilotProfile:current";
		// Migrate any profile edits captured before the user id was available.
		if (user?.id) {
			const anonymousKey = "pilotProfile:current";
			const userKey = `pilotProfile:${user.id}`;
			try {
				const existingUserRaw = localStorage.getItem(userKey);
				const existingUser = existingUserRaw ? JSON.parse(existingUserRaw) : null;
				const anonymousRaw = localStorage.getItem(anonymousKey);
				const anonymous = anonymousRaw ? JSON.parse(anonymousRaw) : null;
				const userHasData =
					existingUser &&
					Object.keys(existingUser).some((k) => existingUser?.[k] != null && `${existingUser[k]}`.trim?.() !== "");
				const anonymousHasData =
					anonymous &&
					Object.keys(anonymous).some((k) => anonymous?.[k] != null && `${anonymous[k]}`.trim?.() !== "");
				if (!userHasData && anonymousHasData) {
					localStorage.setItem(userKey, JSON.stringify(anonymous));
				}
			} catch (error) {
				console.warn("[PilotDashboard] Unable to migrate stored profile", error);
			}
		}
		try {
			setStoredProfile(JSON.parse(localStorage.getItem(key) || "{}"));
		} catch (error) {
			console.warn("[PilotDashboard] Unable to parse stored profile", error);
			setStoredProfile({});
		}
	}, [user?.id]);

	const displayUser = useMemo(
		() => ({ ...user, ...storedProfile, ...(liveProfile || {}) }),
		[user, storedProfile, liveProfile],
	);
	const displayName =
		[
			displayUser?.first_name,
			displayUser?.firstName,
			displayUser?.last_name,
			displayUser?.lastName,
		]
			.filter(Boolean)
			.join(" ")
			.trim() ||
		displayUser?.name ||
		displayUser?.fullName ||
		displayUser?.email ||
		displayUser?.username ||
		"Pilot";
	const pilotIdValue = displayUser?.id || user?.id || "-";
	const firstNameLabel =
		displayUser?.first_name ||
		displayUser?.firstName ||
		displayName.split(" ")[0] ||
		"Pilot";
	const currentHour = new Date().getHours();
	const greetingLabel =
		currentHour < 12
			? "Good morning"
			: currentHour < 18
				? "Good afternoon"
				: "Good evening";

	const resolveProfileImage = (value) => {
		if (!value) return null;
		if (typeof value !== "string") return null;
		if (value.startsWith("data:") || value.startsWith("http")) return value;
		const rawPath = `${value.startsWith("/") ? "" : "/"}${value}`;
		const encodedPath = encodeURI(rawPath);
		try {
			return new URL(encodedPath, apiBaseUrl).toString();
		} catch {
			return `${apiBaseUrl}${encodedPath}`;
		}
	};

	const profileImage =
		displayUser?.profile_image_preview ||
		resolveProfileImage(
			displayUser?.profile_image_url || displayUser?.profileImage,
		);
	const initials =
		[displayUser?.first_name, displayUser?.last_name]
			.filter(Boolean)
			.map((part) => part[0])
			.join("")
			.toUpperCase()
			.slice(0, 2) ||
		displayUser?.email?.slice(0, 2).toUpperCase() ||
		"P";
	const emailVerified = Boolean(displayUser?.is_email_verified);
	const idStatus = (
		displayUser?.id_verification_status || "pending"
	).toLowerCase();
	const isVerifiedStatus = (status) =>
		status === "verified" || status === "approved";
	const hasBasicProfile = Boolean(
		displayUser?.first_name ||
		displayUser?.firstName ||
		displayUser?.last_name ||
		displayUser?.lastName,
	);
	const hasContactInfo =
		Boolean(displayUser?.phone) && Boolean(displayUser?.email);
	const hasAddressInfo =
		Boolean(displayUser?.city) && Boolean(displayUser?.country);
	const profileDetailsComplete =
		hasBasicProfile && hasContactInfo && hasAddressInfo;
	const isProfileIncomplete = !profileDetailsComplete;
	const verifiedCount = [
		emailVerified,
		isVerifiedStatus(idStatus),
		profileDetailsComplete,
	].filter(Boolean).length;
	const progressPercent = Math.round((verifiedCount / 3) * 100);
	const hasPendingVerification =
		!emailVerified || !isVerifiedStatus(idStatus) || !profileDetailsComplete;
	const hasDocuments = documents.length > 0;
	const isDocumentMissing = !hasDocuments && !documentsLoading;
	const completedErrandsCount = Number(
		stats.totalDeliveries ?? stats.totalErrands,
	) || 0;
	const isProfileComplete =
		!isProfileIncomplete && !isDocumentMissing && progressPercent === 100;
	const tierStars = useMemo(() => {
		// Tier rules:
		// - Default: 1 ⭐
		// - Profile completed: 2 ⭐
		// - 50+ completed errands: 3 ⭐
		// - 100+ completed errands: 4 ⭐
		if (completedErrandsCount >= 100) return 4;
		if (completedErrandsCount >= 50) return 3;
		if (isProfileComplete) return 2;
		return 1;
	}, [completedErrandsCount, isProfileComplete]);
	const tierStarsLabel = useMemo(
		() => "⭐".repeat(tierStars),
		[tierStars],
	);
	const formattedPilotRating = Number.isFinite(Number(stats.rating))
		? Number(stats.rating).toFixed(1)
		: "4.8";
	const verificationStateLabel = hasPendingVerification
		? `${progressPercent}% profile ready`
		: "Fully verified";
	const profileProgressMessage = hasPendingVerification
		? isDocumentMissing
			? "Upload the remaining documents to unlock faster dispatch trust."
			: "Complete the remaining profile steps to keep your trust profile polished."
		: "Your pilot profile is complete and ready for premium jobs.";
	const dispatchState = useMemo(
		() => normalizePilotDispatchState(displayUser),
		[displayUser],
	);
	const availabilityIsOnline =
		dispatchState.adminDispatchStatus === ADMIN_DISPATCH_ENABLED &&
		dispatchState.availability === PILOT_AVAILABILITY_ONLINE;
	const statusBadgeLabel =
		dispatchState.adminDispatchStatus === ADMIN_DISPATCH_ENABLED
			? getPilotAvailabilityLabel(dispatchState.availability)
			: "Dispatch disabled";
	const headerDispatchCopy = dispatchState.canAcceptJobs
		? `You’re live for dispatch with ${shellSummary.matchingCount} matching errands.`
		: dispatchState.adminDispatchStatus === ADMIN_DISPATCH_ENABLED
			? `You’re offline right now. ${shellSummary.matchingCount} matching errands stay visible until you go back online.`
			: `${dispatchState.dispatchBlockReason} Matching errands still stay visible so you can stay synced.`;
	const statusValueCopy = dispatchState.canAcceptJobs
		? `Online • ${shellSummary.matchingCount} matching errands`
		: dispatchState.adminDispatchStatus === ADMIN_DISPATCH_ENABLED
			? `Offline • ${shellSummary.matchingCount} matching errands still visible`
			: `Dispatch disabled • ${shellSummary.matchingCount} visible errands`;
	const availabilityTone =
		dispatchState.adminDispatchStatus === ADMIN_DISPATCH_PERMANENTLY_DISABLED
			? "blocked"
			: dispatchState.adminDispatchStatus === ADMIN_DISPATCH_DISABLED
				? "disabled"
				: availabilityIsOnline
					? "online"
					: "offline";
	const availabilityStateLabel = availabilityUpdating
		? "Updating…"
		: dispatchState.adminDispatchStatus === ADMIN_DISPATCH_PERMANENTLY_DISABLED
			? "Blocked"
			: dispatchState.adminDispatchStatus === ADMIN_DISPATCH_DISABLED
				? "Disabled"
				: statusBadgeLabel;
	const headerCompact = headerMode === "compact";

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		let rafId = null;
		let latestScrollTop = 0;

		const updateHeaderCompact = (event) => {
			const shellBody = shellBodyRef.current;
			const shellContent = shellContentRef.current;
			const eventScrollTop = getScrollTopFromEventTarget(
				event,
				dashboardRootRef.current,
			);
			const fallbackScrollTop = getHeaderScrollTop({
				shellBody,
				shellContent,
			});
			latestScrollTop = Math.max(eventScrollTop, fallbackScrollTop);
			latestHeaderScrollTopRef.current = latestScrollTop;

			if (headerDebugEnabledRef.current) {
				const debugTarget = event?.target;
				headerDebugSnapshotRef.current = {
					capturedAt: Date.now(),
					eventTarget: describeScrollEventTarget(debugTarget),
					eventTargetScrollTop: normalizeScrollTop(debugTarget?.scrollTop),
					eventScrollTop,
					windowScrollY: normalizeScrollTop(window.scrollY),
					pageYOffset: normalizeScrollTop(window.pageYOffset),
					scrollingElementScrollTop: normalizeScrollTop(
						document.scrollingElement?.scrollTop,
					),
					documentElementScrollTop: normalizeScrollTop(
						document.documentElement?.scrollTop,
					),
					bodyScrollTop: normalizeScrollTop(document.body?.scrollTop),
					shellBodyScrollTop: normalizeScrollTop(shellBody?.scrollTop),
					shellContentScrollTop: normalizeScrollTop(shellContent?.scrollTop),
					latestScrollTop,
				};
			}
			if (rafId != null) return;
			rafId = window.requestAnimationFrame(() => {
				rafId = null;
				const tab = activeTabRef.current;
				const prev = headerModeRef.current;
				const nextHeaderMode = getHeaderMode(latestScrollTop, tab, prev);

				if (headerDebugEnabledRef.current) {
					const threshold =
						HEADER_SCROLL_THRESHOLDS[tab] ?? HEADER_SCROLL_THRESHOLDS.jobs;
					const releaseGap = HEADER_RELEASE_GAP[tab] ?? 20;
					const releaseThreshold = Math.max(0, threshold - releaseGap);
					setHeaderDebugSnapshot({
						...(headerDebugSnapshotRef.current || {}),
						tab,
						prevHeaderMode: prev,
						nextHeaderMode,
						threshold,
						releaseThreshold,
					});
				}

				if (prev === nextHeaderMode) return;
				headerModeRef.current = nextHeaderMode;
				setHeaderMode(nextHeaderMode);
			});
		};

		updateHeaderCompact();

		window.addEventListener("scroll", updateHeaderCompact, { passive: true });
		document.addEventListener("scroll", updateHeaderCompact, {
			passive: true,
			capture: true,
		});
		const shellBody = shellBodyRef.current;
		const shellContent = shellContentRef.current;
		shellBody?.addEventListener("scroll", updateHeaderCompact, { passive: true });
		shellContent?.addEventListener("scroll", updateHeaderCompact, { passive: true });

		return () => {
			if (rafId != null) {
				window.cancelAnimationFrame(rafId);
			}
			window.removeEventListener("scroll", updateHeaderCompact);
			document.removeEventListener("scroll", updateHeaderCompact, true);
			shellBody?.removeEventListener("scroll", updateHeaderCompact);
			shellContent?.removeEventListener("scroll", updateHeaderCompact);
		};
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const scrollTop =
			latestHeaderScrollTopRef.current ||
			getHeaderScrollTop({
				shellBody: shellBodyRef.current,
				shellContent: shellContentRef.current,
			});
		const prev = headerModeRef.current;
		const next = getHeaderMode(scrollTop, activeTab, prev);
		if (prev === next) return;
		headerModeRef.current = next;
		setHeaderMode(next);
	}, [activeTab]);

	useEffect(() => {
		// Reduce perceived delay when opening the Pilot Screen (delivery/action view)
		// on mobile shells by preloading the bundle.
		if (activeTab === "active") {
			preloadPilotDeliveryScreen();
		}
	}, [activeTab]);

	useEffect(() => {
		if (shellSummary.activeCount > 0) {
			preloadPilotDeliveryScreen();
		}
	}, [shellSummary.activeCount]);

	useEffect(() => {
		if (!user?.id) return;
		if (typeof window === "undefined") return;
		const prevTier = previousTierStarsRef.current;
		previousTierStarsRef.current = tierStars;
		if (prevTier === null) return;
		if (tierStars !== 2 || prevTier >= 2) return;
		if (!isProfileComplete) return;

		const key = `pilotTierCongratsSeen_${user.id}_2`;
		if (localStorage.getItem(key) === "true") return;
		localStorage.setItem(key, "true");
		setTierCongratsOpen(true);
	}, [isProfileComplete, tierStars, user?.id]);

	const openVerificationCenter = () => {
		setShowSettings(true);
		setProfileOpen(false);
	};

	const fetchPilotStats = useCallback(async () => {
		try {
			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/stats`, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});
			if (response.ok) {
				const data = await response.json();
				setStats(normalizePilotStats(data));
				setPilotDataError(null);
			} else if (response.status === 401) {
				onLogout?.("Session expired. Please sign in again.");
			} else {
				setPilotDataError("Pilot stats are temporarily unavailable.");
			}
		} catch {
			setPilotDataError("Pilot stats are temporarily unavailable.");
		}
	}, [apiBaseUrl, token, onLogout]);

	const fetchLiveProfile = useCallback(async () => {
		try {
			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/profile`, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});
			if (response.status === 401) {
				onLogout?.("Session expired. Please sign in again.");
				return;
			}
			if (!response.ok) return;
			const data = await response.json();
			setPilotDataError(null);
			setLiveProfile(data);
		} catch {
			setPilotDataError("Pilot profile data is temporarily unavailable.");
		}
	}, [apiBaseUrl, token, onLogout]);

	const fetchDocuments = useCallback(async (options = {}) => {
		const { emitToasts = false } = options || {};
		if (!token) return;
		setDocumentsLoading(true);
		try {
			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/documents`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(
					payload.detail || payload.message || "Unable to load documents",
				);
			}
			const nextDocuments = Array.isArray(payload.documents)
				? payload.documents
				: [];

			if (emitToasts && documentsPrimedRef.current) {
				const prev = documentsSnapshotRef.current;
				for (const doc of nextDocuments) {
					const id = doc?.id != null ? String(doc.id) : "";
					if (!id) continue;
					const nextStatus = String(doc?.status || "").trim().toLowerCase();
					const prevStatus = String(prev.get(id)?.status || "").trim().toLowerCase();
					if (!prevStatus || prevStatus === nextStatus) continue;
					if (nextStatus !== "approved" && nextStatus !== "rejected") continue;

					const docType =
						String(doc?.document_type || doc?.documentType || "document") ||
						"document";
					if (nextStatus === "approved") {
						notify.success(`✅ ${docType.replace(/_/g, " ")} approved`, {
							dedupeKey: `pilot-doc-${id}-approved`,
						});
					} else {
						notify.warning(`⚠️ ${docType.replace(/_/g, " ")} needs attention`, {
							dedupeKey: `pilot-doc-${id}-rejected`,
						});
					}
				}
			}

			const nextSnapshot = new Map();
			for (const doc of nextDocuments) {
				const id = doc?.id != null ? String(doc.id) : "";
				if (!id) continue;
				nextSnapshot.set(id, {
					status: doc?.status ?? null,
					document_type: doc?.document_type ?? doc?.documentType ?? null,
				});
			}
			documentsSnapshotRef.current = nextSnapshot;
			documentsPrimedRef.current = true;

			setDocuments(nextDocuments);
		} catch {
			setDocuments([]);
		} finally {
			setDocumentsLoading(false);
		}
	}, [apiBaseUrl, token]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (!token) return undefined;

		let cancelled = false;
		const tick = async () => {
			if (cancelled) return;
			await fetchDocuments({ emitToasts: true });
		};

		const interval = window.setInterval(() => void tick(), 20000);
		return () => {
			cancelled = true;
			window.clearInterval(interval);
		};
	}, [fetchDocuments, token]);

	useEffect(() => {
		fetchPilotStats(); // fetchPilotStats is defined below, intentional
		fetchLiveProfile();
		fetchDocuments();
	}, [fetchPilotStats, fetchLiveProfile, fetchDocuments]);

	useEffect(() => {
		if (!user?.id) return;
		if (documentsLoading) return;
		const dismissalKey = `pilotProfilePromptDismissed_${user.id}`;
		const dismissedAtRaw =
			typeof window !== "undefined" ? localStorage.getItem(dismissalKey) : null;
		const dismissedAt = dismissedAtRaw ? Number(dismissedAtRaw) : 0;
		const twentyFourHours = 24 * 60 * 60 * 1000;
		const recentlyDismissed =
			dismissedAt && Date.now() - dismissedAt < twentyFourHours;
		if ((isProfileIncomplete || isDocumentMissing) && !recentlyDismissed) {
			setShowProfilePrompt(true);
			return;
		}
		setShowProfilePrompt(false);
	}, [user?.id, isProfileIncomplete, isDocumentMissing, documentsLoading]);

	useEffect(() => {
		if (!profileOpen) return undefined;
		const onKeyDown = (event) => {
			if (event.key === "Escape") setProfileOpen(false);
		};
		document.addEventListener("keydown", onKeyDown);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = previousOverflow;
		};
	}, [profileOpen]);

	const handleProfileSheetPointerDown = (event) => {
		if (!event?.isPrimary) return;
		profileDragActiveRef.current = true;
		profileDragStartYRef.current = event.clientY;
		setProfileSheetDragging(true);
		try {
			event.currentTarget.setPointerCapture(event.pointerId);
		} catch {
			// ignore
		}
	};

	const handleProfileSheetPointerMove = (event) => {
		if (!profileDragActiveRef.current) return;
		const delta = Math.max(0, event.clientY - profileDragStartYRef.current);
		setProfileSheetTranslateY(delta);
	};

	const finishProfileSheetDrag = () => {
		if (!profileDragActiveRef.current) return;
		profileDragActiveRef.current = false;
		setProfileSheetDragging(false);
		if (profileSheetTranslateY > 120) {
			setProfileOpen(false);
			setProfileSheetTranslateY(0);
			return;
		}
		setProfileSheetTranslateY(0);
	};

	const handleJobAccepted = useCallback((job) => {
		if (!job) {
			setCurrentJob(null);
			setView("job-board");
			setErrandStatus("idle");
			setActiveTab("jobs");
			return;
		}
		preloadPilotDeliveryScreen();
		setCurrentJob(job);
		setView("errand");
		setErrandStatus("in_progress");
		setActiveTab("active");
	}, []);

	const resolvedPilotId = useMemo(
		() => resolvePilotId(displayUser) || resolvePilotId(user),
		[displayUser, user],
	);

	useEffect(() => {
		if (!currentJob?._acceptedByPilotId || !resolvedPilotId) return;
		if (String(currentJob._acceptedByPilotId) === String(resolvedPilotId)) return;
		setCurrentJob(null);
		setView("job-board");
		setErrandStatus("idle");
		setActiveTab("jobs");
	}, [currentJob, resolvedPilotId]);

	const handleProfilePromptDismiss = () => {
		if (!user?.id || typeof window === "undefined") {
			setShowProfilePrompt(false);
			return;
		}
		localStorage.setItem(
			`pilotProfilePromptDismissed_${user.id}`,
			String(Date.now()),
		);
		setShowProfilePrompt(false);
	};

	const handleErrandComplete = async () => {
		setErrandStatus("completed");
		setView("job-board");
		setActiveTab("earnings");
		setCurrentJob(null);

		// Hard-refresh shortly after completion so the UI reflects the latest
		// state from the backend (and clears any sticky in-memory state).
		if (typeof window === "undefined") return;
		if (completionReloadScheduledRef.current) return;
		completionReloadScheduledRef.current = true;
		completionReloadTimeoutRef.current = setTimeout(() => {
			window.location.reload();
		}, 2000);
	};

	const handleBrandRefresh = useCallback(() => {
		if (typeof window === "undefined") return;
		window.location.reload();
	}, []);

	const handleToggleAvailability = useCallback(async () => {
		if (dispatchState.adminDispatchStatus !== ADMIN_DISPATCH_ENABLED) return;
		setAvailabilityUpdating(true);
		try {
			const nextAvailability =
				dispatchState.availability === PILOT_AVAILABILITY_ONLINE
					? "offline"
					: "online";
			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/availability`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ availability: nextAvailability }),
			});
			const data = await response.json().catch(() => ({}));
			if (response.status === 401) {
				onLogout?.("Session expired. Please sign in again.");
				return;
			}
			if (!response.ok) {
				throw new Error(data.detail || data.message || "Unable to update availability");
			}
			setLiveProfile((prev) => ({
				...(prev || {}),
				availability: data.availability,
				admin_dispatch_status: data.admin_dispatch_status,
				can_accept_jobs: data.can_accept_jobs,
				dispatch_block_reason: data.dispatch_block_reason,
				admin_dispatch_note: data.admin_dispatch_note,
			}));
			setPilotDataError(null);
		} catch (error) {
			setPilotDataError(error.message || "Unable to update availability.");
		} finally {
			setAvailabilityUpdating(false);
		}
	}, [apiBaseUrl, dispatchState, token, onLogout]);

	const handleDispatchStateChange = useCallback((nextState) => {
		setLiveProfile((prev) => ({
			...(prev || {}),
			availability: nextState.availability,
			admin_dispatch_status: nextState.adminDispatchStatus,
			can_accept_jobs: nextState.canAcceptJobs,
			dispatch_block_reason: nextState.dispatchBlockReason,
			admin_dispatch_note: nextState.adminDispatchNote,
		}));
	}, []);

	return (
		<div className="pilot-dashboard" ref={dashboardRootRef}>
			{headerDebugEnabled ? (
				<div className="pilot-header-debug" role="status">
					<div className="pilot-header-debug__row">
						<strong>Header</strong>
						<span>
							{headerMode} · {activeTab}
						</span>
						<button
							type="button"
							className="pilot-header-debug__close"
							onClick={() => {
								try {
									window.localStorage?.setItem(
										HEADER_DEBUG_STORAGE_KEY,
										"false",
									);
								} catch {
									// ignore
								}
								setHeaderDebugEnabled(false);
							}}
							aria-label="Hide header debug"
						>
							×
						</button>
					</div>
					<div className="pilot-header-debug__grid">
						<div>
							<div className="pilot-header-debug__label">scrollTop</div>
							<div className="pilot-header-debug__value">
								{Math.round(Number(latestHeaderScrollTopRef.current) || 0)}
							</div>
						</div>
						<div>
							<div className="pilot-header-debug__label">target</div>
							<div className="pilot-header-debug__value">
								{headerDebugSnapshot?.eventTarget || "(none)"}
							</div>
						</div>
						<div>
							<div className="pilot-header-debug__label">threshold</div>
							<div className="pilot-header-debug__value">
								{headerDebugSnapshot?.threshold ?? "-"}
							</div>
						</div>
						<div>
							<div className="pilot-header-debug__label">release</div>
							<div className="pilot-header-debug__value">
								{headerDebugSnapshot?.releaseThreshold ?? "-"}
							</div>
						</div>
					</div>
					<div className="pilot-header-debug__details">
						<div>
							win: {headerDebugSnapshot?.windowScrollY ?? 0} · scrollEl:{" "}
							{headerDebugSnapshot?.scrollingElementScrollTop ?? 0}
						</div>
						<div>
							event: {headerDebugSnapshot?.eventScrollTop ?? 0} · shellBody:{" "}
							{headerDebugSnapshot?.shellBodyScrollTop ?? 0}
						</div>
					</div>
				</div>
			) : null}
			{tierCongratsOpen && (
				<div className="pilot-tier-congrats" role="status">
					<div className="pilot-tier-congrats__header">
						<div className="pilot-tier-congrats__title">
							🎉 Congratulations - you just earned ⭐⭐
						</div>
						<button
							type="button"
							className="pilot-tier-congrats__close"
							onClick={() => setTierCongratsOpen(false)}
							aria-label="Dismiss"
						>
							×
						</button>
					</div>
					<div className="pilot-tier-congrats__body">
						<div style={{ marginBottom: 6 }}>
							Your profile is complete, so your pilot tier moved from ⭐ to ⭐⭐.
						</div>
						<div style={{ fontWeight: 700, marginBottom: 4 }}>
							How to earn more stars
						</div>
						<ul style={{ margin: 0, paddingLeft: 18 }}>
							<li>
								Reach 50 completed errands → ⭐⭐⭐
							</li>
							<li>
								Reach 100 completed errands → ⭐⭐⭐⭐
							</li>
						</ul>
						<div style={{ marginTop: 8, opacity: 0.9 }}>
							You’re currently at {completedErrandsCount} completed.
						</div>
					</div>
				</div>
			)}
			<div className="pilot-shell">
				<div className="pilot-shell__body" ref={shellBodyRef}>
					<header
						className={`pilot-work-header ${headerCompact ? "pilot-work-header--compact" : ""}`}
						data-collapsed={headerCompact ? "true" : "false"}
						data-header-mode={headerMode}
					>
						<div className="pilot-work-header__actions">
							<button
								type="button"
								className="pilot-work-header__brand pilot-work-header__brand--landing"
								onClick={handleBrandRefresh}
								aria-label="Refresh pilot page"
							>
								<img
									src={PILOT_LOGO_SMALL_URL}
									alt="ErrandBridge"
									className="pilot-work-header__brand-image pilot-work-header__brand-image--landing"
									loading="eager"
									decoding="async"
								/>
							</button>
							<button
								type="button"
								className="pilot-work-header__profile-trigger"
								onClick={() => setProfileOpen(true)}
								aria-label="Open pilot profile and trust"
							>
								{profileImage ? (
									<img
										src={profileImage}
										alt={displayName}
										loading="lazy"
										decoding="async"
									/>
								) : (
									<span>{initials}</span>
								)}
								{availabilityIsOnline ? (
									<span
										className={`pilot-work-header__profile-status-dot ${headerCompact
												? "pilot-work-header__profile-status-dot--compact"
												: ""
											}`.trim()}
										aria-hidden="true"
									/>
								) : null}
							</button>
						</div>
						<div
							className="pilot-work-header__copy"
							aria-hidden={headerCompact ? "true" : "false"}
						>
							<div className="pilot-work-header__identity-meta">
								<div className="pilot-work-header__eyebrow">Pilot network</div>
								<p className="pilot-work-header__greeting">{greetingLabel}</p>
							</div>
							<h1 className="pilot-work-header__title">
								{firstNameLabel}
								{!headerCompact ? (
									<span className="pilot-work-header__title-wave" aria-hidden="true">
										{" "}👋
									</span>
								) : null}
							</h1>
							<p className="pilot-work-header__subtitle">
								{headerDispatchCopy}
							</p>
							<div className="pilot-work-header__trust-row">
								<span className="pilot-work-header__trust-chip">
									{tierStarsLabel} Tier {tierStars}
								</span>
								<span className="pilot-work-header__trust-chip pilot-work-header__trust-chip--highlight">
									⭐ {formattedPilotRating} trust score
								</span>
								<span className="pilot-work-header__trust-chip">
									🛡️ {verificationStateLabel}
								</span>
							</div>
						</div>
					</header>

					{pilotDataError && (
						<div className="pilot-inline-alert" role="status">
							<span>⚠️</span>
							<span>{pilotDataError}</span>
						</div>
					)}

					{activeTab === "jobs" && (
						<>
							<section className="pilot-status-card">
								<div className="pilot-status-card__content">
									<p className="pilot-status-card__label">Status</p>
									<p className="pilot-status-card__value">
										{statusValueCopy}
									</p>
									<p className="pilot-status-card__summary">
										Assigned {shellSummary.activeCount} · Completed {completedErrandsCount} · Trust {formattedPilotRating}★
									</p>
									{dispatchState.dispatchBlockReason ? (
										<p className="pilot-status-card__hint">{dispatchState.dispatchBlockReason}</p>
									) : null}
								</div>
								<div className="pilot-status-card__actions">
									<div className="pilot-status-card__availability-label-row">
										<span className="pilot-status-card__availability-label">
											Availability
										</span>
										<span
											className={`pilot-status-card__availability-state pilot-status-card__availability-state--${availabilityTone}`}
										>
											{availabilityStateLabel}
										</span>
									</div>
									<button
										type="button"
										className={`pilot-status-card__switch pilot-status-card__switch--${availabilityTone}`}
										role="switch"
										aria-checked={availabilityIsOnline}
										aria-label="Pilot availability"
										onClick={handleToggleAvailability}
										disabled={
											availabilityUpdating ||
											dispatchState.adminDispatchStatus !== ADMIN_DISPATCH_ENABLED
										}
									>
										<span className="pilot-status-card__switch-copy">
											<span className="pilot-status-card__switch-title">{availabilityStateLabel}</span>
											<span className="pilot-status-card__switch-subtitle">
												{availabilityIsOnline ? "Accepting new errands" : "View jobs only"}
											</span>
										</span>
										<span className="pilot-status-card__switch-track" aria-hidden="true">
											<span className="pilot-status-card__switch-thumb" />
										</span>
									</button>
								</div>
							</section>
						</>
					)}

					{errandStatus === "completed" && (
						<div className="success-message">
							✅ Errand completed! Great job! 🎉
						</div>
					)}

					<div className="pilot-shell-content" ref={shellContentRef}>
						{activeTab === "profile" ? (
							<section className="pilot-profile-tab">
								<div className="pilot-profile-tab__card">
									<div className="pilot-profile-tab__header">
										<div className="pilot-profile-tab__avatar">
											{profileImage ? (
												<img
													src={profileImage}
													alt={displayName}
													loading="lazy"
													decoding="async"
												/>
											) : (
												<span>{initials}</span>
											)}
										</div>
										<div className="pilot-profile-tab__meta">
											<h2>{displayName}</h2>
											<p>ID {pilotIdValue}</p>
											<div className="pilot-profile-tab__rating">
												{tierStarsLabel} · ⭐ {formattedPilotRating}
											</div>
											<div className="pilot-profile-tab__verify">
												{hasPendingVerification
													? `Verification pending • ${progressPercent}% complete`
													: "Verification complete"}
											</div>
										</div>
									</div>

									<div className="pilot-profile-tab__hero">
										<div className="pilot-profile-tab__headline">
											<div className="pilot-profile-tab__eyebrow">Pilot trust profile</div>
											<h3>
												{hasPendingVerification
													? "A few final steps unlock your strongest trust signals."
													: "Your premium pilot profile is ready for clients and dispatch."}
											</h3>
											<p>{profileProgressMessage}</p>
										</div>
										<div className="pilot-profile-tab__badges">
											<span className="pilot-profile-tab__badge">{tierStarsLabel} Tier {tierStars}</span>
											<span className="pilot-profile-tab__badge pilot-profile-tab__badge--accent">🛡️ {verificationStateLabel}</span>
											<span className="pilot-profile-tab__badge">✅ {completedErrandsCount} completed errands</span>
										</div>
									</div>

									<div className="pilot-profile-tab__summary-grid">
										<div className="pilot-profile-tab__summary-card">
											<span>Trust score</span>
											<strong>{formattedPilotRating} ★</strong>
											<small>client-facing rating</small>
										</div>
										<div className="pilot-profile-tab__summary-card">
											<span>Jobs matched</span>
											<strong>{shellSummary.matchingCount}</strong>
											<small>ready right now</small>
										</div>
										<div className="pilot-profile-tab__summary-card">
											<span>Documents</span>
											<strong>{documents.length}</strong>
											<small>{documentsLoading ? "syncing" : "uploaded"}</small>
										</div>
									</div>

									<div className="pilot-profile-tab__completion">
										<div className="pilot-profile-tab__completion-row">
											<span>Profile readiness</span>
											<strong>{progressPercent}%</strong>
										</div>
										<div className="pilot-profile-tab__completion-track">
											<div
												className="pilot-profile-tab__completion-fill"
												style={{ width: `${progressPercent}%` }}
											/>
										</div>
										<p>{profileProgressMessage}</p>
									</div>

									{showProfilePrompt && (
										<div className="pilot-profile-prompt pilot-profile-prompt--tab">
											<div>
												<strong>Complete your pilot profile</strong> to unlock faster approvals and payouts.
												{(isProfileIncomplete || isDocumentMissing) && (
													<div className="pilot-profile-prompt__details">
														{isProfileIncomplete && "Profile details are incomplete."}
														{isProfileIncomplete && isDocumentMissing && " "}
														{isDocumentMissing && "Documents are missing."}
													</div>
												)}
											</div>
											<div className="pilot-profile-prompt__actions">
												<button
													type="button"
													onClick={() => {
														setSettingsInitialTab(isDocumentMissing ? "documents" : "personal");
														setShowSettings(true);
														setShowProfilePrompt(false);
													}}
												>
													Complete now
												</button>
												<button
													type="button"
													className="pilot-profile-prompt__secondary"
													onClick={handleProfilePromptDismiss}
												>
													Remind me later
												</button>
											</div>
										</div>
									)}

									<div className="pilot-profile-tab__actions">
										{hasPendingVerification && (
											<button type="button" onClick={openVerificationCenter}>
												✅ Complete verification
											</button>
										)}
										<button type="button" onClick={() => setShowSettings(true)}>
											⚙️ Open settings
										</button>
										<button
											type="button"
											onClick={() => {
												fetchPilotStats();
												fetchLiveProfile();
												fetchDocuments();
											}}
										>
											🔄 Refresh
										</button>
										<button
											type="button"
											className="pilot-profile-tab__logout"
											onClick={onLogout}
										>
											Logout
										</button>
									</div>
								</div>
							</section>
						) : activeTab === "active" && view === "errand" && currentJob ? (
							<div className="pilot-active-delivery">
								<Suspense
									fallback={
										<div style={{ padding: 20, color: "#6b7280" }}>
											Loading delivery view…
										</div>
									}
								>
									<PilotDeliveryScreen
										errand={currentJob}
										pilotId={resolvedPilotId}
										token={token}
										apiBaseUrl={apiBaseUrl}
										onBack={() => setView("job-board")}
										onDeliveryComplete={handleErrandComplete}
									/>
								</Suspense>
							</div>
						) : (
							<PilotJobBoardEnhanced
								apiBaseUrl={apiBaseUrl}
								token={token}
								pilotId={user?.id}
								user={displayUser}
								onJobAccepted={handleJobAccepted}
								currentStatus={errandStatus}
								onLogout={onLogout}
								screenMode={activeTab}
								onSummaryChange={setShellSummary}
								pilotDispatchState={dispatchState}
								onDispatchStateChange={handleDispatchStateChange}
							/>
						)}
					</div>
				</div>

				<nav className="pilot-bottom-nav" aria-label="Pilot navigation">
					{[
						{ key: "jobs", label: "Jobs", icon: "📋" },
						{ key: "active", label: "Active", icon: "🚗" },
						{ key: "earnings", label: "Earnings", icon: "💰" },
						{ key: "profile", label: "Profile", icon: "👤" },
					].map((item) => (
						<button
							key={item.key}
							type="button"
							className={`pilot-bottom-nav__item ${activeTab === item.key ? "pilot-bottom-nav__item--active" : ""}`}
							onClick={() => {
								setActiveTab(item.key);
								if (item.key !== "active") {
									setView("job-board");
								}
							}}
						>
							<span aria-hidden="true">{item.icon}</span>
							<span>{item.label}</span>
						</button>
					))}
				</nav>
			</div>

			{profileOpen && (
				<div className="pilot-profile-sheet-overlay" role="presentation">
					<button
						type="button"
						className="pilot-profile-sheet-backdrop"
						onClick={() => setProfileOpen(false)}
						aria-label="Close profile"
					/>
					<div
						className={`pilot-profile-sheet ${profileSheetDragging ? "pilot-profile-sheet--dragging" : ""}`}
						role="dialog"
						aria-modal="true"
						aria-label="Pilot profile"
						style={{ transform: `translateY(${profileSheetTranslateY}px)` }}
					>
						<div
							className="pilot-sheet-handle"
							role="button"
							tabIndex={0}
							aria-label="Drag down to close"
							onPointerDown={handleProfileSheetPointerDown}
							onPointerMove={handleProfileSheetPointerMove}
							onPointerUp={finishProfileSheetDrag}
							onPointerCancel={finishProfileSheetDrag}
						/>
						<div className="pilot-profile-sheet__header">
							<div className="pilot-profile-sheet__avatar">
								{profileImage ? (
									<img
										src={profileImage}
										alt={displayName}
										loading="lazy"
										decoding="async"
									/>
								) : (
									<span>{initials}</span>
								)}
							</div>
							<div className="pilot-profile-sheet__meta">
								<div className="pilot-profile-sheet__name">{displayName}</div>
								<div className="pilot-profile-sheet__sub">
									{tierStarsLabel} · ⭐ {stats.rating || 4.8}
								</div>
								<div className="pilot-profile-sheet__verify">
									{hasPendingVerification
										? `Verification pending • ${progressPercent}% complete`
										: "Verification complete"}
								</div>
							</div>
						</div>
						<div className="pilot-profile-sheet__content">
							{hasPendingVerification && (
								<button
									type="button"
									className="pilot-profile-sheet__primary"
									onClick={openVerificationCenter}
								>
									✅ Complete verification
								</button>
							)}
							<button
								type="button"
								className="pilot-profile-sheet__secondary"
								onClick={() => {
									setShowSettings(true);
									setProfileOpen(false);
								}}
							>
								⚙️ Open settings
							</button>
							<button
								type="button"
								className="pilot-profile-sheet__secondary"
								onClick={() => {
									fetchLiveProfile();
									fetchDocuments();
								}}
							>
								🔄 Refresh
							</button>
							<div className="pilot-profile-sheet__hint">
								More profile details are available in Settings.
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Settings Modal */}
			{showSettings && (
				<PilotProfileSettings
					user={displayUser}
					token={token}
					apiBaseUrl={apiBaseUrl}
					onClose={() => setShowSettings(false)}
					onDelete={onLogout}
					initialTab={settingsInitialTab}
					onSave={(updatedProfile) => {
						if (updatedProfile) {
							setStoredProfile((prev) => ({ ...prev, ...updatedProfile }));
							setLiveProfile((prev) => ({ ...(prev || {}), ...updatedProfile }));
						}
						fetchPilotStats();
						fetchLiveProfile();
						fetchDocuments();
					}}
				/>
			)}
		</div>
	);
};

export default PilotDashboard;
