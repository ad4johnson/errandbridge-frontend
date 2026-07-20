import LegalLayout from "./LegalLayout";

export default function DataProtectionPage() {
	return (
		<LegalLayout
			title="Data Protection"
			subtitle="Your rights and how ErrandBridge handles data protection requests."
			updated="2026-07-13"
		>
			<section>
				<h2 style={{ margin: "0 0 8px" }}>Your rights</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					Depending on where you live, you may have rights to access, correct,
					delete, or port your personal data, and to object to or restrict
					certain processing.
				</p>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>How to make a request</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					The fastest way is to contact support through the app. Please include
					enough information for us to verify your account and locate the data
					related to your request. You can also email{" "}
					<a href="mailto:privacy@errandbridge.com">privacy@errandbridge.com</a> or{" "}
					<a href="mailto:admin@errandbridge.com">admin@errandbridge.com</a> for
					privacy and data-rights requests, or write to ErrandBridge Limited,
					 International House, 6 South Molton Street, London, W1K 5QF, United Kingdom.
				</p>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Response timeline</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					We aim to respond within a reasonable timeframe and as required by
					applicable law.
				</p>
			</section>
		</LegalLayout>
	);
}
