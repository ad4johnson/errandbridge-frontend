import "@testing-library/jest-dom";

import { useState } from "react";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ClientDashboardV2 from "./ClientDashboardV2";

import { CATALOG_CATEGORIES, getTemplatesForCategory } from "../../data/serviceCatalogV2";

function buildBaseProps(overrides = {}) {
	const noop = () => {};
	return {
		mode: "create",
		onOpenCreate: noop,
		onOpenErrands: noop,
		isMobile: false,
		estimatedTotalLabel: "-",
		regionKey: "uk",
		onRegionChange: noop,
		serviceKey: null,
		onServiceChange: noop,
		templateName: "",
		onTemplateSelect: noop,
		tierKey: "standard",
		onTierChange: noop,
		pricesByLane: {},
		selectedFiles: [],
		onSelectedFilesChange: noop,
		onRemoveSelectedFile: noop,
		accessNotes: "",
		onAccessNotesChange: noop,
		title: "",
		onTitleChange: noop,
		note: "",
		onNoteChange: noop,
		pickup: "",
		onPickupChange: noop,
		dropoff: "",
		onDropoffChange: noop,
		scheduleType: "now",
		scheduleSummary: "",
		onScheduleTypeChange: noop,
		onClearSchedule: noop,
		onOpenSchedule: noop,
		recurringFrequency: "weekly",
		recurringDays: [],
		recurringTime: "09:00",
		onRecurringFrequencyChange: noop,
		onRecurringDaysChange: noop,
		onRecurringTimeChange: noop,
		onOpenPayment: noop,
		errands: [],
		onOpenErrand: noop,
		onOpenAssistant: noop,
		onCloseAssistant: noop,
		assistantOpen: false,
		onSelectedErrandChange: noop,
		trackingStatusByErrand: {},
		refreshTrackingStatus: noop,
		onOpenTracking: noop,
		apiBaseUrl: "",
		PilotTrackerComponent: null,
		externalSelectedErrandId: null,
		focusLiveMapErrandId: null,
		...overrides,
	};
}

async function goSmartBuilder(user) {
	await user.click(screen.getByRole("button", { name: /smart builder/i }));
}

function LocationTimingHarness({ onPickupChangeSpy, onDropoffChangeSpy, dashboardOverrides = {} } = {}) {
	const [pickup, setPickup] = useState("");
	const [dropoff, setDropoff] = useState("");
	const [supportType, setSupportType] = useState("flexible");
	const [preferredTime, setPreferredTime] = useState(
		String(dashboardOverrides.preferredTime || "asap"),
	);
	const [scheduleType, setScheduleType] = useState(
		String(dashboardOverrides.scheduleType || "now"),
	);
	const [recurringFrequency, setRecurringFrequency] = useState(
		String(dashboardOverrides.recurringFrequency || "weekly"),
	);
	const [recurringDays, setRecurringDays] = useState(
		Array.isArray(dashboardOverrides.recurringDays) ? dashboardOverrides.recurringDays : [],
	);
	const [recurringTime, setRecurringTime] = useState(
		String(dashboardOverrides.recurringTime || "09:00"),
	);
	const [accessNotes, setAccessNotes] = useState("");
	const [selectedFiles, setSelectedFiles] = useState([]);

	return (
		<ClientDashboardV2
			{...buildBaseProps({
				pickup,
				dropoff,
				supportType,
				preferredTime,
				accessNotes,
				selectedFiles,
				onPickupChange: (value) => {
					setPickup(value);
					onPickupChangeSpy?.(value);
				},
				onDropoffChange: (value) => {
					setDropoff(value);
					onDropoffChangeSpy?.(value);
				},
				onSupportTypeChange: (value) => setSupportType(String(value || "flexible")),
				onPreferredTimeChange: (value) => setPreferredTime(String(value || "asap")),
				scheduleType,
				onScheduleTypeChange: (value) => setScheduleType(String(value || "now")),
				recurringFrequency,
				recurringDays,
				recurringTime,
				onRecurringFrequencyChange: (value) =>
					setRecurringFrequency(String(value || "weekly")),
				onRecurringDaysChange: (value) =>
					setRecurringDays(Array.isArray(value) ? value : []),
				onRecurringTimeChange: (value) =>
					setRecurringTime(String(value || "09:00")),
				onAccessNotesChange: (value) => setAccessNotes(value),
				onSelectedFilesChange: (files) => setSelectedFiles(files),
				...dashboardOverrides,
			})}
		/>
	);
}

function FamilyEmergencyHarness() {
	const [title, setTitle] = useState("Family welfare check");
	const [note, setNote] = useState("Please check on my aunt and send an update.");
	const [tierKey, setTierKey] = useState("premium");

	return (
		<ClientDashboardV2
			{...buildBaseProps({
				serviceKey: "familyEmergency",
				templateName: "Family Emergency Support",
				tierKey,
				title,
				note,
				pricesByLane: {
					familyEmergency: {
						GBP: { standard: 69, priority: 109, premium: 149 },
					},
				},
				onTierChange: (value) => setTierKey(String(value || "premium")),
				onTitleChange: (value) => setTitle(String(value || "")),
				onNoteChange: (value) => setNote(String(value || "")),
			})}
		/>
	);
}

function CheckoutProceedHarness({ laneKey, templateName, pricesByLane, dashboardOverrides = {} }) {
	const [pickup, setPickup] = useState("");
	const [title, setTitle] = useState("Passport pickup");
	const [note, setNote] = useState("Pick up documents from the front desk.");
	const [tierKey, setTierKey] = useState("standard");

	return (
		<ClientDashboardV2
			{...buildBaseProps({
				serviceKey: laneKey,
				templateName,
				pricesByLane,
				tierKey,
				onTierChange: (value) => setTierKey(String(value || "standard")),
				title,
				onTitleChange: (value) => setTitle(String(value || "")),
				note,
				onNoteChange: (value) => setNote(String(value || "")),
				pickup,
				onPickupChange: (value) => setPickup(value),
				...dashboardOverrides,
			})}
		/>
	);
}

function SmartTemplateSelectionHarness({ categoryKey = "documents" }) {
	const category = CATALOG_CATEGORIES.find((item) => item.key === categoryKey);
	const templates = getTemplatesForCategory(categoryKey);
	const [templateName, setTemplateName] = useState(String(templates[0]?.name || ""));

	return (
		<ClientDashboardV2
			{...buildBaseProps({
				serviceKey: category?.laneKey || "documents",
				templateName,
				pricesByLane: {
					[category?.laneKey || "documents"]: {
						GBP: { standard: 45, priority: 54, premium: 65 },
					},
				},
				onTemplateSelect: (template) =>
					setTemplateName(String(template?.name || "")),
			})}
		/>
	);
}

