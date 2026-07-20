/**
 * Pilot Location Tracking Service
 * Runs on pilot's mobile device to track GPS location
 * Sends periodic updates to backend
 */

import axios from "axios";
import { canUsePilotDevGpsTestMode } from "../lib/pilotDevGps";

const TERMINAL_TRACKING_STATUS_CODES = new Set([401, 403, 404]);
const TRACKING_CLIENT_NAME = "PilotLocationTracker";
const TRACKING_CLIENT_VERSION = "2026-04-12";

const createTrackingSessionId = (prefix) => {
	const randomPart = Math.random().toString(36).slice(2, 8);
	return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
};

export class PilotLocationTracker {
	constructor(errandId, token, apiBaseUrl, options = {}) {
		this.errandId = errandId;
		this.token = token;
		this.apiBaseUrl = apiBaseUrl || "";
		const resolvedOptions =
			typeof options === "number" ? { updateInterval: options } : options;
		this.updateInterval = resolvedOptions.updateInterval ?? 5000; // ms between backend updates
		this.accuracyThreshold = resolvedOptions.accuracyThreshold ?? 60; // meters
		this.minUpdateInterval = resolvedOptions.minUpdateInterval ?? 1000; // ms between accepted UI updates
		this.maximumAge = resolvedOptions.maximumAge ?? 4000; // ms to allow cached location
		this.timeout = resolvedOptions.timeout ?? 12000; // ms to wait for GPS fix
		this.maxStaleMs = resolvedOptions.maxStaleMs ?? 15000; // ms before accepting less-accurate fixes
		this.fallbackAccuracyThreshold =
			resolvedOptions.fallbackAccuracyThreshold ?? 150; // meters
		this.enableHighAccuracy =
			resolvedOptions.enableHighAccuracy ?? this._defaultHighAccuracy();
		this.onError = typeof resolvedOptions.onError === "function" ? resolvedOptions.onError : null;
		this._devFixedLocation = resolvedOptions.devFixedLocation || null;
		this._simulatedIntervalId = null;
		this._lastGeoErrorAt = 0;
		this._lastGeoErrorCode = null;
		this._watchMode = this.enableHighAccuracy ? "high" : "low";
		this._hasFallenBack = false;
		this.isTracking = false;
		this.watchId = null;
		this.lastLocation = null;
		this.lastGoodLocation = null;
		this.lastAcceptedAt = 0;
		this.lastSentAt = 0;
		this.lastGoodAt = 0;
		this.clientSessionId = createTrackingSessionId("legacy");
	}

	_isLocalhost() {
		try {
			return canUsePilotDevGpsTestMode(this.apiBaseUrl);
		} catch {
			return false;
		}
	}

	enableDevFixedLocation(location) {
		// Safety: never allow this outside localhost.
		if (!this._isLocalhost()) return false;
		const lat = Number(location?.latitude);
		const lon = Number(location?.longitude);
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
		const accuracy = Number.isFinite(Number(location?.accuracy))
			? Number(location.accuracy)
			: 15;
		this._devFixedLocation = { latitude: lat, longitude: lon, accuracy };
		return true;
	}

	_disableSimulatedTracking() {
		if (this._simulatedIntervalId) {
			clearInterval(this._simulatedIntervalId);
			this._simulatedIntervalId = null;
		}
	}

	_enableSimulatedTracking() {
		this._disableSimulatedTracking();
		const fixed = this._devFixedLocation;
		if (!fixed || !this._isLocalhost()) return false;

		const tick = async () => {
			const now = Date.now();
			this.lastLocation = {
				latitude: fixed.latitude,
				longitude: fixed.longitude,
				accuracy: fixed.accuracy,
				speed: 0,
				heading: null,
				altitude: null,
				timestamp: now,
			};
			this.lastAcceptedAt = now;
			this.lastGoodLocation = this.lastLocation;
			this.lastGoodAt = now;
			if (now - this.lastSentAt >= this.updateInterval) {
				this.lastSentAt = now;
				await this.sendLocationUpdate();
			}
		};

		// Prime immediately then keep sending.
		void tick();
		this._simulatedIntervalId = setInterval(() => {
			void tick();
		}, Math.max(1000, Math.min(this.updateInterval, 5000)));
		return true;
	}

