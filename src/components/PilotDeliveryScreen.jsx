/**
 * Pilot Errand Screen
 * Shows active errand and starts GPS tracking when errand begins
 * Displays route preview and errand details
 */
import { useCallback, useEffect, useState } from "react";
import L from "leaflet";
import {
	MapContainer,
	Marker,
	Polyline,
	Popup,
	TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { usePilotLiveTracking } from "../hooks/usePilotLiveTracking";
import { canUsePilotDevGpsTestMode } from "../lib/pilotDevGps";
import ErrandChatPanel from "./ErrandChatPanel";
import "./PilotDeliveryScreen.css";

const PILOT_STARTED_ERRANDS_KEY = "eb_pilot_started_errands_v1";
const TERMINAL_TRACKING_ERROR_PATTERN = /live tracking stopped because/i;
const TRACKABLE_ERRAND_STATUSES = new Set([
	"accepted",
	"assigned",
	"pickup_started",
	"picked_up",
	"dropoff_started",
	"in_progress",
]);

const getPilotStartedErrandsStorageKey = (pilotId) =>
	`${PILOT_STARTED_ERRANDS_KEY}:${pilotId ? String(pilotId) : "anon"}`;

const normalizeStatusKey = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[-\s]+/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");

const getAssignedPilotId = (errand) =>
	errand?.assigned_pilot_id ||
	errand?.assignedPilotId ||
	errand?.assigned_to ||
	errand?.assignedTo ||
	errand?.assigned_pilot ||
	errand?.pilot_assigned_id ||
	errand?.pilotId ||
	errand?.pilot_id ||
	null;

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png",
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png",
	shadowUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
});

