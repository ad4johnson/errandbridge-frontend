import { Geolocation } from "@capacitor/geolocation";
import { useCallback, useEffect, useRef, useState } from "react";
import { canUsePilotDevGpsTestMode, isLocalDevHostname } from "../lib/pilotDevGps";

const LOCATION_UNKNOWN_PATTERN = /kclerrorlocationunknown|locationunknown|could not obtain a location value/i;
const POSITION_UNAVAILABLE_PATTERN = /position unavailable|unavailable|temporarily unavailable/i;
const TIMEOUT_PATTERN = /timeout|timed out/i;
const PERMISSION_PATTERN = /permission|denied|not granted/i;
const NOT_IMPLEMENTED_ON_WEB_PATTERN = /not implemented on web/i;
const TERMINAL_TRACKING_STATUS_CODES = new Set([401, 403, 404]);
const TRACKING_CLIENT_NAME = "usePilotLiveTracking";
const TRACKING_CLIENT_VERSION = "2026-04-12";
const TRACKING_POINT_SOURCE = "mobile_app";
const TRACKING_QUEUE_STORAGE_PREFIX = "eb_pilot_tracking_queue_v1:";
const MAX_INITIAL_POINT_ACCURACY_METERS = 250;

const BROWSER_WATCH_PREFIX = "__browser__:";

const createTrackingSessionId = (prefix) => {
	const randomPart = Math.random().toString(36).slice(2, 8);
	return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
};

const isLocalhostRuntime = () => {
	if (typeof window === "undefined") return false;
	return isLocalDevHostname(window.location.hostname);
};

const isNativePlatformRuntime = () => {
	if (typeof window === "undefined") return false;
	try {
		return Boolean(window?.Capacitor?.isNativePlatform?.());
	} catch {
		return false;
	}
};

const hasBrowserSecureContext = () => {
	if (typeof window === "undefined") return true;
	if (isLocalhostRuntime()) return true;
	return window.isSecureContext !== false;
};

const normalizePoint = (position) => ({
	latitude: position?.coords?.latitude,
	longitude: position?.coords?.longitude,
	accuracy: position?.coords?.accuracy ?? null,
	speed: position?.coords?.speed ?? null,
	heading: position?.coords?.heading ?? null,
	altitude: position?.coords?.altitude ?? null,
	timestamp: position?.timestamp ?? Date.now(),
});

const buildTransientGpsMessage = (error) => {
	const message = String(error?.message || "").trim();
	if (LOCATION_UNKNOWN_PATTERN.test(message)) {
		return "Still trying to get GPS signal. Keep the app open and try again.";
	}
	if (TIMEOUT_PATTERN.test(message)) {
		return "Getting live location… this can take a moment in low-signal conditions.";
	}
	if (POSITION_UNAVAILABLE_PATTERN.test(message)) {
		return "Getting live location… move to a clearer area and keep the app open.";
	}
	return "Unable to get live location yet. We’re still trying.";
};

const isPermissionError = (error) => {
	const code = error?.code;
	const message = String(error?.message || "");
	return code === 1 || code === "OS-PLUG-GLOC-0003" || PERMISSION_PATTERN.test(message);
};

const isRetryableGpsError = (error) => {
	if (!error) return false;
	if (isPermissionError(error)) return false;
	const code = error?.code;
	const message = String(error?.message || "");
	return (
		code === 2 ||
		code === 3 ||
		LOCATION_UNKNOWN_PATTERN.test(message) ||
		POSITION_UNAVAILABLE_PATTERN.test(message) ||
		TIMEOUT_PATTERN.test(message)
	);
};

const isNotImplementedOnWebError = (error) => {
	const message = String(error?.message || "");
	return NOT_IMPLEMENTED_ON_WEB_PATTERN.test(message);
};

const parseBrowserWatchId = (value) => {
	if (typeof value !== "string") return null;
	if (!value.startsWith(BROWSER_WATCH_PREFIX)) return null;
	const raw = value.slice(BROWSER_WATCH_PREFIX.length);
	const id = Number(raw);
	return Number.isFinite(id) ? id : null;
};

const isBrowserGeolocationAvailable = () => {
	return (
		typeof navigator !== "undefined" &&
		Boolean(navigator.geolocation?.watchPosition) &&
		Boolean(navigator.geolocation?.clearWatch) &&
		Boolean(navigator.geolocation?.getCurrentPosition)
	);
};