	_storeLocationFromPosition(position) {
		const { coords, timestamp } = position || {};
		if (!coords) return;
		const now = Date.now();
		const accuracy = coords.accuracy ?? Number.POSITIVE_INFINITY;

		this.lastLocation = {
			latitude: coords.latitude,
			longitude: coords.longitude,
			accuracy,
			speed: coords.speed,
			heading: coords.heading,
			altitude: coords.altitude,
			timestamp,
		};
		this.lastAcceptedAt = now;
		if (accuracy <= this.accuracyThreshold) {
			this.lastGoodLocation = this.lastLocation;
			this.lastGoodAt = now;
		}
	}

	_getCurrentPosition(mode = "high", overrides = {}) {
		const options = { ...this._getWatchOptions(mode), ...overrides };
		return new Promise((resolve, reject) => {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					this._storeLocationFromPosition(position);
					resolve({
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
						accuracy: position.coords.accuracy,
						timestamp: position.timestamp,
					});
				},
				(error) => reject(error),
				options,
			);
		});
	}

	_defaultHighAccuracy() {
		// Desktop browsers on macOS/Windows can struggle to obtain a high-accuracy fix.
		// Default to high accuracy only when it *looks* like a mobile/touch device.
		try {
			if (typeof window === "undefined") return true;
			const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
			return Boolean(coarse);
		} catch {
			return true;
		}
	}

	_getWatchOptions(mode = "high") {
		// Desktop geolocation (Wi‑Fi positioning) can take a while to resolve.
		// Use a more forgiving default to reduce false TIMEOUT errors.
		const timeout = Math.max(45_000, Number(this.timeout) || 0);
		if (mode === "low") {
			return {
				enableHighAccuracy: false,
				timeout,
				// Allow a cached fix (desktop geolocation often relies on Wi‑Fi scanning)
				maximumAge: Math.max(60_000, Number(this.maximumAge) || 0),
			};
		}
		return {
			enableHighAccuracy: true,
			timeout,
			maximumAge: Number(this.maximumAge) || 0,
		};
	}

	_startWatch(mode = "high") {
		this._watchMode = mode;
		if (this.watchId !== null) {
			navigator.geolocation.clearWatch(this.watchId);
			this.watchId = null;
		}
		this.watchId = navigator.geolocation.watchPosition(
			(position) => this.handleLocationUpdate(position),
			(error) => this.handleLocationError(error),
			this._getWatchOptions(mode),
		);
	}

	async _primeLocation() {
		// Best-effort: grab a quick low-accuracy fix first so the UI can proceed,
		// then upgrade via watchPosition.
		try {
			await new Promise((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(
					(position) => {
						this.handleLocationUpdate(position);
						resolve(true);
					},
					(error) => reject(error),
					this._getWatchOptions("low"),
				);
			});
		} catch {
			// Ignore; watchPosition will surface errors.
		}
	}

	/**
	 * Start GPS tracking
	 */
	async startTracking() {
		if (this.isTracking) return;

		this.isTracking = true;

		// Local dev escape hatch: allow fixed location simulation on localhost.
		if (this._devFixedLocation && this._isLocalhost()) {
			this.isTracking = true;
			this._enableSimulatedTracking();
			console.log("🧪 GPS Tracking (simulated) started");
			return true;
		}

		// Request location permission
		if (!navigator.geolocation) {
			console.error("Geolocation not supported");
			this.onError?.({
				code: "NOT_SUPPORTED",
				message: "Geolocation is not supported in this browser.",
				userMessage: "Live tracking isn't supported on this device/browser.",
			});
			return false;
		}

		try {
			await this._primeLocation();
			this._startWatch(this._watchMode);

			console.log("✅ GPS Tracking started");
			return true;
		} catch (error) {
			console.error("Failed to start tracking:", error);
			this.isTracking = false;
			this.watchId = null;
			this.onError?.({
				code: "START_FAILED",
				message: error?.message || String(error),
				userMessage:
					"Couldn't start live tracking. Please try again and check location permissions.",
			});
			return false;
		}
	}

	/**
	 * Stop GPS tracking
	 */
	stopTracking() {
		if (this.watchId !== null) {
			navigator.geolocation.clearWatch(this.watchId);
			this.watchId = null;
		}
		this._disableSimulatedTracking();
		this._hasFallenBack = false;
		this.isTracking = false;
		console.log("❌ GPS Tracking stopped");
	}

	/**
	 * Handle location update from GPS
	 */
	async handleLocationUpdate(position) {
		const { coords, timestamp } = position;
		const now = Date.now();
		const accuracy = coords.accuracy ?? Number.POSITIVE_INFINITY;

		if (now - this.lastAcceptedAt < this.minUpdateInterval) {
			return;
		}

		if (accuracy > this.accuracyThreshold && this.lastGoodLocation) {
			const lastGoodAccuracy =
				this.lastGoodLocation?.accuracy ?? Number.POSITIVE_INFINITY;
			const isStale = now - this.lastGoodAt >= this.maxStaleMs;
			const isImproved = accuracy < lastGoodAccuracy * 0.8;

			if (!isStale && !isImproved) {
				return;
			}

			if (!isImproved && accuracy > this.fallbackAccuracyThreshold) {
				return;
			}
		}

		this.lastLocation = {
			latitude: coords.latitude,
			longitude: coords.longitude,
			accuracy,
			speed: coords.speed,
			heading: coords.heading,
			altitude: coords.altitude,
			timestamp,
		};

		this.lastAcceptedAt = now;
		if (accuracy <= this.accuracyThreshold) {
			this.lastGoodLocation = this.lastLocation;
			this.lastGoodAt = now;
		}

		if (now - this.lastSentAt >= this.updateInterval) {
			this.lastSentAt = now;
			// Send to backend
			await this.sendLocationUpdate();
		}
	}

	/**
	 * Send location to backend API
	 */
	async sendLocationUpdate() {
		if (!this.lastLocation) return;

		try {
			const baseUrl = this.apiBaseUrl ? this.apiBaseUrl.replace(/\/$/, "") : "";
			const response = await axios.post(
				`${baseUrl}/api/v1/tracking/update`,
				{
					errand_id: this.errandId,
					latitude: this.lastLocation.latitude,
					longitude: this.lastLocation.longitude,
					accuracy: this.lastLocation.accuracy,
					speed: this.lastLocation.speed,
					heading: this.lastLocation.heading,
					altitude: this.lastLocation.altitude,
				},
				{
					headers: {
						Authorization: `Bearer ${this.token}`,
						"Content-Type": "application/json",
						"X-EB-Tracking-Client": TRACKING_CLIENT_NAME,
						"X-EB-Tracking-Client-Version": TRACKING_CLIENT_VERSION,
						"X-EB-Tracking-Session": this.clientSessionId,
					},
				},
			);

			console.log("📍 Location sent:", {
				lat: this.lastLocation.latitude.toFixed(6),
				lon: this.lastLocation.longitude.toFixed(6),
				speed: this.lastLocation.speed,
			});

			return response.data;
		} catch (error) {
			const status = error?.response?.status;
			if (TERMINAL_TRACKING_STATUS_CODES.has(status)) {
				this.stopTracking();
				this.onError?.({
					code: `TRACKING_${status}`,
					message: error?.response?.data?.detail || error.message,
					userMessage:
						status === 403
							? "Live tracking stopped because this errand is no longer assigned to you. Refresh your jobs list."
							: "Live tracking stopped because this errand is no longer available.",
				});
				return null;
			}
			console.error(
				"Failed to send location:",
				error.response?.data || error.message,
			);
		}
	}

	/**
	 * Handle geolocation errors
	 */
	handleLocationError(error) {
		const now = Date.now();
		const code = error?.code;
		const message = error?.message;

		// Throttle repeated errors (watchPosition can spam the callback).
		if (
			this._lastGeoErrorCode === code &&
			now - this._lastGeoErrorAt < 10_000
		) {
			return;
		}
		this._lastGeoErrorCode = code;
		this._lastGeoErrorAt = now;

		let userMessage = "Location update failed. Please try again.";
		switch (error.code) {
			case error.PERMISSION_DENIED:
				userMessage =
					"Location permission denied. Please allow location access, then try again.";
				console.warn("❌ Location permission denied");
				this.stopTracking();
				break;
			case error.POSITION_UNAVAILABLE:
				if (this._watchMode === "high" && !this._hasFallenBack) {
					this._hasFallenBack = true;
					try {
						this._startWatch("low");
					} catch {
						// ignore
					}
					userMessage =
						"Location is unavailable right now. Retrying with lower accuracy… (Tip: turn on Wi‑Fi and disable VPN if possible.)";
				} else {
					userMessage =
						"Location is unavailable right now. Turn on Location Services and try again.";
				}
				console.warn("❌ Location not available");
				break;
			case error.TIMEOUT:
				if (this._watchMode === "high" && !this._hasFallenBack) {
					this._hasFallenBack = true;
					try {
						this._startWatch("low");
					} catch {
						// ignore
					}
					userMessage =
						"Location request timed out. Retrying with lower accuracy…";
				} else {
					userMessage =
						"Location request timed out. Please try again in a moment.";
				}
				console.warn("❌ Location request timed out");
				break;
			default:
				console.warn("❌ Unknown location error");
		}

		this.onError?.({ code, message, userMessage });
	}

	/**
	 * Get current location instantly (not from watch)
	 */
	async getCurrentLocation() {
		if (this._devFixedLocation && this._isLocalhost()) {
			return {
				latitude: this._devFixedLocation.latitude,
				longitude: this._devFixedLocation.longitude,
				accuracy: this._devFixedLocation.accuracy,
				timestamp: Date.now(),
			};
		}

		if (!navigator.geolocation) {
			const err = new Error("Geolocation is not supported in this browser.");
			err.code = "NOT_SUPPORTED";
			err.userMessage = "Live tracking isn't supported on this device/browser.";
			throw err;
		}

		const primaryMode = this.enableHighAccuracy ? "high" : "low";
		try {
			return await this._getCurrentPosition(primaryMode);
		} catch (caughtErr) {
			let finalErr = caughtErr;
			const initialCode = caughtErr?.code;
			const isRetryable = initialCode === 2 || initialCode === 3; // POSITION_UNAVAILABLE or TIMEOUT

			// If high-accuracy failed, retry low-accuracy (desktop + Wi‑Fi based location).
			if (isRetryable && primaryMode === "high") {
				try {
					return await this._getCurrentPosition("low");
				} catch (retryErr) {
					finalErr = retryErr;
				}
			}

			// If low-accuracy failed, retry with a more permissive cached fix.
			if (isRetryable && primaryMode === "low") {
				try {
					return await this._getCurrentPosition("low", {
						timeout: 60_000,
						maximumAge: Math.max(10 * 60_000, Number(this.maximumAge) || 0),
					});
				} catch (retryErr) {
					finalErr = retryErr;
				}
			}

			// Use the final error code after retries for messaging.
			const finalCode = finalErr?.code ?? initialCode;

			let userMessage =
				"Failed to get location. Please try again and check location permissions.";
			if (finalCode === 1) {
				userMessage =
					"Location permission denied. Please allow location access in your browser and macOS Location Services, then try again.";
			} else if (finalCode === 2) {
				userMessage =
					"Location is unavailable right now. Tip: turn on Wi‑Fi, disable VPN/privacy tools, and make sure Location Services are enabled for your browser.";
			} else if (finalCode === 3) {
				userMessage =
					"Location request timed out. Please try again (moving closer to a window can help on desktop).";
			}

			if (finalErr && typeof finalErr === "object") {
				finalErr.userMessage = finalErr.userMessage || userMessage;
			}
			throw finalErr;
		}
	}

	/**
	 * Get last known location
	 */
	getLastLocation() {
		return this.lastGoodLocation || this.lastLocation;
	}

	/**
	 * Check if currently tracking
	 */
	isCurrentlyTracking() {
		return this.isTracking;
	}
}

// Export singleton instance
export const createPilotTracker = (errandId, token, apiBaseUrl, options) => {
	return new PilotLocationTracker(errandId, token, apiBaseUrl, options);
};
