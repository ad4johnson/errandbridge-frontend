import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import AppPromoModal from "./AppPromoModal";

jest.mock("../lib/track", () => ({
	track: jest.fn(),
}));

describe("AppPromoModal", () => {
	test("renders the offer-first hierarchy with one dominant web CTA", () => {
		render(
			<AppPromoModal
				isOpen
				onClose={() => {}}
				onStartErrand={() => {}}
				appStoreUrl="https://apps.apple.com/example"
				googlePlayUrl="https://play.google.com/example"
			/>,
		);

		expect(screen.getByText("WELCOME OFFER")).toBeInTheDocument();
		const headline = screen.getByRole("heading", {
			name: /Get 10% off your first errand/i,
		});
		const promoStrip = screen.getByText(
			/First-time client reward · 10% off your first request/i,
		);
		const primaryCta = screen.getByRole("button", {
			name: /Start your first errand/i,
		});
		const appStoreBadge = screen.getByAltText(/Download on the App Store/i);
		const googlePlayBadge = screen.getByAltText(/Get it on Google Play/i);
		const notNow = screen.getByRole("button", { name: /Not now/i });

		expect(
			headline.compareDocumentPosition(promoStrip) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			promoStrip.compareDocumentPosition(primaryCta) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			primaryCta.compareDocumentPosition(appStoreBadge) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			appStoreBadge.compareDocumentPosition(notNow) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(googlePlayBadge).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Continue on web/i }),
		).not.toBeInTheDocument();
	});

	test("uses the primary CTA for the start action and keeps dismissal secondary", () => {
		const onStartErrand = jest.fn();
		const onClose = jest.fn();

		render(
			<AppPromoModal
				isOpen
				onClose={onClose}
				onStartErrand={onStartErrand}
				appStoreUrl="https://apps.apple.com/example"
				googlePlayUrl="https://play.google.com/example"
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: /Start your first errand/i }),
		);
		expect(onStartErrand).toHaveBeenCalledTimes(1);
		expect(onClose).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: /Not now/i }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
