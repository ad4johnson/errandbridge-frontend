/**
 * Comprehensive Caching System for ErrandBridge
 *
 * Features:
 * - localStorage: Persistent user data (email, name, address, etc.)
 * - sessionStorage: Temporary session data
 * - IndexedDB: Large data storage (errands, attachments, API responses)
 * - Auto-expiring cache with TTL
 * - Cache invalidation strategies
 *
 * Usage:
 * cache.setUser({ email, firstName, lastName, ... })
 * cache.getUser()
 * cache.setSetting(key, value)
 * cache.getSetting(key)
 * cache.cacheAPIResponse(key, data, ttlMs)
 * cache.getAPIResponse(key)
 */

class ErrandBridgeCache {
	constructor() {
		this.PREFIX = "eb_"; // ErrandBridge prefix
		this.USER_PREFIX = `${this.PREFIX}user_`;
		this.DEVICE_PREFIX = `${this.PREFIX}device_`;
		this.SETTING_PREFIX = `${this.PREFIX}setting_`;
		this.FORM_PREFIX = `${this.PREFIX}form_`;
		this.API_PREFIX = `${this.PREFIX}api_`;
		this.CACHE_META_PREFIX = `${this.PREFIX}meta_`;

		// Default TTLs in milliseconds
		this.TTLs = {
			userProfile: 7 * 24 * 60 * 60 * 1000, // 7 days - user profile
			lastEmail: 30 * 24 * 60 * 60 * 1000, // 30 days - email for convenience
			formState: 1 * 60 * 60 * 1000, // 1 hour - form drafts
			apiResponse: 5 * 60 * 1000, // 5 minutes - API responses
			errands: 2 * 60 * 1000, // 2 minutes - errand list
			sessionToken: 1000 * 60 * 60 * 1000, // ~1000 hours - auth token
		};

		this.initIndexedDB();
	}

	decodeJwtPayload(token) {
		const raw = String(token || "").trim();
		if (!raw) return null;
		const [, payloadSegment] = raw.split(".");
		if (!payloadSegment) return null;

		let normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
		while (normalized.length % 4 !== 0) {
			normalized += "=";
		}

		try {
			const binary = atob(normalized);
			const json = decodeURIComponent(
				binary
					.split("")
					.map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
					.join(""),
			);
			return JSON.parse(json);
		} catch {
			try {
				return JSON.parse(atob(normalized));
			} catch {
				return null;
			}
		}
	}

	getTokenExpiryTimestamp(token) {
		const expSeconds = Number(this.decodeJwtPayload(token)?.exp);
		if (!Number.isFinite(expSeconds) || expSeconds <= 0) return null;
		return expSeconds * 1000;
	}

	describeDevice(userAgent = "") {
		const ua = String(userAgent || "");
		if (/iPhone/i.test(ua)) return "iPhone";
		if (/iPad|iPod/i.test(ua)) return "iPadOS";
		if (/Android/i.test(ua)) return "Android device";
		if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
		if (/Windows/i.test(ua)) return "Windows PC";
		return "This device";
	}

	buildTrustedDeviceKey(userId) {
		return `${this.DEVICE_PREFIX}${String(userId || "").trim()}`;
	}

