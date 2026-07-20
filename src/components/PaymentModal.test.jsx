import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import PaymentModal from "./PaymentModal";

function renderModal(props = {}) {
	return render(
		<PaymentModal
			open
			onClose={() => {}}
			paymentReady={false}
			paymentRequired
			paymentAmountLabel="£25"
			subscriptionLabel="£25 / month"
			isSubscriptionMode={false}
			sensitivityTierLabel="Standard"
			pricingRegionLabel="United Kingdom"
			paymentMode="standard"
			onPaymentModeChange={() => {}}
			paymentStatus="idle"
			paymentError=""
			paymentNotice=""
			onClearPaymentNotice={() => {}}
			paymentVerifying={false}
			submissionPending={false}
			title="Passport pickup"
			reviewItems={[]}
			onStartCheckout={() => {}}
			showPaymentSubmitDetails={false}
			onTogglePaymentSubmitDetails={() => {}}
			agreed={false}
			onAgreeChange={() => {}}
			onShowPolicyModal={() => {}}
			showPolicyDetails={false}
			onTogglePolicyDetails={() => {}}
			onSubmitErrand={() => {}}
			promoCode=""
			onPromoCodeChange={() => {}}
			{...props}
		/>,
	);
}

describe("PaymentModal", () => {
	afterEach(() => {
		document.body.removeAttribute("data-eb-scroll-locks");
		document.body.style.overflow = "";
		document.body.style.position = "";
		document.body.style.top = "";
		document.body.style.left = "";
		document.body.style.right = "";
		document.body.style.width = "";
		document.documentElement.style.overflow = "";
	});

	test("locks body scroll while the modal variant is open", () => {
		const { unmount } = renderModal();

		expect(document.body.style.overflow).toBe("hidden");
		expect(document.body.style.position).toBe("fixed");
		expect(document.body.dataset.ebScrollLocks).toBe("1");

		unmount();

		expect(document.body.dataset.ebScrollLocks).toBeUndefined();
		expect(document.body.style.position).toBe("");
	});

	test("does not lock body scroll for the inline variant", () => {
		renderModal({ variant: "inline" });

		expect(document.body.dataset.ebScrollLocks).toBeUndefined();
		expect(document.body.style.position).toBe("");
	});

	test("calls onClose when the backdrop is clicked", () => {
		const onClose = jest.fn();
		renderModal({ onClose });

		fireEvent.click(screen.getByRole("dialog", { name: /pay securely/i }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	test("disables checkout when title is blank/whitespace", () => {
		renderModal({ title: "   ", agreed: true });

		const checkoutBtn = screen.getByRole("button", { name: /pay & submit request/i });
		expect(checkoutBtn).toBeDisabled();
	});

	test("disables submit when title is blank/whitespace", () => {
		renderModal({ title: "\n\t ", paymentRequired: false, paymentReady: true, agreed: true });

		const submitBtn = screen.getByRole("button", { name: /^submit request$/i });
		expect(submitBtn).toBeDisabled();
	});
});
