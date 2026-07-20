import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";

import {
	buildPilotStorageKey,
	resolveApiBaseUrl,
	setRuntimeApiBaseOverride,
} from "./lib/apiBaseUrl";
import cache from "./utils/cache";

const PilotDashboard = lazy(() => import("./components/PilotDashboard"));
const PilotPortal = lazy(() => import("./components/PilotPortal"));
const App = lazy(() => import("./AppGate"));

const PUBLIC_ASSET_BASE = process.env.PUBLIC_URL || "";

const getDeviceLabel = (userAgent = "") => {
	if (/iPad|iPhone|iPod/i.test(userAgent)) return "iOS";
	if (/Android/i.test(userAgent)) return "Android";
	if (/Macintosh/i.test(userAgent) && "ontouchend" in window) return "iPadOS";
	if (/Windows/i.test(userAgent)) return "Windows";
	if (/Mac/i.test(userAgent)) return "macOS";
	return "Desktop";
};

const appBaseHost =
	typeof window !== "undefined" ? window.location.hostname : "";
const isLocalAppHost = ["localhost", "127.0.0.1"].includes(appBaseHost);
const defaultAppBase =
	typeof window !== "undefined" && isLocalAppHost
		? window.location.origin
		: "https://www.errandbridge.com";
const APP_BASE_URL = process.env.REACT_APP_APP_BASE_URL || defaultAppBase;

let globalAppStylesPromise = null;

const ensureGlobalAppStyles = () => {
	if (!globalAppStylesPromise) {
		globalAppStylesPromise = Promise.all([
			import("./tailwind.css"),
			import("./index.css"),
		]);
	}
	return globalAppStylesPromise;
};

const safeGetItem = (key) => {
	try {
		return localStorage.getItem(key);
	} catch (error) {
		console.warn("[STORAGE] Unable to read from localStorage:", key, error);
		return null;
	}
};

/**
 * Root wrapper component that handles pilot vs customer mode routing
 * This component has minimal hooks and routes to the appropriate app
 */