	getTrustedDevices(userId) {
		const key = this.buildTrustedDeviceKey(userId);
		if (!key || key === this.DEVICE_PREFIX) return [];
		try {
			const parsed = JSON.parse(localStorage.getItem(key) || "[]");
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}

	recordTrustedDevice(userId, metadata = {}) {
		const key = this.buildTrustedDeviceKey(userId);
		if (!key || key === this.DEVICE_PREFIX) return null;

		const userAgent =
			metadata.userAgent ||
			(typeof navigator !== "undefined" ? navigator.userAgent || "" : "");
		const language =
			metadata.language ||
			(typeof navigator !== "undefined" ? navigator.language || "" : "");
		const timeZone =
			metadata.timeZone ||
			(typeof Intl !== "undefined"
				? Intl.DateTimeFormat().resolvedOptions().timeZone || ""
				: "");
		const label = metadata.label || this.describeDevice(userAgent);
		const fingerprint = [label, language, timeZone, String(userAgent).slice(0, 160)].join("::");
		const nextEntry = {
			id: fingerprint,
			label,
			language,
			timeZone,
			lastSeenAt: new Date().toISOString(),
		};

		const nextDevices = [
			nextEntry,
			...this.getTrustedDevices(userId).filter(
				(device) => device?.id && device.id !== fingerprint,
			),
		].slice(0, 5);

		localStorage.setItem(key, JSON.stringify(nextDevices));
		return nextEntry;
	}

	// ============================================
	// IndexedDB Setup
	// ============================================

	async initIndexedDB() {
		return new Promise((resolve) => {
			if (typeof indexedDB === "undefined") {
				resolve(false);
				return;
			}
			const request = indexedDB.open("ErrandBridgeDB", 1);

			request.onerror = () => {
				console.warn("[CACHE] IndexedDB initialization failed");
				resolve(false);
			};

			request.onsuccess = () => {
				this.db = request.result;
				resolve(true);
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Create object stores if they don't exist
				if (!db.objectStoreNames.contains("apiCache")) {
					db.createObjectStore("apiCache", { keyPath: "key" });
				}
				if (!db.objectStoreNames.contains("errands")) {
					db.createObjectStore("errands", { keyPath: "id" });
				}
				if (!db.objectStoreNames.contains("formDrafts")) {
					db.createObjectStore("formDrafts", { keyPath: "id" });
				}
			};
		});
	}

	// ============================================
	// User Profile Caching
	// ============================================

	/**
	 * Save user profile to localStorage and IndexedDB
	 * Cache keys: email, firstName, lastName, address, city, country, postcode, phone
	 */
	setUserProfile(profileData) {
		const now = Date.now();
		const metadata = {
			timestamp: now,
			expiresAt: now + this.TTLs.userProfile,
		};

		// Save to localStorage with metadata
		localStorage.setItem(
			`${this.USER_PREFIX}profile`,
			JSON.stringify(profileData),
		);
		localStorage.setItem(
			`${this.CACHE_META_PREFIX}profile`,
			JSON.stringify(metadata),
		);

		console.log("[CACHE] User profile saved:", Object.keys(profileData));
	}

	/**
	 * Get cached user profile
	 * Returns null if expired
	 */
	getUserProfile() {
		const metaKey = `${this.CACHE_META_PREFIX}profile`;
		const dataKey = `${this.USER_PREFIX}profile`;

		const meta = JSON.parse(localStorage.getItem(metaKey) || "null");
		const data = JSON.parse(localStorage.getItem(dataKey) || "null");

		if (!data || !meta) return null;

		// Check if expired
		if (Date.now() > meta.expiresAt) {
			this.clearUserProfile();
			return null;
		}

		console.log("[CACHE] User profile retrieved from cache");
		return data;
	}

	/**
	 * Save commonly used user fields individually
	 * Useful for quick access
	 */
	setUserField(field, value) {
		const key = `${this.USER_PREFIX}${field}`;
		const now = Date.now();

		localStorage.setItem(key, JSON.stringify(value));
		localStorage.setItem(`${key}_timestamp`, now.toString());

		// Different TTLs for different fields
		const ttl = field === "email" ? this.TTLs.lastEmail : this.TTLs.userProfile;
		localStorage.setItem(`${key}_expires`, (now + ttl).toString());
	}

	/**
	 * Get individual user field
	 */
	getUserField(field) {
		const key = `${this.USER_PREFIX}${field}`;
		const expiresKey = `${key}_expires`;

		const expiresAt = parseInt(localStorage.getItem(expiresKey) || "0", 10);

		if (Date.now() > expiresAt) {
			localStorage.removeItem(key);
			localStorage.removeItem(expiresKey);
			return null;
		}

		const value = localStorage.getItem(key);
		return value ? JSON.parse(value) : null;
	}

	/**
	 * Save all user fields
	 */
	setAllUserFields(profile) {
		const fields = [
			"email",
			"firstName",
			"lastName",
			"address",
			"city",
			"country",
			"postcode",
			"phone",
			"profileImage",
		];

		fields.forEach((field) => {
			if (profile[field]) {
				this.setUserField(field, profile[field]);
			}
		});
	}

	/**
	 * Get all cached user fields as object
	 */
	getAllUserFields() {
		const fields = [
			"email",
			"firstName",
			"lastName",
			"address",
			"city",
			"country",
			"postcode",
			"phone",
			"profileImage",
		];

		const profile = {};
		fields.forEach((field) => {
			const value = this.getUserField(field);
			if (value) profile[field] = value;
		});

		return Object.keys(profile).length > 0 ? profile : null;
	}

	/**
	 * Clear user profile
	 */
	clearUserProfile() {
		const fields = [
			"email",
			"firstName",
			"lastName",
			"address",
			"city",
			"country",
			"postcode",
			"phone",
			"profileImage",
		];

		fields.forEach((field) => {
			const key = `${this.USER_PREFIX}${field}`;
			localStorage.removeItem(key);
			localStorage.removeItem(`${key}_timestamp`);
			localStorage.removeItem(`${key}_expires`);
		});

		localStorage.removeItem(`${this.USER_PREFIX}profile`);
		localStorage.removeItem(`${this.CACHE_META_PREFIX}profile`);

		console.log("[CACHE] User profile cleared");
	}

	// ============================================
	// Auth Token Caching
	// ============================================

	/**
	 * Save auth token with expiration
	 */
	setAuthToken(token, expiresInSeconds = null) {
		const now = Date.now();
		const explicitExpiryMs =
			Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
				? now + expiresInSeconds * 1000
				: null;
		const jwtExpiryMs = this.getTokenExpiryTimestamp(token);
		const expiresAt = explicitExpiryMs || jwtExpiryMs || now + this.TTLs.sessionToken;
		const remainingSeconds = Math.max(
			0,
			Math.round((expiresAt - now) / 1000),
		);

		localStorage.setItem(`${this.PREFIX}authToken`, token);
		localStorage.setItem(
			`${this.PREFIX}authToken_expires`,
			expiresAt.toString(),
		);

		console.log(
			"[CACHE] Auth token saved, expires in",
			Math.round(remainingSeconds / 3600),
			"hours",
		);
	}

	/**
	 * Get auth token if not expired
	 */
	getAuthToken() {
		const token = localStorage.getItem(`${this.PREFIX}authToken`);
		const expiresAt = parseInt(
			localStorage.getItem(`${this.PREFIX}authToken_expires`) || "0",
			10,
		);

		if (!token || Date.now() > expiresAt) {
			return null;
		}

		return token;
	}

	/**
	 * Clear auth token
	 */
	clearAuthToken() {
		localStorage.removeItem(`${this.PREFIX}authToken`);
		localStorage.removeItem(`${this.PREFIX}authToken_expires`);
	}

	// ============================================
	// Form State Caching (Draft Recovery)
	// ============================================

	/**
	 * Auto-save form state as user types
	 * Prevents data loss on browser crash or accidental refresh
	 */
	setFormState(formData) {
		const now = Date.now();
		const key = `${this.FORM_PREFIX}errand_draft`;

		const formState = {
			...formData,
			savedAt: now,
			expiresAt: now + this.TTLs.formState,
		};

		localStorage.setItem(key, JSON.stringify(formState));
	}

	/**
	 * Recover form state after page reload
	 */
	getFormState() {
		const key = `${this.FORM_PREFIX}errand_draft`;
		const data = JSON.parse(localStorage.getItem(key) || "null");

		if (!data) return null;

		// Check expiration
		if (Date.now() > data.expiresAt) {
			localStorage.removeItem(key);
			return null;
		}

		console.log("[CACHE] Form state recovered from cache");
		return data;
	}

	/**
	 * Clear form state after successful submission
	 */
	clearFormState() {
		localStorage.removeItem(`${this.FORM_PREFIX}errand_draft`);
	}

	// ============================================
	// API Response Caching
	// ============================================

	/**
	 * Cache API response with TTL
	 */
	async setAPIResponse(key, data, ttlMs = null) {
		const ttl = ttlMs || this.TTLs.apiResponse;
		const now = Date.now();

		const cacheEntry = {
			key,
			data,
			timestamp: now,
			expiresAt: now + ttl,
		};

		// Try IndexedDB first, fall back to localStorage
		if (this.db) {
			try {
				const transaction = this.db.transaction(["apiCache"], "readwrite");
				const store = transaction.objectStore("apiCache");
				store.put(cacheEntry);
				console.log(`[CACHE] API response cached: ${key}`);
				return;
			} catch (err) {
				console.warn("[CACHE] IndexedDB write failed, using localStorage", err);
			}
		}

		// Fall back to localStorage for smaller responses
		const storedData = JSON.stringify(cacheEntry);
		if (storedData.length < 500000) {
			// 500KB limit
			localStorage.setItem(`${this.API_PREFIX}${key}`, storedData);
		}
	}

	/**
	 * Get cached API response if not expired
	 */
	async getAPIResponse(key) {
		const now = Date.now();

		// Try IndexedDB first
		if (this.db) {
			try {
				const transaction = this.db.transaction(["apiCache"], "readonly");
				const store = transaction.objectStore("apiCache");

				return new Promise((resolve) => {
					const request = store.get(key);
					request.onsuccess = () => {
						const entry = request.result;
						if (entry && now <= entry.expiresAt) {
							console.log(`[CACHE] API response retrieved: ${key}`);
							resolve(entry.data);
						} else if (entry) {
							// Expired, delete it
							this.clearAPIResponse(key);
							resolve(null);
						} else {
							resolve(null);
						}
					};
				});
			} catch (err) {
				console.warn("[CACHE] IndexedDB read failed", err);
			}
		}

		// Fall back to localStorage
		const storedEntry = JSON.parse(
			localStorage.getItem(`${this.API_PREFIX}${key}`) || "null",
		);
		if (storedEntry && now <= storedEntry.expiresAt) {
			console.log(`[CACHE] API response retrieved from localStorage: ${key}`);
			return storedEntry.data;
		} else if (storedEntry) {
			localStorage.removeItem(`${this.API_PREFIX}${key}`);
		}

		return null;
	}

	/**
	 * Clear specific API cache
	 */
	async clearAPIResponse(key) {
		if (this.db) {
			try {
				const transaction = this.db.transaction(["apiCache"], "readwrite");
				const store = transaction.objectStore("apiCache");
				store.delete(key);
			} catch (err) {
				console.warn("[CACHE] IndexedDB delete failed", err);
			}
		}
		localStorage.removeItem(`${this.API_PREFIX}${key}`);
	}

	/**
	 * Clear all API cache
	 */
	async clearAllAPICache() {
		if (this.db) {
			try {
				const transaction = this.db.transaction(["apiCache"], "readwrite");
				const store = transaction.objectStore("apiCache");
				store.clear();
			} catch (err) {
				console.warn("[CACHE] IndexedDB clear failed", err);
			}
		}

		// Clear localStorage API cache
		const keys = Object.keys(localStorage);
		keys.forEach((key) => {
			if (key.startsWith(this.API_PREFIX)) {
				localStorage.removeItem(key);
			}
		});

		console.log("[CACHE] All API cache cleared");
	}

	// ============================================
	// Settings/Preferences Caching
	// ============================================

	/**
	 * Save user preference
	 */
	setSetting(key, value) {
		const now = Date.now();
		localStorage.setItem(`${this.SETTING_PREFIX}${key}`, JSON.stringify(value));
		localStorage.setItem(
			`${this.SETTING_PREFIX}${key}_timestamp`,
			now.toString(),
		);
	}

	/**
	 * Get user preference
	 */
	getSetting(key) {
		const value = localStorage.getItem(`${this.SETTING_PREFIX}${key}`);
		return value ? JSON.parse(value) : null;
	}

	/**
	 * Remove setting
	 */
	removeSetting(key) {
		localStorage.removeItem(`${this.SETTING_PREFIX}${key}`);
		localStorage.removeItem(`${this.SETTING_PREFIX}${key}_timestamp`);
	}

	// ============================================
	// Cache Analysis & Debugging
	// ============================================

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		const stats = {
			userFields: {},
			settings: {},
			apiCache: {},
			formState: null,
			authToken: null,
			totalSize: 0,
		};

		// Analyze localStorage
		const keys = Object.keys(localStorage);
		keys.forEach((key) => {
			if (key.startsWith(this.USER_PREFIX)) {
				const value = localStorage.getItem(key);
				stats.userFields[key] = value.length;
				stats.totalSize += value.length;
			}
			if (key.startsWith(this.SETTING_PREFIX)) {
				const value = localStorage.getItem(key);
				stats.settings[key] = value.length;
				stats.totalSize += value.length;
			}
			if (key.startsWith(this.API_PREFIX)) {
				const value = localStorage.getItem(key);
				stats.apiCache[key] = value.length;
				stats.totalSize += value.length;
			}
			if (key === `${this.FORM_PREFIX}errand_draft`) {
				const value = localStorage.getItem(key);
				stats.formState = value.length;
				stats.totalSize += value.length;
			}
		});

		stats.totalSizeKB = Math.round(stats.totalSize / 1024);

		return stats;
	}

