import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUISurfaces } from "../../store/ui-surfaces";
import CookiePreferencesModal from "./CookiePreferencesModal";
import "./cookieStyles.css";
import {
	defaultConsent,
	getStoredCookieConsent,
	saveCookieConsent,
} from "./cookie-consent";

export default function CookieBanner({ onConsentResolved }) {
	const [mounted, setMounted] = useState(false);
	const [consent, setConsent] = useState(defaultConsent);
	const bannerRef = useRef(null);

	const cookieBannerOpen = useUISurfaces((s) => s.cookieBannerOpen);
	const setCookieBannerOpen = useUISurfaces((s) => s.setCookieBannerOpen);
	const setCookieBannerHeightPx = useUISurfaces(
		(s) => s.setCookieBannerHeightPx,
	);
	const openModal = useUISurfaces((s) => s.openModal);

	useEffect(() => {
		setMounted(true);

		const stored = getStoredCookieConsent();
		if (stored?.consentGiven) {
			setConsent(stored);
			onConsentResolved?.(stored);
			setCookieBannerOpen(false);
			return;
		}

		setCookieBannerOpen(true);
	}, [onConsentResolved, setCookieBannerOpen]);

	useEffect(() => {
		const handler = () => {
			openModal("cookiePreferences");
		};
		window.addEventListener("open-cookie-preferences", handler);
		return () => window.removeEventListener("open-cookie-preferences", handler);
	}, [openModal]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (!cookieBannerOpen) {
			setCookieBannerHeightPx?.(0);
			return undefined;
		}

		const el = bannerRef.current;
		if (!el) return undefined;

		const update = () => {
			try {
				const rect = el.getBoundingClientRect();
				setCookieBannerHeightPx?.(rect.height);
			} catch {
				// ignore
			}
		};

		update();

		let observer = null;
		if ("ResizeObserver" in window) {
			try {
				observer = new window.ResizeObserver(() => update());
				observer.observe(el);
			} catch {
				observer = null;
			}
		}

		window.addEventListener("resize", update);
		return () => {
			window.removeEventListener("resize", update);
			try {
				observer?.disconnect?.();
			} catch {
				// ignore
			}
		};
	}, [cookieBannerOpen, setCookieBannerHeightPx]);

	const resolve = (nextConsent) => {
		saveCookieConsent(nextConsent);
		setConsent(nextConsent);
		setCookieBannerOpen(false);
		openModal(null);
		onConsentResolved?.(nextConsent);
	};

	const handleAcceptAll = () => {
		resolve({
			essential: true,
			analytics: true,
			functional: true,
			marketing: true,
			consentGiven: true,
			consentDate: new Date().toISOString(),
		});
	};

	const handleSavePreferences = (nextConsent) => {
		resolve(nextConsent);
	};

	if (!mounted) return null;

	return (
		<>
			<AnimatePresence>
				{cookieBannerOpen && (
					<motion.section
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.18, ease: "easeOut" }}
					className="eb-cookie-banner eb-cookie-banner--micro"
					aria-label="Cookie consent"
					ref={bannerRef}
				>
					<div className="eb-cookie-banner-inner eb-cookie-banner-inner--micro">
						<div className="eb-cookie-banner-copy eb-cookie-banner-copy--micro">
							<p className="eb-cookie-banner-title eb-cookie-banner-title--micro">
								Cookies
							</p>
							<p className="eb-cookie-text eb-cookie-text--micro">
								We use cookies to keep ErrandBridge working. Accept or edit
								 settings.
							</p>
						</div>

						<div className="eb-cookie-banner-actions eb-cookie-banner-actions--micro">
							<button
								type="button"
								onClick={() => openModal("cookiePreferences")}
								className="eb-cookie-btn eb-cookie-btn-secondary eb-cookie-btn-settings"
							>
								Settings
							</button>
							<button
								type="button"
								onClick={handleAcceptAll}
								className="eb-cookie-btn eb-cookie-btn-primary eb-cookie-btn-accept"
							>
								Accept
							</button>
						</div>
					</div>
				</motion.section>
				)}
			</AnimatePresence>

			<CookiePreferencesModal
				initialConsent={consent}
				onSave={handleSavePreferences}
			/>
		</>
	);
}
