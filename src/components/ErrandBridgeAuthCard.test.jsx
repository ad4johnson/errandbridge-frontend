import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import ErrandBridgeAuthCard from "./ErrandBridgeAuthCard";

const buildProps = (overrides = {}) => ({
	mode: "signIn",
	onToggleMode: jest.fn(),
	onBack: jest.fn(),
	backLabel: "Back to home",
	appleEnabled: false,
	googleEnabled: false,
	onApple: jest.fn(),
	onGoogle: jest.fn(),
	googleSlot: null,
	socialBusyProvider: "",
	socialError: "",
	fullName: "",
	onFullNameChange: jest.fn(),
	email: "tester@example.com",
	onEmailChange: jest.fn(),
	password: "password123",
	onPasswordChange: jest.fn(),
	confirmPassword: "",
	onConfirmPasswordChange: jest.fn(),
	onSubmit: jest.fn(),
	onForgotPassword: jest.fn(),
	submitting: false,
	serverError: "",
	serverErrorActionLabel: "",
	onServerErrorAction: jest.fn(),
	...overrides,
});

describe("ErrandBridgeAuthCard", () => {
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

	test("uses a mobile-safe auth shell and keeps the back button non-sticky on small screens", () => {
		const { container } = render(<ErrandBridgeAuthCard {...buildProps()} />);

		expect(container.firstChild).toHaveClass("min-h-[100dvh]");
		expect(container.firstChild).toHaveClass("sm:min-h-screen");
		expect(screen.getByTestId("auth-mobile-header")).toBeInTheDocument();
		expect(screen.getByText(/fast sign in/i)).toBeInTheDocument();

		const backButton = screen.getByRole("button", { name: /back to home/i });
		expect(backButton.parentElement).not.toHaveClass("sticky");
		expect(backButton.parentElement).toHaveClass("sm:sticky");
	});

	test("does not reserve an empty error block above the form when there are no auth errors", () => {
		render(<ErrandBridgeAuthCard {...buildProps()} />);

		expect(screen.queryByTestId("auth-top-errors")).not.toBeInTheDocument();
	});

	test("shows the compact top error block only when auth errors exist", () => {
		render(
			<ErrandBridgeAuthCard
				{...buildProps({ socialError: "Google sign-in failed. Please try again." })}
			/>,
		);

		expect(screen.getByTestId("auth-top-errors")).toBeInTheDocument();
		expect(screen.getByText(/google sign-in failed/i)).toBeInTheDocument();
	});

	test("shows a recovery action for server errors when one is provided", () => {
		const onServerErrorAction = jest.fn();

		render(
			<ErrandBridgeAuthCard
				{...buildProps({
					serverError: "That account is registered as a pilot.",
					serverErrorActionLabel: "Open pilot sign-in",
					onServerErrorAction,
				})}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /open pilot sign-in/i }));

		expect(onServerErrorAction).toHaveBeenCalledTimes(1);
	});

	test("blurs the active input on mobile before submit to reduce keyboard-driven jitter", () => {
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

		render(<ErrandBridgeAuthCard {...buildProps()} />);

		const emailInput = screen.getByLabelText(/email or phone/i);
		const blurSpy = jest.spyOn(emailInput, "blur");
		emailInput.focus();
		expect(document.activeElement).toBe(emailInput);

		fireEvent.pointerDown(screen.getByRole("button", { name: /^sign in$/i }));

		expect(blurSpy).toHaveBeenCalled();
	});

	test("disables mobile auto-capitalization for identifier fields", () => {
		render(<ErrandBridgeAuthCard {...buildProps()} />);

		const identifierInput = screen.getByLabelText(/email or phone/i);

		expect(identifierInput).toHaveAttribute("autocapitalize", "none");
		expect(identifierInput).toHaveAttribute("autocorrect", "off");
		expect(identifierInput).toHaveAttribute("spellcheck", "false");
	});

	test("keeps phone sign-up inputs lowercase-friendly on mobile keyboards", () => {
		render(
			<ErrandBridgeAuthCard {...buildProps({ mode: "signUp", signUpMethod: "phone" })} />,
		);

		const phoneInput = screen.getByLabelText(/phone number/i);

		expect(phoneInput).toHaveAttribute("autocapitalize", "none");
		expect(phoneInput).toHaveAttribute("autocorrect", "off");
		expect(phoneInput).toHaveAttribute("spellcheck", "false");
	});

	test("keeps full name capitalization friendly during sign up", () => {
		render(<ErrandBridgeAuthCard {...buildProps({ mode: "signUp" })} />);

		const fullNameInput = screen.getByLabelText(/full name/i);

		expect(fullNameInput).toHaveAttribute("autocapitalize", "words");
		expect(fullNameInput).toHaveAttribute("autocorrect", "off");
		expect(fullNameInput).toHaveAttribute("spellcheck", "false");
	});
});