	/**
	 * Log cache status to console
	 */
	logCacheStatus() {
		const stats = this.getCacheStats();
		console.log("=== CACHE STATUS ===");
		console.log("User Fields:", stats.userFields);
		console.log("Settings:", stats.settings);
		console.log("API Cache:", stats.apiCache);
		console.log("Form State:", stats.formState ? "Present" : "None");
		console.log("Total Size:", stats.totalSizeKB, "KB");
		console.log("Auth Token:", this.getAuthToken() ? "Present" : "None");
	}

	// ============================================
	// Cleanup & Optimization
	// ============================================

	/**
	 * Clear expired cache entries
	 */
	async cleanupExpiredCache() {
		const now = Date.now();
		let removed = 0;

		// Clean localStorage
		const keys = Object.keys(localStorage);
		keys.forEach((key) => {
			if (key.endsWith("_expires")) {
				const expiresAt = parseInt(localStorage.getItem(key) || "0", 10);
				if (now > expiresAt) {
					const baseKey = key.replace("_expires", "");
					localStorage.removeItem(baseKey);
					localStorage.removeItem(key);
					removed++;
				}
			}
		});

		// Clean IndexedDB
		if (this.db) {
			try {
				const transaction = this.db.transaction(["apiCache"], "readwrite");
				const store = transaction.objectStore("apiCache");

				return new Promise((resolve) => {
					const request = store.getAll();
					request.onsuccess = () => {
						const entries = request.result;
						entries.forEach((entry) => {
							if (now > entry.expiresAt) {
								store.delete(entry.key);
								removed++;
							}
						});
						console.log(`[CACHE] Cleaned up ${removed} expired entries`);
						resolve(removed);
					};
				});
			} catch (err) {
				console.warn("[CACHE] Cleanup failed", err);
			}
		}

		return removed;
	}

