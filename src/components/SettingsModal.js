import { useState } from "react";

import "./SettingsModal.css";

export default function SettingsModal({
	open,
	onClose,
	isLoadingProfile,
	editFirstName,
	setEditFirstName,
	editLastName,
	setEditLastName,
	editEmail,
	setEditEmail,
	editAddress,
	setEditAddress,
	editCity,
	setEditCity,
	editCountry,
	setEditCountry,
	editPhone,
	setEditPhone,
	editPostcode,
	setEditPostcode,
	notifEnabled,
	setNotifEnabled,
	handleSaveSettings,
	changePasswordCurrentPassword,
	setChangePasswordCurrentPassword,
	changePasswordNewPassword,
	setChangePasswordNewPassword,
	changePasswordConfirmPassword,
	setChangePasswordConfirmPassword,
	handleChangePassword,
	changePasswordError,
	changePasswordSuccess,
	onStartOnboarding,
}) {
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	if (!open) return null;

	const handleBackdropPointerDown = (e) => {
		if (e.target === e.currentTarget) onClose();
	};

	return (
		<div className="ebSettingsBackdrop" onPointerDown={handleBackdropPointerDown}>
			<div
				className="ebSettingsDialog"
				role="dialog"
				aria-modal="true"
				aria-label="Settings"
			>
				<div className="ebSettingsInner">
					<div className="ebSettingsHeader">
						<div className="ebSettingsTitleWrap">
							<h3 className="ebSettingsTitle">Settings</h3>
							<p className="ebSettingsSubtitle">
								Update your profile, notifications, and password.
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="ebSettingsClose"
							aria-label="Close settings"
						>
							&times;
						</button>
					</div>

					{isLoadingProfile && (
						<div className="ebSettingsBanner ebSettingsBanner--info">
							Loading profile data...
						</div>
					)}

					<form
						onSubmit={(e) => {
							e.preventDefault();
							setIsSaving(true);
							handleSaveSettings(e);
							setTimeout(() => setIsSaving(false), 1000);
						}}
						className={isLoadingProfile ? "ebSettingsFormDisabled" : undefined}
					>
						<div>
							<label htmlFor="settings-first-name">First Name:</label>
							<input
								id="settings-first-name"
								type="text"
								value={editFirstName}
								onChange={(e) => setEditFirstName(e.target.value)}
								required
							/>

							<label htmlFor="settings-last-name">Last Name:</label>
							<input
								id="settings-last-name"
								type="text"
								value={editLastName}
								onChange={(e) => setEditLastName(e.target.value)}
								required
							/>

							<label htmlFor="settings-address">Address:</label>
							<input
								id="settings-address"
								type="text"
								value={editAddress}
								onChange={(e) => setEditAddress(e.target.value)}
								placeholder="Street address"
							/>

							<label htmlFor="settings-city">Town/City:</label>
							<input
								id="settings-city"
								type="text"
								value={editCity}
								onChange={(e) => setEditCity(e.target.value)}
								required
							/>

							<label htmlFor="settings-country">Country:</label>
							<select
								id="settings-country"
								value={editCountry}
								onChange={(e) => setEditCountry(e.target.value)}
								required
							>
								<option value="">Select Country</option>
								<option value="United Kingdom">🇬🇧 United Kingdom (+44)</option>
								<option value="United States">🇺🇸 United States (+1)</option>
								<option value="Nigeria">🇳🇬 Nigeria (+234)</option>
								<option value="Canada">🇨🇦 Canada (+1)</option>
								<option value="Germany">🇩🇪 Germany (+49)</option>
								<option value="France">🇫🇷 France (+33)</option>
								<option value="India">🇮🇳 India (+91)</option>
								<option value="South Africa">🇿🇦 South Africa (+27)</option>
								<option value="Other">🌍 Other</option>
							</select>

							<label htmlFor="settings-phone">Phone Number:</label>
							<div className="ebSettingsPhoneRow">
								<span className="ebSettingsPhonePrefix">
									{editCountry === "United Kingdom" && "🇬🇧 +44"}
									{editCountry === "United States" && "🇺🇸 +1"}
									{editCountry === "Nigeria" && "🇳🇬 +234"}
									{editCountry === "Canada" && "🇨🇦 +1"}
									{editCountry === "Germany" && "🇩🇪 +49"}
									{editCountry === "France" && "🇫🇷 +33"}
									{editCountry === "India" && "🇮🇳 +91"}
									{editCountry === "South Africa" && "🇿🇦 +27"}
									{editCountry === "Other" && "🌍"}
								</span>
								<input
									id="settings-phone"
									type="tel"
									value={editPhone}
									onChange={(e) => setEditPhone(e.target.value)}
									placeholder="Phone number"
									required
								/>
							</div>

							<label htmlFor="settings-postcode">Zip/Postcode:</label>
							<input
								id="settings-postcode"
								type="text"
								value={editPostcode}
								onChange={(e) => setEditPostcode(e.target.value)}
								required
							/>

							<label htmlFor="settings-email">Email:</label>
							<input
								id="settings-email"
								type="email"
								value={editEmail}
								onChange={(e) => setEditEmail(e.target.value)}
								required
							/>
						</div>

						<div className="ebSettingsRow">
							<label htmlFor="settings-notifications">Notifications:</label>
							<input
								id="settings-notifications"
								type="checkbox"
								checked={notifEnabled}
								onChange={(e) => {
									setNotifEnabled(e.target.checked);
								}}
							/>
							<span>{notifEnabled ? "Enabled" : "Disabled"}</span>
						</div>

						{onStartOnboarding && (
							<div className="ebSettingsCard">
								<div className="ebSettingsCardTitle">Quick Tour</div>
								<p className="ebSettingsCardDesc">
									Replay the guided tour to quickly find the main sections.
								</p>
								<button
									type="button"
									onClick={onStartOnboarding}
									className="ebSettingsBtnSmall"
								>
									Start tour
								</button>
							</div>
						)}

						<button
							type="submit"
							disabled={isSaving}
							className="ebSettingsBtnPrimary"
						>
							{isSaving ? "Saving..." : "Save Changes"}
						</button>
					</form>

					<div className="ebSettingsCard">
						<h4 className="ebSettingsCardTitle">Change Password</h4>

						{changePasswordError && (
							<div className="ebSettingsBanner ebSettingsBanner--error">
								{changePasswordError}
							</div>
						)}
						{changePasswordSuccess && (
							<div className="ebSettingsBanner ebSettingsBanner--success">
								{changePasswordSuccess}
							</div>
						)}

						<form
							onSubmit={(e) => {
								e.preventDefault();
								setIsChangingPassword(true);
								handleChangePassword(e);
								setTimeout(() => setIsChangingPassword(false), 2000);
							}}
						>
							<label htmlFor="settings-current-password">
								Current Password:
							</label>
							<div className="ebSettingsPasswordWrap">
								<input
									id="settings-current-password"
									type={showCurrentPassword ? "text" : "password"}
									value={changePasswordCurrentPassword}
									onChange={(e) =>
										setChangePasswordCurrentPassword(e.target.value)
									}
									placeholder="Current password"
								/>
								<button
									type="button"
									className="ebSettingsInlineAction"
									onClick={() => setShowCurrentPassword((v) => !v)}
								>
									{showCurrentPassword ? "Hide" : "Show"}
								</button>
							</div>

							<label htmlFor="settings-new-password">New Password:</label>
							<div className="ebSettingsPasswordWrap">
								<input
									id="settings-new-password"
									type={showNewPassword ? "text" : "password"}
									value={changePasswordNewPassword}
									onChange={(e) => setChangePasswordNewPassword(e.target.value)}
									placeholder="New password"
								/>
								<button
									type="button"
									className="ebSettingsInlineAction"
									onClick={() => setShowNewPassword((v) => !v)}
								>
									{showNewPassword ? "Hide" : "Show"}
								</button>
							</div>

							<label htmlFor="settings-confirm-password">
								Confirm New Password:
							</label>
							<div className="ebSettingsPasswordWrap">
								<input
									id="settings-confirm-password"
									type={showConfirmPassword ? "text" : "password"}
									value={changePasswordConfirmPassword}
									onChange={(e) =>
										setChangePasswordConfirmPassword(e.target.value)
									}
									placeholder="Confirm new password"
								/>
								<button
									type="button"
									className="ebSettingsInlineAction"
									onClick={() => setShowConfirmPassword((v) => !v)}
								>
									{showConfirmPassword ? "Hide" : "Show"}
								</button>
							</div>

							<button
								type="submit"
								disabled={isChangingPassword}
								className="ebSettingsBtnPrimary"
							>
								{isChangingPassword ? "Updating..." : "Change Password"}
							</button>
						</form>
					</div>

					<div className="ebSettingsMuted">More settings coming soon.</div>
				</div>
			</div>
		</div>
	);
}
