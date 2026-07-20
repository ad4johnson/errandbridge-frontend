import React, { useCallback, useMemo, useState } from "react";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail } from "lucide-react";

// `react-icons` icons are typed to return `ReactNode`, which TypeScript 4.9 + React 18.2
// typings won't accept directly as a JSX component. Cast to a component type for SVG props.
const AppleIcon = FaApple as unknown as React.ComponentType<React.ComponentProps<"svg">>;
const GoogleIcon = FcGoogle as unknown as React.ComponentType<React.ComponentProps<"svg">>;

export type AuthMode = "signIn" | "signUp";
export type SignUpMethod = "email" | "phone";

type SocialAuthButtonsProps = {
	appleEnabled: boolean;
	googleEnabled: boolean;
	onApple: () => void;
	onGoogle: () => void;
	googleSlot?: React.ReactNode;
	busyProvider?: "apple" | "google" | "";
	disabled?: boolean;
	dividerLabel?: string;
};

function SocialAuthButtons({
	appleEnabled,
	googleEnabled,
	onApple,
	onGoogle,
	googleSlot,
	busyProvider = "",
	disabled = false,
	dividerLabel = "or continue with your details",
}: SocialAuthButtonsProps) {
	const showDivider = appleEnabled || googleEnabled || Boolean(googleSlot);
	return (
		<div className="space-y-2 sm:space-y-2.5">
			{appleEnabled ? (
				<button
					type="button"
					onClick={onApple}
					disabled={disabled || (!!busyProvider && busyProvider !== "apple")}
					className="flex h-[42px] w-full items-center justify-center gap-3 rounded-[0.95rem] bg-[#0b132b] px-4 text-[0.92rem] font-bold text-white shadow-[0_12px_30px_-18px_rgba(11,19,43,0.8)] transition hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12 sm:rounded-[1.2rem] sm:px-5 sm:text-base"
					aria-label="Continue with Apple"
				>
					<AppleIcon className="text-[1.2rem] sm:text-[1.35rem]" />
					<span>
						{busyProvider === "apple" ? "Connecting to Apple…" : "Continue with Apple"}
					</span>
				</button>
			) : null}

			{googleSlot ? (
				<div className="flex w-full flex-col items-center gap-2">{googleSlot}</div>
			) : googleEnabled ? (
				<button
					type="button"
					onClick={onGoogle}
					disabled={disabled || (!!busyProvider && busyProvider !== "google")}
					className="flex h-[42px] w-full items-center justify-center gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-4 text-[0.92rem] font-bold text-slate-900 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12 sm:rounded-[1.2rem] sm:px-5 sm:text-base"
					aria-label="Continue with Google"
				>
					<GoogleIcon className="text-[1.15rem] sm:text-[1.3rem]" />
					<span>
						{busyProvider === "google" ? "Connecting to Google…" : "Continue with Google"}
					</span>
				</button>
			) : null}

			{showDivider ? (
				<div className="flex items-center gap-3 py-1 sm:py-1.5">
					<div className="h-px flex-1 bg-slate-200" />
					<span className="text-[0.72rem] font-semibold text-slate-500 sm:text-xs">
						{dividerLabel}
					</span>
					<div className="h-px flex-1 bg-slate-200" />
				</div>
			) : null}
		</div>
	);
}

type AuthFieldProps = {
	label: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
	type?: "text" | "email" | "password" | "tel";
	rightSlot?: React.ReactNode;
	icon: React.ReactNode;
	autoComplete?: "name" | "email" | "tel" | "current-password" | "new-password";
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	autoCorrect?: "on" | "off";
	spellCheck?: boolean;
};

