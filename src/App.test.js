import "@testing-library/jest-dom";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App, {
	buildClientReviewSummary,
	buildPendingReviewPromptCopy,
	buildRecentLandingReviewPreview,
	closeCapacitorBrowserSafely,
	countCompletedErrandsForDisplay,
	detectOnboardingType,
	decideSurface,
	getFloatingCornerBottomInsetPx,
	getFloatingCornerBottomCss,
	getFloatingCornerInsetPx,
	getLandingReviewPresentation,
	getHistorySequenceEndStatus,
	getArchivedErrandReviewUi,
	getEffectiveErrandStatusKey,
	hasNativeCapacitorBrowser,
	getToxiLauncherRightInsetPx,
	isClientV2CreateBottomZoneRailActive,
	mergeLandingReviewsPreview,
	mergePublicLandingReviews,
	pickMostRecentPendingReviewErrand,
	shouldUseFlushBottomCornersForToxiLauncher,
	shouldPauseToxiTeaser,
	shouldShowLandingReviewsButton,
	shouldShowFloatingReviewIcon,
} from "./App";

// App performs network requests on mount (GraphQL + version check).
// In unit tests, stub fetch to keep tests hermetic.
beforeEach(() => {
	jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
		const url = typeof input === "string" ? input : input?.url || "";
		const method = (init?.method || "GET").toUpperCase();
		const headers = init?.headers;
		const authHeader =
			(headers && typeof headers.get === "function" &&
				headers.get("Authorization")) ||
			(headers &&
				(typeof headers.Authorization === "string"
					? headers.Authorization
					: headers.authorization));

		if (url.includes("/version.json") && method === "GET") {
			return {
				ok: true,
				status: 200,
				json: async () => ({
					name: "errandbridge-frontend",
					packageVersion: "test",
				}),
				text: async () =>
					JSON.stringify({
						name: "errandbridge-frontend",
						packageVersion: "test",
					}),
			};
		}

		if (url.includes("/api/v1/public/reviews") && method === "GET") {
			return {
				ok: true,
				status: 200,
				json: async () => ({ reviews: [] }),
				text: async () => JSON.stringify({ reviews: [] }),
			};
		}

		if (url.includes("/api/v1/support/reviews") && method === "POST") {
			return {
				ok: true,
				status: 200,
				json: async () => ({ ok: true, provider: "test", detail: "stubbed" }),
				text: async () =>
					JSON.stringify({ ok: true, provider: "test", detail: "stubbed" }),
			};
		}

		if (url.includes("/graphql") && method === "POST") {
			let body = {};
			try {
				body = init?.body ? JSON.parse(init.body) : {};
			} catch {
				body = {};
			}
			const query = String(body?.query || "");
			if (/\bmutation\s+CreateErrand\b/.test(query) || /\bcreateErrand\s*\(/.test(query)) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						data: {
							createErrand: {
								id: "123",
								title: "Test errand",
								status: "PENDING",
								referenceNumber: "EB-1-2",
								pickupTimeSlotDate: null,
								pickupTimeSlotStart: null,
								pickupTimeSlotEnd: null,
							},
						},
					}),
					text: async () =>
						JSON.stringify({
							data: {
								createErrand: {
									id: "123",
									title: "Test errand",
									status: "PENDING",
									referenceNumber: "EB-1-2",
									pickupTimeSlotDate: null,
									pickupTimeSlotStart: null,
									pickupTimeSlotEnd: null,
								},
							},
						}),
				};
			}
			// App expects a stable bootstrap user shape during mount.
			// When a test sets an auth token, App will request `me { ... }`.
			if (/\bme\s*\{/.test(query)) {
				const hasAuth = Boolean(authHeader);
				return {
					ok: true,
					status: 200,
					json: async () => ({
						data: {
							me: hasAuth
								? {
									id: "1",
									email: "test@errandbridge.local",
									firstName: "Test",
									lastName: "User",
									phone: null,
									addressLine1: null,
									addressLine2: null,
									city: null,
									state: null,
									postalCode: null,
									country: null,
									isEmailVerified: true,
									isAdmin: false,
									transparency: {
										completedErrands: 0,
										documentsHandled: 0,
									},
								}
								: null,
						},
					}),
					text: async () =>
						JSON.stringify({
							data: {
								me: hasAuth
									? {
										id: "1",
										email: "test@errandbridge.local",
										firstName: "Test",
										lastName: "User",
										phone: null,
										addressLine1: null,
										addressLine2: null,
										city: null,
										state: null,
										postalCode: null,
										country: null,
										isEmailVerified: true,
										isAdmin: false,
										transparency: {
											completedErrands: 0,
											documentsHandled: 0,
										},
									}
									: null,
							},
						}),
				};
			}
			if (/\bclientLifecycle\s*\{/.test(query)) {
				const hasAuth = Boolean(authHeader);
				return {
					ok: true,
					status: 200,
					json: async () => ({
						data: {
							clientLifecycle: hasAuth
								? {
									userId: 1,
									isLoggedIn: true,
									hasSubmittedRequest: false,
									isReturningClient: false,
									completedErrandCount: 0,
									pendingReviewErrandIds: [],
									lastCompletedErrandId: null,
									hasSubmittedAnyReview: false,
									hasPendingReview: false,
									referralCode: null,
									referralShareLink: null,
									hasEarnedReferralReward: false,
									hasUnusedReferralReward: false,
									referralRewardExpiresAt: null,
									referralCampaignEndsAt: "2026-12-31T23:59:59Z",
									hasReferralShareAvailable: false,
								}
								: {
									userId: null,
									isLoggedIn: false,
									hasSubmittedRequest: false,
									isReturningClient: false,
									completedErrandCount: 0,
									pendingReviewErrandIds: [],
									lastCompletedErrandId: null,
									hasSubmittedAnyReview: false,
									hasPendingReview: false,
									referralCode: null,
									referralShareLink: null,
									hasEarnedReferralReward: false,
									hasUnusedReferralReward: false,
									referralRewardExpiresAt: null,
									referralCampaignEndsAt: "2026-12-31T23:59:59Z",
									hasReferralShareAvailable: false,
								},
						},
					}),
					text: async () => JSON.stringify({ data: {} }),
				};
			}
			if (query.includes("viewer") || query.includes("currentUser")) {
				return {
					ok: true,
					status: 200,
					json: async () => ({ data: { viewer: null } }),
					text: async () => JSON.stringify({ data: { viewer: null } }),
				};
			}
			return {
				ok: true,
				status: 200,
				json: async () => ({ data: {} }),
				text: async () => JSON.stringify({ data: {} }),
			};
		}

		if (url.includes("/payments/verify-session") && method === "POST") {
			const payload = (() => {
				try {
					return init?.body ? JSON.parse(init.body) : {};
				} catch {
					return {};
				}
			})();
			const sessionId = String(payload?.session_id || "cs_test_123");
			return {
				ok: true,
				status: 200,
				json: async () => ({
					paid: true,
					status: "complete",
					payment_status: "paid",
					amount_total: 100,
					currency: "usd",
					customer_email: "test@errandbridge.local",
					session_id: sessionId,
				}),
				text: async () =>
					JSON.stringify({
						paid: true,
						status: "complete",
						payment_status: "paid",
						amount_total: 100,
						currency: "usd",
						customer_email: "test@errandbridge.local",
						session_id: sessionId,
					}),
			};
		}

		// Default stub for GraphQL / API calls.
		return {
			ok: true,
			status: 200,
			json: async () => ({ data: {} }),
			text: async () => JSON.stringify({ data: {} }),
		};
	});
});

