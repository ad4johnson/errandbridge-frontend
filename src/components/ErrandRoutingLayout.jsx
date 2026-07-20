import { motion } from "framer-motion";
import { Calculator, ClipboardList, CreditCard, Sparkles } from "lucide-react";

function formatLabel(value) {
	if (value === null || typeof value === "undefined") return "-";
	const text = String(value).trim();
	return text.length ? text : "-";
}

export default function ErrandRoutingLayout({
	children,
	pricingRegionLabel,
	sensitivityTierLabel,
	paymentAmountLabel,
	paymentOriginalAmountLabel,
	onOpenPricing,
	onOpenPayment,
	onOpenMyErrands,
	isMobile,
}) {
	const showSidebar = !isMobile;

	return (
		<div
			data-testid="client-ui-v2"
			style={{
				width: "100%",
				display: "grid",
				gap: 16,
			}}
		>
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.22, ease: "easeOut" }}
				style={{
					background:
						"linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(79, 70, 229, 0.05) 100%)",
					border: "1px solid rgba(37, 99, 235, 0.18)",
					borderRadius: 18,
					padding: isMobile ? "14px 14px" : "16px 18px",
					boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						gap: 12,
						flexWrap: "wrap",
					}}
				>
					<div style={{ minWidth: 220, flex: "1 1 260px" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
								flexWrap: "wrap",
							}}
						>
							<div
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									width: 38,
									height: 38,
									borderRadius: 999,
									background: "rgba(37, 99, 235, 0.14)",
									color: "#1d4ed8",
									flexShrink: 0,
								}}
								aria-hidden="true"
							>
								<Sparkles size={18} />
							</div>
							<div>
								<div
									style={{
										fontWeight: 950,
										fontSize: 16,
										color: "#0f172a",
									}}
								>
									Client request builder
								</div>
								<div
									style={{
										marginTop: 2,
										fontSize: 12,
										fontWeight: 800,
										color: "rgba(15, 23, 42, 0.62)",
									}}
								>
									UI v2 (feature flag)
								</div>
							</div>
						</div>
						<div
							style={{
								marginTop: 10,
								color: "rgba(15, 23, 42, 0.7)",
								fontSize: 13,
								lineHeight: 1.4,
							}}
						>
							You can keep using the current flow. This wrapper just lets us iterate on
							the layout safely.
						</div>
					</div>

					<div
						style={{
							display: "flex",
							gap: 10,
							flexWrap: "wrap",
							alignItems: "center",
							justifyContent: "flex-end",
							flex: "0 1 auto",
						}}
					>
						<button
							type="button"
							onClick={onOpenPricing}
							disabled={!onOpenPricing}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 8,
								background: "#fff",
								border: "1px solid rgba(148, 163, 184, 0.55)",
								borderRadius: 999,
								padding: "8px 12px",
								fontSize: 13,
								fontWeight: 900,
								color: "#0f172a",
								cursor: onOpenPricing ? "pointer" : "not-allowed",
								opacity: onOpenPricing ? 1 : 0.6,
							}}
						>
							<Calculator size={16} /> Pricing model
						</button>

						<button
							type="button"
							onClick={onOpenMyErrands}
							disabled={!onOpenMyErrands}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 8,
								background: "#fff",
								border: "1px solid rgba(148, 163, 184, 0.55)",
								borderRadius: 999,
								padding: "8px 12px",
								fontSize: 13,
								fontWeight: 900,
								color: "#0f172a",
								cursor: onOpenMyErrands ? "pointer" : "not-allowed",
								opacity: onOpenMyErrands ? 1 : 0.6,
							}}
						>
							<ClipboardList size={16} /> My errands
						</button>

						<button
							type="button"
							onClick={onOpenPayment}
							disabled={!onOpenPayment}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 8,
								background: "linear-gradient(90deg, #2563eb, #4f46e5)",
								border: "none",
								borderRadius: 999,
								padding: "9px 14px",
								fontSize: 13,
								fontWeight: 950,
								color: "#fff",
								cursor: onOpenPayment ? "pointer" : "not-allowed",
								opacity: onOpenPayment ? 1 : 0.6,
								boxShadow: "0 14px 32px rgba(37, 99, 235, 0.26)",
							}}
						>
							<CreditCard size={16} /> Payment
						</button>
					</div>
				</div>

				<div
					style={{
						marginTop: 12,
						display: "flex",
						gap: 12,
						flexWrap: "wrap",
						alignItems: "baseline",
					}}
				>
					<div
						style={{
							background: "rgba(255, 255, 255, 0.85)",
							border: "1px solid rgba(148, 163, 184, 0.35)",
							borderRadius: 999,
							padding: "6px 10px",
							fontSize: 12,
							fontWeight: 900,
							color: "rgba(15, 23, 42, 0.75)",
							display: "inline-flex",
							gap: 8,
							alignItems: "center",
						}}
					>
						<span>Region:</span>
						<span style={{ color: "#0f172a" }}>
							{formatLabel(pricingRegionLabel)}
						</span>
					</div>

					<div
						style={{
							background: "rgba(255, 255, 255, 0.85)",
							border: "1px solid rgba(148, 163, 184, 0.35)",
							borderRadius: 999,
							padding: "6px 10px",
							fontSize: 12,
							fontWeight: 900,
							color: "rgba(15, 23, 42, 0.75)",
							display: "inline-flex",
							gap: 8,
							alignItems: "center",
						}}
					>
						<span>Sensitivity:</span>
						<span style={{ color: "#0f172a" }}>
							{formatLabel(sensitivityTierLabel)}
						</span>
					</div>

					<div
						style={{
							background: "rgba(255, 255, 255, 0.85)",
							border: "1px solid rgba(148, 163, 184, 0.35)",
							borderRadius: 999,
							padding: "6px 10px",
							fontSize: 12,
							fontWeight: 900,
							color: "rgba(15, 23, 42, 0.75)",
							display: "inline-flex",
							gap: 8,
							alignItems: "center",
						}}
					>
						<span>Estimate:</span>
						<span style={{ color: "#0f172a" }}>
							{formatLabel(paymentAmountLabel)}
						</span>
						{paymentOriginalAmountLabel ? (
							<span
								style={{
									color: "rgba(15, 23, 42, 0.5)",
									textDecoration: "line-through",
									fontWeight: 800,
								}}
							>
								{formatLabel(paymentOriginalAmountLabel)}
							</span>
						) : null}
					</div>
				</div>
			</motion.div>

			<div
				style={{
					display: "grid",
					gap: 16,
					gridTemplateColumns: showSidebar ? "minmax(0, 1fr) 320px" : "1fr",
					alignItems: "start",
				}}
			>
				<div style={{ minWidth: 0 }}>{children}</div>

				{showSidebar ? (
					<aside
						style={{
							background: "#fff",
							border: "1px solid rgba(148, 163, 184, 0.35)",
							borderRadius: 18,
							padding: 14,
							boxShadow: "0 18px 40px rgba(15, 23, 42, 0.05)",
							display: "grid",
							gap: 10,
						}}
					>
						<div style={{ fontWeight: 950, color: "#0f172a" }}>Quick checks</div>
						<div style={{ fontSize: 13, color: "rgba(15, 23, 42, 0.72)", lineHeight: 1.45 }}>
							Make sure the starting point is set, then open payment to review everything.
						</div>
						<div style={{ height: 1, background: "rgba(15, 23, 42, 0.08)", margin: "4px 0" }} />
						<div style={{ display: "grid", gap: 8, fontSize: 13 }}>
							<div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
								<span style={{ fontWeight: 900, color: "rgba(15, 23, 42, 0.68)" }}>Region</span>
								<span style={{ fontWeight: 950, color: "#0f172a" }}>{formatLabel(pricingRegionLabel)}</span>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
								<span style={{ fontWeight: 900, color: "rgba(15, 23, 42, 0.68)" }}>Sensitivity</span>
								<span style={{ fontWeight: 950, color: "#0f172a" }}>{formatLabel(sensitivityTierLabel)}</span>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
								<span style={{ fontWeight: 900, color: "rgba(15, 23, 42, 0.68)" }}>Estimate</span>
								<span style={{ fontWeight: 950, color: "#0f172a" }}>{formatLabel(paymentAmountLabel)}</span>
							</div>
						</div>
					</aside>
				) : null}
			</div>
		</div>
	);
}
