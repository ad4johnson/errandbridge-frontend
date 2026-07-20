import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";

import PilotTracker from "./PilotTracker";

jest.mock("axios");

const mockMapInstance = {
	setView: jest.fn().mockReturnThis(),
	remove: jest.fn(),
	removeLayer: jest.fn(),
	fitBounds: jest.fn(),
};

const mockTileLayerInstance = {
	addTo: jest.fn().mockReturnThis(),
};

const mockMarkerInstance = {
	bindPopup: jest.fn().mockReturnThis(),
	addTo: jest.fn().mockReturnThis(),
	setLatLng: jest.fn().mockReturnThis(),
};

const mockPolylineInstance = {
	addTo: jest.fn().mockReturnThis(),
};

jest.mock("leaflet", () => ({
	Icon: {
		Default: {
			prototype: {},
			mergeOptions: jest.fn(),
		},
	},
	map: jest.fn(() => mockMapInstance),
	tileLayer: jest.fn(() => mockTileLayerInstance),
	marker: jest.fn(() => mockMarkerInstance),
	polyline: jest.fn(() => mockPolylineInstance),
	latLngBounds: jest.fn(() => ({ pad: jest.fn() })),
	icon: jest.fn(() => ({})),
}));

class MockWebSocket {
	static instances = [];

	constructor(url) {
		this.url = url;
		this.readyState = MockWebSocket.OPEN;
		MockWebSocket.instances.push(this);
		setTimeout(() => {
			this.onopen?.();
		}, 0);
	}

	send = jest.fn();

	close = jest.fn(() => {
		this.readyState = MockWebSocket.CLOSED;
		this.onclose?.();
	});

	emitMessage(payload) {
		this.onmessage?.({ data: JSON.stringify(payload) });
	}
}

MockWebSocket.OPEN = 1;
MockWebSocket.CLOSED = 3;

describe("PilotTracker", () => {
	beforeEach(() => {
		MockWebSocket.instances = [];
		global.WebSocket = MockWebSocket;
		jest.clearAllMocks();
		localStorage.clear();
		axios.get.mockImplementation((url) => {
			if (String(url).includes("/api/v1/tracking/current/")) {
				return Promise.resolve({
					data: {
						latitude: 6.45,
						longitude: 3.39,
						pilot_id: "pilot-44",
						tracking_paused: true,
						status: "in_progress",
						created_at: "2024-04-01T10:00:00Z",
					},
				});
			}
			if (String(url).includes("/api/v1/tracking/history/")) {
				return Promise.resolve({
					data: {
						locations: [
							{
								latitude: 6.45,
								longitude: 3.39,
								pilot_id: "pilot-44",
								tracking_paused: true,
								status: "in_progress",
								created_at: "2024-04-01T10:00:00Z",
							},
						],
						distance_traveled: 1.2,
						pilot_id: "pilot-44",
					},
				});
			}
			return Promise.reject(new Error(`Unexpected URL: ${url}`));
		});
	});

	test("shows paused state from API and switches to live on websocket updates", async () => {
		render(
			<PilotTracker errandId="err-1" apiBaseUrl="https://api.example.com" />,
		);

		await waitFor(() => {
			expect(screen.getByText(/● Paused/i)).toBeInTheDocument();
		});
		expect(screen.getByText("pilot-44")).toBeInTheDocument();

		const ws = MockWebSocket.instances[0];
		expect(ws).toBeTruthy();

		await act(async () => {
			ws.emitMessage({
				type: "location_update",
				location: {
					latitude: 6.5,
					longitude: 3.4,
					pilot_id: "pilot-44",
					tracking_paused: false,
					status: "in_progress",
					created_at: "2024-04-01T10:02:00Z",
				},
			});
		});

		await waitFor(() => {
			expect(screen.getByText(/● Live/i)).toBeInTheDocument();
		});
		expect(screen.getByText(/pilot location updated live/i)).toBeInTheDocument();
		expect(screen.getByText(/6.500000, 3.400000/i)).toBeInTheDocument();
	});
});