function MobileCatalogSpotlightHarness({ categoryKey = "documents" }) {
	const category = CATALOG_CATEGORIES.find((item) => item.key === categoryKey);
	const templates = getTemplatesForCategory(categoryKey);
	const [templateName, setTemplateName] = useState(String(templates[0]?.name || ""));
	const [supportType, setSupportType] = useState("flexible");

	return (
		<ClientDashboardV2
			{...buildBaseProps({
				isMobile: true,
				serviceKey: category?.laneKey || "documents",
				templateName,
				supportType,
				pricesByLane: {
					[category?.laneKey || "documents"]: {
						GBP: { standard: 45, priority: 54, premium: 65 },
					},
				},
				onTemplateSelect: (template) =>
					setTemplateName(String(template?.name || "")),
				onSupportTypeChange: (value) => setSupportType(String(value || "flexible")),
			})}
		/>
	);
}

function ErrandsModeHarness({ dashboardOverrides = {} } = {}) {
	const sampleErrands = Array.from({ length: 6 }, (_, index) => ({
		id: `live-${index + 1}`,
		referenceNumber: `EB-142-44${98 + index}`,
		title: index % 2 === 0 ? "Personal / routine errand" : "Legal / sensitive task",
		status: "submitted",
		pickupLocation: ["Ado-Ekiti", "Akobo", "Idanre", "Idanre", "Akoka", "Ikeja"][index] || `Pickup ${index + 1}`,
		dropoffLocation: index % 3 === 0 ? "" : `Dropoff ${index + 1}`,
		createdAt: `2026-04-${String(27 - index).padStart(2, "0")}T10:00:00.000Z`,
	}));

	return (
		<ClientDashboardV2
			{...buildBaseProps({
				mode: "errands",
				errands: sampleErrands,
				...dashboardOverrides,
			})}
		/>
	);
}

test("ending point is progressively disclosed after starting point", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const onPickupChange = jest.fn();
	const onDropoffChange = jest.fn();

	render(
		<LocationTimingHarness
			onPickupChangeSpy={onPickupChange}
			onDropoffChangeSpy={onDropoffChange}
		/>,
	);

	await goSmartBuilder(user);

	expect(
		screen.queryByRole("button", { name: /add ending point/i }),
	).not.toBeInTheDocument();

	await user.type(
		screen.getByPlaceholderText(/where should the task begin\?/i),
		"1 High Street",
	);

	expect(onPickupChange).toHaveBeenCalled();
	expect(screen.getByRole("button", { name: /add ending point/i })).toBeInTheDocument();

	await user.click(screen.getByRole("button", { name: /add ending point/i }));
	expect(screen.getByPlaceholderText(/where should the task end\?/i)).toBeInTheDocument();

	await user.type(
		screen.getByPlaceholderText(/where should the task end\?/i),
		"2 Main Road",
	);
	expect(onDropoffChange).toHaveBeenCalled();
});

test("family emergency keeps start optional and hides duplicate timing chips", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	render(<FamilyEmergencyHarness />);

	await goSmartBuilder(user);

	expect(screen.getByText(/starting point optional/i)).toBeInTheDocument();
	expect(screen.getAllByText(/^starting point$/i).length).toBeGreaterThan(0);
	expect(screen.queryByText(/starting point is required/i)).not.toBeInTheDocument();
	expect(screen.queryByRole("button", { name: /^schedule$/i })).not.toBeInTheDocument();
	expect(screen.queryByRole("button", { name: /^repeat$/i })).not.toBeInTheDocument();
});

test("template setup exposes embedded support type and preferred time choices", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	render(
		<LocationTimingHarness
			dashboardOverrides={{
				serviceKey: "documents",
				templateName: "Passport / Visa Pickup",
				pricesByLane: {
					documents: {
						GBP: { standard: 45, priority: 54, premium: 65 },
					},
				},
			}}
		/>,
	);

	await goSmartBuilder(user);

	await user.click(screen.getByRole("button", { name: /category selected/i }));
	await user.click(screen.getByRole("button", { name: /change template/i }));
	const templateDialog = screen.getByRole("dialog", { name: /choose a template/i });
	expect(within(templateDialog).getByText(/support type:/i)).toBeInTheDocument();
	await user.click(within(templateDialog).getByRole("tab", { name: /bike support/i }));
	await user.click(screen.getByRole("button", { name: /today/i }));

	expect(within(templateDialog).getByRole("tab", { name: /bike support/i })).toHaveAttribute("aria-selected", "true");
	expect(screen.getByRole("button", { name: /^today$/i })).toHaveClass("is-active");
});

test("changing template in smart builder re-collapses the category card into a slim summary and re-expands on one tap", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const templates = getTemplatesForCategory("documents");

	expect(templates.length).toBeGreaterThan(1);
	const nextTemplate = templates[1];
	render(<SmartTemplateSelectionHarness />);

	await goSmartBuilder(user);

	const getCategoryToggle = () => screen.getByRole("button", { name: /category selected/i });
	let categoryToggle = getCategoryToggle();
	expect(categoryToggle).toHaveAttribute("aria-expanded", "false");

	await user.click(categoryToggle);
	categoryToggle = getCategoryToggle();
	expect(categoryToggle).toHaveAttribute("aria-expanded", "true");

	await user.click(screen.getByRole("button", { name: /change template/i }));
	const templateDialog = screen.getByRole("dialog", { name: /choose a template/i });
	await user.click(within(templateDialog).getByText(nextTemplate.name).closest("button"));

	await waitFor(() => {
		expect(getCategoryToggle()).toHaveAttribute("aria-expanded", "false");
	});

	expect(screen.getByText(/tap to edit/i)).toBeInTheDocument();
	expect(screen.getAllByText(new RegExp(nextTemplate.name, "i")).length).toBeGreaterThan(0);
	expect(screen.queryByText(/selected template/i)).not.toBeInTheDocument();

	await user.click(getCategoryToggle());

	await waitFor(() => {
		expect(getCategoryToggle()).toHaveAttribute("aria-expanded", "true");
	});

	expect(screen.getByText(/selected template/i)).toBeInTheDocument();
	expect(screen.getByRole("button", { name: /change template/i })).toBeInTheDocument();
});

test("mobile catalog spotlight flattens immediately after template picker done and expands on tap", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const templates = getTemplatesForCategory("documents");

	expect(templates.length).toBeGreaterThan(1);
	const nextTemplate = templates[1];
	render(<MobileCatalogSpotlightHarness />);

	const spotlight = screen.getByRole("group", { name: /category spotlight/i });
	expect(within(spotlight).getByRole("button", { name: /change template|choose template/i })).toBeInTheDocument();

	await user.click(within(spotlight).getByRole("button", { name: /change template|choose template/i }));
	const templateDialog = await screen.findByRole("dialog", { name: /choose a template/i });
	await user.click(within(templateDialog).getByText(nextTemplate.name).closest("button"));
	await user.click(within(templateDialog).getByRole("button", { name: /^done$/i }));

	await waitFor(() => {
		expect(screen.queryByRole("dialog", { name: /choose a template/i })).not.toBeInTheDocument();
	});

	await waitFor(() => {
		expect(screen.getByRole("group", { name: /category spotlight/i })).toHaveClass("is-collapsed");
	});

	const flattenedSpotlight = screen.getByRole("group", { name: /category spotlight/i });
	expect(within(flattenedSpotlight).getByText(/tap to edit/i)).toBeInTheDocument();
	expect(within(flattenedSpotlight).getByText(new RegExp(nextTemplate.name, "i"))).toBeInTheDocument();
	expect(within(flattenedSpotlight).queryByText(/popular in this category/i)).not.toBeInTheDocument();
	expect(within(flattenedSpotlight).queryByRole("button", { name: /browse categories/i })).not.toBeInTheDocument();

	await user.click(within(flattenedSpotlight).getByRole("button", { name: /tap to edit/i }));

	await waitFor(() => {
		expect(screen.getByRole("group", { name: /category spotlight/i })).not.toHaveClass("is-collapsed");
	});

	const expandedSpotlight = screen.getByRole("group", { name: /category spotlight/i });
	expect(within(expandedSpotlight).getByRole("button", { name: /change template/i })).toBeInTheDocument();
	expect(within(expandedSpotlight).getByRole("button", { name: /browse categories/i })).toBeInTheDocument();
}, 15000);