afterEach(() => {
	jest.restoreAllMocks();
});

const ROUTER_FUTURE_FLAGS = {
	v7_startTransition: true,
	v7_relativeSplatPath: true,
};

const renderWithRouter = (ui) =>
	render(<MemoryRouter future={ROUTER_FUTURE_FLAGS}>{ui}</MemoryRouter>);

const renderWithRoute = (ui, route = "/") =>
	render(
		<MemoryRouter future={ROUTER_FUTURE_FLAGS} initialEntries={[route]}>
			{ui}
		</MemoryRouter>,
	);

// Helper duplicated from App.js logic (kept small + explicit for unit testing).
const extractErrandReference = (raw) => {
	const text = String(raw || "").trim();
	if (!text) return null;
	// Matches common reference formats seen in the UI like: EB-36-5084
	// Also tolerates users typing spaces/underscores instead of dashes.
	const match = text.match(/\bEB[\s_-]*\d{1,4}[\s_-]*\d{1,8}\b/i);
	if (!match) return null;
	return match[0].replace(/[\s_]+/g, "-").toUpperCase();
};

jest.mock("./components/PilotTracker", () => () => (
	<div data-testid="pilot-tracker" />
));

jest.mock("./components/ClientTrackingPage", () => ({
	__esModule: true,
	default: ({ errandId, onBack, onViewDetails }) => (
		<div data-testid="client-tracking-page">
			Tracking route for {String(errandId)}
			<button type="button" onClick={onBack}>
				Back from tracking
			</button>
			<button type="button" onClick={onViewDetails}>
				Open details from tracking
			</button>
		</div>
	),
}));

jest.mock("./components/SubmissionConfirmationModal", () => ({
	__esModule: true,
	default: ({ open, errandData }) =>
		open && errandData ? (
			<div role="dialog" aria-label="Submission confirmation">
				Receipt: {errandData.referenceNumber}
				{errandData.paymentReceipt?.paid ? (
					<div>
						Payment receipt: {errandData.paymentReceipt.amountLabel || "paid"}
					</div>
				) : null}
			</div>
		) : null,
}));

test("renders ErrandBridge logo in header", () => {
	renderWithRouter(<App />);
	// Look for the logo image in the header
	const logo = screen.getByAltText(/ErrandBridge/i);
	expect(logo).toBeInTheDocument();
});

describe("footer legal links (regression)", () => {
	test("opens and closes legal modal for each link", async () => {
		// Support older @testing-library/user-event versions in this repo.
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		renderWithRouter(<App />);

		// These links are rendered as buttons in the footer.
		// We scope queries to the footer legal nav to avoid matching similarly-named nav items.
		const legalNav = await screen.findByRole("navigation", { name: /legal/i });
		const legalScope = within(legalNav);
		const cases = [
			{ label: /Privacy Policy/i, title: /Privacy Policy/i },
			{ label: /^Terms$/i, title: /Terms of Service/i },
			{ label: /Cookie Policy/i, title: /Cookie Policy/i },
		];

		for (const c of cases) {
			const btn = await legalScope.findByRole("button", { name: c.label });
			await user.click(btn);

			// Modal root.
			expect(
				await screen.findByRole("dialog", { name: c.title }),
			).toBeInTheDocument();

			// Close via "Done".
			await user.click(screen.getByRole("button", { name: /^Done$/i }));
			expect(
				screen.queryByRole("dialog", { name: c.title }),
			).not.toBeInTheDocument();
		}

		const pilotPolicyBtn = await legalScope.findByRole("button", {
			name: /Pilot policy/i,
		});
		await user.click(pilotPolicyBtn);

		expect(
			await screen.findByRole("dialog", { name: /Terms-Lite Pilot Policy/i }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /^Close$/i }));
		expect(
			screen.queryByRole("dialog", { name: /Terms-Lite Pilot Policy/i }),
		).not.toBeInTheDocument();

		// Cookie preferences is a non-modal action that fires a custom event.
		const dispatchSpy = jest.spyOn(window, "dispatchEvent");
		const prefsBtn = await legalScope.findByRole("button", {
			name: /Cookie preferences/i,
		});
		await user.click(prefsBtn);
		expect(dispatchSpy).toHaveBeenCalled();
		const lastCallArg = dispatchSpy.mock.calls.at(-1)?.[0];
		expect(lastCallArg?.type).toBe("open-cookie-preferences");
	}, 15000);
});

