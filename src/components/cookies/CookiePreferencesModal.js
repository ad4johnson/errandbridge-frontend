import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUISurfaces } from "../../store/ui-surfaces";
import { acquireBodyScrollLock } from "../../utils/scrollLock";

export default function CookiePreferencesModal({ initialConsent, onSave }) {
	const [analytics, setAnalytics] = useState(
		Boolean(initialConsent?.analytics),
	);
	const [functional, setFunctional] = useState(
		Boolean(initialConsent?.functional),
	);
	const [marketing, setMarketing] = useState(
		Boolean(initialConsent?.marketing),
	);

	const activeModal = useUISurfaces((s) => s.activeModal);
	const closeModal = useUISurfaces((s) => s.closeModal);
	const open = activeModal === "cookiePreferences";

	const panelRef = useRef(null);

	useEffect(() => {
		if (!open) return undefined;
		const onKeyDown = (e) => {
			if (e.key === "Escape") closeModal?.();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [closeModal, open]);

	useEffect(() => {
		// Prevent background scroll while modal is open.
		if (!open) return undefined;
		return acquireBodyScrollLock();
	}, [open]);

	useEffect(() => {
		// Focus the panel for accessibility.
		if (!open) return;
		const el = panelRef.current;
		if (el && typeof el.focus === "function") el.focus();
	}, [open]);

	const handleSave = () => {
		onSave?.({
			essential: true,
			analytics,
			functional,
			marketing,
			consentGiven: true,
			consentDate: new Date().toISOString(),
		});
	};

	return (
		<AnimatePresence>
			{open ? (
				<motion.div
					className="eb-cookie-modal-backdrop"
					role="dialog"
					aria-modal="true"
					aria-label="Cookie preferences"
					onMouseDown={(e) => {
						// Click outside closes
						if (e.target === e.currentTarget) closeModal?.();
					}}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.16, ease: "easeOut" }}
				>
					<motion.div
						className="eb-cookie-modal"
						ref={panelRef}
						tabIndex={-1}
						initial={{ opacity: 0, y: 24 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 24 }}
						transition={{ duration: 0.18, ease: "easeOut" }}
					>
						<div className="eb-cookie-modal-body">
							<div className="eb-cookie-modal-header">
								<div>
									<h2 className="eb-cookie-title">Cookie preferences</h2>
									<p className="eb-cookie-text">
										We use essential cookies to keep ErrandBridge secure and
										working. You can choose whether to allow optional cookies for
										analytics, functional improvements, and marketing.
								</p>
								</div>
								<button
									type="button"
									onClick={closeModal}
									className="eb-cookie-btn eb-cookie-btn-secondary"
									aria-label="Close cookie preferences"
								>
									Close
								</button>
							</div>

						<div className="eb-cookie-card eb-cookie-card-essential">
							<div className="eb-cookie-card-row">
								<div>
									<h3 className="eb-cookie-card-title">Essential cookies</h3>
									<p className="eb-cookie-text">
										Required for security, session handling, and core site
										functionality.
									</p>
								</div>
								<div className="eb-cookie-pill" aria-hidden="true">
									Always on
								</div>
							</div>
						</div>

						<CookieToggleCard
							title="Analytics cookies"
							description="Help us understand how visitors use ErrandBridge so we can improve the product."
							checked={analytics}
							onChange={setAnalytics}
						/>

						<CookieToggleCard
							title="Functional cookies"
							description="Remember preferences and improve convenience features."
							checked={functional}
							onChange={setFunctional}
						/>

						<CookieToggleCard
							title="Marketing cookies"
							description="Help measure campaign performance and personalise promotions where used."
							checked={marketing}
							onChange={setMarketing}
						/>

						<div className="eb-cookie-actions">
							<button
								type="button"
								onClick={() =>
									onSave?.({
										essential: true,
										analytics: false,
										functional: false,
										marketing: false,
										consentGiven: true,
										consentDate: new Date().toISOString(),
									})
								}
								className="eb-cookie-btn eb-cookie-btn-secondary"
							>
								Reject non-essential
							</button>
							<button
								type="button"
								onClick={handleSave}
								className="eb-cookie-btn eb-cookie-btn-primary"
							>
								Save preferences
							</button>
						</div>
					</div>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

function CookieToggleCard({ title, description, checked, onChange }) {
	return (
		<div className="eb-cookie-card">
			<div className="eb-cookie-card-row">
				<div>
					<h3 className="eb-cookie-card-title">{title}</h3>
					<p className="eb-cookie-text">{description}</p>
				</div>

				<button
					type="button"
					onClick={() => onChange?.(!checked)}
					className={`eb-cookie-toggle ${checked ? "is-on" : "is-off"}`}
					aria-pressed={checked}
					aria-label={`Toggle ${title}`}
				>
					<span className="eb-cookie-toggle-dot" />
				</button>
			</div>
		</div>
	);
}
