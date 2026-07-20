import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import ClientTrackingPage from "./ClientTrackingPage";

describe("ClientTrackingPage", () => {
	test("renders the dedicated live tracking page and refreshes tracking status", () => {
		const refreshTrackingStatus = jest.fn();
		const onBack = jest.fn();
		const onViewDetails = jest.fn();
		const PilotTracker = ({ errandId }) => (
			<div data-testid="pilot-tracker">Tracker for {errandId}</div>
		);

		render(
			<ClientTrackingPage
				errand={{
					id: "err-42",
					title: "Passport pickup",
					referenceNumber: "EB-42",
					status: "in_progress",
					pickupLocation: "Ikeja",
					dropoffLocation: "Lekki",
				}}
				errandsLoaded
				errandId="err-42"
				activeTrackingInfo={{ tracking_allowed: true, loading: false }}
				trackingAllowed
				refreshTrackingStatus={refreshTrackingStatus}
				apiBaseUrl="https://api.example.com"
				PilotTracker={PilotTracker}
				formatStatusLabel={(status) => status.replace("_", " ")}
				onBack={onBack}
				onViewDetails={onViewDetails}
			/>,
		);

		expect(screen.getByRole("heading", { name: /passport pickup/i })).toBeInTheDocument();
		expect(screen.getByText(/live now/i)).toBeInTheDocument();
		expect(screen.getByTestId("pilot-tracker")).toHaveTextContent("Tracker for err-42");

		fireEvent.click(screen.getByRole("button", { name: /refresh tracking status/i }));
		expect(refreshTrackingStatus).toHaveBeenCalledWith("err-42");

		fireEvent.click(screen.getByRole("button", { name: /back/i }));
		expect(onBack).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole("button", { name: /view errand details/i }));
		expect(onViewDetails).toHaveBeenCalledTimes(1);
	});

	test("shows a waiting banner when tracking is not available yet", () => {
		const onViewDetails = jest.fn();
		const PilotTracker = () => <div data-testid="pilot-tracker">unused</div>;

		render(
			<ClientTrackingPage
				errand={{
					id: "err-43",
					title: "Airport pickup",
					referenceNumber: "EB-43",
					status: "assigned",
					pickupLocation: "MM2",
					dropoffLocation: "VI",
				}}
				errandsLoaded
				errandId="err-43"
				activeTrackingInfo={{
					tracking_allowed: false,
					loading: false,
					reason: "Tracking becomes available once the pilot starts the errand.",
					status: "assigned",
				}}
				trackingAllowed={false}
				refreshTrackingStatus={jest.fn()}
				apiBaseUrl="https://api.example.com"
				PilotTracker={PilotTracker}
				formatStatusLabel={(status) => status.replace("_", " ")}
				onBack={jest.fn()}
				onViewDetails={onViewDetails}
			/>,
		);

		expect(screen.getByText(/waiting for pilot/i)).toBeInTheDocument();
		expect(
			screen.getAllByText(/tracking becomes available once the pilot starts the errand/i).length,
		).toBeGreaterThan(0);
		expect(screen.queryByTestId("pilot-tracker")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /open errand details/i }));
		expect(onViewDetails).toHaveBeenCalledTimes(1);
	});

	test("does not render the live map for completed errands even if tracking was previously allowed", () => {
		const refreshTrackingStatus = jest.fn();
		const PilotTracker = () => <div data-testid="pilot-tracker">unused</div>;

		render(
			<ClientTrackingPage
				errand={{
					id: "err-44",
					title: "Document dropoff",
					referenceNumber: "EB-44",
					status: "completed",
					pickupLocation: "Ikeja",
					dropoffLocation: "Lekki",
				}}
				errandsLoaded
				errandId="err-44"
				activeTrackingInfo={{
					tracking_allowed: true,
					loading: false,
					status: "completed",
				}}
				trackingAllowed
				refreshTrackingStatus={refreshTrackingStatus}
				apiBaseUrl="https://api.example.com"
				PilotTracker={PilotTracker}
				formatStatusLabel={(status) => status.replace("_", " ")}
				onBack={jest.fn()}
				onViewDetails={jest.fn()}
			/>,
		);

		expect(
			screen.getByText(/this errand has been completed\. you can still return to the errand details for proof and history\./i),
		).toBeInTheDocument();
		expect(
			screen.getAllByText(/live map is disabled because this errand is already completed/i)
				.length,
		).toBeGreaterThan(0);
		expect(screen.queryByTestId("pilot-tracker")).not.toBeInTheDocument();

		const refreshButton = screen.getByRole("button", {
			name: /refresh tracking status/i,
		});
		expect(refreshButton).toBeDisabled();
		fireEvent.click(refreshButton);
		expect(refreshTrackingStatus).not.toHaveBeenCalled();
	});
});
