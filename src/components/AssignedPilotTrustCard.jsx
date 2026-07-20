const formatReviewDate = (value) => {
	if (!value) return "";
	const ts = new Date(value).getTime();
	if (!Number.isFinite(ts)) return "";
	return new Date(value).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

const buildInitials = (value) => {
	const text = String(value || "").trim();
	if (!text) return "P";
	const parts = text.split(/\s+/).filter(Boolean);
	return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
};

const normalizeRating = (value) => {
	const rating = Number(value);
	if (!Number.isFinite(rating) || rating <= 0) return null;
	return Math.round(rating * 10) / 10;
};

const metricCardStyle = {
	background: "rgba(255,255,255,0.82)",
	borderRadius: 14,
	padding: "12px 14px",
	display: "grid",
	gap: 4,
};

export default function AssignedPilotTrustCard({ trust }) {
	if (!trust || !trust.pilotId) return null;

	const rating = normalizeRating(trust.rating);
	const reviewCount = Number(trust.reviewCount || 0);
	const completedErrands = Number(trust.completedErrands || 0);
	const recentReviews = Array.isArray(trust.recentReviews)
		? trust.recentReviews.filter(Boolean).slice(0, 2)
		: [];
	const displayName = String(trust.displayName || "Pilot").trim() || "Pilot";
	const avatarLabel = buildInitials(displayName);

	return (
		<section
			aria-label="Assigned pilot trust"
			style={{
				marginTop: 16,
				padding: 16,
				borderRadius: 18,
				background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 52%, #f5f3ff 100%)",
				border: "1px solid rgba(99, 102, 241, 0.18)",
				boxShadow: "0 16px 34px rgba(37, 99, 235, 0.12)",
				display: "grid",
				gap: 14,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 14,
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
					<div
						style={{
							width: 58,
							height: 58,
							borderRadius: 18,
							overflow: "hidden",
							background: "linear-gradient(135deg, #2563eb, #7c3aed)",
							color: "#fff",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: 20,
							fontWeight: 900,
							boxShadow: "0 10px 22px rgba(79, 70, 229, 0.2)",
							flexShrink: 0,
						}}
					>
						{trust.profileImageUrl ? (
							<img
								src={trust.profileImageUrl}
								alt={displayName}
								loading="lazy"
								decoding="async"
								style={{ width: "100%", height: "100%", objectFit: "cover" }}
							/>
						) : (
							avatarLabel
						)}
					</div>
					<div style={{ minWidth: 0 }}>
						<div
							style={{
								fontSize: 11,
								fontWeight: 800,
								letterSpacing: "0.08em",
								textTransform: "uppercase",
								color: "#4338ca",
								marginBottom: 4,
							}}
						>
							Assigned pilot trust
						</div>
						<div
							style={{
								fontSize: 20,
								fontWeight: 900,
								color: "#0f172a",
								lineHeight: 1.15,
							}}
						>
							{displayName}
						</div>
						<div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginTop: 4 }}>
							{trust.trustLabel || "Trusted pilot"}
						</div>
					</div>
				</div>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 8,
						padding: "8px 12px",
						borderRadius: 999,
						background: "rgba(255,255,255,0.78)",
						fontSize: 12,
						fontWeight: 800,
						color: "#1d4ed8",
					}}
				>
					<span aria-hidden="true">🛡️</span>
					<span>{trust.verificationLabel || "Verification pending"}</span>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
					gap: 10,
				}}
			>
				<div style={metricCardStyle}>
					<div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#64748b" }}>
						Average rating
					</div>
					<div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
						{rating ? `${rating.toFixed(1)} ★` : "-"}
					</div>
				</div>
				<div style={metricCardStyle}>
					<div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#64748b" }}>
						Client reviews
					</div>
					<div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
						{reviewCount}
					</div>
				</div>
				<div style={metricCardStyle}>
					<div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#64748b" }}>
						Completed errands
					</div>
					<div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
						{completedErrands}
					</div>
				</div>
			</div>

			<div
				style={{
					background: "rgba(255,255,255,0.72)",
					borderRadius: 16,
					padding: 14,
					display: "grid",
					gap: 10,
				}}
			>
				<div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#6366f1" }}>
					Recent client feedback
				</div>
				{recentReviews.length ? (
					recentReviews.map((review) => {
						const reviewedAtLabel = formatReviewDate(review.reviewedAt);
						return (
							<div
								key={`${review.referenceNumber}-${review.reviewedAt || "recent"}`}
								style={{
									padding: "12px 14px",
									borderRadius: 14,
									background: "#ffffff",
									border: "1px solid rgba(226, 232, 240, 0.92)",
									display: "grid",
									gap: 4,
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
									<div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
										{review.title || review.referenceNumber}
									</div>
									<div style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>
										{review.rating ? `${review.rating} ★` : "Rated"}
										{reviewedAtLabel ? ` · ${reviewedAtLabel}` : ""}
									</div>
								</div>
								<div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
									{review.reviewNotes || "Clients recently rated this pilot positively on completed errands."}
								</div>
							</div>
						);
					})
				) : (
					<div style={{ fontSize: 13, fontWeight: 600, color: "#475569", lineHeight: 1.5 }}>
						This pilot has completed errands successfully. Full review highlights will appear here as customers keep rating completed jobs.
					</div>
				)}
			</div>
		</section>
	);
}