const PilotDeliveryScreen = ({
	errand,
	pilotId,
	token,
	apiBaseUrl,
	onBack,
	onDeliveryComplete,
}) => {
	const [currentLocation, setCurrentLocation] = useState(null);
	const [distance, setDistance] = useState(0);
	const [speed, setSpeed] = useState(0);
	const [routeHistory, setRouteHistory] = useState([]);
	const [error, setError] = useState(null);
	const [completionChecklist, setCompletionChecklist] = useState([]);
	const [uploadedProofs, setUploadedProofs] = useState([]);
	const [isUploadingProof, setIsUploadingProof] = useState(false);
	const [uploadError, setUploadError] = useState("");
	const [incidentType, setIncidentType] = useState("delay");
	const [incidentDescription, setIncidentDescription] = useState("");
	const [incidentStatus, setIncidentStatus] = useState(null);
	const [incidentError, setIncidentError] = useState("");
	const [isReportingIncident, setIsReportingIncident] = useState(false);
	const [callStatus, setCallStatus] = useState(null);
	const [isCalling, setIsCalling] = useState(false);
	const [activePanel, setActivePanel] = useState("summary");
	const [trackingSessionActive, setTrackingSessionActive] = useState(false);
	const [trackingStatusNotice, setTrackingStatusNotice] = useState("");
	const [lastLivePointAt, setLastLivePointAt] = useState(null);
	const [deliveryCompleted, setDeliveryCompleted] = useState(false);
	const [completionInProgress, setCompletionInProgress] = useState(false);
	const DEV_TEST_LOCATION = {
		latitude: 6.5244,
		longitude: 3.3792,
		accuracy: 15,
	};
	const canUseTestLocation = canUsePilotDevGpsTestMode(apiBaseUrl);
	const {
		tracking: hasLiveFix,
		loadingGps,
		error: trackingError,
		permissionState,
		point,
		queuedPointsCount,
		syncState,
		lastSyncedAt,
		startTracking,
		stopTracking,
	} = usePilotLiveTracking({
		errandId: errand?.id,
		apiBaseUrl,
		token,
		updateInterval: 5000,
		minimumUpdateInterval: 3000,
	});
	const errandStatusKey = normalizeStatusKey(errand?.status);
	const assignedPilotId = getAssignedPilotId(errand);
	const isAssignedToCurrentPilot =
		assignedPilotId && pilotId && String(assignedPilotId) === String(pilotId);
	const hasAcceptedPilotContext =
		errand?._acceptedByPilotId &&
		pilotId &&
		String(errand._acceptedByPilotId) === String(pilotId);
	const canCurrentPilotTrackErrand = Boolean(
		token &&
		apiBaseUrl &&
		errand?.id &&
		TRACKABLE_ERRAND_STATUSES.has(errandStatusKey) &&
		(isAssignedToCurrentPilot || hasAcceptedPilotContext || !assignedPilotId),
	);
	const ownershipTrackingError = !canCurrentPilotTrackErrand && errand?.id
		? assignedPilotId && pilotId && String(assignedPilotId) !== String(pilotId)
			? "Live tracking is unavailable because this errand is assigned to another pilot. Refresh your active jobs."
			: !TRACKABLE_ERRAND_STATUSES.has(errandStatusKey)
				? "Live tracking is unavailable for this errand status. Refresh your jobs list for the latest assignment state."
				: "Live tracking is unavailable until this errand is confirmed for your pilot account."
		: "";

	const markErrandStartedLocally = useCallback((errandId) => {
		if (!errandId) return;
		if (typeof window === "undefined") return;
		try {
			window.localStorage?.removeItem(PILOT_STARTED_ERRANDS_KEY);
			const raw = window.localStorage?.getItem(
				getPilotStartedErrandsStorageKey(pilotId),
			);
			const parsed = raw ? JSON.parse(raw) : [];
			const next = new Set(
				(Array.isArray(parsed) ? parsed : []).map((id) => String(id)),
			);
			next.add(String(errandId));
			window.localStorage?.setItem(
				getPilotStartedErrandsStorageKey(pilotId),
				JSON.stringify(Array.from(next)),
			);
		} catch {
			// ignore
		}
	}, [pilotId]);

	const clearErrandStartedLocally = useCallback((errandId) => {
		if (!errandId) return;
		if (typeof window === "undefined") return;
		try {
			window.localStorage?.removeItem(PILOT_STARTED_ERRANDS_KEY);
			const raw = window.localStorage?.getItem(
				getPilotStartedErrandsStorageKey(pilotId),
			);
			const parsed = raw ? JSON.parse(raw) : [];
			const next = new Set(
				(Array.isArray(parsed) ? parsed : []).map((id) => String(id)),
			);
			next.delete(String(errandId));
			window.localStorage?.setItem(
				getPilotStartedErrandsStorageKey(pilotId),
				JSON.stringify(Array.from(next)),
			);
		} catch {
			// ignore
		}
	}, [pilotId]);

	const buildChecklist = useCallback((currentErrand) => {
		const baseItems = [
			{
				id: "contact",
				label: "Contact client and confirm pickup details",
				done: false,
			},
			{
				id: "pickup-proof",
				label: "Pickup completed + proof captured",
				done: false,
			},
			{
				id: "dropoff-proof",
				label: "Ending step completed + client confirmation",
				done: false,
			},
			{ id: "upload-proof", label: "Upload required photos/docs", done: false },
		];

		if (currentErrand?.note) {
			baseItems.unshift({
				id: "review-notes",
				label: "Review client instructions and confirm any special requests",
				done: false,
			});
		}

		return baseItems;
	}, []);

	const checklistComplete =
		completionChecklist.length > 0 &&
		completionChecklist.every((item) => item.done);
	const nonUploadChecklistComplete = completionChecklist
		.filter((item) => item.id !== "upload-proof")
		.every((item) => item.done);

	const toggleChecklistItem = (itemId) => {
		setCompletionChecklist((prev) =>
			prev.map((item) =>
				item.id === itemId ? { ...item, done: !item.done } : item,
			),
		);
	};

	const markChecklistItem = (itemId, done) => {
		setCompletionChecklist((prev) =>
			prev.map((item) => (item.id === itemId ? { ...item, done } : item)),
		);
	};

	const beginDeliveryOnServer = useCallback(async () => {
		const startResponse = await fetch(
			`${apiBaseUrl}/api/v1/pilots/start-delivery?errand_id=${errand.id}`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!startResponse.ok) {
			const startError = await startResponse.json().catch(() => ({}));
			const detail = String(startError.detail || "");
			const alreadyStarted =
				detail.toLowerCase().includes("already") ||
				detail.toLowerCase().includes("in_progress") ||
				detail.toLowerCase().includes("in progress");
			if (!alreadyStarted) {
				throw new Error(startError.detail || "Unable to start errand");
			}
		}

		markErrandStartedLocally(errand.id);
	}, [apiBaseUrl, errand.id, markErrandStartedLocally, token]);

	const handleProofUpload = async (event) => {
		const files = Array.from(event.target.files || []);
		if (!files.length) return;
		setUploadError("");
		setIsUploadingProof(true);

		try {
			const nextUploads = [];
			for (const file of files) {
				const formData = new FormData();
				formData.append("file", file);
				const response = await fetch(
					`${apiBaseUrl}/api/v1/pilots/errands/${errand.id}/attachments`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
						},
						body: formData,
					},
				);

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.detail || "Upload failed");
				}

				const data = await response.json();
				nextUploads.push({
					id: data.id,
					filename: data.filename || file.name,
					sizeBytes: data.sizeBytes || file.size,
					reviewStatus: data.reviewStatus || "pending",
				});
			}

			setUploadedProofs((prev) => [...prev, ...nextUploads]);
			markChecklistItem("upload-proof", true);
		} catch (err) {
			setUploadError(err.message || "Unable to upload proof");
			markChecklistItem("upload-proof", false);
		} finally {
			setIsUploadingProof(false);
			event.target.value = "";
		}
	};

	const handleIncidentReport = async () => {
		if (!incidentDescription.trim()) {
			setIncidentError("Please describe the incident before submitting.");
			return;
		}

		setIncidentError("");
		setIncidentStatus(null);
		setIsReportingIncident(true);

		try {
			const response = await fetch(`${apiBaseUrl}/api/v1/incidents/report`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					errand_id: errand.id,
					incident_type: incidentType,
					description: incidentDescription.trim(),
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.detail || "Unable to report incident");
			}

			const data = await response.json();
			setIncidentStatus(
				`Incident reported (#${data.incident_id}). ErrandBridge Support has been notified.`,
			);
			setIncidentDescription("");
			window.setTimeout(() => {
				setIncidentStatus(null);
			}, 2200);
		} catch (err) {
			setIncidentError(err.message || "Unable to report incident");
		} finally {
			setIsReportingIncident(false);
		}
	};

	const handleCallCustomer = async () => {
		if (!errand?.id) return;
		setCallStatus(null);
		setIsCalling(true);
		try {
			const response = await fetch(
				`${apiBaseUrl}/voice/call/start?errand_id=${errand.id}`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(payload.detail || "Unable to start masked call");
			}
			setCallStatus("Call started. You will receive a masked call shortly.");
		} catch (err) {
			setCallStatus(err.message || "Unable to start masked call.");
		} finally {
			setIsCalling(false);
		}
	};

	useEffect(() => {
		return () => {
			void stopTracking();
		};
	}, [stopTracking]);

	useEffect(() => {
		if (!point) return;
		setCurrentLocation({
			latitude: point.latitude,
			longitude: point.longitude,
			accuracy: point.accuracy,
			speed: point.speed,
		});
		setTrackingSessionActive(true);
		setLastLivePointAt(point.timestamp ? new Date(point.timestamp) : new Date());
		setTrackingStatusNotice("Live location is being shared with the client.");
		setError(null);
		setRouteHistory((prev) => {
			const nextPoint = [point.latitude, point.longitude];
			if (
				prev.length === 0 ||
				Math.abs(prev[prev.length - 1][0] - nextPoint[0]) > 0.00001 ||
				Math.abs(prev[prev.length - 1][1] - nextPoint[1]) > 0.00001
			) {
				return [...prev, nextPoint];
			}
			return prev;
		});
		if (point.speed !== null && point.speed !== undefined) {
			setSpeed(Math.max(0, Math.round(point.speed * 3.6)));
		}
	}, [point]);

	useEffect(() => {
		if (!trackingError) return;
		setError(trackingError);
		if (TERMINAL_TRACKING_ERROR_PATTERN.test(trackingError)) {
			setTrackingSessionActive(false);
			setTrackingStatusNotice("");
			return;
		}
		if (!loadingGps && !hasLiveFix) {
			setTrackingSessionActive(false);
		}
	}, [hasLiveFix, loadingGps, trackingError]);

	useEffect(() => {
		if (!ownershipTrackingError) return;
		if (!trackingSessionActive && !hasLiveFix && !loadingGps) {
			setError(ownershipTrackingError);
			return;
		}
		void stopTracking({ preservePoint: true });
		clearErrandStartedLocally(errand?.id);
		setTrackingSessionActive(false);
		setTrackingStatusNotice("");
		setError(ownershipTrackingError);
	}, [
		clearErrandStartedLocally,
		errand?.id,
		hasLiveFix,
		loadingGps,
		ownershipTrackingError,
		stopTracking,
		trackingSessionActive,
	]);

	useEffect(() => {
		void stopTracking();
		setCompletionChecklist(buildChecklist(errand));
		setUploadedProofs([]);
		setUploadError("");
		setActivePanel("summary");
		setTrackingSessionActive(false);
		setTrackingStatusNotice("");
		setLastLivePointAt(null);
		setCurrentLocation(null);
		setRouteHistory([]);
		setSpeed(0);
		setDistance(0);
		setError(ownershipTrackingError || null);
		setCallStatus(null);
		setIncidentStatus(null);
		setIncidentError("");
		setDeliveryCompleted(false);
		setCompletionInProgress(false);
	}, [buildChecklist, errand, ownershipTrackingError, stopTracking]);

	// Start tracking errand
	const handleStartDelivery = async () => {
		if (completionInProgress || deliveryCompleted) return;
		setError(null);
		setTrackingStatusNotice("");
		if (ownershipTrackingError) {
			clearErrandStartedLocally(errand?.id);
			setTrackingSessionActive(false);
			setError(ownershipTrackingError);
			return;
		}

		try {
			await beginDeliveryOnServer();
			setTrackingStatusNotice(
				"Errand started. We’re now requesting live location for the client.",
			);

			const watchStarted = await startTracking();
			if (!watchStarted) {
				setTrackingSessionActive(false);
				setTrackingStatusNotice(
					"Errand started, but live location is still waiting for GPS permission or signal.",
				);
				return;
			}
			setTrackingSessionActive(true);
			setTrackingStatusNotice(
				"Live tracking started. The client can now follow your route in real time.",
			);
		} catch (err) {
			setTrackingSessionActive(false);
			setError(
				err?.message ||
				"Failed to start errand tracking. Check location permissions.",
			);
			console.error("[pilot] start errand failed", err);
		}
	};

	const handleUseTestLocation = async () => {
		if (completionInProgress || deliveryCompleted) return;
		if (!canUseTestLocation) return;
		setError(null);
		setTrackingStatusNotice("");
		if (ownershipTrackingError) {
			clearErrandStartedLocally(errand?.id);
			setTrackingSessionActive(false);
			setError(ownershipTrackingError);
			return;
		}
		try {
			await beginDeliveryOnServer();
			setTrackingStatusNotice(
				"Errand started. We’re now requesting live location for the client.",
			);

			const watchStarted = await startTracking({ devPoint: DEV_TEST_LOCATION });
			if (!watchStarted) {
				setTrackingSessionActive(false);
				setTrackingStatusNotice(
					"Errand started, but live location is still waiting for GPS permission or signal.",
				);
				return;
			}
			setTrackingSessionActive(true);
			setTrackingStatusNotice("Test live tracking started for local web testing.");
		} catch (err) {
			setTrackingSessionActive(false);
			setError(err?.message || "Unable to use test location.");
		}
	};

	// Stop tracking and complete errand
	const handleCompleteDelivery = async () => {
		if (completionInProgress || deliveryCompleted) return;
		if (!checklistComplete) {
			setError(
				"Please complete all checklist items before marking the errand complete.",
			);
			return;
		}
		setCompletionInProgress(true);
		setError(null);
		setTrackingStatusNotice("Completing errand…");
		await stopTracking();
		setTrackingSessionActive(false);

		try {
			const completeResponse = await fetch(
				`${apiBaseUrl}/api/v1/pilots/complete-delivery?errand_id=${errand.id}`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (!completeResponse.ok) {
				const completeError = await completeResponse.json().catch(() => ({}));
				throw new Error(completeError.detail || "Unable to complete errand");
			}

			clearErrandStartedLocally(errand.id);
			setDeliveryCompleted(true);
			setTrackingStatusNotice("Errand completed. Returning to jobs…");

			// Call parent callback
			if (onDeliveryComplete) {
				await Promise.resolve(
					onDeliveryComplete({
						errandId: errand.id,
						finalLocation: currentLocation,
						routeHistory,
						totalDistance: distance,
					}),
				);
			}
			setCompletionInProgress(false);
		} catch (err) {
			setError(err.message || "Unable to complete errand");
			setTrackingStatusNotice("");
			setCompletionInProgress(false);
		}
	};

	// Calculate distance between two points (Haversine formula)
	const haversineDistance = useCallback((lat1, lon1, lat2, lon2) => {
		const R = 6371; // Earth's radius in km
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLon = ((lon2 - lon1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}, []);

	// Calculate total distance from route history
	useEffect(() => {
		if (routeHistory.length > 1) {
			let totalDist = 0;
			for (let i = 1; i < routeHistory.length; i++) {
				totalDist += haversineDistance(
					routeHistory[i - 1][0],
					routeHistory[i - 1][1],
					routeHistory[i][0],
					routeHistory[i][1],
				);
			}
			setDistance(totalDist);
		}
	}, [haversineDistance, routeHistory]);

	const customerName = errand?.customer_name || "Customer";
	const errandArchivedForPilot = ["completed", "delivered", "archived"].includes(
		errandStatusKey,
	);
	const communicationLocked = deliveryCompleted || errandArchivedForPilot;
	const pickupLocation = errand?.pickup_location || "Pickup pending";
	const endingLocationRaw = errand?.dropoff_location || errand?.delivery_location || "";
	const endingLocation = String(endingLocationRaw || "").trim();
	const routeLabel = endingLocation ? `${pickupLocation} → ${endingLocation}` : pickupLocation;
	const endingLocationLabel = endingLocation || "Not provided";
	const amountLabel =
		errand?.amount !== undefined && errand?.amount !== null
			? `₦${errand.amount}`
			: "Amount pending";
	const errandTitle = errand?.title || "Errand in progress";
	const routePointCount = routeHistory.length;
	const liveTrackingLabel = trackingSessionActive
		? hasLiveFix
			? "Live tracking active"
			: "Getting live location…"
		: "Waiting to start live tracking";
	const statusPillLabel = trackingSessionActive
		? hasLiveFix
			? "Live"
			: "GPS"
		: "Ready";
	const showGpsWaitingState = trackingSessionActive && !hasLiveFix;
	const permissionHint =
		permissionState === "denied"
			? "Location access is blocked in the browser. Enable geolocation permission to continue sharing live updates."
			: permissionState === "granted"
				? "Location permission granted."
				: "Location permission will be requested when you start the errand.";
	const lastUpdatedLabel = lastLivePointAt
		? lastLivePointAt.toLocaleTimeString([], {
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
		})
		: null;
	const lastSyncedLabel = lastSyncedAt
		? new Date(lastSyncedAt).toLocaleTimeString([], {
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
		})
		: null;
	const queuedPointsLabel = queuedPointsCount
		? `${queuedPointsCount} stored update${queuedPointsCount === 1 ? "" : "s"}`
		: "";
	const syncHealthNotice =
		syncState === "offline_queueing"
			? `Offline — storing ${queuedPointsLabel || "location updates"} locally until the connection returns.`
			: syncState === "syncing"
				? `Replaying ${queuedPointsLabel || "stored location updates"} to the server.`
				: syncState === "live" && lastSyncedLabel
					? `Tracking synced at ${lastSyncedLabel}.`
					: "";
	const sheetTabs = [
		{ key: "summary", label: "Summary" },
		{ key: "checklist", label: "Checklist" },
		{ key: "incident", label: "Incident" },
	];
	if (!communicationLocked) {
		sheetTabs.splice(2, 0, { key: "chat", label: "Chat" });
	}

	useEffect(() => {
		if (communicationLocked && activePanel === "chat") {
			setActivePanel("summary");
		}
	}, [activePanel, communicationLocked]);
	const quickReplyChips = [
		"I’m on the way",
		"I’ve arrived",
		"Please confirm location",
		"Running slightly late",
	];
	const chatSystemMessages = [
		"This chat is for errand coordination only.",
		"Messages are visible to the client.",
	];

	const renderSheetPanel = () => {
		switch (activePanel) {
			case "checklist":
				return (
					<div className="pilot-delivery-sheet__panel pilot-delivery-sheet__panel--scrollable">
						<div className="pilot-delivery-card pilot-delivery-card--warm">
							<div className="checklist-header">
								<h4>✅ Completion Checklist</h4>
								<span
									className={
										checklistComplete
											? "checklist-status complete"
											: "checklist-status pending"
									}
								>
									{checklistComplete ? "All steps done" : "Steps remaining"}
								</span>
							</div>
							<p className="checklist-hint">
								Complete every item before finishing the errand. Proof upload unlocks
								after the route steps are done.
							</p>
							<ul className="pilot-delivery-checklist__list">
								{completionChecklist.map((item) => (
									<li key={item.id}>
										<label>
											<input
												className="pilot-delivery-checklist__checkbox"
												type="checkbox"
												checked={item.done}
												onChange={() => toggleChecklistItem(item.id)}
												disabled={item.id === "upload-proof"}
											/>
											<span>{item.label}</span>
										</label>
									</li>
								))}
							</ul>
						</div>

						<div className="pilot-delivery-card pilot-delivery-card--cool">
							<div className="proof-header">
								<h4>📎 Upload receipts / proof</h4>
								<span className="proof-status">
									{uploadedProofs.length > 0
										? `${uploadedProofs.length} uploaded`
										: nonUploadChecklistComplete
											? "Required"
											: "Locked"}
								</span>
							</div>
							<p className="proof-hint">
								Upload the receipt or proof of completion for admin verification.
							</p>
							<input
								className="proof-upload-input"
								type="file"
								multiple
								onChange={handleProofUpload}
								disabled={isUploadingProof || !nonUploadChecklistComplete}
							/>
							{uploadError && <p className="upload-error">⚠️ {uploadError}</p>}
							{uploadedProofs.length > 0 && (
								<ul className="proof-list">
									{uploadedProofs.map((file) => (
										<li key={file.id || file.filename}>
											<span>{file.filename}</span>
											<span className="proof-status-pill">{file.reviewStatus}</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				);
			case "chat":
				if (communicationLocked) {
					return null;
				}
				return (
					<div className="pilot-delivery-sheet__panel pilot-delivery-sheet__panel--chat">
						<div className="pilot-delivery-chat-room">
							<div className="pilot-delivery-chat-room__header">
								<div>
									<h4>💬 Chat with client</h4>
									<p>
										Send arrival notices, timing updates, and pickup/ending coordination without leaving the active flow.
									</p>
								</div>
								<span className="pilot-delivery-chat-room__badge">Live coordination</span>
							</div>
							<ErrandChatPanel
								errandId={errand?.id}
								apiBaseUrl={apiBaseUrl}
								token={token}
								variant="room"
								showHeader={false}
								quickReplies={quickReplyChips}
								smartQuickReplies
								systemMessages={chatSystemMessages}
								placeholder="Type a coordination update..."
								disabled={communicationLocked}
								disabledMessage="Chat is unavailable because this errand has already been completed."
							/>
						</div>
					</div>
				);
			case "incident":
				return (
					<div className="pilot-delivery-sheet__panel pilot-delivery-sheet__panel--scrollable">
						<div className="pilot-delivery-card pilot-delivery-card--danger">
							<div className="proof-header">
								<h4>🚨 Report an incident</h4>
								<span className="proof-status">Immediate admin alert</span>
							</div>
							<p className="proof-hint">
								Use this for delays, customer issues, or safety concerns. The admin
								team will be notified right away.
							</p>
							<div className="incident-form">
								<div className="incident-form__field">
									<label htmlFor="pilot-incident-type">Issue type</label>
									<div className="incident-form__control-shell incident-form__control-shell--select">
										<select
											id="pilot-incident-type"
											className="incident-form__control"
											value={incidentType}
											onChange={(event) => setIncidentType(event.target.value)}
											aria-label="Incident type"
										>
											<option value="delay">Delay</option>
											<option value="traffic">Traffic</option>
											<option value="customer_issue">Customer issue</option>
											<option value="safety">Safety concern</option>
											<option value="other">Other</option>
										</select>
									</div>
								</div>
								<div className="incident-form__field">
									<label htmlFor="pilot-incident-description">Details</label>
									<div className="incident-form__control-shell incident-form__control-shell--textarea">
										<textarea
											id="pilot-incident-description"
											className="incident-form__control incident-form__control--textarea"
											rows="4"
											placeholder="Describe the issue so the admin can assist"
											value={incidentDescription}
											onChange={(event) => setIncidentDescription(event.target.value)}
											aria-label="Incident description"
										/>
									</div>
								</div>
								<button
									type="button"
									className="btn btn-secondary incident-form__submit"
									onClick={handleIncidentReport}
									disabled={isReportingIncident}
								>
									{isReportingIncident ? "Sending..." : "Send Incident Report"}
								</button>
								{incidentError && <p className="upload-error">⚠️ {incidentError}</p>}
								{incidentStatus && <p className="proof-hint">✅ {incidentStatus}</p>}
							</div>
						</div>
					</div>
				);
			case "summary":
			default:
				return (
					<div className="pilot-delivery-sheet__panel pilot-delivery-sheet__panel--scrollable">
						<div className="pilot-delivery-card pilot-delivery-card--neutral">
							<div className="pilot-delivery-card__header">
								<div>
									<h4>📦 Errand summary</h4>
									<p>{customerName} • {amountLabel}</p>
								</div>
								<span className="pilot-delivery-card__pill">{liveTrackingLabel}</span>
							</div>
							<div className="pilot-delivery-detail-grid">
								<div className="pilot-delivery-detail">
									<span>Pickup</span>
									<strong>{pickupLocation}</strong>
								</div>
								<div className="pilot-delivery-detail">
									<span>Ending location</span>
									<strong>{endingLocationLabel}</strong>
								</div>
							</div>
							{errand?.note && (
								<div className="pilot-delivery-note">
									<strong>Client note</strong>
									<p>{errand.note}</p>
								</div>
							)}
						</div>

						<div className="pilot-delivery-card pilot-delivery-card--cool">
							<div className="proof-header">
								<h4>📞 Call client (masked)</h4>
								<span className="proof-status">Protected</span>
							</div>
							<p className="proof-hint">
								Calls are routed through ErrandBridge and recorded for internal audit, data compliance, and protection.
							</p>
							<button
								type="button"
								className="btn-primary"
								onClick={handleCallCustomer}
								disabled={isCalling || communicationLocked}
							>
								{communicationLocked
									? "Call unavailable"
									: isCalling
										? "Calling…"
										: "Call via ErrandBridge"}
							</button>
							{communicationLocked ? (
								<p className="proof-hint">
									Chat and calling are disabled after the errand is completed.
								</p>
							) : null}
							{callStatus && <p className="upload-error">{callStatus}</p>}
						</div>

						<div className="pilot-delivery-card pilot-delivery-card--neutral pilot-delivery-card--metrics">
							<div>
								<span>Checklist progress</span>
								<strong>
									{completionChecklist.filter((item) => item.done).length}/
									{completionChecklist.length}
								</strong>
							</div>
							<div>
								<span>Proofs uploaded</span>
								<strong>{uploadedProofs.length}</strong>
							</div>
						</div>
					</div>
				);
		}
	};

	return (
		<div className={`pilot-delivery-screen ${activePanel === "chat" ? "pilot-delivery-screen--chat-active" : ""}`}>
			<header className="pilot-delivery-screen__header">
				<div className="pilot-delivery-screen__eyebrow-row">
					<span
						className={`pilot-delivery-screen__status-pill ${trackingSessionActive ? "pilot-delivery-screen__status-pill--live" : "pilot-delivery-screen__status-pill--idle"}`}
					>
						{statusPillLabel}
					</span>
					<span className="pilot-delivery-screen__reference">
						Errand #{errand?.id || "-"}
					</span>
				</div>
				<div className="pilot-delivery-screen__header-main">
					<div className="pilot-delivery-screen__title-block">
						<p className="pilot-delivery-screen__label">Active errand</p>
						<h2>{errandTitle}</h2>
						<p className="pilot-delivery-screen__route">
							{customerName} · {routeLabel}
						</p>
					</div>
					{onBack && (
						<button
							type="button"
							className="pilot-delivery-screen__back"
							onClick={onBack}
						>
							← Back to Active Queue
						</button>
					)}
				</div>
			</header>

			<section className="pilot-delivery-map-shell" aria-label="Errand map">
				<div className="pilot-delivery-map-shell__frame">
					{currentLocation ? (
						<MapContainer
							center={[currentLocation.latitude, currentLocation.longitude]}
							zoom={15}
							style={{ height: "100%" }}
							key={`${currentLocation.latitude}-${currentLocation.longitude}`}
						>
							<TileLayer
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
								attribution="&copy; OpenStreetMap contributors"
							/>
							{routeHistory.length > 1 && (
								<Polyline
									positions={routeHistory}
									color="#FF6B6B"
									weight={4}
									opacity={0.76}
								/>
							)}
							<Marker
								position={[currentLocation.latitude, currentLocation.longitude]}
								icon={L.icon({
									iconUrl:
										"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI0ZGNkI2QiIvPjwvc3ZnPg==",
									iconSize: [24, 24],
									iconAnchor: [12, 12],
								})}
							>
								<Popup>
									<div className="location-popup">
										<p>
											<strong>Current Location</strong>
										</p>
										<p>
											{currentLocation.latitude.toFixed(6)},
											{currentLocation.longitude.toFixed(6)}
										</p>
										<p>Accuracy: ±{currentLocation.accuracy}m</p>
									</div>
								</Popup>
							</Marker>
						</MapContainer>
					) : (
						<div className="pilot-delivery-map-shell__fallback">
							<span className="pilot-delivery-map-shell__fallback-badge">
								{showGpsWaitingState ? "Getting GPS" : "Map preview"}
							</span>
							<h3>
								{showGpsWaitingState
									? "Finding your live location…"
									: "Start errand to activate the live map"}
							</h3>
							<p>
								{showGpsWaitingState
									? error || "We’re waiting for a stable GPS fix before dropping you on the map."
									: "The map becomes live as soon as tracking starts, so the customer can follow your route in real time."}
							</p>
							<div className="pilot-delivery-map-shell__fallback-route">
								<div>
									<span>Pickup</span>
									<strong>{pickupLocation}</strong>
								</div>
								<div>
									<span>Ending location</span>
									<strong>{endingLocationLabel}</strong>
								</div>
							</div>
						</div>
					)}

					<div className="pilot-delivery-map-shell__overlay">
						<div className="pilot-delivery-map-stat">
							<span>Distance</span>
							<strong>{distance.toFixed(2)} km</strong>
						</div>
						<div className="pilot-delivery-map-stat">
							<span>Speed</span>
							<strong>{speed} km/h</strong>
						</div>
						<div className="pilot-delivery-map-stat">
							<span>Accuracy</span>
							<strong>{currentLocation?.accuracy ? `±${Math.round(currentLocation.accuracy)}m` : "-"}</strong>
						</div>
						<div className="pilot-delivery-map-stat">
							<span>Points</span>
							<strong>{routePointCount}</strong>
						</div>
					</div>
				</div>
			</section>

			{(trackingStatusNotice || syncHealthNotice || lastUpdatedLabel || permissionHint) && (
				<div className="pilot-delivery-sheet__alert" role="status">
					{trackingStatusNotice || syncHealthNotice || permissionHint}
					{lastUpdatedLabel ? ` · Last updated ${lastUpdatedLabel}` : ""}
				</div>
			)}

			<section className={`pilot-delivery-sheet ${activePanel === "chat" ? "pilot-delivery-sheet--chat" : ""}`} aria-label="Errand controls">
				<div className="pilot-delivery-sheet__handle" aria-hidden="true" />
				<div className="pilot-delivery-sheet__tabs" role="tablist" aria-label="Errand sections">
					{sheetTabs.map((tab) => (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={activePanel === tab.key}
							className={`pilot-delivery-sheet__tab ${activePanel === tab.key ? "pilot-delivery-sheet__tab--active" : ""}`}
							onClick={() => setActivePanel(tab.key)}
						>
							{tab.label}
						</button>
					))}
				</div>

				{error && <div className="pilot-delivery-sheet__alert">⚠️ {error}</div>}

				<div className={`pilot-delivery-sheet__body ${activePanel === "chat" ? "pilot-delivery-sheet__body--chat" : ""}`}>{renderSheetPanel()}</div>

				<div className="pilot-delivery-sheet__footer">
					{completionInProgress ? (
						<>
							<button
								type="button"
								className="btn btn-primary btn-lg pilot-delivery-sheet__busy-btn"
								disabled
								aria-busy="true"
							>
								<span className="pilot-delivery-inline-spinner" aria-hidden="true" />
								Completing errand…
							</button>
							<p className="pilot-delivery-sheet__helper">
								Please keep this screen open while we finish and return you to Jobs.
							</p>
						</>
					) : deliveryCompleted || errandArchivedForPilot ? (
						<>
							<div className="pilot-delivery-sheet__completion" role="status">
								<span className="pilot-delivery-sheet__completion-title">✅ Errand completed</span>
								<span className="pilot-delivery-sheet__completion-subtitle">
									You can safely go back to your jobs list.
								</span>
							</div>
							{onBack && (
								<button
									type="button"
									className="btn btn-secondary btn-lg"
									onClick={onBack}
								>
									← Back to Jobs
								</button>
							)}
						</>
					) : !trackingSessionActive ? (
						<>
							<button
								type="button"
								className="btn btn-primary btn-lg"
								onClick={handleStartDelivery}
								disabled={loadingGps || Boolean(ownershipTrackingError)}
							>
								{loadingGps ? "Getting GPS…" : "🚀 Start Errand"}
							</button>
								{canUseTestLocation && (
								<button
									type="button"
									className="btn btn-secondary btn-lg"
									onClick={handleUseTestLocation}
									disabled={loadingGps}
										title="Dev/test mode: bypass browser geolocation"
								>
										🧪 Use test location (local web)
								</button>
							)}
							<p className="pilot-delivery-sheet__helper">
								Start errand tracking to request location permission, light up the map, and share your route with the customer.
							</p>
						</>
					) : (
						<>
							<button
								type="button"
								className="btn btn-success btn-lg"
								onClick={handleCompleteDelivery}
								disabled={!checklistComplete}
								title={
									!checklistComplete
										? "Complete all checklist items first"
										: "Complete Errand"
								}
							>
								✓ Complete Errand
							</button>
							<p className="pilot-delivery-sheet__helper">
								{hasLiveFix
									? "Your location is being streamed to the customer in real time."
									: "Getting live location… keep the app open while GPS locks in."}
							</p>
						</>
					)}
				</div>
			</section>
		</div>
	);
};

export default PilotDeliveryScreen;