test("mobile smart builder uses compact category and location styling hooks", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	render(
		<LocationTimingHarness
			dashboardOverrides={{
				isMobile: true,
				serviceKey: "documents",
				templateName: "Official Document / Office Pickup",
				pricesByLane: {
					documents: {
						GBP: { standard: 45, priority: 54, premium: 65 },
					},
				},
			}}
		/>,
	);

	await goSmartBuilder(user);

	const categoryCard = document.querySelector(".eb-clientv2__categoryCard");
	expect(categoryCard).toBeTruthy();
	expect(categoryCard).toHaveClass("is-mobile");

	const locationSection = document.querySelector('[data-tour="clientv2-location-timing"]');
	expect(locationSection).toBeTruthy();
	expect(locationSection).toHaveClass("is-mobile");
});

test("mobile catalog rail keeps four priority category chips plus see all", () => {
	render(<ClientDashboardV2 {...buildBaseProps({ isMobile: true })} />);

	const rail = screen.getByLabelText(/service categories/i);
	const chips = rail.querySelectorAll(
		".eb-clientv2__serviceCard--chip",
	);

	expect(chips).toHaveLength(4);
	expect(within(rail).getByRole("button", { name: /routine/i })).toBeInTheDocument();
	expect(within(rail).getByRole("button", { name: /docs/i })).toBeInTheDocument();
	expect(within(rail).getByRole("button", { name: /banking/i })).toBeInTheDocument();
	expect(within(rail).getByRole("button", { name: /legal/i })).toBeInTheDocument();
	const moreButton = within(rail).getByRole("button", { name: /more categories/i });
	expect(moreButton).toBeInTheDocument();
	expect(moreButton.querySelectorAll(".eb-clientv2__serviceRailMoreDot")).toHaveLength(6);
});

test("desktop selected errand preview remains available after expanding the recent list", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	render(<ErrandsModeHarness />);

	const recentSection = screen.getByText(/^recent$/i).closest("div");
	expect(recentSection).toBeTruthy();

	const firstOpenButton = screen.getAllByRole("button", { name: /^open$/i })[0];
	await user.click(firstOpenButton.closest(".eb-clientv2__errandRow"));
	const previewPane = document.querySelector(".eb-clientv2__errandsRight .eb-clientv2__preview");
	expect(previewPane).toBeTruthy();

	expect(screen.getByText(/selected errand/i)).toBeInTheDocument();
	expect(within(previewPane).getByText(/ado-ekiti/i)).toBeInTheDocument();

	await user.click(screen.getByRole("button", { name: /show all \(6\)/i }));

	await waitFor(() => {
		expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
	});

	expect(screen.getByText(/selected errand/i)).toBeInTheDocument();
	expect(within(previewPane).getByText(/ado-ekiti/i)).toBeInTheDocument();
	expect(document.querySelector(".eb-clientv2__errandsRight .eb-clientv2__preview")).toBeTruthy();
	expect(screen.getAllByRole("button", { name: /^open$/i }).length).toBe(6);
});

test("compact desktop widths stack the errands preview instead of keeping the floating two-column layout", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	Object.defineProperty(window, "innerWidth", { value: 1180, configurable: true });

	render(<ErrandsModeHarness />);

	await user.click(screen.getAllByRole("button", { name: /^open$/i })[0].closest(".eb-clientv2__errandRow"));

	const layout = document.querySelector(".eb-clientv2__errandsLayout");
	const previewPane = document.querySelector(".eb-clientv2__errandsRight .eb-clientv2__preview");
	expect(layout).toHaveClass("is-compact");
	expect(previewPane).toBeTruthy();

	Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
});

test("selected errand preview uses Starting/Ending wording and shows live activity with embedded map when tracking is live", async () => {
	const PilotTrackerStub = ({ errandId }) => (
		<div data-testid="pilot-tracker">Live map for {errandId}</div>
	);

	render(
		<ErrandsModeHarness
			dashboardOverrides={{
				errands: [
					{
						id: "live-1",
						referenceNumber: "EB-142-4498",
						title: "Personal / routine errand",
						status: "in_progress",
						pickupLocation: "Ado-Ekiti",
						dropoffLocation: "Ikeja",
						createdAt: "2026-04-27T10:00:00.000Z",
						history: [
							{
								eventType: "created",
								newStatus: "submitted",
								createdAt: "2026-04-27T10:00:00.000Z",
							},
							{
								eventType: "admin_assign_pilot",
								newStatus: "assigned",
								createdAt: "2026-04-27T10:05:00.000Z",
							},
							{
								eventType: "pilot_started",
								newStatus: "in_progress",
								createdAt: "2026-04-27T10:18:00.000Z",
								note: "Pilot has started the errand.",
							},
						],
					},
				],
				trackingStatusByErrand: {
					"live-1": {
						tracking_allowed: true,
						loading: false,
						error: null,
					},
				},
				PilotTrackerComponent: PilotTrackerStub,
			}}
		/>,
	);

	const previewPane = document.querySelector(".eb-clientv2__errandsRight .eb-clientv2__preview");
	expect(previewPane).toBeTruthy();
	expect(within(previewPane).getByText(/^Personal \/ routine errand$/i)).toBeInTheDocument();
	expect(within(previewPane).getByText(/^starting$/i)).toBeInTheDocument();
	expect(within(previewPane).getByText(/^ending$/i)).toBeInTheDocument();
	expect(within(previewPane).getByText(/live activity/i)).toBeInTheDocument();
	expect(within(previewPane).getByText(/pilot assigned/i)).toBeInTheDocument();
	expect(within(previewPane).getByText(/errand started/i)).toBeInTheDocument();
	expect(within(previewPane).getByText(/pilot has started the errand/i)).toBeInTheDocument();
	expect(within(previewPane).getByText(/live now/i)).toBeInTheDocument();
	expect(within(previewPane).getByText(/live gps map/i)).toBeInTheDocument();
	expect(within(previewPane).getByTestId("pilot-tracker")).toHaveTextContent(/live map for live-1/i);
});

