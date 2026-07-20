import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdminDashboardModal, {
	buildAdminErrandQueue,
	formatAdminErrandQueueNumber,
	getAdminIssueDisplay,
	getSuggestedPilotForErrand,
	groupAdminAttachmentsByOwner,
	rankPilotsForErrandAssignment,
} from "./AdminDashboardModal";

const buildProps = (overrides = {}) => ({
	open: true,
	onClose: () => undefined,
	state: {
		adminTab: "customers",
		adminLoading: false,
		adminCustomerSearch: "",
		adminCustomerFilter: "all",
		adminCustomers: [],
		adminSelectedCustomerIds: [],
		adminCustomerCardId: null,
		adminErrandsList: [],
		adminPilots: [],
		adminPilotAssignments: {},
		adminArchivedErrands: [],
		adminPromoCodes: [],
		adminAttachmentNotice: null,
		adminPilotDocuments: [],
		adminPilotEmploymentApplications: [],
		adminAttachments: [],
		adminIncidents: [],
		selectedIncident: null,
		adminIncidentMessages: [],
		incidentUpdateDraft: "",
		incidentNotifyCustomer: true,
		incidentUpdateSending: false,
		adminSupportConversations: [],
		selectedSupportConversation: null,
		adminSupportMessages: [],
		supportReplyDraft: "",
		supportReplySending: false,
		adminAvailabilityEvents: [],
		adminIssues: [],
		adminStats: null,
		adminCallSessions: [],
		selectedCallSession: null,
		adminCallEvents: [],
		adminStatsRefreshing: false,
		...(overrides.state || {}),
	},
	setters: {
		setAdminTab: jest.fn(),
		setAdminCustomerSearch: jest.fn(),
		setAdminCustomerFilter: jest.fn(),
		setAdminSelectedCustomerIds: jest.fn(),
		setAdminCustomerCardId: jest.fn(),
		setAdminPilotAssignments: jest.fn(),
		setAdminAttachmentNotice: jest.fn(),
		setIncidentUpdateDraft: jest.fn(),
		setIncidentNotifyCustomer: jest.fn(),
		setSupportReplyDraft: jest.fn(),
		setSelectedCallSession: jest.fn(),
		...(overrides.setters || {}),
	},
	actions: {
		handleNavigateAdminTab: jest.fn(),
		handleSelectErrandDetail: jest.fn(),
		handleAssignPilotToErrand: jest.fn(),
			handleUpdatePilotDispatchStatus: jest.fn(),
		handleDeleteErrand: jest.fn(),
		handleAssignErrand: jest.fn(),
		handleApproveErrand: jest.fn(),
		handleCompleteErrand: jest.fn(),
		handleResolveIssue: jest.fn(),
		handleDownloadAdminAttachment: jest.fn(),
		handleViewAdminAttachment: jest.fn(),
		handleReviewAttachment: jest.fn(),
		handleDownloadPilotDocument: jest.fn(),
		handleViewPilotDocument: jest.fn(),
		handleReviewPilotDocument: jest.fn(),
		...(overrides.actions || {}),
	},
	helpers: {
		getInitials: () => "AU",
		getAvatarColor: () => "#999",
		...(overrides.helpers || {}),
	},
});

