import { lazy, Suspense } from "react";

const RouterShell = lazy(() => import("./RouterShell"));

const PrivacyPolicyPage = lazy(() => import("./pages/legal/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/legal/TermsOfServicePage"));
const CookiePolicyPage = lazy(() => import("./pages/legal/CookiePolicyPage"));
const DataProtectionPage = lazy(() => import("./pages/legal/DataProtectionPage"));

const pickLegalPage = (pathname = "") => {
	const p = pathname || "";

	// Current canonical SPA paths
	if (p === "/privacy-policy" || p.startsWith("/privacy-policy/"))
		return PrivacyPolicyPage;
	if (p === "/terms-of-service" || p.startsWith("/terms-of-service/"))
		return TermsOfServicePage;
	if (p === "/cookie-policy" || p.startsWith("/cookie-policy/"))
		return CookiePolicyPage;
	if (p === "/data-protection" || p.startsWith("/data-protection/"))
		return DataProtectionPage;

	// Back-compat / alternate paths that exist in the wild
	if (p === "/privacy" || p.startsWith("/privacy/")) return PrivacyPolicyPage;
	if (p === "/terms" || p.startsWith("/terms/")) return TermsOfServicePage;
	if (p === "/privacy.html") return PrivacyPolicyPage;
	if (p === "/terms.html") return TermsOfServicePage;

	return null;
};

const MinimalFallback = ({ label }) => (
	<div
		style={{
			minHeight: "100dvh",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			fontFamily:
				"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
			color: "rgba(15, 23, 42, 0.72)",
			fontWeight: 700,
			padding: 24,
		}}
	>
		Loading {label}…
	</div>
);

export default function Bootstrap() {
	const pathname =
		typeof window !== "undefined" ? window.location?.pathname || "/" : "/";

	const LegalPage = pickLegalPage(pathname);
	if (LegalPage) {
		return (
			<Suspense fallback={<MinimalFallback label="policy" />}>
				<LegalPage />
			</Suspense>
		);
	}

	return (
		<Suspense fallback={<MinimalFallback label="app" />}>
			<RouterShell />
		</Suspense>
	);
}
