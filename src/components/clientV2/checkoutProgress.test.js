import { computeCheckoutProgress } from "./checkoutProgress";

describe("computeCheckoutProgress", () => {
	test("requires category first", () => {
		const progress = computeCheckoutProgress({
			serviceKey: "",
			effectiveTemplateName: "",
			tierConfirmed: false,
			title: "",
			pickup: "",
			note: "",
		});

		expect(progress.percent).toBe(10);
		expect(progress.nextStepLabel).toBe("Choose a category");
		expect(progress.missingRequired).toEqual(["Choose a category"]);
	});

	test("requires template after category", () => {
		const progress = computeCheckoutProgress({
			serviceKey: "documents",
			effectiveTemplateName: "",
			tierConfirmed: false,
			title: "",
			pickup: "",
			note: "",
		});

		expect(progress.percent).toBe(10);
		expect(progress.nextStepLabel).toBe("Choose a template");
		expect(progress.missingRequired).toEqual(["Choose a template"]);
	});

	test("requires pricing tier confirmation after template", () => {
		const progress = computeCheckoutProgress({
			serviceKey: "documents",
			effectiveTemplateName: "Official Document / Office Pickup",
			tierConfirmed: false,
			title: "",
			pickup: "",
			note: "",
		});

		expect(progress.percent).toBe(25);
		expect(progress.nextStepLabel).toBe("Select priority level");
		expect(progress.missingRequired).toEqual(["Select priority level"]);
	});

	test("requires a short title after tier confirmation", () => {
		const progress = computeCheckoutProgress({
			serviceKey: "documents",
			effectiveTemplateName: "Official Document / Office Pickup",
			tierConfirmed: true,
			title: "   ",
			pickup: "Lekki",
			note: "Need to pick up documents",
		});

		expect(progress.percent).toBe(40);
		expect(progress.nextStepLabel).toBe("Add a short title");
		expect(progress.missingRequired).toEqual(["Add a short title"]);
	});

	test("requires pickup after title", () => {
		const progress = computeCheckoutProgress({
			serviceKey: "documents",
			effectiveTemplateName: "Official Document / Office Pickup",
			tierConfirmed: true,
			title: "Passport pickup",
			pickup: "Ik",
			note: "Need to pick up documents",
		});

		expect(progress.percent).toBe(55);
		expect(progress.nextStepLabel).toBe("Add starting point");
		expect(progress.missingRequired).toEqual(["Add starting point"]);
	});

	test("requires note after pickup (85% rule)", () => {
		const progress = computeCheckoutProgress({
			serviceKey: "documents",
			effectiveTemplateName: "Official Document / Office Pickup",
			tierConfirmed: true,
			title: "Passport pickup",
			pickup: "Ikeja",
			note: "",
		});

		expect(progress.percent).toBe(85);
		expect(progress.nextStepLabel).toBe("Describe what you need");
		expect(progress.missingRequired).toEqual(["Describe what you need"]);
	});

	test("family emergency can continue without a starting point", () => {
		const progress = computeCheckoutProgress({
			serviceKey: "familyEmergency",
			effectiveTemplateName: "Family Emergency Support",
			tierConfirmed: true,
			title: "Welfare check",
			pickup: "",
			note: "Please check on my dad and confirm he is okay.",
			startLocationRequired: false,
		});

		expect(progress.percent).toBe(100);
		expect(progress.nextStepLabel).toBe("Ready to continue");
		expect(progress.missingRequired).toEqual([]);
	});

	test("is ready when all fields are present", () => {
		const progress = computeCheckoutProgress({
			serviceKey: "documents",
			effectiveTemplateName: "Official Document / Office Pickup",
			tierConfirmed: true,
			title: "Passport pickup",
			pickup: "Ikeja",
			note: "Pick up my passport and send photo proof",
		});

		expect(progress.percent).toBe(100);
		expect(progress.nextStepLabel).toBe("Ready to continue");
		expect(progress.missingRequired).toEqual([]);
	});
});
