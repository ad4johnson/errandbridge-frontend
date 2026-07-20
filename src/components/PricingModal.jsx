import { useEffect, useMemo, useState } from "react";

import "./PricingModal.css";

const PRICING_REGION_STORAGE_KEY = "eb_pricing_region_v1";

const PricingModal = ({
	open,
	regionKey,
	onRegionChange,
	onClose,
	onStartQuote,
	priceModelMultiplier = 1,
	priceUpliftMultiplier = 1,
}) => {
	const inferRegionKeyFromEnvironment = () => {
		// Important: do NOT persist this value by default.
		// We want first-time visitors to see a sensible local lane, but still allow
		// currency to adapt if their locale/timezone changes later.
		if (typeof window === "undefined") return "uk";

		let timeZone = "";
		try {
			timeZone = String(
				new Intl.DateTimeFormat().resolvedOptions().timeZone || "",
			);
		} catch {
			// ignore
		}

		const lang = String(
			(typeof navigator !== "undefined" && navigator?.language) || "",
		).toLowerCase();

		if (timeZone === "Europe/London") return "uk";
		if (timeZone.startsWith("Africa/")) return "ng";
		if (timeZone.startsWith("America/")) return "us";
		if (timeZone.startsWith("Europe/")) return "eu";

		// Locale fallbacks (language-country).
		if (/(?:-|_)gb$/.test(lang)) return "uk";
		if (/(?:-|_)us$/.test(lang)) return "us";
		if (/(?:-|_)ng$/.test(lang)) return "ng";
		// Most non-UK Europe visitors will end up here.
		if (/(?:-|_)(fr|de|es|it|nl|pt|ie|be|at|fi|se|no|dk|pl|cz|ro|hu|gr)$/.test(lang)) {
			return "eu";
		}

		return "uk";
	};

	const formatCurrencyMajor = (amountMajor, currencyKey) => {
		const currency = String(currencyKey || "USD").toUpperCase();
		const value = Number(amountMajor || 0);
		try {
			return new Intl.NumberFormat(undefined, {
				style: "currency",
				currency,
				maximumFractionDigits: 0,
			}).format(value);
		} catch {
			return `${currency} ${value.toFixed(0)}`;
		}
	};

	const internalPricingEnabled =
		String(process.env.REACT_APP_SHOW_INTERNAL_PRICING || "").toLowerCase() ===
		"true";

	const regions = useMemo(
		() => [
			{ key: "uk", label: "UK", tabLabel: "UK (GBP)", currency: "GBP" },
			{ key: "us", label: "US", tabLabel: "US (USD)", currency: "USD" },
			{ key: "eu", label: "Europe", tabLabel: "Europe (EUR)", currency: "EUR" },
			{ key: "ng", label: "Nigeria", tabLabel: "Nigeria (NGN)", currency: "NGN" },
		],
		[],
	);

	const services = useMemo(
		() => [
			{
				key: "routine",
				title: "Personal / routine errand",
				description:
					"Routine errands, family support, shopping help, returns, and everyday execution.",
				prices: {
					GBP: { standard: 35, priority: 49, premium: 69 },
					USD: { standard: 45, priority: 65, premium: 90 },
					EUR: { standard: 35, priority: 49, premium: 69 },
					NGN: { standard: 12000, priority: 18000, premium: 28000 },
				},
			},
			{
				key: "documents",
				title: "Document collection / submission",
				description:
					"Passports, certificates, embassy visits, verified collections, and document handling.",
				prices: {
					GBP: { standard: 45, priority: 65, premium: 95 },
					USD: { standard: 60, priority: 85, premium: 125 },
					EUR: { standard: 45, priority: 65, premium: 95 },
					NGN: { standard: 18000, priority: 28000, premium: 45000 },
				},
			},
			{
				key: "sensitive",
				title: "Legal / sensitive task",
				description:
					"Legal submissions, KYC follow-ups, notary support, and higher-trust hand-offs.",
				prices: {
					GBP: { standard: 65, priority: 95, premium: 145 },
					USD: { standard: 85, priority: 125, premium: 190 },
					EUR: { standard: 65, priority: 95, premium: 145 },
					NGN: { standard: 25000, priority: 40000, premium: 65000 },
				},
			},
			{
				key: "property",
				title: "Property inspection",
				description:
					"Remote property verification, site checks, and higher-touch physical inspection tasks.",
				prices: {
					GBP: { standard: 85, priority: 125, premium: 185 },
					USD: { standard: 110, priority: 165, premium: 245 },
					EUR: { standard: 85, priority: 125, premium: 185 },
					NGN: { standard: 30000, priority: 50000, premium: 80000 },
				},
			},
			{
				key: "airport",
				title: "Airport pickup / assistance",
				description:
					"Travel assistance, airport support, and time-sensitive arrival coordination.",
				prices: {
					GBP: { standard: 55, priority: 79, premium: 119 },
					USD: { standard: 70, priority: 99, premium: 145 },
					EUR: { standard: 55, priority: 79, premium: 119 },
					NGN: { standard: 20000, priority: 35000, premium: 55000 },
				},
			},
			{
				key: "emergency",
				title: "Family emergency support",
				description:
					"Urgent personal support where trust, speed, and proof matter most.",
				prices: {
					GBP: { standard: 69, priority: 99, premium: 149 },
					USD: { standard: 90, priority: 135, premium: 199 },
					EUR: { standard: 69, priority: 99, premium: 149 },
					NGN: { standard: 25000, priority: 40000, premium: 70000 },
				},
			},
		],
		[],
	);

	const resolveInitialRegionKey = () => {
		if (regionKey) return String(regionKey);
		if (typeof window === "undefined") return "uk";
		try {
			const stored = window.localStorage?.getItem(PRICING_REGION_STORAGE_KEY);
			if (stored) return stored;
		} catch {
			// ignore
		}
		return inferRegionKeyFromEnvironment();
	};

	const [regionSelectionSource, setRegionSelectionSource] = useState(() => {
		if (regionKey) return "prop";
		if (typeof window === "undefined") return "auto";
		try {
			return window.localStorage?.getItem(PRICING_REGION_STORAGE_KEY)
				? "stored"
				: "auto";
		} catch {
			return "auto";
		}
	});

	const [activeRegionKey, setActiveRegionKey] = useState(resolveInitialRegionKey);
	const [activeServiceKey, setActiveServiceKey] = useState("routine");

	const activeRegion = useMemo(
		() => regions.find((r) => r.key === activeRegionKey) || regions[0],
		[activeRegionKey, regions],
	);
	const activeCurrency = activeRegion?.currency || "GBP";

	useEffect(() => {
		if (typeof window === "undefined") return;
		// Prop-driven sync (App-level currency inference + overrides).
		if (regionKey) {
			const nextKey = String(regionKey);
			if (nextKey && nextKey !== activeRegionKey) {
				setActiveRegionKey(nextKey);
				setRegionSelectionSource("prop");
			}
		}
	}, [regionKey, activeRegionKey]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		// Ensure we never persist an invalid key (e.g. if defaults change).
		if (!regions.some((r) => r.key === activeRegionKey)) {
			setActiveRegionKey(regions[0]?.key || "uk");
			return;
		}
		// Only persist if the user explicitly chose a region (or they already have a
		// stored preference). Avoid locking first-time visitors into a lane.
		if (regionSelectionSource !== "stored" && regionSelectionSource !== "user") {
			return;
		}
		try {
			window.localStorage?.setItem(PRICING_REGION_STORAGE_KEY, activeRegionKey);
		} catch {
			// ignore
		}
	}, [activeRegionKey, regions, regionSelectionSource]);

	const activeService = useMemo(
		() => services.find((s) => s.key === activeServiceKey) || services[0],
		[activeServiceKey, services],
	);

	const activePrices =
		activeService?.prices?.[activeCurrency] ||
		services?.[0]?.prices?.[activeCurrency] ||
		{ standard: 0, priority: 0, premium: 0 };

	useEffect(() => {
		if (typeof document === "undefined") return undefined;
		if (open) {
			document.body.classList.add("modal-open");
		} else {
			document.body.classList.remove("modal-open");
		}
		return () => document.body.classList.remove("modal-open");
	}, [open]);

	if (!open) return null;

	return (
		<div
			id="pricingModal"
			className="modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pricing-modal-title"
			tabIndex={-1}
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					onClose?.();
				}
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					onClose?.();
				}
			}}
		>
			<div className="modal-card">
				<button
					type="button"
					onClick={() => onClose?.()}
					className="modal-close"
					aria-label="Close pricing modal"
				>
					×
				</button>
				<div className="eb-pricing-modal">
					<div>
						<div id="pricing-modal-title" className="eb-h3">
							Pricing
						</div>
						<div className="eb-subtitle" style={{ marginTop: 4 }}>
							Scan by region → pick a service → see Standard / Priority / Premium.
						</div>
					</div>

					<div className="eb-pricing-hero">
						<div style={{ fontWeight: 900, color: "#0f172a", fontSize: 13 }}>
							What pricing includes
						</div>
						<ul>
							<li>Managed execution by a verified operator.</li>
							<li>Real-time updates + proof at key handoffs.</li>
							<li>Escalation support + audit trail for peace of mind.</li>
						</ul>
					</div>

					<div
						style={{
							background: "#f0f9ff",
							border: "1px solid #bae6fd",
							borderRadius: 12,
							padding: "10px 12px",
							display: "flex",
							alignItems: "center",
							gap: 10,
							flexWrap: "wrap",
						}}
					>
						<span style={{ fontSize: 18 }}>🔒</span>
						<div style={{ color: "#0c4a6e", fontSize: 12, lineHeight: 1.5 }}>
							Secure payments powered by Stripe Checkout. Card details are encrypted
							and never stored on ErrandBridge.
						</div>
					</div>

					<div className="eb-pricing-region-row">
						<div className="eb-pricing-region-label">Select your region</div>
						<div className="trust-tab-buttons" role="tablist" aria-label="Pricing region">
							{regions.map((region) => {
								const isActive = region.key === activeRegionKey;
								return (
									<button
										key={region.key}
										type="button"
										className={`trust-tab${isActive ? " is-active" : ""}`}
										role="tab"
										aria-selected={isActive}
										onClick={() => {
										setActiveRegionKey(region.key);
										setRegionSelectionSource("user");
										onRegionChange?.(region.key);
									}}
									>
										{region.tabLabel}
									</button>
								);
							})}
						</div>
					</div>

					<div>
						<div className="eb-section-header" style={{ marginBottom: 10 }}>
							<div>
								<div className="eb-section-title">Service categories</div>
								<div className="eb-section-subtitle">
									Tap a service to compare tiers.
								</div>
							</div>
						</div>

						<div className="eb-pricing-services">
							{services.map((service) => {
								const isActive = service.key === activeServiceKey;
								const from = service?.prices?.[activeCurrency]?.standard ?? 0;
								return (
									<button
										key={service.key}
										type="button"
										className="eb-pricing-service-card"
										aria-pressed={isActive}
										onClick={() => setActiveServiceKey(service.key)}
									>
										<div className="eb-pricing-service-title">{service.title}</div>
										<div className="eb-pricing-service-desc">{service.description}</div>
										<div className="eb-pricing-service-from">
											<span className="eb-pricing-from-label">From</span>
											<span className="eb-pricing-from-value">
												{formatCurrencyMajor(from, activeCurrency)}
											</span>
										</div>
									</button>
								);
							})}
						</div>
					</div>

					<div className="eb-pricing-drawer" aria-label="Tier comparison">
						<div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
							<div>
								<div style={{ fontWeight: 950, letterSpacing: "-0.01em" }}>
									{activeService?.title}
								</div>
								<div style={{ fontSize: 12.5, color: "rgba(15, 23, 42, 0.66)", lineHeight: 1.45, marginTop: 2 }}>
									{activeService?.description}
								</div>
							</div>
							<div style={{ fontSize: 12, fontWeight: 850, color: "rgba(15, 23, 42, 0.62)" }}>
								Showing: {activeRegion?.label} • {activeCurrency}
							</div>
						</div>

						<div className="eb-pricing-tier-grid">
							<div className="eb-pricing-tier">
								<div className="eb-pricing-tier-title">Standard</div>
								<div className="eb-pricing-tier-price">
									{formatCurrencyMajor(activePrices.standard, activeCurrency)}
								</div>
								<div className="eb-pricing-tier-note">Reliable execution + updates.</div>
							</div>
							<div className="eb-pricing-tier">
								<div className="eb-pricing-tier-title">Priority</div>
								<div className="eb-pricing-tier-price">
									{formatCurrencyMajor(activePrices.priority, activeCurrency)}
								</div>
								<div className="eb-pricing-tier-note">Faster handling + tighter coordination.</div>
							</div>
							<div className="eb-pricing-tier">
								<div className="eb-pricing-tier-title">Premium</div>
								<div className="eb-pricing-tier-price">
									{formatCurrencyMajor(activePrices.premium, activeCurrency)}
								</div>
								<div className="eb-pricing-tier-note">Urgent / higher complexity / best available operator.</div>
							</div>
						</div>

						<div style={{ fontSize: 12, color: "rgba(15, 23, 42, 0.62)", lineHeight: 1.5 }}>
							Final quotes can vary with distance, urgency, complexity, wait time, and attachments.
						</div>
					</div>

					<div>
						<div className="eb-section-header" style={{ marginBottom: 10 }}>
							<div>
								<div className="eb-section-title">Why pricing works</div>
								<div className="eb-section-subtitle">
									Built for trust across borders.
								</div>
							</div>
						</div>
						<div className="eb-pricing-trust-grid">
							{[
								{
									icon: "✅",
									title: "Verified operators",
									desc: "Jobs are handled by vetted Pilots with accountability.",
								},
								{
									icon: "📍",
									title: "Live tracking",
									desc: "Follow progress in real time once the errand starts.",
								},
								{
									icon: "📸",
									title: "Proof of completion",
									desc: "Photo/notes at key handoffs so you can trust outcomes.",
								},
								{
									icon: "🛡️",
									title: "Escalation support",
									desc: "We help resolve issues quickly when something changes.",
								},
								{
									icon: "🔒",
									title: "Secure payment",
									desc: "Stripe Checkout protects card details end-to-end.",
								},
							].map((item) => (
								<div key={item.title} className="eb-pricing-trust-item">
									<div className="eb-pricing-trust-titleRow">
										<span className="eb-pricing-trust-icon" aria-hidden="true">
											{item.icon}
										</span>
										<span className="eb-pricing-trust-title">{item.title}</span>
									</div>
									<div className="eb-pricing-trust-desc">{item.desc}</div>
								</div>
							))}
						</div>
					</div>

					<div className="eb-pricing-actions">
						<button
							type="button"
							className="btn btn-primary btn-pill"
							onClick={() => {
									onStartQuote?.({
										regionKey: activeRegionKey,
										currency: activeCurrency,
									});
							}}
						>
							Get instant quote
						</button>
						<button
							type="button"
							className="btn btn-ghost btn-pill"
							onClick={() => onClose?.()}
						>
							Not now
						</button>
					</div>

					{internalPricingEnabled && (
						<div style={{ marginTop: 6 }}>
							<details>
								<summary className="eb-secondary-disclosure">
									Internal pricing details
								</summary>
								<div style={{ marginTop: 10, display: "grid", gap: 14 }}>
									<div className="eb-section-card" style={{ padding: 14 }}>
										<div style={{ fontWeight: 900, marginBottom: 6 }}>
											Pricing philosophy
										</div>
										<div style={{ fontSize: 12.5, color: "rgba(15, 23, 42, 0.72)", lineHeight: 1.55 }}>
											Diaspora pricing is the primary revenue engine (GBP/USD). Nigeria local pricing (NGN)
											is a secondary lane and should not be the main value anchor in customer-facing copy.
										</div>
										<div style={{ marginTop: 8, fontSize: 12, color: "rgba(15, 23, 42, 0.62)" }}>
											Model multiplier: {priceModelMultiplier} • Uplift multiplier: {priceUpliftMultiplier}
										</div>
									</div>

									<div className="eb-section-card" style={{ padding: 14 }}>
										<div style={{ fontWeight: 900, marginBottom: 6 }}>
											Example economics
										</div>
										<div style={{ overflowX: "auto" }}>
											<table
												style={{
													width: "100%",
													borderCollapse: "collapse",
													fontSize: 13,
												}}
											>
												<thead>
													<tr style={{ textAlign: "left", color: "#374151" }}>
														<th style={{ padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>
															Example job
														</th>
														<th style={{ padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>
															Pilot share
														</th>
														<th style={{ padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>
															ErrandBridge retained before costs
														</th>
														<th style={{ padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>
															Comment
														</th>
													</tr>
												</thead>
												<tbody>
													{[
														[
															"UK £45 document job",
															"£13.50 at 30%",
															"£31.50",
															"Diaspora corridor pricing supports a materially stronger contribution profile.",
														],
														[
															"Nigeria ₦18,000 document job",
															"₦5,400 at 30%",
															"₦12,600",
															"Local pricing remains viable, but should not be the main value anchor.",
														],
													].map((row) => (
														<tr key={row[0]}>
															{row.map((cell, idx) => (
																<td
																	key={`${row[0]}-${idx}`}
																	style={{
																		padding: "8px 6px",
																		borderBottom: "1px solid #f1f5f9",
																		color: idx === 0 ? "#111827" : "#4b5563",
																		fontWeight: idx === 0 ? 600 : 400,
																	}}
																>
																	{cell}
																</td>
															))}
														</tr>
													))}
												</tbody>
											</table>
										</div>
										<div style={{ marginTop: 10, fontSize: 12, color: "rgba(15, 23, 42, 0.62)", lineHeight: 1.5 }}>
											Internal note: apply modifiers for city, distance, urgency, complexity, wait time, attachments, and elite pilot assignment.
										</div>
									</div>
								</div>
							</details>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default PricingModal;