describe("AdminDashboardModal tabs (regression)", () => {
	test("clicking each tab calls handleNavigateAdminTab", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		const handleNavigateAdminTab = jest.fn();

		render(
			<AdminDashboardModal {...buildProps({ actions: { handleNavigateAdminTab } })} />,
		);

		const labels = [
			{ name: /Customers/i, key: "customers" },
			{ name: /Errands/i, key: "errands" },
			{ name: /Archive/i, key: "archive" },
			{ name: /Attachments/i, key: "attachments" },
			{ name: /Pilot Applications/i, key: "pilot-applications" },
			{ name: /Incidents/i, key: "incidents" },
			{ name: /Support/i, key: "support" },
			{ name: /Availability/i, key: "availability" },
			{ name: /Issues/i, key: "issues" },
			{ name: /Calls/i, key: "calls" },
			{ name: /Statistics/i, key: "stats" },
		];

		for (const tab of labels) {
			await user.click(await screen.findByRole("tab", { name: tab.name }));
		}

		// Should be called once per click.
		expect(handleNavigateAdminTab).toHaveBeenCalledTimes(labels.length);

		// Ensure some key tabs are routed correctly.
		expect(handleNavigateAdminTab).toHaveBeenCalledWith("errands");
		expect(handleNavigateAdminTab).toHaveBeenCalledWith("support");
		expect(handleNavigateAdminTab).toHaveBeenCalledWith("stats");
	});

	test("issues tab shows backend issue fields and links admins to incidents", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		const handleNavigateAdminTab = jest.fn();

		render(
			<AdminDashboardModal
				{...buildProps({
					state: {
						adminTab: "issues",
						adminIssues: [
							{
								errand_id: 42,
								reference_number: "EB-42",
								user_id: 9,
								errand_status: "accepted",
								issue_reason: "pilot_cannot_proceed",
								issue_notes: "Pilot reported blocked access at pickup.",
								issue_status: "open",
								issue_reported_at: "2026-04-10T10:00:00Z",
								issue_preferred_resolution: "Reassign another pilot",
							},
						],
					},
					actions: { handleNavigateAdminTab },
				})}
			/>,
		);

		expect(screen.getByText(/pilot_cannot_proceed/i)).toBeInTheDocument();
		expect(
			screen.getByText(/Pilot reported blocked access at pickup/i),
		).toBeInTheDocument();
		expect(screen.getByText(/Preferred: Reassign another pilot/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /open incidents/i }));
		expect(handleNavigateAdminTab).toHaveBeenCalledWith("incidents");
	});

	test("attachments tab groups files by owner and owner tag opens customer context", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		const setAdminCustomerCardId = jest.fn();
		const handleNavigateAdminTab = jest.fn();

		render(
			<AdminDashboardModal
				{...buildProps({
					state: {
						adminTab: "attachments",
						adminAttachments: [
							{
								id: 1,
								user_id: 7,
								owner_name: "Ada User",
								owner_email: "ada@example.com",
								filename: "passport.jpg",
								errand_id: 11,
								reference_number: "EB-11",
								errand_title: "Passport pickup",
								sizeBytes: 1024,
								review_status: "pending",
							},
							{
								id: 2,
								user_id: 7,
								owner_name: "Ada User",
								owner_email: "ada@example.com",
								filename: "receipt.pdf",
								errand_id: 11,
								reference_number: "EB-11",
								errand_title: "Passport pickup",
								sizeBytes: 2048,
								review_status: "approved",
							},
						],
					},
					setters: { setAdminCustomerCardId },
					actions: { handleNavigateAdminTab },
				})}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /Ada User.*2 files.*Expand details/i }),
		).toBeInTheDocument();
		expect(screen.getAllByText(/2 files/i).length).toBeGreaterThan(0);
		expect(screen.queryByText(/Client \/ owner record/i)).not.toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: /Ada User.*2 files.*Expand details/i }),
		);
		expect(screen.getByText(/Client \/ owner record/i)).toBeInTheDocument();
		expect(screen.getByText(/Linked to individual user/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /Open linked user/i }));
		expect(setAdminCustomerCardId).toHaveBeenCalledWith(7);
		expect(handleNavigateAdminTab).toHaveBeenCalledWith("customers");
	});

	test("compact attachment audit view nests files under each owner", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

		render(
			<AdminDashboardModal
				{...buildProps({
					state: {
						adminTab: "attachments",
						adminAttachments: [
							{
								id: 1,
								user_id: 7,
								owner_name: "Ada User",
								owner_email: "ada@example.com",
								filename: "passport.jpg",
								errand_id: 11,
								reference_number: "EB-11",
								errand_title: "Passport pickup",
								sizeBytes: 1024,
								review_status: "pending",
							},
							{
								id: 2,
								user_id: 7,
								owner_name: "Ada User",
								owner_email: "ada@example.com",
								filename: "receipt.pdf",
								errand_id: 12,
								reference_number: "EB-12",
								errand_title: "Receipt upload",
								sizeBytes: 2048,
								review_status: "approved",
							},
						],
					},
				})}
			/>,
		);

		const auditSectionHeading = screen.getByText(/All attachment files/i);
		const auditSection = auditSectionHeading.parentElement?.parentElement;
		const auditScope = within(auditSection);

		expect(auditScope.getByRole("button", { name: /Ada User/i })).toBeInTheDocument();
		expect(auditScope.queryByText(/passport.jpg/i)).not.toBeInTheDocument();

		await user.click(auditScope.getByRole("button", { name: /Show files/i }));

		expect(auditScope.getByText(/passport.jpg/i)).toBeInTheDocument();
		expect(auditScope.getByText(/receipt.pdf/i)).toBeInTheDocument();
	});

	test("stats refresh button shows busy feedback while reloading", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		let resolveReload;
		const reloadAdminStats = jest.fn(
			() =>
				new Promise((resolve) => {
					resolveReload = resolve;
				}),
		);

		render(
			<AdminDashboardModal
				{...buildProps({
					state: { adminTab: "stats", adminStats: {} },
					actions: { reloadAdminStats },
				})}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /reload stats/i }));
		expect(screen.getByRole("button", { name: /refreshing…/i })).toBeInTheDocument();

		resolveReload?.();
		await waitFor(() => {
			expect(screen.getByRole("button", { name: /reload stats/i })).toBeInTheDocument();
		});
	});

	test("24h visits card opens a location drilldown", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

		render(
			<AdminDashboardModal
				{...buildProps({
					state: {
						adminTab: "stats",
						adminStats: {
							visits_last_24h: 12,
							visits_last_24h_by_location: [
								{ country: "NG", region: "Lagos", city: "Ikeja", count: 5 },
								{ country: "US", region: "New York", city: "New York", count: 2 },
							],
							visits_recent_24h: [
								{
									country: "NG",
									region: "Lagos",
									city: "Ikeja",
									source: "web",
									page: "/pricing",
									created_at: "2026-07-08T14:30:00+00:00",
								},
								{
									country: "US",
									region: "New York",
									city: "New York",
									source: "search",
									page: "/about",
									created_at: "2026-07-08T13:00:00+00:00",
								},
							],
						},
					},
				})}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /visits \(24h\)/i }));

		expect(screen.getByText(/Grouped visit locations from the last 24 hours\./i)).toBeInTheDocument();
		expect(screen.getByText(/Ikeja/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /Recent visits/i }));
		expect(screen.getByText(/\/pricing/i)).toBeInTheDocument();
		expect(screen.getByText(/Source: web/i)).toBeInTheDocument();
		expect(screen.getByText(/\/about/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /show new york · new york · united states on map/i }));
		expect(screen.getByRole("img", { name: /24 hour visits map/i })).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: /show visits for new york/i }).length).toBeGreaterThan(0);

		await user.click(screen.getByRole("button", { name: /^Map$/i }));
		expect(screen.getByRole("img", { name: /24 hour visits map/i })).toBeInTheDocument();

		await user.click(screen.getAllByRole("button", { name: /show visits for ikeja/i })[1]);
		expect(screen.getByText(/Showing visits for/i)).toBeInTheDocument();
		expect(screen.getByText(/\/pricing/i)).toBeInTheDocument();
		expect(screen.queryByText(/\/about/i)).not.toBeInTheDocument();
	});

	test("availability tab explains what the feed is used for", () => {
		render(
			<AdminDashboardModal
				{...buildProps({
					state: { adminTab: "availability", adminAvailabilityEvents: [] },
				})}
			/>,
		);

		expect(screen.getByText(/Availability audit log/i)).toBeInTheDocument();
		expect(
			screen.getByText(/records pilot availability requests, reminders, and yes\/no responses/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/No availability events yet/i),
		).toBeInTheDocument();
	});

	test("pilot rows use a compact dispatch switch that disables enabled pilots", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		const handleUpdatePilotDispatchStatus = jest.fn();

		render(
			<AdminDashboardModal
				{...buildProps({
					state: {
						adminTab: "customers",
						adminCustomers: [
							{
								id: 7,
								is_pilot: true,
								first_name: "Ada",
								last_name: "Pilot",
								email: "ada@example.com",
								availability: "online",
								admin_dispatch_status: "enabled",
								is_email_verified: true,
							},
						],
					},
					actions: { handleUpdatePilotDispatchStatus },
				})}
			/>,
		);

		const dispatchSwitch = screen.getByRole("switch", {
			name: /dispatch access for ada pilot/i,
		});
		expect(dispatchSwitch).toHaveAttribute("aria-checked", "true");
		expect(screen.getByText(/^Enabled$/i)).toBeInTheDocument();

		await user.click(dispatchSwitch);

		await waitFor(() => {
			expect(handleUpdatePilotDispatchStatus).toHaveBeenCalledWith(7, "disable");
		});
	});

	test("pilot rows let admins restore blocked dispatch access with a secondary action", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		const handleUpdatePilotDispatchStatus = jest.fn();

		render(
			<AdminDashboardModal
				{...buildProps({
					state: {
						adminTab: "customers",
						adminCustomers: [
							{
								id: 9,
								is_pilot: true,
								first_name: "Jordan",
								last_name: "Blocked",
								email: "jordan@example.com",
								availability: "offline",
								admin_dispatch_status: "permanently_disabled",
								is_email_verified: true,
							},
						],
					},
					actions: { handleUpdatePilotDispatchStatus },
				})}
			/>,
		);

		const dispatchSwitch = screen.getByRole("switch", {
			name: /dispatch access for jordan blocked/i,
		});
		expect(dispatchSwitch).toBeDisabled();
		expect(dispatchSwitch).toHaveAttribute("aria-checked", "false");
		expect(screen.getByText(/^Blocked$/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /^Restore$/i }));

		await waitFor(() => {
			expect(handleUpdatePilotDispatchStatus).toHaveBeenCalledWith(9, "enable");
		});
	});

	test("customer tab exposes pilot dispatch policy controls for visibility and radius", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;
		const handleUpdatePilotDispatchPolicy = jest.fn().mockResolvedValue(undefined);

		render(
			<AdminDashboardModal
				{...buildProps({
					state: {
						adminTab: "customers",
						adminPilotDispatchPolicy: {
							show_all_jobs_to_pilots: false,
							open_pool_radius_miles: 5,
							allowed_open_pool_radius_miles: [5, 10, 15, 20],
						},
					},
					actions: { handleUpdatePilotDispatchPolicy },
				})}
			/>,
		);

		expect(screen.getByText(/Global visibility and radius controls/i)).toBeInTheDocument();
		const visibilitySwitch = screen.getByRole("switch", {
			name: /pilot can see all jobs/i,
		});
		expect(visibilitySwitch).toHaveAttribute("aria-checked", "false");

		await user.click(visibilitySwitch);
		await waitFor(() => {
			expect(handleUpdatePilotDispatchPolicy).toHaveBeenCalledWith({
				show_all_jobs_to_pilots: true,
			});
		});

		await user.click(screen.getByRole("button", { name: /15 mi/i }));
		await waitFor(() => {
			expect(handleUpdatePilotDispatchPolicy).toHaveBeenCalledWith({
				open_pool_radius_miles: 15,
			});
		});
	});
});

