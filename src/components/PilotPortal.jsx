/**
 * Pilot Portal
 * Access point for pilots to sign in and access the job board
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { ArrowLeft } from "lucide-react";

import {
	getCapacitorHostedBaseUrl,
	getCapacitorLoopbackFallbackUrl,
	isHostedApiBaseUrl,
	isLocalLikeApiBaseUrl,
	isLoopbackApiBaseUrl,
} from "../lib/apiBaseUrl";
import { fetchOAuthStatus } from "../lib/oauthStatus";
import "./PilotPortal.css";

const COUNTRY_PHONE_PRESETS = {
	"United Kingdom": { dialCode: "+44", placeholder: "+44 7400 123 456" },
	"United States": { dialCode: "+1", placeholder: "+1 555 555 5555" },
	Nigeria: { dialCode: "+234", placeholder: "+234 800 000 0000" },
	Canada: { dialCode: "+1", placeholder: "+1 416 555 1234" },
	Germany: { dialCode: "+49", placeholder: "+49 1512 3456789" },
	France: { dialCode: "+33", placeholder: "+33 6 12 34 56 78" },
	India: { dialCode: "+91", placeholder: "+91 98765 43210" },
	"South Africa": { dialCode: "+27", placeholder: "+27 71 234 5678" },
};

const _stripLeadingDialCode = (value) => {
	const raw = (value || "").trim();
	if (!raw) return "";
	if (!raw.startsWith("+")) return raw;
	// Remove leading +<1-4 digits> and any following whitespace.
	return raw.replace(/^\+\d{1,4}\s*/, "").trim();
};

const isRetryableNetworkAuthError = (error) => {
	const name = String(error?.name || "").toLowerCase();
	const message = String(error?.message || "").toLowerCase();
	return (
		name === "aborterror" ||
		name === "typeerror" ||
		message.includes("load failed") ||
		message.includes("failed to fetch") ||
		message.includes("network") ||
		message.includes("network request failed") ||
		message.includes("the internet connection appears to be offline")
	);
};

const isHostedFallbackAuthError = (error) => {
	const message = String(error?.message || "").toLowerCase();
	return (
		message.includes("invalid email or password") ||
		message.includes("check your credentials") ||
		message.includes("not registered as a pilot")
	);
};

const formatErrorForLog = (error) => {
	if (!error) return { message: "(no error)" };
	try {
		return {
			name: error?.name,
			message: error?.message || String(error),
			stack: error?.stack,
		};
	} catch {
		return { message: String(error) };
	}
};

const formatPilotRoleError = (message = "", { isSignUp = false } = {}) => {
	const normalized = String(message || "").toLowerCase();
	const differentRoleConflict =
		normalized.includes("different account type") ||
		normalized.includes("not registered as a pilot");
	if (differentRoleConflict) {
		return isSignUp
			? "That email is already being used for a customer account. Use a different email for your pilot account."
			: "That email belongs to a customer account. Please sign in with a pilot account or create a separate pilot email to test the pilot dashboard.";
	}
	return message;
};