const shouldPreferBrowserGeolocation = () =>
	!isNativePlatformRuntime() && isBrowserGeolocationAvailable();

const shouldPreferHighAccuracyBrowserGps = () => {
	if (typeof window === "undefined") return true;
	try {
		if (window.matchMedia?.("(pointer: coarse)")?.matches) {
			return true;
		}
	} catch {
		// ignore
	}
	try {
		const userAgent = String(window.navigator?.userAgent || "");
		return /iphone|ipad|ipod|android|mobile/i.test(userAgent);
	} catch {
		return true;
	}
};

const getBrowserGeolocationOptions = (mode = "watch") => {
	const preferHighAccuracy = shouldPreferHighAccuracyBrowserGps();
	if (mode === "permission") {
		return {
			enableHighAccuracy: preferHighAccuracy,
			timeout: preferHighAccuracy ? 8000 : 5000,
			maximumAge: preferHighAccuracy ? 10000 : 60000,
		};
	}
	if (mode === "seed") {
		return {
			enableHighAccuracy: preferHighAccuracy,
			timeout: preferHighAccuracy ? 10000 : 4000,
			maximumAge: preferHighAccuracy ? 5000 : 120000,
		};
	}
	return {
		enableHighAccuracy: preferHighAccuracy,
		timeout: preferHighAccuracy ? 25000 : 20000,
		maximumAge: preferHighAccuracy ? 5000 : 15000,
	};
};

const shouldAcceptIncomingPoint = (nextPoint, previousPoint) => {
	if (!nextPoint) return false;
	const lat = Number(nextPoint.latitude);
	const lon = Number(nextPoint.longitude);
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
	const accuracy = Number(nextPoint.accuracy);
	if (!Number.isFinite(accuracy)) return true;
	if (accuracy <= MAX_INITIAL_POINT_ACCURACY_METERS) return true;
	const previousAccuracy = Number(previousPoint?.accuracy);
	return Number.isFinite(previousAccuracy) && accuracy < previousAccuracy;
};

const buildAccuracyWaitMessage = (accuracy) => {
	const roundedAccuracy = Math.round(Number(accuracy) || 0);
	if (!roundedAccuracy) {
		return "Getting a more accurate live location… keep the app open for a stronger GPS fix.";
	}
	return `Getting a more accurate live location… current GPS accuracy is about ±${roundedAccuracy}m.`;
};

const getTrackingQueueStorageKey = (errandId) =>
	`${TRACKING_QUEUE_STORAGE_PREFIX}${String(errandId || "unknown")}`;

