const ContactModal = ({ open, onClose }) => {
	if (!open) return null;

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: "rgba(15, 23, 42, 0.45)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1001,
				padding: "20px",
			}}
		>
			<button
				type="button"
				aria-label="Close contact modal"
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
					padding: 28,
					width: "100%",
					maxWidth: 500,
					maxHeight: "80vh",
					overflowY: "auto",
					boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2)",
					boxSizing: "border-box",
					border: "1px solid #e2e8f0",
					zIndex: 1,
				}}
			>
				<div
					style={{
						background: "linear-gradient(135deg, #2563eb 0%, #22c55e 100%)",
						color: "#fff",
						borderRadius: 14,
						padding: "12px 14px",
						marginBottom: 12,
						display: "flex",
						alignItems: "center",
						gap: 8,
						fontWeight: 700,
						fontSize: 18,
						boxShadow: "0 10px 18px rgba(37, 99, 235, 0.2)",
					}}
				>
					<span>📞</span> Contact ErrandBridge Support
				</div>
				<p style={{ color: "#6b7280", marginBottom: 20, fontSize: 14 }}>
					Questions, urgent updates, or account help? Our team is ready to assist.
				</p>

				<div
					style={{
						fontSize: 14,
						color: "#374151",
						lineHeight: 1.8,
						display: "grid",
						gap: 14,
					}}
				>
					<div
						className="contact-card"
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 14,
							transition: "transform 0.2s ease, box-shadow 0.2s ease",
						}}
					>
						<div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
							<span style={{ fontSize: 20 }}>📧</span>
							<div>
								<p
									style={{
										margin: "0 0 4px 0",
										fontWeight: 600,
										color: "#1f2937",
									}}
								>
									Email
								</p>
								<p
									style={{
										margin: 0,
										color: "#2563eb",
										wordBreak: "break-all",
									}}
								>
									<a href="mailto:support@errandbridge.com">support@errandbridge.com</a>
								</p>
								<p
									style={{
										margin: "4px 0 0 0",
										fontSize: 12,
										color: "#6b7280",
									}}
								>
									Best for account, billing, and errand support. We aim to reply within 24 hours.
								</p>
								<p
									style={{
										margin: "4px 0 0 0",
										fontSize: 12,
										color: "#6b7280",
									}}
								>
									Official company contact: <a href="mailto:admin@errandbridge.com">admin@errandbridge.com</a>
								</p>
							</div>
						</div>
					</div>

					<div
						className="contact-card"
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 14,
							transition: "transform 0.2s ease, box-shadow 0.2s ease",
						}}
					>
						<div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
							<span style={{ fontSize: 20 }}>💬</span>
							<div>
								<p
									style={{
										margin: "0 0 4px 0",
										fontWeight: 600,
										color: "#1f2937",
									}}
								>
									Chat
								</p>
								<p style={{ margin: 0, color: "#374151" }}>
									Available in the app during support hours
								</p>
								<p
									style={{
										margin: "4px 0 0 0",
										fontSize: 12,
										color: "#6b7280",
									}}
								>
									Best for active errands and time-sensitive updates
								</p>
							</div>
						</div>
					</div>

					<div
						className="contact-card"
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 14,
							transition: "transform 0.2s ease, box-shadow 0.2s ease",
						}}
					>
						<div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
							<span style={{ fontSize: 20 }}>📱</span>
							<div>
								<p
									style={{
										margin: "0 0 4px 0",
										fontWeight: 600,
										color: "#1f2937",
									}}
								>
									Business line
								</p>
								<p style={{ margin: 0, color: "#2563eb", fontWeight: 600 }}>
									<a href="tel:01536211973">01536 211973</a>
								</p>
								<p
									style={{
										margin: "4px 0 0 0",
										fontSize: 12,
										color: "#6b7280",
									}}
								>
									Calls for urgent service updates, billing queries, and official business enquiries.
								</p>
							</div>
						</div>
					</div>

					<div
						className="contact-card"
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 14,
							transition: "transform 0.2s ease, box-shadow 0.2s ease",
						}}
					>
						<div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
							<span style={{ fontSize: 20 }}>🕐</span>
							<div>
								<p
									style={{
										margin: "0 0 4px 0",
										fontWeight: 600,
										color: "#1f2937",
									}}
								>
									Business Hours
								</p>
								<p style={{ margin: 0, color: "#374151" }}>Monday - Friday</p>
								<p style={{ margin: "2px 0 0 0", color: "#374151" }}>
									9:00 AM - 6:00 PM (UK business hours)
								</p>
								<p
									style={{
										margin: "4px 0 0 0",
										fontSize: 12,
										color: "#6b7280",
									}}
								>
									Weekend and holiday coverage may be limited.
								</p>
							</div>
						</div>
					</div>

					<div
						className="contact-card"
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 14,
							transition: "transform 0.2s ease, box-shadow 0.2s ease",
						}}
					>
						<div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
							<span style={{ fontSize: 20 }}>🏢</span>
							<div>
								<p
									style={{
										margin: "0 0 4px 0",
										fontWeight: 600,
										color: "#1f2937",
									}}
								>
									Company details
								</p>
								<p style={{ margin: 0, color: "#374151" }}>
									ErrandBridge Limited
								</p>
								<p style={{ margin: "2px 0 0 0", color: "#374151" }}>
									Registered in England and Wales No. 17046914
								</p>
								<p style={{ margin: "6px 0 0 0", color: "#374151" }}>
									International House, 6 South Molton Street, London, W1K 5QF
								</p>
							</div>
						</div>
					</div>

					<div
						className="contact-card"
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 14,
							transition: "transform 0.2s ease, box-shadow 0.2s ease",
						}}
					>
						<div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
							<span style={{ fontSize: 20 }}>🌐</span>
							<div style={{ width: "100%" }}>
								<p
									style={{
										margin: "0 0 10px 0",
										fontWeight: 600,
										color: "#1f2937",
									}}
								>
									Connect with us
								</p>
								<nav className="footer-social" aria-label="ErrandBridge social links">
									<a
										href="https://www.instagram.com/errandbridgeltd/"
										className="social-link social-instagram"
										target="_blank"
										rel="noopener noreferrer"
										aria-label="ErrandBridge on Instagram"
									>
										<span className="visually-hidden">Instagram</span>
										<svg
											viewBox="0 0 24 24"
											className="social-icon social-icon--stroke"
											aria-hidden="true"
											focusable="false"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.6"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z" />
											<circle cx="12" cy="12" r="3" />
											<circle cx="17.5" cy="6.5" r="1.5" />
										</svg>
									</a>
									<a
										href="https://www.tiktok.com/@errandbridgeltd?lang=en-GB"
										className="social-link social-tiktok"
										target="_blank"
										rel="noopener noreferrer"
										aria-label="ErrandBridge on TikTok"
									>
										<span className="visually-hidden">TikTok</span>
										<svg
											viewBox="0 0 24 24"
											className="social-icon"
											aria-hidden="true"
											focusable="false"
										>
											<path d="M13.2 2c.17 1.3.86 2.46 1.9 3.2 1.02.74 2.24 1.13 3.52 1.14v2.33c-1.52-.02-2.97-.52-4.17-1.43v6.62a4.9 4.9 0 1 1-4.9-4.9c.4 0 .79.05 1.16.14v2.44a2.47 2.47 0 0 0-1.16-.29 2.47 2.47 0 1 0 2.47 2.47V2h2.18z" />
										</svg>
									</a>
									<a
										href="https://www.facebook.com/profile.php?id=61579501553347"
										className="social-link social-facebook"
										target="_blank"
										rel="noopener noreferrer"
										aria-label="ErrandBridge on Facebook"
									>
										<span className="visually-hidden">Facebook</span>
										<svg
											viewBox="0 0 24 24"
											className="social-icon"
											aria-hidden="true"
											focusable="false"
										>
											<path d="M15 3h3V0h-3c-3 0-5 2-5 5v3H7v4h3v12h4V12h3l1-4h-4V5c0-1 .5-2 2-2z" />
										</svg>
									</a>
								</nav>
								<p
									style={{
										margin: "10px 0 0 0",
										fontSize: 12,
										color: "#6b7280",
									}}
								>
									Updates, behind-the-scenes, and announcements.
								</p>
							</div>
						</div>
					</div>

					<div
						style={{
							background: "#fef9c3",
							border: "1px solid #fde047",
							borderRadius: 10,
							padding: 12,
							marginTop: 20,
						}}
					>
						<p style={{ margin: 0, fontSize: 13, color: "#856404" }}>
							<strong>Reporting an issue or complaint?</strong> Please include your errand reference,
							what happened, and the best way to reach you. Our support team will review the
							case and aim to respond within 48 hours.
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					style={{
						width: "100%",
						padding: "12px 16px",
						background: "#2563eb",
						color: "#fff",
						border: "none",
						borderRadius: 8,
						cursor: "pointer",
						fontWeight: 500,
						fontSize: 14,
						marginTop: 24,
						transition: "background-color 0.2s ease",
					}}
					onMouseEnter={(e) => {
						e.target.style.background = "#1d4ed8";
					}}
					onMouseLeave={(e) => {
						e.target.style.background = "#2563eb";
					}}
				>
					Close
				</button>
				<style>{`
          .contact-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
          }
        `}</style>
			</div>
		</div>
	);
};

export default ContactModal;
