import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PilotDashboard from "./PilotDashboard";

const pilotJobBoardPropsHistory = [];

jest.mock("./PilotJobBoardEnhanced", () => (props) => {
    pilotJobBoardPropsHistory.push(props);
    return (
        <div data-testid="pilot-job-board">
            Pilot job board
            <div
                data-testid="pilot-job-board-scroll-shell"
                style={{ maxHeight: 180, overflowY: "auto" }}
            >
                <div style={{ height: 640 }}>Scrollable jobs feed</div>
            </div>
            <button
                type="button"
                onClick={() =>
                    props.onJobAccepted?.({
                        id: "mock-errand-1",
                        title: "Accepted test errand",
                        pickup_location: "Ikeja",
                        dropoff_location: "Yaba",
                        _acceptedByPilotId:
                            props.user?.pilot_id || props.user?.pilotId || props.user?.id,
                    })
                }
            >
                Mock accept job
            </button>
        </div>
    );
});

jest.mock("./PilotProfileSettings", () => (props) => (
    <div data-testid="pilot-profile-settings">
        Pilot profile settings
        <button type="button" onClick={() => props.onSave?.({ first_name: "Updated" })}>
            Save mocked settings
        </button>
    </div>
));

jest.mock("./PilotDeliveryScreen", () => () => (
    <div data-testid="pilot-delivery-screen">Pilot delivery screen</div>
));

const makeJsonResponse = (payload, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => payload,
});

const setGlobalScrollTop = (value) => {
    Object.defineProperty(window, "scrollY", {
        configurable: true,
        value,
        writable: true,
    });
    Object.defineProperty(window, "pageYOffset", {
        configurable: true,
        value,
        writable: true,
    });
    Object.defineProperty(document.documentElement, "scrollTop", {
        configurable: true,
        value,
        writable: true,
    });
    Object.defineProperty(document.body, "scrollTop", {
        configurable: true,
        value,
        writable: true,
    });
};