function AuthField({
	label,
	placeholder,
	value,
	onChange,
	type = "text",
	rightSlot,
	icon,
	autoComplete,
	autoCapitalize,
	autoCorrect,
	spellCheck,
}: AuthFieldProps) {
	const commonInputProps = {
		type,
		value,
		onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
			onChange(event.target.value),
		placeholder,
		autoCapitalize,
		autoCorrect,
		spellCheck,
		className:
			"h-full min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-base font-medium text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:outline-none focus:ring-0",
	} as const;

	let input: React.ReactNode;
	if (!autoComplete) {
		input = <input {...commonInputProps} />;
	} else if (autoComplete === "email") {
		input = <input {...commonInputProps} autoComplete="email" inputMode="email" />;
	} else if (autoComplete === "name") {
		input = <input {...commonInputProps} autoComplete="name" />;
	} else if (autoComplete === "current-password") {
		input = <input {...commonInputProps} autoComplete="current-password" />;
	} else if (autoComplete === "new-password") {
		input = <input {...commonInputProps} autoComplete="new-password" />;
	} else {
		input = <input {...commonInputProps} />;
	}

	return (
		<label className="block">
			<div className="mb-1.5 flex items-center justify-between gap-3 text-[0.92rem] font-extrabold text-slate-700 sm:mb-2 sm:text-sm">
				<span>{label}</span>
				{rightSlot}
			</div>
			<div className="flex h-14 min-w-0 items-center rounded-[1rem] border-2 border-slate-200 bg-white px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition focus-within:border-blue-300 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.08)] sm:h-16 sm:rounded-[1.4rem] sm:px-5">
				<div className="mr-3 text-slate-400 sm:mr-4">{icon}</div>
				{input}
			</div>
		</label>
	);
}

function validateEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
	const digits = String(phone || "").replace(/\D/g, "");
	return digits.length >= 7;
}

function validateIdentifier(identifier: string, mode: AuthMode, signUpMethod: SignUpMethod): boolean {
	if (mode === "signUp") {
		return signUpMethod === "phone" ? validatePhone(identifier) : validateEmail(identifier);
	}
	return validateEmail(identifier) || validatePhone(identifier);
}

function getPasswordError(
	password: string,
	confirmPassword: string,
	mode: AuthMode,
): string | null {
	if (!password.trim()) {
		return "Password is required.";
	}

	if (mode === "signUp" && password.length < 8) {
		return "Password must be at least 8 characters.";
	}

	if (mode === "signUp" && password !== confirmPassword) {
		return "Passwords do not match.";
	}

	return null;
}

type InlineErrorSlotProps = {
	message?: string | null;
	className?: string;
};

function InlineErrorSlot({
	message,
	className = "text-sm font-medium text-red-600",
}: InlineErrorSlotProps) {
	if (!message) return null;

	return <p className={className} aria-live="polite">{message}</p>;
}

function blurActiveEditableFieldOnMobile() {
	if (typeof window === "undefined" || typeof document === "undefined") return;

	const isMobileLike = Boolean(
		window.matchMedia?.("(max-width: 767px)")?.matches ||
			window.matchMedia?.("(pointer: coarse)")?.matches ||
			Number(window.navigator?.maxTouchPoints || 0) > 0,
	);
	if (!isMobileLike) return;

	const activeElement = document.activeElement as
		| (HTMLElement & { type?: string; isContentEditable?: boolean })
		| null;
	if (!activeElement || typeof activeElement.blur !== "function") return;

	const tagName = String(activeElement.tagName || "").toLowerCase();
	const inputType = String(activeElement.type || "text").toLowerCase();
	const isEditableInput =
		tagName === "textarea" ||
		(tagName === "input" &&
			![
				"button",
				"checkbox",
				"color",
				"file",
				"hidden",
				"image",
				"radio",
				"range",
				"reset",
				"submit",
			].includes(inputType)) ||
		Boolean(activeElement.isContentEditable);

	if (!isEditableInput) return;
	activeElement.blur();
}

