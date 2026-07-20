import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import CustomerAuthPage from "./CustomerAuthPage";
import { fetchOAuthStatus } from "./lib/oauthStatus";

// Customer auth retries include real timers (e.g., retryDelayMs inside fetchWithTimeout).
// Keep the test suite stable on slower CI by raising the default timeout for this file.
jest.setTimeout(15000);

jest.mock("./components/AuthModal", () => ({
	__esModule: true,
	default: (props) => (
		<div data-testid="auth-modal">
			<form onSubmit={props.handleAuthSubmit}>
				<input
					aria-label="Email"
					value={props.authEmail}
					onChange={(event) => props.setAuthEmail(event.target.value)}
				/>
				<input
					aria-label="Password"
					value={props.authPassword}
					onChange={(event) => props.setAuthPassword(event.target.value)}
				/>
				<button type="submit">Submit auth</button>
			</form>
			{props.authError ? <div>{props.authError}</div> : null}
			<div>{props.authMode}</div>
		</div>
	),
}));

jest.mock("./components/ErrandBridgeAuthCard", () => ({
	__esModule: true,
	default: (props) => (
		<div data-testid="auth-card" data-mode={props.mode}>
			<h1>{props.mode === "signUp" ? "Create your account" : "Welcome back"}</h1>
			{props.appleEnabled ? (
				<button type="button" onClick={props.onApple}>
					Continue with Apple
				</button>
			) : null}
			{props.googleEnabled ? (
				<button type="button" onClick={props.onGoogle}>
					Continue with Google
				</button>
			) : null}
			{props.googleSlot ? <div data-testid="google-slot">{props.googleSlot}</div> : null}
			{props.mode === "signUp" ? (
				<div>
					<button type="button" onClick={() => props.onSignUpMethodChange?.("email")}>Use email</button>
					<button type="button" onClick={() => props.onSignUpMethodChange?.("phone")}>Use phone</button>
				</div>
			) : null}
			{props.mode === "signUp" ? (
				<input
					aria-label="Full name"
					value={props.fullName}
					onChange={(event) => props.onFullNameChange(event.target.value)}
				/>
			) : null}
			<input
				aria-label={props.identifierLabel || "Email"}
				value={props.email}
				onChange={(event) => props.onEmailChange(event.target.value)}
			/>
			<input
				aria-label="Password"
				value={props.password}
				onChange={(event) => props.onPasswordChange(event.target.value)}
			/>
			{props.mode === "signUp" ? (
				<input
					aria-label="Confirm password"
					value={props.confirmPassword}
					onChange={(event) =>
						props.onConfirmPasswordChange(event.target.value)
					}
				/>
			) : null}
			<button type="button" onClick={props.onSubmit}>
				{props.mode === "signUp" ? "Create account" : "Sign in"}
			</button>
			{props.serverError ? <div>{props.serverError}</div> : null}
			{props.serverErrorActionLabel ? (
				<button type="button" onClick={props.onServerErrorAction}>
					{props.serverErrorActionLabel}
				</button>
			) : null}
		</div>
	),
}));

jest.mock("./components/EmailVerificationModal", () => ({
	__esModule: true,
	default: () => null,
}));

jest.mock("./lib/apiBaseUrl", () => ({
	getCapacitorHostedBaseUrl: jest.fn(() => "https://api.errandbridge.com"),
	getCapacitorLoopbackFallbackUrl: jest.fn(() => null),
	isHostedApiBaseUrl: jest.fn((baseUrl) => baseUrl === "https://api.errandbridge.com"),
	isLocalLikeApiBaseUrl: jest.fn((baseUrl) =>
		/^http:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(
			String(baseUrl || ""),
		),
	),
	isLoopbackApiBaseUrl: jest.fn((baseUrl) =>
		/^http:\/\/(localhost|127\.0\.0\.1)/.test(String(baseUrl || "")),
	),
	resolveApiBaseUrl: jest.fn(() => "http://localhost:8001"),
}));

jest.mock("./utils/cache", () => ({
	__esModule: true,
	default: {
		getUserField: jest.fn(() => ""),
		setAuthToken: jest.fn(),
		recordTrustedDevice: jest.fn(),
		setUserField: jest.fn(),
		setUserProfile: jest.fn(),
	},
}));

jest.mock("./lib/oauthStatus", () => ({
	fetchOAuthStatus: jest.fn(),
}));

const renderAtRoute = (route) =>
	render(
		<MemoryRouter
			initialEntries={[route]}
			future={{
				v7_startTransition: true,
				v7_relativeSplatPath: true,
			}}
		>
			<Routes>
				<Route path="/login" element={<CustomerAuthPage />} />
				<Route path="/signup" element={<CustomerAuthPage />} />
				<Route path="/pilot/login" element={<div>Pilot login</div>} />
				<Route path="/home" element={<div>Home</div>} />
			</Routes>
		</MemoryRouter>,
	);