test("selected errand live-map action focuses the inline map instead of reopening the legacy flow", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	if (!Element.prototype.scrollIntoView) {
		// eslint-disable-next-line no-empty-function, no-extend-native
		Element.prototype.scrollIntoView = () => {};
	}

	const scrollSpy = jest.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
	const onOpenTracking = jest.fn();
	const PilotTrackerStub = ({ errandId }) => (
		<div data-testid="pilot-tracker">Live map for {errandId}</div>
	);

	render(
		<ErrandsModeHarness
			dashboardOverrides={{
				errands: [
					{
						id: "live-2",
						referenceNumber: "EB-202",
						title: "Embassy pickup",
						status: "in_progress",
						pickupLocation: "Victoria Island",
						dropoffLocation: "Ikoyi",
						history: [
							{
								eventType: "pilot_started",
								newStatus: "in_progress",
								createdAt: "2026-04-27T10:18:00.000Z",
							},
						],
					},
				],
				trackingStatusByErrand: {
					"live-2": {
						tracking_allowed: true,
						loading: false,
						error: null,
					},
				},
				externalSelectedErrandId: "live-2",
				PilotTrackerComponent: PilotTrackerStub,
				onOpenTracking,
			}}
		/>,
	);

	await user.click(screen.getByRole("button", { name: /focus live map/i }));

	expect(onOpenTracking).not.toHaveBeenCalled();
	expect(scrollSpy).toHaveBeenCalled();

	scrollSpy.mockRestore();
});

test("mobile catalog keeps the inline progress stable instead of opening a floating overlay after scrolling", async () => {
	Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	render(
		<ClientDashboardV2
			{...buildBaseProps({
				isMobile: true,
				toxiEnabled: true,
				serviceKey: laneKey,
				templateName,
				title: "Passport pickup",
				note: "Pick up documents from the front desk.",
				pickup: "10 Downing Street",
				pricesByLane,
			})}
		/>,
	);

	const progressCard = screen.getByRole("status", { name: /progress/i });
	const progressRectSpy = jest
		.spyOn(progressCard, "getBoundingClientRect")
		.mockImplementation(() => ({
			x: 16,
			y: 18,
			left: 16,
			top: 18,
			right: 374,
			bottom: 118,
			width: 358,
			height: 100,
			toJSON: () => ({}),
		}));

	const header = document.createElement("div");
	header.className = "eb-app-header";
	document.body.appendChild(header);
	const headerRectSpy = jest
		.spyOn(header, "getBoundingClientRect")
		.mockImplementation(() => ({
			x: 0,
			y: 0,
			left: 0,
			top: 0,
			right: 390,
			bottom: 72,
			width: 390,
			height: 72,
			toJSON: () => ({}),
		}));

	Object.defineProperty(document.documentElement, "scrollTop", {
		value: 220,
		writable: true,
		configurable: true,
	});

	fireEvent.scroll(window);

	await waitFor(() => {
		expect(document.querySelector(".eb-clientv2__progressOverlay.is-mobile")).toBeTruthy();
	});

	const floatingStack = document.querySelector(".eb-clientv2__floatingStack.is-mobile");
	expect(floatingStack).toBeTruthy();
	expect(document.querySelector(".eb-clientv2__createMain.is-mobile-progress-floating")).toBeTruthy();
	expect(screen.getByRole("status", { name: /progress/i })).toHaveClass("is-mobile");

	headerRectSpy.mockRestore();
	progressRectSpy.mockRestore();
	header.remove();
	Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
});

test("template picker support row resets to the start for each newly selected template", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const templates = getTemplatesForCategory("documents");

	expect(templates.length).toBeGreaterThan(1);
	const nextTemplate = templates[1];
	render(<MobileCatalogSpotlightHarness />);

	const spotlight = screen.getByRole("group", { name: /category spotlight/i });
	await user.click(within(spotlight).getByRole("button", { name: /change template|choose template/i }));
	const templateDialog = await screen.findByRole("dialog", { name: /choose a template/i });

	const supportSwitch = document.querySelector(".eb-clientv2__templatePickerSupportSwitch");
	expect(supportSwitch).toBeTruthy();
	supportSwitch.scrollLeft = 148;

	await user.click(within(templateDialog).getByText(nextTemplate.name).closest("button"));

	await waitFor(() => {
		expect(supportSwitch.scrollLeft).toBe(0);
	});
});

test("mobile manual mode hands the bottom slot between assistant and review/pay", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });

	const onOpenAssistant = jest.fn();
	const onCloseAssistant = jest.fn();

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const { rerender } = render(
		<ClientDashboardV2
			{...buildBaseProps({
				isMobile: true,
				toxiEnabled: false,
				serviceKey: laneKey,
				templateName,
				title: "Passport pickup",
				note: "Pick up documents from the front desk.",
				pickup: "10 Downing Street",
				pricesByLane: {
					[laneKey]: {
						GBP: { standard: 10, priority: 20, premium: 30 },
					},
				},
				onOpenAssistant,
				onCloseAssistant,
			})}
		/>,
	);

	const showAssistantButton = screen.getByRole("button", { name: /show assistant/i });
	expect(screen.queryByRole("button", { name: /show review/i })).not.toBeInTheDocument();
	expect(screen.queryByRole("button", { name: /hide review/i })).not.toBeInTheDocument();

	await user.click(showAssistantButton);
	expect(onOpenAssistant).toHaveBeenCalledTimes(1);

	rerender(
		<ClientDashboardV2
			{...buildBaseProps({
				isMobile: true,
				toxiEnabled: false,
				serviceKey: laneKey,
				templateName,
				title: "Passport pickup",
				note: "Pick up documents from the front desk.",
				pickup: "10 Downing Street",
				pricesByLane: {
					[laneKey]: {
						GBP: { standard: 10, priority: 20, premium: 30 },
					},
				},
				onOpenAssistant,
				onCloseAssistant,
				assistantOpen: true,
			})}
		/>,
	);

	expect(screen.queryByRole("button", { name: /show assistant/i })).not.toBeInTheDocument();
	expect(screen.getByRole("button", { name: /hide assistant/i })).toBeInTheDocument();
	expect(document.querySelector(".eb-clientv2__mobileCheckoutBar")).toBeNull();

	const hideAssistantButton = screen.getByRole("button", { name: /hide assistant/i });
	await user.click(hideAssistantButton);
	expect(onCloseAssistant).toHaveBeenCalledTimes(1);

	rerender(
		<ClientDashboardV2
			{...buildBaseProps({
				isMobile: true,
				toxiEnabled: false,
				serviceKey: laneKey,
				templateName,
				title: "Passport pickup",
				note: "Pick up documents from the front desk.",
				pickup: "10 Downing Street",
				pricesByLane: {
					[laneKey]: {
						GBP: { standard: 10, priority: 20, premium: 30 },
					},
				},
				onOpenAssistant,
				onCloseAssistant,
				assistantOpen: false,
			})}
		/>,
	);

	await waitFor(() => {
		expect(document.querySelector(".eb-clientv2__mobileCheckoutBar")).toBeTruthy();
	});

	Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
});