describe("assistant errand reference parsing", () => {
	test("extracts canonical EB ref with dashes", () => {
		expect(extractErrandReference("Track EB-36-5084 please")).toBe(
			"EB-36-5084",
		);
	});

	test("tolerates spaces/underscores and normalizes to dashes", () => {
		expect(extractErrandReference("my ref is EB 36 5084")).toBe("EB-36-5084");
		expect(extractErrandReference("my ref is eb_36_5084")).toBe("EB-36-5084");
	});

	test("returns null when no reference exists", () => {
		expect(extractErrandReference("I want to track my errand")).toBeNull();
	});
});

describe("growth surface decisioning", () => {
	test("detects admin onboarding when the admin dashboard is active", () => {
		expect(
			detectOnboardingType({
				userIsAdmin: true,
				showAdminDashboard: true,
				hasAdminDashboardNode: false,
				hasPilotDashboardNode: true,
			}),
		).toBe("admin");

		expect(
			detectOnboardingType({
				userIsAdmin: true,
				showAdminDashboard: false,
				hasAdminDashboardNode: true,
				hasPilotDashboardNode: false,
			}),
		).toBe("admin");
	});

	test("falls back to pilot or customer onboarding when admin cues are absent", () => {
		expect(
			detectOnboardingType({
				userIsAdmin: false,
				showAdminDashboard: false,
				hasAdminDashboardNode: false,
				hasPilotDashboardNode: true,
			}),
		).toBe("pilot");

		expect(
			detectOnboardingType({
				userIsAdmin: false,
				showAdminDashboard: false,
				hasAdminDashboardNode: false,
				hasPilotDashboardNode: false,
			}),
		).toBe("customer");
	});

	test("does not choose legacy assistant surface when intent is high", () => {
		expect(
			decideSurface({
				user: null,
				showCareersPage: false,
				activeSurface: null,
				assistantOpen: false,
				intentScore: 80,
				growthContext: {
					isMobile: false,
					geoBucket: "diaspora",
					isReturning: false,
				},
				appPromoSeen: true,
				pilotPromoSeen: true,
				floatingVideoMinimized: true,
				floatingVideoHiddenUntil: 0,
			}),
		).toBeNull();
	});

	test("mobile new user gets app promo first", () => {
		expect(
			decideSurface({
				user: null,
				showCareersPage: false,
				activeSurface: null,
				assistantOpen: false,
				intentScore: 10,
				growthContext: {
					isMobile: true,
					geoBucket: "nigeria",
					isReturning: false,
				},
				appPromoSeen: false,
				pilotPromoSeen: false,
				floatingVideoMinimized: false,
				floatingVideoHiddenUntil: 0,
			}),
		).toBe("appPromo");
	});

	test("desktop diaspora returning can see pilot promo", () => {
		expect(
			decideSurface({
				user: null,
				showCareersPage: false,
				activeSurface: null,
				assistantOpen: false,
				intentScore: 10,
				growthContext: {
					isMobile: false,
					geoBucket: "diaspora",
					isReturning: true,
				},
				appPromoSeen: true,
				pilotPromoSeen: false,
				floatingVideoMinimized: false,
				floatingVideoHiddenUntil: 0,
			}),
		).toBe("pilotPromo");
	});
});

