import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import ReviewModal from "./ReviewModal";

describe("ReviewModal referral share state", () => {
	const baseProps = {
		open: true,
		errand: {
			id: 9,
			title: "Document pickup",
			referenceNumber: "EB-9-1",
		},
		reviewRating: null,
		setReviewRating: jest.fn(),
		reviewNotes: "",
		setReviewNotes: jest.fn(),
		reviewSubmitting: false,
		reviewSubmitted: false,
		referralCode: "",
		referralShareLink: "",
		onCopyReferralShareLink: jest.fn(),
		onStartTipCheckout: jest.fn(),
		tipCurrency: "USD",
		onSubmit: jest.fn(),
		onClose: jest.fn(),
	};

	test("shows referral share actions after review submission", () => {
		const onCopyReferralShareLink = jest.fn();
		render(
			<ReviewModal
				{...baseProps}
				reviewSubmitted
				referralCode="EBFRIEND"
				referralShareLink="https://errandbridge.example/r/EBFRIEND"
				onCopyReferralShareLink={onCopyReferralShareLink}
			/>,
		);

		expect(screen.getByText(/your review is in/i)).toBeInTheDocument();
		expect(screen.getByText(/Referral code:/i)).toHaveTextContent("EBFRIEND");
		expect(
			screen.getByText("https://errandbridge.example/r/EBFRIEND"),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /copy referral link/i }));
		expect(onCopyReferralShareLink).toHaveBeenCalledTimes(1);
	});

	test("keeps submit disabled until a rating is selected", () => {
		render(<ReviewModal {...baseProps} />);

		expect(
			screen.getByRole("button", { name: /submit review/i }),
		).toBeDisabled();
	});

	test("falls back to reference_number when referenceNumber is unavailable", () => {
		render(
			<ReviewModal
				{...baseProps}
				errand={{
					id: 12,
					title: "Bank paperwork",
					reference_number: "EB-12-7",
				}}
			/>,
		);

		expect(screen.getByText(/reference: eb-12-7/i)).toBeInTheDocument();
	});

	test("hides tipping controls for landing feedback reviews", () => {
		render(
			<ReviewModal
				{...baseProps}
				errand={{
					id: -1,
					title: "Website feedback",
					reference_number: "LANDING",
				}}
			/>,
		);

		expect(screen.queryByText(/say thanks with a tip/i)).not.toBeInTheDocument();
		expect(screen.getByText(/share your feedback/i)).toBeInTheDocument();
	});
});
