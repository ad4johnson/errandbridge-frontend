const ChangePasswordModal = ({
	open,
	onClose,
	onCloseAll,
	onSubmit,
	changePasswordError,
	changePasswordSuccess,
	showCurrentPasswordField,
	setShowCurrentPasswordField,
	showNewPasswordField,
	setShowNewPasswordField,
	showConfirmPasswordField,
	setShowConfirmPasswordField,
	changePasswordCurrentPassword,
	setChangePasswordCurrentPassword,
	changePasswordNewPassword,
	setChangePasswordNewPassword,
	changePasswordConfirmPassword,
	setChangePasswordConfirmPassword,
}) => {
	if (!open) return null;

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
				aria-label="Close change password"
				onClick={onCloseAll}
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
					maxWidth: 450,
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
				<h3 style={{ fontWeight: 700, fontSize: 22, marginBottom: 12 }}>
					Change Password
				</h3>
				<form onSubmit={onSubmit}>
					{changePasswordError && (
						<div
							style={{
								color: "#dc2626",
								fontSize: 14,
								marginBottom: 12,
								padding: 10,
								background: "#fee2e2",
								borderRadius: 6,
							}}
						>
							{changePasswordError}
						</div>
					)}
					{changePasswordSuccess && (
						<div
							style={{
								color: "#059669",
								fontSize: 14,
								marginBottom: 12,
								padding: 10,
								background: "#d1fae5",
								borderRadius: 6,
							}}
						>
							{changePasswordSuccess}
						</div>
					)}

					<div style={{ marginBottom: 12 }}>
						<label
							htmlFor="change-password-current"
							style={{
								fontWeight: 600,
								fontSize: 13,
								display: "block",
								marginBottom: 6,
							}}
						>
							Current Password
						</label>
						<div style={{ position: "relative", marginBottom: 12 }}>
							<input
								id="change-password-current"
								type={showCurrentPasswordField ? "text" : "password"}
								value={changePasswordCurrentPassword}
								onChange={(e) =>
									setChangePasswordCurrentPassword?.(e.target.value)
								}
								placeholder="Enter current password"
								style={{
									width: "100%",
									padding: 10,
									paddingRight: 40,
									borderRadius: 8,
									border: "1.5px solid #bfc2d9",
									fontSize: 14,
									boxSizing: "border-box",
								}}
								required
							/>
							<button
								type="button"
								style={{
									position: "absolute",
									right: 12,
									top: 10,
									background: "none",
									border: "none",
									color: "#2563eb",
									fontWeight: 600,
									cursor: "pointer",
									fontSize: 13,
								}}
								onClick={() => setShowCurrentPasswordField?.((v) => !v)}
							>
								{showCurrentPasswordField ? "Hide" : "Show"}
							</button>
						</div>

						<label
							htmlFor="change-password-new"
							style={{
								fontWeight: 600,
								fontSize: 13,
								display: "block",
								marginBottom: 6,
							}}
						>
							New Password
						</label>
						<div style={{ position: "relative", marginBottom: 12 }}>
							<input
								id="change-password-new"
								type={showNewPasswordField ? "text" : "password"}
								value={changePasswordNewPassword}
								onChange={(e) => setChangePasswordNewPassword?.(e.target.value)}
								placeholder="Enter new password (min 8 characters)"
								style={{
									width: "100%",
									padding: 10,
									paddingRight: 40,
									borderRadius: 8,
									border: "1.5px solid #bfc2d9",
									fontSize: 14,
									boxSizing: "border-box",
								}}
								required
							/>
							<button
								type="button"
								style={{
									position: "absolute",
									right: 12,
									top: 10,
									background: "none",
									border: "none",
									color: "#2563eb",
									fontWeight: 600,
									cursor: "pointer",
									fontSize: 13,
								}}
								onClick={() => setShowNewPasswordField?.((v) => !v)}
							>
								{showNewPasswordField ? "Hide" : "Show"}
							</button>
						</div>

						<label
							htmlFor="change-password-confirm"
							style={{
								fontWeight: 600,
								fontSize: 13,
								display: "block",
								marginBottom: 6,
							}}
						>
							Confirm Password
						</label>
						<div style={{ position: "relative" }}>
							<input
								id="change-password-confirm"
								type={showConfirmPasswordField ? "text" : "password"}
								value={changePasswordConfirmPassword}
								onChange={(e) =>
									setChangePasswordConfirmPassword?.(e.target.value)
								}
								placeholder="Confirm new password"
								style={{
									width: "100%",
									padding: 10,
									paddingRight: 40,
									borderRadius: 8,
									border: "1.5px solid #bfc2d9",
									fontSize: 14,
									boxSizing: "border-box",
								}}
								required
							/>
							<button
								type="button"
								style={{
									position: "absolute",
									right: 12,
									top: 10,
									background: "none",
									border: "none",
									color: "#2563eb",
									fontWeight: 600,
									cursor: "pointer",
									fontSize: 13,
								}}
								onClick={() => setShowConfirmPasswordField?.((v) => !v)}
							>
								{showConfirmPasswordField ? "Hide" : "Show"}
							</button>
						</div>
					</div>

					<button
						type="submit"
						style={{
							background: "#2563eb",
							color: "#fff",
							border: "none",
							borderRadius: 8,
							padding: "10px 0",
							fontWeight: 600,
							fontSize: 16,
							width: "100%",
							marginBottom: 8,
							cursor: "pointer",
						}}
					>
						Update Password
					</button>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "#f3f4f6",
							color: "#666",
							border: "none",
							borderRadius: 8,
							padding: "10px 0",
							fontWeight: 600,
							fontSize: 14,
							width: "100%",
							cursor: "pointer",
						}}
					>
						Cancel
					</button>
				</form>
			</div>
		</div>
	);
};

export default ChangePasswordModal;
