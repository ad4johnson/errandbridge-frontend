export default function AuthModal({
	open,
	inline = false,
	showCloseButton = true,
	onClose,
	showBack = false,
	onBack,
	resetPwMode,
	setResetPwMode,
	resetStep,
	setResetStep,
	resetEmail,
	setResetEmail,
	resetCode,
	setResetCode,
	resetNewPassword,
	setResetNewPassword,
	resetConfirmPassword,
	setResetConfirmPassword,
	showResetNewPassword,
	setShowResetNewPassword,
	showResetConfirmPassword,
	setShowResetConfirmPassword,
	resetError,
	resetSuccess,
	setResetError,
	setResetSuccess,
	authMode,
	setAuthMode,
	authError,
	setAuthError,
	authErrorAction,
	setAuthErrorAction,
	authFirstName,
	setAuthFirstName,
	authLastName,
	setAuthLastName,
	authEmail,
	setAuthEmail,
	authPassword,
	setAuthPassword,
	showPassword,
	setShowPassword,
	authSubmitting,
	resetSubmitting,
	handleResetSubmit,
	handleAuthSubmit,
	googleAuthEnabled,
	googleAuthDisabledReason,
	googleButtonRef,
	googleAuthReady,
	googleAuthError,
	appleAuthEnabled,
	onAppleAuth,
	oauthAuthBusy,
	oauthAuthError,
	switchToSignupMode,
}) {
	if (!open) return null;

	const blurActiveEditableFieldOnMobile = () => {
		if (typeof window === "undefined" || typeof document === "undefined") return;
		const isMobileLike = Boolean(
			window.matchMedia?.("(max-width: 767px)")?.matches ||
				window.matchMedia?.("(pointer: coarse)")?.matches ||
				Number(window.navigator?.maxTouchPoints || 0) > 0,
		);
		if (!isMobileLike) return;

		const activeElement = document.activeElement;
		if (!activeElement || typeof activeElement.blur !== "function") return;
		const tagName = String(activeElement.tagName || "").toLowerCase();
		const inputType = String(activeElement.type || "text").toLowerCase();
		const isEditable =
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
		if (!isEditable) return;
		activeElement.blur();
	};

	const hasSocialOptions = googleAuthEnabled || appleAuthEnabled;
	const title = resetPwMode
		? "Reset your password"
		: authMode === "login"
			? "Welcome back"
			: "Create your account";
	const subtitle = resetPwMode
		? "We’ll email you a secure code so you can choose a new password."
		: authMode === "login"
			? "Sign in to manage errands, tracking, and support."
			: "Get set up in minutes and finish the rest once you’re in.";
	const openResetFlow = () => {
		setResetPwMode(true);
		setResetStep("request");
		setResetEmail(authEmail || "");
		setResetCode("");
		setResetNewPassword("");
		setResetConfirmPassword("");
		setResetError("");
		setResetSuccess("");
	};
	const returnToLogin = () => {
		setAuthMode("login");
		setAuthError("");
		setAuthErrorAction("");
		setResetPwMode(false);
		setResetStep("request");
		setResetCode("");
		setResetNewPassword("");
		setResetConfirmPassword("");
		setResetError("");
		setResetSuccess("");
	};

	const containerStyle = inline
		? {
				width: "100%",
				maxWidth: 500,
				marginLeft: "auto",
				background: "transparent",
			}
		: {
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				minHeight: "100vh",
				height: "100dvh",
				background: "#0007",
				zIndex: 2000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding:
					"calc(env(safe-area-inset-top, 0px) + 16px) 20px calc(env(safe-area-inset-bottom, 0px) + 16px)",
				overflowY: "auto",
				overscrollBehavior: "contain",
				WebkitOverflowScrolling: "touch",
			};

	const cardStyle = {
		background:
			"linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.93) 100%)",
		borderRadius: 28,
		padding: inline ? "36px 32px" : "32px 28px",
		width: "100%",
		maxWidth: 480,
		boxShadow: inline
			? "0 30px 70px rgba(15, 23, 42, 0.16)"
			: "0 20px 50px rgba(15, 23, 42, 0.24)",
		position: "relative",
		boxSizing: "border-box",
		margin: inline ? 0 : "auto",
		zIndex: 1,
		border: "1px solid rgba(148, 163, 184, 0.18)",
		backdropFilter: "blur(18px)",
		maxHeight: inline
			? undefined
			: "min(760px, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px))",
		overflowY: inline ? undefined : "auto",
		WebkitOverflowScrolling: inline ? undefined : "touch",
	};

	const labelStyle = {
		fontSize: 12,
		color: "#475569",
		display: "block",
		marginBottom: 8,
		fontWeight: 700,
		letterSpacing: "0.01em",
	};

	const inputStyle = {
		width: "100%",
		padding: "14px 16px",
		borderRadius: 16,
		border: "1.5px solid rgba(148, 163, 184, 0.45)",
		fontSize: 15,
		lineHeight: 1.4,
		boxSizing: "border-box",
		background: "rgba(248,250,252,0.92)",
		color: "#0f172a",
	};

	const textButtonStyle = {
		color: "#2563eb",
		fontWeight: 700,
		fontSize: 14,
		background: "none",
		border: "none",
		padding: 0,
		cursor: "pointer",
	};

	const primaryButtonStyle = {
		background: authSubmitting ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
		color: "#fff",
		border: "none",
		borderRadius: 18,
		padding: "15px 0",
		fontWeight: 700,
		fontSize: 16,
		width: "100%",
		marginBottom: 8,
		cursor: authSubmitting ? "not-allowed" : "pointer",
		boxShadow: authSubmitting ? "none" : "0 14px 28px rgba(37, 99, 235, 0.18)",
	};

	const passwordToggleStyle = {
		position: "absolute",
		right: 12,
		top: 34,
		background: "rgba(239, 246, 255, 0.95)",
		border: "1px solid rgba(147, 197, 253, 0.9)",
		color: "#1d4ed8",
		fontWeight: 700,
		cursor: "pointer",
		fontSize: 13,
		borderRadius: 999,
		minHeight: 32,
		minWidth: 52,
		padding: "6px 10px",
		lineHeight: 1.1,
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
	};

	return (
		<div style={containerStyle}>
			{!inline && (
				<button
					type="button"
					aria-label="Close authentication"
					onClick={onClose}
					style={{
						position: "absolute",
						inset: 0,
						background: "transparent",
						border: "none",
						cursor: "pointer",
					}}
				/>
			)}
			<div
				style={cardStyle}
				role={inline ? "region" : "dialog"}
				aria-modal={inline ? undefined : true}
				aria-labelledby="auth-modal-title"
			>
				{showBack && (
					<button
						type="button"
						onClick={onBack || onClose}
						style={{
							position: "absolute",
							top: 12,
							left: 16,
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							color: "#1f2937",
							borderRadius: 999,
							padding: "6px 12px",
							fontSize: 12,
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						← Back
					</button>
				)}
				{showCloseButton && (
					<button
						type="button"
						onClick={onClose}
						aria-label="Close authentication"
						style={{
							position: "absolute",
							top: 12,
							right: 16,
							background: "none",
							border: "none",
							fontSize: 22,
							cursor: "pointer",
							color: "#888",
							minWidth: 44,
							minHeight: 44,
						}}
					>
						&times;
					</button>
				)}
				<div style={{ marginBottom: 22 }}>
					<div
						style={{
							fontSize: 12,
							fontWeight: 800,
							letterSpacing: "0.1em",
							textTransform: "uppercase",
							color: "#2563eb",
							marginBottom: 10,
						}}
					>
						Secure customer access
					</div>
					<h2
						id="auth-modal-title"
						style={{
							fontWeight: 800,
							fontSize: 30,
							lineHeight: 1.05,
							letterSpacing: "-0.03em",
							margin: "0 0 10px",
						}}
					>
						{title}
					</h2>
					<p
						style={{
							margin: 0,
							color: "#475569",
							fontSize: 15,
							lineHeight: 1.6,
						}}
					>
						{subtitle}
					</p>
				</div>
				<form onSubmit={resetPwMode ? handleResetSubmit : handleAuthSubmit}>
					{!resetPwMode && (
						<div style={{ marginBottom: 20 }}>
							{appleAuthEnabled && (
								<div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
									{appleAuthEnabled && (
										<button
											type="button"
											onClick={onAppleAuth}
											disabled={oauthAuthBusy && oauthAuthBusy !== "apple"}
											style={{
												width: "100%",
												padding: "13px 0",
												borderRadius: 16,
												border: "1px solid #111827",
												background: "#111827",
												color: "#fff",
												fontWeight: 700,
												cursor: "pointer",
											}}
										>
											{oauthAuthBusy === "apple"
												? "Opening Apple…"
												: "Continue with Apple"}
										</button>
									)}
								</div>
							)}

							{oauthAuthError && (
								<p
									aria-live="polite"
									style={{
										color: "#b91c1c",
										fontSize: 13,
										marginTop: 6,
										marginBottom: 10,
										textAlign: "center",
										padding: "10px 12px",
										borderRadius: 14,
										background: "#fef2f2",
									}}
								>
									{oauthAuthError}
								</p>
							)}

							{googleAuthEnabled && (
								<>
									<div
										ref={googleButtonRef}
										style={{
											display: "flex",
											justifyContent: "center",
											minHeight: 44,
										}}
									/>
									{!googleAuthReady && (
										<button
											type="button"
											disabled
											style={{
												width: "100%",
												marginTop: 8,
												padding: "12px 0",
												borderRadius: 16,
												border: "1px solid #d1d5db",
												background: "#f3f4f6",
												color: "#6b7280",
												fontWeight: 600,
											}}
										>
											Loading Google sign-in...
										</button>
									)}
									{googleAuthError && (
										<p
											aria-live="polite"
											style={{
												color: "#b91c1c",
												fontSize: 13,
												marginTop: 8,
												textAlign: "center",
												padding: "10px 12px",
												borderRadius: 14,
												background: "#fef2f2",
											}}
										>
											{googleAuthError}
										</p>
									)}
									<div
										style={{
											textAlign: "center",
											color: "#475569",
											fontSize: 12,
											marginTop: 14,
											fontWeight: 700,
											letterSpacing: "0.04em",
											textTransform: "uppercase",
										}}
									>
										or continue with email
									</div>
								</>
							)}
							{!hasSocialOptions && (
								<div
									style={{
										fontSize: 12,
										fontWeight: 700,
										letterSpacing: "0.04em",
										textTransform: "uppercase",
										color: "#64748b",
										marginBottom: 8,
									}}
								>
									Continue with email
								</div>
							)}
						</div>
					)}
					{!resetPwMode && authError && (
						<div
							aria-live="assertive"
							style={{
								color: "#b91c1c",
								fontSize: 13,
								marginBottom: 12,
								padding: 10,
								background: "#fee2e2",
								borderRadius: 6,
							}}
						>
							<div
									style={{ marginBottom: authErrorAction === "signup" ? 8 : 0 }}
							>
								{authError}
							</div>
							{authErrorAction === "signup" && (
								<button
									type="button"
									style={{
										color: "#2563eb",
										fontWeight: 600,
										fontSize: 13,
										background: "none",
										border: "none",
										padding: 0,
										cursor: "pointer",
									}}
									onClick={switchToSignupMode}
								>
									Create an account
								</button>
							)}
						</div>
					)}
					{resetPwMode ? (
						<>
							{resetError && (
								<div
									aria-live="assertive"
									style={{
										color: "#dc2626",
										fontSize: 13,
										marginBottom: 12,
										padding: 10,
										background: "#fee2e2",
										borderRadius: 6,
									}}
								>
									{resetError}
								</div>
							)}
							{resetSuccess && (
								<div
									aria-live="polite"
									style={{
										color: "#059669",
										fontSize: 13,
										marginBottom: 12,
										padding: 10,
										background: "#d1fae5",
										borderRadius: 14,
									}}
								>
									{resetSuccess}
								</div>
							)}
							<div style={{ marginBottom: 12 }}>
								<label
									htmlFor="reset-email"
									style={labelStyle}
								>
									Email
								</label>
								<input
									id="reset-email"
									type="email"
									value={resetEmail}
									onChange={(e) => setResetEmail(e.target.value)}
									placeholder="name@example.com"
									style={inputStyle}
									required
									disabled={resetSubmitting}
								/>
							</div>
							{resetStep === "confirm" && (
								<>
									<div style={{ marginBottom: 12 }}>
										<label
											htmlFor="reset-code"
											style={labelStyle}
										>
											Reset Code
										</label>
										<input
											id="reset-code"
											type="text"
											value={resetCode}
											onChange={(e) =>
												setResetCode(
													e.target.value.replace(/\D/g, "").slice(0, 10),
												)
											}
											placeholder="Enter your reset code"
											style={inputStyle}
											required
											disabled={resetSubmitting}
										/>
									</div>
									<div style={{ marginBottom: 12, position: "relative" }}>
										<label
											htmlFor="reset-new-password"
											style={labelStyle}
										>
											New Password
										</label>
										<input
											id="reset-new-password"
											type={showResetNewPassword ? "text" : "password"}
											value={resetNewPassword}
											onChange={(e) => setResetNewPassword(e.target.value)}
											placeholder="Create a new password"
											style={{ ...inputStyle, paddingRight: 76 }}
											required
											disabled={resetSubmitting}
										/>
										<button
											type="button"
											style={passwordToggleStyle}
											onClick={() => setShowResetNewPassword((v) => !v)}
										>
											{showResetNewPassword ? "Hide" : "Show"}
										</button>
									</div>
									<div style={{ marginBottom: 12, position: "relative" }}>
										<label
											htmlFor="reset-confirm-password"
											style={labelStyle}
										>
											Confirm Password
										</label>
										<input
											id="reset-confirm-password"
											type={showResetConfirmPassword ? "text" : "password"}
											value={resetConfirmPassword}
											onChange={(e) => setResetConfirmPassword(e.target.value)}
											placeholder="Re-enter your new password"
											style={{ ...inputStyle, paddingRight: 76 }}
											required
											disabled={resetSubmitting}
										/>
										<button
											type="button"
											style={passwordToggleStyle}
											onClick={() => setShowResetConfirmPassword((v) => !v)}
										>
											{showResetConfirmPassword ? "Hide" : "Show"}
										</button>
									</div>
									<button
										type="button"
										style={{ ...textButtonStyle, fontSize: 13, marginBottom: 8 }}
										onClick={() => {
											setResetStep("request");
											setResetCode("");
											setResetSuccess("");
											setResetError("");
										}}
									>
										Didn't get a code? Resend
									</button>
								</>
							)}
							<button
								type="submit"
								disabled={resetSubmitting}
								onPointerDownCapture={blurActiveEditableFieldOnMobile}
								onTouchStartCapture={blurActiveEditableFieldOnMobile}
								style={{
									background: resetSubmitting ? "#93c5fd" : "#2563eb",
									color: "#fff",
									border: "none",
									borderRadius: 18,
									padding: "15px 0",
									fontWeight: 700,
									fontSize: 16,
									width: "100%",
									marginBottom: 8,
									cursor: resetSubmitting ? "not-allowed" : "pointer",
									boxShadow: resetSubmitting
										? "none"
										: "0 14px 28px rgba(37, 99, 235, 0.18)",
								}}
							>
								{resetSubmitting
									? resetStep === "request"
										? "Sending…"
										: "Resetting…"
									: resetStep === "request"
										? "Send Reset Code"
										: "Reset Password"}
							</button>
						</>
					) : (
						authMode === "signup" &&
						!resetPwMode && (
							<>
								<div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
									<div>
										<label
											htmlFor="auth-first-name"
											style={labelStyle}
										>
											First Name{" "}
											<span style={{ color: "#d32f2f", fontWeight: 700 }}>
												*
											</span>
										</label>
										<input
											id="auth-first-name"
											type="text"
											value={authFirstName}
											onChange={(e) => setAuthFirstName(e.target.value)}
											placeholder="First name"
											style={inputStyle}
											required
											disabled={authSubmitting}
										/>
									</div>
									<div>
										<label
											htmlFor="auth-last-name"
											style={labelStyle}
										>
											Last Name{" "}
											<span style={{ color: "#d32f2f", fontWeight: 700 }}>
												*
											</span>
										</label>
										<input
											id="auth-last-name"
											type="text"
											value={authLastName}
											onChange={(e) => setAuthLastName(e.target.value)}
											placeholder="Last name"
											style={inputStyle}
											required
											disabled={authSubmitting}
										/>
									</div>
								</div>
								<p style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>
									We’ll collect phone and address details after sign-up so this part stays fast and simple.
								</p>
							</>
						)
					)}
					{!resetPwMode && (
						<>
							<div style={{ marginBottom: 8 }}>
								<label
									htmlFor="auth-email"
									style={labelStyle}
								>
									Email{" "}
									<span style={{ color: "#d32f2f", fontWeight: 700 }}>*</span>
								</label>
								<input
									id="auth-email"
									type="email"
									value={authEmail}
									onChange={(e) => setAuthEmail(e.target.value)}
									placeholder="name@example.com"
									style={inputStyle}
									required
									disabled={authSubmitting}
								/>
							</div>
							<div style={{ marginBottom: 12, position: "relative" }}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 12,
										marginBottom: 8,
									}}
								>
									<label htmlFor="auth-password" style={{ ...labelStyle, marginBottom: 0 }}>
										Password{" "}
										<span style={{ color: "#d32f2f", fontWeight: 700 }}>*</span>
									</label>
									{authMode === "login" && (
										<button type="button" style={textButtonStyle} onClick={openResetFlow}>
											Forgot password?
										</button>
									)}
								</div>
								<input
									id="auth-password"
									type={showPassword ? "text" : "password"}
									value={authPassword}
									onChange={(e) => setAuthPassword(e.target.value)}
									placeholder="Enter your password"
									style={{ ...inputStyle, paddingRight: 76 }}
									required
									disabled={authSubmitting}
								/>
								<button
									type="button"
									style={passwordToggleStyle}
									onClick={() => setShowPassword((v) => !v)}
								>
									{showPassword ? "Hide" : "Show"}
								</button>
							</div>
							<button
								type="submit"
								disabled={authSubmitting}
								onPointerDownCapture={blurActiveEditableFieldOnMobile}
								onTouchStartCapture={blurActiveEditableFieldOnMobile}
								style={primaryButtonStyle}
							>
								{authSubmitting
									? authMode === "login"
										? "Logging in…"
										: "Creating account…"
									: authMode === "login"
										? "Sign in"
										: "Create account"}
							</button>
						</>
					)}
				</form>
				<div
					style={{
						textAlign: "center",
						marginTop: 14,
						paddingTop: 18,
						borderTop: "1px solid rgba(226, 232, 240, 0.9)",
						color: "#475569",
						fontSize: 14,
					}}
				>
					{resetPwMode ? (
						<span>
							Remembered your password?{" "}
							<button
								type="button"
								style={textButtonStyle}
								onClick={returnToLogin}
							>
								Back to Login
							</button>
						</span>
					) : authMode === "login" ? (
						<>
							<span>
								Don't have an account?{" "}
								<button
									type="button"
									style={textButtonStyle}
									onClick={switchToSignupMode}
								>
									Sign Up
								</button>
							</span>
						</>
					) : (
						<span>
							Already have an account?{" "}
							<button
								type="button"
								style={textButtonStyle}
								onClick={() => {
									setAuthMode("login");
									setAuthError("");
									setAuthErrorAction("");
								}}
							>
								Login
							</button>
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
