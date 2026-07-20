import { useState } from "react";

const PilotEmploymentPage = ({ apiBaseUrl, showActionToast }) => {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [city, setCity] = useState("");
	const [country, setCountry] = useState("");
	const [experience, setExperience] = useState("");
	const [availability, setAvailability] = useState("");
	const [notes, setNotes] = useState("");
	const [resumeFile, setResumeFile] = useState(null);
	const [licenseFile, setLicenseFile] = useState(null);
	const [additionalFile, setAdditionalFile] = useState(null);
	const [submitting, setSubmitting] = useState(false);
	const [submitStatus, setSubmitStatus] = useState(null);

	const notify = (message, options = {}) => {
		if (showActionToast) {
			showActionToast(message, options);
			return;
		}
		// eslint-disable-next-line no-alert
		alert(message);
	};

	const resetForm = () => {
		setFirstName("");
		setLastName("");
		setEmail("");
		setPhone("");
		setCity("");
		setCountry("");
		setExperience("");
		setAvailability("");
		setNotes("");
		setResumeFile(null);
		setLicenseFile(null);
		setAdditionalFile(null);
	};

	const textFieldStyle = {
		marginTop: 6,
		width: "100%",
		padding: "12px 14px",
		borderRadius: 8,
		border: "1px solid #cbd5f5",
		fontSize: "16px",
		fontFamily: "inherit",
		minHeight: "44px",
		boxSizing: "border-box",
	};

	const textAreaStyle = {
		...textFieldStyle,
		minHeight: "120px",
		resize: "vertical",
	};

	const fileFieldStyle = {
		marginTop: 6,
		width: "100%",
		fontSize: "16px",
		fontFamily: "inherit",
		minHeight: "44px",
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setSubmitStatus(null);

		if (!firstName.trim() || !lastName.trim() || !email.trim()) {
			notify("Please fill out your name and email.", { type: "warning" });
			return;
		}
		if (!resumeFile) {
			notify("Please attach your CV.", { type: "warning" });
			return;
		}

		const formData = new FormData();
		formData.append("first_name", firstName.trim());
		formData.append("last_name", lastName.trim());
		formData.append("email", email.trim());
		if (phone.trim()) formData.append("phone", phone.trim());
		if (city.trim()) formData.append("city", city.trim());
		if (country.trim()) formData.append("country", country.trim());
		if (experience.trim()) formData.append("experience", experience.trim());
		if (availability.trim())
			formData.append("availability", availability.trim());
		if (notes.trim()) formData.append("notes", notes.trim());
		formData.append("resume", resumeFile);
		if (licenseFile) formData.append("driver_license", licenseFile);
		if (additionalFile) formData.append("additional_document", additionalFile);

		setSubmitting(true);
		try {
			const response = await fetch(
				`${apiBaseUrl}/pilot-employment/applications`,
				{
					method: "POST",
					body: formData,
				},
			);
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				const detail = data?.detail || "Unable to submit application.";
				notify(detail, { type: "error" });
				setSubmitStatus({ type: "error", message: detail });
				return;
			}

			notify("Application submitted. Our team will reach out soon.", {
				type: "success",
			});
			setSubmitStatus({
				type: "success",
				message: "Thanks! We received your application.",
			});
			resetForm();
		} catch (err) {
			console.error("Failed to submit pilot application", err);
			notify("Failed to submit. Please try again.", { type: "error" });
			setSubmitStatus({
				type: "error",
				message: "Submission failed. Please try again.",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 20,
				padding: "calc(12px + env(safe-area-inset-top, 0px)) 12px calc(18px + env(safe-area-inset-bottom, 0px))",
				boxSizing: "border-box",
			}}
		>
			<section
				style={{
					background: "#ffffff",
					border: "1px solid #e2e8f0",
					borderRadius: 14,
					padding: 20,
					boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
				}}
			>
				<h1
					style={{
						margin: 0,
						fontSize: "clamp(24px, 4vw, 32px)",
						fontWeight: 800,
						color: "#0f172a",
					}}
				>
					Operator Network Application
				</h1>
				<p style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
					Tip: When you’re done, you can close this tab/window to return to ErrandBridge.
				</p>
				<p
					style={{
						marginTop: 10,
						color: "#475569",
						fontSize: 14,
						lineHeight: 1.6,
					}}
				>
					Join the ErrandBridge operator network as a verified pilot. We match
					you with cross-border errands, provide transparent payout timelines,
					and give you the tools to deliver with proof.
				</p>
				<div
					style={{
						display: "grid",
						gap: 8,
						marginTop: 14,
						color: "#334155",
						fontSize: 13,
					}}
				>
					<div>✅ Structured errands with step-by-step guidance</div>
					<div>✅ Verified customer requests with proof requirements</div>
					<div>✅ Priority access to high-value routes</div>
				</div>
			</section>

			<section
				style={{
					background: "#f8fafc",
					border: "1px solid #e2e8f0",
					borderRadius: 14,
					padding: 20,
				}}
			>
				<h2
					style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}
				>
					Role Summary
				</h2>
				<ul
					style={{
						marginTop: 10,
						paddingLeft: 18,
						color: "#475569",
						fontSize: 13,
						lineHeight: 1.7,
					}}
				>
					<li>Accept verified errands within your city coverage.</li>
					<li>Capture proof of pickup and delivery in the app.</li>
					<li>Communicate professionally with clients through ErrandBridge.</li>
					<li>Follow safety and compliance guidelines for every errand.</li>
				</ul>
			</section>

			<section
				style={{
					background: "#ffffff",
					border: "1px solid #e2e8f0",
					borderRadius: 14,
					padding: 20,
				}}
			>
				<h2
					style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}
				>
					Apply Now
				</h2>
				<p style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>
					We review applications within 3-5 business days. Please upload a CV
					and any relevant documents.
				</p>

				{submitStatus && (
					<div
						style={{
							marginTop: 12,
							padding: "10px 12px",
							borderRadius: 10,
							border: `1px solid ${submitStatus.type === "success" ? "#bbf7d0" : "#fecaca"}`,
							background:
								submitStatus.type === "success" ? "#f0fdf4" : "#fef2f2",
							color: submitStatus.type === "success" ? "#166534" : "#991b1b",
							fontWeight: 600,
							fontSize: 13,
						}}
					>
						{submitStatus.message}
					</div>
				)}

				<form
					onSubmit={handleSubmit}
					style={{ marginTop: 16, display: "grid", gap: 14 }}
				>
					<div
						style={{
							display: "grid",
							gap: 12,
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
						}}
					>
						<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
							First name *
							<input
								type="text"
								value={firstName}
								onChange={(event) => setFirstName(event.target.value)}
								required
								style={textFieldStyle}
							/>
						</label>
						<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
							Last name *
							<input
								type="text"
								value={lastName}
								onChange={(event) => setLastName(event.target.value)}
								required
								style={textFieldStyle}
							/>
						</label>
					</div>
					<div
						style={{
							display: "grid",
							gap: 12,
							gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
						}}
					>
						<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
							Email *
							<input
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								required
								style={textFieldStyle}
							/>
						</label>
						<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
							Phone
							<input
								type="tel"
								value={phone}
								onChange={(event) => setPhone(event.target.value)}
								style={textFieldStyle}
							/>
						</label>
					</div>
					<div
						style={{
							display: "grid",
							gap: 12,
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
						}}
					>
						<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
							City
							<input
								type="text"
								value={city}
								onChange={(event) => setCity(event.target.value)}
								style={textFieldStyle}
							/>
						</label>
						<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
							Country
							<input
								type="text"
								value={country}
								onChange={(event) => setCountry(event.target.value)}
								style={textFieldStyle}
							/>
						</label>
					</div>
					<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
						Experience
						<textarea
							rows={4}
							value={experience}
							onChange={(event) => setExperience(event.target.value)}
							placeholder="Tell us about delivery, logistics, or customer service experience."
							style={textAreaStyle}
						/>
					</label>
					<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
						Availability
						<textarea
							rows={3}
							value={availability}
							onChange={(event) => setAvailability(event.target.value)}
							placeholder="Share your usual availability window."
							style={textAreaStyle}
						/>
					</label>
					<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
						Additional notes
						<textarea
							rows={3}
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder="Let us know anything else we should consider."
							style={textAreaStyle}
						/>
					</label>

					<div
						style={{
							display: "grid",
							gap: 12,
							gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
						}}
					>
						<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
							CV *
							<input
								type="file"
								accept=".pdf,.doc,.docx"
								onChange={(event) =>
									setResumeFile(event.target.files?.[0] || null)
								}
								required
								style={fileFieldStyle}
							/>
						</label>
						<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
							Driving licence (optional)
							<input
								type="file"
								accept=".pdf,.png,.jpg,.jpeg"
								onChange={(event) =>
									setLicenseFile(event.target.files?.[0] || null)
								}
								style={fileFieldStyle}
							/>
						</label>
					</div>
					<label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
						Additional document (optional)
						<input
							type="file"
							accept=".pdf,.png,.jpg,.jpeg"
							onChange={(event) =>
								setAdditionalFile(event.target.files?.[0] || null)
							}
							style={fileFieldStyle}
						/>
					</label>

					<button
						type="submit"
						disabled={submitting}
						style={{
							padding: "12px 16px",
							borderRadius: 10,
							border: "none",
							background: submitting ? "#93c5fd" : "#2563eb",
							color: "#fff",
							fontWeight: 700,
							fontSize: 14,
							cursor: submitting ? "not-allowed" : "pointer",
						}}
					>
						{submitting ? "Submitting…" : "Submit application"}
					</button>
				</form>
			</section>

			<section
				style={{
					background: "#0f172a",
					borderRadius: 14,
					padding: 18,
					color: "#e2e8f0",
				}}
			>
				<h3 style={{ margin: 0, fontSize: 16 }}>Need help?</h3>
				<p style={{ marginTop: 6, fontSize: 12, color: "#cbd5f5" }}>
					Email{" "}
					<a
						href="mailto:careers@errandbridge.com"
						style={{
							color: "#38bdf8",
							fontWeight: 700,
							textDecoration: "underline",
						}}
					>
						careers@errandbridge.com
					</a>{" "}
					for any questions.
				</p>
			</section>
		</div>
	);
};

export default PilotEmploymentPage;
