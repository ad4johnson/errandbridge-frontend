import "@testing-library/jest-dom";

import { render, screen, within } from "@testing-library/react";
import ClientDashboardV2 from "./ClientDashboardV2";

jest.mock("framer-motion", () => {
    const React = require("react");
    const actual = jest.requireActual("framer-motion");
    return {
        ...actual,
        AnimatePresence: actual.AnimatePresence,
        motion: actual.motion,
        MotionConfig: ({ reducedMotion, children }) =>
            React.createElement(
                "div",
                {
                    "data-testid": "motion-config",
                    "data-reduced-motion": reducedMotion,
                },
                children,
            ),
    };
});

function buildBaseProps(overrides = {}) {
    const noop = () => {};
    return {
        mode: "create",
        onOpenCreate: noop,
        onOpenErrands: noop,
        isMobile: false,
        estimatedTotalLabel: "-",
        regionKey: "uk",
        onRegionChange: noop,
        serviceKey: null,
        onServiceChange: noop,
        templateName: "",
        onTemplateSelect: noop,
        tierKey: "standard",
        onTierChange: noop,
        pricesByLane: {},
        selectedFiles: [],
        onSelectedFilesChange: noop,
        onRemoveSelectedFile: noop,
        accessNotes: "",
        onAccessNotesChange: noop,
        title: "",
        onTitleChange: noop,
        note: "",
        onNoteChange: noop,
        pickup: "",
        onPickupChange: noop,
        dropoff: "",
        onDropoffChange: noop,
        scheduleType: "now",
        scheduleSummary: "",
        onClearSchedule: noop,
        onOpenSchedule: noop,
        onOpenPayment: noop,
        errands: [],
        onOpenErrand: noop,
        ...overrides,
    };
}

test("archive shows hidden message when collapsed", () => {
    const archivedErrand = {
        id: "arch-1",
        title: "Completed delivery",
        pickupLocation: "Warehouse",
        status: "archived",
    };

    render(
        <ClientDashboardV2
            {...buildBaseProps({
                mode: "errands",
                errands: [archivedErrand],
            })}
        />,
    );

    expect(screen.getByText(/^Archive$/i)).toBeInTheDocument();
    expect(screen.getByText(/archived errands are hidden/i)).toBeInTheDocument();
    expect(screen.queryByText(/^No archived errands\.$/i)).not.toBeInTheDocument();
});

test("archive shows empty message when there are no archived errands", () => {
    render(
        <ClientDashboardV2
            {...buildBaseProps({
                mode: "errands",
                errands: [],
            })}
        />,
    );

    expect(screen.getByText(/^No archived errands\.$/i)).toBeInTheDocument();
    expect(screen.queryByText(/archived errands are hidden/i)).not.toBeInTheDocument();
});

test("create flow hides the local Toxi assist cards so only the main assistant remains", () => {
    render(
        <ClientDashboardV2
            {...buildBaseProps({
                mode: "create",
                toxiEnabled: true,
            })}
        />,
    );

    expect(document.querySelector(".eb-clientv2__toxi--mini")).toBeNull();
    expect(document.querySelector(".eb-clientv2__toxi--inline")).toBeNull();
    expect(screen.queryByText(/t\s*oxi assist/i)).not.toBeInTheDocument();
});

test("mobile errands dashboard forces reduced motion mode", () => {
    render(
        <ClientDashboardV2
            {...buildBaseProps({
                mode: "errands",
                isMobile: true,
                errands: [
                    {
                        id: "live-1",
                        title: "Airport pickup",
                        pickupLocation: "Ikeja",
                        status: "in_progress",
                    },
                ],
            })}
        />,
    );

    expect(screen.getByTestId("motion-config")).toHaveAttribute("data-reduced-motion", "always");
    expect(screen.getByRole("textbox", { name: /search errands/i })).toBeInTheDocument();
});

test("desktop errands dashboard auto-selects the first errand for a stable preview", () => {
    render(
        <ClientDashboardV2
            {...buildBaseProps({
                mode: "errands",
                errands: [
                    {
                        id: "live-1",
                        title: "Airport pickup",
                        pickupLocation: "Ikeja Terminal 2",
                        status: "in_progress",
                        referenceNumber: "EB-1001",
                    },
                    {
                        id: "live-2",
                        title: "Document handoff",
                        pickupLocation: "Victoria Island",
                        status: "submitted",
                    },
                ],
            })}
        />,
    );

    const previewPane = document.querySelector(".eb-clientv2__errandsRight .eb-clientv2__preview");

    expect(screen.getByText(/selected errand/i)).toBeInTheDocument();
    expect(previewPane).toBeTruthy();
    expect(within(previewPane).getByText(/^Airport pickup$/i)).toBeInTheDocument();
    expect(screen.queryByText(/select an errand/i)).not.toBeInTheDocument();
});