test("mobile smart builder note field expands predictably and stays open while typing", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	render(
		<CheckoutProceedHarness
			laneKey={laneKey}
			templateName={templateName}
			pricesByLane={pricesByLane}
			dashboardOverrides={{ isMobile: true, toxiEnabled: true }}
		/>,
	);

	await goSmartBuilder(user);

	const detailsField = screen.getByPlaceholderText(/include key details/i);
	const detailsShell = detailsField.closest(".eb-clientv2__noteField");

	expect(detailsShell).toBeTruthy();
	expect(detailsShell).not.toHaveClass("is-expanded");

	await user.click(detailsField);
	await user.type(detailsField, "Need a fast inspection with gate code 1429.");

	expect(detailsShell).toHaveClass("is-expanded");
	expect(detailsField).toHaveAttribute("rows", "10");
});

test("mobile template picker done avoids the extra scroll jump", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const originalScrollIntoView = Element.prototype.scrollIntoView;
	if (typeof originalScrollIntoView !== "function") {
		// eslint-disable-next-line no-extend-native
		Element.prototype.scrollIntoView = function scrollIntoView() {};
	}
	const scrollIntoViewSpy = jest.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});

	try {
		render(<MobileCatalogSpotlightHarness isMobile compactViewport />);

		const spotlight = screen.getByRole("group", { name: /category spotlight/i });
		await user.click(within(spotlight).getByRole("button", { name: /change template|choose template/i }));
		const templateDialog = await screen.findByRole("dialog", { name: /choose a template/i });

		scrollIntoViewSpy.mockClear();

		await user.click(within(templateDialog).getByRole("button", { name: /^done$/i }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog", { name: /choose a template/i })).not.toBeInTheDocument();
		});

		expect(scrollIntoViewSpy).not.toHaveBeenCalled();
	} finally {
		scrollIntoViewSpy.mockRestore();
		if (typeof originalScrollIntoView === "function") {
			// eslint-disable-next-line no-extend-native
			Element.prototype.scrollIntoView = originalScrollIntoView;
		} else {
			// eslint-disable-next-line no-extend-native
			delete Element.prototype.scrollIntoView;
		}
	}
});

test("desktop pricing selection lands on the smart category card before core details", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true });

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	const originalScrollIntoView = Element.prototype.scrollIntoView;
	if (typeof originalScrollIntoView !== "function") {
		// eslint-disable-next-line no-extend-native
		Element.prototype.scrollIntoView = function scrollIntoView() {};
	}
	const scrollSpy = jest.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});

	try {
		render(
			<CheckoutProceedHarness
				laneKey={laneKey}
				templateName={templateName}
				pricesByLane={pricesByLane}
			/>,
		);

		const tierList = screen.getByRole("list", { name: /priority levels/i });
		await user.click(within(tierList).getByRole("button", { name: /standard/i }));
		await user.click(within(tierList).getByRole("button", { name: /select this class/i }));

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /category selected/i })).toBeInTheDocument();
		});

		expect(screen.getByRole("button", { name: /category selected/i })).toHaveAttribute("aria-expanded", "false");
		expect(screen.getByRole("textbox", { name: /describe what you need/i })).not.toHaveFocus();
		expect(scrollSpy).toHaveBeenCalled();
	} finally {
		scrollSpy.mockRestore();
		if (typeof originalScrollIntoView === "function") {
			// eslint-disable-next-line no-extend-native
			Element.prototype.scrollIntoView = originalScrollIntoView;
		} else {
			// eslint-disable-next-line no-extend-native
			delete Element.prototype.scrollIntoView;
		}
		Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
	}
});

test("mobile pricing selection switches to smart builder without auto-focusing the note box", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	const originalScrollIntoView = Element.prototype.scrollIntoView;
	if (typeof originalScrollIntoView !== "function") {
		// eslint-disable-next-line no-extend-native
		Element.prototype.scrollIntoView = function scrollIntoView() {};
	}
	const scrollSpy = jest.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});

	try {
		render(
			<CheckoutProceedHarness
				laneKey={laneKey}
				templateName={templateName}
				pricesByLane={pricesByLane}
				dashboardOverrides={{ isMobile: true }}
			/>,
		);

		const tierList = screen.getByRole("list", { name: /priority levels/i });
		await user.click(within(tierList).getByRole("button", { name: /standard/i }));
		await user.click(within(tierList).getByRole("button", { name: /select this class/i }));

		await waitFor(() => {
			expect(screen.getByText(/^category$/i)).toBeInTheDocument();
		});

		expect(scrollSpy).toHaveBeenCalled();
		expect(screen.getByRole("textbox", { name: /describe what you need/i })).not.toHaveFocus();
	} finally {
		scrollSpy.mockRestore();
		if (typeof originalScrollIntoView === "function") {
			// eslint-disable-next-line no-extend-native
			Element.prototype.scrollIntoView = originalScrollIntoView;
		} else {
			// eslint-disable-next-line no-extend-native
			delete Element.prototype.scrollIntoView;
		}
		Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
	}
});

test("mobile note blur reveals location and timing without auto-focusing the starting point", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	const originalScrollIntoView = Element.prototype.scrollIntoView;
	if (typeof originalScrollIntoView !== "function") {
		// eslint-disable-next-line no-extend-native
		Element.prototype.scrollIntoView = function scrollIntoView() {};
	}
	const scrollSpy = jest.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});

	try {
		render(
			<CheckoutProceedHarness
				laneKey={laneKey}
				templateName={templateName}
				pricesByLane={pricesByLane}
				dashboardOverrides={{ isMobile: true }}
			/>,
		);

		await goSmartBuilder(user);

		const detailsField = screen.getByRole("textbox", { name: /describe what you need/i });
		const pickupField = screen.getByPlaceholderText(/where should the task begin/i);

		await user.click(detailsField);
		fireEvent.blur(detailsField);

		await waitFor(() => {
			expect(scrollSpy).toHaveBeenCalled();
		});

		expect(pickupField).not.toHaveFocus();
	} finally {
		scrollSpy.mockRestore();
		if (typeof originalScrollIntoView === "function") {
			// eslint-disable-next-line no-extend-native
			Element.prototype.scrollIntoView = originalScrollIntoView;
		} else {
			// eslint-disable-next-line no-extend-native
			delete Element.prototype.scrollIntoView;
		}
		Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
	}
});

test("mobile note field expands on tap and collapses on outside tap", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	render(
		<CheckoutProceedHarness
			laneKey={laneKey}
			templateName={templateName}
			pricesByLane={pricesByLane}
			dashboardOverrides={{ isMobile: true }}
		/>,
	);

	await goSmartBuilder(user);

	const detailsField = screen.getByRole("textbox", { name: /describe what you need/i });
	const noteShell = detailsField.closest("label");
	expect(noteShell).toBeTruthy();
	expect(noteShell.className).not.toContain("is-expanded");

	await user.click(detailsField);
	await waitFor(() => {
		expect(noteShell.className).toContain("is-expanded");
	});

	fireEvent.pointerDown(document.body);
	await waitFor(() => {
		expect(noteShell.className).not.toContain("is-expanded");
	});
	Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
});

test("initial catalog state highlights category as the next required step", () => {
	render(<ClientDashboardV2 {...buildBaseProps()} />);

	expect(screen.getAllByLabelText(/complete next: choose a category/i).length).toBeGreaterThan(0);
});