describe("CustomerAuthPage", () => {
	const originalEnv = { ...process.env };
	const originalOpen = window.open;

	beforeEach(() => {
		jest.spyOn(window, "fetch");
		delete window.Capacitor;
		window.localStorage.clear();
		window.sessionStorage.clear();
		window.open = jest.fn();
		process.env.REACT_APP_APPLE_AUTH_ENABLED = "";
		process.env.REACT_APP_GOOGLE_REDIRECT_AUTH_ENABLED = "";
		process.env.REACT_APP_GOOGLE_AUTH_ENABLED = "";
		process.env.REACT_APP_GOOGLE_CLIENT_ID = "";
		process.env.REACT_APP_FORCE_API_BASE = "false";
		const apiBaseUrlLib = require("./lib/apiBaseUrl");
		apiBaseUrlLib.resolveApiBaseUrl.mockReturnValue("http://localhost:8001");
		apiBaseUrlLib.getCapacitorLoopbackFallbackUrl.mockImplementation(() => null);
		fetchOAuthStatus.mockResolvedValue({
			google: {
				redirect: { enabled: true, configured: true, origin_allowed: true, reason: null },
				token: { enabled: true, configured: true, origin_allowed: true, reason: null },
			},
			apple: {
				redirect: { enabled: true, configured: true, origin_allowed: true, reason: null },
			},
		});
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		window.open = originalOpen;
		jest.restoreAllMocks();
	});

	test("renders the sign-in experience on the login route", async () => {
		renderAtRoute("/login");

		expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
		expect(screen.getByTestId("auth-card")).toHaveAttribute("data-mode", "signIn");
		expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(
			screen.queryByLabelText(/full name/i),
		).not.toBeInTheDocument();
	});

	test("renders the sign-up experience on the signup route", async () => {
		renderAtRoute("/signup");

		expect(
			await screen.findByRole("heading", { name: /create your account/i }),
		).toBeInTheDocument();
		expect(screen.getByTestId("auth-card")).toHaveAttribute("data-mode", "signUp");
		expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
		expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
	});

	test("prefills signup name and email from the URL", async () => {
		renderAtRoute("/signup?email=review%40errandbridge.com&name=Ade%20Johnson");

		expect(
			await screen.findByRole("heading", { name: /create your account/i }),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/full name/i)).toHaveValue("Ade Johnson");
		expect(screen.getByLabelText(/email/i)).toHaveValue("review@errandbridge.com");
	});

	test("falls back to REST login when GraphQL login fails with iPad-style load failed", async () => {
		window.fetch
			.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
			.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					access_token: "rest-token",
					user_id: 42,
					email: "ad4_johnson@hotmail.com",
					first_name: "Ad",
					last_name: "Johnson",
					is_email_verified: true,
					is_admin: false,
				}),
			});

		renderAtRoute("/login");
		await screen.findByRole("heading", { name: /welcome back/i });

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);

		await userEvent.type(emailInput, "ad4_johnson@hotmail.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

		await waitFor(
			() => {
				expect(window.fetch).toHaveBeenCalledTimes(3);
			},
			{ timeout: 12000 },
		);

		await waitFor(
			() => {
			expect(screen.getByText("Home")).toBeInTheDocument();
		},
			{ timeout: 12000 },
		);

		expect(window.fetch).toHaveBeenNthCalledWith(
			1,
			"http://localhost:8001/graphql",
			expect.objectContaining({ method: "POST" }),
		);
		expect(window.fetch).toHaveBeenNthCalledWith(
			2,
			"http://localhost:8001/graphql",
			expect.objectContaining({ method: "POST" }),
		);
		expect(window.fetch).toHaveBeenNthCalledWith(
			3,
			"http://localhost:8001/auth/login",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					email: "ad4_johnson@hotmail.com",
					password: "password123",
					role: "client",
				}),
			}),
		);
	});

	test("retries GraphQL login on alternate iOS loopback host before REST fallback", async () => {
		const {
			getCapacitorLoopbackFallbackUrl,
		} = require("./lib/apiBaseUrl");
		window.Capacitor = {
			getPlatform: () => "ios",
			platform: "ios",
		};
		getCapacitorLoopbackFallbackUrl.mockImplementation((url, platform) => {
			if (platform !== "ios") return null;
			if (url === "http://localhost:8001/graphql") {
				return "http://127.0.0.1:8001/graphql";
			}
			return null;
		});

		window.fetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({}),
			})
			.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: {
						login: {
							accessToken: "graphql-token",
							userId: 77,
							email: "ipad@example.com",
							firstName: "iPad",
							lastName: "User",
							isEmailVerified: true,
							isAdmin: false,
						},
					},
				}),
			});

		renderAtRoute("/login");
		await screen.findByRole("heading", { name: /welcome back/i });

		await userEvent.type(screen.getByLabelText(/email/i), "ipad@example.com");
		await userEvent.type(screen.getByLabelText(/password/i), "password123");
		await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

		await waitFor(() => {
			expect(screen.getByText("Home")).toBeInTheDocument();
			}, { timeout: 12000 });

			expect(window.fetch).toHaveBeenCalledTimes(3);
		expect(window.fetch).toHaveBeenNthCalledWith(
				2,
			"http://localhost:8001/graphql",
			expect.objectContaining({ method: "POST" }),
		);
		expect(window.fetch).toHaveBeenNthCalledWith(
				3,
			"http://127.0.0.1:8001/graphql",
			expect.objectContaining({ method: "POST" }),
		);
	});

	test("opens customer Apple OAuth popup when Apple auth is enabled", async () => {
		process.env.REACT_APP_APPLE_AUTH_ENABLED = "true";

		renderAtRoute("/login");
		await screen.findByRole("heading", { name: /welcome back/i });
		await waitFor(() => expect(fetchOAuthStatus).toHaveBeenCalled());

		await userEvent.click(screen.getByRole("button", { name: /continue with apple/i }));

		expect(window.open).toHaveBeenCalled();
		const popupUrl = window.open.mock.calls[0]?.[0] || "";
		expect(popupUrl).toContain("http://localhost:8001/auth/oauth/apple/start");
		expect(popupUrl).toContain("role=client");
		expect(popupUrl).toContain("popup=true");
		expect(popupUrl).toContain("mode=login");
	});

	test("opens customer Google OAuth popup when redirect auth is enabled", async () => {
		process.env.REACT_APP_GOOGLE_REDIRECT_AUTH_ENABLED = "true";

		renderAtRoute("/signup");
		await screen.findByRole("heading", { name: /create your account/i });
		await waitFor(() => expect(fetchOAuthStatus).toHaveBeenCalled());

		await userEvent.click(screen.getByRole("button", { name: /continue with google/i }));

		expect(window.open).toHaveBeenCalled();
		const popupUrl = window.open.mock.calls[0]?.[0] || "";
		expect(popupUrl).toContain("http://localhost:8001/auth/oauth/google/start");
		expect(popupUrl).toContain("role=client");
		expect(popupUrl).toContain("popup=true");
		expect(popupUrl).toContain("mode=signup");
	});

	test("keeps customer Google redirect auth visible when backend popup flow status is unavailable", async () => {
		process.env.REACT_APP_GOOGLE_REDIRECT_AUTH_ENABLED = "true";
		fetchOAuthStatus.mockResolvedValueOnce({
			google: {
				redirect: {
					enabled: false,
					configured: false,
					origin_allowed: true,
					reason: "Google OAuth is not configured",
				},
				token: { enabled: true, configured: true, origin_allowed: true, reason: null },
			},
			apple: {
				redirect: { enabled: true, configured: true, origin_allowed: true, reason: null },
			},
		});

		renderAtRoute("/login");
		await screen.findByRole("heading", { name: /welcome back/i });
		await waitFor(() => expect(fetchOAuthStatus).toHaveBeenCalled());

		expect(
			screen.getByRole("button", { name: /continue with google/i }),
		).toBeInTheDocument();
	});

	test("offers a pilot sign-in handoff when a pilot account is used on the customer login", async () => {
		window.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				errors: [{ message: "Pilot accounts must sign in via Pilot mode" }],
			}),
		});

		renderAtRoute("/login");
		await screen.findByRole("heading", { name: /welcome back/i });

		await userEvent.type(screen.getByLabelText(/email/i), "pilot@example.com");
		await userEvent.type(screen.getByLabelText(/password/i), "password123");
		await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

		expect(
			await screen.findByText(/that account is registered as a pilot/i),
		).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: /open pilot sign-in/i }));

		expect(await screen.findByText("Pilot login")).toBeInTheDocument();
	});

	test("submits phone signup through GraphQL with SMS verification settings", async () => {
		window.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: {
					signup: {
						accessToken: "phone-signup-token",
						userId: 88,
						email: "phone-client-15555551234@phone-auth.errandbridge.com",
						phone: "+15555551234",
						firstName: "Ada",
						lastName: "Bridge",
						isEmailVerified: true,
						isAdmin: false,
					},
				},
			}),
		});

		renderAtRoute("/signup");
		await screen.findByRole("heading", { name: /create your account/i });

		await userEvent.click(screen.getByRole("button", { name: /use phone/i }));
		await userEvent.type(screen.getByLabelText(/full name/i), "Ada Bridge");
		await userEvent.type(screen.getByLabelText(/phone number/i), "+1 555 555 1234");
		await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
		await userEvent.type(screen.getByLabelText(/confirm password/i), "password123");
		await userEvent.click(screen.getByRole("button", { name: /create account/i }));

		await waitFor(() => expect(window.fetch).toHaveBeenCalledTimes(1));

		const [, request] = window.fetch.mock.calls[0];
		const payload = JSON.parse(request.body);
		expect(payload.variables).toMatchObject({
			email: "+15555551234",
			phone: "+15555551234",
			otpDeliveryChannel: "sms",
			otpDeliveryMode: "code",
			role: "client",
		});
	});
});
