import LegalLayout from "./LegalLayout";

export default function TermsOfServicePage() {
	return (
		<LegalLayout
			title="Terms of Service"
			subtitle="The rules for using ErrandBridge, including responsibilities and acceptable use."
			updated="2026-07-13"
		>
			<section>
				<h2 style={{ margin: "0 0 8px" }}>Company information</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					ErrandBridge™ is operated by ErrandBridge Limited, a private company registered
					in England and Wales under company number 17046914. Registered office:
					 International House, 6 South Molton Street, London, W1K 5QF, United Kingdom.
					 Business contact: <a href="mailto:admin@errandbridge.com">admin@errandbridge.com</a>
					 and 01536 211973.
				</p>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Using ErrandBridge</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					By accessing or using ErrandBridge, you agree to follow these Terms.
					You’re responsible for the content you submit and for keeping your
					login details secure.
				</p>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Acceptable use</h2>
				<ul
					style={{
						margin: 0,
						paddingLeft: 18,
						color: "#334155",
						lineHeight: 1.7,
					}}
				>
					<li>Don’t break the law or violate others’ rights.</li>
					<li>
						Don’t attempt to access accounts or systems without authorization.
					</li>
					<li>
						Don’t misuse the service (spam, harassment, or abusive behavior).
					</li>
				</ul>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Service changes</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					We may update features and will try to minimize disruption.
				</p>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Communications monitoring</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					In-app chats and in-app calls are monitored for data compliance and protection.
					Calls may be recorded and transcribed when available. Use chat and calling
					only for errand coordination, and do not share sensitive information.
				</p>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Disclaimers</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					The service is provided “as is” without warranties to the extent
					permitted by law.
				</p>
			</section>
		</LegalLayout>
	);
}
