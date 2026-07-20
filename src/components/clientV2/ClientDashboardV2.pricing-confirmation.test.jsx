import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ClientDashboardV2 from "./ClientDashboardV2";

import {
	CATALOG_CATEGORIES,
	getTemplatesForCategory,
} from "../../data/serviceCatalogV2";

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
		onClearSchedule: noop,
		onOpenSchedule: noop,
		onOpenPayment: noop,
		errands: [],
		onOpenErrand: noop,
		...overrides,
	};
}

test("pricing confirmation resets when template changes", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

	const categoryWithTwoTemplates = CATALOG_CATEGORIES.find((category) => {
		const templates = getTemplatesForCategory(category.key);
		return Array.isArray(templates) && templates.length >= 2;
	});

	expect(categoryWithTwoTemplates).toBeTruthy();
	const templates = getTemplatesForCategory(categoryWithTwoTemplates.key);
	const laneKey = categoryWithTwoTemplates.laneKey;

	const { rerender } = render(
		<ClientDashboardV2
			{...buildBaseProps({
				serviceKey: laneKey,
				templateName: templates[0].name,
				pricesByLane: {
					[laneKey]: {
						GBP: { standard: 10, priority: 20, premium: 30 },
					},
				},
			})}
		/>,
	);

	// With a template chosen but no explicit tier confirmation for this draft,
	// readiness should prompt pricing selection.
	expect(screen.getAllByText(/next step:\s*select priority level/i).length).toBeGreaterThan(0);

	// Confirm the default (standard) tier.
	await user.click(screen.getByRole("button", { name: /standard/i }));
	await user.click(screen.getByRole("button", { name: /select this class/i }));

	// Once pricing is confirmed, the next required step becomes adding a short title.
	expect(screen.getAllByText(/next step:\s*add a short title/i).length).toBeGreaterThan(0);

	// Changing the template should invalidate pricing confirmation so users
	// are prompted to re-select the pricing tier for the new template context.
	rerender(
		<ClientDashboardV2
			{...buildBaseProps({
				serviceKey: laneKey,
				templateName: templates[1].name,
				pricesByLane: {
					[laneKey]: {
						GBP: { standard: 10, priority: 20, premium: 30 },
					},
				},
			})}
		/>,
	);

	expect(screen.getAllByText(/next step:\s*select priority level/i).length).toBeGreaterThan(0);
});