test("open smart builder command switches to smart mode while keeping checkout readiness aligned", async () => {
	const handled = jest.fn();

	render(
		<ClientDashboardV2
			{...buildBaseProps({
				serviceKey: "airport",
				templateName: "Airport Pickup / Assistance",
				assistantCommand: { id: "cmd-toxi-handoff", type: "open_smart_builder" },
				onAssistantCommandHandled: handled,
				pricesByLane: {
					airport: {
						GBP: { standard: 55, priority: 70, premium: 80 },
					},
				},
			})}
		/>,
	);

	await waitFor(() => {
		expect(screen.getByRole("button", { name: /smart builder/i })).toHaveClass("is-active");
	});

	await waitFor(() => {
		expect(handled).toHaveBeenCalledWith(
			expect.objectContaining({ type: "open_smart_builder" }),
		);
	});

	expect(screen.getAllByText(/next step:\s*select priority level/i).length).toBeGreaterThan(0);
	expect(screen.getAllByText(/airport pickup \/ assistance/i).length).toBeGreaterThan(0);
});

test("preferred time options stay in urgency-first order and only reveal scheduling details when selected", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	render(
		<LocationTimingHarness
			dashboardOverrides={{
				serviceKey: "documents",
				templateName: "Passport / Visa Pickup",
			}}
		/>,
	);

	await goSmartBuilder(user);

	let timingGroup = screen.getByRole("list", { name: /preferred time/i });
	const labels = within(timingGroup)
		.getAllByRole("button")
		.map((button) => button.textContent?.trim());
	expect(labels).toEqual(["ASAP", "Today", "Later", "Flexible", "Repeat"]);
	expect(screen.queryByRole("group", { name: /scheduled date and time/i })).not.toBeInTheDocument();

	await user.click(within(timingGroup).getByRole("button", { name: /flexible/i }));
	expect(screen.getByRole("group", { name: /scheduled date and time/i })).toBeInTheDocument();

	timingGroup = screen.getByRole("list", { name: /preferred time/i });
	await user.click(within(timingGroup).getByRole("button", { name: /^asap$/i }));
	await waitFor(() => {
		expect(screen.queryByRole("group", { name: /scheduled date and time/i })).not.toBeInTheDocument();
	});

	timingGroup = screen.getByRole("list", { name: /preferred time/i });
	await user.click(within(timingGroup).getByRole("button", { name: /repeat/i }));
	expect(screen.getByRole("group", { name: /scheduled date and time/i })).toBeInTheDocument();
	expect(screen.getByRole("button", { name: /use a one-time date instead/i })).toBeInTheDocument();
});

test("proof toggle surfaces a clear state label as it changes", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	render(<LocationTimingHarness />);

	await goSmartBuilder(user);

	const toggle = screen.getByRole("checkbox", { name: /toggle proof requirement/i });
	const proofRow = toggle.closest(".eb-clientv2__proofRow");
	expect(proofRow).toBeTruthy();
	expect(within(proofRow).getByText(/^optional$/i)).toBeInTheDocument();
	fireEvent.click(toggle);
	await waitFor(() => {
		const updatedToggle = screen.getByRole("checkbox", { name: /toggle proof requirement/i });
		const updatedProofRow = updatedToggle.closest(".eb-clientv2__proofRow");
		expect(updatedToggle).toBeChecked();
		expect(updatedProofRow).toBeTruthy();
		expect(within(updatedProofRow).getByText(/^on$/i)).toBeInTheDocument();
	});
});

test("attachments and extra notes stay tucked under optional details until expanded", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	render(<LocationTimingHarness />);

	await goSmartBuilder(user);

	expect(screen.queryByRole("button", { name: /^attachments/i })).not.toBeInTheDocument();
	expect(screen.queryByRole("button", { name: /^extra notes/i })).not.toBeInTheDocument();

	await user.click(screen.getByRole("button", { name: /optional details/i }));
	expect(screen.getByRole("button", { name: /^attachments/i })).toBeInTheDocument();
	expect(screen.getByRole("button", { name: /^extra notes/i })).toBeInTheDocument();

	await user.click(screen.getByRole("button", { name: /optional details/i }));
	await waitFor(() => {
		expect(screen.queryByRole("button", { name: /^attachments/i })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /^extra notes/i })).not.toBeInTheDocument();
	});
});

test("airport pickup swaps support prompt to vehicle type without redundant pilot options", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	render(
		<LocationTimingHarness
			dashboardOverrides={{
				serviceKey: "airport",
				templateName: "Airport Pickup / Assistance",
				pricesByLane: {
					airport: {
						GBP: { standard: 55, priority: 70, premium: 80 },
					},
				},
			}}
		/>,
	);

	await goSmartBuilder(user);

	await user.click(screen.getByRole("button", { name: /category selected/i }));
	await user.click(screen.getByRole("button", { name: /change template/i }));
	const templateDialog = screen.getByRole("dialog", { name: /choose a template/i });
	expect(within(templateDialog).getByText(/vehicle type:/i)).toBeInTheDocument();
	expect(within(templateDialog).queryByRole("tab", { name: /standard assistance/i })).not.toBeInTheDocument();
	expect(within(templateDialog).queryByRole("tab", { name: /bike support/i })).not.toBeInTheDocument();
	expect(within(templateDialog).getByRole("tab", { name: /car/i })).toBeInTheDocument();
	expect(within(templateDialog).getByRole("tab", { name: /flexible vehicle/i })).toBeInTheDocument();
	await user.click(within(templateDialog).getByRole("tab", { name: /car/i }));
	expect(within(templateDialog).getByRole("tab", { name: /car/i })).toHaveAttribute("aria-selected", "true");
});

test("schedule later opens calendar flow and shows existing scheduled summary", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const onOpenSchedule = jest.fn();
	const onClearSchedule = jest.fn();

	render(
		<ClientDashboardV2
			{...buildBaseProps({
				serviceKey: "documents",
				templateName: "Passport / Visa Pickup",
				preferredTime: "schedule_later",
				scheduleType: "one_time",
				scheduleSummary: "Tomorrow · 10:30 AM - 11:30 AM",
				onOpenSchedule,
				onClearSchedule,
			})}
		/>,
	);

	await goSmartBuilder(user);

	const scheduleCard = screen.getByRole("group", { name: /scheduled date and time/i });
	expect(within(scheduleCard).getByText(/tomorrow · 10:30 am - 11:30 am/i)).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: /change schedule/i }));
	expect(onOpenSchedule).toHaveBeenCalledWith("future");
	await user.click(screen.getByRole("button", { name: /clear/i }));
	expect(onClearSchedule).toHaveBeenCalled();
});

test("today keeps a calendar shortcut visible and opens the schedule flow", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const onOpenSchedule = jest.fn();

	render(
		<LocationTimingHarness
			dashboardOverrides={{
				serviceKey: "documents",
				templateName: "Passport / Visa Pickup",
				onOpenSchedule,
			}}
		/>,
	);

	await goSmartBuilder(user);
	await user.click(screen.getByRole("button", { name: /today/i }));

	expect(onOpenSchedule).toHaveBeenCalledWith("today");
	const scheduleCard = screen.getByRole("group", { name: /scheduled date and time/i });
	expect(within(scheduleCard).getByText(/pick a time window for today/i)).toBeInTheDocument();
	expect(within(scheduleCard).getByRole("button", { name: /choose today/i })).toBeInTheDocument();
});