describe("Pilot dashboard regressions", () => {
    let originalLocation;
    let reloadSpy;

    beforeEach(() => {
        pilotJobBoardPropsHistory.length = 0;
        setGlobalScrollTop(0);

        jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 3,
                    completedToday: 1,
                    earnings: 12000,
                    rating: 4.9,
                });
            }
            if (url.includes("/api/v1/pilots/profile")) {
                return makeJsonResponse({
                    id: "pilot-1",
                    first_name: "Ada",
                    last_name: "Pilot",
                    email: "pilot@example.com",
                });
            }
            if (url.includes("/api/v1/pilots/documents")) {
                return makeJsonResponse({ documents: [{ id: "doc-1" }] });
            }
            if (url.includes("/api/v1/pilots/availability")) {
                const body = JSON.parse(String(init?.body || "{}"));
                return makeJsonResponse({
                    availability: body.availability || "offline",
                    admin_dispatch_status: "enabled",
                    can_accept_jobs: body.availability === "online",
                    dispatch_block_reason:
                        body.availability === "online" ? "" : "Go online to accept new errands.",
                    admin_dispatch_note: "",
                });
            }
            return makeJsonResponse({});
        });

        reloadSpy = jest.fn();
        originalLocation = window.location;
        delete window.location;
        window.location = {
            ...originalLocation,
            reload: reloadSpy,
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
        window.location = originalLocation;
    });

    test("clicking the EB logo refreshes the pilot page", async () => {
        const user =
            typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada" }}
                onLogout={jest.fn()}
            />,
        );

        const refreshButton = await screen.findByRole("button", {
            name: /refresh pilot page/i,
        });
        await user.click(refreshButton);

        expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    test("accepting a job switches the pilot straight into the active errand screen", async () => {
        const user =
            typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada" }}
                onLogout={jest.fn()}
            />,
        );

        await user.click(await screen.findByRole("button", { name: /mock accept job/i }));

        expect(await screen.findByTestId("pilot-delivery-screen")).toBeInTheDocument();
    });

    test("accepting a job keeps the pilot in the active errand screen when user.id differs from pilot_id", async () => {
        const user =
            typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "user-9", pilot_id: "pilot-1", first_name: "Ada" }}
                onLogout={jest.fn()}
            />,
        );

        await user.click(
            await screen.findByRole("button", { name: /mock accept job/i }),
        );

        expect(await screen.findByTestId("pilot-delivery-screen")).toBeInTheDocument();
    });

    test("saving settings keeps the modal open until it is manually closed", async () => {
        const user =
            typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada" }}
                onLogout={jest.fn()}
            />,
        );

		await user.click(
			await screen.findByRole("button", { name: /open pilot profile and trust/i }),
		);
		await user.click(screen.getByRole("button", { name: /open settings/i }));

        expect(screen.getByTestId("pilot-profile-settings")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /save mocked settings/i }));

        await waitFor(() => {
            expect(screen.getByTestId("pilot-profile-settings")).toBeInTheDocument();
        });
    });

    test("keeps the job acceptance callback stable across dashboard rerenders", async () => {
        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada" }}
                onLogout={jest.fn()}
            />,
        );

        await waitFor(() => {
            expect(pilotJobBoardPropsHistory.length).toBeGreaterThan(1);
        });

        const callbackRefs = pilotJobBoardPropsHistory
            .map((props) => props.onJobAccepted)
            .filter(Boolean);

        expect(new Set(callbackRefs).size).toBe(1);
    });

    test("shows the trust-focused header and opens the profile sheet from the header avatar", async () => {
        const user =
            typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada", last_name: "Pilot" }}
                onLogout={jest.fn()}
            />,
        );

        expect((await screen.findAllByText(/trust score/i)).length).toBeGreaterThan(0);
        expect(screen.getByText(/profile ready/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(
                screen.getByText(/assigned 0 · completed 3 · trust 4\.9★/i),
            ).toBeInTheDocument();
        });

        await user.click(
            screen.getByRole("button", { name: /open pilot profile and trust/i }),
        );

        expect(screen.getByRole("dialog", { name: /pilot profile/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /open settings/i })).toBeInTheDocument();
    });

    test("places the brand and avatar row above the identity copy", async () => {
        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada", last_name: "Pilot" }}
                onLogout={jest.fn()}
            />,
        );

        const refreshButton = await screen.findByRole("button", {
            name: /refresh pilot page/i,
        });
        const profileButton = screen.getByRole("button", {
            name: /open pilot profile and trust/i,
        });
        const title = screen.getByRole("heading", { name: /ada/i });

        expect(
            refreshButton.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(
            profileButton.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    test("switches the work header into compact mode after a jobs-page scroll", async () => {
        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada", last_name: "Pilot" }}
                onLogout={jest.fn()}
            />,
        );

        const header = (await screen.findByRole("heading", { name: /^Ada/i })).closest("header");
        const headerCopy = document.querySelector(".pilot-work-header__copy");

        expect(header).not.toBeNull();
        expect(headerCopy).not.toBeNull();
        expect(header).toHaveAttribute("data-collapsed", "false");
        expect(header).toHaveAttribute("data-header-mode", "full");
        expect(headerCopy).toHaveAttribute("aria-hidden", "false");

        setGlobalScrollTop(120);
        fireEvent.scroll(window);

        await waitFor(() => {
            expect(header).toHaveAttribute("data-collapsed", "true");
            expect(header).toHaveAttribute("data-header-mode", "compact");
            expect(headerCopy).toHaveAttribute("aria-hidden", "true");
        });
    });

        test("does not compact the work header from nested overflow scroll containers", async () => {
            render(
                <PilotDashboard
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", first_name: "Ada", last_name: "Pilot" }}
                    onLogout={jest.fn()}
                />,
            );

            const header = (await screen.findByRole("heading", { name: /^Ada/i })).closest("header");
            const nestedScrollShell = screen.getByTestId("pilot-job-board-scroll-shell");

            expect(header).not.toBeNull();
            expect(header).toHaveAttribute("data-header-mode", "full");

            // The nested scroller is real (scrollHeight > clientHeight) but it isn't
            // the primary page scroller, so it should not collapse the sticky header.
            Object.defineProperty(nestedScrollShell, "clientHeight", {
                configurable: true,
                value: 180,
            });
            Object.defineProperty(nestedScrollShell, "scrollHeight", {
                configurable: true,
                value: 640,
            });
            Object.defineProperty(nestedScrollShell, "scrollTop", {
                configurable: true,
                value: 140,
                writable: true,
            });
            fireEvent.scroll(nestedScrollShell);

            await waitFor(() => {
                expect(header).toHaveAttribute("data-header-mode", "full");
                expect(header).toHaveAttribute("data-collapsed", "false");
            });
        });

        test("compacts the work header when the primary page scroller is a nested container", async () => {
            render(
                <PilotDashboard
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", first_name: "Ada", last_name: "Pilot" }}
                    onLogout={jest.fn()}
                />,
            );

            const header = (await screen.findByRole("heading", { name: /^Ada/i })).closest("header");
            if (!header) {
                throw new Error("Expected pilot work header");
            }

            const dashboardRoot = document.querySelector(".pilot-dashboard");
            if (!dashboardRoot) {
                throw new Error("Expected pilot dashboard root");
            }

            Object.defineProperty(window, "innerHeight", {
                configurable: true,
                value: 800,
            });

            const pageScroller = document.createElement("div");
            pageScroller.setAttribute("data-testid", "pilot-primary-scroll-container");
            dashboardRoot.appendChild(pageScroller);

            Object.defineProperty(pageScroller, "clientHeight", {
                configurable: true,
                value: 760,
            });
            Object.defineProperty(pageScroller, "scrollHeight", {
                configurable: true,
                value: 1400,
            });
            Object.defineProperty(pageScroller, "scrollTop", {
                configurable: true,
                value: 140,
                writable: true,
            });

            fireEvent.scroll(pageScroller);

            await waitFor(() => {
                expect(header).toHaveAttribute("data-header-mode", "compact");
                expect(header).toHaveAttribute("data-collapsed", "true");
            });
        });

    test("uses hysteresis so the work header does not flicker around the jobs threshold", async () => {
        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada", last_name: "Pilot" }}
                onLogout={jest.fn()}
            />,
        );

        const header = (await screen.findByRole("heading", { name: /^Ada/i })).closest("header");
        if (!header) {
            throw new Error("Expected pilot work header");
        }

        setGlobalScrollTop(120);
        fireEvent.scroll(window);

        await waitFor(() => {
            expect(header).toHaveAttribute("data-header-mode", "compact");
        });

        setGlobalScrollTop(82);
        fireEvent.scroll(window);

        await waitFor(() => {
            expect(header).toHaveAttribute("data-header-mode", "compact");
        });

        setGlobalScrollTop(68);
        fireEvent.scroll(window);

        await waitFor(() => {
            expect(header).toHaveAttribute("data-header-mode", "full");
            expect(header).toHaveAttribute("data-collapsed", "false");
        });
    });

    test("keeps jobs header full at smaller scroll amounts that compact operational tabs", async () => {
        const user =
            typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada", last_name: "Pilot" }}
                onLogout={jest.fn()}
            />,
        );

        const header = (await screen.findByRole("heading", { name: /^Ada/i })).closest("header");
        if (!header) {
            throw new Error("Expected pilot work header");
        }

        setGlobalScrollTop(64);
        fireEvent.scroll(window);

        await waitFor(() => {
            expect(header).toHaveAttribute("data-header-mode", "full");
            expect(header).toHaveAttribute("data-collapsed", "false");
        });

        await user.click(screen.getByRole("button", { name: /^Active$/i }));
		fireEvent.scroll(window);

        await waitFor(() => {
            expect(header).toHaveAttribute("data-header-mode", "compact");
            expect(header).toHaveAttribute("data-collapsed", "true");
        });
    });

    test("waits longer before compacting on the profile tab", async () => {
        const user =
            typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada", last_name: "Pilot" }}
                onLogout={jest.fn()}
            />,
        );

        const header = (await screen.findByRole("heading", { name: /^Ada/i })).closest("header");
        if (!header) {
            throw new Error("Expected pilot work header");
        }

        await user.click(screen.getByRole("button", { name: /^Profile$/i }));

        setGlobalScrollTop(96);
        fireEvent.scroll(window);

        await waitFor(() => {
            expect(header).toHaveAttribute("data-header-mode", "full");
        });

        setGlobalScrollTop(160);
        fireEvent.scroll(window);

        await waitFor(() => {
            expect(header).toHaveAttribute("data-header-mode", "compact");
        });
    });

    test("uses a single availability switch and toggles pilot availability", async () => {
        const user =
            typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{
                    id: "pilot-1",
                    first_name: "Ada",
                    availability: "online",
                    admin_dispatch_status: "enabled",
                }}
                onLogout={jest.fn()}
            />,
        );

        const availabilitySwitch = await screen.findByRole("switch", {
            name: /pilot availability/i,
        });
        expect(availabilitySwitch).toHaveAttribute("aria-checked", "true");
        expect(screen.queryByRole("button", { name: /go offline/i })).not.toBeInTheDocument();

        await user.click(availabilitySwitch);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/v1/pilots/availability"),
                expect.objectContaining({
                    method: "PUT",
                    body: JSON.stringify({ availability: "offline" }),
                }),
            );
            expect(availabilitySwitch).toHaveAttribute("aria-checked", "false");
        });
    });
});