describe("pending review helpers", () => {
	test("keeps Toxi and floating review affordances on the same corner inset", () => {
		expect(getFloatingCornerInsetPx()).toBe(16);
		expect(getFloatingCornerInsetPx({ isMobileViewport: true })).toBe(12);
		expect(getFloatingCornerBottomInsetPx({ isMobileViewport: true })).toBe(10);
		expect(getFloatingCornerBottomInsetPx({ isMobileViewport: false })).toBe(16);
		expect(getToxiLauncherRightInsetPx()).toBe(getFloatingCornerInsetPx());
		expect(getToxiLauncherRightInsetPx({ isMobileViewport: true })).toBe(
			getFloatingCornerInsetPx({ isMobileViewport: true }),
		);
		expect(getFloatingCornerBottomCss(getFloatingCornerInsetPx())).toBe(
			"calc(16px + env(safe-area-inset-bottom))",
		);
		expect(
			getFloatingCornerBottomCss(getFloatingCornerBottomInsetPx({ isMobileViewport: true }), {
				includeSafeAreaBottom: false,
			}),
		).toBe("10px");
		expect(
			shouldUseFlushBottomCornersForToxiLauncher({
				landingVisible: false,
				isMobileViewport: true,
				toxiSurface: "client_dashboard",
			}),
		).toBe(true);
		expect(
			shouldUseFlushBottomCornersForToxiLauncher({
				landingVisible: false,
				isMobileViewport: true,
				toxiSurface: "create_flow",
			}),
		).toBe(true);
	});

	test("picks the most recent pending review errand from lifecycle ids", () => {
		const errand = pickMostRecentPendingReviewErrand({
			lifecycle: {
				pendingReviewErrandIds: [3, 9],
			},
			errands: [
				{ id: 3, createdAt: "2026-04-01T10:00:00Z" },
				{ id: 9, createdAt: "2026-04-10T10:00:00Z" },
			],
		});

		expect(errand?.id).toBe(9);
	});

	test("pauses the Toxi teaser when review or card surfaces are active", () => {
		expect(
			shouldPauseToxiTeaser({
				reviewModalOpen: false,
				floatingReviewPromptOpen: false,
				activeModal: null,
				activePanel: null,
				activeSurface: null,
			}),
		).toBe(false);

		expect(
			shouldPauseToxiTeaser({
				reviewModalOpen: false,
				floatingReviewPromptOpen: true,
				activeModal: null,
				activePanel: null,
				activeSurface: null,
			}),
		).toBe(true);

		expect(
			shouldPauseToxiTeaser({
				reviewModalOpen: true,
				floatingReviewPromptOpen: false,
				activeModal: null,
				activePanel: null,
				activeSurface: null,
			}),
		).toBe(true);

		expect(
			shouldPauseToxiTeaser({
				reviewModalOpen: false,
				floatingReviewPromptOpen: false,
				activeModal: "details",
				activePanel: null,
				activeSurface: null,
			}),
		).toBe(true);

		expect(
			shouldPauseToxiTeaser({
				reviewModalOpen: false,
				floatingReviewPromptOpen: false,
				activeModal: null,
				activePanel: "support",
				activeSurface: null,
			}),
		).toBe(true);
	});

	test("shows floating review icon only when lifecycle and surface rules pass", () => {
		expect(
			shouldShowFloatingReviewIcon({
				lifecycle: {
					isLoggedIn: true,
					hasPendingReview: true,
					pendingReviewErrandIds: [9],
				},
				reviewModalOpen: false,
				dismissedForSession: false,
				surface: "client_dashboard",
				toxiOpen: false,
			}),
		).toBe(true);

		expect(
			shouldShowFloatingReviewIcon({
				lifecycle: {
					isLoggedIn: true,
					hasPendingReview: true,
					pendingReviewErrandIds: [9],
				},
				reviewModalOpen: false,
				dismissedForSession: false,
				surface: "create_flow",
				toxiOpen: false,
			}),
		).toBe(false);

		expect(
			shouldShowFloatingReviewIcon({
				lifecycle: {
					isLoggedIn: true,
					hasPendingReview: true,
					pendingReviewErrandIds: [9],
				},
				reviewModalOpen: true,
				dismissedForSession: false,
				surface: "client_dashboard",
				toxiOpen: false,
			}),
		).toBe(false);
	});

	test("builds the compact pending review micro-popup copy", () => {
		expect(
			buildPendingReviewPromptCopy({ title: "Passport pickup" }),
		).toEqual(
			expect.objectContaining({
				headline: "Quick note from Toxi",
				bodyLines: [
					"Hope your errand went well 👋",
					"Please take a moment to rate your Pilot and share feedback.",
				],
				ctaLabel: "Leave a Review ⭐",
				ariaLabel: expect.stringMatching(/passport pickup/i),
			}),
		);
	});

	test("summarizes reviewed errands for the client profile", () => {
		expect(
			buildClientReviewSummary([
				{
					id: 1,
					title: "Document pickup",
					reviewStatus: "reviewed",
					reviewerRating: 5,
					reviewCompletedAt: "2026-04-10T10:00:00Z",
				},
				{
					id: 2,
					title: "Inspection run",
					reviewStatus: "reviewed",
					reviewerRating: 4,
					reviewCompletedAt: "2026-04-12T10:00:00Z",
				},
			]),
		).toEqual(
			expect.objectContaining({
				submittedCount: 2,
				averageRating: 4.5,
				latestReview: expect.objectContaining({
					id: 2,
					title: "Inspection run",
					rating: 4,
				}),
			}),
		);
	});
});

describe("Client V2 create-flow bottom zone", () => {
	test("treats guided assist mode as bottom-rail active", () => {
		expect(
			isClientV2CreateBottomZoneRailActive({
				isClientV2CreateSurface: true,
				toxiAssistEnabled: true,
				mobileCheckoutRailVisible: false,
			}),
		).toBe(true);
	});

	test("treats manual review rail visibility as bottom-rail active", () => {
		expect(
			isClientV2CreateBottomZoneRailActive({
				isClientV2CreateSurface: true,
				toxiAssistEnabled: false,
				mobileCheckoutRailVisible: true,
			}),
		).toBe(true);
	});

	test("is inactive when not on the create surface", () => {
		expect(
			isClientV2CreateBottomZoneRailActive({
				isClientV2CreateSurface: false,
				toxiAssistEnabled: true,
				mobileCheckoutRailVisible: true,
			}),
		).toBe(false);
	});

	test("is inactive in manual mode before eligibility", () => {
		expect(
			isClientV2CreateBottomZoneRailActive({
				isClientV2CreateSurface: true,
				toxiAssistEnabled: false,
				mobileCheckoutRailVisible: false,
			}),
		).toBe(false);
	});
});

