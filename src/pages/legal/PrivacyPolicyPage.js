import LegalLayout from "./LegalLayout";

export default function PrivacyPolicyPage() {
	return (
		<LegalLayout
			title="Privacy Policy"
			subtitle="How we collect, use, and protect information when you use ErrandBridge."
			updated="2026-07-13"
		>
			<section>
				<h2 style={{ margin: "0 0 8px" }}>Summary</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					ErrandBridge helps people request and complete errands. We collect the
					minimum information needed to provide the service, keep the platform
					secure, and improve the experience.
				</p>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>What we collect</h2>
				<ul
					style={{
						margin: 0,
						paddingLeft: 18,
						color: "#334155",
						lineHeight: 1.7,
					}}
				>
					<li>
						<strong>Account info</strong> (like email or phone number) to sign
						you in and communicate with you.
					</li>
					<li>
						<strong>Service data</strong> (errand requests, messages, support
						interactions) to deliver the service.
					</li>
					<li>
						<strong>Communication records</strong> (in-app chat logs and masked
						calls, including recordings and transcripts when available) to operate
						the service and support compliance, security, and protection.
					</li>
					<li>
						<strong>Device / app data</strong> (diagnostics, basic usage) to
						keep things reliable and fix bugs.
					</li>
					<li>
						<strong>Optional analytics</strong> if you consent to analytics
						cookies (see Cookie Policy).
					</li>
				</ul>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>How we use information</h2>
				<ul
					style={{
						margin: 0,
						paddingLeft: 18,
						color: "#334155",
						lineHeight: 1.7,
					}}
				>
					<li>Provide and operate the service.</li>
					<li>Prevent fraud and abuse.</li>
					<li>Provide customer support.</li>
					<li>
						Improve features and performance (only with analytics consent where
						required).
					</li>
				</ul>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Your choices</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					You can control analytics cookies at any time via the “Cookies” link
					in the footer. You may also request access, correction, or deletion of
					your personal data.
				</p>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Contact</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					For privacy requests, contact support via the app or email{" "}
					<a href="mailto:privacy@errandbridge.com">privacy@errandbridge.com</a>. For
					formal business or legal correspondence, you can also contact{" "}
					<a href="mailto:admin@errandbridge.com">admin@errandbridge.com</a> or write to
					 ErrandBridge Limited, International House, 6 South Molton Street, London,
					 W1K 5QF, United Kingdom. Business telephone: 01536 211973.
				</p>
			</section>
		</LegalLayout>
	);
}