describe("Pilot dashboard approval alerts", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        window.localStorage.clear();
        window.sessionStorage.clear();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test("polling pilot documents emits a toast when a document is approved", async () => {
        let docsCallCount = 0;
        const dispatchSpy = jest.spyOn(window, "dispatchEvent");

        jest.spyOn(global, "fetch").mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    completedToday: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/profile")) {
                return makeJsonResponse({
                    id: "pilot-1",
                    first_name: "Ada",
                    last_name: "Pilot",
                    email: "pilot@example.com",
                });
            }
            if (url.includes("/api/v1/pilots/documents")) {
                docsCallCount += 1;
                return makeJsonResponse({
                    documents: [
                        {
                            id: "doc-1",
                            document_type: "id_document",
                            status: docsCallCount === 1 ? "pending" : "approved",
                        },
                    ],
                });
            }
            return makeJsonResponse({});
        });

        render(
            <PilotDashboard
                apiBaseUrl="https://api.example.com"
                token="pilot-token"
                user={{ id: "pilot-1", first_name: "Ada" }}
                onLogout={jest.fn()}
            />,
        );

        // Allow initial fetches to resolve.
        await act(async () => {
            await Promise.resolve();
        });

        // Advance the 20s polling interval.
        await act(async () => {
            jest.advanceTimersByTime(20000);
        });

        await waitFor(() => {
            const toastEvents = dispatchSpy.mock.calls
                .map((call) => call?.[0])
                .filter((evt) => evt && evt.type === "eb:toast");
            expect(
                toastEvents.some(
                    (evt) =>
                        evt?.detail?.type === "success" &&
                        String(evt?.detail?.message || "").toLowerCase().includes("approved"),
                ),
            ).toBe(true);
        });
    });
});