describe("Admin dashboard helpers", () => {
	test("ranks suggested pilots by errand fit before generic rating", () => {
		const errand = {
			id: 88,
			support_type: "car_support",
			pickup_location: "Ikeja, Lagos",
			dropoff_location: "Lekki, Lagos",
			distance_km: 12,
		};

		const pilots = [
			{
				id: 1,
				first_name: "Bike",
				last_name: "Only",
				vehicle_type: "motorcycle",
				city: "Lagos",
				availability: "online",
				admin_dispatch_status: "enabled",
				rating: 5,
			},
			{
				id: 2,
				first_name: "Far",
				last_name: "Pilot",
				vehicle_type: "car",
				city: "Ibadan",
				availability: "online",
				admin_dispatch_status: "enabled",
				rating: 5,
			},
			{
				id: 3,
				first_name: "Best",
				last_name: "Fit",
				vehicle_type: "car",
				city: "Lagos",
				availability: "online",
				admin_dispatch_status: "enabled",
				rating: 4.6,
			},
			{
				id: 4,
				first_name: "Busy",
				last_name: "Star",
				vehicle_type: "car",
				city: "Lagos",
				availability: "online",
				admin_dispatch_status: "enabled",
				rating: 4.9,
			},
			{
				id: 5,
				first_name: "Blocked",
				last_name: "Pilot",
				vehicle_type: "car",
				city: "Lagos",
				availability: "online",
				admin_dispatch_status: "disabled",
				rating: 5,
			},
		];

		const ranked = rankPilotsForErrandAssignment({
			errand,
			pilots,
			activePilotIds: new Set([4]),
		});

		expect(ranked[0].pilot.id).toBe(3);
		expect(ranked[0].fit.isMatch).toBe(true);

		const suggested = getSuggestedPilotForErrand({
			errand,
			pilots,
			activePilotIds: new Set([4]),
		});

		expect(suggested?.pilot.id).toBe(3);
		expect(suggested?.fit.reasons).toEqual(
			expect.arrayContaining(["car-ready", "lagos area"]),
		);
	});

	test("builds queue ordering and numbering by status priority then newest-first", () => {
		const queue = buildAdminErrandQueue({
			errands: [
				{ id: 1, status: "completed", created_at: "2026-04-02T09:00:00Z", reference_number: "EB-01" },
				{ id: 2, status: "submitted", created_at: "2026-04-10T09:00:00Z", reference_number: "EB-02" },
				{ id: 3, status: "pending", created_at: "2026-04-09T09:00:00Z", reference_number: "EB-03" },
				{ id: 4, status: "assigned", created_at: "2026-04-08T09:00:00Z", reference_number: "EB-04" },
				{ id: 5, status: "in_progress", created_at: "2026-04-07T09:00:00Z", reference_number: "EB-05" },
				{ id: 6, status: "cancelled", created_at: "2026-04-11T09:00:00Z", reference_number: "EB-06" },
			],
			statusFilter: "all",
			sortKey: "newest",
			searchQuery: "",
		});

		expect(queue.map((item) => item.reference)).toEqual([
			"EB-02",
			"EB-03",
			"EB-04",
			"EB-05",
			"EB-06",
		]);

		expect(queue.map((item) => item.queueNumber)).toEqual([
			"#0001",
			"#0002",
			"#0003",
			"#0004",
			"#0005",
		]);

		expect(queue.some((item) => item.reference === "EB-01")).toBe(false);

		expect(formatAdminErrandQueueNumber(8)).toBe("#0009");
	});

	test("errands tab keeps completed jobs out of the live queue", () => {
		render(
			<AdminDashboardModal
				{...buildProps({
					state: {
						adminTab: "errands",
						adminErrandsList: [
							{
								id: 14,
								status: "completed",
								title: "Finished embassy run",
								reference_number: "EB-14-1001",
								customer_name: "Ada Client",
								pickup_location: "Ikeja",
								dropoff_location: "Lekki",
								created_at: "2026-04-08T10:00:00Z",
							},
							{
								id: 15,
								status: "assigned",
								title: "Active document run",
								reference_number: "EB-15-1002",
								customer_name: "Jordan Client",
								pickup_location: "Yaba",
								dropoff_location: "VI",
								created_at: "2026-04-09T10:00:00Z",
							},
						],
					},
				})}
			/>,
		);

		expect(screen.queryByRole("button", { name: /^Completed$/i })).not.toBeInTheDocument();
		expect(screen.queryByText(/EB-14-1001/i)).not.toBeInTheDocument();
		expect(screen.getByText(/EB-15-1002/i)).toBeInTheDocument();
	});

	test("errands tab filters and searches the grouped queue board", async () => {
		const user =
			typeof userEvent.setup === "function" ? userEvent.setup() : userEvent;

		render(
			<AdminDashboardModal
				{...buildProps({
					state: {
						adminTab: "errands",
						adminPilots: [
							{
								id: 77,
								first_name: "Nora",
								last_name: "Pilot",
								email: "nora@example.com",
								rating: 4.8,
							},
						],
						adminErrandsList: [
							{
								id: 52,
								status: "submitted",
								title: "Passport pickup",
								reference_number: "EB-52-1788",
								customer_name: "Ada Client",
								pickup_location: "Ikeja",
								dropoff_location: "Lekki",
								created_at: "2026-04-10T10:00:00Z",
							},
							{
								id: 70,
								status: "assigned",
								title: "Inspection follow-up",
								reference_number: "EB-70-2001",
								customer_name: "Jordan Client",
								pilot_id: 77,
								pickup_location: "Yaba",
								dropoff_location: "Surulere",
								created_at: "2026-04-09T10:00:00Z",
							},
						],
					},
				})}
			/>,
		);

		expect(screen.getAllByText(/^Pending$/i).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/^Assigned$/i).length).toBeGreaterThan(0);
		expect(screen.getByText(/#0001 • Ref EB-52-1788/i)).toBeInTheDocument();
		expect(screen.getByText(/#0002 • Ref EB-70-2001/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /^Assigned$/i }));
		expect(screen.queryByText(/#0001 • Ref EB-52-1788/i)).not.toBeInTheDocument();
		expect(screen.getByText(/#0001 • Ref EB-70-2001/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /^All$/i }));
		await user.type(screen.getByRole("searchbox", { name: /search errands/i }), "passport");
		expect(screen.getByText(/#0001 • Ref EB-52-1788/i)).toBeInTheDocument();
		expect(screen.queryByText(/#0002 • Ref EB-70-2001/i)).not.toBeInTheDocument();
	});

	test("groups admin attachments by owner", () => {
		expect(
			groupAdminAttachmentsByOwner([
				{ id: 2, user_id: 7, owner_email: "ada@example.com" },
				{ id: 1, user_id: 7, owner_email: "ada@example.com" },
			]),
		).toEqual([
			expect.objectContaining({
				userId: 7,
				ownerEmail: "ada@example.com",
				attachments: [expect.objectContaining({ id: 2 }), expect.objectContaining({ id: 1 })],
			}),
		]);
	});

	test("maps backend issue fields into admin issue display values", () => {
		expect(
			getAdminIssueDisplay({
				errand_id: 42,
				reference_number: "EB-42",
				issue_reason: "pilot_cannot_proceed",
				issue_notes: "Blocked access",
				issue_status: "open",
			}),
		).toEqual(
			expect.objectContaining({
				id: 42,
				referenceNumber: "EB-42",
				reason: "pilot_cannot_proceed",
				notes: "Blocked access",
				status: "open",
			}),
		);
	});
});
