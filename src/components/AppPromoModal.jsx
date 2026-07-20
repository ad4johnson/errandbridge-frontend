import { useEffect } from "react";
import ReactDOM from "react-dom";
import { track } from "../lib/track";

/**
 * Minimal AppPromoModal used by App.js.
 *
 * Contract:
 * - Props:
 *   - isOpen: boolean
 *   - onClose: () => void
 *   - title?: string
 *   - description?: string
 *   - primaryCtaText?: string
 *   - onPrimaryCta?: () => void
 * - Behavior:
 *   - Closes on Escape
 *   - Renders nothing when closed
 */
export default function AppPromoModal({
	isOpen,
	onClose,
	title = "Get 10% off your first errand",
	description = "Tell us what you need handled - we’ll take care of the rest. Fast booking, live tracking, and reliable support from start to finish.",
	primaryCtaText = "Start your first errand →",
	onPrimaryCta,
	onStartErrand,
	appStoreUrl = "",
	googlePlayUrl = "",
}) {
	useEffect(() => {
		if (!isOpen) return;
		track("app_promo_viewed");
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

		const onKeyDown = (e) => {
			if (e.key === "Escape") onClose?.();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleClose = () => {
		track("app_promo_closed");
		onClose?.();
	};

	const handlePrimaryAction = () => {
		track("app_promo_cta_clicked", {
			cta: primaryCtaText || "primary",
		});
		if (onStartErrand) {
			onStartErrand();
			return;
		}
		if (onPrimaryCta) {
			onPrimaryCta();
			return;
		}
		handleClose();
	};

	const valueChips = ["Fast booking", "Live tracking", "Trusted support"];
	const hasStoreLinks = Boolean(appStoreUrl || googlePlayUrl);

	const content = (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={title}
			className="eb-overlay"
			style={{
				zIndex: 10000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 16,
			}}
			onMouseDown={(e) => {
				// click outside to close
				if (e.target === e.currentTarget) handleClose();
			}}
		>
			<div
				style={{
					width: "min(560px, 100%)",
					background:
						"linear-gradient(160deg, rgba(10,18,36,0.98), rgba(19,33,68,0.98) 52%, rgba(43,34,92,0.98) 100%)",
					color: "#fff",
					borderRadius: 24,
					border: "1px solid rgba(255,255,255,0.14)",
					boxShadow: "0 28px 90px rgba(0,0,0,0.58)",
					padding: 22,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
					}}
				>
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							padding: "6px 10px",
							borderRadius: 999,
							background: "rgba(255,255,255,0.12)",
							border: "1px solid rgba(255,255,255,0.12)",
							fontWeight: 900,
							fontSize: 11,
							letterSpacing: 0.6,
							textTransform: "uppercase",
						}}
					>
						WELCOME OFFER
					</div>
					<button
						type="button"
						onClick={handleClose}
						aria-label="Close"
						style={{
							background: "rgba(255,255,255,0.08)",
							color: "#fff",
							border: "1px solid rgba(255,255,255,0.16)",
							width: 40,
							height: 40,
							borderRadius: 999,
							cursor: "pointer",
							fontSize: 22,
							fontWeight: 900,
						}}
					>
						×
					</button>
				</div>

				<div style={{ marginTop: 16, maxWidth: 460 }}>
					<h2
						style={{
							margin: 0,
							fontSize: 32,
							lineHeight: 1.04,
							fontWeight: 950,
							letterSpacing: -0.5,
						}}
					>
						{title}
					</h2>
					<p
						style={{
							margin: "12px 0 0",
							opacity: 0.92,
							fontSize: 15,
							lineHeight: 1.55,
							fontWeight: 650,
						}}
					>
						{description}
					</p>
				</div>

				<div
					style={{
						marginTop: 16,
						padding: "10px 12px",
						borderRadius: 16,
						background: "rgba(255,255,255,0.08)",
						border: "1px solid rgba(255,255,255,0.12)",
						fontSize: 13,
						fontWeight: 800,
						color: "rgba(255,255,255,0.94)",
					}}
				>
					✨ First-time client reward · 10% off your first request
				</div>

				<div
					style={{
						marginTop: 18,
						display: "flex",
						flexWrap: "wrap",
						gap: 10,
					}}
				>
					{valueChips.map((label) => (
						<span
							key={label}
							style={{
								borderRadius: 999,
								padding: "8px 12px",
								background: "rgba(255,255,255,0.07)",
								border: "1px solid rgba(255,255,255,0.12)",
								fontWeight: 800,
								fontSize: 13,
								color: "rgba(255,255,255,0.86)",
							}}
						>
							{label}
						</span>
					))}
				</div>

				<div style={{ display: "grid", gap: 16, marginTop: 24 }}>
					<button
						type="button"
						onClick={handlePrimaryAction}
						style={{
							background: "linear-gradient(135deg, #ffffff, #eef2ff)",
							color: "#111827",
							border: "none",
							borderRadius: 16,
							padding: "15px 18px",
							fontWeight: 900,
							fontSize: 15,
							cursor: "pointer",
							boxShadow: "0 18px 44px rgba(15, 23, 42, 0.22)",
						}}
					>
						{primaryCtaText}
					</button>

					{hasStoreLinks ? (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
								gap: 12,
							}}
						>
							<a
								href={appStoreUrl || "#"}
								aria-label="Download on the App Store"
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									borderRadius: 16,
									padding: "12px 14px",
									background: "rgba(255,255,255,0.07)",
									border: "1px solid rgba(255,255,255,0.14)",
									textDecoration: "none",
								}}
								onClick={(event) => {
									if (!appStoreUrl) {
										event.preventDefault();
										return;
									}
									track("app_promo_store_badge_clicked", {
										store: "ios",
									});
								}}
							>
								<img
									src="/badges/app-store-badge.svg"
									alt="Download on the App Store"
									width={128}
									height={38}
									loading="lazy"
									style={{ height: 38, width: "auto" }}
								/>
							</a>
							<a
								href={googlePlayUrl || "#"}
								aria-label="Get it on Google Play"
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									borderRadius: 16,
									padding: "12px 14px",
									background: "rgba(255,255,255,0.07)",
									border: "1px solid rgba(255,255,255,0.14)",
									textDecoration: "none",
								}}
								onClick={(event) => {
									if (!googlePlayUrl) {
										event.preventDefault();
										return;
									}
									track("app_promo_store_badge_clicked", {
										store: "android",
									});
								}}
							>
								<img
									src="/badges/google-play-badge.png"
									alt="Get it on Google Play"
									width={128}
									height={38}
									loading="lazy"
									style={{ height: 38, width: "auto" }}
								/>
							</a>
						</div>
					) : null}

					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
						}}
					>
						<button
							type="button"
							onClick={handleClose}
							style={{
								background: "transparent",
								color: "rgba(255,255,255,0.78)",
								border: "none",
								padding: 0,
								fontSize: 14,
								fontWeight: 800,
								cursor: "pointer",
							}}
						>
							Not now
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return ReactDOM.createPortal(content, document.body);
}
