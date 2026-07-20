const EditErrandModal = ({
	open,
	editFormData,
	setEditFormData,
	onClose,
	onSave,
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
				background: "rgba(15, 23, 42, 0.4)",
				zIndex: 2000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				overflow: "auto",
				padding: "20px",
			}}
		>
			<button
				type="button"
				aria-label="Close edit errand"
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
					borderRadius: 22,
					padding: "34px 24px 32px 24px",
					width: "100%",
					maxWidth: 720,
					maxHeight: "calc(100vh - 48px)",
					overflowY: "auto",
					boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2)",
					position: "relative",
					margin: "auto",
					boxSizing: "border-box",
					border: "1px solid #e2e8f0",
					zIndex: 1,
				}}
			>
				<button
					type="button"
					onClick={onClose}
					style={{
						position: "absolute",
						top: 16,
						right: 18,
						background: "#f1f5f9",
						border: "none",
						fontSize: 22,
						cursor: "pointer",
						color: "#475569",
						fontWeight: 700,
						borderRadius: "50%",
						width: 36,
						height: 36,
						lineHeight: "36px",
						textAlign: "center",
						transition: "background 0.2s",
					}}
					onMouseOver={(e) => {
						e.currentTarget.style.background = "#e2e8f0";
					}}
					onMouseOut={(e) => {
						e.currentTarget.style.background = "#f1f5f9";
					}}
					onFocus={(e) => {
						e.currentTarget.style.background = "#e2e8f0";
					}}
					onBlur={(e) => {
						e.currentTarget.style.background = "#f1f5f9";
					}}
					aria-label="Close edit dialog"
				>
					&times;
				</button>

				<div
					style={{
						borderRadius: 16,
						padding: "12px 16px",
						background: "linear-gradient(135deg, #2563eb 0%, #22c55e 100%)",
						color: "#fff",
						fontWeight: 800,
						fontSize: 20,
						marginBottom: 24,
						display: "flex",
						alignItems: "center",
						gap: 8,
						boxShadow: "0 10px 18px rgba(37, 99, 235, 0.2)",
					}}
				>
					✏️ Edit Errand
				</div>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr",
						gap: 16,
						marginBottom: 24,
					}}
				>
					<div
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 12,
						}}
					>
						<label
							htmlFor="edit-errand-title"
							style={{
								fontWeight: 600,
								fontSize: 13,
								color: "#2563eb",
								marginBottom: 6,
								display: "block",
							}}
						>
							📝 Title *
						</label>
						<input
							id="edit-errand-title"
							type="text"
							value={editFormData.title || ""}
							onChange={(e) =>
								setEditFormData({ ...editFormData, title: e.target.value })
							}
							placeholder="Enter errand title"
							style={{
								width: "100%",
								padding: "10px 12px",
								border: "1.5px solid #bfc2d9",
								borderRadius: 8,
								fontSize: 14,
								fontFamily: "inherit",
								boxSizing: "border-box",
							}}
						/>
					</div>

					<div
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 12,
						}}
					>
						<label
							htmlFor="edit-errand-description"
							style={{
								fontWeight: 600,
								fontSize: 13,
								color: "#2563eb",
								marginBottom: 6,
								display: "block",
							}}
						>
							📋 Description
						</label>
						<textarea
							id="edit-errand-description"
							value={editFormData.note || ""}
							onChange={(e) =>
								setEditFormData({ ...editFormData, note: e.target.value })
							}
							placeholder="Enter errand details"
							rows={6}
							style={{
								width: "100%",
								padding: "10px 12px",
								border: "1.5px solid #bfc2d9",
								borderRadius: 8,
								fontSize: 14,
								lineHeight: 1.45,
								fontFamily: "inherit",
								boxSizing: "border-box",
								minHeight: 140,
								maxHeight: 420,
								resize: "vertical",
								overflow: "auto",
							}}
						/>
					</div>

					<div
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 12,
						}}
					>
						<label
							htmlFor="edit-errand-pickup"
							style={{
								fontWeight: 600,
								fontSize: 13,
								color: "#2563eb",
								marginBottom: 6,
								display: "block",
							}}
						>
							📍 Starting Point *
						</label>
						<input
							id="edit-errand-pickup"
							type="text"
							value={editFormData.pickupLocation || ""}
							onChange={(e) =>
								setEditFormData({
									...editFormData,
									pickupLocation: e.target.value,
								})
							}
							placeholder="Enter starting point"
							style={{
								width: "100%",
								padding: "10px 12px",
								border: "1.5px solid #bfc2d9",
								borderRadius: 8,
								fontSize: 14,
								fontFamily: "inherit",
								boxSizing: "border-box",
							}}
						/>
					</div>

					<div
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 12,
						}}
					>
						<label
							htmlFor="edit-errand-dropoff"
							style={{
								fontWeight: 600,
								fontSize: 13,
								color: "#2563eb",
								marginBottom: 6,
								display: "block",
							}}
						>
							🎯 Ending Point (optional)
						</label>
						<input
							id="edit-errand-dropoff"
							type="text"
							value={editFormData.dropoffLocation || ""}
							onChange={(e) =>
								setEditFormData({
									...editFormData,
									dropoffLocation: e.target.value,
								})
							}
							placeholder="Enter ending point (optional)"
							style={{
								width: "100%",
								padding: "10px 12px",
								border: "1.5px solid #bfc2d9",
								borderRadius: 8,
								fontSize: 14,
								fontFamily: "inherit",
								boxSizing: "border-box",
							}}
						/>
					</div>

					<div
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 12,
						}}
					>
						<label
							htmlFor="edit-errand-template"
							style={{
								fontWeight: 600,
								fontSize: 13,
								color: "#2563eb",
								marginBottom: 6,
								display: "block",
							}}
						>
							🏷️ Template
						</label>
						<select
							id="edit-errand-template"
							value={
								editFormData.template || "Official Document / Office Pickup"
							}
							onChange={(e) =>
								setEditFormData({ ...editFormData, template: e.target.value })
							}
							style={{
								width: "100%",
								padding: "10px 12px",
								border: "1.5px solid #bfc2d9",
								borderRadius: 8,
								fontSize: 14,
								fontFamily: "inherit",
								boxSizing: "border-box",
							}}
						>
							<option>Official Document / Office Pickup</option>
							<option>Bank Transaction</option>
							<option>Medical / Pharmacy Pickup</option>
							<option>Government Office / Immigration</option>
							<option>Hotel / Hospitality</option>
							<option>International Parcel</option>
							<option>Legal / Notary</option>
							<option>Corporate Logistics</option>
							<option value="Personal Delivery">Personal Errand</option>
							<option>Mystery Shopper</option>
							<option>Grocery / Market Run</option>
							<option>Food Order Pickup</option>
							<option>Laundry / Dry Cleaning</option>
							<option>Electronics / Repair Pickup</option>
							<option>School / Campus Errand</option>
							<option value="Event / Gift Dropoff">Event / Gift Hand-off</option>
							<option>Construction / Hardware Supplies</option>
							<option>Home Services / Repairs</option>
							<option>Pet Care / Vet Pickup</option>
							<option>Travel / Airport Assistance</option>
							<option>Office Supplies Run</option>
							<option>Courier / Document Delivery</option>
							<option>Suggested Template</option>
							<option>Other</option>
						</select>
					</div>

					<div
						style={{
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 12,
							padding: 12,
						}}
					>
						<label
							htmlFor="edit-errand-sensitivity"
							style={{
								fontWeight: 600,
								fontSize: 13,
								color: "#2563eb",
								marginBottom: 6,
								display: "block",
							}}
						>
							⚠️ Sensitivity
						</label>
						<select
							id="edit-errand-sensitivity"
							value={
								editFormData.sensitivity ||
								"Sensitive (documents, money, medicine)"
							}
							onChange={(e) =>
								setEditFormData({
									...editFormData,
									sensitivity: e.target.value,
								})
							}
							style={{
								width: "100%",
								padding: "10px 12px",
								border: "1.5px solid #bfc2d9",
								borderRadius: 8,
								fontSize: 14,
								fontFamily: "inherit",
								boxSizing: "border-box",
							}}
						>
							<option>Not Sensitive (general items)</option>
							<option>Moderately Sensitive (electronics, valuables)</option>
							<option>Sensitive (documents, money, medicine)</option>
							<option>Highly Sensitive (confidential, fragile)</option>
						</select>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						gap: 12,
						justifyContent: "flex-end",
						marginTop: 24,
					}}
				>
					<button
						type="button"
						onClick={onClose}
						style={{
							padding: "10px 20px",
							border: "1.5px solid #bfc2d9",
							background: "#fff",
							color: "#2563eb",
							borderRadius: 8,
							fontWeight: 600,
							cursor: "pointer",
							transition: "all 0.3s ease",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = "#f3f4f6";
							e.currentTarget.style.transform = "scale(1.02)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "#fff";
							e.currentTarget.style.transform = "scale(1)";
						}}
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onSave}
						style={{
							padding: "10px 20px",
							background: "#2563eb",
							color: "#fff",
							border: "none",
							borderRadius: 8,
							fontWeight: 600,
							cursor: "pointer",
							transition: "all 0.3s ease",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = "#1d4ed8";
							e.currentTarget.style.transform = "scale(1.05)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "#2563eb";
							e.currentTarget.style.transform = "scale(1)";
						}}
					>
						💾 Save Changes
					</button>
				</div>
			</div>
		</div>
	);
};

export default EditErrandModal;
