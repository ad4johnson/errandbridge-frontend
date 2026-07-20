// Checkout readiness/progress logic for Client UI v2.
//
// Keep this as a pure function so we can unit test it and prevent regressions.

export function computeCheckoutProgress({
	serviceKey,
	effectiveTemplateName,
	tierConfirmed,
	title,
	pickup,
	note,
	startLocationRequired = true,
}) {
	const missing = [];
	const hasService = Boolean(serviceKey);
	const hasTemplate = Boolean(String(effectiveTemplateName || "").trim());
	const hasTier = Boolean(tierConfirmed);
	const hasTitle = Boolean(String(title || "").trim());
	const pickupTrimmed = String(pickup || "").trim();
	const hasPickup = pickupTrimmed.length >= 3;
	const hasNote = Boolean(String(note || "").trim());

	if (!hasService) missing.push("Choose a category");
	if (hasService && !hasTemplate) missing.push("Choose a template");
	if (hasService && hasTemplate && !hasTier) missing.push("Select priority level");
	if (hasService && hasTemplate && hasTier && !hasTitle) missing.push("Add a short title");
	if (hasService && hasTemplate && hasTier && hasTitle && startLocationRequired && !hasPickup) {
		missing.push("Add starting point");
	}
	if (
		hasService &&
		hasTemplate &&
		hasTier &&
		hasTitle &&
		(startLocationRequired ? hasPickup : true) &&
		!hasNote
	) {
		missing.push("Describe what you need");
	}

	let percent = 0;
	let nextStepLabel = "Ready to continue";

	if (!hasService) {
		percent = 10;
		nextStepLabel = "Choose a category";
	} else if (!hasTemplate) {
		percent = 10;
		nextStepLabel = "Choose a template";
	} else if (!hasTier) {
		percent = 25;
		nextStepLabel = "Select priority level";
	} else if (!hasTitle) {
		percent = 40;
		nextStepLabel = "Add a short title";
	} else if (startLocationRequired && !hasPickup) {
		percent = 55;
		nextStepLabel = "Add starting point";
	} else if (!hasNote) {
		// Premium mobile rule: in manual mode, the Review & Pay rail may return
		// at 85% readiness. Keep the final missing step aligned with that.
		percent = 85;
		nextStepLabel = "Describe what you need";
	} else {
		percent = 100;
		nextStepLabel = "Ready to continue";
	}

	return {
		percent,
		nextStepLabel,
		missingRequired: missing,
	};
}
