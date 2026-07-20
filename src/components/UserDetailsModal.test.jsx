import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import UserDetailsModal from "./UserDetailsModal";

describe("UserDetailsModal review summary", () => {
	const baseProps = {
		open: true,
		user: {
			firstName: "Ada",
			lastName: "Okafor",
			email: "ada@example.com",
			phone: "+44 1111 2222",
			address: "10 Example Street",
			city: "London",
			country: "United Kingdom",
			postcode: "SE1 1AA",
		},
		profileImage: "",
		userIsAdmin: false,
		onClose: jest.fn(),
		onOpenSettings: jest.fn(),
		onOpenAdminDashboard: jest.fn(),
		onLogout: jest.fn(),
		onProfileImageUpload: jest.fn(),
		onProfileImageRemove: jest.fn(),
	};

	test("shows an empty-state summary before any ratings are submitted", () => {
		render(
			<UserDetailsModal
				{...baseProps}
				reviewSummary={{ submittedCount: 0, averageRating: null, latestReview: null }}
			/>,
		);

		expect(screen.getByText(/your pilot ratings/i)).toBeInTheDocument();
		expect(
			screen.getByText(/once you rate a pilot, it shows up here right away/i),
		).toBeInTheDocument();
		expect(screen.getByText(/^0 reviews$/i)).toBeInTheDocument();
	});

	test("renders submitted review stats and the latest rated errand", () => {
		render(
			<UserDetailsModal
				{...baseProps}
				reviewSummary={{
					submittedCount: 3,
					averageRating: 4.7,
					latestReview: {
						id: 17,
						title: "Passport pickup",
						referenceNumber: "EB-17-9001",
						rating: 5,
						reviewedAt: "2026-04-10T10:00:00Z",
					},
				}}
			/>,
		);

		expect(
			screen.getByText(/your latest ratings are now part of your profile/i),
		).toBeInTheDocument();
		expect(screen.getByText(/^3 reviews$/i)).toBeInTheDocument();
		expect(screen.getByText(/4.7 ★/i)).toBeInTheDocument();
		expect(screen.getByText(/passport pickup/i)).toBeInTheDocument();
		expect(screen.getByText(/5 ★/i)).toBeInTheDocument();
	});
});
