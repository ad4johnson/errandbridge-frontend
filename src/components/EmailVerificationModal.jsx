const EmailVerificationModal = ({
	open,
	pendingEmail,
	title = "Verify Your Email",
	destinationLabel = "We sent a 6-digit confirmation code to:",
	resendLabel = "Didn't receive code? Resend",
	verificationCode,
	onCodeChange,
	onClose,
	onSubmit,
	verificationError,
	verificationLoginPrompt,
	onLoginRetry,
	onResend,
	verificationLinkStatus,
}) => {
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

	return (
		<div
			role="presentation"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				minHeight: "100vh",
				height: "100dvh",
				background: "#0007",
				zIndex: 2001,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding:
					"calc(env(safe-area-inset-top, 0px) + 16px) 20px calc(env(safe-area-inset-bottom, 0px) + 16px)",
				overflowY: "auto",
				overscrollBehavior: "contain",
				WebkitOverflowScrolling: "touch",
			}}
		>
			<button
				type="button"
				aria-label="Close verification modal"
				onClick={onClose}
				style={{
					position: "absolute",
					inset: 0,
					background: "transparent",
					border: "none",
					cursor: "pointer",
				}}
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="email-verification-modal-title"
				style={{
					background: "#fff",
					borderRadius: 16,
					padding: 32,
					width: "100%",
					maxWidth: 450,
					maxHeight:
						"min(720px, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px))",
					boxShadow: "0 4px 24px #0003",
					position: "relative",
					boxSizing: "border-box",
					margin: "auto",
					zIndex: 1,
					overflowY: "auto",
					WebkitOverflowScrolling: "touch",
				}}
			>
				<button
					type="button"
					onClick={onClose}
					style={{
						position: "absolute",
						top: 12,
						right: 16,
						background: "none",
						border: "none",
						fontSize: 22,
						cursor: "pointer",
						color: "#888",
					}}
				>
					&times;
				</button>
				<h3 id="email-verification-modal-title" style={{ fontWeight: 700, fontSize: 22, marginBottom: 12 }}>
					{title}
				</h3>
				<p style={{ color: "#666", marginBottom: 16 }}>
					{destinationLabel}
				</p>
				<p style={{ fontWeight: 600, marginBottom: 16, color: "#333" }}>
					{pendingEmail}
				</p>

				<form onSubmit={onSubmit}>
					<input
						type="text"
						value={verificationCode}
						onChange={(e) => onCodeChange?.(e.target.value)}
						placeholder="000000"
						maxLength="6"
						autoComplete="one-time-code"
						inputMode="numeric"
						style={{
							width: "100%",
							marginBottom: 12,
							padding: 12,
							fontSize: 18,
							borderRadius: 8,
							border: "1.5px solid #bfc2d9",
							textAlign: "center",
							letterSpacing: 4,
							fontWeight: 600,
						}}
						required
					/>
					{verificationError && (
						<p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
							{verificationError}
						</p>
					)}
					{verificationLoginPrompt && (
						<div style={{ marginBottom: 12, textAlign: "center" }}>
							<p style={{ color: "#2563eb", fontSize: 13, marginBottom: 8 }}>
								{verificationLoginPrompt}
							</p>
							<button
								type="button"
								onClick={onLoginRetry}
								style={{
									background: "#eff6ff",
									color: "#2563eb",
									border: "1px solid #bfdbfe",
									borderRadius: 8,
									padding: "8px 14px",
									fontWeight: 600,
									fontSize: 13,
									cursor: "pointer",
								}}
							>
								Tap to log in
							</button>
						</div>
					)}
					<button
						type="submit"
						onPointerDownCapture={blurActiveEditableFieldOnMobile}
						onTouchStartCapture={blurActiveEditableFieldOnMobile}
						style={{
							background: "#2563eb",
							color: "#fff",
							border: "none",
							borderRadius: 8,
							padding: "12px 0",
							fontWeight: 600,
							fontSize: 16,
							width: "100%",
							marginBottom: 8,
							cursor: "pointer",
							transition: "box-shadow 0.2s ease, background 0.2s ease",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.boxShadow =
								"0 2px 8px rgba(37, 99, 235, 0.2)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.boxShadow = "none";
						}}
					>
						Verify Code
					</button>
					<button
						type="button"
						style={{
							color: "#2563eb",
							fontWeight: 600,
							fontSize: 14,
							background: "none",
							border: "none",
							padding: 0,
							cursor: "pointer",
							width: "100%",
							textAlign: "center",
						}}
						onClick={onResend}
					>
						{resendLabel}
					</button>
				</form>
				<p
					style={{
						color: "#999",
						fontSize: 12,
						marginTop: 16,
						textAlign: "center",
					}}
				>
					Code expires in 10 minutes
				</p>
				{verificationLinkStatus && (
					<p
						style={{
							color: "#2563eb",
							fontSize: 12,
							marginTop: 8,
							textAlign: "center",
						}}
					>
						{verificationLinkStatus}
					</p>
				)}
			</div>
		</div>
	);
};

export default EmailVerificationModal;