function AuthRouteMapBackground(): JSX.Element {
	return (
		<div className="eb-auth-route-map" aria-hidden="true">
			<svg
				className="eb-auth-route-map__svg"
				viewBox="0 0 1000 1200"
				focusable="false"
				role="img"
			>
				<defs>
					<filter id="ebAuthRouteGlow" x="-40%" y="-40%" width="180%" height="180%">
						<feGaussianBlur stdDeviation="6" result="blur" />
						<feMerge>
							<feMergeNode in="blur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>

				<g className="eb-auth-map-grid">
					<path d="M-80 880 L126 770 L310 812 L512 700 L728 758 L1080 612" />
					<path d="M-60 742 L192 628 L392 676 L610 548 L816 594 L1080 476" />
					<path d="M44 1046 L250 892 L448 934 L654 808 L864 856 L1050 752" />
					<path d="M88 496 L266 598 L470 492 L678 540 L914 414" />
					<path d="M190 1180 L258 1016 L332 828 L410 652 L484 382" />
					<path d="M430 1200 L498 1016 L580 824 L660 624 L752 338" />
					<path d="M708 1200 L772 1018 L854 834 L952 620 L1068 366" />
					<path d="M-30 594 L190 642 L352 566 L530 606 L706 528 L970 596" />
					<path d="M230 308 L418 392 L618 326 L842 392 L1088 270" />
					<path d="M-40 1010 L136 928 L292 970 L466 876 L632 928" />
					<path d="M562 238 L678 296 L824 236 L1002 296" />
				</g>

				<g className="eb-auth-route-lines" filter="url(#ebAuthRouteGlow)">
					<path
						id="ebAuthPrimaryRoute"
						d="M72 930 L258 842 L422 872 L608 768 L780 814"
						pathLength="1"
					/>
					<path
						id="ebAuthSecondaryRoute"
						d="M324 1032 L474 936 L618 958 L780 814"
						pathLength="1"
					/>
					<path
						id="ebAuthTopRoute"
						d="M838 610 L808 704 L780 814"
						pathLength="1"
					/>
				</g>

				<g className="eb-auth-route-pulses">
					<circle r="7">
						<animateMotion dur="7.8s" repeatCount="indefinite" rotate="auto">
							<mpath href="#ebAuthPrimaryRoute" />
						</animateMotion>
					</circle>
					<circle r="5">
						<animateMotion dur="6.6s" begin="1.4s" repeatCount="indefinite" rotate="auto">
							<mpath href="#ebAuthSecondaryRoute" />
						</animateMotion>
					</circle>
					<circle r="5">
						<animateMotion dur="7.2s" begin="2.2s" repeatCount="indefinite" rotate="auto">
							<mpath href="#ebAuthTopRoute" />
						</animateMotion>
					</circle>
				</g>

				<g className="eb-auth-pin" transform="translate(780 814)">
					<circle className="eb-auth-pin__halo" r="46" />
					<circle className="eb-auth-pin__ring" r="24" />
					<path
						className="eb-auth-pin__marker"
						d="M0 -58 C-27 -58 -48 -37 -48 -10 C-48 25 -13 56 0 72 C13 56 48 25 48 -10 C48 -37 27 -58 0 -58 Z"
					/>
					<circle className="eb-auth-pin__core" r="14" />
				</g>
			</svg>
		</div>
	);
}

export type ErrandBridgeAuthCardProps = {
	mode: AuthMode;
	onToggleMode: () => void;
	onBack?: () => void;
	backLabel?: string;

	appleEnabled: boolean;
	googleEnabled: boolean;
	onApple: () => void;
	onGoogle: () => void;
	googleSlot?: React.ReactNode;
	socialBusyProvider?: "apple" | "google" | "";
	socialError?: string;

	fullName: string;
	onFullNameChange: (value: string) => void;
	email: string;
	onEmailChange: (value: string) => void;
	signUpMethod?: SignUpMethod;
	onSignUpMethodChange?: (value: SignUpMethod) => void;
	identifierLabel?: string;
	identifierPlaceholder?: string;
	identifierType?: "text" | "email" | "tel";
	password: string;
	onPasswordChange: (value: string) => void;
	confirmPassword: string;
	onConfirmPasswordChange: (value: string) => void;

	onSubmit: () => void;
	onForgotPassword?: () => void;
	submitting?: boolean;
	serverError?: string;
	serverErrorActionLabel?: string;
	onServerErrorAction?: () => void;
};

