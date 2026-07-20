export default function InfoModal({ open, onClose, content }) {
	if (!open) return null;
	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				background: "rgba(15, 23, 42, 0.35)",
				zIndex: 1100,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				transition: "background 0.3s",
				animation: "fadeInBg 0.3s",
				padding: "24px",
			}}
		>
			<div
				style={{
					background:
						"linear-gradient(135deg, #6d28d9 0%, #7c3aed 55%, #8b5cf6 100%)",
					borderRadius: 26,
					padding: "34px 34px 30px 34px",
					minWidth: 320,
					maxWidth: 520,
					boxShadow: "0 18px 40px rgba(76, 29, 149, 0.35)",
					position: "relative",
					animation: "fadeInModal 0.35s",
					color: "#fff",
					border: "1px solid rgba(255, 255, 255, 0.2)",
				}}
			>
				<button
					type="button"
					onClick={onClose}
					style={{
						position: "absolute",
						top: 16,
						right: 18,
						background: "rgba(255,255,255,0.15)",
						border: "none",
						fontSize: 26,
						cursor: "pointer",
						color: "#fff",
						fontWeight: 700,
						borderRadius: "50%",
						width: 38,
						height: 38,
						lineHeight: "38px",
						textAlign: "center",
						transition: "background 0.2s",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = "rgba(255,255,255,0.28)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "rgba(255,255,255,0.15)";
					}}
					onFocus={(e) => {
						e.currentTarget.style.background = "rgba(255,255,255,0.28)";
					}}
					onBlur={(e) => {
						e.currentTarget.style.background = "rgba(255,255,255,0.15)";
					}}
					aria-label="Close information dialog"
				>
					&times;
				</button>
				<div
					style={{
						fontWeight: 800,
						fontSize: 22,
						marginBottom: 16,
						color: "#fff",
						letterSpacing: 0.2,
					}}
				>
					Information
				</div>
				<div
					style={{
						color: "#f8fafc",
						fontSize: 16,
						lineHeight: 1.7,
						whiteSpace: "pre-line",
					}}
				>
					{content}
				</div>
			</div>
			<style>{`
        @keyframes fadeInModal { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes fadeInBg { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
		</div>
	);
}
