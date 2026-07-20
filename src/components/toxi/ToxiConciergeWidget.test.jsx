import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ToxiConciergeWidget from "./ToxiConciergeWidget";

jest.mock("../../lib/toxi/messageStream", () => ({
	streamTextChunks: jest.fn(async (fullText, onChunk) => {
		await Promise.resolve();
		onChunk?.(String(fullText || ""));
	}),
}));

const TEST_ASSISTANT_CONFIG = {
	assistantMode: true,
	assistantName: "Toxi",
	initialWelcomeTypingDelayMs: 0,
	initialQuickActionsRevealDelayMs: 0,
};

describe("ToxiConciergeWidget (landing simplified mode)", () => {
	const originalFlag = process.env.REACT_APP_TOXI_OPENAI_ENABLED;
	const originalFetch = global.fetch;

	beforeEach(() => {
		delete global.fetch;
		process.env.REACT_APP_TOXI_OPENAI_ENABLED = "";
	});

	afterEach(() => {
		window.sessionStorage.clear();
		jest.restoreAllMocks();
		if (originalFetch) {
			global.fetch = originalFetch;
		} else {
			delete global.fetch;
		}
		process.env.REACT_APP_TOXI_OPENAI_ENABLED = originalFlag;
	});

	function renderWidget(props = {}) {
		const onClose = jest.fn();
		const onStartSignup = jest.fn();
		const view = render(
			<ToxiConciergeWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={onClose}
				onStartSignup={onStartSignup}
				pageContext={{ surface: "landing_page" }}
				resetKey="/"
				assistantConfig={TEST_ASSISTANT_CONFIG}
				{...props}
			/>,
		);
		return { ...view, onClose, onStartSignup };
	}

	async function waitForInitialWelcome() {
		await waitFor(() => {
			expect(document.body.textContent).toMatch(/Hi 👋 I’m Toxi\./i);
			expect(screen.getByText(/Helpful starters/i)).toBeInTheDocument();
		});
	}

	test("replies naturally to greetings and keeps the simplified landing shell", async () => {
		renderWidget();

		expect(screen.queryByLabelText(/Live summary/i)).not.toBeInTheDocument();
		await waitForInitialWelcome();

		const input = screen.getByPlaceholderText(/tell toxi what you need handled/i);
		fireEvent.change(input, { target: { value: "Hi" } });
		fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

		await waitFor(() => {
			expect(document.body.textContent).toMatch(/Hi - I’m Toxi\./i);
			expect(document.body.textContent).toMatch(/where it should start/i);
		});
	});

	test("routes landing social chat through the public assistant when OpenAI is enabled", async () => {
		process.env.REACT_APP_TOXI_OPENAI_ENABLED = "true";
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				replyText:
					"I’m doing well, thank you 👋 Whenever you’re ready, tell me what you need handled and I’ll help shape the request step by step.",
			}),
		});

		renderWidget();
		await waitForInitialWelcome();

		const input = screen.getByPlaceholderText(/tell toxi what you need handled/i);
		fireEvent.change(input, { target: { value: "How are you today?" } });
		fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/v1/assistant/chat"),
				expect.objectContaining({ method: "POST" }),
			);
			expect(document.body.textContent).toMatch(/I’m doing well, thank you/i);
		});
	});

	test("handles social follow-ups naturally even without the API", async () => {
		renderWidget();
		await waitForInitialWelcome();

		const input = screen.getByPlaceholderText(/tell toxi what you need handled/i);
		fireEvent.change(input, { target: { value: "I was only saying hello for now" } });
		fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

		await waitFor(() => {
			expect(document.body.textContent).toMatch(/That’s perfectly fine/i);
			expect(document.body.textContent).not.toMatch(/Here’s what I have so far/i);
		});
	});

	test("resets draft and messages after closing and reopening", async () => {
		const { rerender, onClose } = renderWidget();
		await waitForInitialWelcome();

		const input = screen.getByPlaceholderText(/tell toxi what you need handled/i);
		fireEvent.change(input, { target: { value: "Hi" } });
		fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));
		await waitFor(() => {
			expect(document.body.textContent).toMatch(/Hi - I’m Toxi\./i);
		});

		rerender(
			<ToxiConciergeWidget
				open={false}
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={onClose}
				onStartSignup={() => {}}
				pageContext={{ surface: "landing_page" }}
				resetKey="/"
					assistantConfig={TEST_ASSISTANT_CONFIG}
			/>,
		);

		rerender(
			<ToxiConciergeWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={onClose}
				onStartSignup={() => {}}
				pageContext={{ surface: "landing_page" }}
				resetKey="/"
					assistantConfig={TEST_ASSISTANT_CONFIG}
			/>,
		);

		expect(screen.queryByText(/Hi - I’m Toxi\./i)).not.toBeInTheDocument();
		await waitFor(() => {
			expect(document.body.textContent).toMatch(/Hi 👋 I’m Toxi\./i);
			expect(document.body.textContent).toMatch(/Tell me what you need handled/i);
			expect(document.body.textContent).toMatch(/help shape the rest with care/i);
		});
		expect(screen.getByPlaceholderText(/tell toxi what you need handled/i)).toHaveValue("");
		expect(screen.getByText(/Helpful starters/i)).toBeInTheDocument();
	});

	test("resets on route key change and preserves signup handoff", async () => {
		const { rerender, onClose, onStartSignup } = renderWidget();
		await waitForInitialWelcome();
		const textboxMatcher = /tell toxi what you need handled/i;

		const sendTurn = async (value) => {
			const input = screen.getByPlaceholderText(textboxMatcher);
			await waitFor(() => expect(input).not.toBeDisabled());
			fireEvent.change(input, { target: { value } });
			fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));
			await waitFor(() => expect(screen.getByPlaceholderText(textboxMatcher)).not.toBeDisabled(), {
				timeout: 4000,
			});
		};

		await sendTurn("I need you to buy groceries.");
		await sendTurn("Tomorrow by 2pm.");
		await sendTurn("From Lekki to Ikeja.");

		const continueButton = await screen.findByRole("button", {
			name: /Continue to signup/i,
		});
		await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 4000 });
		await waitFor(() => {
			expect(document.body.textContent).toMatch(/grocery/i);
			expect(document.body.textContent).toMatch(/lekki/i);
			expect(document.body.textContent).toMatch(/ikeja/i);
		});

		fireEvent.click(continueButton);
		expect(onStartSignup).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);

		rerender(
			<ToxiConciergeWidget
				open
				disabled={false}
				anchorBottomPx={16}
				onOpen={() => {}}
				onClose={onClose}
				onStartSignup={onStartSignup}
				pageContext={{ surface: "landing_page" }}
				resetKey="/support"
					assistantConfig={TEST_ASSISTANT_CONFIG}
			/>,
		);

		expect(screen.queryByText(/Ikeja/i)).not.toBeInTheDocument();
		await waitFor(() => {
			expect(document.body.textContent).toMatch(/Hi 👋 I’m Toxi\./i);
			expect(document.body.textContent).toMatch(/Tell me what you need handled/i);
			expect(document.body.textContent).toMatch(/help shape the rest with care/i);
		});
	});

	test("captures airport pickup requests coherently on landing", async () => {
		renderWidget();
		await waitForInitialWelcome();

		const input = screen.getByPlaceholderText(/tell toxi what you need handled/i);
		fireEvent.change(input, {
			target: {
				value: "I need to collect a friend at the airport in Lagos and drive him to Ibadan on Monday by 5pm",
			},
		});
		fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

		await waitFor(() => {
			expect(document.body.textContent).toMatch(/airport pickup/i);
			expect(document.body.textContent).toMatch(/ibadan/i);
			expect(document.body.textContent).toMatch(/monday by 5pm/i);
			expect(document.body.textContent).toMatch(/carry this into your request/i);
		});
	});
});