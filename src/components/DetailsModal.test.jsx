import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import DetailsModal from "./DetailsModal";

jest.mock("./ModalPortal", () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock("../utils/scrollLock", () => ({ acquireBodyScrollLock: () => jest.fn() }));
jest.mock("./ErrandChatPanel", () => ({
    __esModule: true,
    default: ({ disabled, disabledMessage }) => (
        <div data-testid="errand-chat-panel">{disabled ? disabledMessage : "chat enabled"}</div>
    ),
}));

describe("DetailsModal", () => {
    test("mobile sheet always provides a close action", () => {
        const onClose = jest.fn();
		render(
            <DetailsModal
                detailsModal={{
                    open: true,
                    errand: {
                        id: 101,
                        referenceNumber: "EB-101",
                        title: "Office pickup",
                        status: "cancelled",
                        pickupLocation: "Akure, Nigeria",
                        dropoffLocation: "",
                        sensitivity: "standard",
                        createdAt: "2026-04-20T10:00:00.000Z",
                        history: [],
                    },
                }}
                isMobile={true}
                onClose={onClose}
                onPreviewFileUrl={() => {}}
                documentsUploadedCount={0}
                uploadedFiles={[]}
                hasUploadedFiles={false}
                buildDescriptionItems={(value) => [value].filter(Boolean)}
                formatEventLabel={(value) => value}
                formatStatusLabel={(value) => value}
                activeTrackingInfo={{}}
                trackingAllowed={false}
                onOpenTracking={() => {}}
                refreshTrackingStatus={() => {}}
                apiBaseUrl="https://example.com"
                authToken="token"
            />,
        );

		const closeButtons = screen.getAllByRole("button", { name: /^close$/i });
		expect(closeButtons.length).toBeGreaterThanOrEqual(2);
		const [headerClose, footerClose] = closeButtons;
		fireEvent.click(headerClose);
        expect(onClose).toHaveBeenCalledTimes(1);
		fireEvent.click(footerClose);
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    test("renders the assigned pilot trust card when trust data is available", () => {
        render(
            <DetailsModal
                detailsModal={{
                    open: true,
                    errand: {
                        id: 15,
                        referenceNumber: "EB-15",
                        title: "Airport pickup",
                        status: "assigned",
                        pickupLocation: "MMA",
                        dropoffLocation: "Lekki",
                        sensitivity: "standard",
                        createdAt: "2026-04-10T09:00:00.000Z",
                        assignedPilotTrust: {
                            pilotId: 9,
                            displayName: "Nora Bridge",
                            rating: 4.9,
                            reviewCount: 12,
                            completedErrands: 44,
                            verificationLabel: "Identity verified",
                            trustLabel: "Trusted by clients",
                            recentReviews: [
                                {
                                    title: "Passport run",
                                    referenceNumber: "EB-14",
                                    rating: 5,
                                    reviewNotes: "Very smooth handoff.",
                                    reviewedAt: "2026-04-09T09:00:00.000Z",
                                },
                            ],
                        },
                        history: [],
                    },
                }}
                isMobile={false}
                onClose={() => {}}
                onPreviewFileUrl={() => {}}
                documentsUploadedCount={0}
                uploadedFiles={[]}
                hasUploadedFiles={false}
                buildDescriptionItems={(value) => [value].filter(Boolean)}
                formatEventLabel={(value) => value}
                formatStatusLabel={(value) => value}
                activeTrackingInfo={{}}
                trackingAllowed={false}
                onOpenTracking={() => {}}
                refreshTrackingStatus={() => {}}
                apiBaseUrl="https://example.com"
                authToken="token"
            />,
        );

        expect(screen.getByLabelText(/assigned pilot trust/i)).toBeInTheDocument();
        expect(screen.getByText(/Nora Bridge/i)).toBeInTheDocument();
        expect(screen.getByText(/Trusted by clients/i)).toBeInTheDocument();
        expect(screen.getByText(/4.9 ★/i)).toBeInTheDocument();
        expect(screen.getByText(/Very smooth handoff\./i)).toBeInTheDocument();
    });

    test("disables inline call and chat when the errand is completed", () => {
        const refreshTrackingStatus = jest.fn();
        const onOpenTracking = jest.fn();

        render(
            <DetailsModal
                detailsModal={{
                    open: true,
                    errand: {
                        id: 42,
                        referenceNumber: "EB-42",
                        title: "Drop off parcel",
                        status: "completed",
                        pickupLocation: "Ikeja",
                        dropoffLocation: "Yaba",
                        sensitivity: "standard",
                        createdAt: "2026-01-01T10:00:00.000Z",
                        history: [],
                    },
                }}
                isMobile={false}
                onClose={() => { }}
                onPreviewFileUrl={() => { }}
                documentsUploadedCount={0}
                uploadedFiles={[]}
                hasUploadedFiles={false}
                buildDescriptionItems={(value) => [value].filter(Boolean)}
                formatEventLabel={(value) => value}
                formatStatusLabel={(value) => value}
                activeTrackingInfo={{ tracking_allowed: true, status: "completed" }}
                trackingAllowed={true}
                onOpenTracking={onOpenTracking}
                refreshTrackingStatus={refreshTrackingStatus}
                apiBaseUrl="https://example.com"
                authToken="token"
            />,
        );

        expect(
            screen.getByRole("button", { name: /call unavailable/i }).disabled,
        ).toBe(true);
        expect(
            screen.getByText(/chat and calling are disabled because this errand is already completed/i),
        ).toBeTruthy();
        expect(
            screen.getByText(/chat is unavailable because this errand is already completed/i),
        ).toBeTruthy();

        const updateTrackingButton = screen.getByRole("button", {
            name: /update tracking/i,
        });
        expect(updateTrackingButton).toBeDisabled();
        fireEvent.click(updateTrackingButton);
        expect(refreshTrackingStatus).not.toHaveBeenCalled();
        expect(
            screen.getByText(/tracking updates are disabled because this errand is already completed/i),
        ).toBeTruthy();

        const openTrackingButton = screen.getByRole("button", {
            name: /open live tracking/i,
        });
        expect(openTrackingButton).toBeDisabled();
        fireEvent.click(openTrackingButton);
        expect(onOpenTracking).not.toHaveBeenCalled();
        expect(
            screen.getByText(/live map is disabled because this errand is already completed/i),
        ).toBeTruthy();
    });

    test("shows only real history entries and cancelled status for cancelled errands", () => {
        render(
            <DetailsModal
                detailsModal={{
                    open: true,
                    errand: {
                        id: 77,
                        referenceNumber: "EB-77",
                        title: "Office pickup",
                        status: "cancelled",
                        pickupLocation: "Ikeja",
                        dropoffLocation: "Victoria Island",
                        sensitivity: "standard",
                        createdAt: "2026-04-10T09:00:00.000Z",
                        history: [
                            {
                                eventType: "created",
                                newStatus: "submitted",
                                createdAt: "2026-04-10T09:00:00.000Z",
                            },
                            {
                                eventType: "status_update",
                                newStatus: "completed",
                                synthetic: true,
                            },
                            {
                                eventType: "admin_cancelled",
                                oldStatus: "assigned",
                                newStatus: "cancelled",
                                createdAt: "2026-04-10T09:10:00.000Z",
                            },
                        ],
                    },
                }}
                isMobile={false}
                onClose={() => { }}
                onPreviewFileUrl={() => { }}
                documentsUploadedCount={0}
                uploadedFiles={[]}
                hasUploadedFiles={false}
                buildDescriptionItems={(value) => [value].filter(Boolean)}
                formatEventLabel={(value) => value}
                formatStatusLabel={(value) => value}
                activeTrackingInfo={{}}
                trackingAllowed={false}
                onOpenTracking={() => { }}
                refreshTrackingStatus={() => { }}
                apiBaseUrl="https://example.com"
                authToken="token"
            />,
        );

        expect(
            screen.getByText((_, node) =>
                Boolean(
                    node?.textContent?.replace(/\s+/g, " ").trim() === "Status: cancelled",
                ),
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/chat is unavailable because this errand is already cancelled/i),
        ).toBeInTheDocument();
        expect(screen.getAllByRole("listitem")).toHaveLength(2);
        expect(screen.queryByText(/timestamp unavailable/i)).not.toBeInTheDocument();
        expect(screen.getByText(/^completed$/i)).not.toHaveClass("is-active");
    });
});
