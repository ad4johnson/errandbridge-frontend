import { CUSTOMER_TOUR_ILLUSTRATIONS } from "./onboardingIllustrations";

export const PILOT_ONBOARDING_STEPS = [
	{
		title: "Your Profile Card",
		body: "Open your profile card to review your account details.",
		note: "Tip: Tap the avatar to view or edit your profile details.",
		selector: 'button[data-tour="profile-card"]',
	},
	{
		title: "Pilot Dashboard Overview",
		body: "This is your pilot dashboard where you can view available errands and stats.",
		note: "Tip: Review your stats and alerts here before accepting new errands.",
		selector: ".pilot-dashboard-optimized, .pilot-job-board-enhanced",
	},
	{
		title: "Available Errands",
		body: "Browse available errands and open details to accept a job.",
		note: "Tip: Tap an errand card to review requirements, then accept when ready.",
		selector: ".job-board-section, .jobs-grid",
	},
	{
		title: "Active Errand",
		body: "Track or complete your active errand here once assigned.",
		note: "Tip: Update status as you progress and mark the errand complete when done.",
		selector: ".active-errand-section",
	},
	{
		title: "Need Help?",
		body: "Contact ErrandBridge Support whenever you need assistance while piloting.",
		note: "Tip: Use this button to reach our support team quickly.",
		selector:
			'button[data-cta="contact-support"], button[aria-label="Contact Support"], button[title="Contact ErrandBridge Support"]',
	},
];

export const CUSTOMER_ONBOARDING_STEPS = [
	{
		title: "Welcome to ErrandBridge",
		body: "Here’s a quick tour of the new client dashboard so you can send your first errand with confidence.",
		note: "Use Next to move through the tour. You can replay it later from Settings.",
		selector: null,
		illustration: CUSTOMER_TOUR_ILLUSTRATIONS.welcome,
	},
	{
		title: "Your Profile Card",
		body: "This is your profile shortcut (account, support, admin tools when enabled).",
		note: "You can update your details, settings, and support options here.",
		selector: 'button[data-tour="profile-card"]',
	},
	{
		title: "Create vs track",
		body: "Use these tabs to switch between sending a new errand and tracking existing ones.",
		note: "New Errand = create and pay. My Errands = live updates + receipts/proof.",
		selector: '[data-tour="clientv2-tabs"], [data-tour="dashboard-tabs"]',
		illustration: CUSTOMER_TOUR_ILLUSTRATIONS.tabs,
	},
	{
		title: "Checkout readiness",
		body: "This card keeps you oriented: it shows what’s missing before you can check out.",
		note: "When you see 100%, you’re ready to proceed to payment.",
		selector: '[data-tour="clientv2-readiness"]',
	},
	{
		title: "Review & pay",
		body: "Your checkout rail summarizes your choices and shows the estimated total.",
		note: "The Continue button stays disabled until required fields are done.",
		selector: '[data-tour="clientv2-checkout-rail"]',
		illustration: CUSTOMER_TOUR_ILLUSTRATIONS.checkout,
	},
	{
		title: "Smart structuring",
		body: "Turn this on to get context-aware tips while you fill the form.",
		note: "You can keep it off if you prefer a clean, manual flow.",
		selector: '[data-tour="clientv2-smart-structuring"], [data-tour="ai-enhance"]',
	},
	{
		title: "Catalog vs Smart builder",
		body: "Start with Catalog pricing (category + template + tier), then switch to Smart builder to finish details.",
		note: "Both modes are connected, and your selections carry across.",
		selector: '[data-tour="clientv2-builder-tabs"]',
	},
	{
		title: "Pick a service category",
		body: "Choose the closest match. This drives templates, pricing, and suggested next steps.",
		note: "If you’re unsure, start broad. You can always change it.",
		selector: '[data-tour="clientv2-service-grid"]',
		illustration: CUSTOMER_TOUR_ILLUSTRATIONS.category,
	},
	{
		title: "Choose a template",
		body: "Templates give you a starting outline so you don’t have to type from scratch.",
		note: "Pick the closest template. Small mismatches are totally fine.",
		selector: '[data-tour="clientv2-template-picker"], [data-tour="clientv2-category-template"]',
		illustration: CUSTOMER_TOUR_ILLUSTRATIONS.template,
	},
	{
		title: "Confirm a priority level",
		body: "Standard is great for routine errands. Use Priority or Premium when timing or complexity is higher.",
		note: "Tap a level to see what’s included.",
		selector: '[data-tour="clientv2-tier-grid"]',
		illustration: CUSTOMER_TOUR_ILLUSTRATIONS.tiers,
	},
	{
		title: "Switch to Smart builder",
		body: "Smart builder is where you’ll add locations, timing, attachments, and full instructions.",
		note: "Tap Smart builder, then continue the tour.",
		selector: '[data-tour="clientv2-builder-tab-smart"]',
	},
	{
		title: "Describe what you need",
		body: "Add a short title and detailed instructions so the operator can execute without back-and-forth.",
		note: "Include must-haves, recipient details (if needed), and any reference numbers.",
		selector: '[data-tour="clientv2-errand-details"], #errand-title',
	},
	{
		title: "Location & timing",
		body: "Starting point is required. Ending point is optional. You can schedule if it’s not ASAP.",
		note: "The more specific you are, the smoother the dispatch.",
		selector: '[data-tour="clientv2-location-timing"]',
	},
	{
		title: "Request proof or receipt",
		body: "Turn this on when you need evidence like a receipt, photo, or delivery confirmation.",
		note: "You’ll see proof in your errand details once complete.",
		selector: '[data-tour="clientv2-proof-toggle"]',
		illustration: CUSTOMER_TOUR_ILLUSTRATIONS.proof,
	},
	{
		title: "Track your errands",
		body: "Use My Errands to see live updates, messages, and completion proof.",
		note: "Open an errand to see the timeline and status.",
		selector: 'button[data-tour="clientv2-tab-errands"], button[data-tour="tab-my-errands"]',
		illustration: CUSTOMER_TOUR_ILLUSTRATIONS.tracking,
	},
	{
		title: "Need help?",
		body: "Contact ErrandBridge Support any time you need assistance.",
		note: "If something feels off, reach out. We will help quickly.",
		selector:
			'button[data-cta="contact-support"], button[aria-label="Contact Support"], button[title="Contact ErrandBridge Support"]',
	},
];

