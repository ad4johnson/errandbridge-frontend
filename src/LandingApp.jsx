import { lazy, Suspense, useEffect, useState } from "react";

const CookieBanner = lazy(() => import("./components/cookies/CookieBanner"));

export default function LandingApp() {
	const [showCookieBanner, setShowCookieBanner] = useState(false);
	const [hash, setHash] = useState(() => {
		if (typeof window === "undefined") return "";
		return window.location?.hash || "";
	});

	const openCookiePreferences = async () => {
		// Ensure the CookieBanner chunk is loaded and mounted before firing the event,
		// otherwise the click can be "lost" if the listener isn't registered yet.
		setShowCookieBanner(true);
		try {
			await import("./components/cookies/CookieBanner");
		} catch {
			// ignore
		}
		window.setTimeout(() => {
			try {
				window.dispatchEvent(new Event("open-cookie-preferences"));
			} catch {
				// ignore
			}
		}, 0);
	};

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const onHashChange = () => setHash(window.location?.hash || "");
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	useEffect(() => {
		// Keep initial render as light as possible for performance metrics.
		// Cookie consent is still shown, just deferred slightly so it doesn't become LCP.
		const timeoutId = window.setTimeout(() => {
			setShowCookieBanner(true);
		}, 1200);
		return () => window.clearTimeout(timeoutId);
	}, []);

	useEffect(() => {
		// Support deep-links like /home#how-it-works.
		if (!hash) return;
		const id = hash.replace(/^#/, "");
		if (!id) return;
		const el = document.getElementById(id);
		if (!el) return;
		try {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		} catch {
			el.scrollIntoView();
		}
	}, [hash]);

	return (
		<div
			style={{
				minHeight: "100dvh",
				background:
					"linear-gradient(135deg, rgba(248, 250, 252, 0.88) 0%, rgba(238, 242, 255, 0.88) 45%, rgba(245, 243, 255, 0.88) 100%)",
				paddingLeft: "env(safe-area-inset-left)",
				paddingRight: "env(safe-area-inset-right)",
			}}
		>
			<header
				style={{
					position: "sticky",
					top: 0,
					zIndex: 50,
					background: "rgba(255, 255, 255, 0.8)",
					backdropFilter: "blur(10px)",
					borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 14,
						padding: "12px 16px",
						maxWidth: 1180,
						margin: "0 auto",
					}}
				>
					<a
						href="/"
						aria-label="ErrandBridge home"
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 10,
							textDecoration: "none",
						}}
					>
						<img
							src="/logo-mark.png"
							alt="ErrandBridge"
							width={104}
							height={104}
							loading="eager"
							decoding="async"
							style={{ height: 78, width: 78 }}
						/>
					</a>

					<nav style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<a
							href="#how-it-works"
							style={{
								color: "#0f172a",
								fontWeight: 700,
								fontSize: 14,
								textDecoration: "none",
							}}
						>
							How it works
						</a>
						<a
							href="/client/login"
							style={{
								padding: "10px 14px",
								borderRadius: 999,
								border: "1px solid rgba(148, 163, 184, 0.8)",
								background: "rgba(255, 255, 255, 0.85)",
								color: "#0f172a",
								fontWeight: 800,
								fontSize: 14,
								textDecoration: "none",
							}}
						>
							Login
						</a>
					</nav>
				</div>
			</header>

			<main style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 16px" }}>
				<section style={{ padding: "28px 0 14px" }}>
					<h1
						style={{
							margin: 0,
							fontSize: "clamp(34px, 5vw, 54px)",
							lineHeight: 1.05,
							letterSpacing: -0.6,
							color: "#0f172a",
							fontWeight: 900,
							maxWidth: 920,
						}}
					>
						Get Things Done Back Home Even When You’re Not There
					</h1>
					<p
						style={{
							margin: "14px 0 0",
							maxWidth: 760,
							color: "rgba(15, 23, 42, 0.75)",
							fontSize: 16.5,
							lineHeight: 1.55,
							fontWeight: 650,
						}}
					>
						Send an errand in minutes. Track progress and receive proof when it’s
						done.
					</p>

					<div
						style={{
							display: "flex",
							gap: 12,
							flexWrap: "wrap",
							marginTop: 18,
						}}
					>
						<a
							href="/client/signup"
							style={{
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 8,
								padding: "12px 16px",
								borderRadius: 999,
								border: "1px solid #1d4ed8",
								background: "#2563eb",
								color: "#fff",
								fontWeight: 900,
								textDecoration: "none",
							}}
						>
							<span aria-hidden="true">→</span>
							<span>Send an Errand</span>
						</a>
						<a
							href="/client/login"
							style={{
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 8,
								padding: "12px 16px",
								borderRadius: 999,
								border: "1px solid rgba(148, 163, 184, 0.9)",
								background: "rgba(255, 255, 255, 0.92)",
								color: "#0f172a",
								fontWeight: 900,
								textDecoration: "none",
							}}
						>
							Login
						</a>
					</div>

					<div
						style={{
							marginTop: 16,
							display: "flex",
							flexWrap: "wrap",
							gap: 10,
							color: "rgba(71, 85, 105, 1)",
							fontWeight: 750,
							fontSize: 13,
						}}
					>
						<span>Verified Operators</span>
						<span aria-hidden="true">•</span>
						<span>Live Tracking</span>
						<span aria-hidden="true">•</span>
						<span>Proof Delivered</span>
					</div>
				</section>

				<section
					id="how-it-works"
					style={{
						marginTop: 26,
						background: "rgba(255, 255, 255, 0.78)",
						border: "1px solid rgba(226, 232, 240, 0.9)",
						borderRadius: 18,
						padding: "18px 16px",
					}}
				>
					<h2
						style={{
							margin: 0,
							fontSize: 20,
							fontWeight: 900,
							color: "#0f172a",
						}}
					>
						How it works
					</h2>
					<ol
						style={{
							margin: "12px 0 0",
							paddingLeft: 18,
							color: "rgba(51, 65, 85, 1)",
							lineHeight: 1.7,
							fontWeight: 650,
						}}
					>
						<li>Describe what you need done (and any important proof).</li>
						<li>We match you with a verified operator (“Pilot”).</li>
						<li>Track progress and receive proof when the task is complete.</li>
					</ol>
				</section>

				<section style={{ marginTop: 22, display: "grid", gap: 12 }}>
					<div
						style={{
							background: "rgba(15, 23, 42, 0.92)",
							borderRadius: 18,
							padding: "18px 16px",
							color: "#fff",
						}}
					>
						<h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
							Ready to send a request?
						</h2>
						<p
							style={{
								margin: "10px 0 0",
								color: "rgba(226, 232, 240, 0.95)",
								lineHeight: 1.55,
								fontWeight: 650,
							}}
						>
							Submit in minutes, then follow live updates to completion.
						</p>
						<div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
							<a
								href="/client/signup"
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									padding: "12px 16px",
									borderRadius: 999,
									border: "1px solid rgba(255, 255, 255, 0.25)",
									background: "#2563eb",
									color: "#fff",
									fontWeight: 900,
									textDecoration: "none",
								}}
							>
								Start your request
							</a>
							<a
								href="/careers"
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									padding: "12px 16px",
									borderRadius: 999,
									border: "1px solid rgba(255, 255, 255, 0.35)",
									background: "transparent",
									color: "rgba(226, 232, 240, 0.95)",
									fontWeight: 900,
									textDecoration: "none",
								}}
							>
								Become a Pilot
							</a>
						</div>
					</div>
				</section>

				<footer
					style={{
						marginTop: 26,
						padding: "18px 0 6px",
						color: "rgba(71, 85, 105, 1)",
						fontSize: 13,
						fontWeight: 650,
						display: "flex",
						flexWrap: "wrap",
						gap: 12,
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div>© {new Date().getFullYear()} ErrandBridge</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
						<a href="/privacy-policy" style={{ color: "inherit" }}>
							Privacy
						</a>
						<a href="/terms" style={{ color: "inherit" }}>
							Terms
						</a>
						<button
							type="button"
							onClick={openCookiePreferences}
							style={{
								border: "none",
								background: "transparent",
								padding: 0,
								color: "inherit",
								cursor: "pointer",
								fontWeight: 650,
								textDecoration: "underline",
								textUnderlineOffset: 3,
							}}
						>
							Cookies
						</button>
					</div>
				</footer>
			</main>

			{showCookieBanner && (
				<Suspense fallback={null}>
					<CookieBanner />
				</Suspense>
			)}
		</div>
	);
}
