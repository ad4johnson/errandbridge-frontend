import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import PilotPortal from "./PilotPortal";
import { fetchOAuthStatus } from "../lib/oauthStatus";

jest.mock("./PilotPortal.css", () => ({}));

jest.mock("../lib/oauthStatus", () => ({
	fetchOAuthStatus: jest.fn(),
}));

jest.setTimeout(15000);

describe("PilotPortal Google auth", () => {
	const originalEnv = { ...process.env };
		const originalCapacitor = window.Capacitor;
	const originalGoogle = window.google;
	const originalOpen = window.open;
	const originalFetch = global.fetch;
	let googleCallback = null;

	beforeEach(() => {
		jest.clearAllMocks();
			window.localStorage.clear();
		window.history.replaceState(null, "", "/login");
		process.env.REACT_APP_FORCE_API_BASE = "false";
		process.env.REACT_APP_GOOGLE_PILOT_CLIENT_ID = "pilot-client-id.apps.googleusercontent.com";
		process.env.REACT_APP_GOOGLE_PILOT_AUTH_ENABLED = "true";
		process.env.REACT_APP_GOOGLE_AUTH_HOSTS = "localhost,127.0.0.1,pilot.errandbridge.com";
			process.env.REACT_APP_CAPACITOR_HOSTED_API_BASE = "https://api.errandbridge.com";
		window.open = jest.fn();
		global.fetch = jest.fn();
		googleCallback = null;
		window.google = {
			accounts: {
				id: {
					initialize: jest.fn(({ callback }) => {
						googleCallback = callback;
					}),
					renderButton: jest.fn((container) => {
						const button = document.createElement("button");
						button.type = "button";
						button.setAttribute("aria-label", "Continue with Google");
						button.textContent = "Continue with Google";
						button.onclick = () => {
							googleCallback?.({ credential: "pilot-google-credential" });
						};
						container.appendChild(button);
					}),
				},
			},
		};
		fetchOAuthStatus.mockResolvedValue({
			google: {
				token: { enabled: true, configured: true, origin_allowed: true, reason: null },
				redirect: { enabled: false, configured: false, origin_allowed: true, reason: "Google OAuth is not configured" },
			},
			apple: {
				redirect: { enabled: true, configured: true, origin_allowed: true, reason: null },
			},
		});
	});

	afterEach(() => {
		process.env = { ...originalEnv };
			window.Capacitor = originalCapacitor;
		window.google = originalGoogle;
		window.open = originalOpen;
		global.fetch = originalFetch;
	});

		const setup = () => {
		const onPilotLoggedIn = jest.fn();
		render(
			<PilotPortal
				apiBaseUrl="http://localhost:8001"
				onPilotLoggedIn={onPilotLoggedIn}
			/>,
		);
		return { onPilotLoggedIn };
	};

	test("renders the premium pilot shell in sign-in mode", () => {
		setup();

		expect(screen.getByTestId("pilot-premium-shell")).toBeInTheDocument();
		expect(screen.getByAltText(/errandbridge/i)).toBeInTheDocument();
		expect(screen.getByText(/simple pilot sign in/i)).toBeInTheDocument();
		expect(screen.getByText(/a cleaner sign-in flow built for pilots/i)).toBeInTheDocument();
		const signInForm = screen.getByLabelText(/email/i).closest("form");
		expect(signInForm).toBeTruthy();
		expect(within(signInForm).getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
	});

	test("updates the premium shell copy in create-account mode", () => {
		setup();

		fireEvent.click(screen.getByRole("tab", { name: /create account/i }));

		expect(
			screen.getByRole("heading", { level: 2, name: /create your pilot account/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/set up your account in two short steps/i)).toBeInTheDocument();
	});

	test("uses Google token auth in login mode for pilot web", async () => {
		global.fetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					access_token: "pilot-google-token-login",
					user_id: 41,
					email: "pilot-login@example.com",
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					user_id: 41,
					email: "pilot-login@example.com",
				}),
			});

		const { onPilotLoggedIn } = setup();
		await waitFor(() => expect(fetchOAuthStatus).toHaveBeenCalled());

		await waitFor(() => expect(window.google.accounts.id.initialize).toHaveBeenCalled());
		const googleBtn = screen.getByLabelText(/continue with google/i);
		fireEvent.click(googleBtn);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenNthCalledWith(
				1,
				"http://localhost:8001/auth/google",
				expect.objectContaining({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						credential: "pilot-google-credential",
						role: "pilot",
						allow_pilot_signup: false,
					}),
				}),
			);
		});

		await waitFor(() => {
			expect(onPilotLoggedIn).toHaveBeenCalledWith(
				"pilot-google-token-login",
				expect.objectContaining({ id: 41, email: "pilot-login@example.com" }),
				expect.objectContaining({ apiBaseUrl: "http://localhost:8001" }),
			);
		});
	});

	test("uses Google token auth in create-account mode for pilot web", async () => {
		global.fetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					access_token: "pilot-google-token-signup",
					user_id: 51,
					email: "pilot-signup@example.com",
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					user_id: 51,
					email: "pilot-signup@example.com",
				}),
			});

		const { onPilotLoggedIn } = setup();
		fireEvent.click(screen.getByRole("tab", { name: /Create account/i }));
		await waitFor(() => expect(fetchOAuthStatus).toHaveBeenCalled());

		await waitFor(() => expect(window.google.accounts.id.initialize).toHaveBeenCalled());
		const googleBtn = screen.getByLabelText(/continue with google/i);
		fireEvent.click(googleBtn);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenNthCalledWith(
				1,
				"http://localhost:8001/auth/google",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						credential: "pilot-google-credential",
						role: "pilot",
						allow_pilot_signup: true,
					}),
				}),
			);
		});

		await waitFor(() => {
			expect(onPilotLoggedIn).toHaveBeenCalledWith(
				"pilot-google-token-signup",
				expect.objectContaining({ id: 51, email: "pilot-signup@example.com" }),
				expect.objectContaining({ apiBaseUrl: "http://localhost:8001" }),
			);
		});
	});

	test("shows a separate-email message when pilot signup reuses a customer email", async () => {
		global.fetch.mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				detail: "Email already registered for a different account type",
			}),
		});

		setup();
		fireEvent.click(screen.getByRole("tab", { name: /create account/i }));
		await waitFor(() => expect(fetchOAuthStatus).toHaveBeenCalled());

		await waitFor(() => expect(window.google.accounts.id.initialize).toHaveBeenCalled());
		fireEvent.click(screen.getByLabelText(/continue with google/i));

		expect(
			await screen.findByText(/use a different email for your pilot account/i),
		).toBeInTheDocument();
	});

	test("shows backend Google availability error when Google token auth is unavailable", async () => {
		fetchOAuthStatus.mockResolvedValueOnce({
			google: {
				token: {
					enabled: false,
					configured: false,
					origin_allowed: true,
					reason: "Google OAuth is not configured",
				},
				redirect: { enabled: false, configured: false, origin_allowed: true, reason: "Google OAuth is not configured" },
			},
			apple: {
				redirect: { enabled: true, configured: true, origin_allowed: true, reason: null },
			},
		});

		setup();
		await waitFor(() => expect(fetchOAuthStatus).toHaveBeenCalled());

		expect(
			screen.queryByLabelText(/continue with google/i),
		).not.toBeInTheDocument();
		expect(screen.getByText(/google oauth is not configured/i)).toBeInTheDocument();
	});

	test("applies OAuth access token from postMessage", async () => {
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				user_id: 7,
				email: "pilot@example.com",
				first_name: "Ada",
				last_name: "Pilot",
			}),
		});

		const { onPilotLoggedIn } = setup();

		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					origin: "http://localhost:8001",
					data: {
						type: "errandbridge_oauth_result",
						ok: true,
						provider: "google",
						access_token: "pilot-token",
					},
				}),
			);
		});

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				"http://localhost:8001/auth/me",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer pilot-token",
					}),
				}),
			);
		});

		await waitFor(() => {
			expect(onPilotLoggedIn).toHaveBeenCalledWith(
				"pilot-token",
				expect.objectContaining({ id: 7, email: "pilot@example.com" }),
				expect.objectContaining({ apiBaseUrl: "http://localhost:8001" }),
			);
		});
	});

	test("falls back to REST login when GraphQL login fails with iPad-style load failed", async () => {
		global.fetch
			.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
			.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					access_token: "pilot-rest-token",
					user_id: 17,
					email: "pilot-ipad@example.com",
				}),
			});

		const { onPilotLoggedIn } = setup();
			fireEvent.click(screen.getByRole("tab", { name: /sign in/i }));

		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "pilot-ipad@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/^password$/i), {
			target: { value: "supersecret" },
		});
		fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

		await waitFor(() => {
			expect(onPilotLoggedIn).toHaveBeenCalledWith(
				"pilot-rest-token",
				expect.objectContaining({ id: 17, email: "pilot-ipad@example.com" }),
				expect.objectContaining({ apiBaseUrl: "http://localhost:8001" }),
			);
			}, { timeout: 4000 });

		expect(global.fetch).toHaveBeenNthCalledWith(
			1,
			"http://localhost:8001/graphql",
			expect.objectContaining({ method: "POST" }),
		);
		expect(global.fetch).toHaveBeenNthCalledWith(
			2,
			"http://localhost:8001/graphql",
			expect.objectContaining({ method: "POST" }),
		);
		expect(global.fetch).toHaveBeenNthCalledWith(
			3,
			"http://localhost:8001/auth/login",
			expect.objectContaining({
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "pilot-ipad@example.com",
					password: "supersecret",
					role: "pilot",
				}),
			}),
		);
	});

	test("falls back to hosted API when local loopback rejects the pilot credentials", async () => {
		window.Capacitor = {
			getPlatform: () => "ios",
		};

		global.fetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					errors: [{ message: "Invalid email or password" }],
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: {
						login: {
							accessToken: "pilot-hosted-token-auth-mismatch",
							userId: 31,
							email: "mindblends@gmail.com",
						},
					},
				}),
			});

		const { onPilotLoggedIn } = setup();
		fireEvent.click(screen.getByRole("tab", { name: /sign in/i }));

		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "mindblends@gmail.com" },
		});
		fireEvent.change(screen.getByLabelText(/^password$/i), {
			target: { value: "supersecret" },
		});
		fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

		await waitFor(() => {
			expect(onPilotLoggedIn).toHaveBeenCalledWith(
				"pilot-hosted-token-auth-mismatch",
				expect.objectContaining({ id: 31, email: "mindblends@gmail.com" }),
				expect.objectContaining({ apiBaseUrl: "https://api.errandbridge.com" }),
			);
		}, { timeout: 4000 });

		expect(global.fetch).toHaveBeenNthCalledWith(
			1,
			"http://localhost:8001/graphql",
			expect.objectContaining({ method: "POST" }),
		);
		expect(global.fetch).toHaveBeenNthCalledWith(
			2,
			"https://api.errandbridge.com/graphql",
			expect.objectContaining({ method: "POST" }),
		);
	});

	test("falls back to hosted API when native pilot auth is pinned to a LAN backend", async () => {
		window.Capacitor = {
			getPlatform: () => "ios",
		};

		const onPilotLoggedIn = jest.fn();
		render(
			<PilotPortal
				apiBaseUrl="http://192.168.1.42:8001"
				onPilotLoggedIn={onPilotLoggedIn}
			/>,
		);

		global.fetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					errors: [{ message: "Invalid email or password" }],
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: {
						login: {
							accessToken: "pilot-hosted-lan-fallback-token",
							userId: 88,
							email: "mindblends@gmail.com",
						},
					},
				}),
			});

		fireEvent.click(screen.getByRole("tab", { name: /sign in/i }));
		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "mindblends@gmail.com" },
		});
		fireEvent.change(screen.getByLabelText(/^password$/i), {
			target: { value: "supersecret" },
		});
		fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

		await waitFor(() => {
			expect(onPilotLoggedIn).toHaveBeenCalledWith(
				"pilot-hosted-lan-fallback-token",
				expect.objectContaining({ id: 88, email: "mindblends@gmail.com" }),
				expect.objectContaining({ apiBaseUrl: "https://api.errandbridge.com" }),
			);
		}, { timeout: 4000 });

		expect(global.fetch).toHaveBeenNthCalledWith(
			1,
			"http://192.168.1.42:8001/graphql",
			expect.objectContaining({ method: "POST" }),
		);
		expect(global.fetch).toHaveBeenNthCalledWith(
			2,
			"https://api.errandbridge.com/graphql",
			expect.objectContaining({ method: "POST" }),
		);
	});

		test("falls back to hosted API when iOS loopback auth fails", async () => {
			window.Capacitor = {
				getPlatform: () => "ios",
			};

			global.fetch
				// When loopback switching is disabled, each auth request is retried once
				// (retries=1) against a single URL: 2 failures for GraphQL, 2 for REST,
				// then we try hosted GraphQL.
				.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
				.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
				.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
				.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						data: {
							login: {
								accessToken: "pilot-hosted-token",
								userId: 23,
								email: "pilot-ipad@example.com",
							},
						},
					}),
				});

			const { onPilotLoggedIn } = setup();
			fireEvent.click(screen.getByRole("tab", { name: /sign in/i }));

			fireEvent.change(screen.getByLabelText(/email/i), {
				target: { value: "pilot-ipad@example.com" },
			});
			fireEvent.change(screen.getByLabelText(/^password$/i), {
				target: { value: "supersecret" },
			});
			fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

			await waitFor(() => {
				expect(onPilotLoggedIn).toHaveBeenCalledWith(
					"pilot-hosted-token",
					expect.objectContaining({ id: 23, email: "pilot-ipad@example.com" }),
					expect.objectContaining({ apiBaseUrl: "https://api.errandbridge.com" }),
				);
			}, { timeout: 8000 });

			expect(global.fetch).toHaveBeenNthCalledWith(
				5,
				"https://api.errandbridge.com/graphql",
				expect.objectContaining({ method: "POST" }),
			);
		}, 12000);

	test("stays pinned to the local API on iOS when forced local auth is enabled", async () => {
		process.env.REACT_APP_FORCE_API_BASE = "true";
		window.Capacitor = {
			getPlatform: () => "ios",
		};

		global.fetch
			.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
			.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
			.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }))
			.mockRejectedValueOnce(Object.assign(new TypeError("Load failed"), { name: "TypeError" }));

		const { onPilotLoggedIn } = setup();
		fireEvent.click(screen.getByRole("tab", { name: /sign in/i }));

		fireEvent.change(screen.getByLabelText(/email/i), {
			target: { value: "pilot-ipad@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/^password$/i), {
			target: { value: "supersecret" },
		});
		fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

		await waitFor(() => {
			expect(onPilotLoggedIn).not.toHaveBeenCalled();
			expect(
				screen.getByText(/couldn’t reach your local pilot api/i),
			).toBeInTheDocument();
			expect(screen.getByText(/same wi.?fi/i)).toBeInTheDocument();
		}, { timeout: 8000 });

		expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(4);
		expect(global.fetch).not.toHaveBeenCalledWith(
			expect.stringContaining("https://api.errandbridge.com/graphql"),
			expect.anything(),
		);
	});
});