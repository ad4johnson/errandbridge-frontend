import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser as CapacitorBrowser } from "@capacitor/browser";
import { CapacitorHttp } from "@capacitor/core";

// This route can render without RootApp, which normally lazy-loads global styles.
// Import Tailwind utilities + existing global CSS here so /login and /signup render correctly.
import "./tailwind.css";
import "./index.css";

import {
	getCapacitorHostedBaseUrl,
	getCapacitorLoopbackFallbackUrl,
	isHostedApiBaseUrl,
	isLocalLikeApiBaseUrl,
	isLoopbackApiBaseUrl,
	resolveApiBaseUrl,
} from "./lib/apiBaseUrl";
import { isPilotHostname } from "./lib/hostRouting";
import { fetchOAuthStatus } from "./lib/oauthStatus";
import cache from "./utils/cache";

const AuthModal = lazy(() => import("./components/AuthModal"));
const ErrandBridgeAuthCard = lazy(() => import("./components/ErrandBridgeAuthCard"));
const EmailVerificationModal = lazy(
	() => import("./components/EmailVerificationModal"),
);
const ROUTE_LOGIN = "/login";
const ROUTE_SIGNUP = "/signup";
const ROUTE_HOME = "/home";
const ROUTE_LANDING = ROUTE_HOME;

const getStoredValue = (cacheKey, localStorageKey = null) => {
	try {
		return (
			cache.getUserField(cacheKey) ||
			localStorage.getItem(localStorageKey || `lastCustomer${cacheKey}`) ||
			""
		);
	} catch {
		return cache.getUserField(cacheKey) || "";
	}
};

const getSignupPrefillFromSearch = (search = "") => {
	const params = new URLSearchParams(search || "");
	const email = (params.get("email") || "").trim();
	const firstName = (params.get("firstName") || params.get("first_name") || "").trim();
	const lastName = (params.get("lastName") || params.get("last_name") || "").trim();
	const fullName = (
		params.get("name") ||
		params.get("fullName") ||
		params.get("full_name") ||
		""
	).trim();

	return {
		email,
		firstName,
		lastName,
		fullName,
		hasPrefill: Boolean(email || firstName || lastName || fullName),
	};
};

