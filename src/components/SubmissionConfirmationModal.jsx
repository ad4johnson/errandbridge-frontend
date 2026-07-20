import { createPortal } from "react-dom";

const SubmissionConfirmationModal = ({
	open,
	errandData,
	onClose,
	onCloseWithBlur,
	onDone,
	onViewErrands,
}) => {
	if (!open || !errandData) return null;
	const paymentReceipt = errandData.paymentReceipt || null;
	const paymentSessionId = String(paymentReceipt?.sessionId || "").trim();
	const maskedPaymentSessionId = paymentSessionId
		? `…${paymentSessionId.slice(-12)}`
		: "";

	const shareUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/e/${errandData.referenceNumber}`
			: `/e/${errandData.referenceNumber}`;
	const handleCopyShareLink = async () => {
		try {
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(shareUrl);
				alert("Share link copied to clipboard");
				return;
			}
		} catch (err) {
			console.warn("Unable to copy share link", err);
		}
	};

	const modal = (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				background: "#0007",
				// Keep this above *all* sticky bars / sheets.
				// - Payment sheet uses z-index ~1650
				// - V2 Review & Pay bar uses z-index ~1740
				zIndex: 2100,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding:
					"calc(clamp(10px, 3vw, 20px) + var(--safe-top)) clamp(10px, 3vw, 20px) calc(clamp(10px, 3vw, 20px) + var(--safe-bottom))",
				overflowY: "auto",
			}}
		>
			<button
				type="button"
				aria-label="Close submission confirmation"
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
					borderRadius: 18,
					width: "100%",
					maxWidth: 520,
					// Reduce height on small screens so the modal doesn't feel full-screen.
					maxHeight: "min(76vh, 740px)",
					overflow: "hidden",
					boxShadow: "0 8px 32px #0003",
					textAlign: "center",
					position: "relative",
					boxSizing: "border-box",
					margin: "auto",
					zIndex: 1,
					display: "flex",
					flexDirection: "column",
				}}
			>
				<button
					type="button"
					onClick={onCloseWithBlur}
					style={{
						position: "absolute",
						top: 10,
						right: 12,
						background: "none",
						border: "none",
						fontSize: 22,
						cursor: "pointer",
						color: "#888",
					}}
				>
					&times;
				</button>

				<div
					style={{
						padding: "clamp(14px, 3vw, 24px)",
						overflowY: "auto",
						WebkitOverflowScrolling: "touch",
						flex: "1 1 auto",
					}}
				>
					<div style={{ fontSize: 44, marginBottom: 10, lineHeight: 1 }}>✅</div>

				<div
					style={{
						display: "inline-block",
						background: "#dcfce7",
						color: "#166534",
						padding: "5px 10px",
						borderRadius: 6,
						fontSize: 12,
						fontWeight: 600,
						marginBottom: 12,
						textTransform: "uppercase",
						letterSpacing: "0.5px",
					}}
				>
					📋 {errandData.status || "PENDING"}
				</div>

				<h2
					style={{
						fontWeight: 800,
						fontSize: 22,
						marginBottom: 8,
						color: "#1f2937",
					}}
				>
					Errand Submitted!
				</h2>
				<p
					style={{
						color: "#666",
						fontSize: 14,
						marginBottom: 18,
						lineHeight: 1.6,
					}}
				>
					Your errand has been successfully submitted and is pending
					verification. You'll receive updates via email.
				</p>

				<div
					style={{
						background: "#f9fafb",
						borderRadius: 12,
						padding: 12,
						marginBottom: 14,
						border: "1px solid #e5e7eb",
					}}
				>
					<div style={{ marginBottom: 12 }}>
						<div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>
							Errand Title
						</div>
						<div style={{ fontSize: 14, fontWeight: 650, color: "#1f2937" }}>
							{errandData.title}
						</div>
					</div>
					<div style={{ marginBottom: 12 }}>
						<div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>
							Reference Number
						</div>
						<div
							style={{
								fontSize: 13,
								fontWeight: 650,
								color: "#2563eb",
								fontFamily:
									"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
							}}
						>
							{errandData.referenceNumber}
						</div>
					</div>
					{errandData.pickupTimeSlotDate && (
						<div>
							<div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>
								🗓️ Time Slot
							</div>
							<div style={{ fontSize: 14, fontWeight: 500, color: "#1f2937" }}>
								{new Date(errandData.pickupTimeSlotDate).toLocaleDateString()}
								{errandData.pickupTimeSlotStart &&
									` • ${errandData.pickupTimeSlotStart}`}
								{errandData.pickupTimeSlotEnd &&
									` - ${errandData.pickupTimeSlotEnd}`}
							</div>
						</div>
					)}
				</div>

				{paymentReceipt?.paid && (
					<div
						style={{
							background: "#ecfdf5",
							border: "1px solid #bbf7d0",
							borderRadius: 10,
							padding: 12,
							marginBottom: 14,
							textAlign: "left",
							color: "#14532d",
						}}
					>
						<div
							style={{
								fontSize: 12,
								fontWeight: 800,
								textTransform: "uppercase",
								letterSpacing: "0.5px",
								marginBottom: 8,
							}}
						>
							💳 Payment receipt
						</div>
						<div style={{ display: "grid", gap: 6, fontSize: 13 }}>
							<div>
								<strong>Status:</strong> Paid via {paymentReceipt.provider || "Stripe"}
							</div>
							{paymentReceipt.amountLabel && (
								<div>
									<strong>Amount:</strong> {paymentReceipt.amountLabel}
								</div>
							)}
							{maskedPaymentSessionId && (
								<div>
									<strong>Stripe ref:</strong>{" "}
									<span
										style={{
											fontFamily:
												"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
										}}
									>
										{maskedPaymentSessionId}
									</span>
								</div>
							)}
							{paymentReceipt.customerEmail && (
								<div>
									<strong>Email:</strong> {paymentReceipt.customerEmail}
								</div>
							)}
						</div>
					</div>
				)}

				<div
					style={{
						background: "#eff6ff",
						border: "1px solid #bfdbfe",
						borderRadius: 10,
						padding: 12,
						marginBottom: 14,
						textAlign: "left",
						color: "#1e3a8a",
					}}
				>
					<div style={{ fontWeight: 700, marginBottom: 6 }}>
						Finding a verified operator…
					</div>
					<div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>
						3 operators available nearby · Matching in progress
					</div>
					<div style={{ fontSize: 12, color: "#64748b" }}>
						Operator assigned: ★ 4.9 · Estimated arrival: 20 minutes (when
						matched)
					</div>
				</div>

				<div
					style={{
						background: "#fef3c7",
						border: "1px solid #fcd34d",
						borderRadius: 8,
						padding: 12,
						marginBottom: 14,
						fontSize: 13,
						color: "#92400e",
						lineHeight: 1.5,
					}}
				>
					📌 <strong>What's next?</strong> Keep your reference number handy. You
					can track your errand status in the "My Errands" section.
				</div>

				<div
					style={{
						background: "#eff6ff",
						border: "1px solid #bfdbfe",
						borderRadius: 10,
						padding: 12,
						marginBottom: 14,
						textAlign: "left",
					}}
				>
					<div
						style={{
							fontSize: 12,
							fontWeight: 700,
							color: "#1d4ed8",
							marginBottom: 6,
						}}
					>
						Shareable proof link
					</div>
					<div
						style={{
							fontSize: 13,
							color: "#1e3a8a",
							wordBreak: "break-all",
							marginBottom: 10,
						}}
					>
						{shareUrl}
					</div>
					<button
						type="button"
						onClick={handleCopyShareLink}
						style={{
							background: "#2563eb",
							color: "#fff",
							border: "none",
							borderRadius: 8,
							padding: "8px 12px",
							fontWeight: 600,
							fontSize: 13,
							cursor: "pointer",
						}}
					>
						🔗 Copy share link
					</button>
				</div>

				</div>

				<div
					style={{
						padding:
							"12px clamp(14px, 3vw, 24px) calc(12px + var(--safe-bottom))",
						borderTop: "1px solid #e5e7eb",
						background: "#fff",
						boxShadow: "0 -10px 22px rgba(0,0,0,0.06)",
					}}
				>
					<div
						style={{
							display: "flex",
							gap: 12,
							justifyContent: "center",
							flexWrap: "wrap",
						}}
					>
						<button
							type="button"
							onClick={onDone}
							style={{
								flex: 1,
								minWidth: 200,
								maxWidth: 240,
								background: "#2563eb",
								color: "#fff",
								border: "none",
								borderRadius: 8,
								padding: "11px 14px",
								fontWeight: 600,
								fontSize: 14,
								cursor: "pointer",
								transition: "background 0.2s",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = "#1d4ed8";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = "#2563eb";
							}}
						>
							✅ Done
						</button>
						<button
							type="button"
							onClick={onViewErrands}
							style={{
								flex: 1,
								minWidth: 200,
								maxWidth: 240,
								background: "#f3f4f6",
								color: "#2563eb",
								border: "1.5px solid #2563eb",
								borderRadius: 8,
								padding: "11px 14px",
								fontWeight: 600,
								fontSize: 14,
								cursor: "pointer",
								transition: "all 0.2s",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = "#eff6ff";
								e.currentTarget.style.borderColor = "#1d4ed8";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = "#f3f4f6";
								e.currentTarget.style.borderColor = "#2563eb";
							}}
						>
							📊 View My Errands
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	// Portal to <body> so this overlay can reliably sit above any other UI that
	// uses a body-level portal (e.g. the V2 Review & Pay sticky bar).
	if (typeof document !== "undefined" && document?.body) {
		return createPortal(modal, document.body);
	}

	return modal;
};

export default SubmissionConfirmationModal;
