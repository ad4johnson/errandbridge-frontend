import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";

import PricingModal from "./PricingModal";

describe("PricingModal region inference", () => {
	test("defaults to Europe (EUR) for Europe/* timezones and does not persist by default", () => {
		const originalDateTimeFormat = Intl.DateTimeFormat;
		const originalLanguage = navigator.language;

		try {
			window.localStorage.clear();

			// Simulate a European visitor.
			Object.defineProperty(navigator, "language", {
				value: "fr-FR",
				configurable: true,
			});

			Intl.DateTimeFormat = jest.fn(() => ({
				resolvedOptions: () => ({ timeZone: "Europe/Paris" }),
			}));

			render(
				<PricingModal
					open
					onClose={() => undefined}
					onStartQuote={() => undefined}
				/>,
			);

			const europeTab = screen.getByRole("tab", { name: /Europe \(EUR\)/i });
			expect(europeTab).toHaveAttribute("aria-selected", "true");

			const drawer = screen.getByLabelText(/Tier comparison/i);
			expect(within(drawer).getByText(/Showing: Europe/i)).toBeInTheDocument();
			expect(within(drawer).getByText(/EUR/i)).toBeInTheDocument();

			// Auto-inferred region should not be persisted unless the user explicitly chooses.
			expect(window.localStorage.getItem("eb_pricing_region_v1")).toBeNull();
		} finally {
			Intl.DateTimeFormat = originalDateTimeFormat;
			Object.defineProperty(navigator, "language", {
				value: originalLanguage,
				configurable: true,
			});
		}
	});
});