test("repeat weekly exposes recurring controls and keeps the selection wired", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	render(
		<LocationTimingHarness
			dashboardOverrides={{
				serviceKey: "documents",
				templateName: "Passport / Visa Pickup",
			}}
		/>,
	);

	await goSmartBuilder(user);
	await user.click(screen.getByRole("button", { name: /^repeat weekly$/i }));

	let scheduleCard = screen.getByRole("group", { name: /scheduled date and time/i });
	expect(within(scheduleCard).getByText(/pick at least one day for a repeating errand/i)).toBeInTheDocument();

	await user.click(within(scheduleCard).getByRole("button", { name: /^mon$/i }));
	scheduleCard = screen.getByRole("group", { name: /scheduled date and time/i });
	await user.click(within(scheduleCard).getByRole("button", { name: /bi-weekly/i }));

	const timeInput = within(scheduleCard).getByDisplayValue("09:00");
	fireEvent.change(timeInput, { target: { value: "11:30" } });
	scheduleCard = screen.getByRole("group", { name: /scheduled date and time/i });

	await waitFor(() => {
		expect(within(scheduleCard).getByRole("button", { name: /^mon$/i })).toHaveAttribute("aria-pressed", "true");
		expect(within(scheduleCard).getByRole("button", { name: /bi-weekly/i })).toHaveClass("is-active");
	});
	expect(timeInput).toHaveValue("11:30");
	expect(within(scheduleCard).getByRole("button", { name: /use a one-time date instead/i })).toBeInTheDocument();
});

test("attachments and extra notes open as dialogs and can be dismissed", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	render(<ClientDashboardV2 {...buildBaseProps()} />);

	await goSmartBuilder(user);
	await user.click(screen.getByRole("button", { name: /optional details/i }));

	await user.click(screen.getByRole("button", { name: /attachments/i }));
	const attachmentsDialog = screen.getByRole("dialog", { name: /attachments/i });
	await user.click(within(attachmentsDialog).getByRole("button", { name: /close/i }));
	expect(screen.queryByRole("dialog", { name: /attachments/i })).not.toBeInTheDocument();

	await user.click(screen.getByRole("button", { name: /extra notes/i }));
	const notesDialog = screen.getByRole("dialog", { name: /extra notes/i });
	await user.click(within(notesDialog).getByRole("button", { name: /close/i }));
	expect(screen.queryByRole("dialog", { name: /extra notes/i })).not.toBeInTheDocument();
});

test("location & timing can collapse into a summary once start is set", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const onPickupChange = jest.fn();

	render(<LocationTimingHarness onPickupChangeSpy={onPickupChange} />);

	await goSmartBuilder(user);

	await user.type(
		screen.getByPlaceholderText(/where should the task begin\?/i),
		"10 Market St",
	);

	const collapseButton = screen.getByRole("button", { name: /collapse location and timing/i });
	await user.click(collapseButton);

	expect(screen.getByText(/tap to edit/i)).toBeInTheDocument();

	const summaryButton = screen.getByText(/tap to edit/i).closest("button");
	expect(summaryButton).toBeTruthy();
	await user.click(summaryButton);

	expect(screen.getByPlaceholderText(/where should the task begin\?/i)).toBeInTheDocument();
});

test("starting point typing does not auto-jump to checkout; proceeds only after confirmation", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	// Ensure we're in the desktop layout (not the compact rail).
	Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	render(
		<CheckoutProceedHarness
			laneKey={laneKey}
			templateName={templateName}
			pricesByLane={pricesByLane}
		/>,
	);

	// Confirm the default (standard) tier to unlock the location step.
	const tierList = screen.getByRole("list", { name: /priority levels/i });
	await user.click(within(tierList).getByRole("button", { name: /standard/i }));
	await user.click(within(tierList).getByRole("button", { name: /select this class/i }));
	// Tier selection should route to smart builder and make Location the next step.
	expect(screen.getAllByText(/next step:\s*add starting point/i).length).toBeGreaterThan(0);
	const locationSection = document.querySelector('[data-tour="clientv2-location-timing"]');
	expect(locationSection).toBeTruthy();
	expect(
		within(locationSection).getByLabelText(/complete next: add starting point/i),
	).toBeInTheDocument();

	await goSmartBuilder(user);

		let pickupInput = screen.getByPlaceholderText(/where should the task begin\?/i);
	const originalScrollIntoView = Element.prototype.scrollIntoView;
	if (typeof originalScrollIntoView !== "function") {
		// JSDOM may not implement scrollIntoView; stub it so we can assert calls.
		// eslint-disable-next-line no-extend-native
		Element.prototype.scrollIntoView = function scrollIntoView() {};
	}

	const scrollSpy = jest.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});

	try {
		await user.type(pickupInput, "A");
		// One character should not trigger any checkout jump.
		expect(scrollSpy).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("group", { name: /proceed to checkout confirmation/i }),
		).not.toBeInTheDocument();
			// The Location & timing block can re-render after the first character;
			// re-query to avoid holding a stale input reference.
			pickupInput = screen.getByPlaceholderText(/where should the task begin\?/i);

			// Type remaining characters one-by-one; animated layout can replace the input node.
			await user.type(pickupInput, "d");
			pickupInput = screen.getByPlaceholderText(/where should the task begin\?/i);
			await user.type(pickupInput, "o");
			await waitFor(
				() => expect(screen.getByPlaceholderText(/where should the task begin\?/i)).toHaveValue("Ado"),
				{ timeout: 1500 },
			);
			// Once the required fields are complete, the checkout rail should unlock the CTA.
			await waitFor(
				() => {
					const continueBtn = screen
						.getAllByRole("button", { name: /continue to payment/i })
						.find((btn) => btn.classList?.contains("eb-clientv2__continue"));
					const missingText =
						document.querySelector(".eb-clientv2__missing")?.textContent || "";
					const pickupValue =
						screen.getByPlaceholderText(/where should the task begin\?/i)?.value || "";
					if (continueBtn?.getAttribute("aria-disabled") !== "false") {
						throw new Error(
							`Checkout still disabled. Missing: ${missingText || "(none listed)"}. Start value: "${pickupValue}" (len=${pickupValue.length})`,
						);
					}
				},
				{ timeout: 3000 },
			);

			const summaryCard = document.querySelector('[data-tour="clientv2-checkout-rail"]');
			expect(summaryCard).toBeTruthy();
			expect(
				within(summaryCard).getByLabelText(/ready now: review & pay/i),
			).toBeInTheDocument();

		// Proceed prompt is gated behind opting into proof/receipt (default is OFF).
		expect(
			screen.queryByRole("group", { name: /proceed to checkout confirmation/i }),
		).not.toBeInTheDocument();

		await user.click(screen.getByRole("checkbox", { name: /toggle proof requirement/i }));
		const prompt = await screen.findByRole(
			"group",
			{ name: /proceed to checkout confirmation/i },
			{ timeout: 3000 },
		);
		expect(prompt).toHaveTextContent(/completed and ready to proceed\?/i);

		await user.click(within(prompt).getByRole("button", { name: /yes, proceed/i }));
		expect(scrollSpy).toHaveBeenCalled();
	} finally {
		scrollSpy.mockRestore();
		// Restore original to avoid leaking between tests.
		if (typeof originalScrollIntoView === "function") {
			// eslint-disable-next-line no-extend-native
			Element.prototype.scrollIntoView = originalScrollIntoView;
		} else {
			// eslint-disable-next-line no-extend-native
			delete Element.prototype.scrollIntoView;
		}
	}
});