	/**
	 * Clear all cache (logout, settings reset, etc.)
	 */
	clearAll(options = {}) {
		const {
			preserveProfileImages = true,
			preserveLocalStorageKeys = [],
			preserveLocalStorageKeyPrefixes = [],
		} = options;

		// Preserve client profile images across logout so users don't lose their photo.
		// Images are stored user-scoped by id, so preserving them doesn't leak between accounts.
		const defaultPreserveKeys = preserveProfileImages ? ["profileImage"] : [];
		const defaultPreservePrefixes = preserveProfileImages
			? ["ebClientProfileImage:", this.DEVICE_PREFIX]
			: [this.DEVICE_PREFIX];

		const preserveKeys = new Set([
			...defaultPreserveKeys,
			...(Array.isArray(preserveLocalStorageKeys)
				? preserveLocalStorageKeys
				: []),
		]);
		const preservePrefixes = [
			...defaultPreservePrefixes,
			...(Array.isArray(preserveLocalStorageKeyPrefixes)
				? preserveLocalStorageKeyPrefixes
				: []),
		].filter(Boolean);

		let preservedEntries = [];
		if (preserveKeys.size > 0 || preservePrefixes.length > 0) {
			try {
				for (let i = 0; i < localStorage.length; i += 1) {
					const key = localStorage.key(i);
					if (!key) continue;
					if (
						preserveKeys.has(key) ||
						preservePrefixes.some((prefix) => key.startsWith(prefix))
					) {
						preservedEntries.push([key, localStorage.getItem(key)]);
					}
				}
			} catch (err) {
				console.warn("[CACHE] Unable to snapshot preserved localStorage keys", err);
				preservedEntries = [];
			}
		}

		localStorage.clear();
		for (const [key, value] of preservedEntries) {
			try {
				if (typeof key === "string" && value != null) {
					localStorage.setItem(key, value);
				}
			} catch (err) {
				console.warn("[CACHE] Unable to restore preserved localStorage key", key, err);
			}
		}

		sessionStorage.clear();

		if (this.db) {
			try {
				const transaction = this.db.transaction(
					["apiCache", "errands", "formDrafts"],
					"readwrite",
				);
				transaction.objectStore("apiCache").clear();
				transaction.objectStore("errands").clear();
				transaction.objectStore("formDrafts").clear();
			} catch (err) {
				console.warn("[CACHE] Full clear failed", err);
			}
		}

		if (typeof caches !== "undefined") {
			caches
				.keys()
				.then((keys) => {
					keys.forEach((key) => {
						void caches.delete(key);
					});
				})
				.catch((err) => {
					console.warn("[CACHE] Cache storage clear failed", err);
				});
		}

		console.log("[CACHE] All cache cleared");
	}
}

// Create singleton instance
const cache = new ErrandBridgeCache();

export default cache;
