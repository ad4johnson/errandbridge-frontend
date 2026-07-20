const UserDetailsModal = ({
	open,
	user,
	reviewSummary,
	profileImage,
	userIsAdmin,
	onClose,
	onOpenSettings,
	onOpenAdminDashboard,
	onLogout,
	onProfileImageUpload,
	onProfileImageRemove,
}) => {
	if (!open || !user) return null;

	const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
	const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;
	const isCompactViewport = viewportWidth <= 480;
	const isShortViewport = viewportHeight <= 760;

	const submittedCount = Number(reviewSummary?.submittedCount || 0);
	const averageRating = Number.isFinite(Number(reviewSummary?.averageRating))
		? Number(reviewSummary.averageRating)
		: null;
	const latestReview = reviewSummary?.latestReview || null;
	const latestReviewDateLabel = latestReview?.reviewedAt
		? new Date(latestReview.reviewedAt).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		})
		: null;

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				background: "rgba(0,0,0,0.5)",
				zIndex: 1100,
				display: "flex",
				alignItems: isCompactViewport || isShortViewport ? "flex-start" : "center",
				justifyContent: "center",
				transition: "background 0.3s",
				padding: isCompactViewport ? "12px" : "20px",
				overflowY: "auto",
			}}
		>
			<button
				type="button"
				aria-label="Close profile details"
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
				aria-labelledby="user-details-title"
				style={{
					background: "#fff",
					borderRadius: isCompactViewport ? 18 : 20,
					padding: isCompactViewport ? "24px 14px 18px" : "40px 20px",
					width: "100%",
					maxWidth: 500,
					maxHeight: isCompactViewport || isShortViewport ? "calc(100vh - 24px)" : "min(820px, calc(100vh - 40px))",
					boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
					position: "relative",
					animation: "fadeInModal 0.35s",
					boxSizing: "border-box",
					overflowY: "auto",
					zIndex: 1,
				}}
			>
				<button
					type="button"
					onClick={onClose}
					style={{
						position: "absolute",
						top: 16,
						right: 16,
						background: "none",
						border: "none",
						fontSize: 28,
						cursor: "pointer",
						color: "#999",
						transition: "color 0.2s",
					}}
					onMouseEnter={(e) => {
						e.target.style.color = "#2563eb";
					}}
					onMouseLeave={(e) => {
						e.target.style.color = "#999";
					}}
				>
					×
				</button>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						marginBottom: isCompactViewport ? 18 : 24,
						width: isCompactViewport ? "100%" : 220,
						maxWidth: 220,
						marginLeft: "auto",
						marginRight: "auto",
					}}
				>
					<div
						style={{
							position: "relative",
							display: "inline-block",
							marginBottom: 8,
						}}
					>
						<div
							style={{
								width: 84,
								height: 84,
								borderRadius: "50%",
								background: profileImage
									? "#fff"
									: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 30,
								position: "relative",
								boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
								overflow: "hidden",
								border: "2px solid #e0e7ff",
							}}
						>
							{profileImage ? (
								<img
									src={profileImage}
									alt="Profile"
									loading="lazy"
									decoding="async"
									width={84}
									height={84}
									style={{ width: "100%", height: "100%", objectFit: "cover" }}
								/>
							) : (
								"👤"
							)}
						</div>
						<label
							htmlFor="profileImageInput"
							style={{
								position: "absolute",
								bottom: 0,
								right: 0,
								background: "#2563eb",
								color: "#fff",
								width: 26,
								height: 26,
								borderRadius: "50%",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								fontSize: 12,
								border: "2px solid #fff",
								boxShadow: "0 1px 3px rgba(37, 99, 235, 0.15)",
								transition: "all 0.3s ease",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = "#1d4ed8";
								e.currentTarget.style.transform = "scale(1.1)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = "#2563eb";
								e.currentTarget.style.transform = "scale(1)";
							}}
							title="Upload profile image"
						>
							🖼️
						</label>
						<input
							id="profileImageInput"
							type="file"
							accept="image/*"
							onChange={onProfileImageUpload}
							style={{ display: "none" }}
						/>
					</div>
					{profileImage && typeof onProfileImageRemove === "function" && (
						<button
							type="button"
							onClick={() => {
								const ok = window.confirm(
									"Remove your profile photo? You can upload a new one anytime.",
								);
								if (!ok) return;
								onProfileImageRemove();
							}}
							style={{
								marginTop: 10,
								background: "#fff",
								border: "1px solid #fecaca",
								color: "#991b1b",
								fontWeight: 700,
								fontSize: 12,
								borderRadius: 10,
								padding: "6px 10px",
								cursor: "pointer",
							}}
							title="Remove profile photo"
						>
							🗑️ Remove photo
						</button>
					)}
					<div
						id="user-details-title"
						style={{
							fontWeight: 600,
							fontSize: 15,
							color: "#1f2937",
							marginBottom: 2,
							textAlign: "center",
						}}
					>
						{user.firstName} {user.lastName}
					</div>
				</div>

				<div
					style={{
						background: "linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)",
						borderRadius: 16,
						padding: isCompactViewport ? 14 : 18,
						marginBottom: isCompactViewport ? 16 : 20,
						border: "1px solid rgba(251, 191, 36, 0.28)",
						boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: 12,
							marginBottom: 14,
							flexWrap: "wrap",
						}}
					>
						<div>
							<div
								style={{
									fontSize: isCompactViewport ? 11 : 12,
									fontWeight: 800,
									letterSpacing: "0.08em",
									textTransform: "uppercase",
									color: "#b45309",
									marginBottom: 4,
								}}
							>
								Your Pilot ratings
							</div>
							<div
								style={{
									fontSize: isCompactViewport ? 13 : 15,
									fontWeight: 700,
									color: "#111827",
								}}
							>
								{submittedCount > 0
									? "Your latest ratings are now part of your profile."
									: "Once you rate a Pilot, it shows up here right away."}
							</div>
						</div>
						<div
							style={{
								padding: isCompactViewport ? "6px 10px" : "8px 12px",
								borderRadius: 999,
								background: "rgba(255,255,255,0.75)",
								fontSize: isCompactViewport ? 12 : 13,
								fontWeight: 700,
								color: "#92400e",
							}}
						>
							{submittedCount} review{submittedCount === 1 ? "" : "s"}
						</div>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: isCompactViewport
								? "repeat(2, minmax(0, 1fr))"
								: "repeat(auto-fit, minmax(150px, 1fr))",
							gap: isCompactViewport ? 8 : 10,
							marginBottom: latestReview ? 12 : 0,
						}}
					>
						<div
							style={{
								background: "rgba(255,255,255,0.78)",
								borderRadius: 12,
								padding: isCompactViewport ? "10px 12px" : "12px 14px",
							}}
						>
							<div
								style={{
									fontSize: isCompactViewport ? 10 : 11,
									fontWeight: 700,
									color: "#9a3412",
									textTransform: "uppercase",
								}}
							>
								Reviews submitted
							</div>
							<div
								style={{
									fontSize: isCompactViewport ? 18 : 22,
									fontWeight: 800,
									color: "#111827",
									marginTop: 4,
								}}
							>
								{submittedCount}
							</div>
						</div>
						<div
							style={{
								background: "rgba(255,255,255,0.78)",
								borderRadius: 12,
								padding: isCompactViewport ? "10px 12px" : "12px 14px",
							}}
						>
							<div
								style={{
									fontSize: isCompactViewport ? 10 : 11,
									fontWeight: 700,
									color: "#9a3412",
									textTransform: "uppercase",
								}}
							>
								Average rating
							</div>
							<div
								style={{
									fontSize: isCompactViewport ? 18 : 22,
									fontWeight: 800,
									color: "#111827",
									marginTop: 4,
								}}
							>
								{averageRating ? `${averageRating.toFixed(1)} ★` : "-"}
							</div>
						</div>
					</div>

					{latestReview && (
						<div
							style={{
								background: "rgba(255,255,255,0.78)",
								borderRadius: 12,
								padding: isCompactViewport ? "10px 12px" : "12px 14px",
								display: "grid",
								gap: 6,
							}}
						>
							<div
								style={{
									fontSize: 11,
									fontWeight: 700,
									color: "#9a3412",
									textTransform: "uppercase",
								}}
							>
								Most recent review
							</div>
							<div style={{ fontSize: isCompactViewport ? 13 : 14, fontWeight: 700, color: "#111827" }}>
								{latestReview.title || latestReview.referenceNumber || "Recent errand"}
							</div>
							<div style={{ fontSize: isCompactViewport ? 12 : 13, color: "#374151" }}>
								{latestReview.rating ? `${latestReview.rating} ★` : "Rated"}
								{latestReviewDateLabel ? ` · ${latestReviewDateLabel}` : ""}
							</div>
						</div>
					)}
				</div>

				<div
					style={{
						display: "flex",
						justifyContent: "center",
						gap: 10,
						marginBottom: isCompactViewport ? 18 : 24,
						width: isCompactViewport ? "100%" : 220,
						maxWidth: isCompactViewport ? 320 : 220,
						marginLeft: "auto",
						marginRight: "auto",
						flexWrap: "wrap",
					}}
				>
					<button
						type="button"
						style={{
							background: "#eef2ff",
							border: "1px solid #c7d2fe",
							color: "#1e3a8a",
							fontWeight: 700,
							fontSize: 13,
							borderRadius: 10,
							padding: "4px 10px",
							margin: 0,
							minWidth: 0,
							minHeight: 0,
							boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: 4,
							transition: "all 0.2s",
						}}
						onClick={onOpenSettings}
						title="Settings"
					>
						<span role="img" aria-label="settings">
							⚙️
						</span>{" "}
						<span style={{ fontWeight: 700 }}>Settings</span>
					</button>
					{userIsAdmin && (
						<button
							type="button"
							style={{
								background: "#ede9fe",
								border: "1px solid #c4b5fd",
								color: "#5b21b6",
								fontWeight: 700,
								fontSize: 13,
								borderRadius: 10,
								padding: "4px 10px",
								margin: 0,
								minWidth: 0,
								minHeight: 0,
								boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: 4,
								transition: "all 0.2s",
							}}
							onClick={onOpenAdminDashboard}
							title="Admin Dashboard"
						>
							<span role="img" aria-label="admin">
								👨‍💼
							</span>{" "}
							<span style={{ fontWeight: 700 }}>Admin</span>
						</button>
					)}
					<button
						type="button"
						style={{
							background: "#fee2e2",
							border: "1px solid #fecaca",
							color: "#991b1b",
							fontWeight: 700,
							fontSize: 13,
							borderRadius: 10,
							padding: "4px 10px",
							margin: 0,
							minWidth: 0,
							minHeight: 0,
							boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: 4,
							transition: "all 0.2s",
						}}
						onClick={onLogout}
						title="Logout"
					>
						<span role="img" aria-label="logout">
							⎋
						</span>{" "}
						<span style={{ fontWeight: 700 }}>Logout</span>
					</button>
				</div>

				<div
					style={{
						background: "#f9fafb",
						borderRadius: 14,
						padding: isCompactViewport ? 14 : 20,
						marginBottom: isCompactViewport ? 16 : 20,
					}}
				>
					<div
						style={{
							marginBottom: 12,
							display: "flex",
							justifyContent: "space-between",
							alignItems: isCompactViewport ? "flex-start" : "center",
							gap: 10,
							flexWrap: isCompactViewport ? "wrap" : "nowrap",
						}}
					>
						<div
							style={{
								fontSize: isCompactViewport ? 11 : 12,
								fontWeight: 700,
								color: "#9ca3af",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							📧 Email
						</div>
						<p
							style={{
								fontSize: isCompactViewport ? 13 : 14,
								color: "#1f2937",
								margin: 0,
								fontWeight: 500,
								textAlign: isCompactViewport ? "left" : "right",
								wordBreak: "break-word",
							}}
						>
							{user.email || "Not provided"}
						</p>
					</div>

					<div
						style={{
							marginBottom: 12,
							display: "flex",
							justifyContent: "space-between",
							alignItems: isCompactViewport ? "flex-start" : "center",
							gap: 10,
							flexWrap: isCompactViewport ? "wrap" : "nowrap",
						}}
					>
						<div
							style={{
								fontSize: isCompactViewport ? 11 : 12,
								fontWeight: 700,
								color: "#9ca3af",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							📞 Phone
						</div>
						<p
							style={{
								fontSize: isCompactViewport ? 13 : 14,
								color: "#1f2937",
								margin: 0,
								fontWeight: 500,
								textAlign: isCompactViewport ? "left" : "right",
								wordBreak: "break-word",
							}}
						>
							{user.phone || "Not provided"}
						</p>
					</div>

					<div
						style={{
							marginBottom: 12,
							display: "flex",
							justifyContent: "space-between",
							alignItems: isCompactViewport ? "flex-start" : "center",
							gap: 10,
							flexWrap: isCompactViewport ? "wrap" : "nowrap",
						}}
					>
						<div
							style={{
								fontSize: isCompactViewport ? 11 : 12,
								fontWeight: 700,
								color: "#9ca3af",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							📍 Address
						</div>
						<p
							style={{
								fontSize: isCompactViewport ? 13 : 14,
								color: "#1f2937",
								margin: 0,
								fontWeight: 500,
								textAlign: isCompactViewport ? "left" : "right",
								wordBreak: "break-word",
							}}
						>
							{user.address || "Not provided"}
						</p>
					</div>

					<div
						style={{
							marginBottom: 12,
							display: "flex",
							justifyContent: "space-between",
							alignItems: isCompactViewport ? "flex-start" : "center",
							gap: 10,
							flexWrap: isCompactViewport ? "wrap" : "nowrap",
						}}
					>
						<div
							style={{
								fontSize: isCompactViewport ? 11 : 12,
								fontWeight: 700,
								color: "#9ca3af",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							🏙️ City
						</div>
						<p
							style={{
								fontSize: isCompactViewport ? 13 : 14,
								color: "#1f2937",
								margin: 0,
								fontWeight: 500,
								textAlign: isCompactViewport ? "left" : "right",
								wordBreak: "break-word",
							}}
						>
							{user.city || "Not provided"}
						</p>
					</div>

					<div
						style={{
							marginBottom: 12,
							display: "flex",
							justifyContent: "space-between",
							alignItems: isCompactViewport ? "flex-start" : "center",
							gap: 10,
							flexWrap: isCompactViewport ? "wrap" : "nowrap",
						}}
					>
						<div
							style={{
								fontSize: isCompactViewport ? 11 : 12,
								fontWeight: 700,
								color: "#9ca3af",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							🌍 Country
						</div>
						<p
							style={{
								fontSize: isCompactViewport ? 13 : 14,
								color: "#1f2937",
								margin: 0,
								fontWeight: 500,
								textAlign: isCompactViewport ? "left" : "right",
								wordBreak: "break-word",
							}}
						>
							{user.country || "Not provided"}
						</p>
					</div>

					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: isCompactViewport ? "flex-start" : "center",
							gap: 10,
							flexWrap: isCompactViewport ? "wrap" : "nowrap",
						}}
					>
						<div
							style={{
								fontSize: isCompactViewport ? 11 : 12,
								fontWeight: 700,
								color: "#9ca3af",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							📮 Zip/Postcode
						</div>
						<p
							style={{
								fontSize: isCompactViewport ? 13 : 14,
								color: "#1f2937",
								margin: 0,
								fontWeight: 500,
								textAlign: isCompactViewport ? "left" : "right",
								wordBreak: "break-word",
							}}
						>
							{user.postcode || "Not provided"}
						</p>
					</div>
				</div>

				<div style={{ display: "flex", gap: 10 }}>
					<button
						type="button"
						onClick={onClose}
						style={{
							flex: 1,
							background: "#2563eb",
							color: "#fff",
							border: "none",
							borderRadius: 10,
							padding: "12px 16px",
							fontWeight: 600,
							fontSize: 15,
							cursor: "pointer",
							transition: "background 0.2s",
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
				</div>
			</div>
		</div>
	);
};

export default UserDetailsModal;
