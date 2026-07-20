import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import PilotDeliveryScreen from "./PilotDeliveryScreen";

const mockStartTracking = jest.fn();
const mockStopTracking = jest.fn(async () => { });
const mockTrackingState = {
    tracking: false,
    loadingGps: false,
    error: null,
    permissionState: "prompt",
    point: null,
	queuedPointsCount: 0,
	syncState: "idle",
	lastSyncedAt: null,
};

jest.mock("leaflet", () => {
    const Default = function Default() { };
    Default.prototype = {};
    Default.mergeOptions = jest.fn();
    return {
        __esModule: true,
        default: {
            Icon: {
                Default,
            },
            icon: jest.fn(() => ({})),
        },
        Icon: {
            Default,
        },
        icon: jest.fn(() => ({})),
    };
});

jest.mock("react-leaflet", () => ({
    MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
    Marker: ({ children }) => <div>{children}</div>,
    Polyline: () => null,
    Popup: ({ children }) => <div>{children}</div>,
    TileLayer: () => null,
}));

jest.mock("../hooks/usePilotLiveTracking", () => ({
    usePilotLiveTracking: () => ({
        tracking: mockTrackingState.tracking,
        loadingGps: mockTrackingState.loadingGps,
        error: mockTrackingState.error,
        permissionState: mockTrackingState.permissionState,
        point: mockTrackingState.point,
		queuedPointsCount: mockTrackingState.queuedPointsCount,
		syncState: mockTrackingState.syncState,
		lastSyncedAt: mockTrackingState.lastSyncedAt,
        startTracking: mockStartTracking,
        stopTracking: mockStopTracking,
    }),
}));

jest.mock("./ErrandChatPanel", () => ({
    __esModule: true,
    default: ({ disabled, disabledMessage }) => (
        <div data-testid="pilot-chat-panel">{disabled ? disabledMessage : "chat enabled"}</div>
    ),
}));