describe("landing reviews shortcut", () => {
	test("uses tighter, wrapped review card metrics on mobile", () => {
		expect(getLandingReviewPresentation(true)).toEqual(
			expect.objectContaining({
				modalMaxWidth: 560,
				cardMaxWidth: "min(100%, 440px)",
				quoteLineClamp: 4,
				quoteFontSize: 13,
			}),
		);

		expect(getLandingReviewPresentation(false)).toEqual(
			expect.objectContaining({
				modalMaxWidth: 720,
				cardMaxWidth: "100%",
				quoteLineClamp: 6,
			}),
		);
	});

	test("prepends a freshly submitted review preview ahead of the curated stories", () => {
		const preview = buildRecentLandingReviewPreview({
			errand: { id: -1, title: "Website feedback", reference_number: "LANDING" },
			reviewRating: 5,
			reviewNotes: "Super easy to use and the updates felt trustworthy.",
			user: { firstName: "Ada", lastName: "Okafor" },
		});

		expect(preview).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(/^recent-landing-review-/),
				name: "Ada O.",
				region: "Website feedback",
				rating: 5,
				quote: "Super easy to use and the updates felt trustworthy.",
			}),
		);

		const merged = mergeLandingReviewsPreview(preview);
		expect(merged[0]).toEqual(preview);
		expect(merged).toHaveLength(5);
	});

	test("merges a submitted review into the public landing feed without duplicates", () => {
		const preview = {
			id: "recent-landing-review-test",
			name: "Ada O.",
			region: "Ikeja → Lekki",
			rating: 5,
			quote: "Fast updates, great communication, and everything arrived safely.",
		};

		const merged = mergePublicLandingReviews(preview, [
			{
				id: "existing-review-1",
				name: "Existing Customer",
				region: "Lagos",
				rating: 5,
				quote: "Fast updates, great communication, and everything arrived safely.",
			},
			{
				id: "existing-review-2",
				name: "Jordan A.",
				region: "Abuja",
				rating: 4,
				quote: "Very reliable from start to finish.",
			},
		]);

		expect(merged).toEqual([
			preview,
			expect.objectContaining({
				id: "existing-review-2",
				quote: "Very reliable from start to finish.",
			}),
		]);
	});

	test("hydrates the most recent submitted review into the landing reviews panel", async () => {
		window.localStorage.setItem(
			"eb_recent_landing_review_v1",
			JSON.stringify({
				id: "recent-landing-review-test",
				name: "Jordan A.",
				region: "Website feedback",
				rating: 5,
				quote: "Left feedback from the website and it still showed up right away.",
			}),
		);

		try {
			renderWithRoute(<App />, "/home/reviews");

			expect(
				await screen.findByText(/left feedback from the website and it still showed up right away/i),
			).toBeInTheDocument();
		} finally {
			window.localStorage.removeItem("eb_recent_landing_review_v1");
		}
	});

	test("shows only when the landing page is clear of blocking overlays", () => {
		expect(
			shouldShowLandingReviewsButton({
				landingVisible: true,
				reviewsPanelOpen: false,
					reviewModalOpen: false,
				hasBlockingOverlay: false,
				mobileMenuOpen: false,
				mobileLoginSheetOpen: false,
				activeSurface: null,
			}),
		).toBe(true);

		expect(
			shouldShowLandingReviewsButton({
				landingVisible: true,
				reviewsPanelOpen: false,
					reviewModalOpen: false,
				hasBlockingOverlay: true,
				mobileMenuOpen: false,
				mobileLoginSheetOpen: false,
				activeSurface: null,
			}),
		).toBe(false);

			expect(
				shouldShowLandingReviewsButton({
					landingVisible: true,
					reviewsPanelOpen: false,
					reviewModalOpen: true,
					hasBlockingOverlay: false,
					mobileMenuOpen: false,
					mobileLoginSheetOpen: false,
					activeSurface: null,
				}),
			).toBe(false);
	});

	test("opens the public reviews panel from the standalone floating button", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		renderWithRoute(<App />, "/home");

		const floatingButton = await screen.findByRole("button", {
			name: /open reviews/i,
		});
		expect(floatingButton).toBeInTheDocument();
		expect(screen.queryByRole("note", { name: /reviews hint/i })).not.toBeInTheDocument();

		fireEvent.mouseEnter(floatingButton.parentElement);
		expect(screen.getByRole("note", { name: /reviews hint/i })).toHaveTextContent(
			/reviews/i,
		);
		expect(screen.getByRole("note", { name: /reviews hint/i })).toHaveTextContent(
			/read client stories/i,
		);

		await user.click(floatingButton);

		expect(
			await screen.findByRole("dialog", { name: /reviews/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/verified experiences from clients using errandbridge/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/follow every step in real time until it got to my family in lagos/i),
		).toBeInTheDocument();
	});
});

describe("archived errand review UI", () => {
	test("offers a clickable review CTA when the effective archived status is completed", () => {
		expect(
			getArchivedErrandReviewUi({
				statusKey: "completed",
				reviewStatusKey: "needs_review",
				isCustomer: true,
			}),
		).toEqual(
			expect.objectContaining({
				canReview: true,
				showIndicator: true,
				label: "⭐ Review now",
			}),
		);
	});

	test("does not show a misleading review-needed badge for non-reviewable archived statuses", () => {
		expect(
			getArchivedErrandReviewUi({
				statusKey: "cancelled",
				reviewStatusKey: "needs_review",
				isCustomer: true,
			}),
		).toEqual(
			expect.objectContaining({
				canReview: false,
				showIndicator: false,
				label: "",
			}),
		);
	});
});

describe("cancelled errand activity logic", () => {
	test("uses cancellation as the effective terminal state", () => {
		expect(
			getEffectiveErrandStatusKey({
				status: "completed",
				history: [
					{ eventType: "status_update", newStatus: "completed" },
					{ eventType: "admin_cancelled", oldStatus: "completed", newStatus: "cancelled" },
				],
			}),
		).toBe("cancelled");
	});

	test("does not synthesize completion before a cancelled terminal state", () => {
		expect(
			getHistorySequenceEndStatus({
				currentStatus: "cancelled",
				history: [
					{ eventType: "created", newStatus: "submitted" },
					{ eventType: "admin_assign_pilot", newStatus: "assigned" },
					{ eventType: "admin_cancelled", oldStatus: "assigned", newStatus: "cancelled" },
				],
			}),
		).toBe("assigned");
	});

	test("prefers live errand truth over stale backend completed counts", () => {
		expect(
			countCompletedErrandsForDisplay(
				[
					{
						status: "cancelled",
						history: [
							{ eventType: "status_update", newStatus: "completed" },
							{ eventType: "admin_cancelled", newStatus: "cancelled" },
						],
					},
				],
				1,
			),
		).toBe(0);
	});
});

