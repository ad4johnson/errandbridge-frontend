import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { createConciergeSession } from "../../toxi/conciergeEngine.ts";
import { handleHybridToxiMessage } from "../../lib/toxi/toxiHybridController";
import * as messageStreamModule from "../../lib/toxi/messageStream";
import ToxiClientWidget from "./ToxiClientWidget";

jest.mock("../../lib/toxi/toxiHybridController", () => ({
	handleHybridToxiMessage: jest.fn(),
}));

describe("ToxiClientWidget (intent routing)", () => {
	beforeEach(() => {
		jest.useRealTimers();
		jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
			const url = typeof input === "string" ? input : input?.url || "";
			const method = (init?.method || "GET").toUpperCase();

			if (url.includes("/api/v1/tracking/status/16") && method === "GET") {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						errAndId: 16,
						status: "assigned",
						tracking_allowed: false,
						tracking_active: false,
						reason: "Tracking becomes available once the pilot starts the errand.",
					}),
				};
			}

			if (url.includes("/api/v1/support/chat")) {
				throw new Error(
					"Support chat should not be called for a track intent in this test",
				);
			}

			return {
				ok: true,
				status: 200,
				json: async () => ({}),
			};
		});
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	test("status + EB reference uses tracking status endpoint (no intake prompts)", async () => {
		render(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={() => {}}
				mode="client_support"
				pageContext={{ surface: "client_dashboard" }}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onOpenPricing={() => {}}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
			/>
		);

		const input = screen.getByPlaceholderText(
			/ask about status, proof, updates/i,
		);
		fireEvent.change(input, {
			target: { value: "What's the status of my ref EB-16-6704?" },
		});
		expect(input).toHaveValue("What's the status of my ref EB-16-6704?");
		fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

		await waitFor(
			() => {
				expect(document.body.textContent).toMatch(
					/Here[’']s the latest for EB-16-6704: assigned/i,
				);
			},
			{ timeout: 8000 },
		);
		expect(
			screen.queryByText(/pickup and ending location/i),
		).not.toBeInTheDocument();
	});

	test("rerender with new pageContext identity does not reset messages", async () => {
		const onOpenPricing = jest.fn();
		const { rerender } = render(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={() => {}}
				mode="client_support"
				pageContext={{
					surface: "client_dashboard",
					activeErrand: { id: 16, referenceNumber: "EB-16-6704" },
				}}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onOpenPricing={onOpenPricing}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
			/>
		);

		const input = screen.getByPlaceholderText(
			/ask about status, proof, updates/i,
		);
		fireEvent.change(input, { target: { value: "pricing" } });
		fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

		expect(
			await screen.findByText(/Opening pricing/i, {}, { timeout: 8000 }),
		).toBeInTheDocument();
		expect(onOpenPricing).toHaveBeenCalledTimes(1);

		// New object identity (as happens when parent rerenders with inline literals).
		rerender(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={() => {}}
				mode="client_support"
				pageContext={{
					surface: "client_dashboard",
					activeErrand: { id: 16, referenceNumber: "EB-16-6704" },
				}}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onOpenPricing={onOpenPricing}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
			/>
		);

		// Regression: previously this disappeared (reset to welcome).
		expect(screen.getByText(/Opening pricing/i)).toBeInTheDocument();
	});

	test("client dashboard mode uses Toxi identity and shows a focused errand snapshot", () => {
		render(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={() => {}}
				mode="client_support"
				pageContext={{
					surface: "client_errand_detail",
					activeErrand: {
						id: 16,
						referenceNumber: "EB-16-6704",
						title: "Passport pickup",
						status: "in_progress",
						pickupLocation: "Ikeja",
						dropoffLocation: "Lekki",
					},
				}}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onOpenPricing={() => {}}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
				assistantConfig={{
					assistantMode: true,
					assistantName: "Toxi",
					allowSpeechInput: true,
					allowSpeechOutput: true,
					voiceRepliesEnabled: false,
					showTeaser: false,
					showBackToTop: false,
					surface: "client_errand_detail",
					pageKey: "/client/errands/16",
				}}
			/>,
		);

		expect(screen.getByRole("dialog", { name: /^Toxi$/i })).toBeInTheDocument();
		expect(screen.getByText(/Gentle help for this errand/i)).toBeInTheDocument();
		expect(screen.getByText(/Errand snapshot/i)).toBeInTheDocument();
		expect(screen.getByText(/^Reference$/i)).toBeInTheDocument();
		expect(screen.getByText(/^EB-16-6704$/i)).toBeInTheDocument();
		expect(screen.getByText(/^Status$/i)).toBeInTheDocument();
		expect(screen.getByText(/^in progress$/i)).toBeInTheDocument();
	});

	test("request builder shows request snapshot and simplified CTA hierarchy", () => {
		const onClose = jest.fn();
		const onRequestBuilderPatch = jest.fn();
		render(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={onClose}
				mode="request_builder"
				pageContext={{
					surface: "create_flow",
					draft: {
						template: "Courier",
						pickup: "Lekki Phase 1",
						dropoff: "Yaba",
						pickupTimeSlotDate: "2026-04-17",
						pickupTimeSlotStart: "17:00",
					},
				}}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onRequestBuilderPatch={onRequestBuilderPatch}
				onOpenPricing={() => {}}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
			/>
		);

		expect(screen.getByText(/Request snapshot/i)).toBeInTheDocument();
		expect(screen.getByText(/^Task$/i)).toBeInTheDocument();
		expect(screen.getByText(/^Courier$/i)).toBeInTheDocument();
		expect(screen.getByText(/^Starting point$/i)).toBeInTheDocument();
		expect(screen.getByText(/Lekki Phase 1/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Update timing/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Change starting point/i })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Change ending location/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Check price/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Edit details manually/i })).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Continue to form/i }));
		expect(onRequestBuilderPatch).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: "overwrite",
				patch: expect.objectContaining({
					template: "Courier",
					pickup: "Lekki Phase 1",
					dropoff: "Yaba",
					pickupTimeSlotDate: "2026-04-17",
					pickupTimeSlotStart: "17:00",
					note: expect.stringContaining("Timing:"),
				}),
			}),
		);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("button", { name: /Open pricing/i })).not.toBeInTheDocument();
	});

	test("client v2 assist enabled shows helpful prompt shortcuts + guided create-flow summary", () => {
		render(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={() => {}}
				mode="request_builder"
				pageContext={{
					surface: "create_flow",
					assistEnabled: true,
					assistContext: {
						source: "client_v2",
						currentStepLabel: "Choose service",
						validationHint: "Select a service",
						categoryTitle: "Errands",
						categoryTemplateCount: 5,
						missingRequired: ["Select a service"],
						progress: 10,
					},
					draft: { note: "", pickup: "" },
				}}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onRequestBuilderPatch={() => {}}
				onOpenPricing={() => {}}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
			/>
		);

		expect(screen.getByText(/Create flow/i)).toBeInTheDocument();
		expect(screen.getByText(/^Guided$/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Choose service/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Jump to review/i }),
		).toBeInTheDocument();
	});

	test("client v2 assist disabled hides shortcuts but shows passive create-flow state", () => {
		render(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={() => {}}
				mode="request_builder"
				pageContext={{
					surface: "create_flow",
					assistEnabled: false,
					assistContext: {
						source: "client_v2",
						currentStepLabel: "Choose service",
						validationHint: "Select a service",
						categoryTitle: "Errands",
						categoryTemplateCount: 5,
						missingRequired: ["Select a service"],
						progress: 10,
					},
					draft: { note: "", pickup: "" },
				}}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onRequestBuilderPatch={() => {}}
				onOpenPricing={() => {}}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
			/>
		);

		expect(screen.getByText(/Create flow/i)).toBeInTheDocument();
		expect(screen.getByText(/^Passive$/i)).toBeInTheDocument();
		expect(screen.queryByText(/Helpful prompts/i)).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Choose service/i }),
		).not.toBeInTheDocument();
	});

	test("new chat replays the support welcome through streamed typing", async () => {
		const streamSpy = jest.spyOn(messageStreamModule, "streamTextChunks");

		render(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={() => {}}
				mode="client_support"
				pageContext={{
					surface: "client_dashboard",
					activeErrand: { id: 16, referenceNumber: "EB-16-6704" },
				}}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onOpenPricing={() => {}}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText(/Hi - I’m Toxi\./i)).toBeInTheDocument();
		});

		streamSpy.mockClear();

		fireEvent.change(
			screen.getByPlaceholderText(/ask about status, proof, updates/i),
			{ target: { value: "pricing" } },
		);
		const sendButton = screen.getByRole("button", { name: /^Send$/i });
		await waitFor(
			() => {
				expect(sendButton).not.toBeDisabled();
			},
			{ timeout: 8000 },
		);
		fireEvent.click(sendButton);

		await waitFor(
			() => {
				expect(screen.getByText(/Opening pricing/i)).toBeInTheDocument();
			},
			{ timeout: 8000 },
		);

		fireEvent.click(screen.getByRole("button", { name: /New chat/i }));

		await waitFor(
			() => {
				expect(streamSpy).toHaveBeenCalled();
				expect(
					streamSpy.mock.calls.some(([text]) => /Hi - I’m Toxi\./i.test(String(text || ""))),
				).toBe(true);
			},
			{ timeout: 8000 },
		);

		await waitFor(
			() => {
				expect(screen.getByText(/Hi - I’m Toxi\./i)).toBeInTheDocument();
			},
			{ timeout: 8000 },
		);
		expect(screen.queryByText(/Opening pricing/i)).not.toBeInTheDocument();

		streamSpy.mockRestore();
	});

	test("prioritizes the pending-review lifecycle welcome over generic support copy", async () => {
		render(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={() => {}}
				mode="client_support"
				pageContext={{
					surface: "client_dashboard",
					lifecycle: {
						isLoggedIn: true,
						hasPendingReview: true,
						hasSubmittedAnyReview: false,
						hasReferralShareAvailable: false,
						isReturningClient: true,
					},
				}}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onOpenPricing={() => {}}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
			/>,
		);

		await waitFor(() => {
			expect(
				screen.getByText(/please don’t forget to review/i),
			).toBeInTheDocument();
		});
		expect(
			screen.queryByText(/welcome back/i),
		).not.toBeInTheDocument();
	});

	test("request builder auto-fills blank draft fields without showing apply controls", async () => {
		const onRequestBuilderPatch = jest.fn();
		const nextSession = createConciergeSession({
			serviceType: { value: "Courier", confidence: "high", source: "user" },
			pickupLocation: { value: "Lekki Phase 1", confidence: "high", source: "user" },
			dropoffLocation: { value: "Yaba", confidence: "high", source: "assistant" },
			deadline: { value: "Tomorrow at 2pm", confidence: "medium", source: "assistant" },
		});

		handleHybridToxiMessage.mockResolvedValue({
			nextSession,
			turn: { assistantText: "I’ve added the missing details I could confirm." },
			payload: { text: "I’ve added the missing details I could confirm." },
		});

		render(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={() => {}}
				mode="request_builder"
				pageContext={{
					surface: "create_flow",
					draft: {
						template: "Courier",
						pickup: "Lekki Phase 1",
					},
				}}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onRequestBuilderPatch={onRequestBuilderPatch}
				onOpenPricing={() => {}}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
			/>
		);

		fireEvent.change(screen.getByPlaceholderText(/Tell Toxi what to add or change/i), {
			target: { value: "Please add the ending location and timing" },
		});
		fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

		await waitFor(
			() => {
				expect(document.body.textContent).toMatch(
					/I[’']ve added the missing details I could confirm/i,
				);
			},
			{ timeout: 8000 },
		);
		await waitFor(
			() => {
			expect(onRequestBuilderPatch).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: "fill_blanks",
					patch: expect.objectContaining({
						template: "Courier",
						pickup: "Lekki Phase 1",
						dropoff: "Yaba",
					}),
				}),
			);
			},
			{ timeout: 8000 },
		);
		expect(screen.queryByRole("button", { name: /Apply \(fill blanks\)/i })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Apply \(overwrite\)/i })).not.toBeInTheDocument();
	});

	test("request builder ignores UI label phrases when building a patch", async () => {
		const onRequestBuilderPatch = jest.fn();
		const nextSession = createConciergeSession({
			serviceType: { value: "grocery shopping + delivery", confidence: "high", source: "user" },
			pickupLocation: { value: "Ikeja", confidence: "high", source: "user" },
			dropoffLocation: { value: "change the starting point", confidence: "medium", source: "assistant" },
		});

		handleHybridToxiMessage.mockResolvedValue({
			nextSession,
			turn: { assistantText: "I’ve captured the request so far." },
			payload: { text: "I’ve captured the request so far." },
		});

		render(
			<ToxiClientWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={() => {}}
				mode="request_builder"
				pageContext={{
					surface: "create_flow",
					draft: {
						template: "Courier",
						pickup: "Ikeja",
					},
				}}
				apiBaseUrl="http://example.test"
				getAuthToken={() => "test-token"}
				onRequestBuilderPatch={onRequestBuilderPatch}
				onOpenPricing={() => {}}
				onOpenSupport={() => {}}
				onPreviewFileUrl={() => {}}
				onRequestHumanAgent={() => {}}
			/>,
		);

		fireEvent.change(screen.getByPlaceholderText(/Tell Toxi what to add or change/i), {
			target: { value: "Please update the request" },
		});
		fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

		await waitFor(
			() => {
			expect(onRequestBuilderPatch).toHaveBeenCalledWith(
				expect.objectContaining({
					patch: expect.objectContaining({
						pickup: "Ikeja",
						dropoff: "",
					}),
				}),
			);
			},
			{ timeout: 8000 },
		);
	});
});
