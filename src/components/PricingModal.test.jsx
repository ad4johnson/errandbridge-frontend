import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";

import PricingModal from "./PricingModal";

describe("PricingModal", () => {
	afterEach(() => {
		window.localStorage.clear();
	});

	test("renders region tabs, service cards, tier drawer, and CTA", () => {
		const onClose = jest.fn();
		const onStartQuote = jest.fn();
		window.localStorage.setItem("eb_pricing_region_v1", "uk");
		render(
			<PricingModal
				open
				onClose={onClose}
				onStartQuote={onStartQuote}
				priceModelMultiplier={1}
				priceUpliftMultiplier={1}
			/>,
		);

		expect(screen.getByText("Pricing")).toBeInTheDocument();
		expect(
			screen.getByText(/Scan by region.*Standard \/ Priority \/ Premium/i),
		).toBeInTheDocument();

		// Region tabs
		expect(screen.getByRole("tab", { name: /UK \(GBP\)/i })).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: /Europe \(EUR\)/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /US \(USD\)/i })).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: /Nigeria \(NGN\)/i }),
		).toBeInTheDocument();

		// Service cards
		const documentsCard = screen.getByRole("button", {
			name: /Document collection \/ submission/i,
		});
		fireEvent.click(documentsCard);

		// Drawer shows tiers and (for UK) should include the number 45.
		const drawer = screen.getByLabelText(/Tier comparison/i);
		expect(within(drawer).getByText(/^Standard$/i)).toBeInTheDocument();
		expect(within(drawer).getByText(/^Priority$/i)).toBeInTheDocument();
		expect(within(drawer).getByText(/^Premium$/i)).toBeInTheDocument();
		expect(within(drawer).getByText(/Showing: UK/i)).toBeInTheDocument();
		expect(within(drawer).getByText(/45/)).toBeInTheDocument();

		// Switching regions should update the drawer context.
		fireEvent.click(screen.getByRole("tab", { name: /US \(USD\)/i }));
		expect(within(drawer).getByText(/Showing: US/i)).toBeInTheDocument();

		// Primary CTA
		fireEvent.click(
			screen.getByRole("button", { name: /Get instant quote/i }),
		);
		expect(onStartQuote).toHaveBeenCalledTimes(1);

		// Internal-only block is not shown by default.
		expect(screen.queryByText(/Internal pricing details/i)).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Close pricing modal/i }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