test("mobile continue jumps to the current blocking section after the review handoff", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	render(
		<CheckoutProceedHarness
			laneKey={laneKey}
			templateName={templateName}
			pricesByLane={pricesByLane}
				dashboardOverrides={{ isMobile: true, toxiEnabled: true }}
		/>,
	);

	const tierList = screen.getByRole("list", { name: /priority levels/i });
	await user.click(within(tierList).getByRole("button", { name: /standard/i }));
	await user.click(within(tierList).getByRole("button", { name: /select this class/i }));

	const originalScrollIntoView = Element.prototype.scrollIntoView;
	if (typeof originalScrollIntoView !== "function") {
		// eslint-disable-next-line no-extend-native
		Element.prototype.scrollIntoView = function scrollIntoView() {};
	}

	const scrollSpy = jest.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});

	try {
		await waitFor(() => {
			expect(
				screen.getByRole("textbox", { name: /describe what you need/i }),
			).not.toHaveFocus();
			expect(document.querySelector(".eb-clientv2__mobileCheckoutBarCta")).toBeTruthy();
		});

		fireEvent.blur(screen.getByRole("textbox", { name: /describe what you need/i }));

		await waitFor(() => {
			expect(
				screen.getByRole("textbox", { name: /starting point/i }),
			).not.toHaveFocus();
			expect(document.querySelector(".eb-clientv2__mobileCheckoutBarCta")).toBeTruthy();
		});

		const mobileContinueBtn = document.querySelector(".eb-clientv2__mobileCheckoutBarCta");
		expect(mobileContinueBtn).toBeTruthy();
		await user.click(mobileContinueBtn);

		await waitFor(() => {
			expect(scrollSpy).toHaveBeenCalled();
			expect(
				screen.getByRole("textbox", { name: /starting point/i }),
			).toBeInTheDocument();
		});
	} finally {
		scrollSpy.mockRestore();
		if (typeof originalScrollIntoView === "function") {
			// eslint-disable-next-line no-extend-native
			Element.prototype.scrollIntoView = originalScrollIntoView;
		} else {
			// eslint-disable-next-line no-extend-native
			delete Element.prototype.scrollIntoView;
		}
		Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
	}
});

test("mobile typing hides the sticky checkout bar so small screens stay usable", async () => {
	Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	const props = buildBaseProps({
		isMobile: true,
		toxiEnabled: true,
		serviceKey: laneKey,
		templateName,
		title: "Passport pickup",
		note: "Pick up documents from the front desk.",
		pickup: "10 Downing Street",
		pricesByLane,
		viewportBottomInsetPx: 0,
	});

	const { rerender } = render(<ClientDashboardV2 {...props} />);

	await waitFor(() => {
		expect(document.querySelector(".eb-clientv2__mobileCheckoutBar")).toBeTruthy();
	});

	rerender(
		<ClientDashboardV2
			{...props}
			viewportBottomInsetPx={140}
		/>,
	);

	await waitFor(() => {
		expect(document.querySelector(".eb-clientv2__mobileCheckoutBar")).toBeNull();
	});

	rerender(
		<ClientDashboardV2
			{...props}
			viewportBottomInsetPx={0}
		/>,
	);

	await waitFor(() => {
		expect(document.querySelector(".eb-clientv2__mobileCheckoutBar")).toBeTruthy();
	});

	Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
});

test("mobile typing collapses the inline progress card into a tiny strip", async () => {
	Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	const props = buildBaseProps({
		isMobile: true,
		toxiEnabled: true,
		serviceKey: laneKey,
		templateName,
		title: "Passport pickup",
		note: "Pick up documents from the front desk.",
		pickup: "10 Downing Street",
		pricesByLane,
		viewportBottomInsetPx: 0,
	});

	const { rerender } = render(<ClientDashboardV2 {...props} />);
	const progressCard = screen.getByRole("status", { name: /progress/i });
	expect(progressCard).toHaveClass("is-mobile");
	expect(progressCard).not.toHaveClass("is-typing-compact");

	rerender(
		<ClientDashboardV2
			{...props}
			viewportBottomInsetPx={140}
		/>,
	);

	await waitFor(() => {
		expect(screen.getByRole("status", { name: /progress/i })).toHaveClass("is-typing-compact");
	});

	rerender(
		<ClientDashboardV2
			{...props}
			viewportBottomInsetPx={0}
		/>,
	);

	await waitFor(() => {
		expect(screen.getByRole("status", { name: /progress/i })).not.toHaveClass("is-typing-compact");
	});

	Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
});

test("mobile smart builder keeps the inline progress stable instead of opening a floating overlay on scroll", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });

	const category = CATALOG_CATEGORIES.find((c) => {
		const templates = getTemplatesForCategory(c.key);
		return Array.isArray(templates) && templates.length > 0;
	});
	expect(category).toBeTruthy();
	const templates = getTemplatesForCategory(category.key);
	const laneKey = category.laneKey;
	const templateName = templates[0].name;

	const pricesByLane = {
		[laneKey]: {
			GBP: { standard: 10, priority: 20, premium: 30 },
		},
	};

	render(
		<ClientDashboardV2
			{...buildBaseProps({
				isMobile: true,
				toxiEnabled: true,
				serviceKey: laneKey,
				templateName,
				title: "Passport pickup",
				note: "Pick up documents from the front desk.",
				pickup: "10 Downing Street",
				pricesByLane,
			})}
		/>,
	);

	await goSmartBuilder(user);

	const progressCard = screen.getByRole("status", { name: /progress/i });
	const progressRectSpy = jest
		.spyOn(progressCard, "getBoundingClientRect")
		.mockImplementation(() => ({
			x: 16,
			y: 18,
			left: 16,
			top: 18,
			right: 374,
			bottom: 118,
			width: 358,
			height: 100,
			toJSON: () => ({}),
		}));

	const header = document.createElement("div");
	header.className = "eb-app-header";
	document.body.appendChild(header);
	const headerRectSpy = jest
		.spyOn(header, "getBoundingClientRect")
		.mockImplementation(() => ({
			x: 0,
			y: 0,
			left: 0,
			top: 0,
			right: 390,
			bottom: 72,
			width: 390,
			height: 72,
			toJSON: () => ({}),
		}));

	Object.defineProperty(document.documentElement, "scrollTop", {
		value: 220,
		writable: true,
		configurable: true,
	});

	fireEvent.scroll(window);

	await waitFor(() => {
		expect(document.querySelector(".eb-clientv2__progressOverlay")).toBeNull();
		expect(screen.getByRole("status", { name: /progress/i })).toHaveClass("is-mobile");
	});

	headerRectSpy.mockRestore();
	progressRectSpy.mockRestore();
	header.remove();
	Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
});
