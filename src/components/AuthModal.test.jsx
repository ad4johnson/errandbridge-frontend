import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import AuthModal from "./AuthModal";

const buildProps = (overrides = {}) => ({
	open: true,
	inline: true,
	showCloseButton: false,
	onClose: jest.fn(),
	showBack: false,
	onBack: jest.fn(),
	resetPwMode: false,
	setResetPwMode: jest.fn(),
	resetStep: "request",
	setResetStep: jest.fn(),
	resetEmail: "customer@example.com",
	setResetEmail: jest.fn(),
	resetCode: "",
	setResetCode: jest.fn(),
	resetNewPassword: "",
	setResetNewPassword: jest.fn(),
	resetConfirmPassword: "",
	setResetConfirmPassword: jest.fn(),
	showResetNewPassword: false,
	setShowResetNewPassword: jest.fn(),
	showResetConfirmPassword: false,
	setShowResetConfirmPassword: jest.fn(),
	resetError: "",
	resetSuccess: "",
	setResetError: jest.fn(),
	setResetSuccess: jest.fn(),
	authMode: "login",
	setAuthMode: jest.fn(),
	authError: "",
	setAuthError: jest.fn(),
	authErrorAction: "",
	setAuthErrorAction: jest.fn(),
	authFirstName: "Ada",
	setAuthFirstName: jest.fn(),
	authLastName: "Johnson",
	setAuthLastName: jest.fn(),
	authEmail: "customer@example.com",
	setAuthEmail: jest.fn(),
	authPassword: "secret-password",
	setAuthPassword: jest.fn(),
	showPassword: false,
	setShowPassword: jest.fn(),
	authSubmitting: false,
	resetSubmitting: false,
	handleResetSubmit: jest.fn((event) => event.preventDefault()),
	handleAuthSubmit: jest.fn((event) => event.preventDefault()),
	googleAuthEnabled: false,
	googleAuthDisabledReason: "Google sign-in is disabled.",
	googleButtonRef: { current: null },
	googleAuthReady: false,
	googleAuthError: "",
	appleAuthEnabled: false,
	onAppleAuth: jest.fn(),
	oauthAuthBusy: "",
	oauthAuthError: "",
	switchToSignupMode: jest.fn(),
	...overrides,
});

describe("AuthModal", () => {
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

	test("renders premium login hierarchy with a single forgot-password action", () => {
		render(<AuthModal {...buildProps()} />);

		expect(screen.getByRole("heading", { name: /Welcome back/i })).toBeInTheDocument();
		expect(
			screen.getByText(/Sign in to manage errands, tracking, and support/i),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Sign in/i })).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: /Forgot password\?/i })).toHaveLength(1);
		expect(screen.getByText(/Continue with email/i)).toBeInTheDocument();
		expect(screen.queryByText(/Google sign-in is disabled/i)).not.toBeInTheDocument();
	});

	test("renders the signup mode with the cleaned footer CTA", () => {
		render(
			<AuthModal
				{...buildProps({
					authMode: "signup",
				})}
			/>,
		);

		expect(
			screen.getByRole("heading", { name: /Create your account/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Create account/i })).toBeInTheDocument();
		expect(screen.getByText(/Already have an account\?/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Forgot password\?/i })).not.toBeInTheDocument();
	});

	test("uses a viewport-safe overlay and blurs active mobile inputs before submit", () => {
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

		render(<AuthModal {...buildProps({ inline: false })} />);

		const dialog = screen.getByRole("dialog", { name: /welcome back/i });
		expect(dialog.parentElement).toHaveStyle({ height: "100dvh" });
		expect(dialog.parentElement).toHaveStyle({ minHeight: "100vh" });

		const emailInput = screen.getByLabelText(/email/i);
		const blurSpy = jest.spyOn(emailInput, "blur");
		emailInput.focus();

		fireEvent.pointerDown(screen.getByRole("button", { name: /sign in/i }));

		expect(blurSpy).toHaveBeenCalled();
	});
});
