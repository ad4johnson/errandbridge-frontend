import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import PilotJobBoardEnhanced from "./PilotJobBoardEnhanced";

const makeJsonResponse = (payload, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => payload,
});

const countFetchCalls = (needle) =>
	global.fetch.mock.calls.filter(([url]) => String(url).includes(needle)).length;

describe("Pilot job board polling", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        window.localStorage.clear();
        window.sessionStorage.clear();
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
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
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
        window.localStorage.clear();
        window.sessionStorage.clear();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test("auto refresh waits for two minutes before polling again", async () => {
        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                />,
            );
        });

        await waitFor(() => {
            expect(countFetchCalls("/api/v1/pilots/available-jobs")).toBe(1);
        });

        await act(async () => {
            jest.advanceTimersByTime(119000);
        });
        expect(countFetchCalls("/api/v1/pilots/available-jobs")).toBe(1);

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(countFetchCalls("/api/v1/pilots/available-jobs")).toBe(2);
        });
    });

    test("accepting an errand calls onJobAccepted after the server confirms", async () => {
        const onJobAccepted = jest.fn();
        let resolveAcceptJob;

        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: 101,
                            title: "Test Errand",
                            status: "submitted",
                            pickup_location: "Ikeja",
                            dropoff_location: "Lekki",
                            distance_km: 2,
                            payment_amount_ngn_major: 5000,
                        },
                    ],
                });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    todayDeliveries: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            if (url.includes("/api/v1/pilots/accept-job")) {
                return new Promise((resolve) => {
                    resolveAcceptJob = resolve;
                });
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={onJobAccepted}
                    onLogout={jest.fn()}
                />,
            );
        });

        const title = await screen.findByText("Test Errand");
        const card = title.closest(".pilot-errand-card");
        expect(card).toBeTruthy();

        fireEvent.click(within(card).getByRole("button", { name: "Accept" }));
        fireEvent.click(
            await screen.findByRole("button", {
                name: /i understand, accept errand/i,
            }),
        );

        expect(onJobAccepted).not.toHaveBeenCalled();
        expect(resolveAcceptJob).toEqual(expect.any(Function));

        await act(async () => {
            resolveAcceptJob(
                makeJsonResponse({
                    ok: true,
                    errand: {
                        id: 101,
                        status: "accepted",
                        title: "Test Errand",
                        pickup_location: "Ikeja",
                        dropoff_location: "Lekki",
                        payment_amount_ngn_major: 5000,
                    },
                }),
            );
        });

        await waitFor(() => {
            expect(onJobAccepted).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
			expect(countFetchCalls("/api/v1/pilots/available-jobs")).toBeGreaterThan(1);
		});
    });

    test("failed accept keeps the user on the job board and shows an error", async () => {
        const onJobAccepted = jest.fn();

        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: 202,
                            title: "Blocked Errand",
                            status: "submitted",
                            pickup_location: "Yaba",
                            dropoff_location: "VI",
                            distance_km: 2,
                            payment_amount_ngn_major: 5000,
                        },
                    ],
                });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    todayDeliveries: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            if (url.includes("/api/v1/pilots/accept-job")) {
                return makeJsonResponse(
                    { detail: "You already have an active errand." },
                    false,
                    409,
                );
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={onJobAccepted}
                    onLogout={jest.fn()}
                />,
            );
        });

        const title = await screen.findByText("Blocked Errand");
        const card = title.closest(".pilot-errand-card");
        expect(card).toBeTruthy();

        fireEvent.click(within(card).getByRole("button", { name: "Accept" }));
        fireEvent.click(
            await screen.findByRole("button", {
                name: /i understand, accept errand/i,
            }),
        );

        await waitFor(() => {
            expect(onJobAccepted).not.toHaveBeenCalled();
        });
        expect(
            await screen.findByText(/you already have an active errand/i),
        ).toBeInTheDocument();
    });

    test("assigned errands are disabled when another active errand is already in progress", async () => {
        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    todayDeliveries: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "active-1",
                            title: "Current errand",
                                pilot_id: "pilot-1",
                            status: "in_progress",
                            pickup_location: "Ikeja",
                            dropoff_location: "Lekki",
                        },
                        {
                            id: "assigned-2",
                            title: "Assigned next",
                                pilot_id: "pilot-1",
                            status: "assigned",
                            pickup_location: "Yaba",
                            dropoff_location: "Victoria Island",
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

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                    screenMode="active"
                />,
            );
        });

        const acceptButton = await screen.findByRole("button", {
            name: /accept errand/i,
        });
        expect(acceptButton).toBeDisabled();
        expect(acceptButton).toHaveAttribute(
            "title",
            "Complete your current active errand first",
        );

        fireEvent.click(acceptButton);
        expect(
            global.fetch.mock.calls.some(([url]) =>
                String(url).includes("/api/v1/pilots/accept-job"),
            ),
        ).toBe(false);
    });

    test("active checklist expands per errand without opening every card", async () => {
        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    todayDeliveries: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "active-1",
                            title: "Airport transfer",
                            reference_number: "EB-101",
                                pilot_id: "pilot-1",
                            status: "in_progress",
                            pickup_location: "MMA",
                            dropoff_location: "Lekki",
                            description: "Meet guest at arrival\nConfirm luggage\nDrive to Lekki",
                            payment_amount_ngn_major: 10000,
                            distance_km: 5,
                        },
                        {
                            id: "active-2",
                            title: "Document run",
                            reference_number: "EB-102",
                                pilot_id: "pilot-1",
                            status: "accepted",
                            pickup_location: "Ikeja",
                            dropoff_location: "Yaba",
                            description: "Collect documents\nGet signature",
                            payment_amount_ngn_major: 8000,
                            distance_km: 3,
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

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                    screenMode="active"
                />,
            );
        });

        expect(await screen.findByText(/Airport transfer • EB-101/i)).toBeInTheDocument();
        expect(screen.getByText(/Meet guest at arrival • Confirm luggage • 1 more/i)).toBeInTheDocument();
        expect(screen.getByText(/Collect documents • Get signature/i)).toBeInTheDocument();
        expect(screen.queryByText(/^Drive to Lekki$/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Get signature$/i)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /View steps \(3\)/i }));

        expect(screen.getByRole("button", { name: /Hide steps/i })).toBeInTheDocument();
        expect(screen.getByText(/^Meet guest at arrival$/i)).toBeInTheDocument();
        expect(screen.getByText(/^Confirm luggage$/i)).toBeInTheDocument();
        expect(screen.getByText(/^Drive to Lekki$/i)).toBeInTheDocument();
        expect(screen.queryByText(/^Collect documents$/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Get signature$/i)).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /View steps \(2\)/i })).toBeInTheDocument();
    });

    test("active screen uses compact filters to segment queued and live errands", async () => {
        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 2,
                    todayDeliveries: 1,
                    earnings: 15000,
                    rating: 4.9,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "active-1",
                            title: "Current errand",
                            reference_number: "EB-201",
                                pilot_id: "pilot-1",
                            status: "in_progress",
                            pickup_location: "Ikeja",
                            dropoff_location: "Lekki",
                            description: "Handle live delivery",
                        },
                        {
                            id: "active-2",
                            title: "Assigned next",
                            reference_number: "EB-202",
                                pilot_id: "pilot-1",
                            status: "assigned",
                            pickup_location: "Yaba",
                            dropoff_location: "VI",
                            description: "Queued follow-up stop",
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

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                    screenMode="active"
                />,
            );
        });

        const activeQueue = document.querySelector(".active-errand-section--tabbed");
        if (!activeQueue) {
            throw new Error("Expected active errand section");
        }
        const queueQueries = within(activeQueue);

        expect(await screen.findByRole("heading", { name: /active errands/i })).toBeInTheDocument();
        expect(screen.getByText(/2 active right now/i)).toBeInTheDocument();
        expect(queueQueries.getByText(/Current errand/i)).toBeInTheDocument();
        expect(queueQueries.getByText(/Assigned next/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /open active filters/i }));

        expect(screen.getByRole("group", { name: /active errand filters/i })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /^live$/i }));

        await waitFor(() => {
            expect(screen.getByText(/1 active right now/i)).toBeInTheDocument();
            expect(queueQueries.getByText(/Current errand/i)).toBeInTheDocument();
            expect(queueQueries.queryByText(/Assigned next/i)).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: /^queued$/i }));

        await waitFor(() => {
            expect(queueQueries.getByText(/Assigned next/i)).toBeInTheDocument();
            expect(queueQueries.queryByText(/Current errand/i)).not.toBeInTheDocument();
        });
    });

    test("jobs controls render above the feed and show a loading state instead of dead space", async () => {
        let resolveAvailableJobs;
        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return new Promise((resolve) => {
                    resolveAvailableJobs = () => resolve(makeJsonResponse({ errands: [] }));
                });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    todayDeliveries: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                />,
            );
        });

        expect(screen.getByRole("heading", { name: /Available errands/i })).toBeInTheDocument();
        const loadingButton = screen.getByRole("button", { name: /Loading jobs/i });
        const filtersButton = screen.getByRole("button", { name: /^Open filters$/i });
        const searchInput = screen.getByPlaceholderText(
            /Search pickup, ending location, or errand title/i,
        );
        const searchShell = document.querySelector(".jobs-search-shell");
        const summaryStrip = document.querySelector(".jobs-summary-strip");
        const resultsRow = document.querySelector(".jobs-control-card__status-row--polished");
        const toolbar = document.querySelector(".jobs-control-card__toolbar");

        expect(loadingButton).toBeInTheDocument();
        expect(filtersButton).toBeInTheDocument();
        expect(searchInput).toBeInTheDocument();
        expect(screen.getByLabelText(/Jobs summary/i)).toBeInTheDocument();
        expect(screen.getByText(/Today earnings/i)).toBeInTheDocument();
        expect(screen.getByText(/pilot trust score/i)).toBeInTheDocument();
        expect(screen.getByText(/Checking nearby errands/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Loading errands/i)).toBeInTheDocument();
        expect(searchShell).not.toBeNull();
        expect(resultsRow).not.toBeNull();
        expect(toolbar).not.toBeNull();
        expect(summaryStrip).not.toBeNull();

        expect(searchShell.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(summaryStrip.compareDocumentPosition(filtersButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(resultsRow.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        await act(async () => {
            resolveAvailableJobs?.();
            await Promise.resolve();
        });
    });

    test("jobs feed shows a few errands first and expands on demand", async () => {
        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({
                    errands: [
                        { id: "job-1", title: "Errand 1", status: "submitted", pickup_location: "A", dropoff_location: "B", distance_km: 1, payment_amount_ngn_major: 5000 },
                        { id: "job-2", title: "Errand 2", status: "submitted", pickup_location: "A", dropoff_location: "B", distance_km: 1, payment_amount_ngn_major: 5000 },
                        { id: "job-3", title: "Errand 3", status: "submitted", pickup_location: "A", dropoff_location: "B", distance_km: 1, payment_amount_ngn_major: 5000 },
                        { id: "job-4", title: "Errand 4", status: "submitted", pickup_location: "A", dropoff_location: "B", distance_km: 1, payment_amount_ngn_major: 5000 },
                        { id: "job-5", title: "Errand 5", status: "submitted", pickup_location: "A", dropoff_location: "B", distance_km: 1, payment_amount_ngn_major: 5000 },
                    ],
                });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({ totalDeliveries: 0, todayDeliveries: 0, earnings: 0, rating: 4.8 });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                />,
            );
        });

        expect(await screen.findByText(/Errand 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Errand 2/i)).toBeInTheDocument();
        expect(screen.getByText(/Errand 3/i)).toBeInTheDocument();
        expect(screen.queryByText(/Errand 4/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Errand 5/i)).not.toBeInTheDocument();

        const expandButton = screen.getByRole("button", { name: /show more errands \(2\)/i });
        expect(expandButton).toHaveAttribute("aria-expanded", "false");

        fireEvent.click(expandButton);

        expect(await screen.findByText(/Errand 4/i)).toBeInTheDocument();
        expect(screen.getByText(/Errand 5/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /show fewer errands/i })).toHaveAttribute("aria-expanded", "true");

        fireEvent.click(screen.getByRole("button", { name: /show fewer errands/i }));

        await waitFor(() => {
            expect(screen.queryByText(/Errand 4/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Errand 5/i)).not.toBeInTheDocument();
        });
    });

     test("filters button switches to close filters when the panel is open", async () => {
        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    todayDeliveries: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                />,
            );
        });

        fireEvent.click(screen.getByRole("button", { name: /^Open filters$/i }));

        expect(screen.getByRole("button", { name: /^Close filters$/i })).toHaveAttribute("aria-expanded", "true");
    });

    test("accepting an errand does not keep the refresh button stuck in loading mode", async () => {
        let resolveAcceptJob;
        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "job-1",
                            title: "Airport pickup",
                            status: "pending",
                            pickup_location: "MMA",
                            dropoff_location: "Lekki",
                            payment_amount_ngn_major: 10000,
                            amount: 10000,
                            distance_km: 4,
                        },
                    ],
                });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    completedToday: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            if (url.includes("/api/v1/pilots/accept-job")) {
                return new Promise((resolve) => {
                    resolveAcceptJob = () => resolve(makeJsonResponse({ errand: { id: "job-1", status: "accepted" } }));
                });
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online", pilot_availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                />,
            );
        });

        const refreshButton = await screen.findByRole("button", { name: /refresh jobs/i });
        const airportCard = (await screen.findByText(/Airport pickup/i)).closest(".pilot-errand-card");
        if (!airportCard) {
            throw new Error("Expected airport pickup card");
        }
        fireEvent.click(within(airportCard).getByRole("button", { name: /^Accept$/i }));

        expect(await screen.findByRole("dialog", { name: /acceptance warning/i })).toBeInTheDocument();
        expect(
            global.fetch.mock.calls.some(([url]) =>
                String(url).includes("/api/v1/pilots/accept-job"),
            ),
        ).toBe(false);

        fireEvent.click(screen.getByRole("button", { name: /i understand, accept errand/i }));

        expect(screen.getByRole("button", { name: /refresh jobs/i })).toBeEnabled();
        expect(refreshButton).toHaveTextContent(/refresh/i);
        expect(screen.queryByRole("button", { name: /loading jobs/i })).not.toBeInTheDocument();

        await act(async () => {
            resolveAcceptJob?.();
            await Promise.resolve();
        });

		await waitFor(() => {
			expect(countFetchCalls("/api/v1/pilots/available-jobs")).toBeGreaterThan(1);
		});
    });

    test("dedicated assigned errands remain actionable beyond the open-pool radius", async () => {
        let resolveAcceptJob;

        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "dedicated-1",
                            title: "Dedicated out-of-area run",
                            status: "assigned",
                            pilot_id: "pilot-1",
                            pickup_location: "Bodija, Ibadan",
                            dropoff_location: "UI, Ibadan",
                            payment_amount_ngn_major: 14000,
                            amount: 14000,
                            distance_km: 24,
                        },
                    ],
                });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    completedToday: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            if (url.includes("/api/v1/pilots/accept-job")) {
                return new Promise((resolve) => {
                    resolveAcceptJob = () =>
                        resolve(
                            makeJsonResponse({
                                errand: {
                                    id: "dedicated-1",
                                    title: "Dedicated out-of-area run",
                                    status: "accepted",
                                    pickup_location: "Bodija, Ibadan",
                                    dropoff_location: "UI, Ibadan",
                                },
                            }),
                        );
                });
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online", pilot_availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                />,
            );
        });

        const dedicatedCard = (await screen.findByText(/Dedicated out-of-area run/i)).closest(".pilot-errand-card");
        if (!dedicatedCard) {
            throw new Error("Expected dedicated assigned errand card");
        }

        fireEvent.click(within(dedicatedCard).getByRole("button", { name: /view details/i }));

        const modalAcceptButton = await screen.findByRole("button", { name: /accept errand/i });
        expect(modalAcceptButton).toBeEnabled();

        fireEvent.click(modalAcceptButton);
        expect(await screen.findByRole("dialog", { name: /acceptance warning/i })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /i understand, accept errand/i }));

        await act(async () => {
            resolveAcceptJob?.();
            await Promise.resolve();
        });

		await waitFor(() => {
			expect(countFetchCalls("/api/v1/pilots/available-jobs")).toBeGreaterThan(1);
		});
    });

     test("visible out-of-radius jobs explain why pilots can see but not accept them", async () => {
        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "job-visibility-1",
                            title: "Far pickup",
                            status: "pending",
                            pickup_location: "Ikorodu, Lagos",
                            dropoff_location: "Badagry, Lagos",
                            distance_km: 16,
                            payment_amount_ngn_major: 10000,
                            matches_dispatch_policy: false,
                            acceptance_block_reason: "Errand is outside the 5 mile radius",
                        },
                    ],
                    dispatch_policy: {
                        show_all_jobs_to_pilots: true,
                        open_pool_radius_miles: 5,
                        allowed_open_pool_radius_miles: [5, 10, 15, 20],
                    },
                });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    completedToday: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online", pilot_availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                />,
            );
        });

        const card = (await screen.findByText(/Far pickup/i)).closest(".pilot-errand-card");
        if (!card) {
            throw new Error("Expected out-of-radius errand card");
        }

        expect(within(card).getByRole("button", { name: /view details/i })).toBeEnabled();
        expect(within(card).getByRole("button", { name: /^accept$/i })).toBeDisabled();
        expect(
            within(card).getByText(/you can still see this errand, but only pilots inside the 5 mile dispatch radius/i),
        ).toBeInTheDocument();
    });

    test("accepting from errand details opens the warning overlay before the network call", async () => {
        let resolveAcceptJob;

        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "job-modal-1",
                            title: "VIP parcel",
                            status: "pending",
                            pickup_location: "Ikoyi",
                            dropoff_location: "Lekki",
                            payment_amount_ngn_major: 9000,
                            amount: 9000,
                            distance_km: 3.2,
                        },
                    ],
                });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    completedToday: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            if (url.includes("/api/v1/pilots/accept-job")) {
                return new Promise((resolve) => {
                    resolveAcceptJob = () => resolve(makeJsonResponse({ errand: { id: "job-modal-1", status: "accepted" } }));
                });
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online", pilot_availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                />,
            );
        });

        const jobCard = (await screen.findByText(/VIP parcel/i)).closest(".pilot-errand-card");
        if (!jobCard) {
            throw new Error("Expected VIP parcel card");
        }

        fireEvent.click(within(jobCard).getByRole("button", { name: /view details/i }));
        fireEvent.click(await screen.findByRole("button", { name: /accept errand/i }));

        expect(await screen.findByRole("dialog", { name: /acceptance warning/i })).toBeInTheDocument();
        expect(
            global.fetch.mock.calls.some(([url]) =>
                String(url).includes("/api/v1/pilots/accept-job"),
            ),
        ).toBe(false);

        fireEvent.click(screen.getByRole("button", { name: /i understand, accept errand/i }));

        await act(async () => {
            resolveAcceptJob?.();
            await Promise.resolve();
        });

		await waitFor(() => {
			expect(countFetchCalls("/api/v1/pilots/available-jobs")).toBeGreaterThan(1);
		});
    });

    test("accepting an assigned errand requires warning confirmation before the active-job handoff", async () => {
        let resolveAcceptJob;
        const onJobAccepted = jest.fn();

        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    todayDeliveries: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "assigned-now",
                            title: "Assigned airport run",
                            status: "assigned",
                            pilot_id: "pilot-1",
                            pickup_location: "MMA",
                            dropoff_location: "Lekki",
                            reference_number: "EB-300",
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
            if (url.includes("/api/v1/pilots/accept-job")) {
                return new Promise((resolve) => {
                    resolveAcceptJob = () =>
                        resolve(
                            makeJsonResponse({
                                errand: {
                                    id: "assigned-now",
                                    title: "Assigned airport run",
                                    status: "accepted",
                                    pickup_location: "MMA",
                                    dropoff_location: "Lekki",
                                    reference_number: "EB-300",
                                },
                            }),
                        );
                });
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online", pilot_availability: "online" }}
                    onJobAccepted={onJobAccepted}
                    onLogout={jest.fn()}
                    screenMode="active"
                />,
            );
        });

        fireEvent.click(await screen.findByRole("button", { name: /accept errand/i }));

        expect(await screen.findByRole("dialog", { name: /acceptance warning/i })).toBeInTheDocument();
        expect(onJobAccepted).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: /i understand, accept errand/i }));
        expect(onJobAccepted).not.toHaveBeenCalled();

        await act(async () => {
            resolveAcceptJob?.();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(onJobAccepted).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: "assigned-now",
                    title: "Assigned airport run",
                }),
            );
        });
		await waitFor(() => {
			expect(countFetchCalls("/api/v1/pilots/jobs?status=active")).toBeGreaterThan(1);
		});
    });

	 test("job cards show the exact pilot potential payout in naira", async () => {
        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "job-1",
                            title: "Airport pickup",
                            status: "pending",
                            pickup_location: "MMA",
                            dropoff_location: "Lekki",
                            payment_amount_ngn_major: 10000,
                            amount: 10000,
                            distance_km: 4.5,
                        },
                    ],
                });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    completedToday: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
					user={{ id: "pilot-1", availability: "online", pilot_availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                />,
            );
        });

		expect(
			await screen.findByText((content) => content.includes("₦7,000 potential payout")),
		).toBeInTheDocument();
        expect(screen.queryByText(/platform fee applied/i)).not.toBeInTheDocument();
    });

    test("completed errands archive stays fully hidden until expanded", async () => {
        const completedErrands = Array.from({ length: 10 }, (_, index) => ({
            id: `completed-${index + 1}`,
            title: `Completed errand ${index + 1}`,
            status: "completed",
			pilot_id: "pilot-1",
            pickup_location: `Pickup ${index + 1}`,
            dropoff_location: `Dropoff ${index + 1}`,
            completed_at: `2026-04-${String((index % 9) + 1).padStart(2, "0")}T10:00:00.000Z`,
            amount: 1000,
        }));

        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: completedErrands.length,
                    completedToday: 1,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/jobs?status=completed")) {
                return makeJsonResponse({ errands: completedErrands });
            }
            if (url.includes("/api/v1/pilots/availability-history")) {
                return makeJsonResponse([]);
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                    screenMode="active"
                />,
            );
        });

        const archiveSection = await screen.findByRole("heading", { name: /Completed Errands/i });
        const archiveContainer = archiveSection.closest(".archive-section");
        if (!archiveContainer) {
            throw new Error("Expected completed errands archive section");
        }

        expect(within(archiveContainer).getByText(/All 10 completed errands are hidden\. Expand to view all\./i)).toBeInTheDocument();
        expect(within(archiveContainer).queryByText(/^Completed errand 1$/i)).not.toBeInTheDocument();
        expect(within(archiveContainer).queryByText(/^Completed errand 6$/i)).not.toBeInTheDocument();

        fireEvent.click(within(archiveContainer).getByRole("button", { name: /Show all \(10\)/i }));

        expect(within(archiveContainer).getByRole("button", { name: /Collapse/i })).toHaveAttribute("aria-expanded", "true");
        expect(within(archiveContainer).queryByText(/All 10 completed errands are hidden\. Expand to view all\./i)).not.toBeInTheDocument();
        expect(within(archiveContainer).getByText(/^Completed errand 1$/i)).toBeInTheDocument();
        expect(within(archiveContainer).getByText(/^Completed errand 10$/i)).toBeInTheDocument();
        expect(within(archiveContainer).getAllByText(/pilot payout/i).length).toBeGreaterThan(0);
        expect(
            within(archiveContainer).getAllByText(/^Completed\s+\d{1,2}\/\d{1,2}\/\d{4}$/i).length,
        ).toBeGreaterThan(0);

        fireEvent.click(within(archiveContainer).getByRole("button", { name: /Collapse/i }));

        expect(within(archiveContainer).getByRole("button", { name: /Show all \(10\)/i })).toHaveAttribute("aria-expanded", "false");
        expect(within(archiveContainer).getByText(/All 10 completed errands are hidden\. Expand to view all\./i)).toBeInTheDocument();
        expect(within(archiveContainer).queryByText(/^Completed errand 1$/i)).not.toBeInTheDocument();
        expect(within(archiveContainer).queryByText(/^Completed errand 10$/i)).not.toBeInTheDocument();
    });

    test("help sheet renders visible issue chips and updates the selected reason", async () => {
        global.fetch.mockImplementation(async (input) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    completedToday: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "active-help-1",
                            title: "Airport transfer",
                            reference_number: "EB-201",
                            status: "in_progress",
							pilot_id: "pilot-1",
                            pickup_location: "MMA",
                            dropoff_location: "Lekki",
                            description: "Meet customer",
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

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                    screenMode="active"
                />,
            );
        });

        fireEvent.click(await screen.findByRole("button", { name: /need help with this errand\?/i }));

        const reasonGroup = await screen.findByRole("group", { name: /issue type/i });
        expect(within(reasonGroup).getByRole("button", { name: /^Delay$/i })).toHaveAttribute("aria-pressed", "true");
        expect(within(reasonGroup).getByRole("button", { name: /Vehicle issue/i })).toBeInTheDocument();
        expect(within(reasonGroup).getByRole("button", { name: /Wrong assignment/i })).toBeInTheDocument();
        expect(within(reasonGroup).getByRole("button", { name: /Customer issue/i })).toBeInTheDocument();
        expect(within(reasonGroup).getByRole("button", { name: /Safety concern/i })).toBeInTheDocument();

        fireEvent.click(within(reasonGroup).getByRole("button", { name: /Vehicle issue/i }));

        expect(within(reasonGroup).getByRole("button", { name: /^Delay$/i })).toHaveAttribute("aria-pressed", "false");
        expect(within(reasonGroup).getByRole("button", { name: /Vehicle issue/i })).toHaveAttribute("aria-pressed", "true");
    });

    test("help sheet submits the selected issue chip as the incident type", async () => {
        global.fetch.mockImplementation(async (input, init = {}) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/api/v1/pilots/available-jobs")) {
                return makeJsonResponse({ errands: [] });
            }
            if (url.includes("/api/v1/pilots/stats")) {
                return makeJsonResponse({
                    totalDeliveries: 0,
                    completedToday: 0,
                    earnings: 0,
                    rating: 4.8,
                });
            }
            if (url.includes("/api/v1/pilots/jobs?status=active")) {
                return makeJsonResponse({
                    errands: [
                        {
                            id: "active-help-2",
                            title: "Document run",
                            reference_number: "EB-202",
                            status: "in_progress",
							pilot_id: "pilot-1",
                            pickup_location: "Ikeja",
                            dropoff_location: "Yaba",
                            description: "Collect documents",
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
            if (url.includes("/api/v1/incidents/report")) {
                return makeJsonResponse({ incident_id: 77, request: init?.body ? JSON.parse(init.body) : null });
            }
            return makeJsonResponse({});
        });

        await act(async () => {
            render(
                <PilotJobBoardEnhanced
                    apiBaseUrl="https://api.example.com"
                    token="pilot-token"
                    user={{ id: "pilot-1", availability: "online" }}
                    onJobAccepted={jest.fn()}
                    onLogout={jest.fn()}
                    screenMode="active"
                />,
            );
        });

        fireEvent.click(await screen.findByRole("button", { name: /need help with this errand\?/i }));

        const reasonGroup = await screen.findByRole("group", { name: /issue type/i });
        fireEvent.click(within(reasonGroup).getByRole("button", { name: /Safety concern/i }));
        fireEvent.change(screen.getByLabelText(/tell admin what happened/i), {
            target: { value: "Customer escalated the situation and I need support." },
        });
        const helpDialog = screen.getByRole("dialog", { name: /errand help and support/i });

        await act(async () => {
            fireEvent.click(within(helpDialog).getByRole("button", { name: /report issue/i }));
        });

        const incidentCall = global.fetch.mock.calls.find(([url]) =>
            String(url).includes("/api/v1/incidents/report"),
        );
        expect(incidentCall).toBeTruthy();
        expect(JSON.parse(incidentCall[1].body)).toMatchObject({
            errand_id: "active-help-2",
            incident_type: "safety",
            description: "Customer escalated the situation and I need support.",
        });
    });
});
