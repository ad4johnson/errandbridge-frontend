import { useEffect } from "react";

export default function LegalLayout({ title, subtitle, updated, children }) {
	useEffect(() => {
		if (typeof document === "undefined") return;
		const previous = document.title;
		document.title = title ? `${title} • ErrandBridge` : previous;
		return () => {
			document.title = previous;
		};
	}, [title]);

	const handleReturnToLanding = (event) => {
		// If the legal page was opened from the landing footer, try to:
		// 1) focus the opener tab
		// 2) close this tab/window
		// Browsers only allow window.close() for windows opened via script.
		try {
			const params = new URLSearchParams(window.location.search || "");
			const openedFromLanding = params.get("src") === "landing";
			if (!openedFromLanding) return;

			event.preventDefault();

			if (window.opener && !window.opener.closed) {
				try {
					window.opener.focus();
					// Keep SPA state stable by navigating opener to home.
					window.opener.location.href = "/";
				} catch {
					// Ignore cross-origin / focus restrictions.
				}
			}

			// Attempt to close; if blocked, fall back to in-tab navigation.
			window.close();
			window.setTimeout(() => {
				if (!window.closed) window.location.href = "/";
			}, 120);
		} catch {
			// If anything fails, allow normal navigation.
		}
	};

	return (
		<div
			style={{
				background: "#f8fafc",
				minHeight: "100vh",
				padding: "40px 16px 56px",
			}}
		>
			<div style={{ maxWidth: 980, margin: "0 auto" }}>
				<header style={{ textAlign: "center", marginBottom: 20 }}>
					<p
						style={{
							margin: 0,
							fontSize: 12,
							fontWeight: 800,
							letterSpacing: "0.12em",
							textTransform: "uppercase",
							color: "#475569",
						}}
					>
						Privacy, security & compliance
					</p>
					<h1
						style={{
							margin: "10px 0 8px",
							fontSize: 34,
							letterSpacing: "-0.02em",
							color: "#0f172a",
						}}
					>
						{title}
					</h1>
					{subtitle && (
						<p
							style={{
								margin: "0 auto",
								maxWidth: 760,
								color: "#64748b",
								lineHeight: 1.6,
							}}
						>
							{subtitle}
						</p>
					)}
					{updated && (
						<p style={{ margin: "10px 0 0", color: "#475569", fontSize: 13 }}>
							Last updated: {updated}
						</p>
					)}
				</header>

				<main
					style={{
						background: "#ffffff",
						border: "1px solid rgba(148, 163, 184, 0.35)",
						borderRadius: 22,
						padding: "20px 22px",
						boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
					}}
				>
					<div style={{ display: "grid", gap: 14 }}>{children}</div>
					<div
						style={{
							marginTop: 18,
							textAlign: "center",
							fontSize: 13,
							color: "#64748b",
						}}
					>
						<div style={{ marginBottom: 10, lineHeight: 1.7 }}>
							<div style={{ fontWeight: 800, color: "#0f172a" }}>
								ErrandBridge™ is operated by ErrandBridge Limited
							</div>
							<div>Registered in England and Wales No. 17046914</div>
							<div>Registered Office: International House, 6 South Molton Street, London, W1K 5QF, United Kingdom</div>
							<div>
								<a href="mailto:admin@errandbridge.com" style={{ color: "#2563eb", fontWeight: 700 }}>
									admin@errandbridge.com
								</a>{" "}
								· {" "}
								<a href="tel:01536211973" style={{ color: "#2563eb", fontWeight: 700 }}>
									01536 211973
								</a>
							</div>
						</div>
						Return to{" "}
						<a
							href="/"
							onClick={handleReturnToLanding}
							style={{ color: "#2563eb", fontWeight: 700 }}
						>
							ErrandBridge
						</a>
						.
					</div>
				</main>
			</div>
		</div>
	);
}
