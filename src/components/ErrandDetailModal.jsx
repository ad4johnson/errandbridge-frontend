import { useEffect, useMemo, useRef } from "react";

import ModalPortal from "./ModalPortal";
import { acquireBodyScrollLock } from "../utils/scrollLock";
import cache from "../utils/cache";

const ErrandDetailModal = ({
	selectedErrandDetail,
	selectedErrandAttachments,
	onClose,
	onAssign,
	onApprove,
	onComplete,
	onPreviewFile,
	apiBaseUrl,
	buildDescriptionItems,
}) => {
	const isOpen = Boolean(selectedErrandDetail);
	const contentRef = useRef(null);
	const viewportWidth =
		typeof window !== "undefined" ? window.innerWidth : 1200;
	const isMobileSheet = viewportWidth < 768;

	const resetKey = useMemo(
		() => String(selectedErrandDetail?.id ?? ""),
		[selectedErrandDetail?.id],
	);

	useEffect(() => {
		if (!isOpen) return undefined;
		const release = acquireBodyScrollLock();
		return release;
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return undefined;
		if (!contentRef.current) return;
		const id = window.requestAnimationFrame(() => {
			if (contentRef.current) contentRef.current.scrollTop = 0;
		});
		return () => window.cancelAnimationFrame(id);
	}, [isOpen, resetKey]);

	useEffect(() => {
		if (!isOpen) return undefined;
		const onKeyDown = (event) => {
			if (event.key === "Escape") onClose?.();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const formatMaybeDate = (value) => {
		if (!value) return "-";
		const dt = new Date(value);
		if (!Number.isFinite(dt.getTime())) return "-";
		return dt.toLocaleString();
	};

	const customerName =
		selectedErrandDetail.customer_name ||
		selectedErrandDetail.customer?.name ||
		selectedErrandDetail.customer?.full_name ||
		[selectedErrandDetail.customer_first_name, selectedErrandDetail.customer_last_name]
			.filter(Boolean)
			.join(" ") ||
		"Not available";
	const customerEmail =
		selectedErrandDetail.customer_email ||
		selectedErrandDetail.customer?.email ||
		"Not available";
	const customerPhone =
		selectedErrandDetail.customer_phone ||
		selectedErrandDetail.customer?.phone ||
		selectedErrandDetail.customer?.contact ||
		"Not available";
	const customerRatingRaw =
		selectedErrandDetail.customer_rating ?? selectedErrandDetail.customer?.rating;
	const customerRating =
		typeof customerRatingRaw === "number" && Number.isFinite(customerRatingRaw)
			? customerRatingRaw
			: null;

	return (
		<ModalPortal>
			<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				background: "rgba(0,0,0,0.6)",
				zIndex: 1100,
				display: "flex",
				alignItems: isMobileSheet ? "flex-end" : "center",
				justifyContent: "center",
				overflow: "hidden",
				padding: isMobileSheet ? 0 : 14,
			}}
		>
			<button
				type="button"
				aria-label="Close errand detail"
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
				ref={contentRef}
				style={{
					background: "#fff",
					borderRadius: isMobileSheet ? "24px 24px 0 0" : 14,
					padding: isMobileSheet ? 18 : 20,
					width: "100%",
					maxWidth: isMobileSheet ? "100%" : 640,
					boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
					position: "relative",
					boxSizing: "border-box",
					zIndex: 1,
					maxHeight: isMobileSheet ? "calc(100vh - 72px)" : "calc(100vh - 28px)",
					overflowY: "auto",
				}}
			>
				{/* Close Button */}
				<button
					type="button"
					onClick={onClose}
					style={{
						position: "absolute",
						top: 12,
						right: 12,
						background: "none",
						border: "none",
						fontSize: 24,
						cursor: "pointer",
						color: "#999",
						transition: "color 0.2s",
					}}
					onMouseEnter={(e) => {
						e.target.style.color = "#333";
					}}
					onMouseLeave={(e) => {
						e.target.style.color = "#999";
					}}
				>
					✕
				</button>

				{/* Header */}
				<div
					style={{
						marginBottom: 16,
						paddingBottom: 12,
						borderBottom: "2px solid #e5e7eb",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-start",
							gap: 12,
							marginBottom: 8,
						}}
					>
						<h2
							style={{
								fontSize: 20,
								fontWeight: 700,
								color: "#1f2937",
								margin: 0,
							}}
						>
							{selectedErrandDetail.title}
						</h2>
						<span
							style={{
								display: "inline-block",
								padding: "6px 12px",
								borderRadius: 6,
								fontSize: 12,
								fontWeight: 600,
								whiteSpace: "nowrap",
								background:
									selectedErrandDetail.status === "pending"
										? "#e0e7ff"
										: selectedErrandDetail.status === "submitted"
											? "#dbeafe"
											: selectedErrandDetail.status === "assigned"
												? "#d1fae5"
												: selectedErrandDetail.status === "completed"
													? "#dcfce7"
													: "#fee2e2",
								color:
									selectedErrandDetail.status === "pending"
										? "#312e81"
										: selectedErrandDetail.status === "submitted"
											? "#0c4a6e"
											: selectedErrandDetail.status === "assigned"
												? "#065f46"
												: selectedErrandDetail.status === "completed"
													? "#166534"
													: "#991b1b",
							}}
						>
							{selectedErrandDetail.status?.toUpperCase()}
						</span>
					</div>
					<p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 8px 0" }}>
						<strong>Ref:</strong>{" "}
						{selectedErrandDetail.reference_number ||
							`#${selectedErrandDetail.id}`}
					</p>
					<p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
						<strong>Created:</strong>{" "}
						{formatMaybeDate(selectedErrandDetail.created_at)}
					</p>
				</div>

				{/* Locations */}
				<div style={{ marginBottom: 16 }}>
					<h3
						style={{
							fontSize: 14,
							fontWeight: 600,
							color: "#374151",
							marginBottom: 10,
							margin: "0 0 10px 0",
						}}
					>
						📍 Locations
					</h3>
					<div style={{ display: "grid", gap: 8 }}>
						<div
							style={{
								background: "#f3f4f6",
								padding: 10,
								borderRadius: 8,
								borderLeft: "4px solid #3b82f6",
							}}
						>
							<p
								style={{
									fontSize: 12,
									fontWeight: 600,
									color: "#6b7280",
									margin: "0 0 4px 0",
									textTransform: "uppercase",
								}}
							>
								Starting Point
							</p>
							<p style={{ fontSize: 13, color: "#1f2937", margin: 0 }}>
								{selectedErrandDetail.pickup_location || "Not specified"}
							</p>
						</div>
						<div
							style={{
								background: "#f3f4f6",
								padding: 10,
								borderRadius: 8,
								borderLeft: "4px solid #10b981",
							}}
						>
							<p
								style={{
									fontSize: 12,
									fontWeight: 600,
									color: "#6b7280",
									margin: "0 0 4px 0",
									textTransform: "uppercase",
								}}
							>
								Ending Point
							</p>
							<p style={{ fontSize: 13, color: "#1f2937", margin: 0 }}>
								{String(selectedErrandDetail.dropoff_location || "").trim()
									? selectedErrandDetail.dropoff_location
									: "Not provided"}
							</p>
						</div>
					</div>
				</div>

				{/* Pricing & Distance */}
				<div style={{ marginBottom: 16 }}>
					<h3
						style={{
							fontSize: 14,
							fontWeight: 600,
							color: "#374151",
							marginBottom: 10,
							margin: "0 0 10px 0",
						}}
					>
						💰 Pricing & Distance
					</h3>
					<div
						style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
					>
						<div
							style={{ background: "#f3f4f6", padding: 10, borderRadius: 8 }}
						>
							<p
								style={{
									fontSize: 12,
									fontWeight: 600,
									color: "#6b7280",
									margin: "0 0 4px 0",
								}}
							>
								Amount
							</p>
							<p
								style={{
									fontSize: 15,
									fontWeight: 700,
									color: "#059669",
									margin: 0,
								}}
							>
								₦
								{selectedErrandDetail.amount
									? selectedErrandDetail.amount.toLocaleString()
									: "TBD"}
							</p>
						</div>
						<div
							style={{ background: "#f3f4f6", padding: 10, borderRadius: 8 }}
						>
							<p
								style={{
									fontSize: 12,
									fontWeight: 600,
									color: "#6b7280",
									margin: "0 0 4px 0",
								}}
							>
								Distance
							</p>
							<p
								style={{
									fontSize: 15,
									fontWeight: 700,
									color: "#0891b2",
									margin: 0,
								}}
							>
								{selectedErrandDetail.distance_km
									? `${selectedErrandDetail.distance_km} km`
									: "TBD"}
							</p>
						</div>
					</div>
				</div>

				{/* Customer Information */}
				<div style={{ marginBottom: 16 }}>
					<h3
						style={{
							fontSize: 14,
							fontWeight: 600,
							color: "#374151",
							marginBottom: 10,
							margin: "0 0 10px 0",
						}}
					>
						👤 Customer Information
					</h3>
					<div
						style={{
							background: "#f9fafb",
							padding: 12,
							borderRadius: 8,
							border: "1px solid #e5e7eb",
						}}
					>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 10,
							}}
						>
							<div>
								<p
									style={{
										fontSize: 12,
										fontWeight: 600,
										color: "#6b7280",
										margin: "0 0 4px 0",
									}}
								>
									Name
								</p>
								<p style={{ fontSize: 13, color: "#1f2937", margin: 0 }}>
									{customerName}
								</p>
							</div>
							<div>
								<p
									style={{
										fontSize: 12,
										fontWeight: 600,
										color: "#6b7280",
										margin: "0 0 4px 0",
									}}
								>
									Email
								</p>
								<p style={{ fontSize: 13, color: "#1f2937", margin: 0 }}>
									{customerEmail}
								</p>
							</div>
							<div>
								<p
									style={{
										fontSize: 12,
										fontWeight: 600,
										color: "#6b7280",
										margin: "0 0 4px 0",
									}}
								>
									Contact
								</p>
								<p style={{ fontSize: 13, color: "#1f2937", margin: 0 }}>
									{customerPhone}
								</p>
							</div>
							<div>
								<p
									style={{
										fontSize: 12,
										fontWeight: 600,
										color: "#6b7280",
										margin: "0 0 4px 0",
									}}
								>
									Rating
								</p>
								<p style={{ fontSize: 13, color: "#1f2937", margin: 0 }}>
									⭐ {customerRating ? customerRating.toFixed(1) : "New customer"}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Pilot Assignment (if assigned) */}
				{selectedErrandDetail.status === "assigned" &&
					selectedErrandDetail.assigned_to && (
						<div
							style={{
								marginBottom: 20,
								background: "#ecfdf5",
								padding: 14,
								borderRadius: 8,
								borderLeft: "4px solid #10b981",
							}}
						>
							<h3
								style={{
									fontSize: 14,
									fontWeight: 600,
									color: "#065f46",
									margin: "0 0 10px 0",
								}}
							>
								✅ Assigned To
							</h3>
							<div style={{ display: "grid", gap: 8 }}>
								<p style={{ fontSize: 13, color: "#047857", margin: 0 }}>
									<strong>Pilot ID:</strong> {selectedErrandDetail.assigned_to}
								</p>
								<p style={{ fontSize: 13, color: "#047857", margin: 0 }}>
									<strong>Assigned At:</strong>{" "}
									{selectedErrandDetail.assigned_at
										? new Date(
												selectedErrandDetail.assigned_at,
											).toLocaleString()
										: "N/A"}
								</p>
							</div>
						</div>
					)}

				{/* Notes */}
				{selectedErrandDetail.note && (
					<div style={{ marginBottom: 16 }}>
						<h3
							style={{
								fontSize: 14,
								fontWeight: 600,
								color: "#374151",
								marginBottom: 8,
								margin: "0 0 8px 0",
							}}
						>
							📝 Notes
						</h3>
						<ul
							style={{
								margin: 0,
								padding: "12px 14px",
								paddingLeft: 30,
								fontSize: 13,
								color: "#f8fafc",
								background:
									"linear-gradient(135deg, #5b8cff 0%, #7c3aed 55%, #4c1d95 100%)",
								borderRadius: 14,
								borderLeft: "4px solid #c4b5fd",
								lineHeight: 1.55,
								boxShadow: "0 14px 28px rgba(99, 102, 241, 0.35)",
								fontWeight: 600,
								textShadow: "0 1px 6px rgba(15, 23, 42, 0.25)",
							}}
						>
							{buildDescriptionItems(selectedErrandDetail.note).map((item) => (
								<li key={`admin-note-${item}`}>{item}</li>
							))}
						</ul>
					</div>
				)}

				{/* Attachments Section */}
				{selectedErrandAttachments && selectedErrandAttachments.length > 0 && (
					<div style={{ marginBottom: 20 }}>
						<h3
							style={{
								fontSize: 14,
								fontWeight: 600,
								color: "#374151",
								marginBottom: 8,
								margin: "0 0 8px 0",
							}}
						>
							📎 Attachments ({selectedErrandAttachments.length})
						</h3>
						<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
							{selectedErrandAttachments.map((attachment) => (
								<div
									key={attachment.id || attachment.original_filename}
									style={{
										padding: 12,
										background: "#eff6ff",
										border: "1px solid #bfdbfe",
										borderRadius: 6,
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}
								>
									<div style={{ flex: 1 }}>
										<p
											style={{
												margin: "0 0 4px 0",
												fontSize: 13,
												fontWeight: 600,
												color: "#1e40af",
											}}
										>
											📄{" "}
											{attachment.original_filename ||
												attachment.filename ||
												"File"}
										</p>
										{attachment.size_bytes && (
											<p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
												Size: {(attachment.size_bytes / 1024).toFixed(2)} KB
											</p>
										)}
										{attachment.content_type && (
											<p
												style={{
													margin: "4px 0 0 0",
													fontSize: 12,
													color: "#64748b",
												}}
											>
												Type: {attachment.content_type}
											</p>
										)}
									</div>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 8,
											marginLeft: 12,
										}}
									>
										<button
											type="button"
											onClick={async () => {
												try {
													const token =
														localStorage.getItem("authToken") ||
														cache.getAuthToken();
													const response = await fetch(
														`${apiBaseUrl}/admin/attachments/${attachment.id}/download`,
														{
															headers: {
																Authorization: `Bearer ${token}`,
															},
														},
													);
													if (response.ok) {
														const blob = await response.blob();
														const resolvedName =
															attachment.original_filename ||
															attachment.filename ||
															"attachment";
														if (typeof onPreviewFile === "function") {
															onPreviewFile({
															blob,
															filename: resolvedName,
															title: resolvedName,
														});
														} else {
															const url = window.URL.createObjectURL(blob);
															const link = document.createElement("a");
															link.href = url;
															link.download = resolvedName;
															document.body.appendChild(link);
															link.click();
															window.URL.revokeObjectURL(url);
															document.body.removeChild(link);
														}
													} else {
														alert("Failed to open file");
													}
												} catch (err) {
													console.error("View error:", err);
													alert("Error opening file");
												}
											}}
											style={{
												padding: "6px 12px",
												background: "#0ea5e9",
												color: "#fff",
												border: "none",
												borderRadius: 4,
												fontSize: 12,
												fontWeight: 500,
												cursor: "pointer",
												whiteSpace: "nowrap",
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = "#0284c7";
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = "#0ea5e9";
											}}
										>
											👁️ View
										</button>
										<button
											type="button"
											onClick={async () => {
												try {
													const token =
														localStorage.getItem("authToken") ||
														cache.getAuthToken();
													const response = await fetch(
														`${apiBaseUrl}/admin/attachments/${attachment.id}/download`,
														{
															headers: {
																Authorization: `Bearer ${token}`,
															},
														},
													);
													if (response.ok) {
														const blob = await response.blob();
														const url = window.URL.createObjectURL(blob);
														const link = document.createElement("a");
														link.href = url;
														link.download =
															attachment.original_filename || "download";
														document.body.appendChild(link);
														link.click();
														window.URL.revokeObjectURL(url);
														document.body.removeChild(link);
													} else {
														alert("Failed to download file");
													}
												} catch (err) {
													console.error("Download error:", err);
													alert("Error downloading file");
												}
											}}
											style={{
												padding: "6px 12px",
												background: "#3b82f6",
												color: "#fff",
												border: "none",
												borderRadius: 4,
												fontSize: 12,
												fontWeight: 500,
												cursor: "pointer",
												whiteSpace: "nowrap",
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = "#2563eb";
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = "#3b82f6";
											}}
										>
											⬇️ Download
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Action Buttons */}
				<div
					style={{
						display: "flex",
						gap: 10,
						paddingTop: 16,
						borderTop: "1px solid #e5e7eb",
						marginTop: 20,
					}}
				>
					<button
						type="button"
						onClick={onClose}
						style={{
							flex: 1,
							padding: "10px 16px",
							fontSize: 14,
							background: "#f3f4f6",
							border: "1px solid #d1d5db",
							borderRadius: 6,
							cursor: "pointer",
							fontWeight: 600,
							color: "#374151",
							transition: "all 0.2s",
						}}
						onMouseEnter={(e) => {
							e.target.style.background = "#e5e7eb";
						}}
						onMouseLeave={(e) => {
							e.target.style.background = "#f3f4f6";
						}}
					>
						Close
					</button>
					{(selectedErrandDetail.status === "pending" ||
						selectedErrandDetail.status === "submitted") && (
						<button
							type="button"
							onClick={() => onAssign(selectedErrandDetail.id)}
							style={{
								flex: 1,
								padding: "10px 16px",
								fontSize: 14,
								background: "#3b82f6",
								border: "none",
								borderRadius: 6,
								cursor: "pointer",
								fontWeight: 600,
								color: "#fff",
								transition: "all 0.2s",
							}}
							onMouseEnter={(e) => {
								e.target.style.background = "#2563eb";
							}}
							onMouseLeave={(e) => {
								e.target.style.background = "#3b82f6";
							}}
						>
							Assign Errand
						</button>
					)}
					{(selectedErrandDetail.status === "assigned" ||
						selectedErrandDetail.status === "approved") && (
						<>
							<button
								type="button"
								onClick={() => onApprove(selectedErrandDetail.id)}
								style={{
									flex: 1,
									padding: "10px 16px",
									fontSize: 14,
									background: "#10b981",
									border: "none",
									borderRadius: 6,
									cursor: "pointer",
									fontWeight: 600,
									color: "#fff",
									transition: "all 0.2s",
								}}
								onMouseEnter={(e) => {
									e.target.style.background = "#059669";
								}}
								onMouseLeave={(e) => {
									e.target.style.background = "#10b981";
								}}
							>
								Approve
							</button>
							<button
								type="button"
								onClick={() => onComplete(selectedErrandDetail.id)}
								style={{
									flex: 1,
									padding: "10px 16px",
									fontSize: 14,
									background: "#ef4444",
									border: "none",
									borderRadius: 6,
									cursor: "pointer",
									fontWeight: 600,
									color: "#fff",
									transition: "all 0.2s",
								}}
								onMouseEnter={(e) => {
									e.target.style.background = "#dc2626";
								}}
								onMouseLeave={(e) => {
									e.target.style.background = "#ef4444";
								}}
							>
								Complete
							</button>
						</>
					)}
				</div>
			</div>
		</div>
		</ModalPortal>
	);
};

export default ErrandDetailModal;
