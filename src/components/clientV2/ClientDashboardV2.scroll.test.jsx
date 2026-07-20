import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ClientDashboardV2 from "./ClientDashboardV2";

import {
	CATALOG_CATEGORIES,
	getTemplatesForCategory,
} from "../../data/serviceCatalogV2";

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

test("template selection does not force-scroll the page", async () => {
	if (!Element.prototype.scrollIntoView) {
		// JSDOM doesn't implement this; we only need to observe calls.
		// eslint-disable-next-line no-empty-function
		Element.prototype.scrollIntoView = () => {};
	}

	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const categoryWithTemplates = CATALOG_CATEGORIES.find((category) => {
		const templates = getTemplatesForCategory(category.key);
		return Array.isArray(templates) && templates.length > 0;
	});

	expect(categoryWithTemplates).toBeTruthy();
	const templates = getTemplatesForCategory(categoryWithTemplates.key);
	const laneKey = categoryWithTemplates.laneKey;

	const onTemplateSelect = jest.fn();
	const scrollSpy = jest
		.spyOn(Element.prototype, "scrollIntoView")
		.mockImplementation(() => {});

	render(
		<ClientDashboardV2
			{...buildBaseProps({
				serviceKey: laneKey,
				onTemplateSelect,
				pricesByLane: {
					[laneKey]: {
						GBP: { standard: 10, priority: 20, premium: 30 },
					},
				},
			})}
		/>,
	);

	// Ignore any mount-time scrolls; the regression we care about is on template select.
	scrollSpy.mockClear();

	await user.click(screen.getByRole("button", { name: /choose template/i }));

	await user.click(
		screen.getByRole("button", {
			name: new RegExp(escapeRegExp(templates[0].name), "i"),
		}),
	);

	expect(onTemplateSelect).toHaveBeenCalled();
	expect(scrollSpy).not.toHaveBeenCalled();

	scrollSpy.mockRestore();
});

test("template chooser auto-scrolls to the selected template on open (no scrollIntoView)", async () => {
	jest.useFakeTimers();
	try {
		if (!Element.prototype.scrollIntoView) {
			// JSDOM doesn't implement this; we only need to observe calls.
			// eslint-disable-next-line no-empty-function
			Element.prototype.scrollIntoView = () => {};
		}

		const user = typeof userEvent.setup === "function"
			? userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
			: userEvent;
		const categoryWithTemplates = CATALOG_CATEGORIES.find((category) => {
			const templates = getTemplatesForCategory(category.key);
			return Array.isArray(templates) && templates.length > 0;
		});

		expect(categoryWithTemplates).toBeTruthy();
		const templates = getTemplatesForCategory(categoryWithTemplates.key);
		const selectedTemplate = templates[0];
		const laneKey = categoryWithTemplates.laneKey;

		const scrollSpy = jest
			.spyOn(Element.prototype, "scrollIntoView")
			.mockImplementation(() => {});

		render(
			<ClientDashboardV2
				{...buildBaseProps({
					serviceKey: laneKey,
					templateName: selectedTemplate.name,
					pricesByLane: {
						[laneKey]: {
							GBP: { standard: 10, priority: 20, premium: 30 },
						},
					},
				})}
			/>,
		);

		scrollSpy.mockClear();

		await user.click(
			screen.getByRole("button", { name: /choose template|change template/i }),
		);

		const list = document.querySelector(".eb-template-browser-list");
		expect(list).toBeTruthy();

		const selectedButton = list.querySelector('[data-template-selected="true"]');
		expect(selectedButton).toBeTruthy();

		Object.defineProperty(list, "clientHeight", { value: 200, configurable: true });
		Object.defineProperty(list, "scrollHeight", { value: 2000, configurable: true });
		Object.defineProperty(selectedButton, "offsetTop", { value: 600, configurable: true });
		Object.defineProperty(selectedButton, "offsetHeight", { value: 50, configurable: true });

		// Let the chooser's open-time scroll effect run.
		jest.advanceTimersByTime(120);
		expect(list.scrollTop).toBeGreaterThan(0);
		expect(list.scrollTop).toBe(525);
		expect(scrollSpy).not.toHaveBeenCalled();

		scrollSpy.mockRestore();
	} finally {
		jest.useRealTimers();
	}
});
