import { createPortal } from "react-dom";

const PolicyModal = ({ open, onClose, onAccept }) => {
	if (!open) return null;
	if (typeof document === "undefined") return null;
	const titleId = "eb-policy-modal-title";

	return createPortal(
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: "rgba(0, 0, 0, 0.5)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 3000,
				padding: "20px",
			}}
		>
			<button
				type="button"
				aria-label="Close policy modal"
				onClick={onClose}
				style={{
					position: "absolute",
					inset: 0,
					background: "transparent",
					border: "none",
					cursor: "pointer",
					zIndex: 0,
				}}
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				style={{
					background: "#fff",
					borderRadius: 12,
					padding: 28,
					width: "100%",
					maxWidth: 600,
					maxHeight: "80vh",
					overflowY: "auto",
					boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
					boxSizing: "border-box",
					position: "relative",
					zIndex: 1,
				}}
			>
				<h2
					id={titleId}
					style={{
						marginTop: 0,
						marginBottom: 16,
						fontSize: 24,
						color: "#1f2937",
					}}
				>
					Terms-Lite Pilot Policy
				</h2>

				<div style={{ fontSize: 14, lineHeight: 1.6, color: "#374151" }}>
					<h3 style={{ marginTop: 16, marginBottom: 8, color: "#1f2937" }}>
						1. Service Overview
					</h3>
					<p>
						ErrandBridge is a pilot service that connects users with local
						service providers for various errands and tasks. This service is
						provided on an "as-is" basis during the pilot phase.
					</p>

					<h3 style={{ marginTop: 16, marginBottom: 8, color: "#1f2937" }}>
						2. Subscription (ErrandBridge Plus)
					</h3>
					<p>
						If you choose ErrandBridge Plus, it is billed as a recurring monthly
						subscription via Stripe. You can cancel at any time; cancellation
						takes effect at the end of the current paid period (unless otherwise
						required by law). While Plus is active, individual requests may not
						require a separate per-request checkout.
					</p>

					<h3 style={{ marginTop: 16, marginBottom: 8, color: "#1f2937" }}>
						3. User Responsibilities
					</h3>
					<p>Users agree to:</p>
					<ul style={{ marginTop: 8, marginBottom: 8 }}>
						<li>Provide accurate information when creating errands</li>
						<li>Not request illegal or harmful services</li>
						<li>Maintain confidentiality of sensitive documents</li>
						<li>Respect the service providers' time and professionalism</li>
					</ul>

					<h3 style={{ marginTop: 16, marginBottom: 8, color: "#1f2937" }}>
						4. Data & Privacy
					</h3>
					<p>
						Files and personal data are handled with care and access controls.
						To provide the service, we may share relevant information with the
						service provider(s) fulfilling your request and with trusted vendors
						such as payment processors (e.g., Stripe) where applicable.
					</p>

					<h3 style={{ marginTop: 16, marginBottom: 8, color: "#1f2937" }}>
						5. Limitation of Liability
					</h3>
					<p>
						ErrandBridge is not liable for delays, service failures, or loss of
						documents. Users are responsible for uploading sensitive documents
						at their own risk.
					</p>

					<h3 style={{ marginTop: 16, marginBottom: 8, color: "#1f2937" }}>
						6. Service Provider
					</h3>
					<p>
						Service providers are independent contractors. ErrandBridge does not
						guarantee specific completion times or outcomes but will work to
						resolve disputes fairly.
					</p>

					<h3 style={{ marginTop: 16, marginBottom: 8, color: "#1f2937" }}>
						7. Changes to Terms
					</h3>
					<p>
						These terms may be updated during the pilot phase. Continued use of
						the service indicates acceptance of updated terms.
					</p>

					<p style={{ marginTop: 24, fontSize: 12, color: "#6b7280" }}>
						Last updated: April 16, 2026
					</p>
				</div>

				<div style={{ display: "flex", gap: 12, marginTop: 24 }}>
					<button
						type="button"
						onClick={onClose}
						style={{
							flex: 1,
							padding: "10px 16px",
							border: "1px solid #d1d5db",
							background: "#f3f4f6",
							borderRadius: 8,
							cursor: "pointer",
							fontWeight: 500,
							fontSize: 14,
						}}
					>
						Close
					</button>
					<button
						type="button"
						onClick={onAccept}
						style={{
							flex: 1,
							padding: "10px 16px",
							background: "#2563eb",
							color: "#fff",
							border: "none",
							borderRadius: 8,
							cursor: "pointer",
							fontWeight: 500,
							fontSize: 14,
						}}
					>
						I Accept & Agree
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
};

export default PolicyModal;