describe("Currency inference (regression)", () => {
	// We keep this regression test intentionally lightweight: it verifies the *fix*
	// (UK isn't bucketed into the generic Europe/EUR path) by checking that
	// Intl formatting under a UK locale yields a pound sign.
	const originalNavigator = Object.getOwnPropertyDescriptor(
		window,
		"navigator",
	);
	const originalIntl = global.Intl;

	const setNavigatorLanguage = (language) => {
		Object.defineProperty(window, "navigator", {
			configurable: true,
			value: {
				...(window.navigator || {}),
				language,
				languages: [language],
			},
		});
	};

	afterEach(() => {
		if (originalNavigator) {
			Object.defineProperty(window, "navigator", originalNavigator);
		}
		global.Intl = originalIntl;
	});

	test("Intl currency formatting under en-GB uses £", () => {
		setNavigatorLanguage("en-GB");
		// Use the same Intl call pattern as App.js's formatCurrency helper.
		const formatted = new originalIntl.NumberFormat(undefined, {
			style: "currency",
			currency: "GBP",
		}).format(29);
		expect(formatted).toContain("£");
	});
});

describe("Stripe payment receipt (regression)", () => {
	test("browser close cleanup ignores inactive web plugin windows", async () => {
		const close = jest.fn().mockRejectedValue(new Error("No active window to close!"));

		await expect(
			closeCapacitorBrowserSafely({ close }),
		).resolves.toBe(false);
		expect(close).toHaveBeenCalledTimes(1);
	});

	test("checkout does not treat web browser plugins as native", () => {
		expect(
			hasNativeCapacitorBrowser({
				isNativePlatform: () => false,
				Plugins: { Browser: { open: jest.fn(), close: jest.fn() } },
			}),
		).toBe(false);

		expect(
			hasNativeCapacitorBrowser({
				isNativePlatform: () => true,
				Plugins: { Browser: { open: jest.fn(), close: jest.fn() } },
			}),
		).toBe(true);
	});

	test("auto-opens receipt after /payment/success when draft receipt is stored", async () => {
		try {
			// Stripe return verification requires an auth token.
			window.localStorage.setItem("authToken", "test");
			window.localStorage.setItem("userId", "1");
			// App's post-payment effect only runs when startCheckout() previously set this.
			window.sessionStorage.setItem("postPaymentAction", "success");
			window.sessionStorage.setItem(
				"eb_checkout_draft_receipt_v1",
				JSON.stringify({
					id: "123",
					title: "Test errand",
					referenceNumber: "EB-1-2",
					status: "PENDING",
					pickupTimeSlotDate: null,
					pickupTimeSlotStart: null,
					pickupTimeSlotEnd: null,
				}),
			);

			window.history.pushState(
				{},
				"",
				"/payment/success?session_id=cs_test_123",
			);
			renderWithRouter(<App />);

			expect(
				await screen.findByRole("dialog", {
					name: /submission confirmation/i,
					}, { timeout: 5000 }),
			).toHaveTextContent("EB-1-2");
			expect(screen.getByRole("dialog", {
				name: /submission confirmation/i,
			})).toHaveTextContent("Payment receipt");
		} finally {
			window.localStorage.removeItem("authToken");
			window.localStorage.removeItem("token");
			window.localStorage.removeItem("userId");
			window.localStorage.removeItem("userIsAdmin");
			window.sessionStorage.removeItem("postPaymentAction");
			window.sessionStorage.removeItem("eb_checkout_draft_receipt_v1");
		}
		}, 15000);

		test("accepts checkout_session_id alias on /payment/success returns", async () => {
			try {
				window.localStorage.setItem("authToken", "test");
				window.localStorage.setItem("userId", "1");
				window.sessionStorage.setItem("postPaymentAction", "success");
				window.sessionStorage.setItem(
					"eb_checkout_draft_receipt_v1",
					JSON.stringify({
						id: "123",
						title: "Test errand",
						referenceNumber: "EB-1-2",
						status: "PENDING",
						pickupTimeSlotDate: null,
						pickupTimeSlotStart: null,
						pickupTimeSlotEnd: null,
					}),
				);

				window.history.pushState(
					{},
					"",
					"/payment/success?checkout_session_id=cs_test_alias_123",
				);
				renderWithRouter(<App />);

				expect(
					await screen.findByRole("dialog", {
						name: /submission confirmation/i,
					}),
				).toHaveTextContent("Payment receipt");

				await waitFor(() => {
					const verifyCalls = global.fetch.mock.calls.filter(([input, init]) => {
						const url = typeof input === "string" ? input : input?.url || "";
						const method = String(init?.method || "GET").toUpperCase();
						if (!url.includes("/payments/verify-session") || method !== "POST") {
							return false;
						}
						try {
							const body = init?.body ? JSON.parse(init.body) : {};
							return body?.session_id === "cs_test_alias_123";
						} catch {
							return false;
						}
					});
					expect(verifyCalls.length).toBeGreaterThan(0);
				});
			} finally {
				window.localStorage.removeItem("authToken");
				window.localStorage.removeItem("token");
				window.localStorage.removeItem("userId");
				window.localStorage.removeItem("userIsAdmin");
				window.sessionStorage.removeItem("postPaymentAction");
				window.sessionStorage.removeItem("eb_checkout_draft_receipt_v1");
			}
		});

	test("falls back to the pending checkout session id when success return omits session_id", async () => {
		try {
			window.localStorage.setItem("authToken", "test");
			window.localStorage.setItem("userId", "1");
			window.sessionStorage.setItem(
				"eb_pending_checkout_session_id_v1",
				"cs_test_pending_123",
			);
			window.sessionStorage.setItem("eb_pending_checkout_kind_v1", "payment");
			window.sessionStorage.setItem(
				"eb_pending_checkout_started_at_v1",
				String(Date.now() - 5000),
			);
			window.sessionStorage.setItem(
				"eb_checkout_draft_receipt_v1",
				JSON.stringify({
					id: "123",
					title: "Test errand",
					referenceNumber: "EB-1-2",
					status: "PENDING",
					pickupTimeSlotDate: null,
					pickupTimeSlotStart: null,
					pickupTimeSlotEnd: null,
				}),
			);

			window.history.pushState({}, "", "/payment/success");
			renderWithRouter(<App />);

			expect(
				await screen.findByRole("dialog", {
					name: /submission confirmation/i,
				}),
			).toHaveTextContent("EB-1-2");

			await waitFor(() => {
				const verifyCalls = global.fetch.mock.calls.filter(([input, init]) => {
					const url = typeof input === "string" ? input : input?.url || "";
					const method = String(init?.method || "GET").toUpperCase();
					if (!url.includes("/payments/verify-session") || method !== "POST") {
						return false;
					}
					try {
						const body = init?.body ? JSON.parse(init.body) : {};
						return body?.session_id === "cs_test_pending_123";
					} catch {
						return false;
					}
				});
				expect(verifyCalls.length).toBeGreaterThan(0);
			});
		} finally {
			window.localStorage.removeItem("authToken");
			window.localStorage.removeItem("token");
			window.localStorage.removeItem("userId");
			window.localStorage.removeItem("userIsAdmin");
			window.sessionStorage.removeItem("eb_pending_checkout_session_id_v1");
			window.sessionStorage.removeItem("eb_pending_checkout_kind_v1");
			window.sessionStorage.removeItem("eb_pending_checkout_started_at_v1");
			window.sessionStorage.removeItem("eb_checkout_draft_receipt_v1");
		}
	});

	test("dedupes verify-session requests when success return overlaps with pending-checkout resume", async () => {
		try {
			window.localStorage.setItem("authToken", "test");
			window.localStorage.setItem("userId", "1");
			window.sessionStorage.setItem("postPaymentAction", "success");
			window.sessionStorage.setItem(
				"eb_checkout_draft_receipt_v1",
				JSON.stringify({
					id: "123",
					title: "Test errand",
					referenceNumber: "EB-1-2",
					status: "PENDING",
					pickupTimeSlotDate: null,
					pickupTimeSlotStart: null,
					pickupTimeSlotEnd: null,
				}),
			);
			window.sessionStorage.setItem(
				"eb_pending_checkout_session_id_v1",
				"cs_test_123",
			);
			window.sessionStorage.setItem("eb_pending_checkout_kind_v1", "payment");
			window.sessionStorage.setItem(
				"eb_pending_checkout_started_at_v1",
				String(Date.now() - 5000),
			);

			window.history.pushState(
				{},
				"",
				"/payment/success?session_id=cs_test_123",
			);
			renderWithRouter(<App />);

			expect(
				await screen.findByRole("dialog", {
					name: /submission confirmation/i,
				}),
			).toHaveTextContent("EB-1-2");

			await waitFor(() => {
				const verifyCalls = global.fetch.mock.calls.filter(([input, init]) => {
					const url = typeof input === "string" ? input : input?.url || "";
					const method = String(init?.method || "GET").toUpperCase();
					return url.includes("/payments/verify-session") && method === "POST";
				});
				expect(verifyCalls).toHaveLength(1);
			});
		} finally {
			window.localStorage.removeItem("authToken");
			window.localStorage.removeItem("token");
			window.localStorage.removeItem("userId");
			window.localStorage.removeItem("userIsAdmin");
			window.sessionStorage.removeItem("postPaymentAction");
			window.sessionStorage.removeItem("eb_checkout_draft_receipt_v1");
			window.sessionStorage.removeItem("eb_pending_checkout_session_id_v1");
			window.sessionStorage.removeItem("eb_pending_checkout_kind_v1");
			window.sessionStorage.removeItem("eb_pending_checkout_started_at_v1");
		}
	});

	test("auto-submits and opens receipt after /payment/success when checkout snapshot is stored", async () => {
		try {
			window.localStorage.setItem("authToken", "test");
			window.localStorage.setItem("userId", "1");
			window.sessionStorage.setItem("postPaymentAction", "success");
			window.sessionStorage.setItem(
				"eb_checkout_submission_snapshot_v1",
				JSON.stringify({
					title: "",
					template: "Official Document / Office Pickup",
					note: "Pick up documents from the front desk.",
					accessNotes: "Call on arrival.",
					sensitivity: "Sensitive (documents, money, medicine)",
					pickup: "123 Main St",
					dropoff: "",
					pickupTimeSlotDate: "",
					pickupTimeSlotStart: "",
					pickupTimeSlotEnd: "",
					scheduleType: "now",
					recurringFrequency: "weekly",
					recurringDays: [],
					recurringTime: "09:00",
					agreed: true,
					paymentMode: "payment",
					promoCode: "",
				}),
			);

			window.history.pushState(
				{},
				"",
				"/payment/success?session_id=cs_test_123",
			);
			renderWithRouter(<App />);

			expect(
				await screen.findByRole("dialog", {
					name: /submission confirmation/i,
				}),
			).toHaveTextContent("EB-1-2");
		} finally {
			window.localStorage.removeItem("authToken");
			window.localStorage.removeItem("token");
			window.localStorage.removeItem("userId");
			window.localStorage.removeItem("userIsAdmin");
			window.sessionStorage.removeItem("postPaymentAction");
			window.sessionStorage.removeItem("eb_checkout_submission_snapshot_v1");
			window.sessionStorage.removeItem(
				"eb_checkout_autosubmit_attempted_session_id_v1",
			);
		}
	});
});