export const ADMIN_ONBOARDING_STEPS = [
	{
		title: "Admin Dashboard Tour",
		body: "Quick walkthrough of the Admin Dashboard so you can move faster (and delete the right thing the first time).",
		note: "Tip: This tour is informational-use the Admin tabs after the tour to navigate freely.",
		selector: null,
	},
	{
		action: { type: "adminTab", tab: "customers" },
		title: "Admin Dashboard",
		body: "This is the Admin Dashboard modal. It’s your control center for customers, errands, incidents, and support.",
		note: "Tip: Close it any time with the × in the top-right.",
		selector: '[data-tour="admin-dashboard-modal"]',
	},
	{
		title: "Admin Tabs",
		body: "Use these tabs to switch between admin sections (Customers, Errands, Incidents, Support, and more).",
		note: "Tip: Customers is usually the fastest place to resolve account-level issues.",
		selector: '[data-tour="admin-tabs"]',
	},
	{
		title: "Search Customers",
		body: "Search by name or email to quickly find the user you need.",
		note: "Tip: Pair this with the Clients/Pilots filter pills.",
		selector: 'input[data-tour="admin-customer-search"]',
	},
	{
		title: "Delete Unverified",
		body: "Bulk cleanup: remove unverified accounts (use carefully).",
		note: "Tip: If someone is stuck verifying, resolve that first instead of deleting.",
		selector: 'button[data-tour="admin-purge-unverified-customers"]',
	},
	{
		title: "Delete Selected",
		body: "Bulk delete: select one or more users, then delete the selection.",
		note: "Tip: This button enables only after you select users in the list.",
		selector: 'button[data-tour="admin-delete-selected-customers"]',
	},
	{
		title: "Delete a User",
		body: "Per-user delete: use the row-level delete button for a single account.",
		note: "Tip: If the list is long, search first so you don’t delete the wrong user.",
		selector: 'button[data-tour="admin-delete-customer"]',
	},
	{
		action: { type: "adminTab", tab: "errands" },
		title: "Errands",
		body: "This section shows active errands across the system.",
		note: "Tip: Open details to review context before taking action.",
		selector: '[data-tour="admin-errands-section"]',
	},
	{
		title: "Errand Cards",
		body: "Each card summarizes an errand: reference, status, locations, and customer info.",
		note: "Tip: Use View Details for the full timeline and metadata.",
		selector: '[data-tour="admin-errand-card"]',
	},
	{
		title: "Delete an Errand",
		body: "Use this button to remove an errand (only do this when you’re sure).",
		note: "Tip: If you’re troubleshooting, check incidents/support first-deleting is irreversible.",
		selector: 'button[data-tour="admin-delete-errand"]',
	},
	{
		action: { type: "adminTab", tab: "incidents" },
		title: "Incidents",
		body: "Incidents help you track and resolve operational issues tied to errands.",
		note: "Tip: Start by selecting an incident on the left.",
		selector: '[data-tour="admin-incidents-list"]',
	},
	{
		title: "Incident Details",
		body: "The detail panel shows the incident context, messages, and update tools.",
		note: "Tip: You can send an update to keep the customer informed.",
		selector: '[data-tour="admin-incident-detail"]',
	},
	{
		action: { type: "adminTab", tab: "support" },
		title: "Support Tickets",
		body: "This list shows customer support sessions and handoff requests.",
		note: "Tip: Click a ticket to view the full conversation.",
		selector: '[data-tour="admin-support-list"]',
	},
	{
		title: "Support Conversation",
		body: "The right panel shows the support conversation and lets you send updates.",
		note: "Tip: Select a ticket first if you don’t see the message composer.",
		selector: '[data-tour="admin-support-detail"]',
	},
];
