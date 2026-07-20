import { Suspense } from "react";

const normalizeStatusKey = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "_");

const sectionCardStyle = {
	background: "#ffffff",
	border: "1px solid rgba(226, 232, 240, 0.9)",
	borderRadius: 18,
	padding: 18,
	boxShadow: "0 16px 36px rgba(15, 23, 42, 0.08)",
};

const infoLabelStyle = {
	fontSize: 12,
	fontWeight: 700,
	letterSpacing: 0.2,
	textTransform: "uppercase",
	color: "#64748b",
};

const infoValueStyle = {
	fontSize: 15,
	fontWeight: 700,
	color: "#0f172a",
};

const getTrackingBannerMeta = ({ activeTrackingInfo, trackingAllowed, errand }) => {
	if (activeTrackingInfo?.loading) {
		return {
			label: "Checking live status",
			tone: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
			message: "We’re confirming whether the pilot has started live tracking for this errand.",
		};
	}

	const status = String(activeTrackingInfo?.status || errand?.status || "").toLowerCase();

	if (trackingAllowed) {
		return {
			label: "Live now",
			tone: { bg: "#ecfdf5", border: "#bbf7d0", text: "#15803d" },
			message: "Live updates are available. The map below will keep itself refreshed in realtime.",
		};
	}

	if (["completed", "delivered"].includes(status)) {
		return {
			label: "Completed",
			tone: { bg: "#f8fafc", border: "#cbd5e1", text: "#475569" },
			message: "This errand has been completed. You can still return to the errand details for proof and history.",
		};
	}

	if (["accepted", "assigned", "pending", "submitted"].includes(status)) {
		return {
			label: "Waiting for pilot",
			tone: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
			message:
				activeTrackingInfo?.reason ||
				"Tracking becomes available once the pilot starts the errand.",
		};
	}

	return {
		label: "Unavailable",
		tone: { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" },
		message:
			activeTrackingInfo?.reason ||
			activeTrackingInfo?.error ||
			"Tracking is not available for this errand yet.",
	};
};

export default function ClientTrackingPage({
	errand,
	errandsLoaded,
	errandId,
	activeTrackingInfo,
	trackingAllowed,
	refreshTrackingStatus,
	apiBaseUrl,
	PilotTracker,
	formatStatusLabel,
	onBack,
	onViewDetails,
}) {
	const trackingStatusKey = normalizeStatusKey(
		activeTrackingInfo?.status || errand?.status,
	);
	const liveMapLocked = ["completed", "accepted", "cancelled"].includes(
		trackingStatusKey,
	);
	const effectiveTrackingAllowed = Boolean(trackingAllowed) && !liveMapLocked;
	const closedReasonLabel = trackingStatusKey === "cancelled" ? "cancelled" : "completed";
	const statusLabel = formatStatusLabel?.(errand?.status || activeTrackingInfo?.status) || "Tracking";
	const reason = liveMapLocked
		? `Live map is disabled because this errand is already ${closedReasonLabel}.`
		: activeTrackingInfo?.reason ||
			activeTrackingInfo?.error ||
			"Tracking is not available for this errand yet.";
	const banner = getTrackingBannerMeta({
		activeTrackingInfo,
		trackingAllowed: effectiveTrackingAllowed,
		errand,
	});

	return (
		<section
			style={{
				width: "min(1120px, calc(100vw - 24px))",
				margin: "0 auto 32px",
				display: "grid",
				gap: 18,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 12,
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "grid", gap: 6 }}>
					<div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.2 }}>
						Live tracking
					</div>
					<h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, color: "#0f172a" }}>
						{errand?.title || `Errand #${errandId}`}
					</h1>
					<div style={{ fontSize: 14, color: "#475569" }}>
						Follow the pilot on a dedicated live map without reopening the details modal.
					</div>
				</div>
				<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={onBack}
						style={{
							padding: "10px 14px",
							borderRadius: 999,
							border: "1px solid rgba(148, 163, 184, 0.35)",
							background: "#ffffff",
							fontWeight: 700,
							color: "#0f172a",
							cursor: "pointer",
						}}
					>
						← Back
					</button>
					<button
						type="button"
						onClick={onViewDetails}
						style={{
							padding: "10px 14px",
							borderRadius: 999,
							border: "none",
							background: "#2563eb",
							fontWeight: 700,
							color: "#ffffff",
							cursor: "pointer",
						}}
					>
						View errand details
					</button>
				</div>
			</div>

			<div style={{ ...sectionCardStyle, display: "grid", gap: 14 }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
						flexWrap: "wrap",
						padding: "14px 16px",
						borderRadius: 14,
						background: banner.tone.bg,
						border: `1px solid ${banner.tone.border}`,
						color: banner.tone.text,
					}}
				>
					<div style={{ display: "grid", gap: 6 }}>
						<div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.2, textTransform: "uppercase" }}>
							{banner.label}
						</div>
						<div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>
							{banner.message}
						</div>
					</div>
					{!effectiveTrackingAllowed ? (
						<button
							type="button"
							onClick={onViewDetails}
							style={{
								padding: "8px 12px",
								borderRadius: 999,
								border: "none",
								background: "rgba(255,255,255,0.9)",
								fontWeight: 700,
								color: banner.tone.text,
								cursor: "pointer",
							}}
						>
							Open errand details
						</button>
					) : null}
				</div>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
						gap: 12,
					}}
				>
					<div style={{ display: "grid", gap: 4 }}>
						<span style={infoLabelStyle}>Status</span>
						<span style={infoValueStyle}>{statusLabel}</span>
					</div>
					<div style={{ display: "grid", gap: 4 }}>
						<span style={infoLabelStyle}>Reference</span>
						<span style={infoValueStyle}>{errand?.referenceNumber || `#${errandId}`}</span>
					</div>
					<div style={{ display: "grid", gap: 4 }}>
						<span style={infoLabelStyle}>Starting point</span>
						<span style={infoValueStyle}>{errand?.pickupLocation || "Loading starting point…"}</span>
					</div>
					<div style={{ display: "grid", gap: 4 }}>
						<span style={infoLabelStyle}>Ending point</span>
						<span style={infoValueStyle}>
							{errand
								? String(errand?.dropoffLocation || "").trim()
									? errand.dropoffLocation
									: "Not provided"
								: "Loading ending point…"}
						</span>
					</div>
				</div>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
					<div style={{ fontSize: 13, color: "#64748b" }}>
						{activeTrackingInfo?.loading
							? "Checking whether live tracking is available for this errand…"
							: effectiveTrackingAllowed
								? "Live updates are available. The map below will keep itself refreshed in realtime."
								: reason}
					</div>
					<button
						type="button"
						onClick={() => refreshTrackingStatus?.(errandId)}
						disabled={liveMapLocked}
						style={{
							padding: "8px 12px",
							borderRadius: 999,
							border: "1px solid rgba(99, 102, 241, 0.25)",
							background: "#eef2ff",
							fontWeight: 700,
							color: "#4338ca",
							cursor: liveMapLocked ? "not-allowed" : "pointer",
							opacity: liveMapLocked ? 0.65 : 1,
						}}
						title={
							liveMapLocked
								? `Tracking refresh is unavailable because this errand is already ${closedReasonLabel}.`
								: "Refresh tracking status"
						}
					>
						🔄 Refresh tracking status
					</button>
				</div>
			</div>

			{!errandsLoaded && !errand ? (
				<div style={sectionCardStyle}>Loading errand details…</div>
			) : null}

			{errandsLoaded && !errand ? (
				<div style={{ ...sectionCardStyle, color: "#475569" }}>
					We couldn’t find that errand in your current activity list. Try going back to the errand details page and reopening live tracking.
				</div>
			) : null}

			{effectiveTrackingAllowed ? (
				<div style={{ ...sectionCardStyle, padding: 0, overflow: "hidden" }}>
					<Suspense fallback={<div style={{ padding: 18, color: "#64748b" }}>Loading live map…</div>}>
						<PilotTracker errandId={errandId} apiBaseUrl={apiBaseUrl} isCustomer />
					</Suspense>
				</div>
			) : null}
		</section>
	);
}
