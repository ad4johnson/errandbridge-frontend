import LegalLayout from "./LegalLayout";

export default function CookiePolicyPage() {
	return (
		<LegalLayout
			title="Cookie Policy"
			subtitle="What cookies are, which ones we use, and how to control your preferences."
			updated="2026-07-13"
		>
			<section>
				<h2 style={{ margin: "0 0 8px" }}>What are cookies?</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					Cookies are small files stored on your device that help websites and
					apps remember information.
				</p>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Cookies we use</h2>
				<ul
					style={{
						margin: 0,
						paddingLeft: 18,
						color: "#334155",
						lineHeight: 1.7,
					}}
				>
					<li>
						<strong>Essential</strong>: required for core functionality and
						security.
					</li>
					<li>
						<strong>Analytics (optional)</strong>: used to understand usage and
						improve the product. We only enable analytics after you consent.
					</li>
				</ul>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Manage preferences</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					You can update your cookie settings at any time by clicking “Cookies”
					in the footer.
				</p>
			</section>

			<section>
				<h2 style={{ margin: "0 0 8px" }}>Contact</h2>
				<p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
					If you have questions about this Cookie Policy, contact ErrandBridge Limited at
					 <a href="mailto:privacy@errandbridge.com">privacy@errandbridge.com</a> or
					 <a href="mailto:admin@errandbridge.com">admin@errandbridge.com</a>, or write to
					 International House, 6 South Molton Street, London, W1K 5QF, United Kingdom.
				</p>
			</section>
		</LegalLayout>
	);
}
