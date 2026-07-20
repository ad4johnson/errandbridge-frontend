const AccountSettingsModal = ({
	open,
	onClose,
	onSubmit,
	editFirstName,
	editLastName,
	editEmail,
	setEditEmail,
	editPhone,
	setEditPhone,
	editAddress,
	setEditAddress,
	editCity,
	setEditCity,
	editCountry,
	setEditCountry,
	editPostcode,
	setEditPostcode,
	onChangePassword,
	onDeactivate,
	onStartOnboarding,
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
				aria-label="Close settings"
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
				<h3 style={{ fontWeight: 700, fontSize: 22, marginBottom: 6 }}>
					⚙️ Account Settings
				</h3>
				<p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
					Update your account information and security
				</p>
				<form onSubmit={onSubmit}>
					<div style={{ marginBottom: 12 }}>
						<label
							htmlFor="settings-first-name"
							style={{ fontWeight: 600, fontSize: 13 }}
						>
							First Name
						</label>
						<input
							id="settings-first-name"
							type="text"
							value={editFirstName}
							readOnly
							style={{
								width: "100%",
								marginBottom: 8,
								padding: 8,
								borderRadius: 8,
								border: "1.5px solid #bfc2d9",
								fontSize: 14,
								boxSizing: "border-box",
								backgroundColor: "#f3f4f6",
								color: "#666",
								cursor: "not-allowed",
							}}
						/>
						<label
							htmlFor="settings-last-name"
							style={{ fontWeight: 600, fontSize: 13 }}
						>
							Last Name
						</label>
						<input
							id="settings-last-name"
							type="text"
							value={editLastName}
							readOnly
							style={{
								width: "100%",
								marginBottom: 8,
								padding: 8,
								borderRadius: 8,
								border: "1.5px solid #bfc2d9",
								fontSize: 14,
								boxSizing: "border-box",
								backgroundColor: "#f3f4f6",
								color: "#666",
								cursor: "not-allowed",
							}}
						/>
						<label
							htmlFor="settings-email"
							style={{ fontWeight: 600, fontSize: 13 }}
						>
							Email
						</label>
						<input
							id="settings-email"
							type="email"
							value={editEmail}
							onChange={(e) => setEditEmail?.(e.target.value)}
							style={{
								width: "100%",
								marginBottom: 8,
								padding: 8,
								borderRadius: 8,
								border: "1.5px solid #bfc2d9",
								fontSize: 14,
								boxSizing: "border-box",
							}}
							required
						/>
						<label
							htmlFor="settings-phone"
							style={{ fontWeight: 600, fontSize: 13 }}
						>
							Phone
						</label>
						<input
							id="settings-phone"
							type="tel"
							value={editPhone}
							onChange={(e) => setEditPhone?.(e.target.value)}
							style={{
								width: "100%",
								marginBottom: 8,
								padding: 8,
								borderRadius: 8,
								border: "1.5px solid #bfc2d9",
								fontSize: 14,
								boxSizing: "border-box",
							}}
						/>
						<label
							htmlFor="settings-address"
							style={{ fontWeight: 600, fontSize: 13 }}
						>
							Address
						</label>
						<input
							id="settings-address"
							type="text"
							value={editAddress}
							onChange={(e) => setEditAddress?.(e.target.value)}
							style={{
								width: "100%",
								marginBottom: 8,
								padding: 8,
								borderRadius: 8,
								border: "1.5px solid #bfc2d9",
								fontSize: 14,
								boxSizing: "border-box",
							}}
							placeholder="Street address"
						/>
						<label
							htmlFor="settings-city"
							style={{ fontWeight: 600, fontSize: 13 }}
						>
							City
						</label>
						<input
							id="settings-city"
							type="text"
							value={editCity}
							onChange={(e) => setEditCity?.(e.target.value)}
							style={{
								width: "100%",
								marginBottom: 8,
								padding: 8,
								borderRadius: 8,
								border: "1.5px solid #bfc2d9",
								fontSize: 14,
								boxSizing: "border-box",
							}}
							required
						/>
						<label
							htmlFor="settings-country"
							style={{ fontWeight: 600, fontSize: 13 }}
						>
							Country
						</label>
						<input
							id="settings-country"
							type="text"
							value={editCountry}
							onChange={(e) => setEditCountry?.(e.target.value)}
							style={{
								width: "100%",
								marginBottom: 8,
								padding: 8,
								borderRadius: 8,
								border: "1.5px solid #bfc2d9",
								fontSize: 14,
								boxSizing: "border-box",
							}}
							required
						/>
						<label
							htmlFor="settings-postcode"
							style={{ fontWeight: 600, fontSize: 13 }}
						>
							Zip/Postcode
						</label>
						<input
							id="settings-postcode"
							type="text"
							value={editPostcode}
							onChange={(e) => setEditPostcode?.(e.target.value)}
							style={{
								width: "100%",
								marginBottom: 12,
								padding: 8,
								borderRadius: 8,
								border: "1.5px solid #bfc2d9",
								fontSize: 14,
								boxSizing: "border-box",
							}}
							required
						/>
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
						💾 Save Changes
					</button>
				</form>
				{onStartOnboarding && (
					<div
						style={{
							marginTop: 4,
							marginBottom: 12,
							padding: 12,
							borderRadius: 10,
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
						}}
					>
						<div style={{ fontWeight: 600, marginBottom: 6, color: "#1f2937" }}>
							🧭 Quick Tour
						</div>
						<p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#64748b" }}>
							Replay the guided tour to refresh the main sections anytime.
						</p>
						<button
							type="button"
							onClick={onStartOnboarding}
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
							Start tour
						</button>
					</div>
				)}
				<button
					type="button"
					onClick={onChangePassword}
					style={{
						background: "#f3f4f6",
						color: "#2563eb",
						border: "none",
						borderRadius: 8,
						padding: "10px 0",
						fontWeight: 600,
						fontSize: 14,
						width: "100%",
						marginBottom: 8,
						cursor: "pointer",
					}}
				>
					🔐 Change Password
				</button>
				<button
					type="button"
					onClick={onDeactivate}
					style={{
						background: "#fee2e2",
						color: "#dc2626",
						border: "none",
						borderRadius: 8,
						padding: "10px 0",
						fontWeight: 600,
						fontSize: 14,
						width: "100%",
						cursor: "pointer",
					}}
				>
					🗑️ Deactivate Account
				</button>
			</div>
		</div>
	);
};

export default AccountSettingsModal;
