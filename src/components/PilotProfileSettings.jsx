/**
 * Pilot Profile Settings Component
 * User-friendly settings page with profile details, address, image upload, and vehicle info
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	clampFutureDateInputValue,
	clampPastDateInputValue,
	getFutureDateInputAnchorValue,
	getTodayDateInputValue,
} from "../utils/dateInput";
import "./PilotProfileSettings.css";

const PilotProfileSettings = ({
	user,
	token,
	apiBaseUrl,
	onClose,
	onSave,
	onDelete,
	initialTab,
}) => {
	const fileInputRef = useRef(null);
	const documentFileInputRef = useRef(null);
	const saveStateTimeoutRef = useRef(null);
	const todayDate = useMemo(() => getTodayDateInputValue(), []);
	const storageKey = useMemo(
		() => (user?.id ? `pilotProfile:${user.id}` : "pilotProfile:current"),
		[user?.id],
	);

	const resolveImageUrl = useCallback(
		(value) => {
			if (!value || typeof value !== "string") return null;
			if (value.startsWith("data:") || value.startsWith("http")) return value;
			return `${apiBaseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
		},
		[apiBaseUrl],
	);

	const getStoredProfile = useCallback(() => {
		if (typeof window === "undefined") return {};
		try {
			return JSON.parse(localStorage.getItem(storageKey) || "{}");
		} catch (error) {
			console.warn(
				"[PilotProfileSettings] Unable to parse stored profile",
				error,
			);
			return {};
		}
	}, [storageKey]);

	const storedProfile = getStoredProfile();
	const [activeTab, setActiveTab] = useState("personal"); // personal, address, vehicle, documents, security
	const [savingSection, setSavingSection] = useState("");
	const [savedSection, setSavedSection] = useState("");
	const [profileImage, setProfileImage] = useState(
		user?.profile_image_url || null,
	);
	const [profileImageRemoved, setProfileImageRemoved] = useState(false);
	const [imagePreview, setImagePreview] = useState(
		storedProfile.profile_image_preview ||
			resolveImageUrl(user?.profile_image_url) ||
			null,
	);

	// Personal Info
	const [personalInfo, setPersonalInfo] = useState({
		first_name: storedProfile.first_name || user?.first_name || "",
		last_name: storedProfile.last_name || user?.last_name || "",
		email: storedProfile.email || user?.email || "",
		phone: storedProfile.phone || user?.phone || "",
		date_of_birth: clampPastDateInputValue(
			storedProfile.date_of_birth || user?.date_of_birth || "",
			{ todayDate },
		),
	});

	// Address Info
	const [addressInfo, setAddressInfo] = useState({
		street_address: storedProfile.street_address || user?.street_address || "",
		city: storedProfile.city || user?.city || "",
		state_province: storedProfile.state_province || user?.state_province || "",
		postal_code: storedProfile.postal_code || user?.postal_code || "",
		country: storedProfile.country || user?.country || "Nigeria",
	});

	// Vehicle Info
	const [vehicleInfo, setVehicleInfo] = useState({
		vehicle_type:
			storedProfile.vehicle_type || user?.vehicle_type || "motorcycle",
		vehicle_make: storedProfile.vehicle_make || user?.vehicle_make || "",
		vehicle_model: storedProfile.vehicle_model || user?.vehicle_model || "",
		vehicle_year:
			storedProfile.vehicle_year ||
			user?.vehicle_year ||
			new Date().getFullYear(),
		license_plate: storedProfile.license_plate || user?.license_plate || "",
		insurance_provider:
			storedProfile.insurance_provider || user?.insurance_provider || "",
		insurance_expiry: clampFutureDateInputValue(
			storedProfile.insurance_expiry || user?.insurance_expiry || "",
			{ todayDate },
		),
	});

	// Security
	const [securityInfo, setSecurityInfo] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false,
	});

	const [message, setMessage] = useState({ type: "", text: "" });

	const documentTypes = useMemo(
		() => [
			{ value: "id_document", label: "Government ID" },
			{ value: "driver_license", label: "Driver License" },
			{ value: "vehicle_registration", label: "Vehicle Registration" },
			{ value: "insurance", label: "Insurance" },
			{ value: "proof_of_address", label: "Proof of Address" },
			{ value: "other", label: "Other Document" },
		],
		[],
	);

	const [documentType, setDocumentType] = useState("id_document");
	const [documentFiles, setDocumentFiles] = useState([]);

	const documentUploadRequirements = useMemo(() => {
		const requirements = {
			id_document: {
				requiredCount: 3,
				accept: "image/*",
				title: "Government ID requires 3 images",
				items: [
					"Photo 1: Front of the ID",
					"Photo 2: Back of the ID",
					"Photo 3: Selfie holding the ID (face + ID visible)",
				],
			},
		};

		return (
			requirements[documentType] || {
				requiredCount: 1,
				accept: "application/pdf,image/*",
				title: null,
				items: [],
			}
		);
	}, [documentType]);
	const [documents, setDocuments] = useState([]);
	const [documentsLoading, setDocumentsLoading] = useState(false);
	const [documentsUploading, setDocumentsUploading] = useState(false);
	const isSaving = Boolean(savingSection);

	useEffect(() => {
		return () => {
			if (saveStateTimeoutRef.current) {
				clearTimeout(saveStateTimeoutRef.current);
			}
		};
	}, []);

	const beginSectionSave = useCallback((sectionKey) => {
		if (saveStateTimeoutRef.current) {
			clearTimeout(saveStateTimeoutRef.current);
			saveStateTimeoutRef.current = null;
		}
		setSavedSection("");
		setSavingSection(sectionKey);
	}, []);

	const completeSectionSave = useCallback((sectionKey, succeeded = false) => {
		setSavingSection((current) => (current === sectionKey ? "" : current));
		if (!succeeded) {
			return;
		}
		setSavedSection(sectionKey);
		if (saveStateTimeoutRef.current) {
			clearTimeout(saveStateTimeoutRef.current);
		}
		saveStateTimeoutRef.current = setTimeout(() => {
			setSavedSection((current) => (current === sectionKey ? "" : current));
			saveStateTimeoutRef.current = null;
		}, 1800);
	}, []);

	const getButtonState = useCallback(
		(sectionKey) => {
			if (savingSection === sectionKey) return "saving";
			if (savedSection === sectionKey) return "saved";
			return "idle";
		},
		[savedSection, savingSection],
	);

	const renderSaveButtonContent = useCallback(
		({ sectionKey, idleLabel, savingLabel, savedLabel }) => {
			const state = getButtonState(sectionKey);
			const icon =
				state === "saving" ? "⏳" : state === "saved" ? "✅" : "💾";
			const label =
				state === "saving"
					? savingLabel
					: state === "saved"
						? savedLabel
						: idleLabel;
			return (
				<>
					<span className={`btn-save__status btn-save__status--${state}`} aria-hidden="true">
						{icon}
					</span>
					<span className="btn-save__label">{label}</span>
				</>
			);
		},
		[getButtonState],
	);

	const normalizeInsuranceExpiryAnchor = useCallback(() => {
		setVehicleInfo((prev) => {
			const next = getFutureDateInputAnchorValue(prev.insurance_expiry, {
				todayDate,
				fallback: todayDate || "",
			});
			if (next === prev.insurance_expiry) {
				return prev;
			}
			return { ...prev, insurance_expiry: next };
		});
	}, [todayDate]);

	useEffect(() => {
		if (!initialTab) return;
		setActiveTab(initialTab);
	}, [initialTab]);

	const buildProfilePayload = useCallback(
		() => ({
			...personalInfo,
			...addressInfo,
			...vehicleInfo,
			has_bike: ["bike", "bike_support", "bicycle", "motorbike", "motorcycle", "scooter"].includes(
				String(vehicleInfo.vehicle_type || "")
					.trim()
					.toLowerCase()
					.replace(/[\s-]+/g, "_"),
			),
			has_car: ["car", "saloon", "sedan", "suv", "van", "truck"].includes(
				String(vehicleInfo.vehicle_type || "")
					.trim()
					.toLowerCase()
					.replace(/[\s-]+/g, "_"),
			),
			service_area_text: String(addressInfo.city || addressInfo.state_province || "")
				.trim()
				.toLowerCase(),
			profile_image_url:
				profileImageRemoved
					? null
					: typeof profileImage === "string"
						? profileImage
						: user?.profile_image_url || null,
			profile_image_preview:
				typeof imagePreview === "string" ? imagePreview : null,
		}),
		[
			personalInfo,
			addressInfo,
			vehicleInfo,
			profileImage,
			profileImageRemoved,
			imagePreview,
			user?.profile_image_url,
		],
	);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const nextProfile = buildProfilePayload();
		try {
			localStorage.setItem(storageKey, JSON.stringify(nextProfile));
		} catch (error) {
			console.warn("[PilotProfileSettings] Unable to persist profile", error);
		}
	}, [buildProfilePayload, storageKey]);

	useEffect(() => {
		const nextProfile = getStoredProfile();
		setPersonalInfo({
			first_name: nextProfile.first_name || user?.first_name || "",
			last_name: nextProfile.last_name || user?.last_name || "",
			email: nextProfile.email || user?.email || "",
			phone: nextProfile.phone || user?.phone || "",
			date_of_birth: clampPastDateInputValue(
				nextProfile.date_of_birth || user?.date_of_birth || "",
				{ todayDate },
			),
		});
		setAddressInfo({
			street_address: nextProfile.street_address || user?.street_address || "",
			city: nextProfile.city || user?.city || "",
			state_province: nextProfile.state_province || user?.state_province || "",
			postal_code: nextProfile.postal_code || user?.postal_code || "",
			country: nextProfile.country || user?.country || "Nigeria",
		});
		setVehicleInfo({
			vehicle_type:
				nextProfile.vehicle_type || user?.vehicle_type || "motorcycle",
			vehicle_make: nextProfile.vehicle_make || user?.vehicle_make || "",
			vehicle_model: nextProfile.vehicle_model || user?.vehicle_model || "",
			vehicle_year:
				nextProfile.vehicle_year ||
				user?.vehicle_year ||
				new Date().getFullYear(),
			license_plate: nextProfile.license_plate || user?.license_plate || "",
			insurance_provider:
				nextProfile.insurance_provider || user?.insurance_provider || "",
			insurance_expiry: clampFutureDateInputValue(
				nextProfile.insurance_expiry || user?.insurance_expiry || "",
				{ todayDate },
			),
		});
		setImagePreview(
			nextProfile.profile_image_preview ||
				resolveImageUrl(user?.profile_image_url) ||
				null,
		);
	}, [getStoredProfile, resolveImageUrl, todayDate, user]);

	// Handle image upload
	const handleImageUpload = (e) => {
		const file = e.target.files[0];
		if (file) {
			// Validate file size (max 5MB)
			if (file.size > 5 * 1024 * 1024) {
				setMessage({ type: "error", text: "Image size must be less than 5MB" });
				return;
			}

			// Validate file type
			if (!file.type.startsWith("image/")) {
				setMessage({ type: "error", text: "Please select a valid image file" });
				return;
			}

			// Create preview
			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result);
				setProfileImage(file);
				setProfileImageRemoved(false);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleRemovePhoto = useCallback(async () => {
		if (!token) return;
		const ok = window.confirm(
			"Remove your profile photo? You can upload a new one anytime.",
		);
		if (!ok) return;

		beginSectionSave("photo");
		try {
			const formData = new FormData();
			formData.append("remove_profile_image", "true");

			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/profile`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(
					payload.detail || payload.message || "Failed to remove profile photo",
				);
			}

			setImagePreview(null);
			setProfileImage(null);
			setProfileImageRemoved(true);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}

			setMessage({ type: "success", text: "Profile photo removed." });
			if (onSave) {
				onSave({
					...personalInfo,
					...addressInfo,
					...vehicleInfo,
					profile_image_url: null,
					profile_image_preview: null,
				});
			}
			completeSectionSave("photo", true);
		} catch (err) {
			setMessage({
				type: "error",
				text: err?.message || "Failed to remove profile photo",
			});
			completeSectionSave("photo", false);
		} finally {
		}
	}, [
		addressInfo,
		apiBaseUrl,
		beginSectionSave,
		completeSectionSave,
		onSave,
		personalInfo,
		token,
		vehicleInfo,
	]);

	// Handle personal info changes
	const handlePersonalChange = (e) => {
		const { name, value } = e.target;
		setPersonalInfo((prev) => ({
			...prev,
			[name]:
				name === "date_of_birth"
					? clampPastDateInputValue(value, { todayDate })
					: value,
		}));
	};

	// Handle address info changes
	const handleAddressChange = (e) => {
		const { name, value } = e.target;
		setAddressInfo((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	// Handle vehicle info changes
	const handleVehicleChange = (e) => {
		const { name, value } = e.target;
		setVehicleInfo((prev) => ({
			...prev,
			[name]:
				name === "insurance_expiry"
					? clampFutureDateInputValue(value, { todayDate })
					: value,
		}));
	};

	useEffect(() => {
		if (!personalInfo.date_of_birth) return;
		const next = clampPastDateInputValue(personalInfo.date_of_birth, { todayDate });
		if (next !== personalInfo.date_of_birth) {
			setPersonalInfo((prev) => ({ ...prev, date_of_birth: next }));
		}
	}, [personalInfo.date_of_birth, todayDate]);

	useEffect(() => {
		if (!vehicleInfo.insurance_expiry) return;
		const next = clampFutureDateInputValue(vehicleInfo.insurance_expiry, {
			todayDate,
		});
		if (next !== vehicleInfo.insurance_expiry) {
			setVehicleInfo((prev) => ({ ...prev, insurance_expiry: next }));
		}
	}, [todayDate, vehicleInfo.insurance_expiry]);

	// Handle security info changes
	const handleSecurityChange = (e) => {
		const { name, value } = e.target;
		setSecurityInfo((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	// Save personal info
	const handleSavePersonal = async () => {
		beginSectionSave("personal");
		try {
			const formData = new FormData();
			formData.append("first_name", personalInfo.first_name);
			formData.append("last_name", personalInfo.last_name);
			formData.append("email", personalInfo.email);
			formData.append("phone", personalInfo.phone);
			if (personalInfo.date_of_birth) {
				formData.append("date_of_birth", personalInfo.date_of_birth);
			}

			if (profileImageRemoved && !(profileImage instanceof File)) {
				formData.append("remove_profile_image", "true");
			}

			// Add image if new one was selected
			if (profileImage instanceof File) {
				formData.append("profile_image", profileImage);
			}

			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/profile`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			});
			const payload = await response.json().catch(() => ({}));

			if (response.ok) {
				setMessage({
					type: "success",
					text: "Personal information saved successfully!",
				});
				if (onSave) {
					onSave(payload?.profile || buildProfilePayload());
				}
				completeSectionSave("personal", true);
			} else {
				setMessage({
					type: "error",
					text:
						payload.message ||
						payload.detail ||
						"Failed to save personal information",
				});
				completeSectionSave("personal", false);
			}
		} catch (err) {
			setMessage({ type: "error", text: "Error saving personal information" });
			console.error(err);
			completeSectionSave("personal", false);
		} finally {
		}
	};

	// Save address info
	const handleSaveAddress = async () => {
		beginSectionSave("address");
		try {
			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/address`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(addressInfo),
			});
			const payload = await response.json().catch(() => ({}));

			if (response.ok) {
				setMessage({ type: "success", text: "Address saved successfully!" });
				if (onSave) {
					onSave(payload?.profile || buildProfilePayload());
				}
				completeSectionSave("address", true);
			} else {
				setMessage({
					type: "error",
					text:
						payload.message || payload.detail || "Failed to save address",
				});
				completeSectionSave("address", false);
			}
		} catch (err) {
			setMessage({ type: "error", text: "Error saving address" });
			console.error(err);
			completeSectionSave("address", false);
		} finally {
		}
	};

	// Save vehicle info
	const handleSaveVehicle = async () => {
		beginSectionSave("vehicle");
		try {
			const response = await fetch(`${apiBaseUrl}/api/v1/pilots/vehicle`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(vehicleInfo),
			});
			const payload = await response.json().catch(() => ({}));

			if (response.ok) {
				setMessage({
					type: "success",
					text: "Vehicle information saved successfully!",
				});
				if (onSave) {
					onSave(payload?.profile || buildProfilePayload());
				}
				completeSectionSave("vehicle", true);
			} else {
				setMessage({
					type: "error",
					text:
						payload.message ||
						payload.detail ||
						"Failed to save vehicle information",
				});
				completeSectionSave("vehicle", false);
			}
		} catch (err) {
			setMessage({ type: "error", text: "Error saving vehicle information" });
			console.error(err);
			completeSectionSave("vehicle", false);
		} finally {
		}
	};

	// Change password
	const handleChangePassword = async () => {
		if (securityInfo.newPassword !== securityInfo.confirmPassword) {
			setMessage({ type: "error", text: "New passwords do not match" });
			return;
		}

		if (securityInfo.newPassword.length < 8) {
			setMessage({
				type: "error",
				text: "Password must be at least 8 characters",
			});
			return;
		}

		beginSectionSave("security");
		try {
			const response = await fetch(
				`${apiBaseUrl}/api/v1/pilots/change-password`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						current_password: securityInfo.currentPassword,
						new_password: securityInfo.newPassword,
					}),
				},
			);

			if (response.ok) {
				setMessage({ type: "success", text: "Password changed successfully!" });
				setSecurityInfo({
					currentPassword: "",
					newPassword: "",
					confirmPassword: "",
				});
				completeSectionSave("security", true);
			} else {
				const error = await response.json();
				setMessage({
					type: "error",
					text: error.message || "Failed to change password",
				});
				completeSectionSave("security", false);
			}
		} catch (err) {
			setMessage({ type: "error", text: "Error changing password" });
			console.error(err);
			completeSectionSave("security", false);
		} finally {
		}
	};

	const formatBytes = (sizeBytes) => {
		if (sizeBytes == null) return "-";
		if (sizeBytes < 1024) return `${sizeBytes} B`;
		const kb = sizeBytes / 1024;
		if (kb < 1024) return `${kb.toFixed(1)} KB`;
		const mb = kb / 1024;
		return `${mb.toFixed(1)} MB`;
	};

	const getDocumentTypeLabel = useCallback(
		(value) => {
			const match = documentTypes.find((item) => item.value === value);
			return match ? match.label : value || "Document";
		},
		[documentTypes],
	);

	const getDocumentStatusLabel = (status) => {
		const normalized = (status || "").toLowerCase();
		if (normalized === "approved") return "Approved";
		if (normalized === "rejected") return "Rejected";
		if (normalized === "pending") return "Pending review";
		return status || "Unknown";
	};

	const getDocumentStatusClass = (status) => {
		const normalized = (status || "").toLowerCase();
		if (normalized === "approved") return "approved";
		if (normalized === "rejected") return "rejected";
		if (normalized === "pending") return "pending";
		return "unknown";
	};

	const fetchDocuments = useCallback(
		async (showFeedback = false) => {
			if (!token) return;
			setDocumentsLoading(true);
			try {
				const response = await fetch(`${apiBaseUrl}/api/v1/pilots/documents`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				const payload = await response.json().catch(() => ({}));
				if (!response.ok) {
					throw new Error(
						payload.detail || payload.message || "Unable to load documents",
					);
				}

				setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
				if (showFeedback) {
					setMessage({ type: "success", text: "Documents refreshed." });
				}
			} catch (err) {
				setMessage({
					type: "error",
					text: err.message || "Unable to load documents",
				});
			} finally {
				setDocumentsLoading(false);
			}
		},
		[apiBaseUrl, token],
	);

	useEffect(() => {
		if (activeTab === "documents") {
			fetchDocuments();
		}
	}, [activeTab, fetchDocuments]);

	const handleDocumentFileChange = (event) => {
		const selected = Array.from(event.target.files || []);
		if (!selected.length) return;

		const tooLarge = selected.find((file) => file.size > 10 * 1024 * 1024);
		if (tooLarge) {
			setMessage({
				type: "error",
				text: `Each file must be less than 10MB ("${tooLarge.name}" is too large).`,
			});
			return;
		}

		if (documentUploadRequirements.requiredCount > 1) {
			const nonImage = selected.find((file) => !String(file.type || "").startsWith("image/"));
			if (nonImage) {
				setMessage({
					type: "error",
					text: `Please upload images only for ${getDocumentTypeLabel(documentType)} ("${nonImage.name}" is not an image).`,
				});
				return;
			}

			if (selected.length !== documentUploadRequirements.requiredCount) {
				setMessage({
					type: "error",
					text: `Please select exactly ${documentUploadRequirements.requiredCount} images for ${getDocumentTypeLabel(documentType)}.`,
				});
			}
		}

		setDocumentFiles(selected);
	};

	const handleDocumentUpload = async () => {
		const requiredCount = documentUploadRequirements.requiredCount;
		if (!documentFiles.length) {
			setMessage({
				type: "error",
				text:
					requiredCount > 1
						? `Select ${requiredCount} images to upload.`
						: "Select a document to upload.",
			});
			return;
		}

		if (documentFiles.length !== requiredCount) {
			setMessage({
				type: "error",
				text: `Please select exactly ${requiredCount} ${requiredCount === 1 ? "file" : "files"} before uploading.`,
			});
			return;
		}

		setDocumentsUploading(true);
		try {
			for (let index = 0; index < documentFiles.length; index += 1) {
				const file = documentFiles[index];
				const formData = new FormData();
				formData.append("file", file);

				const response = await fetch(
					`${apiBaseUrl}/api/v1/pilots/documents?document_type=${encodeURIComponent(documentType)}`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
						},
						body: formData,
					},
				);

				const payload = await response.json().catch(() => ({}));
				if (!response.ok) {
					throw new Error(
						payload.detail ||
							payload.message ||
							`Unable to upload ${file.name}`,
					);
				}
			}

			setMessage({
				type: "success",
				text:
					documentFiles.length === 1
						? "Document uploaded successfully."
						: `Uploaded ${documentFiles.length} files successfully.`,
			});
			setDocumentFiles([]);
			if (documentFileInputRef.current) {
				documentFileInputRef.current.value = "";
			}
			await fetchDocuments();
		} catch (err) {
			setMessage({
				type: "error",
				text: err.message || "Unable to upload document",
			});
		} finally {
			setDocumentsUploading(false);
		}
	};

	const handleDeleteAccount = async () => {
		const confirmDelete = window.confirm(
			"⚠️ WARNING: Deleting your account will:\n\n" +
				"• Permanently remove your profile details\n" +
				"• Log you out immediately\n\n" +
				"This action cannot be undone. Continue?",
		);

		if (!confirmDelete) return;

		const confirmPhrase = window.prompt(
			'Type "DELETE" to confirm account deletion:',
		);
		if (confirmPhrase !== "DELETE") {
			setMessage({ type: "error", text: "Account deletion cancelled." });
			return;
		}

		beginSectionSave("delete");
		try {
			const response = await fetch(`${apiBaseUrl}/auth/deactivate`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(payload.detail || "Unable to delete account");
			}

			if (typeof window !== "undefined") {
				localStorage.removeItem("pilotToken");
				localStorage.removeItem("pilotUser");
				localStorage.removeItem(storageKey);
			}

			if (onDelete) {
				onDelete();
			} else if (onClose) {
				onClose();
			}
		} catch (err) {
			setMessage({
				type: "error",
				text: err.message || "Unable to delete account",
			});
			completeSectionSave("delete", false);
		} finally {
		}
	};

	return (
		<div className="pilot-profile-settings">
			<button
				type="button"
				className="pilot-settings-backdrop"
				onClick={onClose}
				aria-label="Close profile settings"
			/>
			<div className="settings-container">
				{/* Header */}
				<div className="settings-header">
					<h1>⚙️ Profile Settings</h1>
					<button type="button" className="close-btn" onClick={onClose}>
						✕
					</button>
				</div>

				{/* Message Alert */}
				{message.text && (
					<div className={`message-alert ${message.type}`}>
						<span>{message.text}</span>
						<button
							type="button"
							onClick={() => setMessage({ type: "", text: "" })}
						>
							✕
						</button>
					</div>
				)}

				{/* Tabs */}
				<div className="settings-tabs">
					<button
						type="button"
						className={`tab-btn ${activeTab === "personal" ? "active" : ""}`}
						onClick={() => setActiveTab("personal")}
					>
						👤 Personal
					</button>
					<button
						type="button"
						className={`tab-btn ${activeTab === "address" ? "active" : ""}`}
						onClick={() => setActiveTab("address")}
					>
						📍 Address
					</button>
					<button
						type="button"
						className={`tab-btn ${activeTab === "vehicle" ? "active" : ""}`}
						onClick={() => setActiveTab("vehicle")}
					>
						🚗 Vehicle
					</button>
					<button
						type="button"
						className={`tab-btn ${activeTab === "documents" ? "active" : ""}`}
						onClick={() => setActiveTab("documents")}
					>
						📄 Documents
					</button>
					<button
						type="button"
						className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
						onClick={() => setActiveTab("security")}
					>
						🔒 Security
					</button>
				</div>

				{/* Content */}
				<div className="settings-content">
					{/* Personal Tab */}
					{activeTab === "personal" && (
						<div className="tab-content">
							<h2>Personal Information</h2>

							{/* Profile Image Section */}
							<div className="image-upload-section">
								<div className="image-preview-container">
									{imagePreview ? (
										<img
											src={imagePreview}
											alt="Profile"
											className="profile-image-preview"
										/>
									) : (
										<div className="image-placeholder">
											<span className="placeholder-icon">📸</span>
											<p>No photo</p>
										</div>
									)}
								</div>
								<div className="image-upload-controls">
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										onChange={handleImageUpload}
										className="hidden-input"
									/>
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => fileInputRef.current?.click()}
									>
										📷 Upload Photo
									</button>
									{imagePreview && (
										<button
											type="button"
											className="btn btn-secondary"
											onClick={handleRemovePhoto}
											disabled={isSaving}
										>
											🗑️ Remove Photo
										</button>
									)}
									<p className="image-help-text">
										Max 5MB • JPG, PNG, GIF supported
									</p>
								</div>
							</div>

							{/* Personal Info Fields */}
							<div className="form-section">
								<div className="form-group">
									<label htmlFor="pilot-first-name">First Name *</label>
									<input
										id="pilot-first-name"
										type="text"
										name="first_name"
										value={personalInfo.first_name}
										onChange={handlePersonalChange}
										placeholder="Enter first name"
									/>
								</div>
								<div className="form-group">
									<label htmlFor="pilot-last-name">Last Name *</label>
									<input
										id="pilot-last-name"
										type="text"
										name="last_name"
										value={personalInfo.last_name}
										onChange={handlePersonalChange}
										placeholder="Enter last name"
									/>
								</div>
								<div className="form-group">
									<label htmlFor="pilot-email">Email *</label>
									<input
										id="pilot-email"
										type="email"
										name="email"
										value={personalInfo.email}
										onChange={handlePersonalChange}
										placeholder="Enter email address"
									/>
								</div>
								<div className="form-group">
									<label htmlFor="pilot-phone">Phone Number *</label>
									<input
										id="pilot-phone"
										type="tel"
										name="phone"
										value={personalInfo.phone}
										onChange={handlePersonalChange}
										placeholder="Enter phone number"
									/>
								</div>
								<div className="form-group">
									<label htmlFor="pilot-dob">Date of Birth</label>
									<input
										id="pilot-dob"
										type="date"
										name="date_of_birth"
										max={todayDate}
										value={personalInfo.date_of_birth}
										onChange={handlePersonalChange}
									/>
								</div>
							</div>

							<button
								type="button"
								className="btn btn-primary btn-save"
								onClick={handleSavePersonal}
								disabled={isSaving}
								data-save-state={getButtonState("personal")}
								aria-live="polite"
							>
								{renderSaveButtonContent({
									sectionKey: "personal",
									idleLabel: "Save Personal Info",
									savingLabel: "Saving Personal Info...",
									savedLabel: "Personal Info Saved",
								})}
							</button>
						</div>
					)}

					{/* Address Tab */}
					{activeTab === "address" && (
						<div className="tab-content">
							<h2>Address Information</h2>
							<div className="form-section">
								<div className="form-group">
									<label htmlFor="pilot-street-address">Street Address *</label>
									<input
										id="pilot-street-address"
										type="text"
										name="street_address"
										value={addressInfo.street_address}
										onChange={handleAddressChange}
										placeholder="Enter street address"
									/>
								</div>
								<div className="form-row">
									<div className="form-group">
										<label htmlFor="pilot-city">City *</label>
										<input
											id="pilot-city"
											type="text"
											name="city"
											value={addressInfo.city}
											onChange={handleAddressChange}
											placeholder="Enter city"
										/>
									</div>
									<div className="form-group">
										<label htmlFor="pilot-state">State/Province</label>
										<input
											id="pilot-state"
											type="text"
											name="state_province"
											value={addressInfo.state_province}
											onChange={handleAddressChange}
											placeholder="Enter state/province"
										/>
									</div>
								</div>
								<div className="form-row">
									<div className="form-group">
										<label htmlFor="pilot-postal">Postal Code *</label>
										<input
											id="pilot-postal"
											type="text"
											name="postal_code"
											value={addressInfo.postal_code}
											onChange={handleAddressChange}
											placeholder="Enter postal code"
										/>
									</div>
									<div className="form-group">
										<label htmlFor="pilot-country">Country *</label>
										<select
											id="pilot-country"
											name="country"
											value={addressInfo.country}
											onChange={handleAddressChange}
										>
											<option value="Nigeria">🇳🇬 Nigeria</option>
											<option value="United Kingdom">🇬🇧 United Kingdom</option>
											<option value="United States">🇺🇸 United States</option>
											<option value="Canada">🇨🇦 Canada</option>
											<option value="Ghana">🇬🇭 Ghana</option>
											<option value="Kenya">🇰🇪 Kenya</option>
											<option value="South Africa">🇿🇦 South Africa</option>
											<option value="Other">🌍 Other</option>
										</select>
									</div>
								</div>
							</div>

							<button
								type="button"
								className="btn btn-primary btn-save"
								onClick={handleSaveAddress}
								disabled={isSaving}
								data-save-state={getButtonState("address")}
								aria-live="polite"
							>
								{renderSaveButtonContent({
									sectionKey: "address",
									idleLabel: "Save Address",
									savingLabel: "Saving Address...",
									savedLabel: "Address Saved",
								})}
							</button>
						</div>
					)}

					{/* Vehicle Tab */}
					{activeTab === "vehicle" && (
						<div className="tab-content">
							<h2>Vehicle Information</h2>
							<div className="form-section">
								<div className="form-group">
									<label htmlFor="pilot-vehicle-type">Vehicle Type *</label>
									<select
										id="pilot-vehicle-type"
										name="vehicle_type"
										value={vehicleInfo.vehicle_type}
										onChange={handleVehicleChange}
									>
										<option value="motorcycle">🏍️ Motorcycle</option>
										<option value="car">🚗 Car</option>
										<option value="van">🚐 Van</option>
										<option value="truck">🚚 Truck</option>
										<option value="bicycle">🚴 Bicycle</option>
									</select>
								</div>
								<div className="form-row">
									<div className="form-group">
										<label htmlFor="pilot-vehicle-make">Make/Brand *</label>
										<input
											id="pilot-vehicle-make"
											type="text"
											name="vehicle_make"
											value={vehicleInfo.vehicle_make}
											onChange={handleVehicleChange}
											placeholder="e.g., Honda, Toyota"
										/>
									</div>
									<div className="form-group">
										<label htmlFor="pilot-vehicle-model">Model *</label>
										<input
											id="pilot-vehicle-model"
											type="text"
											name="vehicle_model"
											value={vehicleInfo.vehicle_model}
											onChange={handleVehicleChange}
											placeholder="e.g., Civic, Camry"
										/>
									</div>
								</div>
								<div className="form-row">
									<div className="form-group">
										<label htmlFor="pilot-vehicle-year">Year *</label>
										<input
											id="pilot-vehicle-year"
											type="number"
											name="vehicle_year"
											value={vehicleInfo.vehicle_year}
											onChange={handleVehicleChange}
											min="1990"
											max={new Date().getFullYear() + 1}
										/>
									</div>
									<div className="form-group">
										<label htmlFor="pilot-license-plate">License Plate *</label>
										<input
											id="pilot-license-plate"
											type="text"
											name="license_plate"
											value={vehicleInfo.license_plate}
											onChange={handleVehicleChange}
											placeholder="e.g., ABC 123 XY"
										/>
									</div>
								</div>
								<div className="form-row">
									<div className="form-group">
										<label htmlFor="pilot-insurance-provider">
											Insurance Provider
										</label>
										<input
											id="pilot-insurance-provider"
											type="text"
											name="insurance_provider"
											value={vehicleInfo.insurance_provider}
											onChange={handleVehicleChange}
											placeholder="Insurance company name"
										/>
									</div>
									<div className="form-group">
										<label htmlFor="pilot-insurance-expiry">
											Insurance Expiry
										</label>
										<input
											id="pilot-insurance-expiry"
											type="date"
											name="insurance_expiry"
											min={todayDate}
											value={vehicleInfo.insurance_expiry}
											onFocus={normalizeInsuranceExpiryAnchor}
											onChange={handleVehicleChange}
										/>
										<p className="date-input-hint">
											Future-only date - the calendar opens from today onward.
										</p>
									</div>
								</div>
							</div>

							<button
								type="button"
								className="btn btn-primary btn-save"
								onClick={handleSaveVehicle}
								disabled={isSaving}
								data-save-state={getButtonState("vehicle")}
								aria-live="polite"
							>
								{renderSaveButtonContent({
									sectionKey: "vehicle",
									idleLabel: "Save Vehicle Info",
									savingLabel: "Saving Vehicle Info...",
									savedLabel: "Vehicle Info Saved",
								})}
							</button>
						</div>
					)}

					{/* Documents Tab */}
					{activeTab === "documents" && (
						<div className="tab-content">
							<h2>Verification Documents</h2>
							<p className="document-intro">
								Upload your identity and vehicle documents for admin approval.
								We&apos;ll review and notify you once verified.
							</p>

							<div className="document-upload-card">
								<div className="document-upload-grid">
									<div className="form-group">
										<label htmlFor="pilot-document-type">Document Type</label>
										<select
											id="pilot-document-type"
											value={documentType}
											onChange={(event) => {
												setDocumentType(event.target.value);
												setDocumentFiles([]);
												if (documentFileInputRef.current) {
													documentFileInputRef.current.value = "";
												}
											}}
										>
											{documentTypes.map((item) => (
												<option key={item.value} value={item.value}>
													{item.label}
												</option>
											))}
										</select>
										{documentUploadRequirements.requiredCount > 1 && (
											<div className="document-requirements" role="note">
												<strong>
													{documentUploadRequirements.title}
												</strong>
												<ul>
													{documentUploadRequirements.items.map((item) => (
														<li key={item}>{item}</li>
													))}
												</ul>
											</div>
										)}
									</div>
									<div className="form-group">
										<label htmlFor="pilot-document-file">File Upload</label>
										<input
											id="pilot-document-file"
											ref={documentFileInputRef}
											type="file"
											multiple={documentUploadRequirements.requiredCount > 1}
											accept={documentUploadRequirements.accept}
											onChange={handleDocumentFileChange}
											className="hidden-input"
										/>
										<div className="document-file-row">
											<button
												type="button"
												className="btn btn-secondary"
												onClick={() => documentFileInputRef.current?.click()}
											>
												📤 Select
												{documentUploadRequirements.requiredCount > 1
													? " Files"
													: " File"}
											</button>
											<span className="document-file-name">
												{documentFiles.length === 0
													? "No file selected"
													: documentFiles.length === 1
														? documentFiles[0].name
														: `${documentFiles.length} files selected`}
											</span>
										</div>
										{documentUploadRequirements.requiredCount > 1 && (
											<div className="document-file-count" aria-live="polite">
												Selected {documentFiles.length}/
												{documentUploadRequirements.requiredCount}
											</div>
										)}
										{documentFiles.length > 1 && (
											<ul className="document-selected-files">
												{documentFiles.map((file) => (
													<li key={`${file.name}-${file.size}`}>{file.name}</li>
												))}
											</ul>
										)}
									</div>
								</div>
								<div className="document-actions">
									<button
										type="button"
										className="btn btn-primary"
										onClick={handleDocumentUpload}
										disabled={
											documentsUploading ||
											documentFiles.length !== documentUploadRequirements.requiredCount
										}
									>
										{documentsUploading
											? "⏳ Uploading..."
											: documentUploadRequirements.requiredCount > 1
												? `✅ Upload ${documentUploadRequirements.requiredCount} Images`
												: "✅ Upload Document"}
									</button>
									<button
										type="button"
										className="btn btn-secondary"
										onClick={() => fetchDocuments(true)}
										disabled={documentsLoading}
									>
										{documentsLoading ? "Refreshing..." : "🔄 Refresh"}
									</button>
								</div>
								<p className="document-help-text">
									Max 10MB per file • PDF, JPG, PNG supported
								</p>
							</div>

							<div className="documents-list">
								{documentsLoading ? (
									<div className="documents-empty">Loading documents...</div>
								) : documents.length === 0 ? (
									<div className="documents-empty">
										No documents uploaded yet.
									</div>
								) : (
									documents.map((doc) => (
										<div key={doc.id} className="document-item">
											<div className="document-item-header">
												<div>
													<h3>{getDocumentTypeLabel(doc.document_type)}</h3>
													<p>{doc.original_filename || "Uploaded document"}</p>
												</div>
												<span
													className={`document-status ${getDocumentStatusClass(doc.status)}`}
												>
													{getDocumentStatusLabel(doc.status)}
												</span>
											</div>
											<div className="document-meta">
												<span>
													Uploaded:{" "}
													{doc.created_at
														? new Date(doc.created_at).toLocaleDateString()
														: "-"}
												</span>
												<span>Size: {formatBytes(doc.size_bytes)}</span>
											</div>
											{doc.review_note && (
												<div className="document-note">
													<strong>Admin note:</strong> {doc.review_note}
												</div>
											)}
										</div>
									))
								)}
							</div>
						</div>
					)}

					{/* Security Tab */}
					{activeTab === "security" && (
						<div className="tab-content">
							<h2>Security & Password</h2>
							<div className="form-section">
								<div className="form-group">
									<label htmlFor="pilot-current-password">
										Current Password *
									</label>
									<div className="password-input-wrapper">
										<input
											id="pilot-current-password"
											type={showPasswords.current ? "text" : "password"}
											name="currentPassword"
											value={securityInfo.currentPassword}
											onChange={handleSecurityChange}
											placeholder="Enter current password"
										/>
										<button
											type="button"
											className="toggle-password"
											onClick={() =>
												setShowPasswords((prev) => ({
													...prev,
													current: !prev.current,
												}))
											}
										>
											{showPasswords.current ? "🙈" : "👁️"}
										</button>
									</div>
								</div>
								<div className="form-group">
									<label htmlFor="pilot-new-password">New Password *</label>
									<div className="password-input-wrapper">
										<input
											id="pilot-new-password"
											type={showPasswords.new ? "text" : "password"}
											name="newPassword"
											value={securityInfo.newPassword}
											onChange={handleSecurityChange}
											placeholder="Enter new password (min 8 characters)"
										/>
										<button
											type="button"
											className="toggle-password"
											onClick={() =>
												setShowPasswords((prev) => ({
													...prev,
													new: !prev.new,
												}))
											}
										>
											{showPasswords.new ? "🙈" : "👁️"}
										</button>
									</div>
								</div>
								<div className="form-group">
									<label htmlFor="pilot-confirm-password">
										Confirm New Password *
									</label>
									<div className="password-input-wrapper">
										<input
											id="pilot-confirm-password"
											type={showPasswords.confirm ? "text" : "password"}
											name="confirmPassword"
											value={securityInfo.confirmPassword}
											onChange={handleSecurityChange}
											placeholder="Confirm new password"
										/>
										<button
											type="button"
											className="toggle-password"
											onClick={() =>
												setShowPasswords((prev) => ({
													...prev,
													confirm: !prev.confirm,
												}))
											}
										>
											{showPasswords.confirm ? "🙈" : "👁️"}
										</button>
									</div>
								</div>
							</div>

							<button
								type="button"
								className="btn btn-primary btn-save"
								onClick={handleChangePassword}
								disabled={
									isSaving ||
									!securityInfo.currentPassword ||
									!securityInfo.newPassword
								}
								data-save-state={getButtonState("security")}
								aria-live="polite"
							>
								{renderSaveButtonContent({
									sectionKey: "security",
									idleLabel: "Change Password",
									savingLabel: "Updating Password...",
									savedLabel: "Password Updated",
								})}
							</button>

							<div
								style={{
									marginTop: 24,
									paddingTop: 16,
									borderTop: "1px solid #e5e7eb",
								}}
							>
								<h3
									style={{
										margin: "0 0 8px",
										fontSize: 16,
										fontWeight: 700,
										color: "#b91c1c",
									}}
								>
									Delete Account
								</h3>
								<p
									style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}
								>
									This will permanently remove your profile details and log you
									out.
								</p>
								<button
									type="button"
									onClick={handleDeleteAccount}
									disabled={isSaving}
									style={{
										background: "#fee2e2",
										color: "#b91c1c",
										border: "1px solid #fecaca",
										borderRadius: 10,
										padding: "10px 16px",
										fontWeight: 700,
										cursor: "pointer",
									}}
								>
									🗑️ Delete Account
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default PilotProfileSettings;