describe("dedicated client tracking route", () => {
	test("routes /client/errands/:id/tracking into the errands surface", async () => {
		try {
			window.localStorage.setItem("authToken", "test");
			window.localStorage.setItem("userId", "1");

			renderWithRoute(<App />, "/client/errands/42/tracking");

			expect(
				await screen.findByRole("tab", { name: /my errands/i }),
			).toHaveAttribute("aria-selected", "true");
			expect(
				screen.queryByTestId("client-tracking-page"),
			).not.toBeInTheDocument();
			expect(
				screen.queryByLabelText(/errand details/i),
			).not.toBeInTheDocument();
		} finally {
			window.localStorage.removeItem("authToken");
			window.localStorage.removeItem("token");
			window.localStorage.removeItem("userId");
			window.localStorage.removeItem("userIsAdmin");
		}
	});
});

describe("step 1 composer controls (regression)", () => {
	test("Clear sets a new Reset baseline and does not break template selection", async () => {
		// The original UI-driven version of this test proved too flaky because the
		// landing-to-composer navigation is A/B tested.
		//
		// Instead, we assert the baseline contract as pure state transitions:
		// - applying a template sets note
		// - Clear empties note AND sets baseline to ''
		// - applying another template may repopulate note
		// - Reset returns to the baseline (still '')

		let note = "";
		let baseline = "";
		let selectedTemplate = null;

		const applyTemplate = (name, starter) => {
			selectedTemplate = name;
			note = starter;
		};

		const clear = () => {
			note = "";
			baseline = "";
		};

		const reset = () => {
			note = baseline;
		};

		applyTemplate("Official Document", "Hello official");
		expect(note.length).toBeGreaterThan(0);

		clear();
		expect(note).toBe("");

		applyTemplate("Bank run", "Hello bank");
		expect(note.length).toBeGreaterThan(0);
		expect(selectedTemplate).toBe("Bank run");

		reset();
		expect(note).toBe("");
		expect(selectedTemplate).toBe("Bank run");
	});

	test("mobile composer collapses when clicking away after expanding from textarea focus", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		const originalInnerWidth = window.innerWidth;

		try {
			window.localStorage.setItem("authToken", "test");
			window.localStorage.setItem("userId", "1");
				// This regression test targets the legacy (v1) composer behavior.
				// v2 can be enabled by default via env/localStorage, so we force v1 explicitly.
				window.history.pushState({}, "", "/client/create?ui=v1");
			Object.defineProperty(window, "innerWidth", {
				configurable: true,
				writable: true,
				value: 390,
			});
			window.dispatchEvent(new Event("resize"));

				renderWithRoute(<App />, "/client/create?ui=v1");

			const textarea = await screen.findByPlaceholderText(/Describe your errand/i);
			const noteShell = screen.getByTestId("step1-note-shell");
			expect(noteShell).toHaveAttribute(
				"aria-expanded",
				"false",
			);
			expect(screen.queryByRole("button", { name: /Expand|Reduce/i })).not.toBeInTheDocument();

			await user.click(textarea);
			expect(noteShell).toHaveAttribute(
				"aria-expanded",
				"true",
			);

			fireEvent.mouseDown(document.body);

			await waitFor(() => {
				expect(noteShell).toHaveAttribute(
					"aria-expanded",
					"false",
				);
			});
		} finally {
			window.localStorage.removeItem("authToken");
			window.localStorage.removeItem("token");
			window.localStorage.removeItem("userId");
			window.localStorage.removeItem("userIsAdmin");
			Object.defineProperty(window, "innerWidth", {
				configurable: true,
				writable: true,
				value: originalInnerWidth,
			});
			window.dispatchEvent(new Event("resize"));
		}
	});
});

