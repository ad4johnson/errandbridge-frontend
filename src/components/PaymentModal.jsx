import { useEffect, useRef } from "react";
import { acquireBodyScrollLock } from "../utils/scrollLock";

const PaymentModal = ({
	open,
	onClose,
	paymentReady,
	paymentRequired,
	paymentAmountLabel,
	paymentOriginalAmountLabel,
	subscriptionLabel,
	isSubscriptionMode,
	sensitivityTierLabel,
	pricingRegionLabel,
	paymentMode,
	onPaymentModeChange,
	paymentStatus,
	paymentError,
	paymentNotice,
	onClearPaymentNotice,
	paymentVerifying,
	submissionPending,
	title,
	reviewItems = [],
	reviewDefaultOpen = false,
	onStartCheckout,
	showPaymentSubmitDetails,
	onTogglePaymentSubmitDetails,
	agreed,
	onAgreeChange,
	onShowPolicyModal,
	showPolicyDetails,
	onTogglePolicyDetails,
	onSubmitErrand,
	promoCode,
	onPromoCodeChange,
	promoStatusTone,
	promoStatusMessage,
	allowTestingModesOverride,
	variant = "modal",
}) => {
	const isInline = variant === "inline";
	const sheetRef = useRef(null);
	const bodyRef = useRef(null);

	useEffect(() => {
		if (isInline || !open) return undefined;
		const release = acquireBodyScrollLock();
		return () => {
			release?.();
		};
	}, [isInline, open]);

	useEffect(() => {
		if (isInline || !open) return;

		// iOS/WKWebView can sometimes "helpfully" scroll a newly-opened modal
		// based on the previously focused element (e.g., the button that opened it).
		// We want checkout to consistently open at the top so users see the full
		// summary before paying.
		try {
			const active = typeof document !== "undefined" ? document.activeElement : null;
			active?.blur?.();
		} catch {
			// ignore
		}

		const resetScroll = () => {
			const node = bodyRef.current;
			if (!node) return;
			try {
				node.scrollTo({ top: 0, left: 0, behavior: "auto" });
			} catch {
				node.scrollTop = 0;
			}
		};

		// Focus the sheet for accessibility, but avoid triggering scroll.
		try {
			sheetRef.current?.focus?.({ preventScroll: true });
		} catch {
			try {
				sheetRef.current?.focus?.();
			} catch {
				// ignore
			}
		}

		resetScroll();
		if (typeof requestAnimationFrame === "function") {
			requestAnimationFrame(resetScroll);
		}
		const t = setTimeout(resetScroll, 60);
		return () => clearTimeout(t);
	}, [isInline, open]);

	if (!open && !isInline) return null;

	const hasReviewItems = Array.isArray(reviewItems) && reviewItems.length > 0;

	const allowTestingModes = (() => {
		if (allowTestingModesOverride === true) return true;
		if (allowTestingModesOverride === false) return false;
		if (process.env.REACT_APP_ALLOW_TEST_PAYMENTS === "true") return true;
		if (process.env.NODE_ENV !== "production") return true;
		if (typeof window === "undefined") return false;
		const host = String(window.location.hostname || "").toLowerCase();
		if (["localhost", "127.0.0.1"].includes(host)) return true;
		if (host.endsWith(".local")) return true;
		if (/^10\./.test(host)) return true;
		if (/^192\.168\./.test(host)) return true;
		if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
		return false;
	})();

	// Apple/production reviewers may need a way to submit without payment.
	// This flag enables the Free Pass (test-pass) option on production for everyone.
	// NOTE: It does NOT enable the $1 test charge option.
	const allowFreePassOnProd =
		process.env.REACT_APP_ALLOW_FREE_PASS_ON_PROD === "true";
	const allowFreePass = allowTestingModes || allowFreePassOnProd;

	const paymentsConfigured = Boolean(
		window?.__EB_PAYMENTS_CONFIGURED__ ?? true,
	);
	const subscriptionConfigured = Boolean(
		window?.__EB_SUBSCRIPTION_CONFIGURED__ ?? true,
	);
	const stripeBlockedMessage = window?.__EB_PAYMENTS_BLOCKED_MESSAGE__ || "";

	const planHint =
		paymentMode === "subscription"
			? `Plus (${subscriptionLabel})`
			: paymentMode === "test-charge"
				? "$1 test charge"
				: paymentMode === "test-pass"
					? allowFreePassOnProd
						? "Free Pass"
						: "Test Submission Mode"
					: "Standard pricing";

	const plusPolicySummary = `Billed monthly via Stripe (${subscriptionLabel}). Cancel anytime; cancellation takes effect at the end of the current paid period.`;

	const stripeDisabled =
		paymentMode === "standard" ||
		paymentMode === "subscription" ||
		paymentMode === "test-charge";
	const shouldDisableStripeModes = !paymentsConfigured;

	const secondaryPillStyle = {
		background: "#e0f2fe",
		border: "1px solid #bfdbfe",
		color: "#1d4ed8",
		borderRadius: 999,
		padding: "6px 10px",
		fontWeight: 700,
		fontSize: 12,
		cursor: "pointer",
		display: "inline-flex",
		alignItems: "center",
		gap: 6,
	};

	const primaryPillStyle = {
		borderRadius: 999,
		padding: "10px 16px",
		fontWeight: 700,
		cursor: "pointer",
	};

	const needsPolicyAgreement = !agreed;
	const titleTrimmed = String(title || "").trim();

	const checkoutDisabled =
		paymentStatus === "pending" ||
		paymentVerifying ||
		submissionPending ||
		!titleTrimmed ||
		(shouldDisableStripeModes && stripeDisabled);

	const submitDisabled =
		!titleTrimmed ||
		!agreed ||
		submissionPending ||
		(paymentRequired && !paymentReady);

	const sheet = (
		<div
			role={isInline ? "region" : "document"}
			aria-label={isInline ? "Checkout" : undefined}
			className={`eb-sheet eb-payment-sheet${isInline ? " eb-payment-sheet--inline" : ""}`}
			ref={sheetRef}
			tabIndex={isInline ? undefined : -1}
			onClick={(event) => {
				if (!isInline) event.stopPropagation();
			}}
			onKeyDown={(event) => {
				if (!isInline) event.stopPropagation();
			}}
		>
			<div className="eb-sheet-header">
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						gap: 12,
					}}
				>
					<div>
						<div
							id="payment-modal-title"
							style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}
						>
							{isInline ? "Checkout" : "Pay securely"}
						</div>
						<div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>
							{isInline
								? "Review the total, apply a promo code, then pay and submit."
								: "Secure checkout with Stripe. You’ll review the total before confirming."}
						</div>
					</div>
					{!isInline && (
						<button
							type="button"
							onClick={() => onClose?.()}
							style={{
								...secondaryPillStyle,
								background: "#e2e8f0",
								border: "1px solid #e2e8f0",
								color: "#1f2937",
							}}
						>
							Close
						</button>
					)}
				</div>
			</div>

			<div className="eb-sheet-body" ref={bodyRef}>
				<div className="eb-payment-summary">
					<div className="eb-payment-summary-header">
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
								flexWrap: "wrap",
							}}
						>
							<div style={{ fontWeight: 900, color: "#0f172a" }}>
								Due today
							</div>
							<div
								style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}
							>
								{paymentRequired
									? isSubscriptionMode
										? subscriptionLabel
										: paymentOriginalAmountLabel &&
											paymentOriginalAmountLabel !== paymentAmountLabel
										? (
											<span
												style={{
													display: "inline-flex",
													alignItems: "baseline",
													gap: 8,
													flexWrap: "wrap",
												}}
											>
												<span
													style={{
														textDecoration: "line-through",
														color: "rgba(15, 23, 42, 0.45)",
														fontWeight: 800,
														fontSize: 13,
													}}
												>
													{paymentOriginalAmountLabel}
												</span>
												<span>{paymentAmountLabel}</span>
											</span>
										)
										: paymentAmountLabel
									: "$0"}
							</div>
						</div>

						{paymentReady ? (
							<span className="eb-payment-pill eb-payment-pill--ok">
								Ready to pay
							</span>
						) : (
							<span className="eb-payment-pill eb-payment-pill--warn">
								Almost done
							</span>
						)}
					</div>

					<div className="eb-payment-summary-meta">
						<div>
							<span style={{ fontWeight: 800 }}>Pricing tier:</span>{" "}
							{sensitivityTierLabel}
						</div>
						<div>
							<span style={{ fontWeight: 800 }}>Region:</span>{" "}
							{pricingRegionLabel}
						</div>
					</div>

					<div className="eb-payment-summary-note">
						🔒 Stripe Checkout (card, Apple Pay, Google Pay). Encrypted and
						secure.
					</div>
				</div>

				{hasReviewItems && (
					<details
						className="eb-collapsible"
						open={reviewDefaultOpen}
						style={{ marginTop: 10 }}
					>
						<summary className="eb-collapsible-summary">
							<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
								<span aria-hidden="true">🧾</span>
								<span>Review your errand</span>
							</span>
							<span className="eb-collapsible-hint">Tap to review</span>
						</summary>
						<div className="eb-collapsible-body">
							<div
								style={{
									background:
										"linear-gradient(135deg, rgba(34, 197, 94, 0.06), rgba(59, 130, 246, 0.04))",
									border: "1px solid rgba(15, 23, 42, 0.10)",
									borderRadius: 16,
									padding: 14,
									boxShadow: "0 18px 40px rgba(15, 23, 42, 0.05)",
								}}
							>
								<div style={{ display: "grid", gap: 10 }}>
									{reviewItems.map((item) => (
										<div
											key={item?.key || item?.label}
											style={{
												display: "grid",
												gridTemplateColumns: "140px 1fr",
												gap: 10,
												alignItems: "start",
												padding: "10px 12px",
												borderRadius: 12,
												background: "rgba(255,255,255,0.7)",
											}}
										>
											<div style={{ fontWeight: 800, color: "#334155", fontSize: 12 }}>
												{item?.label}
											</div>
											<div
												style={{
													color: "#0f172a",
													fontSize: 13,
													lineHeight: 1.5,
													wordBreak: "break-word",
													whiteSpace: "pre-line",
												}}
											>
												{item?.value}
											</div>
										</div>
									))}
								</div>
								<div
									style={{
										marginTop: 10,
										fontSize: 12,
										color: "rgba(15, 23, 42, 0.65)",
										lineHeight: 1.5,
									}}
								>
									Need to change something? Close checkout and edit the form - your
									payment won’t start until you confirm in Stripe.
								</div>
							</div>
						</div>
					</details>
				)}

				<details className="eb-collapsible" style={{ marginTop: 10 }}>
					<summary className="eb-collapsible-summary">
						<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
							<span aria-hidden="true">🏷️</span>
							<span>Promo code</span>
						</span>
						<span className="eb-collapsible-hint">Optional</span>
					</summary>
					<div className="eb-collapsible-body">
						<div
							className="review-pop-card"
							style={{
								padding: 12,
								background: "#fff",
								border: "1px solid #e2e8f0",
								borderRadius: 12,
							}}
						>
							<div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
								Codes are validated now and again at checkout; some are tied to your account.
							</div>
							<input
								type="text"
								value={promoCode || ""}
								onChange={(event) => onPromoCodeChange?.(event.target.value)}
								placeholder="e.g. EB-10-ABCD"
								autoCapitalize="characters"
								autoComplete="off"
								spellCheck={false}
								style={{
									width: "100%",
									marginTop: 10,
									padding: "10px 12px",
									borderRadius: 10,
									border: "1px solid #cbd5e1",
									fontSize: 14,
									textTransform: "uppercase",
									boxSizing: "border-box",
								}}
							/>
							{promoStatusMessage ? (
								<div
									style={{
										marginTop: 8,
										fontSize: 12,
										lineHeight: 1.5,
										borderRadius: 10,
										padding: "8px 10px",
										border:
											promoStatusTone === "error"
												? "1px solid #fed7aa"
												: promoStatusTone === "ok"
													? "1px solid rgba(34, 197, 94, 0.35)"
													: "1px solid #e2e8f0",
										background:
											promoStatusTone === "error"
												? "#fff7ed"
												: promoStatusTone === "ok"
													? "rgba(34, 197, 94, 0.08)"
													: "#f8fafc",
										color:
											promoStatusTone === "error"
												? "#7c2d12"
												: promoStatusTone === "ok"
													? "#065f46"
													: "#64748b",
									}}
								>
									{promoStatusMessage}
								</div>
							) : null}
						</div>
					</div>
				</details>

				<details className="eb-collapsible" style={{ marginTop: 10 }}>
					<summary className="eb-collapsible-summary">
						<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
							<span aria-hidden="true">💳</span>
							<span>Plan</span>
						</span>
						<span className="eb-collapsible-hint">{planHint}</span>
					</summary>
					<div className="eb-collapsible-body">
						<div className="eb-payment-options-block" style={{ marginTop: 0, marginLeft: 14, marginRight: 14 }}>
							<label className="eb-payment-option">
								<input
									type="radio"
									name="payment-mode"
									checked={paymentMode === "standard"}
									onChange={() => onPaymentModeChange?.("standard")}
									disabled={shouldDisableStripeModes}
								/>
								<span style={{ opacity: shouldDisableStripeModes ? 0.6 : 1 }}>
									<span className="eb-payment-option-title">Standard pricing</span>
									<span className="eb-payment-option-subtitle">
										Region-based one-time payment
									</span>
								</span>
							</label>

							<details
								className="eb-collapsible"
								open={paymentMode === "subscription"}
								style={{ marginTop: 10 }}
							>
								<summary className="eb-collapsible-summary">
									<span style={{ fontWeight: 900, color: "#0f172a" }}>
										Optional: ErrandBridge Plus
									</span>
									<span className="eb-collapsible-hint">
										Subscription ({subscriptionLabel})
									</span>
								</summary>
								<div className="eb-collapsible-body">
									<div style={{ margin: "0 14px" }}>
										<label className="eb-payment-option" style={{ marginTop: 0 }}>
											<input
												type="radio"
												name="payment-mode"
												checked={paymentMode === "subscription"}
												onChange={() => onPaymentModeChange?.("subscription")}
												disabled={shouldDisableStripeModes || !subscriptionConfigured}
											/>
											<span
												style={{
													opacity:
														shouldDisableStripeModes || !subscriptionConfigured
															? 0.6
															: 1,
												}}
											>
												<span className="eb-payment-option-title">ErrandBridge Plus</span>
												<span className="eb-payment-option-subtitle">
													Includes subscription perks and streamlined repeat requests.
												</span>
												<div
													style={{
														marginTop: 8,
														fontSize: 12,
														color: "#475569",
														lineHeight: 1.6,
														display: "grid",
														gap: 8,
													}}
												>
													<div>{plusPolicySummary}</div>
													<div>
														<button
															type="button"
															onClick={() => onShowPolicyModal?.()}
															style={{
																...secondaryPillStyle,
																background: "#eff6ff",
																borderColor: "#bfdbfe",
																padding: "4px 10px",
																fontSize: 12,
															}}
														>
															View Plus subscription policy
														</button>
													</div>
												</div>
											</span>
										</label>

										{!subscriptionConfigured && (
											<div
												style={{
													marginTop: 8,
													fontSize: 12,
													color: "#7c2d12",
													background: "#fff7ed",
													border: "1px solid #fed7aa",
													padding: "8px 10px",
													borderRadius: 10,
												}}
											>
												Plus is temporarily unavailable in this environment.
											</div>
										)}
									</div>
								</div>
							</details>

							{allowFreePass && (
								<details style={{ marginTop: 10 }}>
									<summary
										style={{
											...secondaryPillStyle,
											width: "fit-content",
											background: "#f8fafc",
											border: "1px solid #e2e8f0",
											color: "#334155",
											padding: "6px 12px",
											fontSize: 12,
										}}
									>
										{allowFreePassOnProd && !allowTestingModes
											? "Free Pass"
											: "Testing options"}
									</summary>
									<div style={{ marginTop: 10, display: "grid", gap: 10 }}>
										{allowTestingModes && (
											<label className="eb-payment-option">
												<input
													type="radio"
													name="payment-mode"
													checked={paymentMode === "test-charge"}
													onChange={() => onPaymentModeChange?.("test-charge")}
													disabled={shouldDisableStripeModes}
												/>
												<span style={{ opacity: shouldDisableStripeModes ? 0.6 : 1 }}>
													<span className="eb-payment-option-title">$1 test charge</span>
													<span className="eb-payment-option-subtitle">
														Sandbox checkout for testing
													</span>
												</span>
											</label>
										)}

										<label className="eb-payment-option">
											<input
												type="radio"
												name="payment-mode"
												checked={paymentMode === "test-pass"}
												onChange={() => onPaymentModeChange?.("test-pass")}
											/>
											<span>
												<span className="eb-payment-option-title">
													{allowFreePassOnProd ? "Free Pass" : "Test Submission Mode"}
												</span>
												<span className="eb-payment-option-subtitle">
													{allowFreePassOnProd
														? "Submit without payment (review mode)"
														: "Submit without payment (local testing)"}
												</span>
											</span>
										</label>
									</div>
								</details>
							)}
						</div>
					</div>
				</details>

				{paymentStatus === "pending" && (
					<div style={{ marginTop: 10, fontSize: 12, color: "#b45309" }}>
						Redirecting to Stripe Checkout…
					</div>
				)}
				{paymentStatus === "verifying" && (
					<div style={{ marginTop: 10, fontSize: 12, color: "#b45309" }}>
						Verifying payment…
					</div>
				)}
				{paymentNotice && (
					<div
						style={{
							marginTop: 10,
							fontSize: 12,
							color: "#7c2d12",
							background: "#fff7ed",
							border: "1px solid #fed7aa",
							padding: "8px 10px",
							borderRadius: 10,
							display: "flex",
							alignItems: "flex-start",
							justifyContent: "space-between",
							gap: 10,
						}}
					>
						<div style={{ lineHeight: 1.5 }}>{paymentNotice}</div>
						{onClearPaymentNotice ? (
							<button
								type="button"
								onClick={() => onClearPaymentNotice?.()}
								style={{
									border: "none",
									background: "transparent",
									color: "#9a3412",
									fontWeight: 900,
									cursor: "pointer",
									lineHeight: 1,
									padding: 0,
								}}
								aria-label="Dismiss notice"
							>
								×
							</button>
						) : null}
					</div>
				)}
				{/* Payment/submit errors are rendered in the footer so they remain visible
				    even when the sheet body is scrolled (common on mobile). */}
				{shouldDisableStripeModes && stripeBlockedMessage && (
					<div
						style={{
							marginTop: 10,
							fontSize: 12,
							color: "#7c2d12",
							background: "#fff7ed",
							border: "1px solid #fed7aa",
							padding: "8px 10px",
							borderRadius: 10,
						}}
					>
						{stripeBlockedMessage}
					</div>
				)}

				{/* Keep a single dominant CTA in the footer to avoid competing actions. */}

				<button
					type="button"
					onClick={() => onTogglePaymentSubmitDetails?.()}
					style={{
						marginTop: 12,
						...secondaryPillStyle,
						background: showPaymentSubmitDetails
							? "#eff6ff"
							: secondaryPillStyle.background,
						fontSize: 12,
					}}
				>
					<span aria-hidden="true">
						{showPaymentSubmitDetails ? "▾" : "▸"}
					</span>
					{showPaymentSubmitDetails ? "Hide details" : "Details"}
				</button>

				{showPaymentSubmitDetails && (
					<div style={{ display: "grid", gap: 12, marginTop: 12 }}>
						<div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
							💳 No hidden fees. You’ll see the full cost before submitting.
						</div>

						<button
							type="button"
							onClick={() => onTogglePolicyDetails?.()}
							style={{
								...secondaryPillStyle,
								background: showPolicyDetails
									? "#eff6ff"
									: secondaryPillStyle.background,
								fontSize: 12,
							}}
						>
							<span aria-hidden="true">{showPolicyDetails ? "▾" : "▸"}</span>
							{showPolicyDetails
								? "Hide policy details"
								: "View policy details"}
						</button>

						{showPolicyDetails && (
							<div
								className="review-pop-card"
								style={{
									background: "#f8fafc",
									border: "1px solid #e2e8f0",
									padding: 10,
									borderRadius: 12,
								}}
							>
								<div style={{ fontWeight: 900, fontSize: 12, color: "#0f172a" }}>
									Policy details
								</div>
								<div
									style={{
										marginTop: 6,
										fontSize: 12,
										color: "#475569",
										lineHeight: 1.6,
									}}
								>
									Keep proof minimal and relevant to the errand. Attachments are
									private, access-restricted, and removed after completion.
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			<div className="eb-sheet-footer">
				{paymentError ? (
					<div
						role="alert"
						style={{
							marginBottom: 10,
							fontSize: 12,
							lineHeight: 1.45,
							color: "#991b1b",
							background: "#fef2f2",
							border: "1px solid #fecaca",
							padding: "10px 12px",
							borderRadius: 12,
							whiteSpace: "pre-line",
						}}
					>
						{paymentError}
					</div>
				) : null}
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						gap: 10,
						marginBottom: 10,
						padding: 10,
						borderRadius: 14,
						border: "1px solid rgba(226, 232, 240, 0.95)",
						background: "#f8fafc",
					}}
				>
					<input
						type="checkbox"
						checked={agreed}
						onChange={(event) => onAgreeChange?.(event.target.checked)}
						style={{ width: 20, height: 20, marginTop: 2 }}
					/>
					<div style={{ fontSize: 13, lineHeight: 1.4, color: "#0f172a" }}>
						<span style={{ fontWeight: 700 }}>I agree</span> to the{" "}
						<button
							type="button"
							onClick={() => onShowPolicyModal?.()}
							style={{
								...secondaryPillStyle,
								background: "#eff6ff",
								borderColor: "#bfdbfe",
								padding: "4px 10px",
								fontSize: 12,
							}}
						>
							Terms-lite pilot policy
						</button>
						.
					</div>
				</div>

				{paymentRequired && !paymentReady && (
					<button
						type="button"
						onClick={() => onStartCheckout?.()}
						disabled={checkoutDisabled}
						style={{
							width: "100%",
							background: checkoutDisabled ? "#e5e7eb" : "#2563eb",
							color: checkoutDisabled ? "#9ca3af" : "#fff",
							border: "none",
							...primaryPillStyle,
							cursor: checkoutDisabled ? "not-allowed" : "pointer",
						}}
					>
						{paymentStatus === "pending"
							? "Opening checkout…"
							: paymentVerifying
								? "Verifying…"
								: needsPolicyAgreement
									? "Agree & continue"
									: isSubscriptionMode
										? "Subscribe & submit request"
										: "Pay & submit request"}
					</button>
				)}

				{(paymentReady || !paymentRequired) && (
					<button
						type="button"
						onClick={() => onSubmitErrand?.()}
						disabled={submitDisabled}
						style={{
							width: "100%",
							background: submitDisabled ? "#16a34a55" : "#16a34a",
							color: submitDisabled ? "#14532d" : "#fff",
							border: "none",
							...primaryPillStyle,
							cursor: submitDisabled ? "not-allowed" : "pointer",
						}}
					>
						{submissionPending ? "Submitting…" : "Submit request"}
					</button>
				)}
			</div>
		</div>
	);

	if (isInline) {
		return sheet;
	}

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="payment-modal-title"
			tabIndex={-1}
			className="eb-sheet-overlay eb-payment-overlay"
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					onClose?.();
				}
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					onClose?.();
				}
			}}
		>
			{sheet}
		</div>
	);
};

export default PaymentModal;
