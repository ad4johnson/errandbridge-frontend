import { useEffect, useMemo, useRef, useState } from "react";

const ReviewModal = ({
	open,
	errand,
	reviewRating,
	setReviewRating,
	reviewNotes,
	setReviewNotes,
	reviewSubmitting,
	reviewSubmitted,
	referralCode,
	referralShareLink,
	onCopyReferralShareLink,
	onStartTipCheckout,
	tipCurrency,
	onSubmit,
	onClose,
}) => {
	const hasErrand = Boolean(errand);
	const isCompletedErrandReview = Boolean(errand && Number(errand.id) > 0);
	const resolvedReference =
		errand?.referenceNumber ||
		errand?.reference_number ||
		errand?.reference ||
		(Number.isFinite(Number(errand?.id)) && Number(errand?.id) > 0
			? `#${errand.id}`
			: "LANDING");
	const currency = String(tipCurrency || "").trim().toUpperCase();
	const minorPerMajor = useMemo(() => {
		if (!currency) return 100;
		if (currency === "JPY" || currency === "KRW") return 1;
		return 100;
	}, [currency]);

	const [tipBusy, setTipBusy] = useState(false);
	const [tipError, setTipError] = useState("");
	const [customTipMajor, setCustomTipMajor] = useState("");
	const [hoveredRating, setHoveredRating] = useState(0);
	const notesInputRef = useRef(null);
	const selectedRating = Number.isFinite(Number(reviewRating))
		? Number(reviewRating)
		: 0;
	const previewRating = hoveredRating || selectedRating;
	const canShareReferral = Boolean(reviewSubmitted && referralShareLink);

	useEffect(() => {
		if (!open || reviewSubmitted) return;
		const focusTimer = window.setTimeout(() => {
			notesInputRef.current?.focus?.();
		}, 40);
		return () => window.clearTimeout(focusTimer);
	}, [open, reviewSubmitted]);

	const tipSymbol = useMemo(() => {
		const symbols = {
			USD: "$",
			CAD: "$",
			AUD: "$",
			NZD: "$",
			GBP: "£",
			EUR: "€",
			NGN: "₦",
		};
		return symbols[currency] || "";
	}, [currency]);

	const formatTipLabel = useMemo(() => {
		return (major) => {
			const safeMajor = Number(major);
			if (!Number.isFinite(safeMajor)) return "";
			if (tipSymbol) return `${tipSymbol}${safeMajor}`;
			return currency ? `${currency} ${safeMajor}` : String(safeMajor);
		};
	}, [currency, tipSymbol]);
	const publicReviewUrl =
		process.env.REACT_APP_PUBLIC_REVIEW_URL ||
		window?.__EB_PUBLIC_REVIEW_URL__ ||
		"";

	if (!open) return null;

	const handleTip = async (major) => {
		if (!hasErrand) return;
		if (tipBusy) return;
		setTipError("");
		const majorNum = Number(major);
		if (!Number.isFinite(majorNum) || majorNum <= 0) {
			setTipError("Please enter a valid tip amount.");
			return;
		}
		const amountMinor = Math.round(majorNum * minorPerMajor);
		if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
			setTipError("Please enter a valid tip amount.");
			return;
		}
		setTipBusy(true);
		try {
			await onStartTipCheckout?.({ errand, amountMinor });
		} catch (err) {
			setTipError(err?.message || "Unable to start tip checkout.");
		} finally {
			setTipBusy(false);
		}
	};

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				background: "#0007",
				zIndex: 1000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "20px",
				overflowY: "auto",
			}}
		>
			<button
				type="button"
				aria-label="Close review modal"
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
				style={{
					background: "#fff",
					borderRadius: 16,
					padding: 32,
					width: "100%",
					maxWidth: 550,
					boxShadow: "0 4px 24px #0003",
					position: "relative",
					boxSizing: "border-box",
					margin: "auto",
					zIndex: 1,
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

				<h3
					style={{
						fontWeight: 700,
						fontSize: 24,
						marginBottom: 8,
						color: "#10b981",
					}}
				>
					{isCompletedErrandReview ? "🎉 Errand Completed!" : "⭐ Share your feedback"}
				</h3>
				<p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
					{hasErrand
						? isCompletedErrandReview
							? "Thank you for using ErrandBridge. Please share your feedback about this errand."
							: "Thanks for taking a moment to leave feedback about your ErrandBridge experience."
						: "Loading errand details…"}
				</p>

				{isCompletedErrandReview && (
					<div
						style={{
							background: "#f0fdf4",
							border: "1px solid #bbf7d0",
							padding: 14,
							borderRadius: 14,
							marginBottom: 16,
							color: "#065f46",
						}}
					>
						<div style={{ fontWeight: 800, marginBottom: 6 }}>
							Say thanks with a tip (optional)
						</div>
						<div style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 10 }}>
							You'll be taken to secure checkout. Once it's confirmed, we'll notify
							your Pilot of the tip amount.
						</div>
						<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
							{[2, 5, 10].map((major) => (
								<button
									key={major}
									type="button"
									disabled={!hasErrand || tipBusy}
									onClick={() => handleTip(major)}
									style={{
										background: !hasErrand || tipBusy ? "#dcfce7" : "#16a34a",
										color: !hasErrand || tipBusy ? "#166534" : "#fff",
										border: "none",
										borderRadius: 999,
										padding: "8px 12px",
										fontWeight: 800,
										cursor: !hasErrand || tipBusy ? "not-allowed" : "pointer",
									}}
								>
									{formatTipLabel(major)}
								</button>
							))}
						</div>

						<div style={{ display: "flex", gap: 10, marginTop: 12 }}>
							<input
								type="text"
								inputMode="decimal"
								placeholder={tipSymbol ? `${tipSymbol}Custom` : "Custom"}
								value={customTipMajor}
								onChange={(e) => {
									setCustomTipMajor(e.target.value);
									setTipError("");
								}}
								disabled={!hasErrand || tipBusy}
								style={{
									flex: 1,
									minWidth: 120,
									padding: "10px 12px",
									borderRadius: 10,
									border: "1.5px solid #86efac",
									fontWeight: 700,
									outline: "none",
								}}
							/>
							<button
								type="button"
								disabled={!hasErrand || tipBusy}
								onClick={() => handleTip(customTipMajor)}
								style={{
									background: !hasErrand || tipBusy ? "#dcfce7" : "#065f46",
									color: "#fff",
									border: "none",
									borderRadius: 10,
									padding: "10px 14px",
									fontWeight: 800,
									cursor: !hasErrand || tipBusy ? "not-allowed" : "pointer",
									whiteSpace: "nowrap",
								}}
							>
								{tipBusy ? "Opening…" : "Send tip"}
							</button>
						</div>
						{tipError && (
							<div
								style={{
									marginTop: 10,
									fontSize: 12,
									color: "#991b1b",
									background: "#fef2f2",
									border: "1px solid #fecaca",
									padding: "8px 10px",
									borderRadius: 10,
								}}
							>
								{tipError}
							</div>
						)}
					</div>
				)}

				{Boolean(publicReviewUrl) && (
					<div
						style={{
							background: "#eff6ff",
							border: "1px solid #bfdbfe",
							padding: 12,
							borderRadius: 12,
							marginBottom: 16,
							fontSize: 13,
							color: "#0c4a6e",
							lineHeight: 1.5,
						}}
					>
						<div style={{ fontWeight: 800, marginBottom: 6 }}>
							Leave a public review (optional)
						</div>
						<div style={{ marginBottom: 8 }}>
							It really helps other customers find us.
						</div>
						<a
							href={publicReviewUrl}
							target="_blank"
							rel="noreferrer"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 8,
								fontWeight: 800,
								color: "#1d4ed8",
								textDecoration: "none",
							}}
						>
							⭐ Open review link
						</a>
					</div>
				)}

				{reviewSubmitted ? (
					<div>
						<div
							style={{
								background: "#ecfdf5",
								border: "1px solid #a7f3d0",
								padding: 16,
								borderRadius: 14,
								marginBottom: 16,
								color: "#065f46",
							}}
						>
							<div style={{ fontWeight: 800, marginBottom: 6 }}>
								Thanks - your review is in 🎉
							</div>
							<div style={{ fontSize: 14, lineHeight: 1.5 }}>
								We really appreciate the feedback. It helps us improve the service and keep the good errands rolling.
							</div>
						</div>

						{canShareReferral && (
							<div
								style={{
									background: "#eff6ff",
									border: "1px solid #bfdbfe",
									padding: 16,
									borderRadius: 14,
									marginBottom: 16,
									color: "#1e3a8a",
								}}
							>
								<div style={{ fontWeight: 800, marginBottom: 6 }}>
									Share your referral link
								</div>
								<div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 10 }}>
									Invite a friend and you’ll get 10% off your next request when they complete their first paid errand.
								</div>
								{referralCode && (
									<div
										style={{
											fontSize: 13,
											fontWeight: 700,
											marginBottom: 10,
										}}
									>
										Referral code: <span style={{ letterSpacing: "0.08em" }}>{referralCode}</span>
									</div>
								)}
								<div
									style={{
										padding: "10px 12px",
										borderRadius: 10,
										background: "#fff",
										border: "1px solid #c7d2fe",
										fontSize: 12,
										color: "#1e40af",
										wordBreak: "break-all",
										marginBottom: 12,
									}}
								>
									{referralShareLink}
								</div>
								<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
									<button
										type="button"
										onClick={onCopyReferralShareLink}
										style={{
											background: "#2563eb",
											color: "#fff",
											border: "none",
											borderRadius: 10,
											padding: "10px 14px",
											fontWeight: 800,
											cursor: "pointer",
										}}
									>
										Copy referral link
									</button>
									<a
										href={referralShareLink}
										target="_blank"
										rel="noreferrer"
										style={{
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
											padding: "10px 14px",
											borderRadius: 10,
											fontWeight: 800,
											textDecoration: "none",
											background: "#dbeafe",
											color: "#1d4ed8",
										}}
									>
										Open link
									</a>
								</div>
							</div>
						)}

						<div style={{ display: "flex", gap: 12 }}>
							<button
								type="button"
								onClick={onClose}
								style={{
									flex: 1,
									background: "#10b981",
									color: "#fff",
									border: "none",
									borderRadius: 8,
									padding: "12px 16px",
									fontWeight: 700,
									fontSize: 15,
									cursor: "pointer",
								}}
							>
								Done
							</button>
						</div>
					</div>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							if (!hasErrand) return;
							onSubmit?.();
						}}
					>
					<div
						style={{
							background: "#f3f4f6",
							padding: 12,
							borderRadius: 8,
							marginBottom: 20,
						}}
					>
						<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
							{hasErrand ? errand.title : "Loading…"}
						</div>
						<div style={{ fontSize: 12, color: "#666" }}>
							{hasErrand
								? `Reference: ${resolvedReference}`
								: "Reference: -"}
						</div>
					</div>

					<div style={{ marginBottom: 20 }}>
						<div
							style={{
								fontWeight: 600,
								fontSize: 14,
								display: "block",
								marginBottom: 10,
							}}
						>
							How would you rate this errand? ⭐
						</div>
						<div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
							{[1, 2, 3, 4, 5].map((star) => (
								<button
									key={star}
									type="button"
									onClick={() => setReviewRating?.(star)}
									onMouseEnter={() => setHoveredRating(star)}
									onMouseLeave={() => setHoveredRating(0)}
									onFocus={() => setHoveredRating(star)}
									onBlur={() => setHoveredRating(0)}
									style={{
										fontSize: 32,
										background: "none",
										border: "none",
										cursor: "pointer",
										color: star <= previewRating ? "#f59e0b" : "#cbd5e1",
										opacity: star <= previewRating || !previewRating ? 1 : 0.92,
										transform: star <= previewRating && previewRating ? "scale(1.06)" : "scale(1)",
										transition: "all 0.18s ease",
									}}
									title={`${star} star${star !== 1 ? "s" : ""}`}
								>
									{star <= previewRating ? "★" : "☆"}
								</button>
							))}
						</div>
					</div>

					<div style={{ marginBottom: 20 }}>
						<label
							htmlFor="review-notes"
							style={{
								fontWeight: 600,
								fontSize: 14,
								display: "block",
								marginBottom: 8,
							}}
						>
							Additional Comments (optional)
						</label>
						<textarea
							id="review-notes"
							ref={notesInputRef}
							value={reviewNotes}
							onChange={(e) => setReviewNotes?.(e.target.value)}
							placeholder="Tell us what you liked or what could be improved..."
							maxLength="1000"
							style={{
								width: "100%",
								padding: 12,
								borderRadius: 8,
								border: "1.5px solid #bfc2d9",
								fontSize: 14,
								fontFamily: "inherit",
								resize: "vertical",
								minHeight: "100px",
								boxSizing: "border-box",
							}}
						/>
						<div
							style={{
								fontSize: 12,
								color: "#888",
								marginTop: 4,
								textAlign: "right",
							}}
						>
							{reviewNotes.length}/1000
						</div>
					</div>

					<div style={{ display: "flex", gap: 12 }}>
						<button
							type="submit"
							disabled={reviewSubmitting || !hasErrand || !selectedRating}
							style={{
								flex: 1,
								background: "#10b981",
								color: "#fff",
								border: "none",
								borderRadius: 8,
								padding: "12px 16px",
								fontWeight: 600,
								fontSize: 15,
								cursor:
									reviewSubmitting || !hasErrand || !selectedRating ? "not-allowed" : "pointer",
								opacity: reviewSubmitting || !hasErrand || !selectedRating ? 0.6 : 1,
								transition: "background 0.2s",
							}}
							onMouseLeave={(e) => {
								if (!reviewSubmitting && hasErrand && selectedRating) {
									e.target.style.background = "#10b981";
								}
							}}
							onMouseEnter={(e) => {
								if (!reviewSubmitting && hasErrand && selectedRating) {
									e.target.style.background = "#059669";
								}
							}}
						>
							{reviewSubmitting
								? "⏳ Submitting..."
								: hasErrand
									? "✅ Submit Review"
									: "Loading…"}
						</button>
						<button
							type="button"
							onClick={onClose}
							style={{
								flex: 1,
								background: "#f3f4f6",
								color: "#666",
								border: "none",
								borderRadius: 8,
								padding: "12px 16px",
								fontWeight: 600,
								fontSize: 15,
								cursor: "pointer",
								transition: "background 0.2s",
							}}
							onMouseEnter={(e) => {
								e.target.style.background = "#e5e7eb";
							}}
							onMouseLeave={(e) => {
								e.target.style.background = "#f3f4f6";
							}}
						>
							Skip
						</button>
					</div>
					</form>
				)}
			</div>
		</div>
	);
};

export default ReviewModal;