const readQueuedTrackingPoints = (errandId) => {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage?.getItem?.(getTrackingQueueStorageKey(errandId));
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const writeQueuedTrackingPoints = (errandId, points) => {
	if (typeof window === "undefined") return;
	try {
		const next = Array.isArray(points) ? points : [];
		if (!next.length) {
			window.localStorage?.removeItem?.(getTrackingQueueStorageKey(errandId));
			return;
		}
		window.localStorage?.setItem?.(
			getTrackingQueueStorageKey(errandId),
			JSON.stringify(next),
		);
	} catch {
		// ignore local persistence errors
	}
};

export function usePilotLiveTracking({
	errandId,
	apiBaseUrl,
	token,
	updateInterval = 5000,
	minimumUpdateInterval = 3000,
}) {
	const watchIdRef = useRef(null);
	const trackingSessionIdRef = useRef(0);
	const clientSessionRef = useRef(createTrackingSessionId("hook"));
	const startingRef = useRef(false);
	const terminalStopRef = useRef(false);
	const trackingIdentityRef = useRef({
		errandId,
		apiBaseUrl,
		token,
	});
	const devIntervalRef = useRef(null);
	const lastPushedAtRef = useRef(0);
	const lastErrorSignatureRef = useRef("");
	const [tracking, setTracking] = useState(false);
	const [loadingGps, setLoadingGps] = useState(false);
	const [error, setError] = useState(null);
	const [point, setPoint] = useState(null);
	const [permissionState, setPermissionState] = useState("prompt");
	const [queuedPointsCount, setQueuedPointsCount] = useState(() =>
		readQueuedTrackingPoints(errandId).length,
	);
	const [syncState, setSyncState] = useState("idle");
	const [lastSyncedAt, setLastSyncedAt] = useState(null);
	const acceptedPointRef = useRef(null);

	const syncBrowserPermissionState = useCallback(async () => {
		if (typeof navigator === "undefined" || !navigator.permissions?.query) {
			return null;
		}
		try {
			const status = await navigator.permissions.query({ name: "geolocation" });
			const nextState = status?.state || "prompt";
			setPermissionState(nextState);
			return nextState;
		} catch {
			return null;
		}
	}, []);

	const clearDevInterval = useCallback(() => {
		if (devIntervalRef.current) {
			clearInterval(devIntervalRef.current);
			devIntervalRef.current = null;
		}
	}, []);

	const getBrowserPermissionState = useCallback(async () => {
		const nextState = await syncBrowserPermissionState();
		if (nextState === "denied") {
			const err = new Error("Location permission not granted");
			err.code = 1;
			throw err;
		}
		return {
			location: nextState || "prompt",
			coarseLocation: nextState || "prompt",
		};
	}, [syncBrowserPermissionState]);

	const stopTracking = useCallback(async ({ preservePoint = false } = {}) => {
		trackingSessionIdRef.current += 1;
		startingRef.current = false;
		const watchId = watchIdRef.current;
		watchIdRef.current = null;
		clearDevInterval();
		if (watchId) {
			const browserWatchId = parseBrowserWatchId(watchId);
			if (browserWatchId !== null) {
				try {
					navigator.geolocation.clearWatch(browserWatchId);
				} catch {
					// ignore clear errors during teardown
				}
			} else {
				try {
					await Geolocation.clearWatch({ id: watchId });
				} catch {
					// ignore clear errors during teardown
				}
			}
		}
		setTracking(false);
		setLoadingGps(false);
		if (!preservePoint) {
			acceptedPointRef.current = null;
		}
		if (!preservePoint) {
			setPoint(null);
		}
	}, [clearDevInterval]);

	const pushPointToBackend = useCallback(
		async (payload) => {
			if (!errandId || !apiBaseUrl || !token || !payload) return;
			const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/v1/tracking/update`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					"X-EB-Tracking-Client": TRACKING_CLIENT_NAME,
					"X-EB-Tracking-Client-Version": TRACKING_CLIENT_VERSION,
					"X-EB-Tracking-Session": clientSessionRef.current,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const payload = await response.json().catch(() => ({}));
				const error = new Error(
					payload?.detail || `Tracking update failed (${response.status})`,
				);
				error.status = response.status;
				throw error;
			}
		},
		[apiBaseUrl, errandId, token],
	);

	const setQueueStateFromStorage = useCallback(
		(nextQueue) => {
			const queue = Array.isArray(nextQueue)
				? nextQueue
				: readQueuedTrackingPoints(errandId);
			setQueuedPointsCount(queue.length);
			writeQueuedTrackingPoints(errandId, queue);
		},
		[errandId],
	);

	const buildTrackingPayload = useCallback(
		(nextPoint) => ({
			errand_id: errandId,
			latitude: nextPoint.latitude,
			longitude: nextPoint.longitude,
			accuracy: nextPoint.accuracy,
			speed: nextPoint.speed,
			heading: nextPoint.heading,
			altitude: nextPoint.altitude,
			source: TRACKING_POINT_SOURCE,
			recorded_at: new Date(nextPoint.timestamp || Date.now()).toISOString(),
		}),
		[errandId],
	);

	const enqueuePoint = useCallback(
		(nextPoint) => {
			const queue = [...readQueuedTrackingPoints(errandId), buildTrackingPayload(nextPoint)];
			setQueueStateFromStorage(queue);
			setSyncState("offline_queueing");
		},
		[buildTrackingPayload, errandId, setQueueStateFromStorage],
	);

	const flushQueuedPoints = useCallback(async () => {
		if (!errandId || !apiBaseUrl || !token) return true;
		const queue = readQueuedTrackingPoints(errandId);
		if (!queue.length) return true;
		if (typeof navigator !== "undefined" && navigator.onLine === false) {
			setQueuedPointsCount(queue.length);
			setSyncState("offline_queueing");
			return false;
		}

		setQueuedPointsCount(queue.length);
		setSyncState("syncing");
		for (let index = 0; index < queue.length; index += 1) {
			try {
				await pushPointToBackend(queue[index]);
			} catch (pushError) {
				if (TERMINAL_TRACKING_STATUS_CODES.has(pushError?.status)) {
					setQueueStateFromStorage([]);
					terminalStopRef.current = true;
					await stopTracking({ preservePoint: true });
					setError(
						pushError?.status === 403
							? "Live tracking stopped because this errand is no longer assigned to you. Refresh your jobs list."
							: pushError?.message || "Live tracking stopped because the errand is no longer available.",
					);
					return false;
				}

				setQueueStateFromStorage(queue.slice(index));
				setSyncState("offline_queueing");
				return false;
			}
		}

		setQueueStateFromStorage([]);
		setSyncState("live");
		setLastSyncedAt(Date.now());
		return true;
	}, [apiBaseUrl, errandId, pushPointToBackend, setQueueStateFromStorage, stopTracking, token]);

	const handleValidPoint = useCallback(
		async (nextPoint) => {
			if (!nextPoint || terminalStopRef.current) return;
			if (!shouldAcceptIncomingPoint(nextPoint, acceptedPointRef.current)) {
				setLoadingGps(true);
				setTracking(false);
				setError(buildAccuracyWaitMessage(nextPoint?.accuracy));
				return;
			}
			acceptedPointRef.current = nextPoint;
			setPoint(nextPoint);
			setTracking(true);
			setLoadingGps(false);
			setError(null);
			lastErrorSignatureRef.current = "";

			const now = Date.now();
			if (now - lastPushedAtRef.current < updateInterval) return;
			lastPushedAtRef.current = now;

			try {
				const queueFlushed = await flushQueuedPoints();
				if (!queueFlushed) {
					if (!terminalStopRef.current) {
						enqueuePoint(nextPoint);
					}
					return;
				}
				if (typeof navigator !== "undefined" && navigator.onLine === false) {
					enqueuePoint(nextPoint);
					return;
				}
				await pushPointToBackend(buildTrackingPayload(nextPoint));
				setSyncState("live");
				setLastSyncedAt(Date.now());
			} catch (pushError) {
				if (TERMINAL_TRACKING_STATUS_CODES.has(pushError?.status)) {
					terminalStopRef.current = true;
					await stopTracking({ preservePoint: true });
					setError(
						pushError?.status === 403
							? "Live tracking stopped because this errand is no longer assigned to you. Refresh your jobs list."
							: pushError?.message || "Live tracking stopped because the errand is no longer available.",
					);
					return;
				}
				enqueuePoint(nextPoint);
				console.error("[pilot] failed to push live point", pushError);
			}
		},
		[buildTrackingPayload, enqueuePoint, flushQueuedPoints, pushPointToBackend, stopTracking, updateInterval],
	);

	const ensureLocationPermission = useCallback(async () => {
		if (shouldPreferBrowserGeolocation()) {
			return await getBrowserPermissionState();
		}

		await syncBrowserPermissionState();
		let permissions = null;
		try {
			permissions = await Geolocation.checkPermissions();
		} catch (err) {
			// Capacitor web shims can throw "Not implemented on web.". We'll fall back below.
			permissions = null;
		}

		if (
			permissions?.location === "granted" ||
			permissions?.coarseLocation === "granted"
		) {
			return permissions;
		}

		// If Capacitor permission APIs are missing on web, trigger the browser permission prompt.
		if (isBrowserGeolocationAvailable() && (permissions === null || permissions === undefined)) {
			return await new Promise((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(
					() => {
						setPermissionState("granted");
						resolve({ location: "granted", coarseLocation: "granted" });
					},
					(browserError) => {
						if (isPermissionError(browserError)) {
							setPermissionState("denied");
							const err = new Error("Location permission not granted");
							err.code = 1;
							reject(err);
							return;
						}
						reject(browserError || new Error("Failed to request location permission"));
					},
					getBrowserGeolocationOptions("permission"),
				);
			});
		}

		let requested;
		try {
			requested = await Geolocation.requestPermissions();
		} catch (err) {
			if (isNotImplementedOnWebError(err) && isBrowserGeolocationAvailable()) {
				return await new Promise((resolve, reject) => {
					navigator.geolocation.getCurrentPosition(
						() => {
							setPermissionState("granted");
							resolve({ location: "granted", coarseLocation: "granted" });
						},
						(browserError) => {
							if (isPermissionError(browserError)) {
								setPermissionState("denied");
								const err = new Error("Location permission not granted");
								err.code = 1;
								reject(err);
								return;
							}
							reject(browserError || new Error("Failed to request location permission"));
						},
						getBrowserGeolocationOptions("permission"),
					);
				});
			}
			throw err;
		}
		if (
			requested?.location !== "granted" &&
			requested?.coarseLocation !== "granted"
		) {
			setPermissionState("denied");
			const err = new Error("Location permission not granted");
			err.code = 1;
			throw err;
		}

		setPermissionState("granted");

		return requested;
	}, [getBrowserPermissionState, syncBrowserPermissionState]);

	const startBrowserWatch = useCallback(
		async ({ sessionId }) => {
			if (!isBrowserGeolocationAvailable()) {
				throw new Error(
					"Geolocation is not available in this browser. Please use a device/browser that supports location services.",
				);
			}

			const id = navigator.geolocation.watchPosition(
				(position) => {
					if (
						terminalStopRef.current ||
						sessionId !== trackingSessionIdRef.current
					) {
						return;
					}
					if (!position?.coords) return;
					void handleValidPoint(normalizePoint(position));
				},
				(watchError) => {
					if (
						terminalStopRef.current ||
						sessionId !== trackingSessionIdRef.current
					) {
						return;
					}
					const nextSignature = `${watchError?.code || "unknown"}:${watchError?.message || ""}`;
					if (nextSignature === lastErrorSignatureRef.current) return;
					lastErrorSignatureRef.current = nextSignature;

					if (isPermissionError(watchError)) {
						void stopTracking();
						setPermissionState("denied");
						setError(
							"Location permission not granted. Please allow location access and try again.",
						);
						return;
					}

					if (isRetryableGpsError(watchError)) {
						setLoadingGps(true);
						setError(buildTransientGpsMessage(watchError));
						return;
					}

					setLoadingGps(false);
					setTracking(false);
					setError(
						String(watchError?.message || "Failed to start GPS tracking"),
					);
				},
				getBrowserGeolocationOptions("watch"),
			);

			watchIdRef.current = `${BROWSER_WATCH_PREFIX}${id}`;
			startingRef.current = false;
			return true;
		},
		[handleValidPoint, stopTracking],
	);

	const startTracking = useCallback(
		async ({ devPoint = null } = {}) => {
			if (watchIdRef.current || startingRef.current) return true;
			startingRef.current = true;
			terminalStopRef.current = false;
			const sessionId = trackingSessionIdRef.current + 1;
			trackingSessionIdRef.current = sessionId;
			setError(null);
			setLoadingGps(true);
			setTracking(false);
			// Preserve the last known point while acquiring a fresh fix. This keeps the
			// map from going blank and eliminates the perceived "GPS delay".

			const devGpsTestModeEnabled =
				devPoint && canUsePilotDevGpsTestMode(apiBaseUrl);

			if (devGpsTestModeEnabled) {
				const normalized = {
					latitude: Number(devPoint.latitude),
					longitude: Number(devPoint.longitude),
					accuracy: Number.isFinite(Number(devPoint.accuracy))
						? Number(devPoint.accuracy)
						: 15,
					speed: 0,
					heading: null,
					altitude: null,
					timestamp: Date.now(),
				};
				watchIdRef.current = `dev-${Date.now()}`;
				startingRef.current = false;
				await handleValidPoint(normalized);
				devIntervalRef.current = setInterval(() => {
					if (
						terminalStopRef.current ||
						sessionId !== trackingSessionIdRef.current
					) {
						return;
					}
					void handleValidPoint({
						...normalized,
						timestamp: Date.now(),
					});
				}, Math.max(1000, Math.min(updateInterval, 5000)));
				return true;
			}

			if (!hasBrowserSecureContext()) {
				startingRef.current = false;
				setLoadingGps(false);
				setTracking(false);
				setError(
					"Live tracking requires HTTPS on the pilot web app. Please reopen this page in a secure browser session.",
				);
				return false;
			}

			try {
				await ensureLocationPermission();

				if (shouldPreferBrowserGeolocation()) {
					try {
						await new Promise((resolve) => {
							navigator.geolocation.getCurrentPosition(
								(position) => {
									if (position?.coords) {
										void handleValidPoint(normalizePoint(position));
									}
									resolve(true);
								},
								() => resolve(false),
								getBrowserGeolocationOptions("seed"),
							);
						});
					} catch {
						// ignore - browser watchPosition is the main tracking source
					}

					return await startBrowserWatch({ sessionId });
				}

				// Fast first fix: accept a cached/coarse location quickly so the UI can
				// start rendering a map while high-accuracy GPS locks in.
				try {
					const quickPosition = await Geolocation.getCurrentPosition({
						enableHighAccuracy: false,
						timeout: 2500,
						maximumAge: 60000,
					});
					if (quickPosition?.coords) {
						void handleValidPoint(normalizePoint(quickPosition));
					}
				} catch (quickError) {
					// On plain web runs, Capacitor geolocation can be unavailable. Try the
					// browser geolocation API to seed a quick point.
					if (isNotImplementedOnWebError(quickError) && isBrowserGeolocationAvailable()) {
						try {
							await new Promise((resolve, reject) => {
								navigator.geolocation.getCurrentPosition(
									(position) => {
										if (position?.coords) {
											void handleValidPoint(normalizePoint(position));
										}
										resolve(true);
									},
									() => resolve(false),
									getBrowserGeolocationOptions("seed"),
								);
							});
						} catch {
							// ignore - watchPosition is the main tracking source
						}
					}
				}

				// Start the watch immediately after permissions so we can get the first fix
				// as soon as the OS provides it.
				let watchId;
				try {
					watchId = await Geolocation.watchPosition(
					{
						enableHighAccuracy: true,
						timeout: 15000,
						maximumAge: 10000,
						minimumUpdateInterval,
					},
					(position, watchError) => {
						if (
							terminalStopRef.current ||
							sessionId !== trackingSessionIdRef.current
						) {
							return;
						}
						if (watchError) {
							const nextSignature = `${watchError.code || "unknown"}:${watchError.message || ""}`;
							if (nextSignature === lastErrorSignatureRef.current) return;
							lastErrorSignatureRef.current = nextSignature;

							if (isPermissionError(watchError)) {
								void stopTracking();
								setPermissionState("denied");
								setError(
									"Location permission not granted. Please allow location access and try again.",
								);
								return;
							}

							if (isRetryableGpsError(watchError)) {
								setLoadingGps(true);
								setError(buildTransientGpsMessage(watchError));
								return;
							}

							setLoadingGps(false);
							setTracking(false);
							setError(
								String(watchError.message || "Failed to start GPS tracking"),
							);
							return;
						}

						if (!position?.coords) return;
						void handleValidPoint(normalizePoint(position));
					},
					);
				} catch (watchInitError) {
					if (isNotImplementedOnWebError(watchInitError)) {
						return await startBrowserWatch({ sessionId });
					}
					throw watchInitError;
				}

				// Background warm-up: ask for a high-accuracy point once to encourage a
				// faster lock, but don't block the watch from starting.
				Geolocation.getCurrentPosition({
					enableHighAccuracy: true,
					timeout: 8000,
					maximumAge: 5000,
				}).catch(() => {
					// Warm-up only. watchPosition is the real tracking source.
				});

				watchIdRef.current = watchId;
				startingRef.current = false;
				return true;
			} catch (caughtError) {
				startingRef.current = false;
				const message = isPermissionError(caughtError)
					? "Location permission not granted. Please allow location access and try again."
					: String(caughtError?.message || "Failed to start GPS tracking");
				if (isPermissionError(caughtError)) {
					setPermissionState("denied");
				}
				setLoadingGps(false);
				setTracking(false);
				setError(message);
				return false;
			}
		},
		[
			apiBaseUrl,
			ensureLocationPermission,
			handleValidPoint,
			minimumUpdateInterval,
			startBrowserWatch,
			stopTracking,
			updateInterval,
		],
	);

	useEffect(() => {
		const previousIdentity = trackingIdentityRef.current;
		const identityChanged =
			previousIdentity.errandId !== errandId ||
			previousIdentity.apiBaseUrl !== apiBaseUrl ||
			previousIdentity.token !== token;

		trackingIdentityRef.current = {
			errandId,
			apiBaseUrl,
			token,
		};
		terminalStopRef.current = false;
		lastPushedAtRef.current = 0;
		lastErrorSignatureRef.current = "";

		if (identityChanged || !errandId || !apiBaseUrl || !token) {
			void stopTracking();
			setError(null);
		}
		setQueuedPointsCount(readQueuedTrackingPoints(errandId).length);
	}, [apiBaseUrl, errandId, stopTracking, token]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;

		const handleOnline = () => {
			void flushQueuedPoints();
		};
		const handleOffline = () => {
			if (readQueuedTrackingPoints(errandId).length) {
				setSyncState("offline_queueing");
			}
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [errandId, flushQueuedPoints]);

	useEffect(() => {
		return () => {
			void stopTracking();
		};
	}, [stopTracking]);

	return {
		tracking,
		loadingGps,
		error,
		permissionState,
		point,
		queuedPointsCount,
		syncState,
		lastSyncedAt,
		startTracking,
		stopTracking,
	};
}