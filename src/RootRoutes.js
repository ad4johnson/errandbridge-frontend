import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { isPilotRuntimeHost } from "./lib/hostRouting";
import LandingApp from "./LandingApp";

const CustomerAuthPage = lazy(() => import("./CustomerAuthPage"));
const InvestorsLanding = lazy(() => import("./pages/investors/InvestorsLanding"));
const LegalAppRouter = lazy(() => import("./pages/legal/LegalRoutes"));
const RootApp = lazy(() => import("./RootApp"));

const renderPublicAuthRoute = () => {
	const Component = isPilotRuntimeHost() ? RootApp : CustomerAuthPage;
	return (
		<Suspense fallback={null}>
			<Component />
		</Suspense>
	);
};

export default function RootRoutes() {
	return (
		<Routes>
			{/* Ultra-light landing (improves Lighthouse / first paint) */}
			<Route
				path="/lite"
				element={<LandingApp />}
			/>

			{/* Investors portal (SPA) */}
			<Route
				path="/investors"
				element={
					<Suspense fallback={null}>
						<InvestorsLanding />
					</Suspense>
				}
			/>
			<Route
				path="/investors/index.html"
				element={<Navigate to="/investors" replace />}
			/>

			{/* Legacy customer entrypoints (keep old links working) */}
			<Route path="/client" element={<Navigate to="/" replace />} />
			<Route path="/client/login" element={<Navigate to="/login" replace />} />
			<Route path="/client/signup" element={<Navigate to="/signup" replace />} />

			{/* Lightweight customer auth entrypoints */}
			<Route
				path="/login"
				element={renderPublicAuthRoute()}
			/>
			<Route
				path="/signup"
				element={renderPublicAuthRoute()}
			/>

			{/* Legal (SPA) */}
			<Route
				path="/privacy-policy/*"
				element={
					<Suspense fallback={null}>
						<LegalAppRouter />
					</Suspense>
				}
			/>
			<Route
				path="/terms-of-service/*"
				element={
					<Suspense fallback={null}>
						<LegalAppRouter />
					</Suspense>
				}
			/>
			<Route
				path="/cookie-policy/*"
				element={
					<Suspense fallback={null}>
						<LegalAppRouter />
					</Suspense>
				}
			/>
			<Route
				path="/data-protection/*"
				element={
					<Suspense fallback={null}>
						<LegalAppRouter />
					</Suspense>
				}
			/>
			<Route
				path="/privacy/*"
				element={
					<Suspense fallback={null}>
						<LegalAppRouter />
					</Suspense>
				}
			/>
			<Route
				path="/terms/*"
				element={
					<Suspense fallback={null}>
						<LegalAppRouter />
					</Suspense>
				}
			/>

			{/* Everything else (existing app behavior, incl. /pilot*) */}
			<Route
				path="*"
				element={
					<Suspense fallback={null}>
						<RootApp />
					</Suspense>
				}
			/>
		</Routes>
	);
}