describe("PilotDeliveryScreen", () => {
    beforeEach(() => {
        mockStartTracking.mockReset();
        mockStopTracking.mockClear();
        Object.assign(mockTrackingState, {
            tracking: false,
            loadingGps: false,
            error: null,
            permissionState: "prompt",
            point: null,
			queuedPointsCount: 0,
			syncState: "idle",
			lastSyncedAt: null,
        });
        jest.spyOn(global, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("shows local web test GPS control in pilot delivery view", () => {
        render(
            <PilotDeliveryScreen
                errand={{
                    id: 6,
                    title: "Deliver package",
                    status: "accepted",
                    customer_name: "Amina",
                    pickup_location: "Ikeja",
                    dropoff_location: "Yaba",
                    amount: 12000,
                }}
                pilotId="pilot-1"
                token="token"
                apiBaseUrl="http://192.168.1.121:8001"
                onBack={() => {}}
                onDeliveryComplete={() => {}}
            />,
        );

        expect(
            screen.getByRole("button", { name: /use test location \(local web\)/i }),
        ).toBeInTheDocument();
    });

    test("shows offline queue status when tracking points are being stored locally", () => {
        Object.assign(mockTrackingState, {
            syncState: "offline_queueing",
            queuedPointsCount: 3,
        });

        render(
            <PilotDeliveryScreen
                errand={{
                    id: 6,
                    title: "Deliver package",
                    status: "accepted",
                    customer_name: "Amina",
                    pickup_location: "Ikeja",
                    dropoff_location: "Yaba",
                    amount: 12000,
                }}
                pilotId="pilot-1"
                token="token"
                apiBaseUrl="https://example.com"
                onBack={() => {}}
                onDeliveryComplete={() => {}}
            />,
        );

        expect(
            screen.getByText(/offline — storing 3 stored updates locally until the connection returns/i),
        ).toBeInTheDocument();
    });

        test("starts the errand on the server even when GPS does not start yet", async () => {
            mockStartTracking.mockResolvedValue(false);

            render(
                <PilotDeliveryScreen
                    errand={{
                        id: 8,
                        title: "Deliver package",
                        status: "accepted",
                        customer_name: "Amina",
                        pickup_location: "Ikeja",
                        dropoff_location: "Yaba",
                        amount: 12000,
                    }}
                    pilotId="pilot-1"
                    token="token"
                    apiBaseUrl="https://example.com"
                    onBack={() => {}}
                    onDeliveryComplete={() => {}}
                />,
            );

            fireEvent.click(screen.getByRole("button", { name: /start errand/i }));

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "https://example.com/api/v1/pilots/start-delivery?errand_id=8",
                    expect.objectContaining({
                        method: "POST",
                        headers: expect.objectContaining({
                            Authorization: "Bearer token",
                        }),
                    }),
                );
            });

            expect(mockStartTracking).toHaveBeenCalled();
            await waitFor(() => {
                expect(
                    screen.getByText(/errand started, but live location is still waiting for gps permission or signal/i),
                ).toBeInTheDocument();
            });
            expect(screen.getByRole("button", { name: /start errand/i })).toBeInTheDocument();
        });

    test("hides the chat tab when the errand is already completed", () => {
        render(
            <PilotDeliveryScreen
                errand={{
                    id: 7,
                    title: "Deliver documents",
                    status: "completed",
                    customer_name: "Amina",
                    pickup_location: "Victoria Island",
                    dropoff_location: "Lekki",
                    amount: 15000,
                }}
                pilotId="pilot-1"
                token="token"
                apiBaseUrl="https://example.com"
                onBack={() => { }}
                onDeliveryComplete={() => { }}
            />,
        );

        expect(
            screen.getByRole("button", { name: /call unavailable/i }).disabled,
        ).toBe(true);
        expect(
            screen.getByText(/chat and calling are disabled after the errand is completed/i),
        ).toBeTruthy();
        expect(screen.queryByRole("tab", { name: /chat/i })).toBeNull();
        expect(screen.queryByTestId("pilot-chat-panel")).toBeNull();
    });

    test("keeps chat available for active errands even if completed_at is present", () => {
        render(
            <PilotDeliveryScreen
                errand={{
                    id: 11,
                    title: "Collect package",
                    status: "in_progress",
                    completed_at: "2026-04-10T18:00:00.000Z",
                    customer_name: "Kunle",
                    pickup_location: "Yaba",
                    dropoff_location: "Lekki",
                    amount: 9000,
                }}
                pilotId="pilot-1"
                token="token"
                apiBaseUrl="https://example.com"
                onBack={() => {}}
                onDeliveryComplete={() => {}}
            />,
        );

        fireEvent.click(screen.getByRole("tab", { name: /chat/i }));
        expect(screen.getByTestId("pilot-chat-panel")).toHaveTextContent("chat enabled");
    });

    test("returns to idle controls when tracking stops after assignment loss", async () => {
        mockStartTracking.mockResolvedValue(true);

        const errand = {
            id: 11,
            title: "Collect package",
            status: "in_progress",
            customer_name: "Kunle",
            pickup_location: "Yaba",
            dropoff_location: "Lekki",
            amount: 9000,
        };

        const { rerender } = render(
            <PilotDeliveryScreen
                errand={errand}
                pilotId="pilot-1"
                token="token"
                apiBaseUrl="https://example.com"
                onBack={() => {}}
                onDeliveryComplete={() => {}}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /start errand/i }));

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /complete errand/i })).toBeInTheDocument();
        });

        Object.assign(mockTrackingState, {
            tracking: true,
            loadingGps: false,
            error:
                "Live tracking stopped because this errand is no longer assigned to you. Refresh your jobs list.",
            point: {
                latitude: 6.5244,
                longitude: 3.3792,
                accuracy: 10,
                speed: 0,
                timestamp: Date.now(),
            },
        });

        rerender(
            <PilotDeliveryScreen
                errand={errand}
                pilotId="pilot-1"
                token="token"
                apiBaseUrl="https://example.com"
                onBack={() => {}}
                onDeliveryComplete={() => {}}
            />,
        );

        await waitFor(() => {
                expect(screen.getByRole("button", { name: /start errand/i })).toBeInTheDocument();
        });

        expect(screen.queryByRole("button", { name: /pause live tracking/i })).toBeNull();
    });

    test("blocks tracking start when the errand belongs to another pilot", async () => {
        render(
            <PilotDeliveryScreen
                errand={{
                    id: 18,
                    title: "Deliver package",
                    status: "in_progress",
                    assigned_pilot_id: "pilot-2",
                    customer_name: "Amina",
                    pickup_location: "Ikeja",
                    dropoff_location: "Yaba",
                    amount: 12000,
                }}
                pilotId="pilot-1"
                token="token"
                apiBaseUrl="https://example.com"
                onBack={() => {}}
                onDeliveryComplete={() => {}}
            />,
        );

        const startButton = screen.getByRole("button", { name: /start errand/i });
        expect(startButton).toBeDisabled();
        expect(mockStartTracking).not.toHaveBeenCalled();

        await waitFor(() => {
            expect(screen.getByText(/assigned to another pilot/i)).toBeInTheDocument();
        });
    });

    test("shows a completion loading state and never re-offers Start Errand while completion is in-flight", async () => {
        mockStartTracking.mockResolvedValue(true);

        let resolveComplete;
        const completePromise = new Promise((resolve) => {
            resolveComplete = resolve;
        });

        global.fetch.mockImplementation((url) => {
            const urlString = String(url);
            if (urlString.includes("/api/v1/pilots/complete-delivery")) {
                return completePromise;
            }
            if (urlString.includes("/attachments")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ id: "att-1", filename: "proof.jpg" }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            });
        });

        const onDeliveryComplete = jest.fn(async () => {});

        render(
            <PilotDeliveryScreen
                errand={{
                    id: 25,
                    title: "Deliver documents",
                    status: "in_progress",
                    customer_name: "Amina",
                    pickup_location: "Victoria Island",
                    dropoff_location: "Lekki",
                    amount: 15000,
                }}
                pilotId="pilot-1"
                token="token"
                apiBaseUrl="https://example.com"
                onBack={() => {}}
                onDeliveryComplete={onDeliveryComplete}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /start errand/i }));

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /complete errand/i })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("tab", { name: /checklist/i }));

        fireEvent.click(
            screen.getByLabelText(/contact client and confirm pickup details/i),
        );
        fireEvent.click(
            screen.getByLabelText(/pickup completed \+ proof captured/i),
        );
        fireEvent.click(
            screen.getByLabelText(/ending step completed \+ client confirmation/i),
        );

        const fileInput = document.querySelector(".proof-upload-input");
        expect(fileInput).toBeTruthy();
        expect(fileInput).not.toBeDisabled();

        const proofFile = new File(["proof"], "proof.jpg", {
            type: "image/jpeg",
        });
        fireEvent.change(fileInput, { target: { files: [proofFile] } });

        await waitFor(() => {
            expect(
                screen.getByLabelText(/upload required photos\/docs/i),
            ).toBeChecked();
        });

        const completeButton = screen.getByRole("button", {
            name: /complete errand/i,
        });
        expect(completeButton).not.toBeDisabled();

        fireEvent.click(completeButton);

        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /completing errand/i }),
            ).toBeDisabled();
        });

        expect(
            screen.queryByRole("button", { name: /start errand/i }),
        ).toBeNull();
        expect(onDeliveryComplete).not.toHaveBeenCalled();

        resolveComplete({
            ok: true,
            json: async () => ({}),
        });

        await waitFor(() => {
            expect(screen.getByText("✅ Errand completed")).toBeInTheDocument();
        });
    });

    test("removes the pause live tracking control once an errand is active", async () => {
        mockStartTracking.mockResolvedValue(true);

        render(
            <PilotDeliveryScreen
                errand={{
                    id: 31,
                    title: "Drop off package",
                    status: "in_progress",
                    customer_name: "Amina",
                    pickup_location: "Ikeja",
                    dropoff_location: "Yaba",
                    amount: 12000,
                }}
                pilotId="pilot-1"
                token="token"
                apiBaseUrl="https://example.com"
                onBack={() => {}}
                onDeliveryComplete={() => {}}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /start errand/i }));

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /complete errand/i })).toBeInTheDocument();
        });

        expect(screen.queryByRole("button", { name: /pause live tracking/i })).toBeNull();
        expect(screen.queryByRole("button", { name: /resume live tracking/i })).toBeNull();
    });
});