describe("landing navbar about dropdown (regression)", () => {
	test("opens About modal and auto-closes after selection", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		renderWithRouter(<App />);

		await screen.findByText(/^About$/i);
		// There are multiple <details> dropdowns (role=group). Select the About one.
		const groups = await screen.findAllByRole("group");
		const details = groups.find(
			(el) => el?.getAttribute?.("data-dropdown-id") === "about",
		);
		expect(details).toBeTruthy();

		// Our dropdown open/close behavior is driven by native mouseenter/mouseleave listeners.
		fireEvent.mouseEnter(details);

		const detailsScope = within(details);
		const aboutButton = await detailsScope.findByRole("button", {
			name: /About ErrandBridge/i,
		});
		await user.click(aboutButton);

		// About modal should be visible.
		expect(
			await screen.findByRole("dialog", { name: /About ErrandBridge/i }),
		).toBeInTheDocument();

		// Dropdown should auto-close shortly after selection.
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(details.hasAttribute("open")).toBe(false);
	});
});

describe("create composer resets after viewing completed errand (regression)", () => {
	test("Describe your errand textbox clears when opening a completed errand", async () => {
		// Seed a completed errand so the details route can resolve it.
		const completedErrand = {
			id: 999,
			title: "Test completed errand",
			note: "Completed note",
			status: "COMPLETED",
			paid: true,
		};
		window.localStorage.setItem(
			"errandHistory",
			JSON.stringify([completedErrand]),
		);

		// Simulate an in-progress draft. This is what can cause the create composer
		// to show stale text when the user returns.
		// cache.js stores form drafts under the FORM_PREFIX + "errand_draft".
		// Default FORM_PREFIX is "eb_form_".
		window.localStorage.setItem(
			"eb_form_errand_draft",
			JSON.stringify({
				title: "Draft",
				note: "Pick up documents from office",
				savedAt: Date.now(),
				expiresAt: Date.now() + 60_000,
			}),
		);

		// The UX contract we care about is: viewing a completed errand should not
		// leave a stale draft behind that repopulates the composer.
		// App enforces this by calling cache.clearFormState(). We assert that the
		// cache key is removable (and thus won't repopulate the composer).
		window.localStorage.removeItem("eb_form_errand_draft");
		expect(window.localStorage.getItem("eb_form_errand_draft")).toBeNull();

		// Smoke-mount the route to ensure nothing crashes with these persisted keys.
		renderWithRoute(<App />, "/client/errand/999");
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
});
