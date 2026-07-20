/**
 * Pilot Location Tracker Component
 * Real-time satellite navigation map using Leaflet + OpenStreetMap
 * Shows pilot location, route history, and ETA
 */

import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import "./PilotTracker.css";

// Fix for default Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
	iconUrl: require("leaflet/dist/images/marker-icon.png"),
	shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const PilotTracker = ({ errandId, apiBaseUrl = "", isCustomer = false }) => {
	const mapContainer = useRef(null);
	const map = useRef(null);
	const [currentLocation, setCurrentLocation] = useState(null);
	const [routeHistory, setRouteHistory] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pilotName, setPilotName] = useState("");
	const [distance, setDistance] = useState(0);
	const [eta, setEta] = useState(null);
	const [connectionState, setConnectionState] = useState("connecting");
	const [statusNotice, setStatusNotice] = useState("");
	const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
	const wsRef = useRef(null);
	const markerRef = useRef(null);
	const polylineRef = useRef(null);
	const reconnectAttemptRef = useRef(0);
	const reconnectTimerRef = useRef(null);
	const fallbackPollRef = useRef(null);
	const lastLocationKeyRef = useRef("");
	const currentLocationRef = useRef(null);
	const shouldReconnectRef = useRef(true);
	const normalizedApiBase = apiBaseUrl ? apiBaseUrl.replace(/\/$/, "") : "";
	const authToken =
		localStorage.getItem("authToken") || localStorage.getItem("token") || "";

	const getLocationKey = useCallback((location) => {
		if (!location) return "";
		return [
			location.latitude,
			location.longitude,
			location.created_at || location.timestamp || "",
			location.status || "",
			location.tracking_paused ? "paused" : "live",
		].join(":");
	}, []);

	const appendLocationToHistory = useCallback(
		(location) => {
			if (!location) return;
			const locationKey = getLocationKey(location);
			if (!locationKey || locationKey === lastLocationKeyRef.current) return;
			lastLocationKeyRef.current = locationKey;
			setRouteHistory((prev) => {
				const next = Array.isArray(prev) ? [...prev] : [];
				const hasMatch = next.some(
					(item) => getLocationKey(item) === locationKey,
				);
				if (hasMatch) return prev;
				next.push(location);
				return next;
			});
		},
		[getLocationKey],
	);

	const applyLatestLocation = useCallback(
		(location, options = {}) => {
			if (!location) return;
			setCurrentLocation(location);
			setPilotName((prev) => location.pilot_id || prev || "");
			setLastUpdatedAt(location.created_at || location.timestamp || new Date().toISOString());
			if (options.appendHistory !== false) {
				appendLocationToHistory(location);
			}
		},
		[appendLocationToHistory],
	);

	const buildApiUrl = useCallback(
		(path) => (normalizedApiBase ? `${normalizedApiBase}${path}` : path),
		[normalizedApiBase],
	);

	useEffect(() => {
		currentLocationRef.current = currentLocation;
	}, [currentLocation]);

	const buildWsUrl = useCallback(() => {
		const authToken =
			localStorage.getItem("authToken") || localStorage.getItem("token");
		const tokenParam = authToken
			? `?token=${encodeURIComponent(authToken)}`
			: "";

		if (normalizedApiBase) {
			try {
				const parsed = new URL(normalizedApiBase);
				const wsProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
				return `${wsProtocol}//${parsed.host}/api/v1/tracking/ws/${errandId}${tokenParam}`;
			} catch (err) {
				console.warn(
					"Unable to parse apiBaseUrl for WebSocket, falling back to window location.",
					err,
				);
			}
		}

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/api/v1/tracking/ws/${errandId}${tokenParam}`;
	}, [normalizedApiBase, errandId]);

	const fetchLocationData = useCallback(async (options = {}) => {
		const silent = options.silent === true;
		if (!silent) {
			setLoading(true);
		}
		setError(null);

		try {
			const authHeaders = authToken
				? { Authorization: `Bearer ${authToken}` }
				: {};

			const [currentRes, historyRes] = await Promise.all([
				axios.get(buildApiUrl(`/api/v1/tracking/current/${errandId}`), {
					headers: authHeaders,
				}),
				axios.get(buildApiUrl(`/api/v1/tracking/history/${errandId}`), {
					headers: authHeaders,
				}),
			]);

			if (historyRes?.data) {
				const locations = historyRes.data.locations || [];
				setRouteHistory(locations);
				setDistance(historyRes.data.distance_traveled || 0);
				setPilotName(historyRes.data.pilot_id || "");
				if (locations.length > 0) {
					lastLocationKeyRef.current = getLocationKey(locations[locations.length - 1]);
				}
			}

			if (currentRes?.data) {
				applyLatestLocation(currentRes.data, { appendHistory: false });
				setStatusNotice(
					currentRes.data?.tracking_paused
						? "Pilot tracking is paused. Showing the last known location."
						: "Live tracking connected.",
				);
			} else if (!silent) {
				setStatusNotice("Waiting for the pilot to share their live location.");
			}
		} catch (err) {
			const message =
				err.response?.data?.detail ||
				err.message ||
				"Failed to load tracking data";
			setError(message);
			setStatusNotice(
				currentLocationRef.current
					? "Realtime updates paused. Retrying in the background."
					: message,
			);
		} finally {
			if (!silent) {
				setLoading(false);
			}
		}
	}, [applyLatestLocation, authToken, buildApiUrl, errandId, getLocationKey]);

	// Initialize map
	useEffect(() => {
		if (!mapContainer.current) return;

		map.current = L.map(mapContainer.current).setView([9.082, 8.6753], 13); // Default: Nigeria

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "© OpenStreetMap contributors",
			maxZoom: 19,
		}).addTo(map.current);

		return () => {
			shouldReconnectRef.current = false;
			if (reconnectTimerRef.current) {
				window.clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = null;
			}
			if (fallbackPollRef.current) {
				window.clearInterval(fallbackPollRef.current);
				fallbackPollRef.current = null;
			}
			if (map.current) {
				map.current.remove();
			}
		};
	}, []);

	useEffect(() => {
		fetchLocationData();
	}, [fetchLocationData]);

	// Update map with current location
	useEffect(() => {
		if (!map.current || !currentLocation) return;

		const { latitude, longitude } = currentLocation;

		// Update marker
		if (markerRef.current) {
			markerRef.current.setLatLng([latitude, longitude]);
		} else {
			markerRef.current = L.marker([latitude, longitude], {
				icon: L.icon({
					iconUrl:
						"https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
					shadowUrl:
						"https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
					iconSize: [25, 41],
					iconAnchor: [12, 41],
					popupAnchor: [1, -34],
					shadowSize: [41, 41],
				}),
				title: `${pilotName || "Pilot"}`,
			})
				.bindPopup(`
          <div class="popup-content">
            <h4>${pilotName || "Pilot"}</h4>
            <p>Lat: ${latitude.toFixed(6)}</p>
            <p>Lon: ${longitude.toFixed(6)}</p>
            <p>Speed: ${currentLocation.speed ? currentLocation.speed.toFixed(1) : "N/A"} km/h</p>
            <p>Accuracy: ${currentLocation.accuracy ? currentLocation.accuracy.toFixed(0) : "N/A"} m</p>
          </div>
        `)
				.addTo(map.current);
		}

		// Fit map to marker
		map.current.setView([latitude, longitude], 15);
	}, [currentLocation, pilotName]);

	// Draw route polyline
	useEffect(() => {
		if (!map.current || routeHistory.length < 2) return;

		if (polylineRef.current) {
			map.current.removeLayer(polylineRef.current);
		}

		const latlngs = routeHistory.map((loc) => [loc.latitude, loc.longitude]);

		polylineRef.current = L.polyline(latlngs, {
			color: "#FF6B6B",
			weight: 3,
			opacity: 0.7,
			smoothFactor: 1,
		}).addTo(map.current);

		// Fit map to entire route
		const bounds = L.latLngBounds(latlngs);
		map.current.fitBounds(bounds, { padding: [50, 50] });
	}, [routeHistory]);

	const trackerStatus = useMemo(() => {
		if (currentLocation?.tracking_paused) {
			return { label: "Paused", tone: "inactive" };
		}
		const statusKey = String(currentLocation?.status || "").toLowerCase();
		if (["delivered", "completed"].includes(statusKey)) {
			return { label: "Completed", tone: "inactive" };
		}
		if (connectionState === "connected") {
			return { label: "Live", tone: "active" };
		}
		if (connectionState === "reconnecting") {
			return { label: "Reconnecting", tone: "warning" };
		}
		if (currentLocation) {
			return { label: "Last known", tone: "warning" };
		}
		return { label: "Waiting", tone: "inactive" };
	}, [connectionState, currentLocation]);

	const refreshFromApi = useCallback(async () => {
		await fetchLocationData({ silent: true });
	}, [fetchLocationData]);

	const scheduleReconnect = useCallback(() => {
		if (!shouldReconnectRef.current) return;
		const attempt = reconnectAttemptRef.current + 1;
		reconnectAttemptRef.current = attempt;
		const delay = Math.min(1000 * 2 ** (attempt - 1), 15000);
		setConnectionState("reconnecting");
		setStatusNotice("Realtime connection lost. Reconnecting…");
		if (!fallbackPollRef.current) {
			fallbackPollRef.current = window.setInterval(() => {
				refreshFromApi();
			}, 15000);
		}
		reconnectTimerRef.current = window.setTimeout(() => {
			if (!shouldReconnectRef.current) return;
			const ws = new WebSocket(buildWsUrl());
			wsRef.current = ws;
		}, delay);
	}, [buildWsUrl, refreshFromApi]);

	// Connect WebSocket for real-time updates
	useEffect(() => {
		shouldReconnectRef.current = true;

		const connect = () => {
			const ws = new WebSocket(buildWsUrl());
			wsRef.current = ws;
			setConnectionState("connecting");

			ws.onopen = () => {
				reconnectAttemptRef.current = 0;
				setConnectionState("connected");
				setError(null);
				setStatusNotice("Live updates connected.");
				if (reconnectTimerRef.current) {
					window.clearTimeout(reconnectTimerRef.current);
					reconnectTimerRef.current = null;
				}
				if (fallbackPollRef.current) {
					window.clearInterval(fallbackPollRef.current);
					fallbackPollRef.current = null;
				}
				ws.send(JSON.stringify({ type: "ping" }));
			};

			ws.onmessage = (event) => {
				const data = JSON.parse(event.data);

				if (data.type === "location_update" && data.location) {
					applyLatestLocation(data.location);
					if (typeof data.distance_traveled === "number") {
						setDistance(data.distance_traveled);
					}
					setStatusNotice(
						data.location?.tracking_paused
							? "Pilot tracking is paused. Showing the last known location."
							: "Pilot location updated live.",
					);
					if (data.eta) {
						setEta(new Date(data.eta));
					}
				}

				if (data.type === "tracking_unavailable") {
					setError(data.reason || "Tracking is currently unavailable.");
					setStatusNotice(data.reason || "Tracking is currently unavailable.");
				}
			};

			ws.onerror = () => {
				setConnectionState("reconnecting");
			};

			ws.onclose = () => {
				if (!shouldReconnectRef.current) return;
				scheduleReconnect();
			};
		};

		connect();

		return () => {
			shouldReconnectRef.current = false;
			if (reconnectTimerRef.current) {
				window.clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = null;
			}
			if (fallbackPollRef.current) {
				window.clearInterval(fallbackPollRef.current);
				fallbackPollRef.current = null;
			}
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, [applyLatestLocation, buildWsUrl, scheduleReconnect]);

	if (loading) {
		return <div className="tracker-loading">Loading location data...</div>;
	}

	if (error && !currentLocation) {
		return <div className="tracker-error">Error: {error}</div>;
	}

	return (
		<div className="pilot-tracker">
			{/* Map Container */}
			<div ref={mapContainer} className="tracker-map" />

			{/* Info Panel */}
			<div className="tracker-info">
				<div className="info-header">
					<h2>📍 Live Pilot Tracking</h2>
					<span className={`status ${trackerStatus.tone}`}>
						● {trackerStatus.label}
					</span>
				</div>

				{statusNotice ? (
					<div className="tracker-notice" role="status">
						{statusNotice}
					</div>
				) : null}

				{error ? <div className="tracker-warning">⚠️ {error}</div> : null}

				<div className="info-details">
					<div className="detail-row">
						<span className="label">Pilot:</span>
						<span className="value">{pilotName || "Loading..."}</span>
					</div>

					{currentLocation && (
						<>
							<div className="detail-row">
								<span className="label">Current Speed:</span>
								<span className="value">
									{currentLocation.speed
										? `${currentLocation.speed.toFixed(1)} km/h`
										: "N/A"}
								</span>
							</div>

							<div className="detail-row">
								<span className="label">Coordinates:</span>
								<span className="value">
									{currentLocation.latitude.toFixed(6)},{" "}
									{currentLocation.longitude.toFixed(6)}
								</span>
							</div>

							<div className="detail-row">
								<span className="label">Last updated:</span>
								<span className="value">
									{lastUpdatedAt
										? new Date(lastUpdatedAt).toLocaleTimeString()
										: "Waiting for first update"}
								</span>
							</div>

							<div className="detail-row">
								<span className="label">Distance Traveled:</span>
								<span className="value">{distance.toFixed(2)} km</span>
							</div>

							{eta && (
								<div className="detail-row">
									<span className="label">Estimated Arrival:</span>
									<span className="value">
										{new Date(eta).toLocaleTimeString()}
									</span>
								</div>
							)}
						</>
					)}

					<div className="route-stats">
						<div className="stat">
							<span className="stat-label">Total Points</span>
							<span className="stat-value">{routeHistory.length}</span>
						</div>
						<div className="stat">
							<span className="stat-label">Accuracy</span>
							<span className="stat-value">
								{currentLocation?.accuracy
									? `±${currentLocation.accuracy.toFixed(0)}m`
									: "N/A"}
							</span>
						</div>
					</div>
				</div>

				{!isCustomer && (
					<div className="tracking-controls">
						<button
							type="button"
							onClick={() => fetchLocationData()}
							className="btn-refresh"
						>
							🔄 Refresh
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default PilotTracker;
