import { Navigate, Route, Routes } from "react-router-dom";
import CookiePolicyPage from "./CookiePolicyPage";
import DataProtectionPage from "./DataProtectionPage";
import PrivacyPolicyPage from "./PrivacyPolicyPage";
import TermsOfServicePage from "./TermsOfServicePage";

export default function LegalAppRouter() {
	return (
		<Routes>
			<Route path="privacy-policy" element={<PrivacyPolicyPage />} />
			<Route path="terms-of-service" element={<TermsOfServicePage />} />
			<Route path="cookie-policy" element={<CookiePolicyPage />} />
			<Route path="data-protection" element={<DataProtectionPage />} />

			{/* Back-compat */}
			<Route
				path="terms"
				element={<Navigate to="/terms-of-service" replace />}
			/>
			<Route
				path="privacy"
				element={<Navigate to="/privacy-policy" replace />}
			/>
		</Routes>
	);
}
