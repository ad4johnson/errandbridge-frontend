import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";

import ToxiChatPanel from "./ToxiChatPanel";
import { useUISurfaces } from "../../store/ui-surfaces";

describe("ToxiChatPanel assistant mode", () => {
	let recognitionStartMock;
	let recognitionStopMock;

	beforeEach(() => {
		recognitionStartMock = jest.fn();
		recognitionStopMock = jest.fn();
		Object.defineProperty(window, "speechSynthesis", {
			configurable: true,
			value: {
				speak: jest.fn(),
				cancel: jest.fn(),
			},
		});
		window.SpeechSynthesisUtterance = function MockUtterance(text) {
			this.text = text;
		};
		window.SpeechRecognition = jest.fn().mockImplementation(() => ({
			start: recognitionStartMock,
			stop: recognitionStopMock,
			continuous: false,
			interimResults: false,
			lang: "en-GB",
			onstart: null,
			onend: null,
			onerror: null,
			onresult: null,
		}));
	});

	afterEach(() => {
		jest.restoreAllMocks();
		window.localStorage.clear();
		useUISurfaces.getState().closeAllSurfaces();
	});

	function renderPanel(props = {}) {
		return render(
			<ToxiChatPanel
				open={false}
				disabled={false}
				anchorBottomPx={16}
				title="ErrandBridge Concierge"
				launcherTitle="ErrandBridge Concierge"
				launcherSubtitle="Your concierge in under a minute"
				onOpen={() => {}}
				onClose={() => {}}
				messages={[]}
				input=""
				onInputChange={() => {}}
				onKeyDown={() => {}}
				onSend={() => {}}
				sending={false}
				assistantConfig={{
					assistantMode: true,
					assistantName: "Toxi",
					allowSpeechInput: true,
					allowSpeechOutput: true,
					voiceRepliesEnabled: false,
					showTeaser: true,
					showBackToTop: true,
					surface: "landing_page",
					pageKey: "/",
				}}
				{...props}
			/>,
		);
	}

	test("shows landing teaser when assistant mode is enabled and panel is closed", async () => {
		jest.useFakeTimers();
		renderPanel();

		expect(screen.getByRole("button", { name: /Open Toxi/i })).toBeInTheDocument();
		expect(
			screen.getByLabelText(/Hi, I’m Toxi - need help with an errand request, update, proof, or support\?/i),
		).toHaveTextContent(/^$/);

		act(() => {
			jest.advanceTimersByTime(500);
		});
		expect(
			screen.getByLabelText(/Hi, I’m Toxi - need help with an errand request, update, proof, or support\?/i),
		).toHaveTextContent(/Hi, I’m Toxi/i);

		act(() => {
			jest.advanceTimersByTime(3000);
		});
		expect(
			screen.getByLabelText(/Hi, I’m Toxi - need help with an errand request, update, proof, or support\?/i),
		).toHaveTextContent(/Hi, I’m Toxi - need help with an errand request, update, proof, or support\?/i);
		jest.useRealTimers();
	});

	test("does not restart the landing teaser typing animation before the bubble hides", () => {
		jest.useFakeTimers();
		renderPanel();

			const teaserLabel =
				/Hi, I’m Toxi - need help with an errand request, update, proof, or support\?/i;

		act(() => {
				jest.advanceTimersByTime(500);
			});
			expect(screen.getByLabelText(teaserLabel)).toHaveTextContent(/Hi, I’m Toxi/i);

			act(() => {
				jest.advanceTimersByTime(3000);
		});
			expect(screen.getByLabelText(teaserLabel)).toHaveTextContent(
			/Hi, I’m Toxi - need help with an errand request, update, proof, or support\?/i,
		);

		act(() => {
			jest.advanceTimersByTime(1400);
		});
			expect(screen.getByLabelText(teaserLabel)).toHaveTextContent(
			/Hi, I’m Toxi - need help with an errand request, update, proof, or support\?/i,
		);
		jest.useRealTimers();
	});

	test("uses Toxi as the assistant title in assistant mode", () => {
		renderPanel({ open: true });

		expect(screen.getByRole("dialog", { name: /^Toxi$/i })).toBeInTheDocument();
		expect(screen.getByText(/^Toxi$/i)).toBeInTheDocument();
	});

	test("renders the assistant launcher and header avatar as premium squircles", () => {
		renderPanel({ open: true });

		const launcher = screen.getByTestId("toxi-launcher-assistant");
		expect(launcher.className).toContain("rounded-[26px]");
		expect(launcher.className).not.toContain("rounded-full");

		const portraits = screen.getAllByTestId("toxi-assistant-portrait");
		expect(portraits.length).toBeGreaterThanOrEqual(2);

		const headerAvatar = screen.getByTestId("toxi-header-avatar");
		expect(headerAvatar.className).toContain("rounded-[22px]");
	});

	test("uses the shared right anchor inset for the floating launcher", () => {
		renderPanel({ anchorRightPx: 16 });

		const launcherWrap = screen.getByTestId("toxi-launcher-assistant").parentElement;
		expect(launcherWrap).toHaveStyle({
			right: "calc(16px + env(safe-area-inset-right))",
		});
	});

	test("can pin the floating launcher flush to the bottom corner on landing mobile", () => {
		renderPanel({ anchorBottomPx: 0, anchorIncludeSafeAreaBottom: false });

		const launcherWrap = screen.getByTestId("toxi-launcher-assistant").parentElement;
		expect(launcherWrap).toHaveStyle({
			bottom: "0px",
		});
	});

	test("hides the launcher while mobile cookie consent is active", () => {
		const originalInnerWidth = window.innerWidth;

		try {
			Object.defineProperty(window, "innerWidth", {
				configurable: true,
				value: 390,
			});
			useUISurfaces.setState({
				cookieBannerOpen: true,
				activeModal: null,
				activePanel: null,
			});

			renderPanel();

			expect(
				screen.queryByRole("button", { name: /open toxi/i }),
			).not.toBeInTheDocument();
		} finally {
			Object.defineProperty(window, "innerWidth", {
				configurable: true,
				value: originalInnerWidth,
			});
			useUISurfaces.getState().closeAllSurfaces();
		}
	});

	test("renders voice toggle and speaks latest assistant reply after a user message", async () => {
		const speechSynthesisMock = window.speechSynthesis;
		const { rerender } = renderPanel({
			open: true,
			messages: [
				{ id: "welcome", role: "assistant", text: "Welcome", createdAt: Date.now() },
			],
		});

		const toggle = screen.getByRole("button", { name: /Turn voice replies on/i });
		fireEvent.click(toggle);
		expect(screen.getByRole("button", { name: /Turn voice replies off/i })).toBeInTheDocument();

		rerender(
			<ToxiChatPanel
				open
				disabled={false}
				anchorBottomPx={16}
				title="ErrandBridge Concierge"
				launcherTitle="ErrandBridge Concierge"
				launcherSubtitle="Your concierge in under a minute"
				onOpen={() => {}}
				onClose={() => {}}
				messages={[
					{ id: "welcome", role: "assistant", text: "Welcome", createdAt: Date.now() - 1000 },
					{ id: "user-1", role: "user", text: "Help me track this", createdAt: Date.now() - 500 },
					{ id: "assistant-1", role: "assistant", text: "I can help you track it.", createdAt: Date.now() },
				]}
				input=""
				onInputChange={() => {}}
				onKeyDown={() => {}}
				onSend={() => {}}
				sending={false}
				assistantConfig={{
					assistantMode: true,
					assistantName: "Toxi",
					allowSpeechInput: true,
					allowSpeechOutput: true,
					voiceRepliesEnabled: false,
					showTeaser: true,
					showBackToTop: true,
					surface: "landing_page",
					pageKey: "/",
				}}
			/>,
		);

		expect(speechSynthesisMock.speak).toHaveBeenCalledTimes(1);
	});

	test("renders voice input control and starts browser speech recognition", () => {
		renderPanel({ open: true });

		const voiceButton = screen.getByRole("button", { name: /Start voice input/i });
		fireEvent.click(voiceButton);

		expect(recognitionStartMock).toHaveBeenCalledTimes(1);
	});

	test("shows typing signal while a message is being processed", () => {
		renderPanel({
			open: true,
			sending: true,
			messages: [{ id: "user-1", role: "user", text: "Hello", createdAt: Date.now() }],
		});

		expect(document.querySelectorAll(".bg-slate-500").length).toBeGreaterThan(0);
	});

	test("gives the request builder a taller mobile sheet and minimum chat viewport", () => {
		Object.defineProperty(window, "innerWidth", {
			configurable: true,
			value: 430,
		});

		render(
			<ToxiChatPanel
				open
				disabled={false}
				anchorBottomPx={16}
				title="Toxi"
				subtitle="I’ll keep this request tidy while we talk."
				eyebrowLabel="Request guide"
				onOpen={() => {}}
				onClose={() => {}}
				panelMode="request_builder"
				summarySlot={<div style={{ height: 320 }}>summary</div>}
				messages={[{ id: "welcome", role: "assistant", text: "Let’s shape this request together.", createdAt: Date.now() }]}
				quickActions={[{ id: "timing", label: "Add timing" }]}
				onQuickAction={() => {}}
				input=""
				inputPlaceholder="Tell Toxi what to add or change..."
				onInputChange={() => {}}
				onKeyDown={() => {}}
				onSend={() => {}}
				sending={false}
				ctaLabel="Continue to form →"
				onCta={() => {}}
				secondaryCtaLabel="Edit details manually"
				onSecondaryCta={() => {}}
				ctaHint="Still needed: where it should start"
			/>,
		);

		expect(screen.getByRole("dialog", { name: /^Toxi$/i })).toHaveStyle({
			height: "min(78dvh, 820px)",
			maxHeight: "min(78dvh, 820px)",
		});
		expect(screen.getByTestId("toxi-summary-slot").className).toContain("max-h-[200px]");
		expect(screen.getByTestId("toxi-message-viewport").className).toContain("min-h-[220px]");
	});

	test("shows the back to top affordance once the page is meaningfully scrolled", async () => {
		Object.defineProperty(document.documentElement, "scrollHeight", {
			configurable: true,
			value: 2000,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			configurable: true,
			value: 2000,
		});
		Object.defineProperty(window, "innerHeight", {
			configurable: true,
			value: 600,
		});
		Object.defineProperty(window, "scrollY", {
			configurable: true,
			value: 600,
		});

		renderPanel();
		fireEvent.scroll(window);

		expect(await screen.findByRole("button", { name: /Back to top/i })).toBeInTheDocument();
	});
});