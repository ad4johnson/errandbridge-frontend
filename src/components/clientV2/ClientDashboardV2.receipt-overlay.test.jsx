import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ClientDashboardV2 from "./ClientDashboardV2";

function buildBaseProps(overrides = {}) {
	const noop = () => {};
	return {
		mode: "create",
		onOpenCreate: noop,
		onOpenErrands: noop,
		isMobile: true,
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
		paymentModalOpen: false,
		errands: [],
		onOpenErrand: noop,
		...overrides,
	};
}

test("hides the mobile checkout bar when a receipt overlay is open", () => {
	render(<ClientDashboardV2 {...buildBaseProps({ receiptOverlayOpen: true })} />);

	expect(
		screen.queryByRole("region", { name: /checkout summary/i }),
	).not.toBeInTheDocument();
});

test("manual mode hides the mobile checkout bar by default", () => {
	render(
		<ClientDashboardV2
			{...buildBaseProps({
				toxiEnabled: false,
				onOpenAssistant: () => {},
			})}
		/>,
	);

	expect(
		screen.queryByRole("region", { name: /checkout summary/i }),
	).not.toBeInTheDocument();

	expect(
		screen.getByRole("button", { name: /show assistant/i }),
	).toBeInTheDocument();
});


test("manual mode routes review visibility through the assistant handoff", async () => {
	const user = typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
	const onOpenAssistant = jest.fn();
	const onCloseAssistant = jest.fn();

	const { rerender } = render(
		<ClientDashboardV2
			{...buildBaseProps({
				toxiEnabled: false,
				onOpenAssistant,
				onCloseAssistant,
			})}
		/>,
	);

	await user.click(screen.getByRole("button", { name: /show assistant/i }));
	expect(onOpenAssistant).toHaveBeenCalledTimes(1);
	expect(
		screen.queryByRole("region", { name: /checkout summary/i }),
	).not.toBeInTheDocument();

	rerender(
		<ClientDashboardV2
			{...buildBaseProps({
				toxiEnabled: false,
				onOpenAssistant,
				onCloseAssistant,
				assistantOpen: true,
			})}
		/>,
	);

	await user.click(screen.getByRole("button", { name: /hide assistant/i }));
	expect(onCloseAssistant).toHaveBeenCalledTimes(1);

	rerender(
		<ClientDashboardV2
			{...buildBaseProps({
				toxiEnabled: false,
				onOpenAssistant,
				onCloseAssistant,
				assistantOpen: false,
			})}
		/>,
	);

	expect(
		screen.getByRole("region", { name: /checkout summary/i }),
	).toBeInTheDocument();
});
