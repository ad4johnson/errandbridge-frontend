import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import EmailVerificationModal from "./EmailVerificationModal";

const buildProps = (overrides = {}) => ({
	open: true,
	pendingEmail: "tester@example.com",
	verificationCode: "",
	onCodeChange: jest.fn(),
	onClose: jest.fn(),
	onSubmit: jest.fn((event) => event.preventDefault()),
	verificationError: "",
	verificationLoginPrompt: "",
	onLoginRetry: jest.fn(),
	onResend: jest.fn(),
	verificationLinkStatus: "",
	...overrides,
});

describe("EmailVerificationModal", () => {
	const originalMatchMedia = window.matchMedia;
	const originalMaxTouchPoints = window.navigator.maxTouchPoints;

	afterEach(() => {
		window.matchMedia = originalMatchMedia;
		Object.defineProperty(window.navigator, "maxTouchPoints", {
			configurable: true,
			value: originalMaxTouchPoints,
		});
		jest.restoreAllMocks();
	});

	test("renders as an accessible viewport-safe dialog", () => {
		render(<EmailVerificationModal {...buildProps()} />);

		const dialog = screen.getByRole("dialog", { name: /verify your email/i });
		expect(dialog.parentElement).toHaveStyle({ height: "100dvh" });
		expect(dialog.parentElement).toHaveStyle({ minHeight: "100vh" });
		expect(screen.getByPlaceholderText("000000")).toHaveAttribute(
			"autocomplete",
			"one-time-code",
		);
	});

	test("blurs the active mobile verification field before submit", () => {
		window.matchMedia = jest.fn().mockImplementation((query) => ({
			matches: query === "(pointer: coarse)",
			media: query,
			onchange: null,
			addListener: jest.fn(),
			removeListener: jest.fn(),
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		}));
		Object.defineProperty(window.navigator, "maxTouchPoints", {
			configurable: true,
			value: 5,
		});

		render(<EmailVerificationModal {...buildProps()} />);

		const codeInput = screen.getByPlaceholderText("000000");
		const blurSpy = jest.spyOn(codeInput, "blur");
		codeInput.focus();

		fireEvent.pointerDown(screen.getByRole("button", { name: /verify code/i }));

		expect(blurSpy).toHaveBeenCalled();
	});
});