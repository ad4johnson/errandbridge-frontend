import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";

import PilotJobBoardEnhanced from "./PilotJobBoardEnhanced";

const makeJsonResponse = (payload, ok = true, status = 200) => ({
	ok,
	status,
	json: async () => payload,
});

describe("PilotJobBoardEnhanced jobs endpoint", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.spyOn(global, "fetch").mockImplementation(async (input) => {
			const url = typeof input === "string" ? input : input?.url || "";
			if (url.includes("/api/v1/pilots/available-jobs")) {
				return makeJsonResponse({ errands: [] });
			}
			if (url.includes("/api/v1/pilots/stats")) {
				return makeJsonResponse({
					totalDeliveries: 0,
					todayDeliveries: 0,
					earnings: 0,
					rating: 4.9,
				});
			}
			if (url.includes("/api/v1/pilots/jobs?status=active")) {
				// Note: pilot_id intentionally omitted to match legacy backend behavior.
				return makeJsonResponse({
					errands: [
						{
							id: 1,
							title: "Current errand",
							status: "in_progress",
							pickup_location: "Ikeja",
							dropoff_location: "Lekki",
						},
					],
				});
			}
			if (url.includes("/api/v1/pilots/jobs?status=completed")) {
				return makeJsonResponse({ errands: [] });
			}
			if (url.includes("/api/v1/pilots/availability-history")) {
				return makeJsonResponse([]);
			}
			return makeJsonResponse({});
		});
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	test("renders active errands even when pilot_id is omitted", async () => {
		await act(async () => {
			render(
				<PilotJobBoardEnhanced
					apiBaseUrl="https://api.example.com"
					token="pilot-token"
					user={{ id: "pilot-1" }}
					onJobAccepted={jest.fn()}
					onLogout={jest.fn()}
					screenMode="active"
				/>,
			);
		});

		expect(await screen.findByText(/current errand/i)).toBeInTheDocument();
	});
});