export default function RootApp() {
	// Check URL parameters for pilot mode
	const hostname = window.location.hostname || "";
	const pathname = window.location.pathname || "/";
	const isPilotHost =
		hostname === "pilot.errandbridge.com" || hostname.startsWith("pilot.");
	const isLocalHost = ["localhost", "127.0.0.1"].includes(hostname);
	const isNativePlatform =
		typeof window !== "undefined" && window?.Capacitor?.isNativePlatform?.();
	const [apiBaseUrl, setApiBaseUrl] = useState(() => resolveApiBaseUrl());
	const pilotStorageKey = useMemo(
		() => buildPilotStorageKey(apiBaseUrl),
		[apiBaseUrl],
	);
	const pilotTokenKey = useMemo(
		() => `pilotToken:${pilotStorageKey}`,
		[pilotStorageKey],
	);
	const pilotUserKey = useMemo(
		() => `pilotUser:${pilotStorageKey}`,
		[pilotStorageKey],
	);
	const showEnvBanner =
		process.env.NODE_ENV !== "production" && !isNativePlatform;
	const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(
		window.navigator?.userAgent || "",
	);
	const usesLocalhostApi = /localhost|127\.0\.0\.1/.test(apiBaseUrl);
	const showDeviceApiWarning =
		isMobileDevice &&
		usesLocalhostApi &&
		process.env.NODE_ENV !== "production" &&
		!isNativePlatform;
	const deviceLabel = getDeviceLabel(window.navigator?.userAgent || "");
	const deviceClass = `device-${deviceLabel.toLowerCase()}`;
	const isPilotMode =
		isPilotHost ||
		(isLocalHost && window.location.pathname.startsWith("/pilot"));
	const isAnonymousLandingPath = pathname === "/lite" &&
		!safeGetItem("authToken") &&
		!safeGetItem("token");
	const shouldLoadGlobalAppStyles = useMemo(
		() => isPilotMode || !isAnonymousLandingPath,
		[isAnonymousLandingPath, isPilotMode],
	);

	const pilotBasePath = isPilotHost ? "" : "/pilot";
	const pilotHomePath = pilotBasePath || "/";
	const pilotLoginPath = `${pilotBasePath}/login`;
	const pilotSignupPath = `${pilotBasePath}/signup`;

	const canonicalizePilotUrl = (loggedIn) => {
		if (typeof window === "undefined") return;
		try {
			const { pathname, search, hash } = window.location;
			const params = new URLSearchParams(search || "");
			const wantsLogin =
				params.get("login") === "true" || pathname === pilotLoginPath;
			const wantsSignup =
				params.get("signup") === "true" || pathname === pilotSignupPath;

			// If logged in, ensure we are not stuck on auth URLs or legacy query markers.
			if (loggedIn) {
				if (
					pathname === pilotLoginPath ||
					pathname === pilotSignupPath ||
					(search && search.length > 0) ||
					wantsLogin ||
					wantsSignup
				) {
					window.history.replaceState(null, "", `${pilotHomePath}${hash || ""}`);
				}
				return;
			}

			// If logged out, keep the URL explicit and clean.
			// - legacy links: /?login=true or /?signup=true
			// - explicit routes: /login or /signup
			if (wantsSignup) {
				if (pathname !== pilotSignupPath || search) {
					window.history.replaceState(null, "", `${pilotSignupPath}${hash || ""}`);
				}
				return;
			}
			if (wantsLogin) {
				if (pathname !== pilotLoginPath || search) {
					window.history.replaceState(null, "", `${pilotLoginPath}${hash || ""}`);
				}
				return;
			}

			// Default pilot entry should be the login URL (helps keep URLs consistent).
			if (pathname === pilotHomePath && !search) {
				window.history.replaceState(null, "", `${pilotLoginPath}${hash || ""}`);
			}
		} catch {
			// ignore
		}
	};

	useEffect(() => {
		cache.cleanupExpiredCache();
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		let cancelled = false;
		const versionUrl = `${PUBLIC_ASSET_BASE}/version.json?ts=${Date.now()}`;
		fetch(versionUrl, { cache: "no-store" })
			.then((res) => {
				if (!res.ok) return null;
				const contentType = (res.headers.get("content-type") || "").toLowerCase();
				if (!contentType.includes("application/json")) return null;
				return res.json();
			})
			.then((data) => {
				if (cancelled || !data) return;
				window.__EB_BUILD_INFO__ = data;
				console.log("[ROOT BUILD] version.json", data);
			})
			.catch((error) => {
				console.warn("[ROOT BUILD] Unable to load version.json", error);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const runtimeInfo = {
			path: window.location.pathname,
			search: window.location.search,
			host: window.location.hostname,
			isPilotMode,
			isPilotHost,
			isNativePlatform,
			deviceLabel,
			apiBaseUrl,
			build: window.__EB_BUILD_INFO__ || null,
		};
		window.__EB_ROOT_RUNTIME_INFO__ = runtimeInfo;
		console.log("[ROOT RUNTIME]", runtimeInfo);
	}, [apiBaseUrl, deviceLabel, isNativePlatform, isPilotHost, isPilotMode]);

	useEffect(() => {
		if (typeof document === "undefined") return;
		const { body } = document;
		if (!body) return;
		const previousClasses = Array.from(body.classList).filter((className) =>
			className.startsWith("device-"),
		);
		previousClasses.forEach((className) => {
			body.classList.remove(className);
		});
		body.classList.add(deviceClass);

		return () => {
			body.classList.remove(deviceClass);
		};
	}, [deviceClass]);

	// Pilot authentication state
	const [pilotToken, setPilotToken] = useState(() => safeGetItem(pilotTokenKey));
	const [pilotUser, setPilotUser] = useState(() => {
		const stored = safeGetItem(pilotUserKey);
		if (!stored) return null;
		try {
			return JSON.parse(stored);
		} catch (error) {
			console.warn(
				"[STORAGE] Unable to parse pilot user data. Clearing saved value.",
				error,
			);
			try {
				localStorage.removeItem("pilotUser");
			} catch (clearError) {
				console.warn(
					"[STORAGE] Unable to clear corrupt pilot user data.",
					clearError,
				);
			}
			return null;
		}
	});

	useEffect(() => {
		setPilotToken(safeGetItem(pilotTokenKey));
		const stored = safeGetItem(pilotUserKey);
		if (!stored) {
			setPilotUser(null);
			return;
		}
		try {
			setPilotUser(JSON.parse(stored));
		} catch (error) {
			console.warn(
				"[STORAGE] Unable to parse pilot user data after API base change.",
				error,
			);
			setPilotUser(null);
		}
	}, [pilotTokenKey, pilotUserKey]);
	useLayoutEffect(() => {
		// Load global styles as early as possible, but do not block first paint.
		// Blocking render until CSS arrives can significantly delay LCP on the landing page.
		if (!shouldLoadGlobalAppStyles) return;
		void ensureGlobalAppStyles().catch(() => {
			// If styles fail to load, continue rendering so the app stays usable.
		});
	}, [shouldLoadGlobalAppStyles]);

	useEffect(() => {
		if (!isPilotMode) return;
		canonicalizePilotUrl(Boolean(pilotToken && pilotUser));

		// Keep auth URLs tidy when users navigate back/forward.
		const onPopState = () => {
			canonicalizePilotUrl(Boolean(pilotToken && pilotUser));
		};
		window.addEventListener("popstate", onPopState);
		return () => {
			window.removeEventListener("popstate", onPopState);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPilotMode, pilotToken, pilotUser]);

	// Handle pilot login
	const handlePilotLoggedIn = (token, user, options = {}) => {
		const nextApiBaseUrl = String(options.apiBaseUrl || apiBaseUrl || "").trim() || apiBaseUrl;
		const nextPilotStorageKey = buildPilotStorageKey(nextApiBaseUrl);
		const nextPilotTokenKey = `pilotToken:${nextPilotStorageKey}`;
		const nextPilotUserKey = `pilotUser:${nextPilotStorageKey}`;
		setRuntimeApiBaseOverride(nextApiBaseUrl);
		setApiBaseUrl(nextApiBaseUrl);
		localStorage.setItem(nextPilotTokenKey, token);
		localStorage.setItem(nextPilotUserKey, JSON.stringify(user));
		setPilotToken(token);
		setPilotUser(user);

		// Always land on the pilot home URL after login.
		canonicalizePilotUrl(true);
	};

	const setPilotNotice = (message, type = "error") => {
		if (!message || typeof sessionStorage === "undefined") return;
		let safeMessage = "";
		if (typeof message === "string") {
			safeMessage = message;
		} else if (message?.message) {
			safeMessage = message.message;
		} else if (message?.detail) {
			safeMessage = message.detail;
		} else {
			try {
				safeMessage = String(message);
			} catch (err) {
				console.warn("[PILOT NOTICE] Unable to serialize notice payload", err);
				safeMessage = "Unable to complete this action. Please try again.";
			}
		}
		if (!safeMessage) return;
		sessionStorage.setItem(
			"pilotNotice",
			JSON.stringify({ message: safeMessage, type, timestamp: Date.now() }),
		);
	};

	// Handle pilot logout
	const handlePilotLogout = (message) => {
		setPilotNotice(message, "error");
		setRuntimeApiBaseOverride("");
		setApiBaseUrl(resolveApiBaseUrl());
		localStorage.removeItem(pilotTokenKey);
		localStorage.removeItem(pilotUserKey);
		localStorage.removeItem("pilotToken");
		localStorage.removeItem("pilotUser");
		localStorage.removeItem("pilotMode");
		cache.clearAll();
		setPilotToken(null);
		setPilotUser(null);
		try {
			// After pilot sign-out, send them back to the public landing page.
			window.location.href = APP_BASE_URL;
		} catch {
			window.location.href = APP_BASE_URL;
		}
	};

	// Pilot mode: Show dashboard if logged in, otherwise show portal
	const envBanner = showEnvBanner ? (
		<div
			className="env-banner env-banner--compact"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 12,
			}}
		>
			<span>Dev API: {apiBaseUrl}</span>
		</div>
	) : null;
	const deviceApiBanner = showDeviceApiWarning ? (
		<div className="env-banner env-banner--warning">
			Mobile device detected but API is set to localhost. Set
			REACT_APP_USE_DEVICE_API=true and
			REACT_APP_DEVICE_API_BASE=http://YOUR_LAN_IP:8001 for device testing.
		</div>
	) : null;
	const deviceBadge = showEnvBanner ? (
		<div className="device-badge">Device: {deviceLabel}</div>
	) : null;
	const appChrome = (
		<>
			{envBanner}
			{deviceApiBanner}
			{deviceBadge}
		</>
	);

	if (isPilotMode) {
		if (pilotToken && pilotUser) {
			return (
				<>
					{appChrome}
					<Suspense
						fallback={
							<div
								style={{ padding: 24, textAlign: "center", fontWeight: 600 }}
							>
								Loading pilot dashboard…
							</div>
						}
					>
						<PilotDashboard
							apiBaseUrl={apiBaseUrl}
							token={pilotToken}
							user={pilotUser}
							onLogout={handlePilotLogout}
						/>
					</Suspense>
				</>
			);
		}
		return (
			<>
				{appChrome}
				<Suspense
					fallback={
						<div style={{ padding: 24, textAlign: "center", fontWeight: 600 }}>
							Loading pilot portal…
						</div>
					}
				>
					<PilotPortal
						apiBaseUrl={apiBaseUrl}
						onPilotLoggedIn={handlePilotLoggedIn}
					/>
				</Suspense>
			</>
		);
	}

	// Customer mode: Show normal app
	return (
		<>
			{appChrome}
			<Suspense
				fallback={
					<div style={{ padding: 24, textAlign: "center", fontWeight: 600 }}>
						Loading app…
					</div>
				}
			>
				<App />
			</Suspense>
		</>
	);
}