export default function ErrandBridgeAuthCard({
	mode,
	onToggleMode,
	onBack,
	backLabel = "Back",
	appleEnabled,
	googleEnabled,
	onApple,
	onGoogle,
	googleSlot,
	socialBusyProvider = "",
	socialError = "",
	fullName,
	onFullNameChange,
	email,
	onEmailChange,
	signUpMethod = "email",
	onSignUpMethodChange,
	identifierLabel,
	identifierPlaceholder,
	identifierType,
	password,
	onPasswordChange,
	confirmPassword,
	onConfirmPasswordChange,
	onSubmit,
	onForgotPassword,
	submitting = false,
	serverError = "",
	serverErrorActionLabel = "",
	onServerErrorAction,
}: ErrandBridgeAuthCardProps): JSX.Element {
	const [showPassword, setShowPassword] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const publicBase = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
	// Use the exact imported full logo where there is enough room to show the wordmark.
	const logoSrc = `${publicBase}/logo-full.png`;
	const isSignInMode = mode === "signIn";
	const hasTopErrors = Boolean(socialError || serverError);

	const content = useMemo(() => {
		if (mode === "signUp") {
			return {
				eyebrow: "SECURE CUSTOMER ACCESS",
				title: "Create your account",
				subtitle:
					"Create your account to book errands, track progress, and manage support.",
				formTitle: "Create account",
				formSubtitle:
					"Use Apple, Google, email, or phone to get started.",
				buttonLabel: "Create account",
				switchText: "Already have an account?",
				switchAction: "Sign in",
				trustPoints: [
					"Book errands quickly",
					"Track progress with proof",
				],
			};
		}

		return {
			eyebrow: "SECURE CUSTOMER ACCESS",
			title: "Welcome back",
			subtitle: "Sign in to manage errands, tracking, and support.",
			formTitle: "Sign in",
			formSubtitle:
				"Choose Apple, Google, or continue with your details.",
			buttonLabel: "Sign in",
			switchText: "Don't have an account?",
			switchAction: "Sign Up",
			trustPoints: [
				"Track active errands easily",
				"Review proof in one place",
			],
		};
	}, [mode]);

	const resolvedIdentifierLabel = identifierLabel || (mode === "signIn"
		? "Email or phone *"
		: signUpMethod === "phone"
			? "Phone number *"
			: "Email *");
	const resolvedIdentifierPlaceholder = identifierPlaceholder || (mode === "signIn"
		? "you@example.com or +1 555 555 5555"
		: signUpMethod === "phone"
			? "+1 555 555 5555"
			: "name@example.com");
	const resolvedIdentifierType = identifierType || (mode === "signUp" && signUpMethod === "phone" ? "tel" : "text");

	const emailError = submitted && !validateIdentifier(email, mode, signUpMethod)
		? mode === "signIn"
			? "Please enter a valid email address or phone number."
			: signUpMethod === "phone"
				? "Please enter a valid phone number."
				: "Please enter a valid email address."
		: null;
	const passwordError = submitted ? getPasswordError(password, confirmPassword, mode) : null;
	const nameError =
		submitted && mode === "signUp" && !fullName.trim()
			? "Full name is required."
			: null;

	const handleSubmit = () => {
		setSubmitted(true);

		const hasNameError = mode === "signUp" && !fullName.trim();
		const hasEmailError = !validateIdentifier(email, mode, signUpMethod);
		const hasPasswordError = Boolean(getPasswordError(password, confirmPassword, mode));

		if (hasNameError || hasEmailError || hasPasswordError) return;
		onSubmit();
	};

	const handleToggleMode = () => {
		setSubmitted(false);
		onConfirmPasswordChange("");
		onToggleMode();
	};

	const handleSubmitPressStart = useCallback(() => {
		blurActiveEditableFieldOnMobile();
	}, []);

	return (
		<div className="eb-auth-screen min-h-[100dvh] px-3.5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+0.8rem)] sm:min-h-screen sm:px-6 sm:py-6 lg:px-8">
			<AuthRouteMapBackground />
			<div className="eb-auth-card-shell relative z-10 mx-auto min-w-0 max-w-[1040px]">
				{onBack ? (
					<div className="mb-3 sm:sticky sm:top-[calc(env(safe-area-inset-top)+0.75rem)] sm:z-30 sm:mb-4">
						<button
							type="button"
							onClick={onBack}
							className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[0.92rem] font-bold text-white shadow-[0_12px_28px_-20px_rgba(8,20,44,0.9)] backdrop-blur transition hover:bg-white/16 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:px-4 sm:text-sm"
							aria-label={backLabel}
						>
							<ArrowLeft className="h-4 w-4" />
							<span>{backLabel}</span>
						</button>
					</div>
				) : null}
				<div className="eb-auth-card-frame w-full min-w-0 overflow-hidden rounded-[1.55rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(241,245,249,0.9))] p-3.5 shadow-[0_35px_90px_-35px_rgba(15,23,42,0.35)] backdrop-blur sm:rounded-[2.1rem] sm:p-5 lg:p-6">
					<div className="grid min-w-0 gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
						<div className="hidden lg:flex lg:flex-col lg:justify-between rounded-[1.7rem] border border-slate-200/50 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.34),transparent_24%),linear-gradient(180deg,#eef4ff_0%,#dde7fb_38%,#dbe4f4_100%)] p-5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
							<div>
								<div className="flex flex-col gap-3">
									<div className="inline-flex items-center gap-3 rounded-[1.4rem] border border-white/80 bg-white/88 px-5 py-3.5 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.35)] backdrop-blur">
										<img
											src={logoSrc}
											alt="ErrandBridge"
											className="h-16 w-auto max-w-[230px] object-contain object-left"
											loading="lazy"
											decoding="async"
										/>
									</div>
									<div className="inline-flex items-center justify-center self-start rounded-full border border-blue-100 bg-white/65 px-4 py-2 text-[0.78rem] font-black tracking-[0.16em] text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
										{content.eyebrow}
									</div>
								</div>

								<h1 className="mt-6 max-w-md text-[2.15rem] font-black leading-[0.98] tracking-[-0.04em] text-slate-950 xl:text-[3.25rem]">
									{content.title}
								</h1>
								<p className="mt-3 max-w-md text-[0.98rem] leading-7 text-slate-600">
									{content.subtitle}
								</p>

								<div className="mt-5 grid gap-3 xl:grid-cols-2">
									{content.trustPoints.map((point) => (
										<div
											key={point}
											className="rounded-[1.1rem] border border-white/75 bg-white/78 px-4 py-3 text-sm font-bold leading-6 text-slate-700 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.45)]"
										>
											{point}
										</div>
									))}
								</div>
							</div>

							<div className="mt-5 rounded-[1.45rem] border border-white/80 bg-white/82 p-4 shadow-[0_20px_42px_-30px_rgba(15,23,42,0.3)] backdrop-blur">
								<div className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
									Trusted access flow
								</div>
								<div className="mt-4 grid grid-cols-3 gap-3">
									{[
										{
											key: "apple",
											icon: (
												<AppleIcon
													className="text-[1.55rem] text-slate-950"
													aria-hidden="true"
												/>
										),
										lines: ["Apple", "sign in"],
									},
									{
										key: "google",
										icon: <GoogleIcon className="h-7 w-7" aria-hidden="true" />,
										lines: ["Google", "sign in"],
									},
									{
										key: "email",
										icon: <Mail className="h-6 w-6 text-slate-700" aria-hidden="true" />,
										lines: ["Email", "fallback"],
									},
								].map((item) => (
										<div
											key={item.key}
											className="group flex flex-col items-center justify-center gap-3 rounded-[1.2rem] border border-slate-200 bg-white/78 px-3 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
										>
											<span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:ring-slate-300">
												{item.icon}
											</span>
											<span className="text-[0.95rem] font-extrabold leading-5 text-slate-800">
												<span className="block">{item.lines[0]}</span>
												<span className="block">{item.lines[1]}</span>
											</span>
										</div>
									))}
								</div>
								<p className="mt-4 text-sm leading-6 text-slate-500">
									Social sign-in first, then email as backup.
								</p>
							</div>
						</div>

						<div className="eb-auth-form-panel order-1 min-w-0 rounded-[1.5rem] border border-white/80 bg-white p-4 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.38)] sm:rounded-[1.9rem] sm:p-6 lg:order-2 lg:p-6">
							<div className="mb-3.5 lg:hidden" data-testid="auth-mobile-header">
								<div className="flex items-center justify-between gap-2">
									<div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[0.6rem] font-black tracking-[0.14em] text-blue-700">
										{content.eyebrow}
									</div>
									{isSignInMode ? (
										<div className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-bold text-slate-600">
											Fast sign in
										</div>
									) : null}
								</div>
								<div className="mt-2.5 flex items-center gap-3">
									<div className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
										<img
											src={logoSrc}
											alt="ErrandBridge"
											className="h-14 w-auto max-w-[210px] object-contain object-left"
											loading="lazy"
											decoding="async"
										/>
									</div>
								</div>
								<h1 className="mt-3 text-[1.62rem] font-black leading-[1.04] tracking-tight text-slate-950 sm:text-[2.05rem]">
									{content.title}
								</h1>
								<p className="mt-1.5 text-[0.88rem] leading-5 text-slate-600 sm:text-[0.95rem] sm:leading-6">
									{content.subtitle}
								</p>
							</div>

							<div className="mb-4 hidden lg:block">
								<div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.18em] text-slate-500">
									Customer access
								</div>
								<h2 className="mt-3 text-[1.8rem] font-black leading-tight tracking-[-0.03em] text-slate-950">
									{content.formTitle}
								</h2>
								<p className="mt-2 max-w-md text-[0.95rem] leading-7 text-slate-600">
									{content.formSubtitle}
								</p>
							</div>

							<SocialAuthButtons
								appleEnabled={appleEnabled}
								googleEnabled={googleEnabled}
								onApple={onApple}
								onGoogle={onGoogle}
								googleSlot={googleSlot}
								busyProvider={socialBusyProvider}
								disabled={submitting}
								dividerLabel="or continue with your details"
							/>

							{hasTopErrors ? (
								<div className="mt-3 space-y-2" aria-live="polite" data-testid="auth-top-errors">
									{socialError ? (
										<p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
											{socialError}
										</p>
									) : null}

									{serverError ? (
										<div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
											<p>{serverError}</p>
											{serverErrorActionLabel && onServerErrorAction ? (
												<button
													type="button"
													onClick={onServerErrorAction}
													className="mt-2 inline-flex appearance-none items-center gap-2 border-0 bg-transparent p-0 text-left text-sm font-extrabold text-blue-700 transition hover:text-blue-800"
												>
													<span>{serverErrorActionLabel}</span>
													<ArrowRight className="h-4 w-4" />
												</button>
											) : null}
										</div>
									) : null}
								</div>
							) : null}

							<div className="mt-3.5 space-y-3 sm:mt-5 sm:space-y-4">
								{mode === "signUp" ? (
									<>
										{onSignUpMethodChange ? (
											<div className="grid grid-cols-2 gap-2 rounded-[1rem] bg-slate-100 p-1">
												<button
													type="button"
													onClick={() => onSignUpMethodChange("email")}
													className={`rounded-[0.8rem] px-3 py-2 text-sm font-extrabold transition ${signUpMethod === "email" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
												>
													Use email
												</button>
												<button
													type="button"
													onClick={() => onSignUpMethodChange("phone")}
													className={`rounded-[0.8rem] px-3 py-2 text-sm font-extrabold transition ${signUpMethod === "phone" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
												>
													Use phone
												</button>
											</div>
										) : null}
										<AuthField
											label="Full name *"
											placeholder="Full legal name"
											value={fullName}
											onChange={onFullNameChange}
											autoComplete="name"
											autoCapitalize="words"
											autoCorrect="off"
											spellCheck={false}
											icon={<ArrowRight className="h-5 w-5 rotate-[-45deg]" />}
										/>
										<InlineErrorSlot message={nameError} />
									</>
								) : null}

								<AuthField
										label={resolvedIdentifierLabel}
										placeholder={resolvedIdentifierPlaceholder}
										type={resolvedIdentifierType}
									value={email}
									onChange={onEmailChange}
										autoComplete={mode === "signUp" && signUpMethod === "phone" ? "tel" : "email"}
										autoCapitalize="none"
										autoCorrect="off"
										spellCheck={false}
									icon={<Mail className="h-5 w-5" />}
								/>

								<InlineErrorSlot message={emailError} />

								<AuthField
									label="Password *"
									placeholder={mode === "signIn" ? "Enter your password" : "Create a strong password"}
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={onPasswordChange}
									autoComplete={mode === "signIn" ? "current-password" : "new-password"}
									autoCapitalize="none"
									autoCorrect="off"
									spellCheck={false}
									rightSlot={
											<div className="flex items-center gap-3">
												<button
													type="button"
													onClick={() => setShowPassword((prev) => !prev)}
													className="appearance-none border-0 bg-transparent p-0 text-[0.76rem] font-extrabold text-blue-600 transition hover:text-blue-700 sm:text-xs"
												>
													{showPassword ? "Hide" : "Show"}
												</button>
												{mode === "signIn" && onForgotPassword ? (
													<button
														type="button"
														onClick={onForgotPassword}
														className="appearance-none border-0 bg-transparent p-0 text-[0.76rem] font-extrabold text-blue-600 transition hover:text-blue-700 sm:text-xs"
													>
														Forgot password?
													</button>
												) : null}
											</div>
									}
									icon={<LockKeyhole className="h-5 w-5" />}
								/>

								{mode === "signUp" ? (
									<AuthField
										label="Confirm password *"
										placeholder="Re-enter your password"
										type={showPassword ? "text" : "password"}
										value={confirmPassword}
										onChange={onConfirmPasswordChange}
										autoComplete="new-password"
										autoCapitalize="none"
										autoCorrect="off"
										spellCheck={false}
											rightSlot={
												<button
													type="button"
													onClick={() => setShowPassword((prev) => !prev)}
													className="appearance-none border-0 bg-transparent p-0 text-[0.76rem] font-extrabold text-blue-600 transition hover:text-blue-700 sm:text-xs"
												>
													{showPassword ? "Hide" : "Show"}
												</button>
											}
										icon={<LockKeyhole className="h-5 w-5" />}
									/>
								) : null}

									<InlineErrorSlot message={passwordError} />
							</div>

							<button
								type="button"
								onClick={handleSubmit}
								disabled={submitting}
								onPointerDownCapture={handleSubmitPressStart}
								onTouchStartCapture={handleSubmitPressStart}
								className="mt-4 flex h-12 w-full items-center justify-center rounded-[1rem] bg-[linear-gradient(180deg,#3567eb_0%,#2554d9_100%)] text-base font-black text-white shadow-[0_18px_44px_-20px_rgba(37,84,217,0.75)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-22px_rgba(37,84,217,0.82)] disabled:cursor-not-allowed disabled:opacity-70 sm:mt-5 sm:h-14 sm:rounded-[1.4rem] sm:text-lg"
							>
								{content.buttonLabel}
							</button>

							<div className="mt-5 border-t border-slate-200 pt-4 text-center sm:mt-7 sm:pt-6">
								<span className="text-[0.95rem] text-slate-600 sm:text-base">{content.switchText} </span>
								<button
									type="button"
									onClick={handleToggleMode}
									disabled={submitting}
									className="appearance-none border-0 bg-transparent p-0 text-[0.95rem] font-black text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
								>
									{content.switchAction}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