const PilotPortal = ({ apiBaseUrl, onPilotLoggedIn }) => {
	const isCapacitor =
		typeof window !== "undefined" && typeof window.Capacitor !== "undefined";
	const capacitorPlatform =
		isCapacitor && window.Capacitor?.getPlatform
			? window.Capacitor.getPlatform()
			: window.Capacitor?.platform;
	const pilotStorageKey = apiBaseUrl
		? apiBaseUrl.replace(/^https?:\/\//, "").replace(/[^\w.-]/g, "_")
		: "unknown";
	const pilotTokenKey = `pilotToken:${pilotStorageKey}`;
	const pilotUserKey = `pilotUser:${pilotStorageKey}`;
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [isSignUp, setIsSignUp] = useState(false);
	const [isForgotPassword, setIsForgotPassword] = useState(false);
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [phone, setPhone] = useState("");
	const [city, setCity] = useState("");
	const [country, setCountry] = useState("");
	const [addressLine1, setAddressLine1] = useState("");
	const [addressLine2, setAddressLine2] = useState("");
	const [postalCode, setPostalCode] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [confirmPassword, setConfirmPassword] = useState("");
	const [passwordMatch, setPasswordMatch] = useState(true);
	const [resetCode, setResetCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [resetStep, setResetStep] = useState("email"); // 'email' or 'code'
	const [success, setSuccess] = useState(null);
	const [signupStep, setSignupStep] = useState("form"); // 'form' or 'verify'
	const [signupFormStage, setSignupFormStage] = useState(1); // 1 or 2
	const [otpCode, setOtpCode] = useState("");
	const [pendingSignup, setPendingSignup] = useState(null);
	const [resendCooldown, setResendCooldown] = useState(0);
	const googleClientId =
		process.env.REACT_APP_GOOGLE_PILOT_CLIENT_ID ||
		process.env.REACT_APP_GOOGLE_CLIENT_ID ||
		"";
	const googleAuthEnabledFlag = (
		process.env.REACT_APP_GOOGLE_PILOT_AUTH_ENABLED ||
		process.env.REACT_APP_GOOGLE_AUTH_ENABLED ||
		""
	).toLowerCase();
	const googleAuthAllowedHosts = (
		process.env.REACT_APP_GOOGLE_PILOT_AUTH_HOSTS ||
		process.env.REACT_APP_GOOGLE_AUTH_HOSTS ||
		""
	)
		.split(",")
		.map((host) => host.trim())
		.filter(Boolean);
	const currentHost =
		typeof window !== "undefined" ? window.location.hostname : "";
	const isLocalPilotHost = currentHost === "localhost" || currentHost === "127.0.0.1";
	const isPrivateNetworkHost = /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(
		currentHost || "",
	);
	const isLocalDevPilotHost =
		isLocalPilotHost ||
		(process.env.NODE_ENV !== "production" &&
			(isPrivateNetworkHost || String(currentHost || "").endsWith(".local")));
	const googleAuthHostAllowed =
		isLocalDevPilotHost ||
		googleAuthAllowedHosts.length === 0 ||
		googleAuthAllowedHosts.some((host) => {
			if (!host) return false;
			if (currentHost === host) return true;
			return currentHost.endsWith(`.${host}`);
		});
	const googleAuthRequested =
		Boolean(googleClientId) &&
		googleAuthEnabledFlag !== "false" &&
		googleAuthHostAllowed;
	const googleAuthDisabledReason = !googleAuthHostAllowed
			? `Google sign-in is disabled for ${currentHost || "this domain"}.`
			: !googleClientId
				? "Google sign-in isn’t configured yet."
			: googleAuthEnabledFlag === "false"
				? "Google sign-in is disabled."
				: "Google sign-in isn’t available right now.";
	const [googleAuthReady, setGoogleAuthReady] = useState(false);
	const [googleAuthError, setGoogleAuthError] = useState("");
	const googleButtonRef = useRef(null);

	const appleAuthEnabledFlag = (
		process.env.REACT_APP_APPLE_PILOT_AUTH_ENABLED ||
		process.env.REACT_APP_APPLE_AUTH_ENABLED ||
		""
	).toLowerCase();
	const appleAuthAllowedHosts = (
		process.env.REACT_APP_APPLE_PILOT_AUTH_HOSTS ||
		process.env.REACT_APP_APPLE_AUTH_HOSTS ||
		""
	)
		.split(",")
		.map((host) => host.trim())
		.filter(Boolean);
	const appleAuthEnabled =
		appleAuthEnabledFlag === "true" &&
		(appleAuthAllowedHosts.length === 0 ||
			appleAuthAllowedHosts.some(
				(host) => currentHost === host || currentHost.endsWith(`.${host}`),
			));
	const appleAuthRequested =
		appleAuthEnabled || (isLocalDevPilotHost && appleAuthEnabledFlag === "true");
	const [oauthAuthError, setOauthAuthError] = useState("");
	const [oauthAuthBusy, setOauthAuthBusy] = useState("");
	const [oauthStatus, setOauthStatus] = useState(null);
	const oauthPopupRef = useRef(null);
	const apiOrigin = useMemo(() => {
		try {
			return new URL(apiBaseUrl).origin;
		} catch {
			return "";
		}
	}, [apiBaseUrl]);
	const hostedApiBaseUrl = getCapacitorHostedBaseUrl();
	const hostedPilotBaseUrl =
		process.env.REACT_APP_PILOT_BASE_URL || "https://pilot.errandbridge.com";
	const forceLocalPilotAuth =
		process.env.REACT_APP_FORCE_API_BASE === "true" &&
		isCapacitor &&
		!isHostedApiBaseUrl(apiBaseUrl) &&
		isLocalLikeApiBaseUrl(apiBaseUrl);
	const hostedApiFallbackBase =
		!forceLocalPilotAuth &&
		isCapacitor &&
		!isHostedApiBaseUrl(apiBaseUrl) &&
		(isLoopbackApiBaseUrl(apiBaseUrl) || /^http:\/\//i.test(String(apiBaseUrl || ""))) &&
		hostedApiBaseUrl &&
		hostedApiBaseUrl !== apiBaseUrl
			? hostedApiBaseUrl
			: "";
	const hostedPilotLoginUrl = `${String(hostedPilotBaseUrl || "https://pilot.errandbridge.com").replace(/\/+$/, "")}/login`;
	const localPilotAuthFailureMessage = forceLocalPilotAuth
		? `We couldn’t reach your local pilot API from this ${capacitorPlatform === "android" ? "Android" : "iOS"} device. Keep the local backend running and connect this phone to the same Wi‑Fi/LAN as your Mac. Mobile data cannot reach a private dev server. For tester builds, rebuild with the hosted API before trying again.`
		: "";

	const redirectToHostedPilotLogin = useCallback(() => {
		if (typeof window === "undefined") return;
		console.warn(
			"[PILOT AUTH] Redirecting native iOS pilot app to hosted login page after transport failures",
			{ to: hostedPilotLoginUrl },
		);
		window.location.replace(hostedPilotLoginUrl);
	}, [hostedPilotLoginUrl]);

	const persistPilotLogin = useCallback(
		(data, resolvedApiBaseUrl = apiBaseUrl) => {
			const token = data.accessToken;
			const user = { id: data.userId, email: data.email };
			localStorage.setItem(pilotTokenKey, token);
			localStorage.setItem(pilotUserKey, JSON.stringify(user));
			onPilotLoggedIn(token, user, { apiBaseUrl: resolvedApiBaseUrl });
		},
		[apiBaseUrl, onPilotLoggedIn, pilotTokenKey, pilotUserKey],
	);

	const syncAuthModeFromUrl = useCallback(() => {
		if (typeof window === "undefined") return;
		try {
			const { hostname, pathname } = window.location;
			const isPilotHost =
				hostname === "pilot.errandbridge.com" || hostname.startsWith("pilot.");
			const basePath = isPilotHost ? "" : pathname.startsWith("/pilot") ? "/pilot" : "";
			const rel = pathname.slice(basePath.length) || "/";
			if (rel === "/signup") {
				setIsSignUp(true);
				setIsForgotPassword(false);
				return;
			}
			if (rel === "/login") {
				setIsSignUp(false);
				setIsForgotPassword(false);
			}
		} catch {
			// ignore
		}
	}, []);

	const setAuthMode = useCallback(
		(mode) => {
			const nextIsSignUp = mode === "signup";
			setIsSignUp(nextIsSignUp);
			setIsForgotPassword(false);
			setError(null);
			setSuccess(null);
			setOauthAuthError("");
			setOauthAuthBusy("");

			if (typeof window === "undefined") return;
			try {
				const { hostname, pathname, hash } = window.location;
				const isPilotHost =
					hostname === "pilot.errandbridge.com" || hostname.startsWith("pilot.");
				const basePath = isPilotHost
					? ""
					: pathname.startsWith("/pilot")
						? "/pilot"
						: "";
				const target = `${basePath}/${nextIsSignUp ? "signup" : "login"}`;
				if (pathname !== target) {
					window.history.replaceState(null, "", `${target}${hash || ""}`);
				}
			} catch {
				// ignore
			}
		},
		[setError, setSuccess],
	);

	useEffect(() => {
		syncAuthModeFromUrl();
		if (typeof window === "undefined") return undefined;
		window.addEventListener("popstate", syncAuthModeFromUrl);
		return () => {
			window.removeEventListener("popstate", syncAuthModeFromUrl);
		};
	}, [syncAuthModeFromUrl]);

	const handleBackToHome = useCallback(() => {
		if (typeof window === "undefined") return;

		// Prefer true "back" behavior so users return to the previous page they came from.
		// Fall back to computed home URL only when there is no usable browser history.
		try {
			if (window.history && window.history.length > 1) {
				window.history.back();
				return;
			}
		} catch {
			// ignore and fall back
		}

		const { protocol, hostname, port } = window.location;
		const portSuffix = port ? `:${port}` : "";
		const isLocalHost = ["localhost", "127.0.0.1"].includes(hostname);
		if (isLocalHost) {
			window.location.href = "/";
			return;
		}
		const clientHost = hostname.replace(/^pilot\./, "") || hostname;
		window.location.href = `${protocol}//${clientHost}${portSuffix}/`;
	}, []);

	const fetchWithTimeout = useCallback(
		async (url, options = {}, config = {}) => {
			const { timeoutMs = 30000, retries = 1, retryDelayMs = 1200 } = config;
			let lastError = null;
			const enableIosLoopbackRetry =
				process.env.REACT_APP_CAPACITOR_IOS_LOOPBACK_RETRY === "true";
			const fallbackUrl = enableIosLoopbackRetry
				? getCapacitorLoopbackFallbackUrl(url, capacitorPlatform)
				: null;
			const requestUrls =
				fallbackUrl && fallbackUrl !== url ? [url, fallbackUrl] : [url];
			const shouldUseNativeHttp =
				Boolean(capacitorPlatform) &&
				Boolean(isCapacitor) &&
				Capacitor?.isNativePlatform?.();

			const asResponseLike = (nativeResponse) => {
				const status = Number(nativeResponse?.status ?? 0);
				const headersObj = nativeResponse?.headers || {};
				const lowerHeaders = {};
				try {
					for (const [k, v] of Object.entries(headersObj)) {
						lowerHeaders[String(k).toLowerCase()] = v;
					}
				} catch {
					// ignore
				}
				const data = nativeResponse?.data;

				return {
					ok: status >= 200 && status < 300,
					status,
					headers: {
						get: (name) => {
							if (!name) return null;
							return lowerHeaders[String(name).toLowerCase()] ?? null;
						},
					},
					json: async () => {
						if (data == null) return null;
						if (typeof data === "object") return data;
						try {
							return JSON.parse(String(data));
						} catch {
							return data;
						}
					},
					text: async () => {
						if (data == null) return "";
						if (typeof data === "string") return data;
						try {
							return JSON.stringify(data);
						} catch {
							return String(data);
						}
					},
				};
			};

			const nativeRequest = async (requestUrl) => {
				const method = String(options?.method || "GET").toUpperCase();
				const headers = options?.headers || {};
				let data = options?.body;
				let contentType;
				try {
					if (typeof headers?.get === "function") {
						contentType = headers.get("content-type") || headers.get("Content-Type");
					} else {
						contentType = headers?.["Content-Type"] || headers?.["content-type"];
					}
				} catch {
					contentType = undefined;
				}
				if (
					typeof data === "string" &&
					String(contentType || "").toLowerCase().includes("application/json")
				) {
					try {
						data = JSON.parse(data);
					} catch {
						// keep string
					}
				}

				const work = CapacitorHttp.request({
					url: requestUrl,
					method,
					headers,
					data,
				});

				// CapacitorHttp doesn't support AbortController; enforce timeout via Promise.race.
				const result = await Promise.race([
					work,
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error("Request timeout")), timeoutMs),
					),
				]);
				return asResponseLike(result);
			};

			for (let attempt = 0; attempt <= retries; attempt += 1) {
				for (const requestUrl of requestUrls) {
					try {
						if (shouldUseNativeHttp) {
							return await nativeRequest(requestUrl);
						}

						const controller = new AbortController();
						const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
						try {
							const response = await fetch(requestUrl, {
								...options,
								signal: controller.signal,
							});
							return response;
						} finally {
							clearTimeout(timeoutId);
						}
					} catch (err) {
						lastError = err;
						const isAbort = err?.name === "AbortError";
						const isNetwork = isRetryableNetworkAuthError(err);
						const shouldTryAlternateUrl =
							requestUrl !== requestUrls[requestUrls.length - 1] &&
							(isAbort || isNetwork);
						if (shouldTryAlternateUrl) {
							console.warn(
								"[PILOT AUTH] Primary request failed, retrying alternate loopback host",
								{
									from: requestUrl,
									to: requestUrls[requestUrls.length - 1],
									error: formatErrorForLog(err),
								},
							);
							continue;
						}
						if (attempt < retries && (isAbort || isNetwork)) {
							await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
							break;
						}
						throw err;
					}
				}
			}

			throw lastError || new Error("Request failed");
		},
		[capacitorPlatform, isCapacitor],
	);

	useEffect(() => {
		const shouldCheckOAuthStatus = googleAuthRequested || appleAuthRequested;
		if (typeof window === "undefined" || !shouldCheckOAuthStatus) {
			setOauthStatus(null);
			return undefined;
		}

		let cancelled = false;
		fetchOAuthStatus({
			apiBaseUrl,
			origin: window.location.origin,
			role: "pilot",
		})
			.then((status) => {
				if (cancelled) return;
				setOauthStatus(status);
			})
			.catch((error) => {
				if (cancelled) return;
				console.warn("[PILOT AUTH] OAuth status check failed", error);
				setOauthStatus({ error: error?.message || "Unable to load social sign-in status" });
			});

		return () => {
			cancelled = true;
		};
	}, [apiBaseUrl, appleAuthRequested, googleAuthRequested]);

	const googleTokenStatus = oauthStatus?.google?.token || null;
	const appleRedirectStatus = oauthStatus?.apple?.redirect || null;
	const googleAuthEnabled =
		googleAuthRequested && Boolean(googleTokenStatus?.enabled);
	const resolvedGoogleAuthDisabledReason =
		googleAuthRequested && !googleAuthEnabled
			? googleTokenStatus?.reason || googleAuthDisabledReason
			: googleAuthDisabledReason;
	const appleAuthEnabledForUi =
		appleAuthRequested && Boolean(appleRedirectStatus?.enabled);

	const graphqlPilotLogin = useCallback(async (baseUrl = apiBaseUrl) => {
		const mutation = `mutation Login($email: String!, $password: String!, $role: String!) {
        login(input: { email: $email, password: $password, role: $role }) {
          accessToken userId email
        }
      }`;
		const response = await fetchWithTimeout(
			`${baseUrl}/graphql`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					query: mutation,
					variables: { email, password, role: "pilot" },
				}),
			},
			{
				timeoutMs: 30000,
				retries: 1,
				retryDelayMs: 1200,
			},
		);

		if (!response) {
			throw new Error("Login failed: no response from server.");
		}

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			throw new Error(
				errorText || "Login failed. Please check your credentials.",
			);
		}

		const result = await response.json();
		if (result.errors && result.errors.length > 0) {
			throw new Error(result.errors[0].message || "Login failed.");
		}

		const data = result.data?.login;
		if (!data || !data.accessToken) {
			throw new Error("Login failed. No access token returned.");
		}

		return data;
	}, [apiBaseUrl, email, fetchWithTimeout, password]);

	const restPilotLogin = useCallback(async (baseUrl = apiBaseUrl) => {
		const response = await fetchWithTimeout(
			`${baseUrl}/auth/login`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, role: "pilot" }),
			},
			{
				timeoutMs: 30000,
				retries: 1,
				retryDelayMs: 1200,
			},
		);
		if (!response) {
			throw new Error("Login failed: no response from server.");
		}
		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			throw new Error(data?.detail || "Login failed. Please try again.");
		}
		if (!data?.access_token || !data?.user_id) {
			throw new Error("Login failed. No access token returned.");
		}
		return {
			accessToken: data.access_token,
			userId: data.user_id,
			email: data.email || email,
		};
	}, [apiBaseUrl, email, fetchWithTimeout, password]);

	const tryHostedPilotLogin = useCallback(async () => {
		if (!hostedApiFallbackBase) {
			throw new Error("Hosted API fallback is unavailable.");
		}

		console.warn(
			"[PILOT AUTH] Retrying pilot login against hosted API base",
			{ from: apiBaseUrl, to: hostedApiFallbackBase },
		);

		try {
			const data = await graphqlPilotLogin(hostedApiFallbackBase);
			persistPilotLogin(data, hostedApiFallbackBase);
			return;
		} catch (hostedGraphQlError) {
			console.warn(
				"[PILOT AUTH] Hosted GraphQL login failed, retrying hosted REST login",
				hostedGraphQlError,
			);
			const data = await restPilotLogin(hostedApiFallbackBase);
			persistPilotLogin(data, hostedApiFallbackBase);
		}
	}, [
		apiBaseUrl,
		graphqlPilotLogin,
		hostedApiFallbackBase,
		persistPilotLogin,
		restPilotLogin,
	]);

	useEffect(() => {
		if (typeof sessionStorage === "undefined") return;
		const rawNotice = sessionStorage.getItem("pilotNotice");
		if (!rawNotice) return;
		try {
			const notice = JSON.parse(rawNotice);
			if (notice?.message) {
				if (notice.type === "success") {
					setSuccess(notice.message);
				} else {
					setError(notice.message);
				}
			}
		} catch (noticeError) {
			console.warn("[PilotPortal] Unable to parse pilot notice", noticeError);
		}
		sessionStorage.removeItem("pilotNotice");
	}, []);

	useEffect(() => {
		if (resendCooldown <= 0) return;
		const timer = setInterval(() => {
			setResendCooldown((prev) => Math.max(prev - 1, 0));
		}, 1000);
		return () => clearInterval(timer);
	}, [resendCooldown]);

	const applyOAuthAccessToken = useCallback(
		async (accessToken) => {
			const meRes = await fetchWithTimeout(
				`${apiBaseUrl}/auth/me`,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				},
				{ timeoutMs: 30000, retries: 1, retryDelayMs: 1200 },
			);
			const meData = await meRes.json().catch(() => ({}));
			if (!meRes.ok) {
				throw new Error(meData.detail || "Unable to load your pilot profile");
			}

			persistPilotLogin({
				accessToken,
				userId: meData.user_id,
				email: meData.email,
			});
		},
		[apiBaseUrl, fetchWithTimeout, persistPilotLogin],
	);

	const handleGoogleCredentialResponse = useCallback(
		async (response) => {
			setGoogleAuthError("");
			setOauthAuthError("");
			setError(null);
			setSuccess(null);

			if (!response?.credential) {
				setGoogleAuthError("Google sign-in was cancelled. Please try again.");
				return;
			}

			try {
				const authResponse = await fetchWithTimeout(
					`${apiBaseUrl}/auth/google`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							credential: response.credential,
							role: "pilot",
							allow_pilot_signup: Boolean(isSignUp),
						}),
					},
					{ timeoutMs: 30000, retries: 1, retryDelayMs: 1200 },
				);
				const payload = await authResponse.json().catch(() => ({}));
				if (!authResponse.ok) {
					throw new Error(payload.detail || "Google sign-in failed");
				}

				const accessToken = payload.access_token;
				if (!accessToken) {
					throw new Error("Google sign-in failed: missing access token");
				}

				await applyOAuthAccessToken(accessToken);
			} catch (err) {
				console.error("[PILOT AUTH] Google token sign-in failed", formatErrorForLog(err));
				setGoogleAuthError(
					formatPilotRoleError(
						err?.message || "Google sign-in failed. Please try again.",
						{ isSignUp },
					),
				);
			}
		},
		[apiBaseUrl, applyOAuthAccessToken, fetchWithTimeout, isSignUp],
	);

	useEffect(() => {
		if (!googleAuthEnabled) {
			setGoogleAuthReady(false);
			return undefined;
		}
		if (typeof window === "undefined") return undefined;
		if (window.google?.accounts?.id) {
			setGoogleAuthReady(true);
			return undefined;
		}

		let cancelled = false;
		let pollId = null;
		const markReady = () => {
			if (!cancelled) setGoogleAuthReady(true);
		};
		const startPoll = () => {
			let ticks = 0;
			pollId = window.setInterval(() => {
				if (window.google?.accounts?.id) {
					window.clearInterval(pollId);
					pollId = null;
					markReady();
					return;
				}
				ticks += 1;
				if (ticks > 200) {
					window.clearInterval(pollId);
					pollId = null;
				}
			}, 25);
		};

		const existing = document.querySelector("script[data-google-identity]");
		if (existing) {
			if (existing.dataset.googleIdentityLoaded === "true") {
				setGoogleAuthReady(true);
				return undefined;
			}
			const onLoad = () => {
				existing.dataset.googleIdentityLoaded = "true";
				markReady();
			};
			existing.addEventListener("load", onLoad);
			startPoll();
			return () => {
				cancelled = true;
				existing.removeEventListener("load", onLoad);
				if (pollId) window.clearInterval(pollId);
			};
		}

		const script = document.createElement("script");
		script.src = "https://accounts.google.com/gsi/client";
		script.async = true;
		script.defer = true;
		script.dataset.googleIdentity = "true";
		script.onload = () => {
			script.dataset.googleIdentityLoaded = "true";
			markReady();
		};
		script.onerror = () => {
			if (!cancelled) {
				setGoogleAuthReady(false);
				setGoogleAuthError("Google sign-in didn’t load correctly. Please try again.");
			}
		};
		document.head.appendChild(script);
		startPoll();
		return () => {
			cancelled = true;
			script.onload = null;
			script.onerror = null;
			if (pollId) window.clearInterval(pollId);
		};
	}, [googleAuthEnabled]);

	useEffect(() => {
		if (!googleAuthEnabled || !googleAuthReady) return undefined;

		let cancelled = false;
		let timeoutId = null;
		let attempts = 0;
		const maxAttempts = 60;

		const tryRender = () => {
			if (cancelled) return;
			const container = googleButtonRef.current;
			const gis = window.google?.accounts?.id;
			if (!container || !gis) {
				attempts += 1;
				if (attempts < maxAttempts) {
					timeoutId = window.setTimeout(tryRender, 50);
				}
				return;
			}

			try {
				if (container.childElementCount > 0) {
					container.innerHTML = "";
				}
				const containerWidth = Math.floor(container.getBoundingClientRect().width || 0);
				const desiredWidth = Math.min(360, Math.max(240, containerWidth || 0));
				gis.initialize({
					client_id: googleClientId,
					callback: handleGoogleCredentialResponse,
					auto_select: false,
					cancel_on_tap_outside: true,
				});
				gis.renderButton(container, {
					theme: "outline",
					size: "large",
					width: desiredWidth,
					text: isSignUp ? "signup_with" : "signin_with",
				});
			} catch (err) {
				console.warn("[PILOT AUTH] Google render failed", err);
				setGoogleAuthError("Google sign-in didn’t load correctly. Please try again.");
			}
		};

		tryRender();
		return () => {
			cancelled = true;
			if (timeoutId) window.clearTimeout(timeoutId);
		};
	}, [googleAuthEnabled, googleAuthReady, googleClientId, handleGoogleCredentialResponse, isSignUp]);

	const openOAuthPopup = useCallback(
		(provider) => {
			if (typeof window === "undefined") return;
			setOauthAuthError("");
			setError(null);
			setSuccess(null);
			const providerStatus = appleRedirectStatus;
			if (!providerStatus?.enabled) {
				setOauthAuthBusy("");
				setOauthAuthError(
					providerStatus?.reason || "Apple sign-in isn’t available right now.",
				);
				return;
			}
			setOauthAuthBusy(provider);

			const origin = window.location.origin;
			const mode = isSignUp ? "signup" : "login";
			const allowPilotSignup = isSignUp ? "true" : "false";
			const startUrl = `${apiBaseUrl}/auth/oauth/${provider}/start?origin=${encodeURIComponent(
				origin,
			)}&role=pilot&popup=true&mode=${encodeURIComponent(
				mode,
			)}&allow_pilot_signup=${encodeURIComponent(allowPilotSignup)}`;
			const width = 520;
			const height = 680;
			const top = Math.max(0, (window.screen.height - height) / 2);
			const left = Math.max(0, (window.screen.width - width) / 2);
			const popup = window.open(
				startUrl,
				`errandbridge_oauth_${provider}`,
				`popup=yes,width=${width},height=${height},left=${left},top=${top}`,
			);
			oauthPopupRef.current = popup;
			if (!popup) {
				setOauthAuthBusy("");
				setOauthAuthError(
					"Popup blocked. Please allow popups for ErrandBridge and try again.",
				);
			}
		},
		[apiBaseUrl, appleRedirectStatus, isSignUp],
	);

	useEffect(() => {
		if (typeof window === "undefined" || !apiOrigin) return undefined;
		const handleMessage = async (event) => {
			try {
				if (event.origin !== apiOrigin) return;
				const data = event.data;
				if (!data || typeof data !== "object") return;
				if (data.type !== "errandbridge_oauth_result") return;
				setOauthAuthBusy("");
				if (!data.ok) {
					setOauthAuthError(
						formatPilotRoleError(data.error || "Sign-in failed. Please try again.", {
							isSignUp,
						}),
					);
					return;
				}
				if (!data.access_token) {
					setOauthAuthError("Sign-in failed: missing access token");
					return;
				}
				await applyOAuthAccessToken(data.access_token);
				setOauthAuthError("");
			} catch (err) {
							console.error("[PILOT AUTH] OAuth message error", formatErrorForLog(err));
				setOauthAuthBusy("");
				setOauthAuthError(
					formatPilotRoleError(err?.message || "Sign-in failed. Please try again.", {
						isSignUp,
					}),
				);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [apiOrigin, applyOAuthAccessToken, isSignUp]);

	const handleSignIn = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const data = await graphqlPilotLogin();
			persistPilotLogin(data);
		} catch (err) {
			const message = err?.message || "Login failed.";
			const normalizedMessage = message.toLowerCase();
			const shouldFallbackToRest =
				isRetryableNetworkAuthError(err) ||
				normalizedMessage.includes("timeout") ||
				normalizedMessage.includes("network") ||
				normalizedMessage.includes("failed to fetch") ||
				normalizedMessage.includes("load failed");
			if (shouldFallbackToRest) {
				try {
					const data = await restPilotLogin();
					persistPilotLogin(data);
					return;
				} catch (fallbackError) {
							console.error(
								"[PILOT AUTH] REST login fallback failed:",
								formatErrorForLog(fallbackError),
							);
					if (forceLocalPilotAuth) {
						setError(localPilotAuthFailureMessage || fallbackError?.message || message);
						return;
					}
					if (hostedApiFallbackBase) {
						try {
							await tryHostedPilotLogin();
							return;
						} catch (hostedFallbackError) {
							console.error(
								"[PILOT AUTH] Hosted API fallback failed:",
										formatErrorForLog(hostedFallbackError),
							);
							const hostedMessage = String(
								hostedFallbackError?.message || "",
							).toLowerCase();
							const shouldRedirectToHostedPilotSite =
								capacitorPlatform === "ios" &&
								(isRetryableNetworkAuthError(hostedFallbackError) ||
									hostedMessage.includes("load failed") ||
									hostedMessage.includes("failed to fetch") ||
									hostedMessage.includes("network"));
							if (shouldRedirectToHostedPilotSite) {
								redirectToHostedPilotLogin();
								return;
							}
						}
					}
				}
			}
			const shouldTryHostedFallbackOnAuthError =
				Boolean(hostedApiFallbackBase) &&
				isHostedFallbackAuthError(err);
			if (forceLocalPilotAuth && isHostedFallbackAuthError(err)) {
				setError(localPilotAuthFailureMessage || message);
				return;
			}
			if (shouldTryHostedFallbackOnAuthError) {
				try {
					await tryHostedPilotLogin();
					return;
				} catch (hostedFallbackError) {
					console.error(
						"[PILOT AUTH] Hosted auth fallback after credential mismatch failed:",
						formatErrorForLog(hostedFallbackError),
					);
					setError(hostedFallbackError?.message || message);
					return;
				}
			}
			if (
				normalizedMessage.includes("verify") ||
				normalizedMessage.includes("pending")
			) {
				setPendingSignup({ email, token: null, user: null, phone: null });
				setSignupStep("verify");
				setAuthMode("signup");
				setOtpCode("");
				setSuccess(
					`✅ ${email} still needs verification. Enter the code or resend it below.`,
				);
				setError(null);
			} else {
				setError(formatPilotRoleError(message, { isSignUp: false }));
			}
		} finally {
			setLoading(false);
		}
	};

	const handleSignUp = async (e) => {
		e.preventDefault();

		// Validate passwords match
		if (password !== confirmPassword) {
			setPasswordMatch(false);
			setError("Passwords do not match");
			return;
		}

		setPasswordMatch(true);
		setLoading(true);
		setError(null);

		const finalizeSignup = (data, tokenOverride = null) => {
			const token = tokenOverride || data.accessToken;
			const user = { id: data.userId, email: data.email };
			setPendingSignup({ token, user, email: data.email, phone });
			setSignupStep("verify");
			setSignupFormStage(1);
			setOtpCode("");
			setPassword("");
			setConfirmPassword("");
			setSuccess(
				`Welcome aboard${firstName?.trim() ? `, ${firstName.trim()}` : ""}! We sent a verification code to ${data.email}. Enter it below to continue.`,
			);
		};

		const restSignup = async () => {
			const res = await fetchWithTimeout(
				`${apiBaseUrl}/auth/signup`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email,
						password,
						first_name: firstName || null,
						last_name: lastName || null,
						phone: phone || null,
						address_line1: addressLine1 || null,
						address_line2: addressLine2 || null,
						city: city || null,
						state: null,
						postal_code: postalCode || null,
						country: country || null,
						otp_delivery_channel: "email",
						otp_delivery_mode: "code",
						role: "pilot",
					}),
				},
				{
					timeoutMs: 30000,
					retries: 1,
					retryDelayMs: 1200,
				},
			);

			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data?.detail || "Sign up failed. Please try again.");
			}
			if (!data?.access_token || !data?.user_id) {
				throw new Error("Sign up failed. No access token returned.");
			}
			return {
				accessToken: data.access_token,
				userId: data.user_id,
				email: data.email || email,
				isEmailVerified: data.is_email_verified,
			};
		};

		try {
			const mutation = `mutation Signup(
        $email: String!
        $password: String!
        $firstName: String
        $lastName: String
        $phone: String
        $addressLine1: String
        $addressLine2: String
        $city: String
        $state: String
        $postalCode: String
        $country: String
        $role: String
      ) {
        signup(input: {
          email: $email
          password: $password
          firstName: $firstName
          lastName: $lastName
          phone: $phone
          addressLine1: $addressLine1
          addressLine2: $addressLine2
          city: $city
          state: $state
          postalCode: $postalCode
          country: $country
          role: $role
        }) {
          accessToken userId email isEmailVerified
        }
      }`;
			const response = await fetchWithTimeout(
				`${apiBaseUrl}/graphql`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						query: mutation,
						variables: {
							email,
							password,
							firstName: firstName || null,
							lastName: lastName || null,
							phone: phone || null,
							addressLine1: addressLine1 || null,
							addressLine2: addressLine2 || null,
							city: city || null,
							state: null,
							postalCode: postalCode || null,
							country: country || null,
							role: "pilot",
						},
					}),
				},
				{
					timeoutMs: 30000,
					retries: 1,
					retryDelayMs: 1200,
				},
			);

			if (!response.ok) {
				throw new Error("Sign up failed. Please try again.");
			}

			const result = await response.json();
			if (result.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message || "Sign up failed.");
			}
			const data = result.data.signup;
			if (!data || !data.accessToken) {
				throw new Error("Sign up failed. No access token returned.");
			}
			if (data.isEmailVerified) {
				const token = data.accessToken;
				const user = { id: data.userId, email: data.email };
				localStorage.setItem(pilotTokenKey, token);
				localStorage.setItem(pilotUserKey, JSON.stringify(user));
				onPilotLoggedIn(token, user);
				return;
			}
			finalizeSignup(data);
			return;
		} catch (err) {
			const message = err?.message || "Sign up failed.";
			try {
				// Fallback: some environments prefer the REST auth endpoints over GraphQL.
				const fallbackData = await restSignup();
				if (fallbackData.isEmailVerified) {
					const token = fallbackData.accessToken;
					const user = { id: fallbackData.userId, email: fallbackData.email };
					localStorage.setItem(pilotTokenKey, token);
					localStorage.setItem(pilotUserKey, JSON.stringify(user));
					onPilotLoggedIn(token, user);
					return;
				}
				finalizeSignup(fallbackData);
				return;
			} catch (fallbackErr) {
				const fallbackMessage = fallbackErr?.message || message;
				const normalized = String(fallbackMessage).toLowerCase();
				if (normalized.includes("verify") || normalized.includes("pending")) {
					setPendingSignup({ email, token: null, user: null, phone: phone || null });
					setSignupStep("verify");
					setAuthMode("signup");
					setOtpCode("");
					setSuccess(
						`✅ ${email} still needs verification. Enter the code or resend it below.`,
					);
					setError(null);
				} else {
					setError(formatPilotRoleError(fallbackMessage, { isSignUp: true }));
				}
			}
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyOtp = async (e) => {
		e.preventDefault();
		if (!pendingSignup?.email) {
			setError("Signup session not found. Please sign up again.");
			setSignupStep("form");
			return;
		}
		setLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch(`${apiBaseUrl}/auth/confirm`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: pendingSignup.email, code: otpCode }),
			});

			const result = await response.json();
			if (!response.ok && !result.ok) {
				throw new Error(
					result.detail ||
						"Verification failed. Please check the code and try again.",
				);
			}

			const token = pendingSignup.token;
			const user = pendingSignup.user;
			if (token && user) {
				localStorage.setItem(pilotTokenKey, token);
				localStorage.setItem(pilotUserKey, JSON.stringify(user));
				onPilotLoggedIn(token, user);
			} else {
				setSuccess(
					"You're verified-welcome aboard! Please sign in to start earning.",
				);
				setAuthMode("login");
			}
			setPendingSignup(null);
			setSignupStep("form");
			setSignupFormStage(1);
			setOtpCode("");
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const isStage1Valid = () => {
		const hasEmail = (email || "").trim();
		const looksLikeEmail = hasEmail.includes("@");
		return Boolean(
			(firstName || "").trim() &&
			(lastName || "").trim() &&
			(addressLine1 || "").trim() &&
			(city || "").trim() &&
			(postalCode || "").trim() &&
			looksLikeEmail,
		);
	};

	const isStage2Valid = () => {
		return Boolean(
			(country || "").trim() &&
			(phone || "").trim() &&
			(password || "").trim() &&
			(confirmPassword || "").trim() &&
			password === confirmPassword,
		);
	};

	const handleResendOtp = async ({ channel = "email", mode = "code" } = {}) => {
		if (!pendingSignup?.email) {
			setError("Missing signup email. Please sign up again.");
			return;
		}
		setLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch(`${apiBaseUrl}/auth/resend-confirmation`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: pendingSignup.email,
					otp_delivery_channel: channel,
					otp_delivery_mode: mode,
				}),
			});
			const result = await response.json();
			if (!response.ok && !result.ok) {
				throw new Error(
					result.detail || "Unable to resend code. Please try again.",
				);
			}
			if (channel === "sms") {
				setSuccess(
					`✅ New code sent via SMS to ${pendingSignup.phone || "your phone"}`,
				);
			} else {
				setSuccess(`✅ New code sent via email to ${pendingSignup.email}`);
			}
			setResendCooldown(30);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleForgotPasswordStart = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch(`${apiBaseUrl}/auth/password-reset/start`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			if (!response.ok) {
				throw new Error("Email not found. Please check and try again.");
			}

			setSuccess("✅ Code sent to your email! Enter the code below.");
			setResetStep("code");
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleForgotPasswordConfirm = async (e) => {
		e.preventDefault();

		if (newPassword !== confirmPassword) {
			setPasswordMatch(false);
			setError("Passwords do not match");
			return;
		}

		setPasswordMatch(true);
		setLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch(
				`${apiBaseUrl}/auth/password-reset/confirm`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email,
						code: resetCode,
						new_password: newPassword,
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Invalid code or reset failed. Please try again.");
			}

			setSuccess("✅ Password reset successful! You can now log in.");
			setTimeout(() => {
				setIsForgotPassword(false);
				setResetStep("email");
				setEmail("");
				setResetCode("");
				setNewPassword("");
				setConfirmPassword("");
			}, 2000);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const oauthAuthBlock = (
		<div className="google-auth">
			<div className="pilot-social-row">
				{appleAuthEnabledForUi ? (
					<div className="pilot-social-item">
						<button
							type="button"
							className="pilot-social-icon-btn pilot-social-icon-btn--apple"
							onClick={() => openOAuthPopup("apple")}
							disabled={loading || oauthAuthBusy === "apple"}
							aria-label="Continue with Apple"
							title="Continue with Apple"
						>
							<FaApple className="pilot-social-icon" aria-hidden="true" />
						</button>
					</div>
				) : null}

				{googleAuthEnabled ? (
					<div className="pilot-social-item">
						<div
							ref={googleButtonRef}
							style={{ width: "100%", minWidth: 240 }}
						/>
						{!googleAuthReady ? (
							<button
								type="button"
								disabled
								className="pilot-social-icon-btn pilot-social-icon-btn--google"
								aria-label="Continue with Google"
								title="Continue with Google"
							>
								<FcGoogle className="pilot-social-icon" aria-hidden="true" />
							</button>
						) : null}
					</div>
				) : (
					<p className="google-auth__disabled">{resolvedGoogleAuthDisabledReason}</p>
				)}
			</div>

			{oauthAuthError || googleAuthError ? (
				<p className="google-auth__error">{oauthAuthError || googleAuthError}</p>
			) : null}

			<p className="google-auth__note">
				Use Apple or Google if you already have an account.
			</p>
		</div>
	);

	const authModeTitle = isSignUp ? "Create your pilot account" : "Sign in";
	const authModeDescription = isSignUp
		? "A quick setup for verified errands and payouts."
		: "Access errands, routes, and payouts.";
	const showCardHeader = isForgotPassword || signupStep === "verify" || isSignUp;
	const portalExperience = useMemo(() => {
		if (isForgotPassword) {
			return {
				heroBadge: "Account recovery",
				heroTitle: "Reset your password",
				heroSubtitle: "Get back into your pilot workspace quickly.",
				cardHint: "Secure reset across web and mobile.",
			};
		}

		if (signupStep === "verify") {
			return {
				heroBadge: "Verification",
				heroTitle: "Confirm your email",
				heroSubtitle: "One quick step to finish setup.",
				cardHint: "Your account is almost ready.",
			};
		}

		if (isSignUp) {
			return {
				heroBadge: "Pilot onboarding",
				heroTitle: "Create your pilot account",
				heroSubtitle: "A simpler setup for verified errands and payouts.",
				cardHint: "Set up your account in two short steps.",
			};
		}

		return {
			heroBadge: "Pilot access",
			heroTitle: "Simple pilot sign in",
			heroSubtitle: "Access errands, routes, and payouts in one place.",
			cardHint: "A cleaner sign-in flow built for pilots.",
		};
	}, [isForgotPassword, isSignUp, signupStep]);

	return (
		<main className="pilot-portal">
			<div className="portal-container">
				<div className="portal-back-row">
					<button
						type="button"
						className="portal-back-btn"
						onClick={handleBackToHome}
						aria-label="Back to home"
					>
						<ArrowLeft className="portal-back-icon" aria-hidden="true" />
						<span>Back to home</span>
					</button>
				</div>
				<div className="portal-shell" data-testid="pilot-premium-shell">
					<div className="portal-hero">
						<div className="portal-hero-brand-panel">
							<div className="portal-hero-brand-lockup">
								<img
									src="/logo-full.png"
									alt="ErrandBridge"
									className="portal-hero-logo"
								/>
								<div className="portal-hero-brand-copy">
									<span className="portal-hero-brand-kicker">Pilot network</span>
									<p>
										Verified errands, cleaner routing, and faster payout
										confidence across every run.
									</p>
								</div>
							</div>
							<span className="portal-hero-status">Premium workspace</span>
						</div>
						<span className="hero-badge">{portalExperience.heroBadge}</span>
						<h2 className="hero-title">{portalExperience.heroTitle}</h2>
						<p className="hero-subtitle">{portalExperience.heroSubtitle}</p>
					</div>

					<div className="portal-card">
						<div className="portal-card-topline">
							<div className="portal-card-topline-copy">
								<div className="portal-card-brandbar">
									<img
										src="/assets/errandbridge-app-icon.svg"
										alt=""
										aria-hidden="true"
										className="portal-card-brandmark"
									/>
									<div className="portal-card-brandcopy">
										<span className="portal-card-brandlabel">ErrandBridge</span>
										<strong className="portal-card-brandtitle">Pilot access</strong>
									</div>
								</div>
								<p className="portal-card-hint">{portalExperience.cardHint}</p>
							</div>
						</div>
						<div className="portal-tabs" role="tablist" aria-label="Pilot auth mode">
							<button
								type="button"
								id="pilot-auth-tab-login"
								role="tab"
								aria-selected={!isSignUp && !isForgotPassword}
								aria-controls="pilot-auth-panel"
								className={`portal-tabs__item ${!isSignUp && !isForgotPassword ? "portal-tabs__item--active" : ""}`}
								onClick={() => setAuthMode("login")}
							>
								Sign in
							</button>
							<button
								type="button"
								id="pilot-auth-tab-signup"
								role="tab"
								aria-selected={isSignUp && signupStep === "form"}
								aria-controls="pilot-auth-panel"
								className={`portal-tabs__item ${isSignUp && signupStep === "form" ? "portal-tabs__item--active" : ""}`}
								onClick={() => {
									setAuthMode("signup");
									setSignupStep("form");
									setSignupFormStage(1);
								}}
							>
								Create account
							</button>
						</div>

						<div
							id="pilot-auth-panel"
							role="tabpanel"
							aria-labelledby={
								isSignUp && signupStep === "form"
									? "pilot-auth-tab-signup"
									: "pilot-auth-tab-login"
							}
						>
						{showCardHeader ? (
							<div className="portal-header">
								<h1>
									{isForgotPassword
										? "Reset password"
										: signupStep === "verify"
											? "Verify email"
											: authModeTitle}
								</h1>
								<p>
									{isForgotPassword
										? "We’ll send a code so you can set a new password."
										: signupStep === "verify"
											? "Enter the code we emailed you."
											: authModeDescription}
								</p>
							</div>
						) : null}

						{error && (
							<div className="error-banner">
								<span>❌ {error}</span>
								<button type="button" onClick={() => setError(null)}>
									✕
								</button>
							</div>
						)}

						{success && (
							<div className="success-banner">
								<span>{success}</span>
								<button type="button" onClick={() => setSuccess(null)}>
									✕
								</button>
							</div>
						)}

						{isForgotPassword ? (
								<form
									onSubmit={
									resetStep === "email"
										? handleForgotPasswordStart
										: handleForgotPasswordConfirm
								}
								className="auth-form"
							>
								{resetStep === "email" ? (
									<>
										<div className="form-group">
											<label htmlFor="pilot-reset-email">Email Address</label>
											<input
												id="pilot-reset-email"
												type="email"
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												placeholder="name@example.com"
												required
											/>
										</div>

										<button
											type="submit"
											className="submit-btn"
											disabled={loading}
										>
											{loading ? "⏳ Sending Code..." : "📧 Send Reset Code"}
										</button>
									</>
								) : (
									<>
										<div className="form-group">
											<label htmlFor="pilot-reset-code">Reset Code</label>
											<input
												id="pilot-reset-code"
												type="text"
												value={resetCode}
												onChange={(e) => setResetCode(e.target.value)}
												placeholder="Enter the 6-digit code from your email"
												required
											/>
										</div>

										<div className="form-group">
											<label htmlFor="pilot-reset-new-password">
												New Password
											</label>
											<input
												id="pilot-reset-new-password"
												type={showPassword ? "text" : "password"}
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												placeholder="••••••••"
												required
											/>
										</div>

										<div className="form-group">
											<label htmlFor="pilot-reset-confirm-password">
												Confirm Password
											</label>
											<input
												id="pilot-reset-confirm-password"
												type={showPassword ? "text" : "password"}
												value={confirmPassword}
												onChange={(e) => {
													setConfirmPassword(e.target.value);
													if (
														e.target.value &&
														newPassword &&
														e.target.value !== newPassword
													) {
														setPasswordMatch(false);
													} else {
														setPasswordMatch(true);
													}
												}}
												placeholder="••••••••"
												required
											/>
											{!passwordMatch && (
												<small
													style={{
														color: "#dc2626",
														marginTop: "4px",
														display: "block",
													}}
												>
													❌ Passwords do not match
												</small>
											)}
										</div>

										<button
											type="submit"
											className="submit-btn"
											disabled={loading || !passwordMatch}
										>
											{loading ? "⏳ Resetting..." : "🔑 Reset Password"}
										</button>
									</>
								)}

								<p className="toggle-auth">
									Remember your password?{" "}
									<button
										type="button"
										onClick={() => {
											setIsForgotPassword(false);
											setResetStep("email");
											setError(null);
											setSuccess(null);
										}}
										className="link-btn"
									>
										Sign In
									</button>
								</p>
							</form>
						) : isSignUp ? (
							signupStep === "verify" ? (
								<form onSubmit={handleVerifyOtp} className="auth-form">
									<p className="otp-hint">
										We sent a 6-digit code to{" "}
										<strong>{pendingSignup?.email || email}</strong>.
									</p>

									<div className="form-group">
										<label htmlFor="pilot-otp-code">Verification Code</label>
										<input
											id="pilot-otp-code"
											type="text"
											value={otpCode}
											onChange={(e) => setOtpCode(e.target.value)}
												placeholder="Enter your 6-digit verification code"
											required
										/>
									</div>

									<button
										type="submit"
										className="submit-btn"
										disabled={loading || !otpCode.trim()}
									>
										{loading ? "⏳ Verifying..." : "✅ Verify & Continue"}
									</button>

									<div className="otp-actions">
										<button
											type="button"
											className="link-btn"
											onClick={() =>
												handleResendOtp({ channel: "email", mode: "code" })
											}
											disabled={loading || resendCooldown > 0}
										>
											{resendCooldown > 0
												? `Resend in ${resendCooldown}s`
												: "Resend code"}
										</button>
										{pendingSignup?.phone && (
											<button
												type="button"
												className="link-btn"
												onClick={() =>
													handleResendOtp({ channel: "sms", mode: "code" })
												}
												disabled={loading || resendCooldown > 0}
											>
												{resendCooldown > 0
													? `Text in ${resendCooldown}s`
													: "Text me the code"}
											</button>
										)}
										<button
											type="button"
											className="link-btn"
											onClick={() => {
												setSignupStep("form");
												setSignupFormStage(1);
												setPendingSignup(null);
												setOtpCode("");
												setSuccess(null);
												setError(null);
											}}
										>
											Edit signup details
										</button>
									</div>
								</form>
							) : (
								<form onSubmit={handleSignUp} className="auth-form">
									<div className="pilot-step-indicator">
										<span className="pilot-step-pill">Step {signupFormStage} of 2</span>
										<span className="pilot-step-caption">
											{signupFormStage === 1
												? "Pilot details"
												: "Contact & security"}
										</span>
									</div>
									{oauthAuthBlock}

									{signupFormStage === 1 ? (
										<>

									<div className="form-group">
										<label htmlFor="pilot-first-name">First Name</label>
										<input
											id="pilot-first-name"
											type="text"
											value={firstName}
											onChange={(e) => setFirstName(e.target.value)}
												placeholder="Alex"
											required
										/>
									</div>

									<div className="form-group">
										<label htmlFor="pilot-last-name">Last Name</label>
										<input
											id="pilot-last-name"
											type="text"
											value={lastName}
											onChange={(e) => setLastName(e.target.value)}
												placeholder="Johnson"
											required
										/>
									</div>

									<div className="form-group">
										<label htmlFor="pilot-address-line1">Address Line 1</label>
										<input
											id="pilot-address-line1"
											type="text"
											value={addressLine1}
											onChange={(e) => setAddressLine1(e.target.value)}
												placeholder="15 Admiralty Way"
											required
										/>
									</div>

									<div className="form-group">
										<label htmlFor="pilot-address-line2">
											Address Line 2 (Optional)
										</label>
										<input
											id="pilot-address-line2"
											type="text"
											value={addressLine2}
											onChange={(e) => setAddressLine2(e.target.value)}
												placeholder="Flat, suite, or landmark (optional)"
										/>
									</div>

									<div className="form-group">
										<label htmlFor="pilot-city">City</label>
										<input
											id="pilot-city"
											type="text"
											value={city}
											onChange={(e) => setCity(e.target.value)}
											placeholder="Lagos"
											required
										/>
									</div>

									<div className="form-group">
										<label htmlFor="pilot-postal-code">Postal Code</label>
										<input
											id="pilot-postal-code"
											type="text"
											value={postalCode}
											onChange={(e) => setPostalCode(e.target.value)}
											placeholder="10001"
											required
										/>
									</div>

									<div className="form-group">
										<label htmlFor="pilot-signup-email">Email</label>
										<input
											id="pilot-signup-email"
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
												placeholder="name@example.com"
											required
										/>
									</div>

										<div className="pilot-stage-actions">
											<button
												type="button"
												className="pilot-secondary-btn"
												onClick={() => {
													setAuthMode("login");
													setSignupStep("form");
													setSignupFormStage(1);
													setPendingSignup(null);
													setOtpCode("");
													setSuccess(null);
													setError(null);
												}}
												disabled={loading}
											>
												Cancel
											</button>
											<button
												type="button"
												className="pilot-primary-btn"
												onClick={() => {
													if (!isStage1Valid()) {
														setError(
															"Please complete all fields in Step 1 before continuing.",
														);
														return;
													}
													setError(null);
													setSuccess(null);
													setSignupFormStage(2);
												}}
												disabled={loading || !isStage1Valid()}
											>
												Continue
											</button>
										</div>
										</>
									) : (
										<>
											<div className="pilot-country-phone">
												<div className="form-group">
													<label htmlFor="pilot-country">Country</label>
													<select
														id="pilot-country"
														value={country}
														onChange={(e) => {
															const nextCountry = e.target.value;
															setCountry(nextCountry);
															const preset = COUNTRY_PHONE_PRESETS[nextCountry];
															if (!preset?.dialCode) return;
															setPhone((prev) => {
																const rest = _stripLeadingDialCode(prev);
																return rest
																	? `${preset.dialCode} ${rest}`
																	: `${preset.dialCode} `;
															});
														}}
													required
												>
													<option value="">Select Country</option>
													<option value="United Kingdom">
														🇬🇧 United Kingdom (+44)
													</option>
													<option value="United States">
														🇺🇸 United States (+1)
													</option>
													<option value="Nigeria">🇳🇬 Nigeria (+234)</option>
													<option value="Canada">🇨🇦 Canada (+1)</option>
													<option value="Germany">🇩🇪 Germany (+49)</option>
													<option value="France">🇫🇷 France (+33)</option>
													<option value="India">🇮🇳 India (+91)</option>
													<option value="South Africa">🇿🇦 South Africa (+27)</option>
												</select>
												</div>

												<div className="form-group">
													<label htmlFor="pilot-phone">Phone Number</label>
													<input
														id="pilot-phone"
														type="tel"
														inputMode="tel"
														autoComplete="tel"
														value={phone}
														onChange={(e) => setPhone(e.target.value)}
														placeholder={
														COUNTRY_PHONE_PRESETS[country]?.placeholder ||
														"+1 555 555 5555"
													}
														required
													/>
													<div className="pilot-field-hint">
														Select a country to auto-fill the calling code.
													</div>
												</div>
											</div>

									<div className="form-group">
										<label htmlFor="pilot-password">Password</label>
										<div className="pilot-password-wrap">
											<input
												id="pilot-password"
												type={showPassword ? "text" : "password"}
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												placeholder="••••••••"
												required
												className="pilot-password-input"
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="pilot-password-toggle"
												aria-label={
													showPassword ? "Hide password" : "Show password"
												}
											>
												{showPassword ? "Hide" : "Show"}
											</button>
										</div>
									</div>

									<div className="form-group">
										<label htmlFor="pilot-confirm-password">
											Confirm Password
										</label>
										<input
											id="pilot-confirm-password"
											type={showPassword ? "text" : "password"}
											value={confirmPassword}
											onChange={(e) => {
												setConfirmPassword(e.target.value);
												if (
													e.target.value &&
													password &&
													e.target.value !== password
												) {
													setPasswordMatch(false);
												} else {
													setPasswordMatch(true);
												}
											}}
											placeholder="••••••••"
											required
										/>
										{!passwordMatch && (
											<small
												style={{
													color: "#dc2626",
													marginTop: "4px",
													display: "block",
												}}
											>
												❌ Passwords do not match
											</small>
										)}
									</div>


									<div className="pilot-stage-actions">
										<button
											type="button"
											className="pilot-secondary-btn"
											onClick={() => {
												setSignupFormStage(1);
												setError(null);
												setSuccess(null);
											}}
											disabled={loading}
										>
											Back
										</button>
										<button
											type="submit"
											className="pilot-primary-btn"
											disabled={loading || !isStage2Valid()}
										>
											{loading ? "Creating account..." : "Create account"}
										</button>
									</div>
									<div className="pilot-field-hint pilot-stage-note">
										By creating an account you agree to receive verification messages.
									</div>

									<p className="toggle-auth">
										Already have an account?{" "}
										<button
											type="button"
											onClick={() => {
											setAuthMode("login");
												setSignupStep("form");
											setSignupFormStage(1);
												setPendingSignup(null);
												setOtpCode("");
												setSuccess(null);
												setError(null);
											}}
											className="link-btn"
										>
											Sign In
										</button>
									</p>
										</>
									)}
								</form>
							)
						) : (
							<form onSubmit={handleSignIn} className="auth-form">
								{oauthAuthBlock}

								<div className="form-group">
									<label htmlFor="pilot-login-email">Email</label>
									<input
										id="pilot-login-email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="name@example.com"
										required
									/>
								</div>

								<div className="form-group">
									<label htmlFor="pilot-login-password">Password</label>
									<div className="pilot-password-wrap">
										<input
											id="pilot-login-password"
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="••••••••"
											required
											className="pilot-password-input"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="pilot-password-toggle"
											aria-label={
												showPassword ? "Hide password" : "Show password"
											}
										>
											{showPassword ? "Hide" : "Show"}
										</button>
									</div>
								</div>

								<button type="submit" className="submit-btn" disabled={loading}>
									{loading ? "⏳ Signing In..." : "Sign in"}
								</button>

								<p className="toggle-auth">
									Forgot your password?{" "}
									<button
										type="button"
										onClick={() => {
										setIsForgotPassword(true);
											setError(null);
										}}
										className="link-btn"
									>
										Reset It
									</button>
								</p>

								<p className="toggle-auth">
									New to ErrandBridge?{" "}
									<button
										type="button"
										onClick={() => {
										setAuthMode("signup");
										setSignupStep("form");
										setSignupFormStage(1);
										setPendingSignup(null);
										setOtpCode("");
										setSuccess(null);
										setError(null);
									}}
										className="link-btn"
									>
										Create Account
									</button>
								</p>
							</form>
						)}

						</div>
					</div>
				</div>
			</div>
		</main>
	);
};

export default PilotPortal;