const isExpectedAuthError = (message = "") => {
	const normalizedMessage = message.toLowerCase();
	return (
		normalizedMessage.includes("email not verified") ||
		normalizedMessage.includes("pending verification") ||
		normalizedMessage.includes("verify your email") ||
		normalizedMessage.includes("invalid email or password") ||
		normalizedMessage.includes("invalid credentials") ||
		normalizedMessage.includes("wrong password") ||
		normalizedMessage.includes("user not found") ||
		normalizedMessage.includes("not registered")
	);
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

const toLoggableError = (error) => {
	if (!error) return { message: "<empty error>" };
	if (typeof error === "string") return { message: error };
	const name = String(error?.name || "Error");
	const message = String(error?.message || "");
	const stack = typeof error?.stack === "string" ? error.stack : undefined;
	// Include a couple of non-enumerable-ish fields that can be useful in Safari/WebKit.
	const code = error?.code;
	const cause = error?.cause;
	return {
		name,
		message,
		stack,
		...(code ? { code } : {}),
		...(cause ? { cause: String(cause) } : {}),
	};
};

const logJson = (level, tag, payload) => {
	try {
		const safeLevel = typeof level === "string" ? level : "log";
		const fn = console?.[safeLevel] || console?.log;
		if (!fn) return;
		fn.call(console, `${tag} ${JSON.stringify(payload)}`);
	} catch {
		// ignore
	}
};

const PHONE_ALIAS_DOMAIN = "@phone-auth.errandbridge.com";

const normalizePhone = (value = "") => {
	const raw = String(value || "").trim();
	const digits = raw.replace(/\D/g, "");
	if (!digits) return "";
	return raw.startsWith("+") ? `+${digits}` : digits;
};

const isLikelyPhoneIdentifier = (value = "") => {
	const raw = String(value || "").trim();
	return !raw.includes("@") && raw.replace(/\D/g, "").length >= 7;
};

const isPhoneAliasEmail = (value = "") =>
	String(value || "").trim().toLowerCase().endsWith(PHONE_ALIAS_DOMAIN);

export default function CustomerAuthPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const pathname = location?.pathname || ROUTE_LOGIN;
	const authPathMode = pathname === ROUTE_SIGNUP ? "signup" : "login";
	const isCapacitor =
		typeof window !== "undefined" && typeof window.Capacitor !== "undefined";
	const capacitorPlatform =
		isCapacitor && window.Capacitor?.getPlatform
			? window.Capacitor.getPlatform()
			: window.Capacitor?.platform;
	const currentHost =
		typeof window !== "undefined" ? window.location.hostname : "";
	const isLocalCustomerHost =
		currentHost === "localhost" || currentHost === "127.0.0.1";
	const isPrivateNetworkHost = /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(
		currentHost || "",
	);
	const isLocalDevCustomerHost =
		isLocalCustomerHost ||
		(process.env.NODE_ENV !== "production" &&
			(isPrivateNetworkHost || String(currentHost || "").endsWith(".local")));
	const isPilotHost = isPilotHostname(currentHost);
	const [apiBaseUrl, setApiBaseUrl] = useState(() => resolveApiBaseUrl());
	const hostedApiBaseUrl = getCapacitorHostedBaseUrl();
	const forceLocalCustomerAuth =
		process.env.REACT_APP_FORCE_API_BASE === "true" &&
		isCapacitor &&
		!isHostedApiBaseUrl(apiBaseUrl) &&
		isLocalLikeApiBaseUrl(apiBaseUrl);
	const hostedApiFallbackBase =
		!forceLocalCustomerAuth &&
		isCapacitor &&
		!isHostedApiBaseUrl(apiBaseUrl) &&
		(isLoopbackApiBaseUrl(apiBaseUrl) || /^http:\/\//i.test(String(apiBaseUrl || ""))) &&
		hostedApiBaseUrl &&
		hostedApiBaseUrl !== apiBaseUrl
			? hostedApiBaseUrl
			: "";
	const localCustomerAuthFailureMessage = forceLocalCustomerAuth
		? `We couldn’t reach your local customer API from this ${capacitorPlatform === "android" ? "Android" : "iOS"} device. Keep the local backend running and connect this phone to the same Wi‑Fi/LAN as your Mac. Mobile data cannot reach a private dev server. For tester builds, rebuild Android with the hosted API before trying again.`
		: "";
	const openPilotLogin = useCallback(() => {
		if (typeof window === "undefined") return;

		const isLocalLikeRuntime =
			isCapacitor ||
			isLocalCustomerHost ||
			currentHost === "127.0.0.1" ||
			process.env.NODE_ENV !== "production";

		if (isLocalLikeRuntime) {
			navigate("/pilot/login");
			return;
		}

		const hostedPilotBaseUrl = String(
			process.env.REACT_APP_PILOT_BASE_URL || "https://pilot.errandbridge.com",
		)
			.trim()
			.replace(/\/+$/, "");
		window.location.assign(`${hostedPilotBaseUrl}/login`);
	}, [currentHost, isCapacitor, isLocalCustomerHost, navigate]);

	const [authMode, setAuthMode] = useState(authPathMode);
	const [authFirstName, setAuthFirstName] = useState(() =>
		getStoredValue("firstName", "lastCustomerFirstName"),
	);
	const [authLastName, setAuthLastName] = useState(() =>
		getStoredValue("lastName", "lastCustomerLastName"),
	);
	const [authFullName, setAuthFullName] = useState(() => {
		const first = getStoredValue("firstName", "lastCustomerFirstName");
		const last = getStoredValue("lastName", "lastCustomerLastName");
		return `${first} ${last}`.trim();
	});
	const [authEmail, setAuthEmail] = useState(() =>
		getStoredValue("email", "lastCustomerEmail"),
	);
	const [authPhone, setAuthPhone] = useState(() =>
		getStoredValue("phone", "lastCustomerPhone"),
	);
	const [authSignupMethod, setAuthSignupMethod] = useState("email");
	const [authPassword, setAuthPassword] = useState("");
	const [authConfirmPassword, setAuthConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [authError, setAuthError] = useState("");
	const [authErrorAction, setAuthErrorAction] = useState("");
	const [authSubmitting, setAuthSubmitting] = useState(false);

	const [resetPwMode, setResetPwMode] = useState(false);
	const [resetStep, setResetStep] = useState("request");
	const [resetEmail, setResetEmail] = useState(() =>
		getStoredValue("email", "lastCustomerEmail"),
	);
	const [resetCode, setResetCode] = useState("");
	const [resetNewPassword, setResetNewPassword] = useState("");
	const [resetConfirmPassword, setResetConfirmPassword] = useState("");
	const [showResetNewPassword, setShowResetNewPassword] = useState(false);
	const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
	const [resetError, setResetError] = useState("");
	const [resetSuccess, setResetSuccess] = useState("");
	const [resetSubmitting, setResetSubmitting] = useState(false);

	const [showVerificationModal, setShowVerificationModal] = useState(false);
	const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
	const [pendingVerificationChannel, setPendingVerificationChannel] =
		useState("email");
	const [pendingVerificationPassword, setPendingVerificationPassword] =
		useState("");
	const [verificationCode, setVerificationCode] = useState("");
	const [verificationError, setVerificationError] = useState("");
	const [verificationLinkStatus, setVerificationLinkStatus] = useState("");
	const [verificationLoginPrompt, setVerificationLoginPrompt] = useState("");

	const googleClientId =
		process.env.REACT_APP_GOOGLE_CUSTOMER_CLIENT_ID ||
		process.env.REACT_APP_GOOGLE_CLIENT_ID ||
		process.env.REACT_APP_GOOGLE_PILOT_CLIENT_ID ||
		"";
	const googleAuthEnabledFlag = (
		process.env.REACT_APP_GOOGLE_AUTH_ENABLED || ""
	).toLowerCase();
	const googleRedirectEnabledFlag = (
		process.env.REACT_APP_GOOGLE_REDIRECT_AUTH_ENABLED || ""
	).toLowerCase();
	// Redirect-based Google auth is opt-in. If unset, default back to the official GIS button.
	const googleRedirectEnabled = googleRedirectEnabledFlag === "true";
	const googleAuthAllowedHosts = (process.env.REACT_APP_GOOGLE_AUTH_HOSTS || "")
		.split(",")
		.map((host) => host.trim())
		.filter(Boolean);
	const googleAuthHostAllowed =
		isLocalDevCustomerHost ||
		googleAuthAllowedHosts.length === 0 ||
		googleAuthAllowedHosts.some((host) => {
			if (!host) return false;
			if (currentHost === host) return true;
			return currentHost.endsWith(`.${host}`);
		});
	const googleIdentityAuthRequested =
		!googleRedirectEnabled &&
		Boolean(googleClientId) &&
		googleAuthEnabledFlag !== "false" &&
		googleAuthHostAllowed;
	const googleAuthDisabledReason = googleRedirectEnabled
		? "Google sign-in is using the redirect flow."
		: !googleClientId
			? "Google sign-in isn’t configured yet."
			: !googleAuthHostAllowed
				? `Google sign-in is disabled for ${currentHost || "this domain"}.`
				: googleAuthEnabledFlag === "false"
					? "Google sign-in is disabled."
					: "Google sign-in isn’t available right now.";
	const googleButtonRef = useRef(null);
	const [googleAuthReady, setGoogleAuthReady] = useState(false);
	const [googleAuthError, setGoogleAuthError] = useState("");

	const appleAuthEnabledFlag = (
		process.env.REACT_APP_APPLE_AUTH_ENABLED || ""
	).toLowerCase();
	const appleAuthAllowedHosts = (process.env.REACT_APP_APPLE_AUTH_HOSTS || "")
		.split(",")
		.map((host) => host.trim())
		.filter(Boolean);
	const appleAuthEnabled =
		appleAuthEnabledFlag === "true" &&
		(appleAuthAllowedHosts.length === 0 ||
			appleAuthAllowedHosts.some((host) => currentHost === host || currentHost.endsWith(`.${host}`)));
	const appleAuthRequested =
		appleAuthEnabled || (isLocalDevCustomerHost && appleAuthEnabledFlag === "true");
	const [oauthAuthError, setOauthAuthError] = useState("");
	const [oauthAuthBusy, setOauthAuthBusy] = useState("");
	const [oauthStatus, setOauthStatus] = useState(null);
	const oauthPopupRef = useRef(null);

	const splitFullName = useCallback((value) => {
		const normalized = String(value || "").trim().replace(/\s+/g, " ");
		if (!normalized) return { firstName: "", lastName: "" };
		const parts = normalized.split(" ");
		if (parts.length === 1) return { firstName: parts[0], lastName: "" };
		return {
			firstName: parts[0],
			lastName: parts.slice(1).join(" "),
		};
	}, []);

	const handleFullNameChange = useCallback(
		(value) => {
			setAuthFullName(value);
			const { firstName, lastName } = splitFullName(value);
			setAuthFirstName(firstName);
			setAuthLastName(lastName);
		},
		[splitFullName],
	);

	useEffect(() => {
		if (authPathMode !== "signup") return;

		const prefill = getSignupPrefillFromSearch(location?.search || "");
		if (!prefill.hasPrefill) return;

		if (prefill.email) {
			setAuthEmail(prefill.email);
			setResetEmail(prefill.email);
		}

		const fallbackFromFullName =
			!prefill.firstName && !prefill.lastName && prefill.fullName
				? splitFullName(prefill.fullName)
				: { firstName: "", lastName: "" };
		const nextFirstName = prefill.firstName || fallbackFromFullName.firstName;
		const nextLastName = prefill.lastName || fallbackFromFullName.lastName;
		const nextFullName = [nextFirstName, nextLastName].filter(Boolean).join(" ").trim();

		if (nextFirstName || nextLastName || prefill.fullName) {
			setAuthFirstName(nextFirstName);
			setAuthLastName(nextLastName);
			setAuthFullName(nextFullName || prefill.fullName);
		}
	}, [authPathMode, location?.search, splitFullName]);

	const startResetFlow = useCallback(() => {
		setResetPwMode(true);
		setResetStep("request");
		setResetEmail(authEmail.includes("@") ? authEmail : "");
		setResetCode("");
		setResetNewPassword("");
		setResetConfirmPassword("");
		setResetError("");
		setResetSuccess("");
		setOauthAuthError("");
		setAuthError("");
		setAuthErrorAction("");
	}, [authEmail]);

	useEffect(() => {
		if (!isPilotHost || typeof window === "undefined") return;
		const targetSearch = authPathMode === "signup" ? "?signup=true" : "?login=true";
		const target = `/${targetSearch}${window.location.hash || ""}`;
		if (`${window.location.pathname}${window.location.search}${window.location.hash}` === target) {
			return;
		}
		window.location.replace(target);
	}, [authPathMode, isPilotHost]);

	const syncAuthRoute = useCallback(
		(mode, replace = true) => {
			navigate(mode === "signup" ? ROUTE_SIGNUP : ROUTE_LOGIN, { replace });
		},
		[navigate],
	);

	useEffect(() => {
		setAuthMode(authPathMode);
		setAuthError("");
		setAuthErrorAction("");
		setOauthAuthError("");
		setAuthConfirmPassword("");
	}, [authPathMode]);

	const fetchWithTimeout = useCallback(
		async (url, options = {}, config = {}) => {
			const { timeoutMs = 30000, retries = 1, retryDelayMs = 1000 } = config;
			let lastError = null;
			const fallbackUrl = getCapacitorLoopbackFallbackUrl(
				url,
				capacitorPlatform,
			);
			const requestUrls =
				fallbackUrl && fallbackUrl !== url ? [url, fallbackUrl] : [url];
			const shouldUseNativeHttp =
				Boolean(capacitorPlatform) &&
				Boolean(isCapacitor) &&
				Boolean(window?.Capacitor?.isNativePlatform?.());

			const asResponseLike = (nativeResponse) => {
				const status = Number(nativeResponse?.status ?? 0);
				const headersObj = nativeResponse?.headers || {};
				const lowerHeaders = {};
				try {
					for (const [key, value] of Object.entries(headersObj)) {
						lowerHeaders[String(key).toLowerCase()] = value;
					}
				} catch {
					// ignore
				}
				const data = nativeResponse?.data;
				return {
					ok: status >= 200 && status < 300,
					status,
					headers: {
						get: (name) => lowerHeaders[String(name || "").toLowerCase()] ?? null,
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
					contentType =
						typeof headers?.get === "function"
							? headers.get("content-type") || headers.get("Content-Type")
							: headers?.["Content-Type"] || headers?.["content-type"];
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
				return asResponseLike(
					await Promise.race([
						work,
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error("Request timeout")), timeoutMs),
						),
					]),
				);
			};

			for (let attempt = 0; attempt <= retries; attempt += 1) {
				for (const requestUrl of requestUrls) {
					if (shouldUseNativeHttp) {
						try {
							return await nativeRequest(requestUrl);
						} catch (error) {
							lastError = error;
							const isNetwork = isRetryableNetworkAuthError(error);
							if (attempt < retries && isNetwork) {
								await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
								break;
							}
							throw error;
						}
					}

					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

					try {
						const response = await fetch(requestUrl, {
							...options,
							signal: controller.signal,
						});
						clearTimeout(timeoutId);
						return response;
					} catch (error) {
						clearTimeout(timeoutId);
						lastError = error;
						const isAbort = error?.name === "AbortError";
						const isNetwork = isRetryableNetworkAuthError(error);
						const canTryAlternate =
							requestUrl !== requestUrls[requestUrls.length - 1] &&
							(isAbort || isNetwork);
						if (canTryAlternate) {
							logJson("warn", "[NETWORK] alternate loopback retry", {
								from: requestUrl,
								to: requestUrls[requestUrls.length - 1],
								error: toLoggableError(error),
								attempt,
							});
							continue;
						}
						if (attempt < retries && (isAbort || isNetwork)) {
							await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
							break;
						}
						throw error;
					}
				}
			}

			throw lastError || new Error("Request failed");
		},
		[capacitorPlatform, isCapacitor],
	);

	useEffect(() => {
		const shouldCheckOAuthStatus =
			googleRedirectEnabled || googleIdentityAuthRequested || appleAuthRequested;
		if (typeof window === "undefined" || !shouldCheckOAuthStatus) {
			setOauthStatus(null);
			return undefined;
		}

		let cancelled = false;
		fetchOAuthStatus({
			apiBaseUrl,
			origin: window.location.origin,
			role: "client",
		})
			.then((status) => {
				if (cancelled) return;
				setOauthStatus(status);
			})
			.catch((error) => {
				if (cancelled) return;
				console.warn("[CUSTOMER AUTH] OAuth status check failed", error);
				setOauthStatus({ error: error?.message || "Unable to load social sign-in status" });
			});

		return () => {
			cancelled = true;
		};
	}, [apiBaseUrl, appleAuthRequested, googleIdentityAuthRequested, googleRedirectEnabled]);

	const googleRedirectStatus = oauthStatus?.google?.redirect || null;
	const googleTokenStatus = oauthStatus?.google?.token || null;
	const appleRedirectStatus = oauthStatus?.apple?.redirect || null;
	const googleAuthEnabled =
		googleIdentityAuthRequested && googleTokenStatus?.enabled !== false;
	const googleRedirectButtonEnabled =
		googleRedirectEnabled && googleAuthHostAllowed;
	const appleAuthEnabledForCard =
		appleAuthRequested && appleRedirectStatus?.enabled !== false;
	const authIdentifierValue =
		authMode === "signup" && authSignupMethod === "phone" ? authPhone : authEmail;
	const signupIdentifierValue =
		authSignupMethod === "phone" ? normalizePhone(authPhone) : authEmail;
	const signupPhoneValue =
		authSignupMethod === "phone" ? normalizePhone(authPhone) : null;
	const signupOtpChannel = authSignupMethod === "phone" ? "sms" : "email";
	const verificationTitle =
		pendingVerificationChannel === "sms" ? "Verify your phone" : "Verify your email";
	const verificationDestinationLabel =
		pendingVerificationChannel === "sms"
			? "We sent a 6-digit verification code to:"
			: "We sent a 6-digit confirmation code to:";
	const verificationResendLabel =
		pendingVerificationChannel === "sms"
			? "Didn't receive the text? Resend code"
			: "Didn't receive code? Resend";

	const graphqlAuthAgainstBase = useCallback(
		async (baseUrl, isLogin) => {
			const loginMutation = `mutation Login($email: String!, $password: String!, $role: String!) {
				login(input: { email: $email, password: $password, role: $role }) {
					accessToken userId email firstName lastName phone addressLine1 addressLine2 city state postalCode country isEmailVerified isAdmin
				}
			}`;
			const signupMutation = `mutation Signup(
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
				$otpDeliveryChannel: String
				$otpDeliveryMode: String
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
					otpDeliveryChannel: $otpDeliveryChannel
					otpDeliveryMode: $otpDeliveryMode
					role: $role
				}) {
					accessToken userId email firstName lastName phone addressLine1 addressLine2 city state postalCode country isEmailVerified isAdmin
				}
			}`;
			const variables = isLogin
				? { email: authIdentifierValue, password: authPassword, role: "client" }
				: {
					email: signupIdentifierValue,
					password: authPassword,
					firstName: authFirstName || null,
					lastName: authLastName || null,
					phone: signupPhoneValue,
					addressLine1: null,
					addressLine2: null,
					city: null,
					state: null,
					postalCode: null,
					country: null,
					otpDeliveryChannel: signupOtpChannel,
					otpDeliveryMode: "code",
					role: "client",
				};

			const response = await fetchWithTimeout(
				`${baseUrl}/graphql`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						query: isLogin ? loginMutation : signupMutation,
						variables,
					}),
				},
				{ timeoutMs: 30000, retries: 1, retryDelayMs: 1200 },
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${await response.text()}`);
			}

			const result = await response.json();
			if (result.errors?.length) {
				throw new Error(result.errors[0].message || "Authentication failed");
			}

			const authData = isLogin ? result.data?.login : result.data?.signup;
			if (!authData) throw new Error("No auth data returned");
			return authData;
		},
		[
			authIdentifierValue,
			authFirstName,
			authLastName,
			authPassword,
			fetchWithTimeout,
			signupIdentifierValue,
			signupOtpChannel,
			signupPhoneValue,
		],
	);

	const restAuthAgainstBase = useCallback(
		async (baseUrl, isLogin) => {
			const response = await fetchWithTimeout(
				`${baseUrl}${isLogin ? "/auth/login" : "/auth/signup"}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(
						isLogin
							? {
								email: authIdentifierValue,
								password: authPassword,
								role: "client",
							}
							: {
								email: signupIdentifierValue,
								password: authPassword,
								first_name: authFirstName || null,
								last_name: authLastName || null,
								phone: signupPhoneValue,
								address_line1: null,
								address_line2: null,
								city: null,
								state: null,
								postal_code: null,
								country: null,
								otp_delivery_channel: signupOtpChannel,
								otp_delivery_mode: "code",
								role: "client",
							},
					),
				},
				{ timeoutMs: 30000, retries: 1, retryDelayMs: 1200 },
			);
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(
					data?.detail || `${isLogin ? "Login" : "Signup"} failed. Please try again.`,
				);
			}
			if (!data?.access_token || !data?.user_id) {
				throw new Error(
					`${isLogin ? "Login" : "Signup"} failed. No access token returned.`,
				);
			}
			return {
				accessToken: data.access_token,
				userId: data.user_id,
				email: data.email || authIdentifierValue,
				firstName: data.first_name,
				lastName: data.last_name,
				phone: data.phone,
				isEmailVerified: data.is_email_verified,
				isAdmin: data.is_admin,
			};
		},
		[
			authFirstName,
			authIdentifierValue,
			authLastName,
			authPassword,
			fetchWithTimeout,
			signupIdentifierValue,
			signupOtpChannel,
			signupPhoneValue,
		],
	);

	useEffect(() => {
		// Helpful diagnostic: in Capacitor local dev, verify we can reach the backend.
		// This keeps "Load failed" from being a black box.
		if (!isCapacitor) return;
		if (!isLocalDevCustomerHost) return;
		let cancelled = false;
		(async () => {
			try {
				const startedAt = Date.now();
				const res = await fetchWithTimeout(
					`${apiBaseUrl}/`,
					{ method: "GET" },
					{ timeoutMs: 8000, retries: 0 },
				);
				if (cancelled) return;
				logJson("log", "[NETWORK] api reachability", {
					apiBaseUrl: apiBaseUrl,
					status: res.status,
					ok: res.ok,
					ms: Date.now() - startedAt,
					platform: capacitorPlatform,
					origin: typeof window !== "undefined" ? window.location?.origin : undefined,
				});
			} catch (error) {
				if (cancelled) return;
				logJson("warn", "[NETWORK] api reachability failed", {
					apiBaseUrl: apiBaseUrl,
					platform: capacitorPlatform,
					origin: typeof window !== "undefined" ? window.location?.origin : undefined,
					error: toLoggableError(error),
				});
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [apiBaseUrl, capacitorPlatform, fetchWithTimeout, isCapacitor, isLocalDevCustomerHost]);

	const graphqlAuth = useCallback(
		async (isLogin) => {
			try {
				return await graphqlAuthAgainstBase(apiBaseUrl, isLogin);
			} catch (error) {
				if (error?.name === "AbortError") {
					throw new Error(
						"Request timeout. Please check your connection and try again.",
					);
				}
				if (!isExpectedAuthError(error?.message || "")) {
					logJson("error", "[CUSTOMER AUTH] graphql auth failed", {
						apiBaseUrl,
						platform: capacitorPlatform,
						origin: typeof window !== "undefined" ? window.location?.origin : undefined,
						error: toLoggableError(error),
					});
				}
				throw error;
			}
		},
		[
			apiBaseUrl,
			capacitorPlatform,
			graphqlAuthAgainstBase,
		],
	);

	const graphqlLoginWithCredentials = useCallback(
		async (email, password) => {
			const mutation = `mutation Login($email: String!, $password: String!, $role: String!) {
				login(input: { email: $email, password: $password, role: $role }) {
					accessToken userId email firstName lastName phone addressLine1 addressLine2 city state postalCode country isEmailVerified isAdmin
				}
			}`;
			const response = await fetchWithTimeout(
				`${apiBaseUrl}/graphql`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						query: mutation,
						variables: { email, password, role: "client" },
					}),
				},
				{ timeoutMs: 30000, retries: 1, retryDelayMs: 1200 },
			);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${await response.text()}`);
			}
			const result = await response.json();
			if (result.errors?.length) {
				throw new Error(result.errors[0].message || "Authentication failed");
			}
			const authData = result.data?.login;
			if (!authData) throw new Error("No auth data returned");
			return authData;
		},
		[apiBaseUrl, fetchWithTimeout],
	);

	const restLogin = useCallback(async () => {
		return restAuthAgainstBase(apiBaseUrl, true);
	}, [apiBaseUrl, restAuthAgainstBase]);

	const restSignup = useCallback(async () => {
		return restAuthAgainstBase(apiBaseUrl, false);
	}, [apiBaseUrl, restAuthAgainstBase]);

	const applyAuthSession = useCallback(
		async (authData, options = {}) => {
			const { openProfileLanding = false } = options;
			const firstName = authData.firstName || authFirstName || "";
			const lastName = authData.lastName || authLastName || "";
			const resolvedEmail = isPhoneAliasEmail(authData.email)
				? ""
				: authData.email || authEmail || "";
			const resolvedPhone = authData.phone || authPhone || "";
			const resolvedUserId = authData.userId ? String(authData.userId) : "";

			localStorage.setItem("lastCustomerEmail", resolvedEmail);
			localStorage.setItem("lastCustomerFirstName", firstName);
			localStorage.setItem("lastCustomerLastName", lastName);
			localStorage.setItem("lastCustomerPhone", resolvedPhone);
			localStorage.setItem("lastCustomerCity", authData.city || "");
			localStorage.setItem("lastCustomerCountry", authData.country || "");
			localStorage.setItem("lastCustomerPostcode", authData.postalCode || "");
			localStorage.setItem(
				"lastCustomerAddress",
				[authData.addressLine1, authData.addressLine2].filter(Boolean).join(", "),
			);
			localStorage.setItem("authToken", authData.accessToken);
			localStorage.setItem("userId", String(authData.userId || ""));
			localStorage.setItem(
				"userIsAdmin",
				authData.isAdmin ? "true" : "false",
			);

			cache.setAuthToken(authData.accessToken);
			if (resolvedUserId) {
				cache.recordTrustedDevice(resolvedUserId);
			}
			cache.setUserField("email", resolvedEmail);
			cache.setUserField("firstName", firstName);
			cache.setUserField("lastName", lastName);
			cache.setUserProfile({
				email: resolvedEmail,
				firstName,
				lastName,
				phone: resolvedPhone,
				address: [authData.addressLine1, authData.addressLine2]
					.filter(Boolean)
					.join(", "),
				city: authData.city || "",
				country: authData.country || "",
				postcode: authData.postalCode || "",
			});

			if (openProfileLanding) {
				sessionStorage.setItem("profileLandingAfterSignup", "true");
				if (authData.userId) {
					localStorage.setItem(
						`profileLandingAfterSignup_${authData.userId}`,
						"true",
					);
				}
			}

			navigate(ROUTE_HOME, { replace: true });
		},
		[authEmail, authFirstName, authLastName, authPhone, navigate],
	);

	const switchToSignupMode = useCallback(() => {
		setAuthMode("signup");
		setAuthSignupMethod("email");
		setAuthError("");
		setAuthErrorAction("");
		setResetPwMode(false);
		setResetStep("request");
		setShowPassword(false);
		setPendingVerificationPassword("");
		sessionStorage.removeItem("pendingVerificationEmail");
		sessionStorage.removeItem("pendingVerificationPassword");
		syncAuthRoute("signup", false);
	}, [syncAuthRoute]);

	const switchToLoginMode = useCallback(() => {
		setAuthMode("login");
		setAuthError("");
		setAuthErrorAction("");
		setResetPwMode(false);
		setResetStep("request");
		syncAuthRoute("login", false);
	}, [syncAuthRoute]);

	const resendVerificationCode = useCallback(
		async (targetEmail = null, deliveryChannel = pendingVerificationChannel) => {
			const emailToUse = targetEmail || pendingVerificationEmail;
			if (!emailToUse) {
				setVerificationError("Missing verification destination. Please sign up again.");
				return;
			}
			setVerificationLinkStatus(
				deliveryChannel === "sms" ? "Sending text code..." : "Sending verification code...",
			);
			try {
				const response = await fetch(`${apiBaseUrl}/auth/resend-confirmation`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: emailToUse,
						otp_delivery_channel: deliveryChannel,
						otp_delivery_mode: "code",
					}),
				});

				if (response.status === 404) {
					const fallbackResponse = await fetch(`${apiBaseUrl}/auth/resend`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ email: emailToUse }),
					});
					const fallbackData = await fallbackResponse.json();
					if (fallbackData.ok || fallbackResponse.ok) {
						setVerificationError("");
						setVerificationLinkStatus(
							deliveryChannel === "sms" ? "A new text code is on the way." : "A new code is on the way.",
						);
						return;
					}
					setVerificationError(
						fallbackData.detail ||
							"Unable to resend code. Please try again shortly.",
					);
					setVerificationLinkStatus("");
					return;
				}

				const data = await response.json();
				if (data.ok || response.ok) {
					setVerificationError("");
					setVerificationLinkStatus(
						deliveryChannel === "sms" ? "A new text code is on the way." : "A new code is on the way.",
					);
				} else {
					setVerificationError(
						data.detail || "Unable to resend code. Please try again shortly.",
					);
					setVerificationLinkStatus("");
				}
			} catch {
				setVerificationError(
					"Unable to resend code. Please try again shortly.",
				);
				setVerificationLinkStatus("");
			}
		},
		[apiBaseUrl, pendingVerificationChannel, pendingVerificationEmail],
	);

	const handleAuthSubmit = useCallback(
		async (event) => {
			event.preventDefault();
			if (authSubmitting) return;
			setAuthError("");
			setAuthErrorAction("");

			if (authMode === "signup") {
				if (!(authFirstName || "").trim() || !(authLastName || "").trim()) {
					setAuthError("Please enter both first and last name to continue.");
					setAuthErrorAction("signup");
					return;
				}
				if (authSignupMethod === "phone" && !normalizePhone(authPhone)) {
					setAuthError("Please enter a valid phone number to continue.");
					setAuthErrorAction("signup");
					return;
				}
			}

			setAuthSubmitting(true);

			const completeAuthFlow = async (authData) => {
				if (authMode === "signup" && authData.accessToken && !authData.error) {
					sessionStorage.setItem("profileLandingAfterSignup", "true");
					if (authData.userId) {
						localStorage.setItem(
							`profileLandingAfterSignup_${authData.userId}`,
							"true",
						);
					}
					const isVerified =
						authData.isEmailVerified ?? authData.is_email_verified ?? false;
					if (isVerified) {
						await applyAuthSession(authData, { openProfileLanding: true });
						return;
					}
					const verificationTarget =
						authSignupMethod === "phone" ? normalizePhone(authPhone) : authEmail;
					setPendingVerificationEmail(verificationTarget);
					setPendingVerificationChannel(signupOtpChannel);
					setPendingVerificationPassword(authPassword);
					sessionStorage.setItem("pendingVerificationEmail", verificationTarget);
					sessionStorage.setItem("pendingVerificationPassword", authPassword);
					setShowVerificationModal(true);
					setVerificationCode("");
					setVerificationError("");
					setVerificationLinkStatus(
						signupOtpChannel === "sms" ? "Sending text code..." : "Sending verification code...",
					);
					setAuthPassword("");
					await resendVerificationCode(verificationTarget, signupOtpChannel);
					return;
				}

				if (authData.accessToken) {
					await applyAuthSession(authData);
				}
			};

			try {
				const authData = await graphqlAuth(authMode === "login");
				await completeAuthFlow(authData);
			} catch (error) {
				const message = error?.message || "Auth failed. Please try again.";
				const normalizedMessage = message.toLowerCase();
				const shouldFallbackToRest =
					isRetryableNetworkAuthError(error) ||
					normalizedMessage.includes("timeout") ||
					normalizedMessage.includes("network") ||
					normalizedMessage.includes("failed to fetch") ||
					normalizedMessage.includes("load failed");

				if (shouldFallbackToRest) {
					try {
						const authData =
							authMode === "login" ? await restLogin() : await restSignup();
						await completeAuthFlow(authData);
						return;
					} catch (fallbackError) {
						logJson("error", "[CUSTOMER AUTH] REST fallback failed", {
							apiBaseUrl: apiBaseUrl,
							platform: capacitorPlatform,
							origin: typeof window !== "undefined" ? window.location?.origin : undefined,
							error: toLoggableError(fallbackError),
						});
						if (forceLocalCustomerAuth) {
							setAuthError(localCustomerAuthFailureMessage || fallbackError?.message || message);
							return;
						}
						if (hostedApiFallbackBase) {
							try {
								const hostedAuthData = await graphqlAuthAgainstBase(
									hostedApiFallbackBase,
									authMode === "login",
								);
								setApiBaseUrl(hostedApiFallbackBase);
								await completeAuthFlow(hostedAuthData);
								return;
							} catch (hostedGraphqlError) {
								logJson("warn", "[CUSTOMER AUTH] hosted graphql fallback failed", {
									from: apiBaseUrl,
									to: hostedApiFallbackBase,
									error: toLoggableError(hostedGraphqlError),
								});
								try {
									const hostedAuthData = await restAuthAgainstBase(
										hostedApiFallbackBase,
										authMode === "login",
									);
									setApiBaseUrl(hostedApiFallbackBase);
									await completeAuthFlow(hostedAuthData);
									return;
								} catch (hostedRestError) {
									logJson("error", "[CUSTOMER AUTH] hosted REST fallback failed", {
										from: apiBaseUrl,
										to: hostedApiFallbackBase,
										error: toLoggableError(hostedRestError),
									});
									setAuthError(hostedRestError?.message || message);
									return;
								}
							}
						}
					}
				}

				if (
					normalizedMessage.includes("pending verification") ||
					normalizedMessage.includes("verify")
				) {
					setPendingVerificationEmail(authIdentifierValue);
					setPendingVerificationChannel(authSignupMethod === "phone" ? "sms" : "email");
					setPendingVerificationPassword(authPassword);
					setShowVerificationModal(true);
					setVerificationCode("");
					setVerificationError("");
					setAuthError("");
					setAuthErrorAction("");
					return;
				}

				const isUnknownAccount =
					normalizedMessage.includes("user not found") ||
					normalizedMessage.includes("not registered") ||
					normalizedMessage.includes("no account") ||
					normalizedMessage.includes("does not exist") ||
					normalizedMessage.includes("account not found");
				const isWrongCredentials =
					normalizedMessage.includes("invalid email or password") ||
					normalizedMessage.includes("incorrect password") ||
					normalizedMessage.includes("invalid password") ||
					normalizedMessage.includes("invalid credentials") ||
					normalizedMessage.includes("wrong password") ||
					normalizedMessage.includes("incorrect email");

				if (authMode === "login") {
					if (normalizedMessage.includes("pilot accounts must sign in via pilot mode")) {
						setAuthError(
							"That account is registered as a pilot. Please continue in Pilot mode to sign in.",
						);
						setAuthErrorAction("pilot");
						return;
					}
					if (isUnknownAccount) {
						setAuthError(
							"We couldn’t find an account for that email. Please sign up to get started.",
						);
						setAuthErrorAction("signup");
						return;
					}
					if (isWrongCredentials) {
						setAuthError(
							"That email or password doesn't match our records. Please try again or reset your password.",
						);
						setAuthErrorAction("reset");
						return;
					}
				}

				if (authMode === "signup") {
					const alreadyRegistered =
						(normalizedMessage.includes("already") &&
							(normalizedMessage.includes("registered") ||
								normalizedMessage.includes("exists") ||
								normalizedMessage.includes("in use"))) ||
						normalizedMessage.includes("account exists");
					if (alreadyRegistered) {
						setAuthError(
							"Account already registered. Please log in or use “Forgot password?” to reset.",
						);
						setAuthErrorAction("reset");
						setAuthMode("login");
						setAuthPassword("");
						syncAuthRoute("login", false);
						return;
					}
				}

				setAuthError(message);
			} finally {
				setAuthSubmitting(false);
			}
		},
		[
			applyAuthSession,
			apiBaseUrl,
			authEmail,
			authFirstName,
			authLastName,
			authMode,
			authPassword,
			authPhone,
			authIdentifierValue,
			authSignupMethod,
			authSubmitting,
			capacitorPlatform,
			forceLocalCustomerAuth,
			graphqlAuth,
			graphqlAuthAgainstBase,
			hostedApiFallbackBase,
			localCustomerAuthFailureMessage,
			resendVerificationCode,
			restAuthAgainstBase,
			restLogin,
			restSignup,
			signupOtpChannel,
			syncAuthRoute,
		],
	);

	const handleResetSubmit = useCallback(
		async (event) => {
			event.preventDefault();
			if (resetSubmitting) return;
			setResetError("");
			setResetSuccess("");
			if (!resetEmail.trim()) {
				setResetError("Please enter your email");
				return;
			}

			setResetSubmitting(true);
			if (resetStep === "request") {
				try {
					const response = await fetchWithTimeout(
						`${apiBaseUrl}/auth/password-reset/start`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								email: resetEmail.trim(),
								otp_delivery_channel: "email",
								otp_delivery_mode: "code",
							}),
						},
						{ timeoutMs: 30000, retries: 1, retryDelayMs: 1200 },
					);
					const data = await response.json();
					if (data.ok || response.ok) {
						setResetStep("confirm");
						setResetSuccess("We sent a reset code to your email.");
					} else {
						setResetError(data.detail || "Failed to send reset code");
					}
				} catch (error) {
					setResetError(`Reset request failed: ${error.message}`);
				} finally {
					setResetSubmitting(false);
				}
				return;
			}

			if (!resetCode.trim()) {
				setResetError("Please enter the reset code");
				setResetSubmitting(false);
				return;
			}
			if (!resetNewPassword.trim()) {
				setResetError("Please enter a new password");
				setResetSubmitting(false);
				return;
			}
			if (resetNewPassword.length < 8) {
				setResetError("Password must be at least 8 characters");
				setResetSubmitting(false);
				return;
			}
			if (resetNewPassword !== resetConfirmPassword) {
				setResetError("Passwords do not match");
				setResetSubmitting(false);
				return;
			}

			try {
				const response = await fetchWithTimeout(
					`${apiBaseUrl}/auth/password-reset/confirm`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							email: resetEmail.trim(),
							code: resetCode.trim(),
							new_password: resetNewPassword,
						}),
					},
					{ timeoutMs: 30000, retries: 1, retryDelayMs: 1200 },
				);
				const data = await response.json();
				if (data.ok || response.ok) {
					setResetSuccess("Password updated. You can now log in.");
					setResetPwMode(false);
					setAuthMode("login");
					setResetStep("request");
					setResetCode("");
					setResetNewPassword("");
					setResetConfirmPassword("");
					syncAuthRoute("login", false);
				} else {
					setResetError(data.detail || "Failed to reset password");
				}
			} catch (error) {
				setResetError(`Password reset failed: ${error.message}`);
			} finally {
				setResetSubmitting(false);
			}
		},
		[
			apiBaseUrl,
			fetchWithTimeout,
			resetCode,
			resetConfirmPassword,
			resetEmail,
			resetNewPassword,
			resetStep,
			resetSubmitting,
			syncAuthRoute,
		],
	);

	const handleVerificationCodeChange = useCallback((value) => {
		setVerificationCode(value.replace(/\D/g, "").slice(0, 6));
	}, []);

	const handleVerificationModalClose = useCallback(() => {
		setShowVerificationModal(false);
		setVerificationCode("");
		setVerificationLoginPrompt("");
		setVerificationLinkStatus("");
		setPendingVerificationChannel("email");
		setPendingVerificationPassword("");
		sessionStorage.removeItem("pendingVerificationEmail");
		sessionStorage.removeItem("pendingVerificationPassword");
	}, []);

	const handleVerifyEmail = useCallback(
		async (event) => {
			event.preventDefault();
			if (!verificationCode.trim()) {
				setVerificationError("Please enter the verification code");
				return;
			}

			try {
				const response = await fetch(`${apiBaseUrl}/auth/confirm`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: pendingVerificationEmail,
						code: verificationCode.trim(),
						otp_delivery_channel: "email",
						otp_delivery_mode: "code",
					}),
				});
				const data = await response.json();
				if (data.ok || response.ok) {
					setVerificationError("");
					setVerificationCode("");
					sessionStorage.setItem("startOnboardingAfterVerify_v2", "true");
					if (pendingVerificationPassword) {
						try {
							const authData = await graphqlLoginWithCredentials(
								pendingVerificationEmail,
								pendingVerificationPassword,
							);
							await applyAuthSession(authData, { openProfileLanding: true });
							setPendingVerificationPassword("");
							sessionStorage.removeItem("pendingVerificationEmail");
							sessionStorage.removeItem("pendingVerificationPassword");
							setVerificationLoginPrompt("");
							setShowVerificationModal(false);
							return;
						} catch (loginError) {
							console.error("[CUSTOMER AUTH] verify auto-login failed", loginError);
						}
					}

					setVerificationLoginPrompt(
						"Verification successful. Tap below to log in.",
					);
					setAuthMode("login");
					syncAuthRoute("login", false);
				} else {
					setVerificationError(data.detail || "Invalid code. Please try again.");
				}
			} catch (error) {
				setVerificationError(`Verification failed: ${error.message}`);
			}
		},
		[
			apiBaseUrl,
			applyAuthSession,
			graphqlLoginWithCredentials,
			pendingVerificationEmail,
			pendingVerificationPassword,
			syncAuthRoute,
			verificationCode,
		],
	);

	const handleVerificationLoginRetry = useCallback(async () => {
		if (!pendingVerificationEmail || !pendingVerificationPassword) {
			setVerificationLoginPrompt(
				"Verification complete. Please log in with your credentials.",
			);
			setShowVerificationModal(false);
			setAuthMode("login");
			syncAuthRoute("login", false);
			return;
		}

		try {
			const authData = await graphqlLoginWithCredentials(
				pendingVerificationEmail,
				pendingVerificationPassword,
			);
			await applyAuthSession(authData, { openProfileLanding: true });
			setPendingVerificationPassword("");
			sessionStorage.removeItem("pendingVerificationEmail");
			sessionStorage.removeItem("pendingVerificationPassword");
			setVerificationLoginPrompt("");
			setShowVerificationModal(false);
		} catch (error) {
			console.error("[CUSTOMER AUTH] manual login retry failed", error);
			setVerificationLoginPrompt(
				"We couldn’t log you in yet. Tap again or log in manually.",
			);
		}
	}, [
		applyAuthSession,
		graphqlLoginWithCredentials,
		pendingVerificationEmail,
		pendingVerificationPassword,
		syncAuthRoute,
	]);

	const handleGoogleCredentialResponse = useCallback(
		async (response) => {
			setGoogleAuthError("");
			setAuthError("");
			setAuthErrorAction("");
			setOauthAuthError("");

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
						body: JSON.stringify({ credential: response.credential, role: "client" }),
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
				const meResponse = await fetchWithTimeout(
					`${apiBaseUrl}/auth/me`,
					{
						headers: { Authorization: `Bearer ${accessToken}` },
					},
					{ timeoutMs: 30000, retries: 1, retryDelayMs: 1200 },
				);
				const meData = await meResponse.json().catch(() => ({}));
				if (!meResponse.ok) {
					throw new Error(meData.detail || "Unable to load your profile");
				}
				await applyAuthSession({
					accessToken,
					userId: meData.user_id || payload.user_id,
					email: meData.email || payload.email,
					firstName: meData.first_name || payload.first_name || authFirstName,
					lastName: meData.last_name || payload.last_name || authLastName,
					phone: meData.phone || payload.phone || "",
					addressLine1: meData.address_line1 || "",
					addressLine2: meData.address_line2 || "",
					city: meData.city || "",
					state: meData.state || "",
					postalCode: meData.postal_code || "",
					country: meData.country || "",
					isEmailVerified:
						meData.is_email_verified ?? payload.is_email_verified ?? true,
					isAdmin: meData.is_admin ?? payload.is_admin ?? false,
				});
			} catch (error) {
				console.error("[CUSTOMER AUTH] Google auth failed", error);
				setGoogleAuthError(
					error?.message || "Google sign-in failed. Please try again.",
				);
			}
		},
		[apiBaseUrl, applyAuthSession, authFirstName, authLastName, fetchWithTimeout],
	);

	const apiOrigin = useMemo(() => {
		try {
			return new URL(apiBaseUrl).origin;
		} catch {
			return "";
		}
	}, [apiBaseUrl]);

	const applyOAuthAccessToken = useCallback(
		async (accessToken) => {
			const meResponse = await fetchWithTimeout(
				`${apiBaseUrl}/auth/me`,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				},
				{ timeoutMs: 30000, retries: 1, retryDelayMs: 1200 },
			);
			const meData = await meResponse.json().catch(() => ({}));
			if (!meResponse.ok) {
				throw new Error(meData.detail || "Unable to load your profile");
			}
			await applyAuthSession({
				accessToken,
				userId: meData.user_id,
				email: meData.email,
				firstName: meData.first_name || authFirstName,
				lastName: meData.last_name || authLastName,
				phone: meData.phone || "",
				addressLine1: meData.address_line1 || "",
				addressLine2: meData.address_line2 || "",
				city: meData.city || "",
				state: meData.state || "",
				postalCode: meData.postal_code || "",
				country: meData.country || "",
				isEmailVerified: meData.is_email_verified ?? true,
				isAdmin: meData.is_admin ?? false,
			});
		},
		[apiBaseUrl, applyAuthSession, authFirstName, authLastName, fetchWithTimeout],
	);

	const completeOAuthResult = useCallback(
		async (data) => {
			setOauthAuthBusy("");
			if (!data?.ok) {
				setOauthAuthError(data?.error || "Sign-in failed. Please try again.");
				return;
			}
			if (!data.access_token) {
				setOauthAuthError("Sign-in failed: missing access token");
				return;
			}
			await applyOAuthAccessToken(data.access_token);
			try {
				await CapacitorBrowser.close();
			} catch {
				// Browser may already be closed or unavailable on web.
			}
			setOauthAuthError("");
		},
		[applyOAuthAccessToken],
	);

	const openOAuthPopup = useCallback(
		async (provider) => {
			if (typeof window === "undefined") return;
			setOauthAuthError("");
			setAuthError("");
			setAuthErrorAction("");
			const providerStatus =
				provider === "apple" ? appleRedirectStatus : googleRedirectStatus;
			if (!providerStatus && provider === "apple") {
				setOauthAuthBusy("");
				setOauthAuthError(
					providerStatus?.reason ||
						`${provider === "apple" ? "Apple" : "Google"} sign-in isn’t available right now.`,
				);
				return;
			}
			setOauthAuthBusy(provider);

			const origin = window.location.origin;
			const isNativePlatform = Boolean(window?.Capacitor?.isNativePlatform?.());
			const nativeRedirectParam = isNativePlatform
				? `&native_redirect_uri=${encodeURIComponent("errandbridge://auth/oauth")}`
				: "";
			const startUrl = `${apiBaseUrl}/auth/oauth/${provider}/start?origin=${encodeURIComponent(
				origin,
			)}&role=client&popup=true&mode=${encodeURIComponent(authMode)}${nativeRedirectParam}`;
			if (isNativePlatform) {
				try {
					await CapacitorBrowser.open({ url: startUrl });
					return;
				} catch (error) {
					console.warn("[CUSTOMER AUTH] Native browser open failed", error);
				}
			}
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
		[apiBaseUrl, appleRedirectStatus, authMode, googleRedirectStatus],
	);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (!window?.Capacitor?.isNativePlatform?.()) return undefined;

		let active = true;
		let listenerHandle = null;
		const handleUrlOpen = async (event) => {
			try {
				const rawUrl = String(event?.url || "");
				if (!rawUrl.startsWith("errandbridge://auth/oauth")) return;
				const url = new URL(rawUrl);
				const okParam = String(url.searchParams.get("ok") || "").toLowerCase();
				await completeOAuthResult({
					type: "errandbridge_oauth_result",
					ok: okParam === "1" || okParam === "true",
					provider: url.searchParams.get("provider") || "",
					access_token: url.searchParams.get("access_token") || "",
					error: url.searchParams.get("error") || "",
				});
			} catch (error) {
				console.error("[CUSTOMER AUTH] Native OAuth callback error", error);
				setOauthAuthBusy("");
				setOauthAuthError(error?.message || "Sign-in failed. Please try again.");
			}
		};

		Promise.resolve(CapacitorApp.addListener("appUrlOpen", handleUrlOpen))
			.then((handle) => {
				if (!active) {
					handle?.remove?.();
					return;
				}
				listenerHandle = handle;
			})
			.catch((error) => {
				console.warn("[CUSTOMER AUTH] Unable to register native app URL listener", error);
			});

		return () => {
			active = false;
			listenerHandle?.remove?.();
		};
	}, [completeOAuthResult]);

	useEffect(() => {
		if (typeof window === "undefined" || !apiOrigin) return undefined;
		const handleMessage = async (event) => {
			try {
				if (event.origin !== apiOrigin) return;
				const data = event.data;
				if (!data || typeof data !== "object") return;
				if (data.type !== "errandbridge_oauth_result") return;
				await completeOAuthResult(data);
			} catch (error) {
				console.error("[CUSTOMER AUTH] OAuth message error", error);
				setOauthAuthBusy("");
				setOauthAuthError(error?.message || "Sign-in failed. Please try again.");
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [apiOrigin, completeOAuthResult]);

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
			if (!cancelled) setGoogleAuthReady(false);
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
					text: authMode === "login" ? "signin_with" : "signup_with",
				});
			} catch (error) {
				console.warn("[CUSTOMER AUTH] Google render failed", error);
				setGoogleAuthError(
					"Google sign-in didn’t load correctly. Please try again.",
				);
			}
		};

		tryRender();
		return () => {
			cancelled = true;
			if (timeoutId) window.clearTimeout(timeoutId);
		};
	}, [
		authMode,
		googleAuthEnabled,
		googleAuthReady,
		googleClientId,
		handleGoogleCredentialResponse,
	]);

	const authHero =
		authMode === "signup"
			? {
				badge: "Start with confidence",
				heading: "Create your ErrandBridge account",
				subheading:
					"Set up your account in minutes, then book errands, track progress, and stay close to what matters back home.",
				highlights: [
					{
						title: "Clear updates",
						body: "Get live progress and proof of completion without chasing for answers.",
					},
					{
						title: "Verified delivery support",
						body: "Work with vetted pilots and reach real support quickly when you need help.",
					},
					{
						title: "Quick setup",
						body: "We keep sign-up light now, then help you finish the rest once you’re in.",
					},
				],
				trustLabel: "What you get right away",
				trustValue: "A smoother start, secure access, and one account across web and mobile.",
			}
			: {
				badge: "Trusted by families abroad",
				heading: "Welcome back",
				subheading:
					"Manage errands, track every step, and stay connected back home without the back-and-forth.",
				highlights: [
					{
						title: "Live tracking",
						body: "See what’s happening in real time, from starting point to proof of completion.",
					},
					{
						title: "Verified pilots",
						body: "Stay confident with vetted delivery support and clear handoff confirmation.",
					},
					{
						title: "Fast help",
						body: "Reach support quickly when plans change or you need an update fast.",
					},
				],
				trustLabel: "Secure, simple access",
				trustValue: "One sign-in for booking, tracking, updates, and support whenever you need it.",
			};

	useEffect(() => {
		if (typeof document === "undefined") return;
		document.title = authHero.heading;
	}, [authHero.heading]);

	if (isPilotHost) {
		return null;
	}

	const cardMode = authMode === "signup" ? "signUp" : "signIn";
	// Redirect-based Google auth should be independent from the legacy GIS widget toggle.
	// If redirect auth is enabled, show the button as long as the host allowlist permits.
	// Backend status can still inform availability, but it should not make the button disappear.
	const googleButtonEnabled = googleRedirectButtonEnabled;
	const googleSlot = googleAuthEnabled ? (
		<>
			<div ref={googleButtonRef} className="w-full overflow-hidden flex justify-center" />
			{!googleAuthReady ? (
				<button
					type="button"
					disabled
					className="flex h-12 w-full items-center justify-center gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-5 text-base font-bold text-slate-900 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.45)]"
				>
					Loading Google sign-in…
				</button>
			) : null}
		</>
	) : null;

	return (
		<>
			{resetPwMode ? (
				<Suspense fallback={null}>
					<AuthModal
						open={true}
						inline={true}
						showCloseButton={false}
						onClose={() => navigate(ROUTE_HOME)}
						resetPwMode={resetPwMode}
						setResetPwMode={setResetPwMode}
						resetStep={resetStep}
						setResetStep={setResetStep}
						resetEmail={resetEmail}
						setResetEmail={setResetEmail}
						resetCode={resetCode}
						setResetCode={setResetCode}
						resetNewPassword={resetNewPassword}
						setResetNewPassword={setResetNewPassword}
						resetConfirmPassword={resetConfirmPassword}
						setResetConfirmPassword={setResetConfirmPassword}
						showResetNewPassword={showResetNewPassword}
						setShowResetNewPassword={setShowResetNewPassword}
						showResetConfirmPassword={showResetConfirmPassword}
						setShowResetConfirmPassword={setShowResetConfirmPassword}
						resetError={resetError}
						resetSuccess={resetSuccess}
						setResetError={setResetError}
						setResetSuccess={setResetSuccess}
						authMode={authMode}
						setAuthMode={(mode) => {
							if (mode === "signup") {
								switchToSignupMode();
								return;
							}
							switchToLoginMode();
						}}
						authError={authError}
						setAuthError={setAuthError}
						authErrorAction={authErrorAction}
						setAuthErrorAction={setAuthErrorAction}
						authFirstName={authFirstName}
						setAuthFirstName={setAuthFirstName}
						authLastName={authLastName}
						setAuthLastName={setAuthLastName}
						authEmail={authEmail}
						setAuthEmail={setAuthEmail}
						authPassword={authPassword}
						setAuthPassword={setAuthPassword}
						showPassword={showPassword}
						setShowPassword={setShowPassword}
						authSubmitting={authSubmitting}
						resetSubmitting={resetSubmitting}
						handleResetSubmit={handleResetSubmit}
						handleAuthSubmit={handleAuthSubmit}
						googleAuthEnabled={googleAuthEnabled}
						googleAuthDisabledReason={googleAuthDisabledReason}
						googleButtonRef={googleButtonRef}
						googleAuthReady={googleAuthReady}
						googleAuthError={googleAuthError}
						appleAuthEnabled={appleAuthEnabled}
						onAppleAuth={() => openOAuthPopup("apple")}
						oauthAuthBusy={oauthAuthBusy}
						oauthAuthError={oauthAuthError}
						switchToSignupMode={switchToSignupMode}
					/>
				</Suspense>
			) : (
				<Suspense fallback={null}>
					<ErrandBridgeAuthCard
						mode={cardMode}
						onBack={() => {
							setOauthAuthError("");
							setOauthAuthBusy("");
							navigate(ROUTE_LANDING);
						}}
						backLabel="Back to home"
						onToggleMode={() => {
							setAuthError("");
							setAuthErrorAction("");
							setOauthAuthError("");
							setOauthAuthBusy("");
							setAuthPassword("");
							setAuthConfirmPassword("");
							if (authMode === "signup") {
								switchToLoginMode();
								return;
							}
							switchToSignupMode();
						}}
						appleEnabled={appleAuthEnabledForCard}
						googleEnabled={googleButtonEnabled}
						onApple={() => openOAuthPopup("apple")}
						onGoogle={() => {
							if (!googleButtonEnabled) return;
							openOAuthPopup("google");
						}}
						googleSlot={googleSlot}
						socialBusyProvider={oauthAuthBusy || ""}
						socialError={oauthAuthError || googleAuthError}
						fullName={authFullName}
						onFullNameChange={handleFullNameChange}
						email={authIdentifierValue}
						onEmailChange={(value) => {
							if (authMode === "signup" && authSignupMethod === "phone") {
								setAuthPhone(value);
								return;
							}
							setAuthEmail(value);
						}}
						signUpMethod={authSignupMethod}
						onSignUpMethodChange={(nextMethod) => {
							setAuthSignupMethod(nextMethod);
							setAuthError("");
							setAuthErrorAction("");
							if (nextMethod === "phone") {
								if (isLikelyPhoneIdentifier(authEmail) && !authPhone) {
									setAuthPhone(authEmail);
								}
								return;
							}
							if (authPhone && !authEmail) {
								setAuthEmail("");
							}
						}}
						identifierLabel={
							authMode === "login"
								? "Email or phone"
								: authSignupMethod === "phone"
									? "Phone number"
									: "Email"
						}
						identifierPlaceholder={
							authMode === "login"
								? "you@example.com or +1 555 555 5555"
								: authSignupMethod === "phone"
									? "+1 555 555 5555"
									: "name@example.com"
						}
						identifierType={
							authMode === "signup" && authSignupMethod === "phone" ? "tel" : "text"
						}
						password={authPassword}
						onPasswordChange={setAuthPassword}
						confirmPassword={authConfirmPassword}
						onConfirmPasswordChange={setAuthConfirmPassword}
						onForgotPassword={startResetFlow}
						onSubmit={() => {
							handleAuthSubmit({ preventDefault: () => {} });
						}}
						submitting={authSubmitting}
						serverError={authError}
						serverErrorActionLabel={
							authErrorAction === "pilot" ? "Open pilot sign-in" : ""
						}
						onServerErrorAction={
							authErrorAction === "pilot" ? openPilotLogin : undefined
						}
					/>
				</Suspense>
			)}

			{showVerificationModal && (
				<Suspense fallback={null}>
					<EmailVerificationModal
						open={showVerificationModal}
						pendingEmail={pendingVerificationEmail}
						title={verificationTitle}
						destinationLabel={verificationDestinationLabel}
						resendLabel={verificationResendLabel}
						verificationCode={verificationCode}
						onCodeChange={handleVerificationCodeChange}
						onClose={handleVerificationModalClose}
						onSubmit={handleVerifyEmail}
						verificationError={verificationError}
						verificationLoginPrompt={verificationLoginPrompt}
						onLoginRetry={handleVerificationLoginRetry}
						onResend={resendVerificationCode}
						verificationLinkStatus={verificationLinkStatus}
					/>
				</Suspense>
			)}
		</>
	);
}
