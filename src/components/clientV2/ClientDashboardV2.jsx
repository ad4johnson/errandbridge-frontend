import { Fragment, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    CalendarClock,
    ChevronDown,
    ClipboardList,
    Copy,
    MapPin,
    NotebookPen,
    PlusCircle,
    ShieldCheck,
    Sparkles,
} from "lucide-react";

import "./ClientDashboardV2.css";

import {
    CATALOG_CATEGORIES,
    findTemplateByName,
    getTemplatesForCategory,
    validateServiceCatalogV2,
} from "../../data/serviceCatalogV2";
import { priceErrand } from "../../lib/pricing";

import { acquireBodyScrollLock } from "../../utils/scrollLock";
import { formatTemplateTitle } from "../../utils/displayNames";
import { computeCheckoutProgress } from "./checkoutProgress";

function classNames(...items) {
    return items.filter(Boolean).join(" ");
}

function PremiumDirectionLabel({ label, tone = "violet", compact = false }) {
    return (
        <span
            className={classNames(
                "eb-clientv2__premiumDirection",
                tone === "light" && "is-light",
                tone === "emerald" && "is-emerald",
                compact && "is-compact",
            )}
        >
            <span>{label}</span>
            <span className="eb-clientv2__premiumDirectionIcon" aria-hidden="true">
                <ArrowRight size={compact ? 14 : 15} />
            </span>
        </span>
    );
}

function NextStepSignalBadge({ prefix = "Complete next", detail, compact = false }) {
    const announcement = detail ? `${prefix}: ${detail}` : prefix;

    return (
        <span
            className={classNames("eb-clientv2__nextStepSignal", compact && "is-compact")}
            aria-label={announcement}
        >
            <span className="eb-clientv2__nextStepSignalDot" aria-hidden="true">
                <span className="eb-clientv2__nextStepSignalPulse" />
                <span className="eb-clientv2__nextStepSignalCore" />
            </span>
            <span className="eb-clientv2__nextStepSignalText">
                <span className="eb-clientv2__nextStepSignalPrefix">{prefix}</span>
                {detail ? <span className="eb-clientv2__nextStepSignalDetail">{detail}</span> : null}
            </span>
        </span>
    );
}

function scrollRefIntoView(ref, opts = {}) {
    try {
        const node = ref?.current;
        if (!node || typeof node.scrollIntoView !== "function") return;
        node.scrollIntoView({
            behavior: "smooth",
            block: opts?.block || "center",
            inline: "nearest",
        });
    } catch {
        // ignore
    }
}

function formatFromPrice({ pricesByLane, laneKey, currencyKey, tierKey }) {
    const currency = String(currencyKey || "GBP").toUpperCase();
    const lane = pricesByLane?.[laneKey]?.[currency] || null;
    const major = lane ? Number(lane[tierKey] ?? lane.standard) : NaN;
    if (!Number.isFinite(major)) return "-";
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(major);
    } catch {
        return `${currency} ${major.toFixed(0)}`;
    }
}

function formatMinorCurrency(minor, currencyKey) {
    const currency = String(currencyKey || "GBP").toUpperCase();
    const value = Number(minor);
    if (!Number.isFinite(value)) return "-";
    const major = ["JPY", "KRW"].includes(currency) ? value : value / 100;
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(major);
    } catch {
        return `${currency} ${major.toFixed(0)}`;
    }
}

function buildTierConfirmationToken({ serviceKey, templateId, regionKey, tierKey }) {
    return [serviceKey || "", templateId || "", regionKey || "", tierKey || ""].join("|");
}

function describeSchedule({ scheduleType, scheduleSummary }) {
    const key = String(scheduleType || "now").toLowerCase();
    if (key === "recurring") return "Repeat";
    if (key === "one_time") {
        const summary = String(scheduleSummary || "").trim();
        if (summary && summary.toLowerCase() !== "not set") return summary;
        return "Scheduled";
    }
    return "ASAP";
}

function formatFileSize(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
        size /= 1024;
        idx += 1;
    }
    const rounded = idx === 0 ? String(Math.round(size)) : size.toFixed(size >= 10 ? 0 : 1);
    return `${rounded}${units[idx]}`;
}

function normalizeStatusKey(errand) {
    return String(errand?.statusKey || errand?.status || "")
        .trim()
        .toLowerCase();
}

function isArchivedErrand(errand) {
    if (!errand) return false;
    if (errand?.isArchived === true || errand?.archived === true) return true;
    const status = normalizeStatusKey(errand);
    if (!status) return false;
    if (status.includes("archiv")) return true;
    // Legacy client archive behavior: terminal/customer-confirmed states.
    return status === "accepted" || status === "cancelled" || status === "canceled";
}

function formatErrandDate(value) {
    if (!value) return "";
    const isLikelyEpoch = typeof value === "number" && Number.isFinite(value);
    const d = isLikelyEpoch ? new Date(value) : new Date(String(value));
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
    try {
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "2-digit",
            year: "numeric",
        }).format(d);
    } catch {
        return d.toLocaleDateString();
    }
}

function formatErrandDateTime(value) {
    if (!value) return "";
    const d = new Date(String(value));
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
    try {
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "2-digit",
            hour: "numeric",
            minute: "2-digit",
        }).format(d);
    } catch {
        return d.toLocaleString();
    }
}

function getHistoryEntries(errand) {
    return Array.isArray(errand?.history) ? errand.history : [];
}

function getHistoryEntryEventType(entry) {
    return String(
        entry?.eventType || entry?.event_type || entry?.type || entry?.action || "",
    )
        .trim()
        .toLowerCase();
}

function getHistoryEntryStatus(entry) {
    return String(entry?.newStatus || entry?.new_status || entry?.oldStatus || entry?.old_status || "")
        .trim()
        .toLowerCase();
}

function getHistoryEntryTimestamp(entry) {
    return entry?.createdAt || entry?.created_at || entry?.timestamp || null;
}

function hasReachedPreviewStatus(statusKey, currentStatus) {
    const order = [
        "submitted",
        "assigned",
        "accepted",
        "in_progress",
        "picked_up",
        "delivered",
        "completed",
    ];
    const statusIndex = order.indexOf(String(statusKey || ""));
    const currentIndex = order.indexOf(String(currentStatus || ""));
    if (statusIndex === -1 || currentIndex === -1) return false;
    return currentIndex >= statusIndex;
}

function buildSelectedErrandTimeline(errand) {
    if (!errand) return [];

    const history = getHistoryEntries(errand);
    const statusKey = normalizeStatusKey(errand) || "submitted";
    const createdAt =
        errand?.createdAt ||
        errand?.created_at ||
        errand?.submittedAt ||
        errand?.submitted_at ||
        null;

    const stepConfigs = [
        {
            key: "submitted",
            label: "Request submitted",
            fallbackTimestamp: createdAt,
            include: true,
            matches: (entry) => {
                const type = getHistoryEntryEventType(entry);
                const status = getHistoryEntryStatus(entry);
                return (
                    type === "created" ||
                    type === "request_created" ||
                    status === "submitted"
                );
            },
        },
        {
            key: "assigned",
            label: "Pilot assigned",
            include: hasReachedPreviewStatus("assigned", statusKey),
            matches: (entry) => {
                const type = getHistoryEntryEventType(entry);
                const status = getHistoryEntryStatus(entry);
                return type === "admin_assign_pilot" || status === "assigned";
            },
        },
        {
            key: "accepted",
            label: "Pilot accepted",
            include: hasReachedPreviewStatus("accepted", statusKey),
            matches: (entry) => {
                const type = getHistoryEntryEventType(entry);
                const status = getHistoryEntryStatus(entry);
                return type.includes("accept") || status === "accepted";
            },
        },
        {
            key: "in_progress",
            label: "Errand started",
            include: hasReachedPreviewStatus("in_progress", statusKey),
            matches: (entry) => {
                const type = getHistoryEntryEventType(entry);
                const status = getHistoryEntryStatus(entry);
                return type === "pilot_started" || status === "in_progress";
            },
        },
        {
            key: "delivered",
            label: "Ending reached",
            include: hasReachedPreviewStatus("delivered", statusKey),
            matches: (entry) => {
                const type = getHistoryEntryEventType(entry);
                const status = getHistoryEntryStatus(entry);
                return type.includes("delivered") || status === "delivered";
            },
        },
        {
            key: "completed",
            label: "Completed",
            include: statusKey === "completed",
            matches: (entry) => {
                const type = getHistoryEntryEventType(entry);
                const status = getHistoryEntryStatus(entry);
                return type === "pilot_completed" || status === "completed";
            },
        },
        {
            key: "cancelled",
            label: "Cancelled",
            include: statusKey === "cancelled" || statusKey === "canceled",
            matches: (entry) => {
                const type = getHistoryEntryEventType(entry);
                const status = getHistoryEntryStatus(entry);
                return type === "admin_cancelled" || status === "cancelled" || status === "canceled";
            },
        },
    ];

    const steps = stepConfigs
        .filter((step) => step.include)
        .map((step) => {
            const matchingEntry = history.find(step.matches);
            return {
                key: step.key,
                label: step.label,
                timestamp: getHistoryEntryTimestamp(matchingEntry) || step.fallbackTimestamp || null,
                note: matchingEntry?.note || null,
            };
        });

    if (!steps.length) {
        return [
            {
                key: "submitted",
                label: "Request submitted",
                timestamp: createdAt,
                note: null,
            },
        ];
    }

    return steps;
}

async function copyToClipboard(text) {
    const value = String(text || "").trim();
    if (!value) return false;
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch {
        // ignore
    }

    // Fallback: best-effort execCommand.
    try {
        const el = document.createElement("textarea");
        el.value = value;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.left = "-9999px";
        el.style.top = "-9999px";
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        return Boolean(ok);
    } catch {
        return false;
    }
}

const REGION_OPTIONS = [
    { key: "uk", label: "UK (GBP)", currency: "GBP" },
    { key: "us", label: "US (USD)", currency: "USD" },
    { key: "eu", label: "Europe (EUR)", currency: "EUR" },
    { key: "ng", label: "Nigeria (NGN)", currency: "NGN" },
];

const TIER_DEFINITIONS = [
    {
        key: "standard",
        label: "Standard",
        bestFor: "Best for routine errands with flexible timing.",
        summary: "Routine fulfilment with normal dispatch + coordination.",
        includes: [
            "Standard dispatch queue (normal assignment speed)",
            "Baseline coordination and status updates",
            "Suitable for lower-complexity, non-urgent requests",
        ],
        why: "Baseline tier: no added dispatch priority or extra coordination time.",
    },
    {
        key: "priority",
        label: "Priority",
        bestFor: "Best for time-sensitive errands that need faster dispatch.",
        summary: "Faster dispatch + tighter coordination for time-sensitive errands.",
        includes: [
            "Faster dispatch priority vs Standard (quicker operator matching)",
            "More active coordination when timing is tight",
            "Better fit for higher urgency and tighter time windows",
        ],
        why: "Higher dispatch priority and higher coordination intensity require more operator attention and tighter scheduling.",
    },
    {
        key: "premium",
        label: "Premium",
        bestFor: "Best for urgent, complex, or sensitive errands needing hands-on follow-through.",
        summary: "Top priority + hands-on oversight for urgent/complex tasks.",
        includes: [
            "Top queue priority (highest urgency handling)",
            "Highest coordination attention + deeper communication",
            "Stronger oversight for multi-step or sensitive tasks",
        ],
        why: "Highest urgency/complexity handling, stronger oversight, and deeper communication demand more dedicated operator time.",
    },
];

const TIER_BY_KEY = TIER_DEFINITIONS.reduce((acc, tier) => {
    acc[tier.key] = tier;
    return acc;
}, {});

const CATEGORY_BROWSE_META = {
    personal: {
        chipLabel: "Routine",
        badges: ["Low complexity", "Flexible timing"],
        suggestions: ["Shopping / returns", "Family support", "Appointments"],
    },
    documents: {
        chipLabel: "Docs",
        badges: ["Proof-ready", "Office handling"],
        suggestions: ["Passport pickup", "Embassy visit", "Certificates"],
    },
    banking: {
        chipLabel: "Banking",
        badges: ["High trust", "Verification"],
        suggestions: ["Branch follow-up", "Card pickup", "Receipts"],
    },
    legal: {
        chipLabel: "Legal",
        badges: ["High trust", "Confidential"],
        suggestions: ["Court filing", "Notary", "Sensitive handoff"],
    },
    property: {
        chipLabel: "Property",
        badges: ["Photo proof", "On-site"],
        suggestions: ["Inspections", "Site checks", "Utility verification"],
    },
    airport: {
        chipLabel: "Travel",
        badges: ["Time-sensitive", "Live coordination"],
        suggestions: ["Pickup support", "Arrival coordination", "Handoff"],
    },
    family: {
        chipLabel: "Emergency",
        badges: ["Urgent", "Verified updates"],
        suggestions: ["Welfare check", "Hospital follow-up", "Rapid logistics"],
    },
    shopping: {
        chipLabel: "Shopping",
        badges: ["Budgeted", "Receipt proof"],
        suggestions: ["Groceries", "Pharmacy", "Market run"],
    },
    business: {
        chipLabel: "Business",
        badges: ["Operational", "Proof/receipts"],
        suggestions: ["Office logistics", "Vendors", "Document handoffs"],
    },
    health: {
        chipLabel: "Care",
        badges: ["High trust", "Privacy-aware"],
        suggestions: ["Prescription pickup", "Lab results", "Care support"],
    },
    custom: {
        chipLabel: "Flexible",
        badges: ["Anything else", "Tailored handling"],
        suggestions: ["Special requests", "Unique handoffs", "Other errands"],
    },
};

const MOBILE_CATALOG_PRIORITY_CATEGORY_KEYS = [
    "personal",
    "documents",
    "banking",
    "legal",
];

const BASE_SUPPORT_TYPE_OPTIONS = [
    {
        id: "standard_assistance",
        label: "Standard Assistance",
        hint: "On foot, public transport, or simple local help.",
    },
    {
        id: "bike_support",
        label: "Bike Support",
        hint: "Best for light items and faster city movement.",
    },
    {
        id: "car_support",
        label: "Car Support",
        hint: "Best for longer distance, larger items, or premium handling.",
    },
    {
        id: "flexible",
        label: "Flexible",
        hint: "We choose the best available option for the errand.",
    },
];

const RECURRING_DAY_OPTIONS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const CREATE_FLOW_COMPACT_VIEWPORT_MAX_WIDTH = 1279;

function formatRecurringFrequencyLabel(frequency) {
    const key = String(frequency || "weekly").trim().toLowerCase();
    if (key === "biweekly") return "Bi-weekly";
    if (key === "monthly") return "Monthly";
    return "Weekly";
}

function formatRecurringTimeLabel(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "Any time";
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "Any time";
    try {
        const date = new Date(2000, 0, 1, hours, minutes);
        return new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit",
        }).format(date);
    } catch {
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
}

function formatRecurringScheduleSummary({ recurringFrequency, recurringDays, recurringTime }) {
    const days = Array.isArray(recurringDays) ? recurringDays.filter(Boolean) : [];
    const daysLabel = days.length
        ? days.map((day) => String(day).slice(0, 3)).join(", ")
        : "Choose day(s)";
    return `${formatRecurringFrequencyLabel(recurringFrequency)} · ${daysLabel} · ${formatRecurringTimeLabel(recurringTime)}`;
}

function isEditableFieldElement(element) {
    if (!element || typeof element !== "object") return false;
    const tag = String(element.tagName || "").toLowerCase();
    if (tag === "textarea") return true;
    if (tag === "input") {
        const type = String(element.type || "text").toLowerCase();
        return ![
            "button",
            "checkbox",
            "color",
            "file",
            "hidden",
            "image",
            "radio",
            "range",
            "reset",
            "submit",
        ].includes(type);
    }
    return Boolean(element.isContentEditable);
}

export default function ClientDashboardV2({
    mode,
    onOpenCreate,
    onOpenErrands,
    isMobile,
    viewportBottomInsetPx,
    toxiEnabled: toxiEnabledProp,
    onToxiEnabledChange,
    onAssistContextChange,
    assistantCommand,
    onAssistantCommandHandled,
    estimatedTotalLabel,
    // Pricing selection
    regionKey,
    onRegionChange,
    serviceKey,
    onServiceChange,
    templateName,
    onTemplateSelect,
    tierKey,
    onTierChange,
    pricesByLane,
    selectedFiles,
    onSelectedFilesChange,
    onRemoveSelectedFile,
    accessNotes,
    onAccessNotesChange,
    // Create fields
    title,
    onTitleChange,
    note,
    onNoteChange,
    pickup,
    onPickupChange,
    dropoff,
    onDropoffChange,
    supportType = "flexible",
    onSupportTypeChange,
    preferredTime = "asap",
    onPreferredTimeChange,
    scheduleType,
    scheduleSummary,
    onScheduleTypeChange,
    onClearSchedule,
    onOpenSchedule,
    recurringFrequency = "weekly",
    recurringDays = [],
    recurringTime = "09:00",
    onRecurringFrequencyChange,
    onRecurringDaysChange,
    onRecurringTimeChange,
    // Actions
    onOpenPayment,
    paymentModalOpen,
    receiptOverlayOpen = false,
    errands,
    onOpenErrand,
    onOpenAssistant,
    onCloseAssistant,
    assistantOpen = false,
    onSelectedErrandChange,
    trackingStatusByErrand = {},
    refreshTrackingStatus,
    onOpenTracking,
    apiBaseUrl = "",
    PilotTrackerComponent,
    externalSelectedErrandId = null,
    focusLiveMapErrandId = null,
}) {
    const showCreateFlowToxiAssist = false;
    const [builderTab, setBuilderTab] = useState("catalog");
    const [proofRequired, setProofRequired] = useState(false);
    const [toxiAssistEnabledLocal, setToxiAssistEnabledLocal] = useState(false);
    const [continueAttempted, setContinueAttempted] = useState(false);
    const [catalogCategoryKey, setCatalogCategoryKey] = useState(null);
    const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
    const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
    const [templateSearch, setTemplateSearch] = useState("");
    const [query, setQuery] = useState("");
    const [selectedErrandId, setSelectedErrandId] = useState(null);
    const [copyFeedback, setCopyFeedback] = useState("");
    const [liveErrandsExpanded, setLiveErrandsExpanded] = useState(false);
    const [archivedErrandsExpanded, setArchivedErrandsExpanded] = useState(false);
    const [locationTimingCollapsed, setLocationTimingCollapsed] = useState(false);
    const [dropoffOpen, setDropoffOpen] = useState(false);
    const [attachmentsSheetOpen, setAttachmentsSheetOpen] = useState(false);
    const [extraNotesSheetOpen, setExtraNotesSheetOpen] = useState(false);
    const [expandedTierKey, setExpandedTierKey] = useState(null);
    const [tierConfirmedToken, setTierConfirmedToken] = useState("");
    const [pendingScrollToPricing, setPendingScrollToPricing] = useState(false);
    const [pendingOpenTemplatePickerAfterPricingScroll, setPendingOpenTemplatePickerAfterPricingScroll] = useState(false);
    const [pendingScrollToSmart, setPendingScrollToSmart] = useState(false);
    const [pendingScrollToTemplateAndPricing, setPendingScrollToTemplateAndPricing] = useState(false);
    const [checkoutOpened, setCheckoutOpened] = useState(false);
    const [mobileCheckoutSheetOpen, setMobileCheckoutSheetOpen] = useState(false);
    const [manualReviewRequested, setManualReviewRequested] = useState(false);
    const [stickyProgressVisible, setStickyProgressVisible] = useState(false);
    const [checkoutAutoFocus, setCheckoutAutoFocus] = useState(false);
    const [mobileTextEntryActive, setMobileTextEntryActive] = useState(false);
    const [proofProceedPromptDismissed, setProofProceedPromptDismissed] = useState(false);
    const [appHeaderHeight, setAppHeaderHeight] = useState(0);
    const [selectedPricingOpen, setSelectedPricingOpen] = useState(false);
    const [noteExpanded, setNoteExpanded] = useState(false);
    const [categoryCardExpanded, setCategoryCardExpanded] = useState(true);
    const [mobileSpotlightExpanded, setMobileSpotlightExpanded] = useState(true);
    const [mobileSpotlightCollapseQueued, setMobileSpotlightCollapseQueued] = useState(false);
    const [noteDraftTone, setNoteDraftTone] = useState("friendly");
    const [noteDraftCollapsed, setNoteDraftCollapsed] = useState(true);
    const [optionalDetailsExpanded, setOptionalDetailsExpanded] = useState(false);
    const [templatePickerDoneReady, setTemplatePickerDoneReady] = useState(false);
    const [flowFeedback, setFlowFeedback] = useState("");
    const [noteDraftFeedback, setNoteDraftFeedback] = useState("");
    const [noteDraftDirty, setNoteDraftDirty] = useState(false);
    const [noteDraftEditorText, setNoteDraftEditorText] = useState("");
    const [supportRailState, setSupportRailState] = useState({
        hasOverflow: false,
        canScrollLeft: false,
        canScrollRight: false,
    });
    const [desktopFloatingRailBounds, setDesktopFloatingRailBounds] = useState({
        left: 0,
        width: 0,
        height: 0,
    });
    const [desktopFloatingProgressBounds, setDesktopFloatingProgressBounds] = useState({
        left: 0,
        width: 0,
    });
    const [desktopFloatingToxiBounds, setDesktopFloatingToxiBounds] = useState({
        left: 0,
        top: 0,
        width: 0,
    });

    const [isCompactRailViewport, setIsCompactRailViewport] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth <= CREATE_FLOW_COMPACT_VIEWPORT_MAX_WIDTH;
    });

    const fileInputRef = useRef(null);
    const serviceGridRef = useRef(null);
    const templatePickerSupportSwitchRef = useRef(null);
    const pricingTiersRef = useRef(null);
    const templateModelRef = useRef(null);
    const categorySectionRef = useRef(null);
    const coreSectionRef = useRef(null);
    const locationSectionRef = useRef(null);
    const noteFieldRef = useRef(null);
    const titleFieldRef = useRef(null);
    const noteShellRef = useRef(null);
    const pickupFieldRef = useRef(null);
    const dropoffFieldRef = useRef(null);
    const progressCardRef = useRef(null);
    const introClusterRef = useRef(null);
    const summaryRef = useRef(null);
    const extraNotesRef = useRef(null);
    const selectedPricingCardRef = useRef(null);
    const templateListRef = useRef(null);
    const createRailRef = useRef(null);
    const createRailInnerRef = useRef(null);
    const summaryCardRef = useRef(null);
    const createMainRef = useRef(null);
    const selectedErrandMapRef = useRef(null);

    const prevPaymentModalOpenRef = useRef(false);
    const prevNoteExpandedRef = useRef(false);
    const prevAssistantOpenRef = useRef(Boolean(assistantOpen));

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const update = () =>
            setIsCompactRailViewport(
                window.innerWidth <= CREATE_FLOW_COMPACT_VIEWPORT_MAX_WIDTH,
            );
        update();
        window.addEventListener("resize", update);
        window.addEventListener("orientationchange", update);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("orientationchange", update);
        };
    }, []);

    const mobileFloatingProgressEligible = Boolean(
        mode === "create" && (isMobile || isCompactRailViewport),
    );
    const desktopFloatingProgressEligible = Boolean(
        mode === "create" && !isMobile && !isCompactRailViewport,
    );

    const desktopFloatingRailVisible = Boolean(
        desktopFloatingProgressEligible &&
            stickyProgressVisible &&
            !receiptOverlayOpen &&
            !checkoutOpened &&
            !paymentModalOpen &&
            !mobileCheckoutSheetOpen &&
            !templatePickerOpen &&
            !categoryDrawerOpen &&
            !attachmentsSheetOpen &&
            !extraNotesSheetOpen,
    );

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        if (!desktopFloatingRailVisible) {
            setDesktopFloatingRailBounds({ left: 0, width: 0, height: 0 });
            return undefined;
        }

        let rafId = 0;
        const updateBounds = () => {
            const rail = createRailInnerRef.current || createRailRef.current;
            const summary = summaryCardRef.current;
            if (!rail && !summary) return;
            const railRect = rail?.getBoundingClientRect?.();
            const summaryRect = summary?.getBoundingClientRect?.();
            const viewportWidth = Math.max(0, window.innerWidth || 0);
            const margin = 16;
            const rawLeft = Math.round(summaryRect?.left ?? railRect?.left ?? 0);
            const rawWidth = Math.round(summaryRect?.width ?? railRect?.width ?? 0);
            const width = Math.max(
                300,
                Math.min(rawWidth, Math.max(300, viewportWidth - margin * 2)),
            );
            const left = Math.min(
                Math.max(margin, rawLeft),
                Math.max(margin, viewportWidth - margin - width),
            );
            setDesktopFloatingRailBounds({
                left,
                width,
                height: Math.max(0, Math.round(railRect?.height ?? summaryRect?.height ?? 0)),
            });
        };

        const scheduleUpdate = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = 0;
                updateBounds();
            });
        };

        scheduleUpdate();
        window.addEventListener("resize", scheduleUpdate);
        window.addEventListener("orientationchange", scheduleUpdate);

        return () => {
            window.removeEventListener("resize", scheduleUpdate);
            window.removeEventListener("orientationchange", scheduleUpdate);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [desktopFloatingRailVisible]);

    const desktopFloatingRailActive = Boolean(
        desktopFloatingRailVisible &&
            desktopFloatingRailBounds.width > 0,
    );

    const errandsCompactLayout = Boolean(!isMobile && isCompactRailViewport);
    const reduceDashboardMotion = Boolean(isMobile || isCompactRailViewport);

    const floatingProgressBoundsVisible = Boolean(
        stickyProgressVisible &&
            (desktopFloatingProgressEligible || mobileFloatingProgressEligible),
    );

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        if (!floatingProgressBoundsVisible) {
            setDesktopFloatingProgressBounds({ left: 0, width: 0 });
            return undefined;
        }

        let rafId = 0;
        const updateBounds = () => {
            const progressCard = progressCardRef.current || introClusterRef.current;
            if (!progressCard) return;
            const rect = progressCard.getBoundingClientRect();
            setDesktopFloatingProgressBounds({
                left: Math.max(16, Math.round(rect.left)),
                width: Math.max(320, Math.round(rect.width || 0)),
            });
        };

        const scheduleUpdate = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = 0;
                updateBounds();
            });
        };

        scheduleUpdate();
        window.addEventListener("resize", scheduleUpdate);
        window.addEventListener("orientationchange", scheduleUpdate);

        return () => {
            window.removeEventListener("resize", scheduleUpdate);
            window.removeEventListener("orientationchange", scheduleUpdate);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [floatingProgressBoundsVisible]);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        if (!desktopFloatingRailVisible) {
            setDesktopFloatingToxiBounds({ left: 0, top: 0, width: 0 });
            return undefined;
        }

        let rafId = 0;
        const updateBounds = () => {
            const main = createMainRef.current;
            if (!main) return;

            const rect = main.getBoundingClientRect();
            const viewportWidth = Math.max(0, window.innerWidth || 0);
            const viewportHeight = Math.max(0, window.innerHeight || 0);
            const headerHeight = Math.max(0, Math.round(Number(appHeaderHeight) || 0));
            const margin = 16;
            const width = Math.max(
                260,
                Math.min(320, Math.round(Math.max(280, rect.width * 0.38))),
            );
            const left = Math.min(
                Math.max(margin, Math.round(rect.right - width - 18)),
                Math.max(margin, viewportWidth - margin - width),
            );
            const minTop = Math.max(headerHeight + 118, 172);
            const preferredTop = Math.round(minTop + 34);
            const top = Math.min(
                preferredTop,
                Math.max(minTop, viewportHeight - 300),
            );

            setDesktopFloatingToxiBounds({ left, top, width });
        };

        const scheduleUpdate = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = 0;
                updateBounds();
            });
        };

        scheduleUpdate();
        window.addEventListener("resize", scheduleUpdate);
        window.addEventListener("orientationchange", scheduleUpdate);

        return () => {
            window.removeEventListener("resize", scheduleUpdate);
            window.removeEventListener("orientationchange", scheduleUpdate);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [appHeaderHeight, desktopFloatingRailVisible]);

    useEffect(() => {
        if (process.env.NODE_ENV === "production") return;
        try {
            const key = "__EB_SERVICE_CATALOG_V2_VALIDATED__";
            const holder = typeof window !== "undefined" ? window : null;
            if (holder && holder[key]) return;
            if (holder) holder[key] = true;
            validateServiceCatalogV2();
        } catch {
            // ignore
        }
    }, []);

    const toxiAssistEnabled =
        typeof toxiEnabledProp === "boolean" ? toxiEnabledProp : toxiAssistEnabledLocal;
    const shouldSuppressFlowFeedback = Boolean(isMobile || isCompactRailViewport);
    const allowExpandableNoteField = true;
    const resolvedViewportBottomInsetPx = Math.max(0, Number(viewportBottomInsetPx) || 0);
    const resolvedHeaderHeightPx = Math.max(0, Math.round(Number(appHeaderHeight) || 0));
    let resolvedFloatingHeaderHeightPx = resolvedHeaderHeightPx;
    if (!resolvedFloatingHeaderHeightPx && typeof document !== "undefined") {
        try {
            const header =
                document.querySelector(".eb-app-header") ||
                document.querySelector(".client-dashboard-header") ||
                document.querySelector(".app-header");
            if (header && typeof header.getBoundingClientRect === "function") {
                const rect = header.getBoundingClientRect();
                resolvedFloatingHeaderHeightPx = Math.max(
                    0,
                    Math.round(rect.bottom || rect.height || 0),
                );
            }
        } catch {
            resolvedFloatingHeaderHeightPx = resolvedHeaderHeightPx;
        }
    }
    const shellStyle =
        resolvedViewportBottomInsetPx || resolvedHeaderHeightPx
            ? {
                ...(resolvedViewportBottomInsetPx
                    ? { "--ebv2-bottomInset": `${resolvedViewportBottomInsetPx}px` }
                    : null),
                ...(resolvedHeaderHeightPx
                    ? { "--ebv2-headerH": `${resolvedHeaderHeightPx}px` }
                    : null),
            }
            : undefined;
    const setToxiAssistEnabled = (next) => {
        const resolved = Boolean(next);
        if (onToxiEnabledChange) {
            onToxiEnabledChange(resolved);
            return;
        }
        setToxiAssistEnabledLocal(resolved);
    };

    useEffect(() => {
        // Manual review requests should not carry into guided mode.
        if (toxiAssistEnabled) setManualReviewRequested(false);
    }, [toxiAssistEnabled]);

    useEffect(() => {
        // Keep per-session create-mode affordances scoped to create.
        if (mode !== "create") setManualReviewRequested(false);
    }, [mode]);

    useEffect(() => {
        const wasOpen = prevAssistantOpenRef.current;
        const isOpen = Boolean(assistantOpen);
        prevAssistantOpenRef.current = isOpen;

        if (mode !== "create" || toxiAssistEnabled) return;
        if (wasOpen === isOpen) return;

        if (isOpen) {
            setManualReviewRequested(false);
            return;
        }

        if (wasOpen && !isOpen) {
            setManualReviewRequested(true);
        }
    }, [assistantOpen, mode, toxiAssistEnabled]);

    const resolvedSelectedFiles = Array.isArray(selectedFiles) ? selectedFiles : [];

    const resolvedTitle = String(title || "").trim();
    const hasTitle = Boolean(resolvedTitle);
    const hasPickup = Boolean(String(pickup || "").trim());
    const hasDropoff = Boolean(String(dropoff || "").trim());
    const hasErrandNote = Boolean(String(note || "").trim());
    const hasNotes = Boolean(String(accessNotes || "").trim());
    const optionalDetailsSelectedCount =
        (resolvedSelectedFiles.length ? 1 : 0) + (hasNotes ? 1 : 0);
    const optionalDetailsSummaryLabel = optionalDetailsSelectedCount
        ? `${optionalDetailsSelectedCount} added`
        : "Optional";

    const resolvedRegionKey = regionKey || "uk";
    const resolvedRegion =
        REGION_OPTIONS.find((r) => r.key === resolvedRegionKey) || REGION_OPTIONS[0];
    const currency = resolvedRegion.currency;

    const rawTemplateName = String(templateName || "").trim();
    const resolvedTemplateName = rawTemplateName ? rawTemplateName : "";
    const resolvedTemplate = useMemo(
        () => findTemplateByName(resolvedTemplateName),
        [resolvedTemplateName],
    );

    const fallbackCategoryFromLane = useMemo(() => {
        if (!serviceKey) return null;
        return CATALOG_CATEGORIES.find((c) => c.laneKey === serviceKey)?.key || null;
    }, [serviceKey]);

    const resolvedCatalogCategoryKey =
        catalogCategoryKey || resolvedTemplate?.categoryKey || fallbackCategoryFromLane || null;
    const isFamilyEmergencyFlow =
        resolvedCatalogCategoryKey === "family" || String(serviceKey || "").trim() === "familyEmergency";
    const startLocationRequired = !isFamilyEmergencyFlow;
    const hasRequiredPickup = startLocationRequired ? hasPickup : true;
    const startLocationFieldLabel = "Starting Point";
    const endLocationFieldLabel = "Ending Point";
    const preferredTimeLabel = "Preferred time";
    const startLocationRequirementCopy = startLocationRequired
        ? "Starting point required • Ending point optional"
        : "Starting point optional • Ending point optional";
    const preferredTimeOptions = [
        { value: "asap", label: "ASAP", compactLabel: "ASAP" },
        { value: "today", label: "Today", compactLabel: "Today" },
        { value: "schedule_later", label: "Schedule Later", compactLabel: "Later" },
        { value: "flexible", label: "Flexible", compactLabel: "Flexible" },
        ...(!isFamilyEmergencyFlow
            ? [{ value: "recurring", label: "Repeat Weekly", compactLabel: "Repeat" }]
            : []),
    ];
    const recurringTimingSelected = preferredTime === "recurring";
    const oneTimeTimingSelected = ["today", "schedule_later", "flexible"].includes(
        String(preferredTime || "").trim(),
    );
    const hasScheduledWindow =
        String(scheduleType || "").toLowerCase() === "one_time" && String(scheduleSummary || "").trim();
    const recurringScheduleSummary = formatRecurringScheduleSummary({
        recurringFrequency,
        recurringDays,
        recurringTime,
    });
    const selectedPreferredTimeLabel = String(preferredTime || "").trim()
        ? recurringTimingSelected
            ? recurringScheduleSummary
            : oneTimeTimingSelected && hasScheduledWindow
                ? String(scheduleSummary || "").trim()
            : preferredTimeOptions.find((option) => option.value === preferredTime)?.label || preferredTime
        : describeSchedule({ scheduleType, scheduleSummary });
    const scheduleCardVisible = recurringTimingSelected || oneTimeTimingSelected || hasScheduledWindow;
    const scheduleCardTitle = recurringTimingSelected
        ? "Repeat regularly"
        : preferredTime === "today"
            ? "Today"
            : "Date & time";
    const scheduleCardSummary = recurringTimingSelected
        ? recurringScheduleSummary
        : hasScheduledWindow
            ? String(scheduleSummary || "").trim()
            : preferredTime === "today"
                ? "Pick a time window for today"
                : preferredTime === "flexible"
                    ? "Add a calendar preference if you already know the best date or time"
                    : "Pick a future date and time";
    const scheduleCardActionLabel = recurringTimingSelected
        ? "Use a one-time date instead"
        : hasScheduledWindow
            ? "Change schedule"
            : preferredTime === "today"
                ? "Choose today"
                : preferredTime === "flexible"
                    ? "Add calendar preference"
                    : "Open calendar";

    // Template selection can become stale when switching categories that share a pricing lane.
    // Only treat the template as selected if it belongs to the active category.
    const templateMatchesCategory = Boolean(
        resolvedTemplateName &&
            resolvedTemplate?.categoryKey &&
            resolvedCatalogCategoryKey &&
            resolvedTemplate.categoryKey === resolvedCatalogCategoryKey,
    );
    const effectiveTemplateName = templateMatchesCategory ? resolvedTemplateName : "";
    const effectiveTemplate = templateMatchesCategory ? resolvedTemplate : null;
    const effectiveTemplateId = effectiveTemplate?.id ? String(effectiveTemplate.id) : null;
    const isAirportVehicleFlow =
        resolvedCatalogCategoryKey === "airport" ||
        [
            "airport_pickup_assistance",
            "travel_airport_assistance",
            "driver_pickup_verification",
            "baggage_document_handoff",
            "hotel_hospitality",
        ].includes(String(effectiveTemplateId || ""));

    const supportTypeOptions = useMemo(() => {
        if (!isAirportVehicleFlow) return BASE_SUPPORT_TYPE_OPTIONS;
        return [
            {
                id: "car_support",
                label: "Car",
                hint: "Best for airport pickups, luggage, and passenger transport.",
            },
            {
                id: "flexible",
                label: "Flexible vehicle",
                hint: "We choose the best available vehicle for the airport pickup.",
            },
        ];
    }, [isAirportVehicleFlow]);

    const supportTypeQuestionLabel = isAirportVehicleFlow ? "Vehicle type" : "Support type";

    const announceFlowFeedback = (message) => {
        const next = String(message || "").trim();
        if (!next) return;
        if (shouldSuppressFlowFeedback) return;
        setFlowFeedback("");
        if (typeof window === "undefined") {
            setFlowFeedback(next);
            return;
        }
        window.requestAnimationFrame(() => setFlowFeedback(next));
    };

    useEffect(() => {
        if (!supportTypeOptions.some((option) => option.id === supportType)) {
            onSupportTypeChange?.(isAirportVehicleFlow ? "flexible" : "standard_assistance");
        }
    }, [isAirportVehicleFlow, onSupportTypeChange, supportType, supportTypeOptions]);

    const handlePreferredTimeSelect = (value) => {
        const nextValue = String(value || "asap");
        onPreferredTimeChange?.(nextValue);
        const selectedOption = preferredTimeOptions.find((option) => option.value === nextValue);
        announceFlowFeedback(`Timing set: ${selectedOption?.label || nextValue.replace(/_/g, " ")}`);

        if (nextValue === "asap") {
            onScheduleTypeChange?.("now");
            onClearSchedule?.();
            return;
        }

        if (nextValue === "recurring") {
            onScheduleTypeChange?.("recurring");
            onClearSchedule?.();
            return;
        }

        onScheduleTypeChange?.("one_time");
        if (nextValue === "today" || nextValue === "schedule_later") {
            onOpenSchedule?.(nextValue === "today" ? "today" : "future");
        }
    };

    const handleRecurringDayToggle = (day) => {
        const value = String(day || "").trim();
        if (!value) return;
        const current = Array.isArray(recurringDays) ? recurringDays : [];
        const nextDays = current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value];
        onRecurringDaysChange?.(nextDays);
    };

    const handleNoteFieldBlur = () => {
        const pickupTrimmed = String(pickup || "").trim();
        const noteTrimmed = String(note || "").trim();

        if (allowExpandableNoteField) {
            setNoteExpanded(false);
            if (!noteTrimmed || pickupTrimmed.length >= 3) return;

            window.setTimeout(() => {
                setLocationTimingCollapsed(false);
                scrollRefIntoView(locationSectionRef, { block: "start" });
            }, 120);
            return;
        }
        if (!noteTrimmed || pickupTrimmed.length >= 3) return;

        window.setTimeout(() => {
            setLocationTimingCollapsed(false);
            scrollRefIntoView(locationSectionRef, { block: "start" });
        }, 120);
    };

    const noteDraftTemplateTitle = useMemo(
        () => (effectiveTemplateName ? formatTemplateTitle(effectiveTemplateName) : ""),
        [effectiveTemplateName],
    );

    const noteDraftFields = useMemo(() => {
        const catalogFields = Array.isArray(effectiveTemplate?.builderFields)
            ? effectiveTemplate.builderFields
                .map((field) => String(field || "").trim())
                .filter(Boolean)
            : [];

        const baseFields = [
            startLocationFieldLabel,
            `${endLocationFieldLabel} (optional)`,
            preferredTimeLabel,
            "Key instructions",
        ];
        return [...new Set([...catalogFields, ...baseFields])];
    }, [effectiveTemplate, endLocationFieldLabel, preferredTimeLabel, startLocationFieldLabel]);

    const noteDraftScaffoldText = useMemo(() => {
        if (!noteDraftTemplateTitle) return "";
        const body = noteDraftFields.map((label) => `${label}:`).join("\n");
        return `${noteDraftTemplateTitle} Details.\n-------------------------\n${body}`;
    }, [noteDraftFields, noteDraftTemplateTitle]);

    const noteDraftIsScaffoldish = useMemo(() => {
        const trimmed = String(note || "").trim();
        if (!trimmed) return false;
        if (!noteDraftTemplateTitle) return false;
        const header = `${noteDraftTemplateTitle} Details.`;
        if (trimmed === String(noteDraftScaffoldText || "").trim()) return true;
        return trimmed.startsWith(header) && trimmed.includes("-------------------------");
    }, [note, noteDraftScaffoldText, noteDraftTemplateTitle]);

    const noteDraftGeneratedText = useMemo(() => {
        if (!noteDraftTemplateTitle) return "";

        const buildLine = (label) => {
            const cleaned = String(label || "").trim();
            if (!cleaned) return "";
            if (noteDraftTone === "checklist") return `- ${cleaned}:`;
            return `${cleaned}:`;
        };

        const lines = noteDraftFields.map(buildLine).filter(Boolean);

        if (noteDraftTone === "checklist") {
            return `${noteDraftTemplateTitle} - checklist\n${lines.join("\n")}`;
        }

        if (noteDraftTone === "pro") {
            return `Task: ${noteDraftTemplateTitle}\n\n${lines.join("\n")}`;
        }

        // friendly (default)
        return `Hi! Please help with ${noteDraftTemplateTitle}.\n\n${lines.join("\n")}\n\nThanks!`;
    }, [noteDraftFields, noteDraftTemplateTitle, noteDraftTone]);

    const prevNoteDraftTemplateIdRef = useRef(null);

    useEffect(() => {
        // Template change should always reset the editor (new fields, new context).
        // But changes to the generated text (tone/fields) should NOT wipe a user's custom edits.
        const prevTemplateId = prevNoteDraftTemplateIdRef.current;
        prevNoteDraftTemplateIdRef.current = effectiveTemplateId || null;

        if (!effectiveTemplateId) {
            setNoteDraftEditorText("");
            setNoteDraftDirty(false);
            return;
        }

        if (prevTemplateId === effectiveTemplateId) return;

        setNoteDraftEditorText(noteDraftGeneratedText);
        setNoteDraftDirty(false);
    }, [effectiveTemplateId, noteDraftGeneratedText]);

    useEffect(() => {
        // Tone changes should update the editor only when the user hasn't customized it.
        if (!effectiveTemplateId) return;
        if (noteDraftDirty) return;
        setNoteDraftEditorText(noteDraftGeneratedText);
    }, [effectiveTemplateId, noteDraftDirty, noteDraftGeneratedText]);

    // Intentionally do not auto-open the AI suggestion panel.
    // Users can expand it via the Show/Hide toggle.

    const focusNoteField = () => {
        setNoteExpanded(true);
        window.setTimeout(() => {
            try {
                noteFieldRef.current?.focus?.();
            } catch {
                // ignore
            }
        }, 0);
    };

    const handleReplaceNoteWithDraft = () => {
        const draft = String(noteDraftEditorText || "").trim();
        if (!draft) return;
        onNoteChange?.(draft);
        setNoteDraftFeedback("Draft added");
        focusNoteField();
        window.setTimeout(() => setNoteDraftFeedback(""), 1200);
    };

    const handleAppendDraftToNote = () => {
        const draft = String(noteDraftEditorText || "").trim();
        if (!draft) return;
        const prev = String(note || "").trim();
        const next = prev ? `${prev}\n\n${draft}` : draft;
        onNoteChange?.(next);
        setNoteDraftFeedback("Appended");
        focusNoteField();
        window.setTimeout(() => setNoteDraftFeedback(""), 1200);
    };

    const handleInsertDraftField = (label) => {
        const cleaned = String(label || "").trim();
        if (!cleaned) return;
        const line = noteDraftTone === "checklist" ? `- ${cleaned}:` : `${cleaned}:`;
        setNoteDraftEditorText((prevRaw) => {
            const prev = String(prevRaw || "").trim();
            const needsNewline = prevRaw.length > 0 && !String(prevRaw).endsWith("\n");
            return prev ? `${prev}${needsNewline ? "\n" : ""}${line}` : line;
        });
        setNoteDraftDirty(true);
    };

    const handleCopyDraft = async () => {
        const draft = String(noteDraftEditorText || "").trim();
        if (!draft) return;
        const ok = await copyToClipboard(draft);
        setNoteDraftFeedback(ok ? "Copied" : "Copy failed");
        window.setTimeout(() => setNoteDraftFeedback(""), 1200);
    };

    const handleResetDraftEditor = () => {
        setNoteDraftEditorText(noteDraftGeneratedText);
        setNoteDraftDirty(false);
        setNoteDraftFeedback("Reset");
        window.setTimeout(() => setNoteDraftFeedback(""), 1200);
    };

    const handleClearDraftEditor = () => {
        setNoteDraftEditorText("");
        setNoteDraftDirty(true);
        setNoteDraftFeedback("Cleared");
        window.setTimeout(() => setNoteDraftFeedback(""), 1200);
    };

    const handleLoadCurrentNoteIntoDraft = () => {
        const current = String(note || "").trim();
        setNoteDraftEditorText(current);
        setNoteDraftDirty(true);
        setNoteDraftFeedback(current ? "Loaded" : "Empty");
        window.setTimeout(() => setNoteDraftFeedback(""), 1200);
    };

    // Proof/receipt is an explicit user opt-in. Do not auto-toggle it when changing templates.
    const resolvedCategory = useMemo(() => {
        if (!resolvedCatalogCategoryKey) return null;
        return (
            CATALOG_CATEGORIES.find((c) => c.key === resolvedCatalogCategoryKey) ||
            null
        );
    }, [resolvedCatalogCategoryKey]);

    const spotlightCategory = isMobile
        ? resolvedCategory || (Array.isArray(CATALOG_CATEGORIES) ? CATALOG_CATEGORIES[0] : null) || null
        : null;
    const spotlightMeta = spotlightCategory ? CATEGORY_BROWSE_META[spotlightCategory.key] || null : null;
    const categoryTemplates = useMemo(() => {
        if (!resolvedCatalogCategoryKey) return [];
        const list = getTemplatesForCategory(resolvedCatalogCategoryKey);
        const cleaned = (Array.isArray(list) ? list : []).filter((tpl) => {
            const name = String(tpl?.name || "").trim();
            return Boolean(name);
        });
        return cleaned;
    }, [resolvedCatalogCategoryKey]);
    const assistTemplateNames = useMemo(
        () => categoryTemplates.map((tpl) => String(tpl?.name || "").trim()).filter(Boolean),
        [categoryTemplates],
    );

    const categorySelectionComplete = Boolean(
        resolvedCatalogCategoryKey && String(effectiveTemplateName || "").trim(),
    );
    const prevCategorySelectionCompleteRef = useRef(false);

    useEffect(() => {
        // Before selection: keep the category card fully expanded.
        if (!categorySelectionComplete) {
            setCategoryCardExpanded(true);
            prevCategorySelectionCompleteRef.current = false;
            return;
        }

        // After the user completes category + template selection, collapse by default once.
        if (!prevCategorySelectionCompleteRef.current && categorySelectionComplete) {
            setCategoryCardExpanded(false);
        }
        prevCategorySelectionCompleteRef.current = categorySelectionComplete;
    }, [categorySelectionComplete]);

    useEffect(() => {
        if (!String(effectiveTemplateName || "").trim()) {
            setMobileSpotlightExpanded(true);
            setMobileSpotlightCollapseQueued(false);
        }
    }, [effectiveTemplateName]);

    useEffect(() => {
        if (!mobileSpotlightCollapseQueued) return undefined;
        if (templatePickerOpen) return undefined;

        if (typeof window === "undefined") {
            setMobileSpotlightExpanded(false);
            setMobileSpotlightCollapseQueued(false);
            return undefined;
        }

        const id = window.setTimeout(() => {
            setMobileSpotlightExpanded(false);
            setMobileSpotlightCollapseQueued(false);
        }, 140);

        return () => window.clearTimeout(id);
    }, [mobileSpotlightCollapseQueued, templatePickerOpen]);

    const mobileCatalogRailCategories = useMemo(() => {
        const categories = Array.isArray(CATALOG_CATEGORIES) ? CATALOG_CATEGORIES.filter(Boolean) : [];
        const baseSlice = MOBILE_CATALOG_PRIORITY_CATEGORY_KEYS.map((key) =>
			categories.find((category) => category?.key === key),
		).filter(Boolean);

        if (!resolvedCatalogCategoryKey) return baseSlice;
        if (baseSlice.some((category) => category?.key === resolvedCatalogCategoryKey)) return baseSlice;

        const selectedCategory = categories.find((category) => category?.key === resolvedCatalogCategoryKey);
        if (!selectedCategory) return baseSlice;
        if (baseSlice.length < MOBILE_CATALOG_PRIORITY_CATEGORY_KEYS.length) return [...baseSlice, selectedCategory];

        return [...baseSlice.slice(0, MOBILE_CATALOG_PRIORITY_CATEGORY_KEYS.length - 1), selectedCategory];
    }, [resolvedCatalogCategoryKey]);

    const resolvedTierKey = String(tierKey || "standard").toLowerCase();
    const resolvedTier = TIER_BY_KEY[resolvedTierKey] || TIER_BY_KEY.standard;
    const resolvedTierOneLine = resolvedTier?.bestFor || resolvedTier?.summary || "";

    const activeTierConfirmationToken = useMemo(
        () =>
            buildTierConfirmationToken({
                serviceKey,
                templateId: effectiveTemplateId,
                regionKey: resolvedRegionKey,
                tierKey: resolvedTierKey,
            }),
        [effectiveTemplateId, resolvedRegionKey, resolvedTierKey, serviceKey],
    );
    const tierConfirmed = tierConfirmedToken === activeTierConfirmationToken;
    const resolvedTierPrice = useMemo(() => {
        if (!serviceKey) return null;
        return formatFromPrice({
            pricesByLane,
            laneKey: serviceKey,
            currencyKey: currency,
            tierKey: resolvedTierKey,
        });
    }, [currency, pricesByLane, resolvedTierKey, serviceKey]);

    useEffect(() => {
        setExpandedTierKey(null);
        setTierConfirmedToken("");
        setPendingScrollToPricing(false);
        setPendingOpenTemplatePickerAfterPricingScroll(false);
        setPendingScrollToSmart(false);
        setSelectedPricingOpen(false);
    }, [resolvedCatalogCategoryKey, serviceKey]);

    useEffect(() => {
        if (!templatePickerOpen) return undefined;
        return acquireBodyScrollLock();
    }, [templatePickerOpen]);

    useEffect(() => {
        if (!categoryDrawerOpen) return undefined;
        return acquireBodyScrollLock();
    }, [categoryDrawerOpen]);

    useEffect(() => {
        if (!attachmentsSheetOpen) return undefined;
        return acquireBodyScrollLock();
    }, [attachmentsSheetOpen]);

    useEffect(() => {
        if (!extraNotesSheetOpen) return undefined;
        return acquireBodyScrollLock();
    }, [extraNotesSheetOpen]);

    useEffect(() => {
        if (!templatePickerOpen) return undefined;
        if (typeof window === "undefined") return undefined;

        const id = window.setTimeout(() => {
            const list = templateListRef.current;
            if (!list) return;

            const search = String(templateSearch || "").trim();
            const shouldAutoScrollToSelected = !search;

            if (shouldAutoScrollToSelected && effectiveTemplateName) {
                try {
                    const selectedEl = list.querySelector(
                        '[data-template-selected="true"]',
                    );
                    if (selectedEl) {
                        const elTop = Math.max(0, selectedEl.offsetTop || 0);
                        const elHeight = Math.max(0, selectedEl.offsetHeight || 0);
                        const viewHeight = Math.max(0, list.clientHeight || 0);
                        const maxScroll = Math.max(0, (list.scrollHeight || 0) - viewHeight);
                        const target = Math.max(
                            0,
                            Math.round(elTop - Math.max(0, (viewHeight - elHeight) / 2)),
                        );
                        list.scrollTop = Math.min(target, maxScroll);
                        return;
                    }
                } catch {
                    // ignore
                }
            }

            try {
                list.scrollTop = 0;
            } catch {
                // ignore
            }
        }, 90);

        return () => window.clearTimeout(id);
    }, [effectiveTemplateName, resolvedCatalogCategoryKey, templatePickerOpen, templateSearch]);

    useEffect(() => {
        if (!templatePickerOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event?.key === "Escape") setTemplatePickerOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [templatePickerOpen]);

    useEffect(() => {
        if (!categoryDrawerOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event?.key === "Escape") setCategoryDrawerOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [categoryDrawerOpen]);

    useEffect(() => {
        if (!attachmentsSheetOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event?.key === "Escape") setAttachmentsSheetOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [attachmentsSheetOpen]);

    useEffect(() => {
        if (!extraNotesSheetOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event?.key === "Escape") setExtraNotesSheetOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [extraNotesSheetOpen]);

    useEffect(() => {
        setSelectedPricingOpen(false);
    }, [resolvedTierKey]);

    // NOTE: template picker scroll handling is centralized in the effect above.

    useEffect(() => {
        if (!pendingScrollToTemplateAndPricing) return;
        if (typeof window === "undefined") return;

        // Only apply this guided jump on smaller screens (mobile/compact) where
        // the Template + Pricing tiers stack can be hard to find after selection.
        if (!(isMobile || isCompactRailViewport)) {
            setPendingScrollToTemplateAndPricing(false);
            return;
        }

        // Ensure we're on the Catalog tab so the Template/Pricing blocks are visible.
        if (builderTab !== "catalog") {
            setBuilderTab("catalog");
            return;
        }

        // Prefer scrolling to the Template block so both Template + Pricing tiers
        // are visible in the viewport, similar to the requested "Image 2".
        const targetRef = templateModelRef.current ? templateModelRef : pricingTiersRef;
        if (!targetRef?.current) return;

        setPendingScrollToTemplateAndPricing(false);
        const id = window.setTimeout(() => {
            scrollRefIntoView(targetRef, { block: "start" });
        }, 60);

        return () => window.clearTimeout(id);
    }, [
        builderTab,
        isCompactRailViewport,
        isMobile,
        pendingScrollToTemplateAndPricing,
    ]);

    useEffect(() => {
        if (!pendingScrollToPricing) return;
        if (!serviceKey) return;
        const el = pricingTiersRef.current;
        if (!el) return;
        setPendingScrollToPricing(false);
        scrollRefIntoView(pricingTiersRef);

        // Category selection flow: scroll to pricing tiers first, then open the picker.
        if (pendingOpenTemplatePickerAfterPricingScroll) {
            setPendingOpenTemplatePickerAfterPricingScroll(false);
            window.setTimeout(() => setTemplatePickerOpen(true), 80);
        }
    }, [pendingOpenTemplatePickerAfterPricingScroll, pendingScrollToPricing, serviceKey, appHeaderHeight, isMobile]);

    useEffect(() => {
        if (!pendingScrollToSmart) return;
        if (builderTab !== "smart") return;
        setPendingScrollToSmart(false);
        const targetRef = categorySectionRef;
        scrollRefIntoView(targetRef, { block: "start" });
    }, [builderTab, pendingScrollToSmart]);

    useEffect(() => {
        setCheckoutOpened(false);
    }, [mode]);

    useEffect(() => {
        // Always start collapsed when switching surfaces.
        setArchivedErrandsExpanded(false);
        setLiveErrandsExpanded(false);
        setNoteExpanded(false);
        setLocationTimingCollapsed(false);
        setDropoffOpen(false);
        setOptionalDetailsExpanded(false);
        setAttachmentsSheetOpen(false);
        setExtraNotesSheetOpen(false);
    }, [mode]);

    useEffect(() => {
        // If the required start location is cleared, ensure the module stays expanded.
        if (hasPickup) return;
        setLocationTimingCollapsed(false);
    }, [hasPickup]);

    useEffect(() => {
        if (!noteExpanded) return undefined;
        const handlePointerDown = (event) => {
            const el = noteShellRef.current;
            if (!el) return;
            const target = event?.target;
            if (target && el.contains(target)) return;
            setNoteExpanded(false);
        };
        const handleKeyDown = (event) => {
            if (event?.key === "Escape") setNoteExpanded(false);
        };

        window.addEventListener("pointerdown", handlePointerDown, true);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("pointerdown", handlePointerDown, true);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [noteExpanded]);

    useEffect(() => {
        if (!selectedPricingOpen) return undefined;
        const handlePointerDown = (event) => {
            const el = selectedPricingCardRef.current;
            if (!el) return;
            const target = event?.target;
            if (target && el.contains(target)) return;
            setSelectedPricingOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event?.key === "Escape") setSelectedPricingOpen(false);
        };

        // Capture phase to reliably detect click-away even if inner handlers stop propagation.
        window.addEventListener("pointerdown", handlePointerDown, true);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("pointerdown", handlePointerDown, true);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedPricingOpen]);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const updateHeaderHeight = () => {
            try {
                const header =
                    document.querySelector(".eb-app-header") ||
                    document.querySelector(".client-dashboard-header") ||
                    document.querySelector(".app-header");
                const height = header
                    ? Math.max(0, Math.round(header.getBoundingClientRect().height || 0))
                    : 0;
                setAppHeaderHeight(height);
            } catch {
                setAppHeaderHeight(0);
            }
        };

        updateHeaderHeight();
        window.addEventListener("resize", updateHeaderHeight);
        window.addEventListener("orientationchange", updateHeaderHeight);
        return () => {
            window.removeEventListener("resize", updateHeaderHeight);
            window.removeEventListener("orientationchange", updateHeaderHeight);
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        if (!(desktopFloatingProgressEligible || mobileFloatingProgressEligible)) {
            setStickyProgressVisible(false);
            return undefined;
        }

        // NOTE: Refs may be null on the first effect pass (initial mount). Do not bail early.
        // Keep the listeners active so the overlay can start responding as soon as the card mounts.

        // Goal:
        // - Do NOT show on initial load (keep hero + Toxi + inline progress clean)
        // - Show only after user scrolls past the intro cluster
        // - Keep floating until the user submits (opens checkout/payment)
        // - Hide again when scrolling back toward the top

        let lastStickyVisible = false;

        const getScrollParent = (node) => {
            try {
                let el = node?.parentElement || null;
                while (el && el !== document.body) {
                    const style = window.getComputedStyle(el);
                    const overflowY = style?.overflowY;
                    const isScrollable =
                        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
                        el.scrollHeight > el.clientHeight + 1;
                    if (isScrollable) return el;
                    el = el.parentElement;
                }
            } catch {
                // ignore
            }
            return null;
        };

        const getScrollTop = (scrollEl) => {
            if (!scrollEl || scrollEl === window) {
                const doc = document.scrollingElement || document.documentElement || document.body;
                return Number(doc?.scrollTop || 0);
            }
            return Number(scrollEl.scrollTop || 0);
        };

        const updateStickyProgressVisibility = (scrollEl) => {
            try {
                const progressEl = progressCardRef.current;
                if (!progressEl) {
                    setStickyProgressVisible(false);
                    return;
                }

                // Measure header bottom when possible (more accurate if the header is offset for safe-area).
                let headerBottom = Math.max(0, appHeaderHeight);
                try {
                    const headerEl =
                        document.querySelector(".eb-app-header") ||
                        document.querySelector(".client-dashboard-header") ||
                        document.querySelector(".app-header");
                    if (headerEl) {
                        const rect = headerEl.getBoundingClientRect();
                        headerBottom = Math.max(0, Math.round(rect.bottom || rect.height || headerBottom));
                    }
                } catch {
                    // ignore
                }

                const headerOffset = headerBottom + 12;
                const progressRect = progressEl.getBoundingClientRect();
                const scrollTop = getScrollTop(scrollEl);

                // Seamless handoff:
                // - When the inline Progress card reaches the header, show the floating overlay.
                // - Add a little hysteresis to avoid flicker when the user jitters near the threshold.
                const showThreshold = headerOffset + 2;
                const hideThreshold = headerOffset + 56;
                const reachedProgressCard =
                    progressRect.top <= (lastStickyVisible ? hideThreshold : showThreshold);
                const nearTop = scrollTop < 18;

                const nextVisible = reachedProgressCard && !nearTop;
                lastStickyVisible = nextVisible;
                setStickyProgressVisible(nextVisible);
            } catch {
                setStickyProgressVisible(false);
            }
        };

        const io = new IntersectionObserver(
            () => {
                // IMPORTANT: this screen can scroll inside an overflow container (Capacitor/app shell).
                // Always compute nearTop using the active scroll element, not just window.
                updateStickyProgressVisibility(scrollEl);
            },
            { threshold: [0, 0.01, 0.1, 0.2], rootMargin: `0px 0px -12% 0px` },
        );

        let summaryObserved = false;
        const ensureSummaryObserved = () => {
            if (summaryObserved) return;
            const el = summaryRef.current;
            if (!el) return;
            try {
                io.observe(el);
                summaryObserved = true;
            } catch {
                // ignore
            }
        };

        const initialScrollEl = progressCardRef.current ? getScrollParent(progressCardRef.current) : null;
        const scrollEl = initialScrollEl || window;

        let rafId = 0;
        const scheduleUpdate = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = 0;
                ensureSummaryObserved();
                updateStickyProgressVisibility(scrollEl);
            });
        };

        // IMPORTANT: some app shells scroll inside an overflow container, not the window.
        // Listen on the nearest scrollable parent as well as window for maximum compatibility.
        if (scrollEl && scrollEl !== window) {
            scrollEl.addEventListener("scroll", scheduleUpdate, { passive: true });
        }
        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);
        window.addEventListener("orientationchange", scheduleUpdate);
        ensureSummaryObserved();

        // Initial evaluation (supports refresh mid-scroll).
        scheduleUpdate();

        return () => {
            if (scrollEl && scrollEl !== window) {
                scrollEl.removeEventListener("scroll", scheduleUpdate);
            }
            window.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", scheduleUpdate);
            window.removeEventListener("orientationchange", scheduleUpdate);
            io.disconnect();
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [appHeaderHeight, desktopFloatingProgressEligible, mobileFloatingProgressEligible]);

    const ToxiTip = ({ children, when = true }) => {
        if (!showCreateFlowToxiAssist || !toxiAssistEnabled) return null;
        if (!when) return null;
        const text = String(children || "").trim();
        if (!text) return null;
        return (
            <div className="eb-clientv2__toxiTip" role="note">
                <span className="eb-clientv2__toxiTipIcon" aria-hidden="true">
                    <Sparkles size={14} />
                </span>
                <div className="eb-clientv2__toxiTipText">{text}</div>
            </div>
        );
    };
    const filteredErrands = useMemo(() => {
        const list = Array.isArray(errands) ? errands : [];
        const q = String(query || "").trim().toLowerCase();
        if (!q) return list;
        return list.filter((e) => {
            const ref = String(e?.referenceNumber || "").toLowerCase();
            const t = String(e?.title || "").toLowerCase();
            const p = String(e?.pickupLocation || "").toLowerCase();
            return ref.includes(q) || t.includes(q) || p.includes(q);
        });
    }, [errands, query]);

    const splitErrands = useMemo(() => {
        const list = Array.isArray(filteredErrands) ? filteredErrands : [];
        const live = [];
        const archived = [];
        for (const e of list) {
            if (isArchivedErrand(e)) archived.push(e);
            else live.push(e);
        }
        return { liveErrands: live, archivedErrands: archived };
    }, [filteredErrands]);

    const isSearchingErrands = String(query || "").trim().length > 0;
    const visibleLiveErrands = useMemo(() => {
        if (isSearchingErrands || liveErrandsExpanded) return splitErrands.liveErrands;
        return splitErrands.liveErrands.slice(0, 3);
    }, [isSearchingErrands, liveErrandsExpanded, splitErrands.liveErrands]);

    const visibleArchivedErrands = useMemo(() => {
        if (isSearchingErrands) return splitErrands.archivedErrands;
        if (archivedErrandsExpanded) return splitErrands.archivedErrands;
        return [];
    }, [archivedErrandsExpanded, isSearchingErrands, splitErrands.archivedErrands]);

    const selectedErrand = useMemo(() => {
        if (!selectedErrandId) return null;
        return (
            (filteredErrands || []).find((e) => String(e?.id) === String(selectedErrandId)) ||
            null
        );
    }, [filteredErrands, selectedErrandId]);

    useEffect(() => {
        if (mode !== "errands") return;
        if (!externalSelectedErrandId) return;
        setSelectedErrandId(String(externalSelectedErrandId));
    }, [externalSelectedErrandId, mode]);

    useEffect(() => {
        if (mode !== "errands") return;
        if (externalSelectedErrandId) return;

        const nextDefaultErrand =
            splitErrands.liveErrands[0] ||
            splitErrands.archivedErrands[0] ||
            null;

        if (!nextDefaultErrand?.id) {
            if (selectedErrandId) setSelectedErrandId(null);
            return;
        }

        if (selectedErrand?.id) return;

        setSelectedErrandId(String(nextDefaultErrand.id));
    }, [
        externalSelectedErrandId,
        mode,
        selectedErrand?.id,
        selectedErrandId,
        splitErrands.archivedErrands,
        splitErrands.liveErrands,
    ]);

    useEffect(() => {
        if (mode !== "errands") return;
        if (!selectedErrand?.id) return;
        onSelectedErrandChange?.(selectedErrand);
    }, [mode, onSelectedErrandChange, selectedErrand]);

    const selectedErrandTrackingInfo = selectedErrand?.id
        ? trackingStatusByErrand?.[selectedErrand.id] || trackingStatusByErrand?.[String(selectedErrand.id)] || null
        : null;

    const selectedErrandLiveMapVisible = useMemo(() => {
        const status = normalizeStatusKey(selectedErrand) || "submitted";
        return Boolean(
            selectedErrand?.id &&
                selectedErrandTrackingInfo?.tracking_allowed &&
                ["in_progress", "picked_up", "delivered"].includes(status) &&
                PilotTrackerComponent,
        );
    }, [PilotTrackerComponent, selectedErrand, selectedErrandTrackingInfo]);

    const selectedErrandTimeline = useMemo(
        () => buildSelectedErrandTimeline(selectedErrand),
        [selectedErrand],
    );

    useEffect(() => {
        if (mode !== "errands") return undefined;
        if (!focusLiveMapErrandId || !selectedErrandLiveMapVisible) return undefined;
        if (String(selectedErrand?.id || "") !== String(focusLiveMapErrandId)) return undefined;
        if (typeof window === "undefined") return undefined;

        const id = window.requestAnimationFrame(() => {
            scrollRefIntoView(selectedErrandMapRef, { block: "start" });
        });

        return () => window.cancelAnimationFrame(id);
    }, [focusLiveMapErrandId, mode, selectedErrand?.id, selectedErrandLiveMapVisible]);

    useEffect(() => {
        if (!copyFeedback) return undefined;
        const timer = window.setTimeout(() => setCopyFeedback(""), 1400);
        return () => window.clearTimeout(timer);
    }, [copyFeedback]);

    useEffect(() => {
        if (!flowFeedback) return undefined;
        const timer = window.setTimeout(() => setFlowFeedback(""), 1800);
        return () => window.clearTimeout(timer);
    }, [flowFeedback]);

    const checkoutProgress = useMemo(
        () =>
            computeCheckoutProgress({
                serviceKey,
                effectiveTemplateName,
                tierConfirmed,
                title: resolvedTitle,
                pickup,
                note,
                startLocationRequired,
            }),
        [effectiveTemplateName, note, pickup, resolvedTitle, serviceKey, startLocationRequired, tierConfirmed],
    );

    const estimateFromLane = useMemo(() => {
        if (!serviceKey) return null;
        const label = formatFromPrice({
            pricesByLane,
            laneKey: serviceKey,
            currencyKey: currency,
            tierKey: tierKey || "standard",
        });
        return label;
    }, [currency, pricesByLane, serviceKey, tierKey]);

    const resolvedEstimatedTotal =
        String(estimatedTotalLabel || "").trim() || estimateFromLane;
    const selectedSupportTypeOption =
        supportTypeOptions.find((option) => option.id === supportType) ||
        supportTypeOptions[supportTypeOptions.length - 1] ||
        null;

    const supportPricingByOption = useMemo(() => {
        if (!serviceKey) return {};

        const buildBreakdown = (nextSupportType) => {
            try {
                return priceErrand({
                    template: effectiveTemplateName,
                    templateId: effectiveTemplateId,
                    categoryId: resolvedCatalogCategoryKey,
                    laneKey: serviceKey,
                    supportType: nextSupportType,
                    startLocation: pickup,
                    endLocation: dropoff,
                    priority: resolvedTierKey,
                    schedule: { type: scheduleType || "now" },
                    currency,
                });
            } catch {
                return null;
            }
        };

        const standardBreakdown = buildBreakdown("standard_assistance");
        const standardMinor = Number(
            standardBreakdown?.total?.minor ?? standardBreakdown?.total?.amountMinor,
        );

        return supportTypeOptions.reduce((acc, option) => {
            const breakdown = buildBreakdown(option.id);
            const totalMinor = Number(
                breakdown?.total?.minor ?? breakdown?.total?.amountMinor,
            );
            const totalCurrency = breakdown?.total?.currency || currency;
            const deltaMinor =
                Number.isFinite(totalMinor) && Number.isFinite(standardMinor)
                    ? totalMinor - standardMinor
                    : null;

            acc[option.id] = {
                totalLabel: formatMinorCurrency(totalMinor, totalCurrency),
                deltaLabel:
                    option.id === "flexible"
                        ? "Auto-match"
                        : !Number.isFinite(deltaMinor) || deltaMinor <= 0
                            ? "Included"
                            : `+${formatMinorCurrency(deltaMinor, totalCurrency)}`,
            };
            return acc;
        }, {});
    }, [
        currency,
        dropoff,
        effectiveTemplateId,
        effectiveTemplateName,
        pickup,
        resolvedCatalogCategoryKey,
        resolvedTierKey,
        scheduleType,
        serviceKey,
        supportTypeOptions,
    ]);
    const selectedSupportPricingMeta = supportPricingByOption[supportType] || {};
    const selectedSupportTypeSummaryLabel =
        selectedSupportTypeOption?.label || (isAirportVehicleFlow ? "Flexible vehicle" : "Flexible");

    useEffect(() => {
        const node = templatePickerSupportSwitchRef.current;
        if (!node || typeof window === "undefined" || !templatePickerOpen) {
            setSupportRailState({ hasOverflow: false, canScrollLeft: false, canScrollRight: false });
            return undefined;
        }

        const updateRailState = () => {
            try {
                const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
                const hasOverflow = maxScrollLeft > 8;
                const canScrollLeft = hasOverflow && node.scrollLeft > 8;
                const canScrollRight = hasOverflow && node.scrollLeft < maxScrollLeft - 8;
                setSupportRailState((prev) => {
                    if (
                        prev.hasOverflow === hasOverflow &&
                        prev.canScrollLeft === canScrollLeft &&
                        prev.canScrollRight === canScrollRight
                    ) {
                        return prev;
                    }
                    return { hasOverflow, canScrollLeft, canScrollRight };
                });
            } catch {
                setSupportRailState({ hasOverflow: false, canScrollLeft: false, canScrollRight: false });
            }
        };

        updateRailState();
        const rafId = window.requestAnimationFrame(updateRailState);
        const settleId = window.setTimeout(updateRailState, 120);
        node.addEventListener("scroll", updateRailState, { passive: true });
        window.addEventListener("resize", updateRailState);
        window.addEventListener("orientationchange", updateRailState);

        let resizeObserver = null;
        try {
            if (typeof ResizeObserver !== "undefined") {
                resizeObserver = new ResizeObserver(() => {
                    updateRailState();
                });
                resizeObserver.observe(node);
            }
        } catch {
            resizeObserver = null;
        }

        return () => {
            window.cancelAnimationFrame(rafId);
            window.clearTimeout(settleId);
            node.removeEventListener("scroll", updateRailState);
            window.removeEventListener("resize", updateRailState);
            window.removeEventListener("orientationchange", updateRailState);
            try {
                resizeObserver?.disconnect?.();
            } catch {
                // ignore
            }
        };
    }, [supportTypeOptions.length, templatePickerOpen]);

    useEffect(() => {
        if (!templatePickerOpen || typeof window === "undefined") return undefined;

        const resetSupportRail = () => {
            const node = templatePickerSupportSwitchRef.current;
            if (!node) return;
            try {
                node.scrollTo({ left: 0, behavior: "auto" });
            } catch {
                node.scrollLeft = 0;
            }
        };

        resetSupportRail();
        const rafId = window.requestAnimationFrame(resetSupportRail);
        const settleId = window.setTimeout(resetSupportRail, 120);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.clearTimeout(settleId);
        };
    }, [effectiveTemplateId, templatePickerOpen]);

    useEffect(() => {
        if (!templatePickerDoneReady || typeof window === "undefined") return undefined;
        const id = window.setTimeout(() => setTemplatePickerDoneReady(false), 820);
        return () => window.clearTimeout(id);
    }, [templatePickerDoneReady]);

    const progress = checkoutProgress.percent;
    const nextStepLabel = checkoutProgress.nextStepLabel;
    const missingRequired = checkoutProgress.missingRequired;
    const validationHint = missingRequired.length ? missingRequired[0] : "";

    // Back-compat: downstream consumers (assistant context) historically called this currentStepLabel.
    const currentStepLabel = nextStepLabel;

    const canContinue = missingRequired.length === 0;

    const progressClamped = Math.min(100, Math.max(0, Number(progress) || 0));
    const nextStepTarget = useMemo(() => {
        if (!serviceKey) return "category";
        if (!String(effectiveTemplateName || "").trim()) return "template";
        if (!tierConfirmed) return "pricing";
        if (!hasTitle || !hasErrandNote) return "core";
        if (!hasRequiredPickup) return "location";
        return "review";
    }, [effectiveTemplateName, hasErrandNote, hasRequiredPickup, hasTitle, serviceKey, tierConfirmed]);
    const nextStepSignalPrefix = canContinue ? "Ready now" : "Complete next";
    const nextStepSignalDetail = canContinue ? "Review & pay" : nextStepLabel;
    const showCategorySignal = nextStepTarget === "category";
    const showTemplateSignal = nextStepTarget === "template";
    const showPricingSignal = nextStepTarget === "pricing";
    const showCoreSignal = nextStepTarget === "core";
    const showLocationSignal = nextStepTarget === "location";
    const showReviewSignal = nextStepTarget === "review";
    const templateSelected = Boolean(String(effectiveTemplateName || "").trim());
    const templateChoiceStatusLabel = showTemplateSignal ? "Next required" : templateSelected ? "Selected" : "Waiting";
    const templateChoiceHint = showTemplateSignal
        ? "Choose the closest template to keep pricing and prompts aligned."
        : showPricingSignal
            ? "Template locked in. Next: choose your priority level."
            : templateSelected
                ? `Template locked in. Next: ${nextStepLabel}.`
                : "Choose a template to continue.";
    const categoryCompactSummary = templateSelected
        ? `${effectiveTemplateName} · ${selectedSupportTypeSummaryLabel}`
        : resolvedCategory?.description || "Tap to edit";
    const prioritySelected = Boolean(tierConfirmed);
    const priorityChoiceStatusLabel = showPricingSignal ? "Next required" : prioritySelected ? "Selected" : "Waiting";
    const priorityChoiceHint = showPricingSignal
        ? "Pick the urgency level that matches this errand."
        : showCoreSignal
            ? "Priority confirmed. Next: add the title and details."
            : prioritySelected
                ? `Priority confirmed. Next: ${nextStepLabel}.`
                : "Choose a priority level to continue.";
    const checkoutHintText = useMemo(() => {
        if (canContinue) return "Ready. Continue to secure payment.";
        const first = String(missingRequired?.[0] || "").trim();
        if (!first) return "Complete the required fields, then continue to secure payment.";
        const remaining = Math.max(0, (missingRequired?.length || 0) - 1);
        return remaining > 0 ? `Still needed: ${first} (+${remaining} more)` : `Still needed: ${first}`;
    }, [canContinue, missingRequired]);

    const toxiMiniMessage = useMemo(() => {
        if (canContinue) {
            if (!proofRequired) {
                return "Everything required is in place. Optional: request proof/receipt, then proceed to checkout.";
            }
            return "Everything required is in place. Proceed to checkout when ready.";
        }

        const first = String(missingRequired?.[0] || nextStepLabel || "").trim();
        const assistOn = Boolean(toxiAssistEnabled);

        if (first === "Choose a category") {
            return assistOn
                ? "Choose a category next so I can tailor pricing, templates, and guidance."
                : "Choose a category next to unlock templates and pricing.";
        }
        if (first === "Choose a template") {
            return assistOn
                ? "Pick the closest template and I’ll keep the rest structured automatically."
                : "Pick the closest template so pricing and prompts stay aligned.";
        }
        if (first === "Select priority level") {
            return assistOn
                ? "Select your priority level next so dispatch and coordination match your urgency."
                : "Select your priority level to continue.";
        }
        if (first === "Add a short title") {
            return assistOn
                ? "Add a short title next. It helps the operator understand the goal at a glance."
                : "Add a short title to continue.";
        }
        if (first === "Add starting point") {
            return assistOn
                ? "Add the starting point next so pricing and dispatch stay accurate."
                : "Add the starting point to continue.";
        }
        if (first === "Describe what you need") {
            return assistOn
                ? "Add a short request description, including key details, recipients, and any signature requirement."
                : "Add a short request description to continue.";
        }

        return assistOn
            ? `Next: ${first}. I’ll keep everything tidy as you go.`
            : `Next: ${first}.`;
    }, [canContinue, missingRequired, nextStepLabel, proofRequired, toxiAssistEnabled]);

    const manualCheckoutRailEligible = Boolean(
        (isMobile || isCompactRailViewport) &&
            mode === "create" &&
            !toxiAssistEnabled &&
            !assistantOpen &&
            manualReviewRequested,
    );
    const assistKeyboardOpen = resolvedViewportBottomInsetPx >= 60;
    const compactTypingMode = Boolean(
        (isMobile || isCompactRailViewport) &&
            mode === "create" &&
            (assistKeyboardOpen || mobileTextEntryActive),
    );
    const mobileCheckoutRailVisible = Boolean(
        (isMobile || isCompactRailViewport) &&
            mode === "create" &&
            (toxiAssistEnabled || manualCheckoutRailEligible) &&
            !receiptOverlayOpen &&
            !checkoutOpened &&
            !mobileCheckoutSheetOpen &&
            !compactTypingMode,
    );

    // Debounce assistant stage transitions so we don't advance the guidance while
    // the user is still actively typing.
    const [pickupSettled, setPickupSettled] = useState(true);
    const [noteSettled, setNoteSettled] = useState(true);

    useEffect(() => {
        if (mode !== "create") return undefined;
        if (typeof window === "undefined") return undefined;
        setPickupSettled(false);
        const id = window.setTimeout(() => setPickupSettled(true), 650);
        return () => window.clearTimeout(id);
    }, [mode, pickup]);

    useEffect(() => {
        if (mode !== "create") return undefined;
        if (typeof window === "undefined") return undefined;
        setNoteSettled(false);
        const id = window.setTimeout(() => setNoteSettled(true), 700);
        return () => window.clearTimeout(id);
    }, [mode, note]);

    const assistStageKey = useMemo(() => {
        if (mode !== "create") return null;

        const pickupReady = hasRequiredPickup ? pickupSettled : true;
        const noteReady = hasErrandNote ? noteSettled : false;

        if (!serviceKey) return "category";
        if (!String(effectiveTemplateName || "").trim()) return "template";
        if (!tierConfirmed) return "pricing";
        if (!hasTitle) return "title";
        if (startLocationRequired && !pickupReady) return "pickup";
        if (!noteReady) return "details";
        if (canContinue) return "review";
        return "review";
    }, [canContinue, effectiveTemplateName, hasErrandNote, hasRequiredPickup, hasTitle, mode, noteSettled, pickupSettled, serviceKey, startLocationRequired, tierConfirmed]);

    const assistOverlayOpen = Boolean(
        templatePickerOpen ||
            categoryDrawerOpen ||
            attachmentsSheetOpen ||
            extraNotesSheetOpen ||
            mobileCheckoutSheetOpen,
    );

    const floatingProgressOverlayVisible = Boolean(
        stickyProgressVisible &&
            (desktopFloatingProgressEligible || mobileFloatingProgressEligible) &&
            !receiptOverlayOpen &&
            !checkoutOpened &&
            !assistOverlayOpen &&
            !paymentModalOpen &&
            !compactTypingMode,
    );
    const mobileFloatingProgressSpacerVisible = Boolean(
        floatingProgressOverlayVisible && mobileFloatingProgressEligible,
    );

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        if (!(isMobile || isCompactRailViewport) || mode !== "create") {
            setMobileTextEntryActive(false);
            return undefined;
        }

        let rafId = 0;

        const applyTextEntryState = () => {
            try {
                setMobileTextEntryActive(
                    isEditableFieldElement(document?.activeElement || null),
                );
            } catch {
                setMobileTextEntryActive(false);
            }
        };

        const updateTextEntryState = () => {
            if (rafId) window.cancelAnimationFrame(rafId);
            rafId = window.requestAnimationFrame(() => {
                rafId = 0;
                applyTextEntryState();
            });
        };

        applyTextEntryState();
        document.addEventListener("focusin", updateTextEntryState, true);
        document.addEventListener("focusout", updateTextEntryState, true);
        return () => {
            if (rafId) window.cancelAnimationFrame(rafId);
            document.removeEventListener("focusin", updateTextEntryState, true);
            document.removeEventListener("focusout", updateTextEntryState, true);
        };
    }, [isCompactRailViewport, isMobile, mode]);

    const showProofProceedPrompt = Boolean(
        mode === "create" &&
            builderTab === "smart" &&
            proofRequired &&
            canContinue &&
            progressClamped >= 100 &&
            pickupSettled &&
            noteSettled &&
            !proofProceedPromptDismissed &&
            !receiptOverlayOpen &&
            !checkoutOpened &&
            !paymentModalOpen &&
            !assistOverlayOpen,
    );

    useEffect(() => {
        // Reset the proceed-to-checkout prompt if the form becomes incomplete again, or proof is turned off.
        if (mode !== "create") {
            setProofProceedPromptDismissed(false);
            return;
        }

        if (!canContinue || !proofRequired) {
            setProofProceedPromptDismissed(false);
        }
    }, [canContinue, mode, proofRequired]);

    const handleProceedToCheckout = () => {
        if (typeof window === "undefined") return;
        setProofProceedPromptDismissed(true);
        setStickyProgressVisible(false);
        try {
            setCheckoutAutoFocus(true);
            window.setTimeout(() => setCheckoutAutoFocus(false), 1800);
        } catch {
            // ignore
        }

        // Mobile/compact: open the review sheet instead of scrolling to an offscreen rail.
        if (isMobile || isCompactRailViewport) {
            setMobileCheckoutSheetOpen(true);
            return;
        }

        // Desktop/tablet: scroll the checkout card into view and focus the CTA.
        scrollRefIntoView(summaryCardRef);
        window.setTimeout(() => {
            try {
                const root = summaryCardRef.current;
                const btn = root?.querySelector?.("button.eb-clientv2__continue");
                btn?.focus?.();
            } catch {
                // ignore
            }
        }, 180);
    };

    useEffect(() => {
        if (checkoutOpened) {
            setMobileCheckoutSheetOpen(false);
        }
    }, [checkoutOpened]);

    useEffect(() => {
        if (!allowExpandableNoteField) return undefined;
        const prev = prevNoteExpandedRef.current;
        const next = Boolean(noteExpanded);
        prevNoteExpandedRef.current = next;

        // Only act when the note/request box collapses.
        if (!prev || next) return;
        if (typeof window === "undefined") return;
        if (mode !== "create") return;
        if (builderTab !== "smart") return;

        // Respect the step order: only jump when Location & timing is the next required step.
        if (validationHint !== "Add starting point") return;

        // Smaller screens benefit most from the guided jump.
        if (!(isMobile || isCompactRailViewport)) return;

        setLocationTimingCollapsed(false);
        setAttachmentsSheetOpen(false);
        setExtraNotesSheetOpen(false);

        const id = window.setTimeout(() => {
            scrollRefIntoView(pickupFieldRef, { block: "start" });
            window.setTimeout(() => {
                try {
                    pickupFieldRef.current?.focus?.();
                } catch {
                    // ignore
                }
            }, 120);
        }, 80);

        return () => window.clearTimeout(id);
    }, [
        builderTab,
        isCompactRailViewport,
        isMobile,
        mode,
        noteExpanded,
        validationHint,
        allowExpandableNoteField,
    ]);

    useEffect(() => {
        if (mode !== "create") {
            prevPaymentModalOpenRef.current = Boolean(paymentModalOpen);
            return;
        }

        const prev = prevPaymentModalOpenRef.current;
        const next = Boolean(paymentModalOpen);
        prevPaymentModalOpenRef.current = next;

        // If the user closes the payment modal without navigating away, restore the
        // sticky Review & Pay bar so they never get stuck without a way back.
        if (prev && !next) {
            setCheckoutOpened(false);
        }
    }, [mode, paymentModalOpen]);

    useLayoutEffect(() => {
        if (!onAssistContextChange) return;
        if (mode !== "create") return;
        try {
            onAssistContextChange({
                source: "client_v2",
                updatedAt: Date.now(),
                assistEnabled: Boolean(toxiAssistEnabled),
                stageKey: assistStageKey,
                overlayOpen: assistOverlayOpen,
                keyboardOpen: assistKeyboardOpen,
                viewportBottomInsetPx: resolvedViewportBottomInsetPx,
                mobileCheckoutRailVisible,
                manualReviewRequested,
                currentStepLabel,
                validationHint,
                missingRequired,
                progress,
                nextStepLabel,
                builderTab,
                proofRequired,
                regionKey: resolvedRegionKey,
                currency,
                serviceKey: serviceKey || null,
                categoryKey: resolvedCatalogCategoryKey || null,
                categoryTitle: resolvedCategory?.title || "",
                categoryDescription: resolvedCategory?.description || "",
                categoryTemplateCount: categoryTemplates.length,
                availableTemplateNames: assistTemplateNames,
                templateName: effectiveTemplateName,
                templateId: effectiveTemplateId,
                templateDescription: effectiveTemplate?.description || "",
                tierKey: resolvedTierKey,
                tierConfirmed: Boolean(tierConfirmed),
            });
        } catch {
            // ignore
        }
    }, [
        builderTab,
        currency,
        currentStepLabel,
        assistKeyboardOpen,
        assistOverlayOpen,
        assistStageKey,
        missingRequired,
        mode,
        onAssistContextChange,
        progress,
        nextStepLabel,
        assistTemplateNames,
        categoryTemplates.length,
        compactTypingMode,
        resolvedCatalogCategoryKey,
        resolvedCategory?.title,
        resolvedCategory?.description,
        resolvedViewportBottomInsetPx,
        resolvedRegionKey,
        effectiveTemplate?.description,
        effectiveTemplateId,
        effectiveTemplateName,
        resolvedTierKey,
        serviceKey,
        tierConfirmed,
        toxiAssistEnabled,
        proofRequired,
        validationHint,
        mobileCheckoutRailVisible,
        manualReviewRequested,
    ]);

    useEffect(() => {
        if (!assistantCommand) return;
        if (mode !== "create") return;
        const type = String(assistantCommand?.type || "").trim();
        if (!type) return;

        const handled = () => {
            try {
                onAssistantCommandHandled?.(assistantCommand);
            } catch {
                // ignore
            }
        };

        const goCatalog = () => setBuilderTab("catalog");
        const goSmart = () => setBuilderTab("smart");

        if (type === "open_template_picker") {
            goCatalog();
            window.setTimeout(() => {
                if (!resolvedCatalogCategoryKey) {
                    setContinueAttempted(true);
                    scrollRefIntoView(serviceGridRef);
                    handled();
                    return;
                }
                setTemplateSearch("");
                setTemplatePickerOpen(true);
                handled();
            }, 60);
            return;
        }

        if (type === "scroll_to_category") {
            goCatalog();
            window.setTimeout(() => {
                scrollRefIntoView(serviceGridRef);
                handled();
            }, 60);
            return;
        }

        if (type === "scroll_to_pricing") {
            goCatalog();
            window.setTimeout(() => {
                if (!serviceKey) {
                    setContinueAttempted(true);
                    scrollRefIntoView(serviceGridRef);
                    handled();
                    return;
                }
                setExpandedTierKey(resolvedTierKey);
                scrollRefIntoView(pricingTiersRef);
                handled();
            }, 80);
            return;
        }

        if (type === "scroll_to_details") {
            goSmart();
            window.setTimeout(() => {
                scrollRefIntoView(noteFieldRef);
                try {
                    noteFieldRef.current?.focus?.();
                } catch {
                    // ignore
                }
                handled();
            }, 80);
            return;
        }

        if (type === "open_smart_builder") {
            goSmart();
            window.setTimeout(() => {
                scrollRefIntoView(categorySectionRef, { block: "start" });
                handled();
            }, 60);
            return;
        }

        if (type === "scroll_to_pickup") {
            goSmart();
            window.setTimeout(() => {
                setLocationTimingCollapsed(false);
                scrollRefIntoView(pickupFieldRef);
                try {
                    pickupFieldRef.current?.focus?.();
                } catch {
                    // ignore
                }
                handled();
            }, 80);
            return;
        }

        if (type === "scroll_to_review") {
            window.setTimeout(() => {
                scrollRefIntoView(summaryRef);
                handled();
            }, 60);
            return;
        }

        // Unknown command.
        handled();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assistantCommand]);

    const routeToFirstMissingStep = ({ guidedDelay = 0 } = {}) => {
        const run = () => {
            // Route the user to the relevant section and scroll to the first missing field.
            if (!serviceKey) {
                setBuilderTab("catalog");
                window.setTimeout(() => scrollRefIntoView(serviceGridRef, { block: "start" }), 60);
                return;
            }
            if (!effectiveTemplateName) {
                setBuilderTab("catalog");
                window.setTimeout(() => {
                    scrollRefIntoView(templateModelRef, { block: "start" });
                    setTemplateSearch("");
                    setTemplatePickerOpen(true);
                }, 80);
                return;
            }
            if (!tierConfirmed) {
                setBuilderTab("catalog");
                window.setTimeout(() => {
                    setExpandedTierKey(resolvedTierKey);
                    scrollRefIntoView(pricingTiersRef, { block: "start" });
                }, 80);
                return;
            }

            setBuilderTab("smart");
            window.setTimeout(() => {
                if (!hasTitle) {
                    scrollRefIntoView(coreSectionRef, { block: "start" });
                    window.setTimeout(() => {
                        try {
                            titleFieldRef.current?.focus?.();
                        } catch {
                            // ignore
                        }
                    }, 120);
                    return;
                }

                const pickupTrimmed = String(pickup || "").trim();
                if (pickupTrimmed.length < 3) {
                    setLocationTimingCollapsed(false);
                    setAttachmentsSheetOpen(false);
                    setExtraNotesSheetOpen(false);
                    scrollRefIntoView(locationSectionRef, { block: "start" });
                    window.setTimeout(() => {
                        try {
                            pickupFieldRef.current?.focus?.();
                        } catch {
                            // ignore
                        }
                    }, 120);
                    return;
                }

                if (!String(note || "").trim()) {
                    scrollRefIntoView(coreSectionRef, { block: "start" });
                    window.setTimeout(() => {
                        try {
                            noteFieldRef.current?.focus?.();
                        } catch {
                            // ignore
                        }
                    }, 120);
                }
            }, 100);
        };

        if (!guidedDelay) {
            run();
            return;
        }

        window.setTimeout(run, guidedDelay);
    };

    const handleContinue = ({ guidedDelay = 0 } = {}) => {
        setContinueAttempted(true);
        if (!canContinue) {
            routeToFirstMissingStep({ guidedDelay });
            return;
        }
        setCheckoutOpened(true);
        onOpenPayment?.();
    };

    const openMobileCheckoutSheet = () => setMobileCheckoutSheetOpen(true);
    const closeMobileCheckoutSheet = () => setMobileCheckoutSheetOpen(false);
    const handleMobileContinue = () => {
        setMobileCheckoutSheetOpen(false);
        handleContinue({ guidedDelay: 180 });
    };

    const handleSelectTier = (nextTierKey) => {
        const resolvedNextKey = String(nextTierKey || "standard").toLowerCase();
        onTierChange?.(resolvedNextKey);
        setExpandedTierKey(resolvedNextKey);
        setTierConfirmedToken(
            buildTierConfirmationToken({
                serviceKey,
                templateId: effectiveTemplateId,
                regionKey: resolvedRegionKey,
                tierKey: resolvedNextKey,
            }),
        );
        setBuilderTab("smart");
        setSelectedPricingOpen(false);
        setPendingScrollToSmart(true);
        const selectedTier = TIER_DEFINITIONS.find((tier) => tier.key === resolvedNextKey);
        announceFlowFeedback(`Priority selected: ${selectedTier?.label || resolvedNextKey}`);
    };

    const handleSelectCategory = (category, opts = {}) => {
        if (!category?.key) return;
        const shouldOpenTemplate = Boolean(opts?.openTemplate);
        const nextCategoryKey = String(category.key);
        const categoryChanged = nextCategoryKey !== resolvedCatalogCategoryKey;

        setCatalogCategoryKey(nextCategoryKey);
        setMobileSpotlightExpanded(true);
        setMobileSpotlightCollapseQueued(false);
        setContinueAttempted(false);
        if (categoryChanged) {
            onServiceChange?.(category.laneKey);
            announceFlowFeedback(`Category selected: ${category.title || category.key}`);
        }
        setTemplateSearch("");
        setCategoryDrawerOpen(false);

        // Desktop behavior: selecting a category guides the user to pricing + template.
        if (!isMobile) {
            setPendingScrollToPricing(true);
            setPendingOpenTemplatePickerAfterPricingScroll(true);
            return;
        }

        // Mobile behavior: don't auto-scroll or auto-open; CTA-driven.
        if (shouldOpenTemplate) {
            setTemplatePickerOpen(true);
        }
    };

    const filteredTemplates = useMemo(() => {
        const list = Array.isArray(categoryTemplates) ? categoryTemplates : [];
        const q = String(templateSearch || "")
            .replace(/[\u200B-\u200D\uFEFF]/g, "")
            .trim()
            .toLowerCase();
        if (!q) return list;
        return list.filter((t) => {
            const name = String(t?.name || "").toLowerCase();
            const desc = String(t?.description || "").toLowerCase();
            return name.includes(q) || desc.includes(q);
        });
    }, [categoryTemplates, templateSearch]);
    const normalizedTemplateSearch = useMemo(
        () =>
            String(templateSearch || "")
                .replace(/[\u200B-\u200D\uFEFF]/g, "")
                .trim(),
        [templateSearch],
    );
    const visibleTemplates = useMemo(() => {
        if (!resolvedCatalogCategoryKey) return [];
        if (!normalizedTemplateSearch) return categoryTemplates;
        return filteredTemplates;
    }, [
        categoryTemplates,
        filteredTemplates,
        normalizedTemplateSearch,
        resolvedCatalogCategoryKey,
    ]);

    const openCategoryPicker = () => {
        setSelectedPricingOpen(false);
        setMobileSpotlightExpanded(true);
        setBuilderTab("catalog");
        if (isMobile) {
            setCategoryDrawerOpen(true);
            return;
        }
        window.setTimeout(() => {
            scrollRefIntoView(serviceGridRef);
        }, 80);
    };

    const openTemplatePicker = () => {
        if (!resolvedCatalogCategoryKey) {
            setContinueAttempted(true);
            return;
        }
        setSelectedPricingOpen(false);
        setMobileSpotlightExpanded(true);
        setTemplateSearch("");
        setTemplatePickerOpen(true);
    };

    const nudgeTemplatePickerDone = () => {
        setTemplatePickerDoneReady(false);
        if (typeof window === "undefined") {
            setTemplatePickerDoneReady(true);
            return;
        }
        window.requestAnimationFrame(() => setTemplatePickerDoneReady(true));
    };

    const scrollTemplatePickerSupportRailBy = (direction = 1) => {
        const node = templatePickerSupportSwitchRef.current;
        if (!node) return;
        const delta = Math.max(132, Math.round(node.clientWidth * 0.58)) * direction;
        try {
            node.scrollBy({ left: delta, behavior: "smooth" });
        } catch {
            node.scrollLeft += delta;
        }
    };

    const handleTemplatePickerSupportSelect = (optionId, event) => {
        try {
            event?.currentTarget?.scrollIntoView?.({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
            });
        } catch {
            // ignore
        }
        onSupportTypeChange?.(optionId);
        nudgeTemplatePickerDone();
        const nextOption = supportTypeOptions.find((option) => option.id === optionId);
        announceFlowFeedback(`${supportTypeQuestionLabel} selected: ${nextOption?.label || optionId}`);
    };

    const handleTemplatePickerTemplateSelect = (template, event) => {
        onTemplateSelect?.(template);
        setCategoryCardExpanded(false);
        setMobileSpotlightCollapseQueued(false);
        nudgeTemplatePickerDone();
        announceFlowFeedback(`Template selected: ${template?.name || "Selected"}`);
    };

    const openTierPicker = () => {
        setSelectedPricingOpen(false);
        setBuilderTab("catalog");
        window.setTimeout(() => {
            setExpandedTierKey(resolvedTierKey);
            scrollRefIntoView(pricingTiersRef);
        }, 80);
    };

    const handleFilesPicked = (event) => {
        const picked = Array.from(event?.target?.files || []);
        // Reset the input so selecting the same file again still fires change.
        try {
            event.target.value = "";
        } catch {
            // ignore
        }
        if (!picked.length) return;

        const existing = resolvedSelectedFiles;
        const seen = new Set(
            existing.map(
                (f) => `${f?.name || ""}|${Number(f?.size) || 0}|${Number(f?.lastModified) || 0}`,
            ),
        );
        const merged = [...existing];
        for (const file of picked) {
            const key = `${file?.name || ""}|${Number(file?.size) || 0}|${Number(file?.lastModified) || 0}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(file);
        }
        onSelectedFilesChange?.(merged);
        setAttachmentsSheetOpen(true);
        setExtraNotesSheetOpen(false);
        announceFlowFeedback(`${picked.length} file${picked.length === 1 ? "" : "s"} added`);
    };

    const openAttachmentsSheet = () => {
        setOptionalDetailsExpanded(true);
        setAttachmentsSheetOpen(true);
        setExtraNotesSheetOpen(false);
    };

    const openExtraNotesSheet = () => {
        setOptionalDetailsExpanded(true);
        setExtraNotesSheetOpen(true);
        setAttachmentsSheetOpen(false);
        window.setTimeout(() => {
            try {
                extraNotesRef.current?.focus?.();
            } catch {
                // ignore
            }
        }, 0);
    };

    useEffect(() => {
        if (!receiptOverlayOpen) return;
        // If an external overlay (e.g. the submission receipt) is on screen,
        // ensure the sticky checkout UI cannot visually or interactively
        // conflict with it.
        setMobileCheckoutSheetOpen(false);
        setCheckoutOpened(false);
        setStickyProgressVisible(false);
    }, [receiptOverlayOpen]);

    const renderCreateSummaryCard = ({ floating = false } = {}) => (
        <div
            ref={floating ? undefined : summaryCardRef}
            className={classNames(
                "eb-clientv2__summary",
                floating && "is-floating",
                checkoutAutoFocus && "is-autofocus",
                canContinue ? "is-ready" : "is-incomplete",
                showReviewSignal && "is-next-step",
            )}
            data-tour={floating ? undefined : "clientv2-checkout-rail"}
        >
                <div className="eb-clientv2__summaryHeader">
                    <div className="eb-clientv2__summaryTitleGroup">
                        <div className="eb-clientv2__summaryKicker">Checkout</div>
                        <div className="eb-clientv2__summaryTitle">Review &amp; pay</div>
                        <div className="eb-clientv2__summaryNext">Next step: {nextStepLabel}</div>
                        {showReviewSignal ? (
                            <div className="eb-clientv2__sectionStepCue">
                                <NextStepSignalBadge
                                    prefix={nextStepSignalPrefix}
                                    detail={nextStepSignalDetail}
                                    compact
                                />
                            </div>
                        ) : null}
                    </div>
                    <div
                        className="eb-clientv2__summaryBadge"
                        role="img"
                        aria-label={`Checkout readiness ${progressClamped}%`}
                    >
                        <svg
                            className="eb-clientv2__summaryBadgeRing"
                            width="44"
                            height="44"
                            viewBox="0 0 44 44"
                            aria-hidden="true"
                        >
                            <circle
                                className="eb-clientv2__summaryBadgeTrack"
                                cx="22"
                                cy="22"
                                r="18"
                                fill="none"
                                strokeWidth="4"
                            />
                            <motion.circle
                                className="eb-clientv2__summaryBadgeProgress"
                                cx="22"
                                cy="22"
                                r="18"
                                fill="none"
                                strokeWidth="4"
                                strokeLinecap="round"
                                initial={false}
                                animate={{
                                    strokeDashoffset: 2 * Math.PI * 18 * (1 - progressClamped / 100),
                                }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                strokeDasharray={2 * Math.PI * 18}
                            />
                        </svg>
                        <div className="eb-clientv2__summaryBadgeText" aria-hidden="true">
                            {progressClamped}%
                        </div>
                    </div>
                </div>

                <div className="eb-clientv2__summaryItems">
                    <div className="eb-clientv2__summaryItem">
                        <div className="eb-clientv2__summaryLabel">Region</div>
                        <div className="eb-clientv2__summaryValue">{resolvedRegion.label.replace(" (", " · ").replace(")", "")}</div>
                    </div>
                    <div
                        className={classNames(
                            "eb-clientv2__summaryItem",
                            !canContinue && !resolvedCategory && "is-missing",
                        )}
                    >
                        <div className="eb-clientv2__summaryLabel">Service type</div>
                        <div className="eb-clientv2__summaryValue">{resolvedCategory ? resolvedCategory.title : "-"}</div>
                    </div>
                    <div
                        className={classNames(
                            "eb-clientv2__summaryItem",
                            !canContinue && !String(effectiveTemplateName || "").trim() && "is-missing",
                        )}
                    >
                        <div className="eb-clientv2__summaryLabel">Template</div>
                        <div className="eb-clientv2__summaryValue">{effectiveTemplateName || "-"}</div>
                    </div>
                    <div
                        className={classNames(
                            "eb-clientv2__summaryItem",
                            !canContinue && !hasTitle && "is-missing",
                        )}
                    >
                        <div className="eb-clientv2__summaryLabel">Title</div>
                        <div className="eb-clientv2__summaryValue">{resolvedTitle || "-"}</div>
                    </div>
                    <div
                        className={classNames(
                            "eb-clientv2__summaryItem",
                            !canContinue && !tierConfirmed && "is-missing",
                        )}
                    >
                        <div className="eb-clientv2__summaryLabel">Priority level</div>
                        <div className="eb-clientv2__summaryValueGroup">
                            <div className="eb-clientv2__summaryValue">{resolvedTier?.label || "Standard"}</div>
                            <div className="eb-clientv2__summarySubvalue">{resolvedTier?.summary || ""}</div>
                        </div>
                    </div>
                    <div className="eb-clientv2__summaryItem">
                        <div className="eb-clientv2__summaryLabel">{isAirportVehicleFlow ? "Vehicle type" : "Support type"}</div>
                        <div className="eb-clientv2__summaryValue">
                            {supportTypeOptions.find((option) => option.id === supportType)?.label || "Flexible"}
                        </div>
                    </div>
                    <div className="eb-clientv2__summaryItem">
                        <div className="eb-clientv2__summaryLabel">{preferredTimeLabel}</div>
                        <div className="eb-clientv2__summaryValue">{selectedPreferredTimeLabel}</div>
                    </div>
                    <div
                        className={classNames(
                            "eb-clientv2__summaryItem",
                            !canContinue && !hasRequiredPickup && "is-missing",
                        )}
                    >
                        <div className="eb-clientv2__summaryLabel">{startLocationFieldLabel}</div>
                        <div className="eb-clientv2__summaryValue">{String(pickup || "").trim() || "Not set yet"}</div>
                    </div>
                    <div className="eb-clientv2__summaryItem">
                        <div className="eb-clientv2__summaryLabel">Proof</div>
                        <div className="eb-clientv2__summaryValue">{proofRequired ? "Required" : "Optional"}</div>
                    </div>
                </div>

                <div className="eb-clientv2__summaryTotal">
                    <div className="eb-clientv2__summaryTotalLabel">Estimated total</div>
                    <div className="eb-clientv2__summaryTotalValue" aria-live="polite">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.span
                                key={String(resolvedEstimatedTotal || "-")}
                                className="eb-clientv2__summaryTotalValueInner"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                            >
                                {resolvedEstimatedTotal || "-"}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                    <div className="eb-clientv2__summaryTotalHint">{checkoutHintText}</div>
                </div>

                <div className="eb-clientv2__summaryCta">
                    <button
                        type="button"
                        className={classNames("eb-clientv2__continue", !canContinue && "is-disabled")}
                        aria-disabled={!canContinue}
                        onClick={handleContinue}
                    >
                        Continue to payment
                    </button>

                    {!canContinue ? (
                        <div className="eb-clientv2__missing" aria-live="polite">
                            {missingRequired.join(" · ")}
                        </div>
                    ) : null}

                    <div className="eb-clientv2__confidenceRow" aria-label="Checkout confidence">
                        <div className="eb-clientv2__confidenceItem">
                            <ShieldCheck size={14} /> Secure checkout
                        </div>
                        <div className="eb-clientv2__confidenceItem">
                            <Sparkles size={14} /> Live updates
                        </div>
                        <div className="eb-clientv2__confidenceItem">
                            <BadgeCheck size={14} /> Proof-ready
                        </div>
                    </div>
                </div>
            </div>
    );

    const renderCreateToxiCard = ({ floating = false } = {}) => {
        if (!showCreateFlowToxiAssist || !toxiAssistEnabled) return null;

        return (
        <section
            className={classNames("eb-clientv2__toxi", "eb-clientv2__toxi--mini", floating && "is-floating")}
            data-tour={floating ? undefined : "clientv2-toxi"}
        >
                <div className="eb-clientv2__toxiHeader">
                    <div
                        className={classNames("eb-clientv2__toxiIcon", toxiAssistEnabled && "is-active")}
                        aria-hidden="true"
                    >
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <div className="eb-clientv2__toxiTitle">Toxi assist</div>
                        <div className="eb-clientv2__toxiSubtitle">Context-aware guidance</div>
                    </div>
                </div>
                <div className="eb-clientv2__toxiBody">
                    <AnimatePresence initial={false} mode="wait">
                        <motion.div
                            key={`${toxiAssistEnabled ? "on" : "off"}-${canContinue ? "ready" : String(missingRequired?.[0] || nextStepLabel || "")}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                        >
                            {toxiMiniMessage}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {onOpenAssistant ? (
                    <button
                        type="button"
                        className="eb-clientv2__toxiOpenBtn"
                        onClick={() => onOpenAssistant?.()}
                        disabled={toxiAssistEnabled}
                        aria-disabled={toxiAssistEnabled}
                    >
                        Open assistant
                    </button>
                ) : null}

                <div
                    className={classNames(
                        "eb-clientv2__toggleRow",
                        toxiAssistEnabled ? "is-on" : "is-off",
                    )}
                    role="switch"
                    aria-checked={toxiAssistEnabled}
                    tabIndex={0}
                    data-tour={floating ? undefined : "clientv2-smart-structuring"}
                    onClick={() => setToxiAssistEnabled(!toxiAssistEnabled)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setToxiAssistEnabled(!toxiAssistEnabled);
                        }
                    }}
                >
                    <div className="eb-clientv2__toggleCopy">
                        <div className="eb-clientv2__toggleTitle">Smart structuring</div>
                        <div className="eb-clientv2__toggleHint">
                            {toxiAssistEnabled
                                ? "Contextual tips and assistant shortcuts are active while you fill the form."
                                : "Smart structuring is off. Turn this on for contextual help inside each section."}
                        </div>
                    </div>
                    <label
                        className="eb-clientv2__switch"
                        aria-label="Toggle smart structuring"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <input
                            type="checkbox"
                            aria-label="Smart structuring"
                            checked={toxiAssistEnabled}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(e) => setToxiAssistEnabled(e.target.checked)}
                        />
                        <span />
                    </label>
                </div>
            </section>
        );
    };

    const renderCreateRailContent = ({ floating = false } = {}) => (
        <>
            {renderCreateSummaryCard({ floating })}
            {renderCreateToxiCard({ floating })}
        </>
    );

    const dashboardContent = (
        <div className="eb-clientv2Shell" style={shellStyle}>
            <div className={classNames("eb-clientv2", mode === "create" && "is-create")}>
                <div
                    className="eb-clientv2__tabs"
                    role="tablist"
                    aria-label="Client navigation"
                    data-tour="clientv2-tabs"
                >
                    <button
                        type="button"
                        className={classNames("eb-clientv2__tab", mode === "create" && "is-active")}
                        role="tab"
                        aria-selected={mode === "create"}
                        data-tour="clientv2-tab-create"
                        onClick={onOpenCreate}
                    >
                        <PlusCircle size={16} /> New Errand
                    </button>
                    <button
                        type="button"
                        className={classNames("eb-clientv2__tab", mode !== "create" && "is-active")}
                        role="tab"
                        aria-selected={mode !== "create"}
                        data-tour="clientv2-tab-errands"
                        onClick={onOpenErrands}
                    >
                        <ClipboardList size={16} /> My Errands
                    </button>
                </div>

                {mode === "create" ? (
                    <>
                        {typeof document !== "undefined"
                            ? createPortal(
                                floatingProgressOverlayVisible &&
                                    !receiptOverlayOpen &&
                                    !checkoutOpened &&
                                    !assistOverlayOpen &&
                                    !paymentModalOpen &&
                                    !compactTypingMode &&
                                    stickyProgressVisible ? (
                                    <div
                                        className={classNames(
                                            "eb-clientv2__floatingStack",
                                            mobileFloatingProgressEligible && "is-mobile",
                                        )}
                                        style={{
                                            "--ebv2-headerH": `${resolvedFloatingHeaderHeightPx}px`,
                                            // Keep the floating readiness card at the apex of the viewport.
                                            // Mobile uses its own top rule in CSS, so this mainly affects
                                            // non-mobile floating cases.
                                            "--ebv2-progress-overlay-top": "clamp(0px, 0.4vh, 6px)",
                                            ...(desktopFloatingProgressBounds.width
                                                ? {
                                                    left: `${desktopFloatingProgressBounds.left}px`,
                                                    width: `${desktopFloatingProgressBounds.width}px`,
                                                    right: "auto",
                                                    maxWidth: "none",
                                                    margin: 0,
                                                }
                                                : null),
                                        }}
                                        role="presentation"
                                    >
                                        <div
                                            className={classNames(
                                                "eb-clientv2__progressOverlay",
                                                mobileFloatingProgressEligible && "is-mobile",
                                            )}
                                            role="status"
                                            aria-live="polite"
                                        >
                                            <div className="eb-clientv2__progressOverlayTop">
                                                <div>
                                                    <div className="eb-clientv2__progressOverlayTitle">{nextStepLabel}</div>
                                                    <div className="eb-clientv2__progressOverlayHint">Checkout readiness</div>
                                                </div>
                                                <div className="eb-clientv2__progressOverlayValue">{progress}%</div>
                                            </div>
                                            <div className="eb-clientv2__progressOverlayBar" aria-hidden="true">
                                                <div style={{ width: `${progress}%` }} />
                                            </div>
                                            {validationHint ? (
                                                <div className="eb-clientv2__progressOverlayMissing">{validationHint}</div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null,
                                document.body,
                            )
                            : null}

                        {typeof document !== "undefined"
                            ? createPortal(
                                desktopFloatingRailActive ? (
                                    <div
                                        className="eb-clientv2__desktopRailOverlay"
                                        style={{
                                            top: `${Math.max(22, resolvedHeaderHeightPx + 28)}px`,
                                            left: `${desktopFloatingRailBounds.left}px`,
                                            width: `${desktopFloatingRailBounds.width}px`,
                                        }}
                                        role="presentation"
                                    >
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.985 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.985 }}
                                            transition={{ duration: 0.22, ease: "easeOut" }}
                                            className="eb-clientv2__desktopRailOverlayInner"
                                        >
                                            {renderCreateSummaryCard({ floating: true })}
                                        </motion.div>
                                    </div>
                                ) : null,
                                document.body,
                            )
                            : null}

                        {typeof document !== "undefined"
                            ? createPortal(
                                desktopFloatingRailActive ? (
                                    <div
                                        className="eb-clientv2__desktopToxiDock"
                                        style={{
                                            left: `${desktopFloatingToxiBounds.left}px`,
                                            top: `${desktopFloatingToxiBounds.top}px`,
                                            width: `${desktopFloatingToxiBounds.width || desktopFloatingRailBounds.width}px`,
                                        }}
                                        role="presentation"
                                    >
                                        <motion.div
                                            initial={{ opacity: 0, y: 12, scale: 0.99 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.99 }}
                                            transition={{ duration: 0.22, ease: "easeOut" }}
                                            className="eb-clientv2__desktopToxiDockInner"
                                        >
                                            {renderCreateToxiCard({ floating: true })}
                                        </motion.div>
                                    </div>
                                ) : null,
                                document.body,
                            )
                            : null}

                                        <AnimatePresence initial={false}>
                                            {flowFeedback ? (
                                                <motion.div
                                                    key={flowFeedback}
                                                    className="eb-clientv2__flowFeedback"
                                                    role="status"
                                                    aria-live="polite"
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -6 }}
                                                    transition={{ duration: 0.18, ease: "easeOut" }}
                                                >
                                                    <BadgeCheck size={14} aria-hidden="true" />
                                                    <span>{flowFeedback}</span>
                                                </motion.div>
                                            ) : null}
                                        </AnimatePresence>

                        {typeof document !== "undefined"
                            ? createPortal(
                                mobileCheckoutRailVisible ? (
                                    <div
                                        className={classNames(
                                            "eb-clientv2__mobileCheckoutBar",
                                            checkoutAutoFocus && "is-autofocus",
                                        )}
                                        role="region"
                                        aria-label="Checkout summary"
                                    >
                                        <div className="eb-clientv2__mobileCheckoutBarInner">
                                            <button
                                                type="button"
                                                className="eb-clientv2__mobileCheckoutBarLeft"
                                                onClick={openMobileCheckoutSheet}
                                                aria-label="Open review and pay"
                                            >
                                                <div className="eb-clientv2__mobileCheckoutBarKicker">Review &amp; pay</div>
                                                <div className="eb-clientv2__mobileCheckoutBarMeta">
                                                    <span className="eb-clientv2__mobileCheckoutBarTotal">
                                                        {resolvedEstimatedTotal || "-"}
                                                    </span>
                                                    <span className="eb-clientv2__mobileCheckoutBarDot" aria-hidden="true">
                                                        ·
                                                    </span>
                                                    <span className="eb-clientv2__mobileCheckoutBarProgress">
                                                        {progressClamped}%
                                                    </span>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                className={classNames(
                                                    "eb-clientv2__mobileCheckoutBarCta",
                                                    !canContinue && "is-disabled",
                                                )}
                                                aria-disabled={!canContinue}
                                                onClick={handleMobileContinue}
                                            >
                                                {canContinue ? "Review & pay" : "Continue"}
                                            </button>
                                        </div>
                                    </div>
                                ) : null,
                                document.body,
                            )
                            : null}

                        {typeof document !== "undefined"
                            ? createPortal(
                                mobileCheckoutSheetOpen ? (
                                    <div
                                        className="eb-template-browser-overlay eb-clientv2__checkoutSheetOverlay"
                                        role="presentation"
                                        onClick={closeMobileCheckoutSheet}
                                    >
                                        <div
                                            className="eb-template-browser-modal eb-clientv2__checkoutSheetModal"
                                            role="dialog"
                                            aria-modal="true"
                                            aria-label="Review & pay"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                className="modal-close"
                                                aria-label="Close"
                                                onClick={closeMobileCheckoutSheet}
                                            >
                                                ×
                                            </button>

                                            <div className="eb-clientv2__checkoutSheetHeader">
                                                <div className="eb-clientv2__checkoutSheetTitle">Review &amp; pay</div>
                                                <div className="eb-clientv2__checkoutSheetSubtitle">Next step: {nextStepLabel}</div>
                                                {showReviewSignal ? (
                                                    <div className="eb-clientv2__sectionStepCue">
                                                        <NextStepSignalBadge
                                                            prefix={nextStepSignalPrefix}
                                                            detail={nextStepSignalDetail}
                                                            compact
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="eb-clientv2__checkoutSheetBody">
                                                <div
                                                    className={classNames(
                                                        "eb-clientv2__summary",
                                                        "eb-clientv2__summary--sheet",
                                                        checkoutAutoFocus && "is-autofocus",
                                                        canContinue ? "is-ready" : "is-incomplete",
                                                    )}
                                                >
                                                    <div className="eb-clientv2__summaryHeader">
                                                        <div>
                                                            <div className="eb-clientv2__summaryKicker">Checkout</div>
                                                            <div className="eb-clientv2__summaryTitle">Review &amp; pay</div>
                                                            <div className="eb-clientv2__summaryNext">Next step: {nextStepLabel}</div>
                                                        </div>
                                                        <div
                                                            className="eb-clientv2__summaryBadge"
                                                            role="img"
                                                            aria-label={`Checkout readiness ${progressClamped}%`}
                                                        >
                                                            <svg
                                                                className="eb-clientv2__summaryBadgeRing"
                                                                width="44"
                                                                height="44"
                                                                viewBox="0 0 44 44"
                                                                aria-hidden="true"
                                                            >
                                                                <circle
                                                                    className="eb-clientv2__summaryBadgeTrack"
                                                                    cx="22"
                                                                    cy="22"
                                                                    r="18"
                                                                    fill="none"
                                                                    strokeWidth="4"
                                                                />
                                                                <motion.circle
                                                                    className="eb-clientv2__summaryBadgeProgress"
                                                                    cx="22"
                                                                    cy="22"
                                                                    r="18"
                                                                    fill="none"
                                                                    strokeWidth="4"
                                                                    strokeLinecap="round"
                                                                    initial={false}
                                                                    animate={{
                                                                        strokeDashoffset:
                                                                            2 * Math.PI * 18 * (1 - progressClamped / 100),
                                                                    }}
                                                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                                                    strokeDasharray={2 * Math.PI * 18}
                                                                />
                                                            </svg>
                                                            <div className="eb-clientv2__summaryBadgeText" aria-hidden="true">
                                                                {progressClamped}%
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="eb-clientv2__summaryItems">
                                                        <div className="eb-clientv2__summaryItem">
                                                            <div className="eb-clientv2__summaryLabel">Region</div>
                                                            <div className="eb-clientv2__summaryValue">
                                                                {resolvedRegion.label.replace(" (", " · ").replace(")", "")}
                                                            </div>
                                                        </div>
                                                        <div className="eb-clientv2__summaryItem">
                                                            <div className="eb-clientv2__summaryLabel">Service type</div>
                                                            <div className="eb-clientv2__summaryValue">
                                                                {resolvedCategory ? resolvedCategory.title : "-"}
                                                            </div>
                                                        </div>
                                                        <div className="eb-clientv2__summaryItem">
                                                            <div className="eb-clientv2__summaryLabel">Template</div>
                                                            <div className="eb-clientv2__summaryValue">{effectiveTemplateName || "-"}</div>
                                                        </div>
                                                        <div
                                                            className={classNames(
                                                                "eb-clientv2__summaryItem",
                                                                !canContinue && !hasTitle && "is-missing",
                                                            )}
                                                        >
                                                            <div className="eb-clientv2__summaryLabel">Title</div>
                                                            <div className="eb-clientv2__summaryValue">{resolvedTitle || "-"}</div>
                                                        </div>
                                                        <div className="eb-clientv2__summaryItem">
                                                            <div className="eb-clientv2__summaryLabel">Priority level</div>
                                                            <div className="eb-clientv2__summaryValueGroup">
                                                                <div className="eb-clientv2__summaryValue">{resolvedTier?.label || "Standard"}</div>
                                                                <div className="eb-clientv2__summarySubvalue">{resolvedTier?.summary || ""}</div>
                                                            </div>
                                                        </div>
                                                        <div className="eb-clientv2__summaryItem">
                                                            <div className="eb-clientv2__summaryLabel">{isAirportVehicleFlow ? "Vehicle type" : "Support type"}</div>
                                                            <div className="eb-clientv2__summaryValue">
                                                                {supportTypeOptions.find((option) => option.id === supportType)?.label || "Flexible"}
                                                            </div>
                                                        </div>
                                                        <div className="eb-clientv2__summaryItem">
                                                            <div className="eb-clientv2__summaryLabel">{preferredTimeLabel}</div>
                                                            <div className="eb-clientv2__summaryValue">{selectedPreferredTimeLabel}</div>
                                                        </div>
                                                        <div className="eb-clientv2__summaryItem">
                                                            <div className="eb-clientv2__summaryLabel">{startLocationFieldLabel}</div>
                                                            <div className="eb-clientv2__summaryValue">
                                                                {String(pickup || "").trim() || "Not set yet"}
                                                            </div>
                                                        </div>
                                                        <div className="eb-clientv2__summaryItem">
                                                            <div className="eb-clientv2__summaryLabel">Proof</div>
                                                            <div className="eb-clientv2__summaryValue">{proofRequired ? "Required" : "Optional"}</div>
                                                        </div>
                                                    </div>

                                                    <div className="eb-clientv2__summaryTotal">
                                                        <div className="eb-clientv2__summaryTotalLabel">Estimated total</div>
                                                        <div className="eb-clientv2__summaryTotalValue" aria-live="polite">
                                                            <AnimatePresence initial={false} mode="wait">
                                                                <motion.span
                                                                    key={String(resolvedEstimatedTotal || "-")}
                                                                    className="eb-clientv2__summaryTotalValueInner"
                                                                    initial={{ opacity: 0, y: 6 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -6 }}
                                                                    transition={{ duration: 0.18, ease: "easeOut" }}
                                                                >
                                                                    {resolvedEstimatedTotal || "-"}
                                                                </motion.span>
                                                            </AnimatePresence>
                                                        </div>
                                                        <div className="eb-clientv2__summaryTotalHint">{checkoutHintText}</div>
                                                    </div>

                                                    <div className="eb-clientv2__summaryCta">
                                                        <button
                                                            type="button"
                                                            className={classNames("eb-clientv2__continue", !canContinue && "is-disabled")}
                                                            aria-disabled={!canContinue}
                                                            onClick={handleMobileContinue}
                                                        >
                                                            Continue to payment
                                                        </button>

                                                        {!canContinue ? (
                                                            <div className="eb-clientv2__missing" aria-live="polite">
                                                                {missingRequired.join(" · ")}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null,
                                document.body,
                            )
                            : null}

                        <div className="eb-clientv2__createLayout">
                            <div
                                ref={createMainRef}
                                className={classNames(
                                    "eb-clientv2__createMain",
                                    mobileFloatingProgressSpacerVisible && "is-mobile-progress-floating",
                                )}
                            >
                                <div ref={introClusterRef} className="eb-clientv2__introCluster">
                                    {showCreateFlowToxiAssist ? (
                                        <section
                                            className="eb-clientv2__toxi eb-clientv2__toxi--inline"
                                            data-tour="clientv2-toxi"
                                        >
                                            <div className="eb-clientv2__toxiHeader">
                                                <div
                                                    className={classNames("eb-clientv2__toxiIcon", toxiAssistEnabled && "is-active")}
                                                    aria-hidden="true"
                                                >
                                                    <Sparkles size={18} />
                                                </div>
                                                <div>
                                                    <div className="eb-clientv2__toxiTitle">Toxi assist</div>
                                                    <div className="eb-clientv2__toxiSubtitle">Context-aware guidance</div>
                                                </div>
                                            </div>
                                            <div className="eb-clientv2__toxiBody">
                                                {toxiAssistEnabled
                                                    ? "Smart structuring is on. You’ll see tips inside each section and get helpful shortcuts in the floating assistant."
                                                    : "Turn this on to see tips inside each section and get helpful shortcuts in the floating assistant."}
                                            </div>
                                            <div
                                                className={classNames(
                                                    "eb-clientv2__toggleRow",
                                                    toxiAssistEnabled ? "is-on" : "is-off",
                                                )}
                                                role="switch"
                                                aria-checked={toxiAssistEnabled}
                                                tabIndex={0}
                                                data-tour="clientv2-smart-structuring"
                                                onClick={() => setToxiAssistEnabled(!toxiAssistEnabled)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") {
                                                        event.preventDefault();
                                                        setToxiAssistEnabled(!toxiAssistEnabled);
                                                    }
                                                }}
                                            >
                                                <div className="eb-clientv2__toggleCopy">
                                                    <div className="eb-clientv2__toggleTitle">Smart structuring</div>
                                                    <div className="eb-clientv2__toggleHint">
                                                        {toxiAssistEnabled
                                                            ? "Contextual tips and assistant shortcuts are active while you fill the form."
                                                            : "Smart structuring is off. Turn this on for contextual help inside each section."}
                                                    </div>
                                                </div>
                                                <label
                                                    className="eb-clientv2__switch"
                                                    aria-label="Toggle smart structuring"
                                                    onClick={(event) => event.stopPropagation()}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        aria-label="Smart structuring"
                                                        checked={toxiAssistEnabled}
                                                        onClick={(event) => event.stopPropagation()}
                                                        onChange={(e) => setToxiAssistEnabled(e.target.checked)}
                                                    />
                                                    <span />
                                                </label>
                                            </div>
                                        </section>
                                    ) : null}

                                    <div
                                        ref={progressCardRef}
                                        className={classNames(
                                            "eb-clientv2__progressCard",
                                            "eb-clientv2__progressCard--readiness",
                                            isMobile && "is-mobile",
                                            isMobile && compactTypingMode && "is-typing-compact",
                                        )}
                                        role="status"
                                        aria-label="Progress"
                                        data-tour="clientv2-readiness"
                                    >
                                        {isMobile ? (
                                            <>
                                                <div className="eb-clientv2__progressCardMobileTop">
                                                    <div className="eb-clientv2__progressCardMobileLead">
                                                        <div className="eb-clientv2__progressCardMobileKicker">
                                                            <Sparkles size={12} />
                                                            <span>Next up</span>
                                                        </div>
                                                        <div className="eb-clientv2__progressCardMobileTitle">{nextStepLabel}</div>
                                                    </div>
                                                    <div className="eb-clientv2__progressCardMobileSide">
                                                        <div className="eb-clientv2__progressCardMobileValue">{progress}%</div>
                                                        <span className="eb-clientv2__progressCardMobileArrow" aria-hidden="true">
                                                            <ArrowRight size={14} />
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="eb-clientv2__progressCardMobileMeta">
                                                    <div className="eb-clientv2__progressCardMobileBarWrap">
                                                        <div className="eb-clientv2__progressCardBar eb-clientv2__progressCardBar--thin" aria-hidden="true">
                                                            <div style={{ width: `${progress}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="eb-clientv2__progressCardMobileHint">
                                                        {validationHint ||
                                                            (progress >= 100
                                                                ? "Ready to review"
                                                                : "Complete this next")}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="eb-clientv2__progressCardTop">
                                                    <div>
                                                        <div className="eb-clientv2__progressCardTitle">Checkout readiness</div>
                                                        <div className="eb-clientv2__progressCardStep">Next step: {nextStepLabel}</div>
                                                    </div>
                                                    <div className="eb-clientv2__progressCardValue">{progress}%</div>
                                                </div>
                                                <div className="eb-clientv2__progressCardBar" aria-hidden="true">
                                                    <div style={{ width: `${progress}%` }} />
                                                </div>
                                                {validationHint ? (
                                                    <div className="eb-clientv2__progressCardMissing">{validationHint}</div>
                                                ) : (
                                                    <div className="eb-clientv2__progressCardHint">
                                                        {progress >= 100 ? "Ready" : "In progress"}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {isMobile && mode === "create" && !toxiAssistEnabled && !compactTypingMode ? (
                                            <div className="eb-clientv2__progressCardActions">
                                                {assistantOpen ? (
                                                    <button
                                                        type="button"
                                                        className="eb-clientv2__progressCardAction"
                                                        onClick={() => {
                                                            setManualReviewRequested(true);
                                                            onCloseAssistant?.();
                                                        }}
                                                    >
                                                        Hide Assistant
                                                    </button>
                                                ) : onOpenAssistant ? (
                                                    <button
                                                        type="button"
                                                        className="eb-clientv2__progressCardAction"
                                                        onClick={() => {
                                                            setManualReviewRequested(false);
                                                            onOpenAssistant?.();
                                                        }}
                                                    >
                                                        Show Assistant
                                                    </button>
                                                ) : (
                                                    <div className="eb-clientv2__progressCardActionHint">
                                                        Assistant shortcuts are unavailable right now.
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <section className="eb-clientv2__hero eb-clientv2__hero--create" aria-label="Create overview">
                                    <div className="eb-clientv2__heroBadges">
                                        <span className="eb-clientv2__pill">Premium create</span>
                                        <span className="eb-clientv2__pill eb-clientv2__pill--ghost">Live tracking</span>
                                        <span className="eb-clientv2__pill eb-clientv2__pill--ghost">Proof of completion</span>
                                    </div>
                                    <h2>Build a high-confidence errand</h2>
                                    <p>
                                        Choose a catalog template for clean pricing, or use Smart builder for custom details.
                                        We’ll match the right operator and keep you updated end-to-end.
                                    </p>
                                    <div className="eb-clientv2__benefits">
                                        <div className="eb-clientv2__benefit">
                                            <div className="eb-clientv2__benefitTitle">Clarity first</div>
                                            <div className="eb-clientv2__benefitBody">Structured inputs reduce back-and-forth and delays.</div>
                                        </div>
                                        <div className="eb-clientv2__benefit">
                                            <div className="eb-clientv2__benefitTitle">Verified execution</div>
                                            <div className="eb-clientv2__benefitBody">Vetted operators with clear instructions and proof.</div>
                                        </div>
                                        <div className="eb-clientv2__benefit">
                                            <div className="eb-clientv2__benefitTitle">Checkout ready</div>
                                            <div className="eb-clientv2__benefitBody">Progress shows what’s missing before you pay.</div>
                                        </div>
                                    </div>
                                </section>

                                <div className="eb-clientv2__builderTabs" data-tour="clientv2-builder-tabs">
                                    <button
                                        type="button"
                                        className={classNames("eb-clientv2__builderTab", builderTab === "catalog" && "is-active")}
                                        onClick={() => setBuilderTab("catalog")}
                                        data-tour="clientv2-builder-tab-catalog"
                                    >
                                        Catalog pricing
                                    </button>
                                    <button
                                        type="button"
                                        className={classNames("eb-clientv2__builderTab", builderTab === "smart" && "is-active")}
                                        onClick={() => setBuilderTab("smart")}
                                        data-tour="clientv2-builder-tab-smart"
                                    >
                                        Smart builder
                                    </button>
                                </div>

                                {builderTab === "catalog" ? (
                                    <section className="eb-clientv2__catalog">
                                        <ToxiTip>Choose your errand category. We’ll tailor pricing, templates, and next steps.</ToxiTip>
                                                {continueAttempted && !serviceKey ? (
                                            <div className="eb-clientv2__inlineError">Select a service to continue.</div>
                                        ) : null}
                                                {showCategorySignal ? (
                                                    <div className="eb-clientv2__stepCueRow">
                                                        <NextStepSignalBadge
                                                            prefix={nextStepSignalPrefix}
                                                            detail={nextStepSignalDetail}
                                                        />
                                                    </div>
                                                ) : null}

                                        {isMobile ? (
                                            <>
                                                <div ref={serviceGridRef} className="eb-clientv2__serviceRailShell">
                                                    <div className="eb-clientv2__serviceRailWrap">
                                                        <div
                                                            className={classNames(
                                                                "eb-clientv2__serviceGrid",
                                                                "eb-clientv2__serviceGrid--mobile-rail",
                                                                continueAttempted && !serviceKey && "is-invalid",
                                                            )}
                                                            aria-label="Service categories"
                                                            data-tour="clientv2-service-grid"
                                                        >
                                                            {mobileCatalogRailCategories.map((category) => {
                                                                const selected = category.key === resolvedCatalogCategoryKey;
                                                                const meta = CATEGORY_BROWSE_META[category.key] || null;
                                                                const chipLabel = String(meta?.chipLabel || category.title || "");
                                                                return (
                                                                    <button
                                                                        key={category.key}
                                                                        type="button"
                                                                        className={classNames(
                                                                            "eb-clientv2__serviceCard",
                                                                            "eb-clientv2__serviceCard--chip",
                                                                            selected && "is-selected",
                                                                        )}
                                                                        aria-current={selected ? "true" : undefined}
                                                                        onClick={() => handleSelectCategory(category)}
                                                                    >
                                                                        <span className="eb-clientv2__serviceChipIcon" aria-hidden="true">
                                                                            {category.icon}
                                                                        </span>
                                                                        <span className="eb-clientv2__serviceChipLabel">{chipLabel}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                            <button
                                                                type="button"
                                                                className="eb-clientv2__serviceRailMoreBtn"
                                                                onClick={() => setCategoryDrawerOpen(true)}
                                                                aria-label="More categories"
                                                            >
                                                                <span className="eb-clientv2__serviceRailMoreDots" aria-hidden="true">
                                                                    <span className="eb-clientv2__serviceRailMoreDot" />
                                                                    <span className="eb-clientv2__serviceRailMoreDot" />
                                                                    <span className="eb-clientv2__serviceRailMoreDot" />
                                                                    <span className="eb-clientv2__serviceRailMoreDot" />
                                                                    <span className="eb-clientv2__serviceRailMoreDot" />
                                                                    <span className="eb-clientv2__serviceRailMoreDot" />
                                                                </span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {spotlightCategory ? (() => {
                                                    const from = formatFromPrice({
                                                        pricesByLane,
                                                        laneKey: spotlightCategory.laneKey,
                                                        currencyKey: currency,
                                                        tierKey: "standard",
                                                    });
                                                    const isSelected = spotlightCategory.key === resolvedCatalogCategoryKey;
                                                    const spotlightSelectionActive =
                                                        isSelected && Boolean(String(effectiveTemplateName || "").trim());
                                                    const spotlightCollapsed =
                                                        spotlightSelectionActive && !mobileSpotlightExpanded;
                                                    const spotlightSummaryLine = spotlightSelectionActive
                                                        ? `${effectiveTemplateName} · ${selectedSupportTypeSummaryLabel} · ${selectedSupportPricingMeta.totalLabel || resolvedEstimatedTotal || from}`
                                                        : spotlightCategory.description;

                                                    return (
                                                        <div
                                                            className={classNames(
                                                                "eb-clientv2__serviceSpotlight",
                                                                showCategorySignal && "is-next-step",
                                                                spotlightSelectionActive && "is-selected",
                                                                spotlightCollapsed && "is-collapsed",
                                                            )}
                                                            role="group"
                                                            aria-label="Category spotlight"
                                                        >
                                                                <>
                                                                    {spotlightCollapsed ? (
                                                                        <button
                                                                            type="button"
                                                                            className="eb-clientv2__serviceSpotlightCollapseBtn"
                                                                            onClick={() => setMobileSpotlightExpanded(true)}
                                                                        >
                                                                            <div className="eb-clientv2__serviceSpotlightTop">
                                                                                <div className="eb-clientv2__serviceSpotlightIcon" aria-hidden="true">
                                                                                    {spotlightCategory.icon}
                                                                                </div>
                                                                                <div className="eb-clientv2__serviceSpotlightTopCopy" style={{ minWidth: 0 }}>
                                                                                    <div className="eb-clientv2__serviceSpotlightTitleRow">
                                                                                        <div className="eb-clientv2__serviceSpotlightTitle">
                                                                                            {spotlightCategory.title}
                                                                                        </div>
                                                                                        <span className="eb-clientv2__serviceSpotlightState">Selected</span>
                                                                                    </div>
                                                                                    <div className="eb-clientv2__serviceSpotlightSummaryLine">
                                                                                        {spotlightSummaryLine}
                                                                                    </div>
                                                                                </div>
                                                                                <span className="eb-clientv2__serviceSpotlightTapHint">Tap to edit</span>
                                                                            </div>
                                                                        </button>
                                                                    ) : (
                                                                        <>
                                                                            <div className="eb-clientv2__serviceSpotlightTop">
                                                                                <div className="eb-clientv2__serviceSpotlightIcon" aria-hidden="true">
                                                                                    {spotlightCategory.icon}
                                                                                </div>
                                                                                <div style={{ minWidth: 0 }}>
                                                                                    <div className="eb-clientv2__serviceSpotlightTitle">
                                                                                        {spotlightCategory.title}
                                                                                    </div>
                                                                                    <div className="eb-clientv2__serviceSpotlightFrom">
                                                                                        From <strong>{from}</strong>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="eb-clientv2__serviceSpotlightDesc">
                                                                                {spotlightCategory.description}
                                                                            </div>

                                                                            {spotlightMeta?.badges?.length ? (
                                                                                <div className="eb-clientv2__serviceSpotlightBadges" aria-label="Highlights">
                                                                                    {spotlightMeta.badges.slice(0, 3).map((badge) => (
                                                                                        <span key={badge} className="eb-clientv2__serviceSpotlightBadge">
                                                                                            {badge}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            ) : null}

                                                                            {spotlightMeta?.suggestions?.length ? (
                                                                                <div className="eb-clientv2__serviceSpotlightSuggestions" aria-label="Popular requests">
                                                                                    <div className="eb-clientv2__serviceSpotlightSuggestionsTitle">
                                                                                        Popular in this category
                                                                                    </div>
                                                                                    <div className="eb-clientv2__serviceSpotlightSuggestionsWrap">
                                                                                        <div className="eb-clientv2__serviceSpotlightSuggestionsRow">
                                                                                            {spotlightMeta.suggestions.slice(0, 3).map((s) => (
                                                                                                <span key={s} className="eb-clientv2__serviceSpotlightSuggestion">
                                                                                                    {s}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ) : null}

                                                                            <div className="eb-clientv2__serviceSpotlightActions">
                                                                                <button
                                                                                    type="button"
                                                                                    className="eb-clientv2__spotlightPrimaryBtn"
                                                                                    onClick={() =>
                                                                                        handleSelectCategory(spotlightCategory, {
                                                                                            openTemplate: true,
                                                                                        })
                                                                                    }
                                                                                >
                                                                                    <PremiumDirectionLabel
                                                                                        label={spotlightSelectionActive ? "Change template" : isSelected ? "Choose template" : "Use this category"}
                                                                                        tone="light"
                                                                                    />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className="eb-clientv2__spotlightGhostBtn"
                                                                                    onClick={() => setCategoryDrawerOpen(true)}
                                                                                >
                                                                                    Browse categories
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </>
                                                        </div>
                                                    );
                                                })() : null}
                                            </>
                                        ) : (
                                            <div
                                                ref={serviceGridRef}
                                                className={classNames(
                                                    "eb-clientv2__serviceGrid",
                                                    continueAttempted && !serviceKey && "is-invalid",
                                                    showCategorySignal && "is-next-step",
                                                )}
                                                data-tour="clientv2-service-grid"
                                            >
                                                {CATALOG_CATEGORIES.map((category) => {
                                                    const selected = category.key === resolvedCatalogCategoryKey;
                                                    const from = formatFromPrice({
                                                        pricesByLane,
                                                        laneKey: category.laneKey,
                                                        currencyKey: currency,
                                                        tierKey: "standard",
                                                    });
                                                    return (
                                                        <button
                                                            key={category.key}
                                                            type="button"
                                                            className={classNames("eb-clientv2__serviceCard", selected && "is-selected")}
                                                            onClick={() => handleSelectCategory(category)}
                                                        >
                                                            <div className="eb-clientv2__serviceIcon" aria-hidden="true">
                                                                {category.icon}
                                                            </div>
                                                            <div className="eb-clientv2__serviceTitle">{category.title}</div>
                                                            <div className="eb-clientv2__serviceDesc">{category.description}</div>
                                                            <div className="eb-clientv2__serviceFrom">
                                                                <span>From</span>
                                                                <span className="eb-clientv2__serviceFromPrice">{from}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {resolvedCatalogCategoryKey ? (
                                            <div
                                                ref={templateModelRef}
                                                className={classNames(
                                                    "eb-clientv2__priceModel",
                                                    showTemplateSignal && "is-next-step",
                                                    templateSelected && "is-complete",
                                                )}
                                                data-tour="clientv2-template-picker"
                                            >
                                                <div className="eb-clientv2__priceModelTitleRow">
                                                    <div>
                                                        <div className="eb-clientv2__priceModelTitle">Template</div>
                                                        <div className="eb-clientv2__priceModelContext">
                                                            {resolvedCategory ? resolvedCategory.title : ""}
                                                        </div>
                                                        {showTemplateSignal ? (
                                                            <div className="eb-clientv2__sectionStepCue">
                                                                <NextStepSignalBadge
                                                                    prefix={nextStepSignalPrefix}
                                                                    detail={nextStepSignalDetail}
                                                                    compact
                                                                />
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="eb-clientv2__linkBtn"
                                                        onClick={openTemplatePicker}
                                                    >
                                                        <PremiumDirectionLabel
                                                            label={effectiveTemplateName ? "Change template" : "Choose template"}
                                                            compact
                                                        />
                                                    </button>
                                                </div>
                                                <div className="eb-clientv2__priceModelHint">
                                                    Pick the closest match so pricing, prompts, and pilot matching stay aligned.
                                                </div>
                                                <ToxiTip when={!effectiveTemplateName}>Tip: pick the closest template - you can refine details in Smart builder after.</ToxiTip>
                                                {continueAttempted && !effectiveTemplateName ? (
                                                    <div className="eb-clientv2__inlineError">Select a template to continue.</div>
                                                ) : null}
                                                {effectiveTemplateName ? (
                                                    <div
                                                        className={classNames(
                                                            "eb-clientv2__templateCompactSelection",
                                                            templateSelected && "is-selected",
                                                        )}
                                                    >
                                                        <div className="eb-clientv2__selectionStatusRow">
                                                            <span className="eb-clientv2__selectionStatusBadge">
                                                                <BadgeCheck size={14} aria-hidden="true" />
                                                                {templateChoiceStatusLabel}
                                                            </span>
                                                            <span className="eb-clientv2__selectionStatusHint">{templateChoiceHint}</span>
                                                        </div>
                                                        <div className="eb-clientv2__templateCompactSelectionMain">
                                                            <div className="eb-clientv2__templateCompactSelectionName">{effectiveTemplateName}</div>
                                                            {effectiveTemplate?.description ? (
                                                                <div className="eb-clientv2__templateCompactSelectionDesc">
                                                                    {effectiveTemplate.description}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        <div className="eb-clientv2__templateCompactMetaRow" aria-label="Selected template options">
                                                            <span className="eb-clientv2__templateCompactMetaChip">
                                                                {supportTypeQuestionLabel}: {selectedSupportTypeSummaryLabel}
                                                            </span>
                                                            <span className="eb-clientv2__templateCompactMetaChip is-strong">
                                                                {selectedSupportPricingMeta.totalLabel || resolvedEstimatedTotal || "-"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ marginTop: 10, color: "rgba(15, 23, 42, 0.65)" }}>
                                                        No template selected yet.
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        {serviceKey ? (
                                            <div
                                                ref={pricingTiersRef}
                                                className={classNames(
                                                    "eb-clientv2__priceModel",
                                                    showPricingSignal && "is-next-step",
                                                    prioritySelected && "is-complete",
                                                )}
                                            >
                                                <div className="eb-clientv2__priceModelTitleRow">
                                                    <div>
                                                        <div className="eb-clientv2__priceModelTitle">Priority levels</div>
                                                        <div className="eb-clientv2__priceModelContext">
                                                            {resolvedCategory ? resolvedCategory.title : ""}
                                                        </div>
                                                        {showPricingSignal ? (
                                                            <div className="eb-clientv2__sectionStepCue">
                                                                <NextStepSignalBadge
                                                                    prefix={nextStepSignalPrefix}
                                                                    detail={nextStepSignalDetail}
                                                                    compact
                                                                />
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <button type="button" className="eb-clientv2__linkBtn" onClick={openCategoryPicker}>
                                                        <PremiumDirectionLabel label="Change category" compact />
                                                    </button>
                                                </div>
                                                <div className="eb-clientv2__priceModelHint">Tap a class to see what’s included and why it costs more.</div>
                                                <ToxiTip when={!tierConfirmed}>Tip: choose the lowest tier that still matches urgency + sensitivity. You can change it anytime.</ToxiTip>
                                                <div
                                                    className="eb-clientv2__tierGrid"
                                                    role="list"
                                                    aria-label="Priority levels"
                                                    data-tour="clientv2-tier-grid"
                                                >
                                                    {TIER_DEFINITIONS.map((tier) => {
                                                        const price = formatFromPrice({
                                                            pricesByLane,
                                                            laneKey: serviceKey,
                                                            currencyKey: currency,
                                                            tierKey: tier.key,
                                                        });
                                                        const isSelected = resolvedTierKey === tier.key;
                                                        const isOpen = expandedTierKey === tier.key;
                                                        const showSelectedBadge = isSelected && tierConfirmed;
                                                        return (
                                                            <div
                                                                key={tier.key}
                                                                role="listitem"
                                                                className={classNames(
                                                                    "eb-clientv2__tierCard",
                                                                    isSelected && "is-selected",
                                                                    isOpen && "is-open",
                                                                )}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="eb-clientv2__tierCardTop"
                                                                    aria-expanded={isOpen}
                                                                    onClick={() =>
                                                                        setExpandedTierKey((prev) => (prev === tier.key ? null : tier.key))
                                                                    }
                                                                    onDoubleClick={() => handleSelectTier(tier.key)}
                                                                >
                                                                    <div className="eb-clientv2__tierCardTopLeft">
                                                                        <div className="eb-clientv2__tierLabelRow">
                                                                            <div className="eb-clientv2__tierLabel">{tier.label}</div>
                                                                            {showSelectedBadge ? <span className="eb-clientv2__tierBadge">Selected</span> : null}
                                                                        </div>
                                                                        <div className="eb-clientv2__tierBestFor">{tier.bestFor}</div>
                                                                    </div>
                                                                    <div className="eb-clientv2__tierPrice">{price}</div>
                                                                </button>

                                                                {isOpen ? (
                                                                    <div className="eb-clientv2__tierDetails">
                                                                        <div className="eb-clientv2__tierDetailHeading">Includes</div>
                                                                        <ul className="eb-clientv2__tierBullets">
                                                                            {tier.includes.map((line) => (
                                                                                <li key={line}>{line}</li>
                                                                            ))}
                                                                        </ul>
                                                                        <div className="eb-clientv2__tierDetailHeading">Why this costs more</div>
                                                                        <div className="eb-clientv2__tierWhy">{tier.why}</div>
                                                                        <div className="eb-clientv2__tierActions">
                                                                            <button
                                                                                type="button"
                                                                                className={classNames(
                                                                                    "eb-clientv2__tierSelectBtn",
                                                                                    showSelectedBadge && "is-selected",
                                                                                )}
                                                                                onClick={() => handleSelectTier(tier.key)}
                                                                            >
                                                                                {showSelectedBadge ? "Selected" : "Select this class"}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </section>
                                ) : (
                                    <section className="eb-clientv2__smart">
                                        <div
                                            ref={categorySectionRef}
                                            className={classNames(
                                                "eb-clientv2__smartSection",
                                                "eb-clientv2__smartSection--category",
                                                (showCategorySignal || showTemplateSignal) && "is-next-step",
                                            )}
                                            data-tour="clientv2-category-template"
                                        >
                                            <div className="eb-clientv2__smartSectionHeading">
                                                <div className="eb-clientv2__smartSectionTitle">Category</div>
                                                {showCategorySignal || showTemplateSignal ? (
                                                    <NextStepSignalBadge
                                                        prefix={nextStepSignalPrefix}
                                                        detail={nextStepSignalDetail}
                                                        compact
                                                    />
                                                ) : null}
                                            </div>
                                            {(!categorySelectionComplete || categoryCardExpanded) ? (
                                                <ToxiTip>
                                                    Need a different starting point? Change category/template here - then Toxi tips will update automatically.
                                                </ToxiTip>
                                            ) : null}

                                            <div
                                                className={classNames(
                                                    "eb-clientv2__categoryCard",
                                                    (isMobile || isCompactRailViewport) && "is-mobile",
                                                    categorySelectionComplete && !categoryCardExpanded && "is-collapsed",
                                                    categorySelectionComplete && "is-toggleable",
                                                )}
                                            >
                                                {categorySelectionComplete ? (
                                                    <>
                                                        {categoryCardExpanded ? (
                                                            <button
                                                                type="button"
                                                                className="eb-clientv2__categoryCollapseToggle"
                                                                aria-label="Category selected"
                                                                aria-expanded={categoryCardExpanded}
                                                                onClick={() => setCategoryCardExpanded((prev) => !prev)}
                                                            >
                                                                <div className="eb-clientv2__categoryCardTop">
                                                                    <div className="eb-clientv2__categoryEyebrow">
                                                                        <span className="eb-clientv2__categoryIconBadge" aria-hidden="true">
                                                                            <Sparkles size={14} />
                                                                        </span>
                                                                        <span className="eb-clientv2__categoryEyebrowLabel">Category</span>
                                                                    </div>
                                                                    <span className="eb-clientv2__categoryCardTopRight">
                                                                        <span className="eb-clientv2__selectedState">
                                                                            <BadgeCheck size={14} />
                                                                            Selected
                                                                        </span>
                                                                        <span
                                                                            className={classNames(
                                                                                "eb-clientv2__collapseChevron",
                                                                                categoryCardExpanded && "is-rotated",
                                                                            )}
                                                                            aria-hidden="true"
                                                                        >
                                                                            <ChevronDown size={16} />
                                                                        </span>
                                                                    </span>
                                                                </div>

                                                                <div className="eb-clientv2__categoryMain">
                                                                    <div className="eb-clientv2__categoryName">
                                                                        {resolvedCategory ? resolvedCategory.title : "Select a category"}
                                                                    </div>
                                                                    <div className="eb-clientv2__categoryDesc">
                                                                        {resolvedCategory
                                                                            ? resolvedCategory.description
                                                                            : "Choose the closest service category to shape templates, pricing, and guidance."}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className={classNames(
                                                                    "eb-clientv2__categoryCollapseToggle",
                                                                    "eb-clientv2__categoryCollapseToggle--compact",
                                                                )}
                                                                aria-label="Category selected"
                                                                aria-expanded={categoryCardExpanded}
                                                                onClick={() => setCategoryCardExpanded((prev) => !prev)}
                                                            >
                                                                <span className="eb-clientv2__categoryCompactIcon" aria-hidden="true">
                                                                    {resolvedCategory?.icon || "✨"}
                                                                </span>
                                                                <span className="eb-clientv2__categoryCompactCopy">
                                                                    <span className="eb-clientv2__categoryCompactTop">
                                                                        <span className="eb-clientv2__categoryCompactTitle">
                                                                            {resolvedCategory ? resolvedCategory.title : "Select a category"}
                                                                        </span>
                                                                        <span className="eb-clientv2__categoryCompactState">
                                                                            Selected
                                                                        </span>
                                                                    </span>
                                                                    <span className="eb-clientv2__categoryCompactSummary">
                                                                        {categoryCompactSummary}
                                                                    </span>
                                                                </span>
                                                                <span className="eb-clientv2__categoryCompactEdit">Tap to edit</span>
                                                            </button>
                                                        )}

                                                        {categoryCardExpanded ? (
                                                            <div
                                                                className={classNames(
                                                                    "eb-clientv2__templateSummary",
                                                                    templateSelected && "is-selected",
                                                                    (isMobile || isCompactRailViewport) && "is-mobile",
                                                                )}
                                                            >
                                                                <div className="eb-clientv2__templateSummaryLabel">Selected template</div>
                                                                <div className="eb-clientv2__templateSummaryValueGroup">
                                                                    <div className="eb-clientv2__templateSummaryValue">
                                                                        {effectiveTemplateName || "Choose a template"}
                                                                    </div>
                                                                    {effectiveTemplateName ? (
                                                                        <div className="eb-clientv2__templateSummaryMetaRow">
                                                                            <span className="eb-clientv2__templateSummaryMetaChip">
                                                                                {supportTypeQuestionLabel}: {selectedSupportTypeSummaryLabel}
                                                                            </span>
                                                                            <span className="eb-clientv2__templateSummaryMetaChip is-strong">
                                                                                {selectedSupportPricingMeta.totalLabel || resolvedEstimatedTotal || "-"}
                                                                            </span>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="eb-clientv2__categoryCardTop">
                                                            <div className="eb-clientv2__categoryEyebrow">
                                                                <span className="eb-clientv2__categoryIconBadge" aria-hidden="true">
                                                                    <Sparkles size={14} />
                                                                </span>
                                                                <span className="eb-clientv2__categoryEyebrowLabel">Category</span>
                                                            </div>
                                                            {resolvedCatalogCategoryKey ? (
                                                                <span className="eb-clientv2__selectedState">
                                                                    <BadgeCheck size={14} />
                                                                    Selected
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <div className="eb-clientv2__categoryMain">
                                                            <div className="eb-clientv2__categoryName">
                                                                {resolvedCategory ? resolvedCategory.title : "Select a category"}
                                                            </div>
                                                            <div className="eb-clientv2__categoryDesc">
                                                                {resolvedCategory
                                                                    ? resolvedCategory.description
                                                                    : "Choose the closest service category to shape templates, pricing, and guidance."}
                                                            </div>
                                                        </div>

                                                        <div
                                                            className={classNames(
                                                                "eb-clientv2__templateSummary",
                                                                templateSelected && "is-selected",
                                                                (isMobile || isCompactRailViewport) && "is-mobile",
                                                            )}
                                                        >
                                                            <div className="eb-clientv2__templateSummaryLabel">Selected template</div>
                                                            <div className="eb-clientv2__templateSummaryValueGroup">
                                                                <div className="eb-clientv2__templateSummaryValue">
                                                                    {effectiveTemplateName || "Choose a template"}
                                                                </div>
                                                                {effectiveTemplateName ? (
                                                                    <div className="eb-clientv2__templateSummaryMetaRow">
                                                                        <span className="eb-clientv2__templateSummaryMetaChip">
                                                                            {supportTypeQuestionLabel}: {selectedSupportTypeSummaryLabel}
                                                                        </span>
                                                                        <span className="eb-clientv2__templateSummaryMetaChip is-strong">
                                                                            {selectedSupportPricingMeta.totalLabel || resolvedEstimatedTotal || "-"}
                                                                        </span>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {!categorySelectionComplete || categoryCardExpanded ? (
                                                    <div className="eb-clientv2__categoryActions">
                                                        <button type="button" className="eb-clientv2__linkBtn" onClick={openCategoryPicker}>
                                                            <PremiumDirectionLabel label="Change category" compact />
                                                        </button>
                                                        <button type="button" className="eb-clientv2__linkBtn" onClick={openTemplatePicker}>
                                                            <PremiumDirectionLabel
                                                                label={effectiveTemplateName ? "Change template" : "Choose template"}
                                                                compact
                                                            />
                                                        </button>
                                                    </div>
                                                ) : null}

                                            </div>
                                        </div>

                                        <div
                                            ref={coreSectionRef}
                                            className={classNames(
                                                "eb-clientv2__smartSection",
                                                "eb-clientv2__smartSection--core",
                                                showCoreSignal && "is-next-step",
                                            )}
                                        >
                                            <div className="eb-clientv2__smartSectionHeading">
                                                <div className="eb-clientv2__smartSectionTitle">Core details</div>
                                                {showCoreSignal ? (
                                                    <NextStepSignalBadge
                                                        prefix={nextStepSignalPrefix}
                                                        detail={nextStepSignalDetail}
                                                        compact
                                                    />
                                                ) : null}
                                            </div>
                                            <ToxiTip when={!String(note || "").trim()}>
                                                Include what to do, any must-haves, and a recipient name/phone if needed.
                                            </ToxiTip>
                                            <div className="eb-clientv2__formGrid">
                                                <label className="eb-clientv2__field">
                                                    <span>Short title</span>
                                                    {continueAttempted && !hasTitle ? (
                                                        <span className="eb-clientv2__fieldError">Required</span>
                                                    ) : null}
                                                    <input
                                                        ref={titleFieldRef}
                                                        type="text"
                                                        value={title}
                                                        onChange={(e) => onTitleChange?.(e.target.value)}
                                                        className={classNames(continueAttempted && !hasTitle && "is-invalid")}
                                                        placeholder="e.g. Property inspection"
                                                    />
                                                </label>
                                                <div className="eb-clientv2__field">
                                                    <span>Priority level</span>
                                                    <div className="eb-clientv2__tierInline">
                                                        <div className="eb-clientv2__tierInlineName">{resolvedTier?.label || "Standard"}</div>
                                                        <div className="eb-clientv2__tierInlineDesc">{resolvedTier?.summary || ""}</div>
                                                    </div>
                                                </div>
                                                <label
                                                    ref={noteShellRef}
                                                    className={classNames(
                                                        "eb-clientv2__field",
                                                        "eb-clientv2__field--full",
                                                        "eb-clientv2__noteField",
                                                        allowExpandableNoteField && noteExpanded && "is-expanded",
                                                        !allowExpandableNoteField && "is-mobile-static",
                                                    )}
                                                    data-tour="clientv2-errand-details"
                                                >
                                                    <span>Describe what you need</span>
                                                    {continueAttempted && !String(note || "").trim() ? (
                                                        <span className="eb-clientv2__fieldError">Required</span>
                                                    ) : null}
                                                    <textarea
                                                        ref={noteFieldRef}
                                                        rows={allowExpandableNoteField ? (noteExpanded ? 10 : 5) : 6}
                                                        value={note}
                                                        onChange={(e) => onNoteChange?.(e.target.value)}
                                                        onFocus={() => {
                                                            if (allowExpandableNoteField) setNoteExpanded(true);
                                                        }}
                                                        onClick={() => {
                                                            if (allowExpandableNoteField) setNoteExpanded(true);
                                                        }}
                                                        onBlur={handleNoteFieldBlur}
                                                        className={classNames(continueAttempted && !String(note || "").trim() && "is-invalid")}
                                                        placeholder="Include key details, reference numbers, recipients, and timing constraints…"
                                                    />
                                                </label>

                                                {effectiveTemplate ? (
                                                    <div
                                                        className={classNames(
                                                            "eb-clientv2__noteDraft",
                                                            "eb-clientv2__field--full",
                                                            noteDraftCollapsed && "is-collapsed",
                                                        )}
                                                    >
                                                        <div className="eb-clientv2__noteDraftTop">
                                                            <div>
                                                                <div className="eb-clientv2__noteDraftTitle">AI Suggestion</div>
                                                                <div className="eb-clientv2__noteDraftSubtitle">
                                                                    Pick a style, tweak the draft, then tap Use. (You can still edit everything.)
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="eb-clientv2__noteDraftToggle"
                                                                onClick={() => setNoteDraftCollapsed((prev) => !prev)}
                                                                aria-expanded={!noteDraftCollapsed}
                                                            >
                                                                {noteDraftCollapsed ? "Show" : "Hide"}
                                                            </button>
                                                        </div>

                                                        <AnimatePresence initial={false} mode="wait">
                                                            {!noteDraftCollapsed ? (
                                                                <motion.div
                                                                    key="draft-body"
                                                                    initial={{ opacity: 0, y: -6 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -6 }}
                                                                    transition={{ duration: 0.18, ease: "easeOut" }}
                                                                    className="eb-clientv2__noteDraftBody"
                                                                >
                                                                    <div className="eb-clientv2__noteDraftTones" role="tablist" aria-label="Writing styles">
                                                                        <button
                                                                            type="button"
                                                                            className={classNames(
                                                                                "eb-clientv2__noteDraftTone",
                                                                                noteDraftTone === "friendly" && "is-active",
                                                                            )}
                                                                            onClick={() => setNoteDraftTone("friendly")}
                                                                            role="tab"
                                                                            aria-selected={noteDraftTone === "friendly"}
                                                                        >
                                                                            Friendly
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className={classNames(
                                                                                "eb-clientv2__noteDraftTone",
                                                                                noteDraftTone === "pro" && "is-active",
                                                                            )}
                                                                            onClick={() => setNoteDraftTone("pro")}
                                                                            role="tab"
                                                                            aria-selected={noteDraftTone === "pro"}
                                                                        >
                                                                            Professional
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className={classNames(
                                                                                "eb-clientv2__noteDraftTone",
                                                                                noteDraftTone === "checklist" && "is-active",
                                                                            )}
                                                                            onClick={() => setNoteDraftTone("checklist")}
                                                                            role="tab"
                                                                            aria-selected={noteDraftTone === "checklist"}
                                                                        >
                                                                            Checklist
                                                                        </button>
                                                                    </div>

                                                                    <div className="eb-clientv2__noteDraftPreview" aria-label="AI suggestion draft">
                                                                        <textarea
                                                                            className="eb-clientv2__noteDraftEditor"
                                                                            value={noteDraftEditorText}
                                                                            onChange={(e) => {
                                                                                setNoteDraftEditorText(e.target.value);
                                                                                setNoteDraftDirty(true);
                                                                            }}
                                                                            rows={9}
                                                                            spellCheck
                                                                        />
                                                                    </div>

                                                                    <div className="eb-clientv2__noteDraftActions">
                                                                        <button
                                                                            type="button"
                                                                            className={classNames("eb-clientv2__noteDraftBtn", "is-ghost")}
                                                                            onClick={handleLoadCurrentNoteIntoDraft}
                                                                        >
                                                                            Draft
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className={classNames("eb-clientv2__noteDraftBtn", "is-ghost")}
                                                                            onClick={handleClearDraftEditor}
                                                                        >
                                                                            Clear
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className={classNames("eb-clientv2__noteDraftBtn", "is-ghost")}
                                                                            onClick={handleResetDraftEditor}
                                                                            disabled={!noteDraftDirty}
                                                                        >
                                                                            Reset
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="eb-clientv2__noteDraftBtn"
                                                                            onClick={handleReplaceNoteWithDraft}
                                                                        >
                                                                            Use this draft
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className={classNames("eb-clientv2__noteDraftBtn", "is-ghost")}
                                                                            onClick={handleAppendDraftToNote}
                                                                        >
                                                                            Append
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="eb-clientv2__noteDraftIconBtn"
                                                                            onClick={handleCopyDraft}
                                                                            aria-label="Copy suggested message"
                                                                        >
                                                                            <Copy size={16} />
                                                                        </button>
                                                                        {noteDraftFeedback ? (
                                                                            <span className="eb-clientv2__noteDraftFeedback">{noteDraftFeedback}</span>
                                                                        ) : null}
                                                                    </div>

                                                                    <div className="eb-clientv2__noteDraftFields" aria-label="Quick insert fields">
                                                                        {noteDraftFields.slice(0, 10).map((label) => (
                                                                            <button
                                                                                key={label}
                                                                                type="button"
                                                                                className="eb-clientv2__noteDraftField"
                                                                                onClick={() => handleInsertDraftField(label)}
                                                                            >
                                                                                <ClipboardList size={14} aria-hidden="true" />
                                                                                {label}
                                                                            </button>
                                                                        ))}
                                                                    </div>

                                                                    {noteDraftIsScaffoldish ? (
                                                                        <div className="eb-clientv2__noteDraftHint">
                                                                            Tip: That big dashed template block is just a scaffold. Switch style above to make it feel more human.
                                                                        </div>
                                                                    ) : null}
                                                                </motion.div>
                                                            ) : null}
                                                        </AnimatePresence>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        {serviceKey ? (
                                            <div
                                                className={classNames(
                                                    "eb-clientv2__smartSection",
                                                    "eb-clientv2__smartSection--pricing",
                                                    "eb-clientv2__smartSection--tiers",
                                                    showPricingSignal && "is-next-step",
                                                )}
                                            >
                                                <div className="eb-clientv2__smartSectionHeading">
                                                    <div className="eb-clientv2__smartSectionTitle">Priority level</div>
                                                    {showPricingSignal ? (
                                                        <NextStepSignalBadge
                                                            prefix={nextStepSignalPrefix}
                                                            detail={nextStepSignalDetail}
                                                            compact
                                                        />
                                                    ) : null}
                                                </div>
                                                <div className="eb-clientv2__smartSectionSubtitle">Choose how urgent this errand is.</div>
                                                <motion.div
                                                    layout
                                                    className={classNames(
                                                        "eb-clientv2__selectedTierCardWrap",
                                                        prioritySelected && "is-selected",
                                                    )}
                                                    data-tour="clientv2-tier-grid"
                                                >
                                                    <div
                                                        ref={selectedPricingCardRef}
                                                        className={classNames(
                                                            "eb-clientv2__selectedTierCard",
                                                            prioritySelected && "is-selected",
                                                            !selectedPricingOpen && "is-collapsed",
                                                            selectedPricingOpen && "is-open",
                                                        )}
                                                        onClick={() => {
                                                            if (!selectedPricingOpen) setSelectedPricingOpen(true);
                                                        }}
                                                    >
                                                        <div className="eb-clientv2__selectionStatusRow eb-clientv2__selectionStatusRow--card">
                                                            <span className="eb-clientv2__selectionStatusBadge">
                                                                <BadgeCheck size={14} aria-hidden="true" />
                                                                {priorityChoiceStatusLabel}
                                                            </span>
                                                            {selectedPricingOpen ? (
                                                                <span className="eb-clientv2__selectionStatusHint">{priorityChoiceHint}</span>
                                                            ) : null}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="eb-clientv2__selectedTierToggle"
                                                            aria-expanded={selectedPricingOpen}
                                                            onClick={() => setSelectedPricingOpen((prev) => !prev)}
                                                        >
                                                            <div className="eb-clientv2__selectedTierTopLeft">
                                                                <div className="eb-clientv2__selectedTierName">{resolvedTier?.label || "Standard"}</div>
                                                                <div className="eb-clientv2__selectedTierSummary">{resolvedTierOneLine}</div>
                                                            </div>
                                                            <div className="eb-clientv2__selectedTierTopRight">
                                                                <div className="eb-clientv2__selectedTierPrice">{resolvedTierPrice || "-"}</div>
                                                                <ChevronDown
                                                                    className="eb-clientv2__selectedTierChevron"
                                                                    size={18}
                                                                    aria-hidden="true"
                                                                />
                                                            </div>
                                                        </button>

                                                        <AnimatePresence initial={false} mode="wait">
                                                            {selectedPricingOpen ? (
                                                                <motion.div
                                                                    key="details"
                                                                    initial={{ opacity: 0, y: -6 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -6 }}
                                                                    transition={{ duration: 0.24, ease: "easeOut" }}
                                                                    className="eb-clientv2__selectedTierDetails"
                                                                >
                                                                    <div className="eb-clientv2__tierDetailHeading">Includes</div>
                                                                    <ul className="eb-clientv2__tierBullets">
                                                                        {(Array.isArray(resolvedTier?.includes) ? resolvedTier.includes : []).map((line) => (
                                                                            <li key={line}>{line}</li>
                                                                        ))}
                                                                    </ul>
                                                                    <div className="eb-clientv2__tierDetailHeading">Why this costs more</div>
                                                                    <div className="eb-clientv2__tierWhy">{resolvedTier?.why || ""}</div>
                                                                    <div className="eb-clientv2__selectedTierActions">
                                                                        <button type="button" className="eb-clientv2__selectedTierBtn" onClick={openTierPicker}>
                                                                            Change tier
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className={classNames("eb-clientv2__selectedTierBtn", "is-ghost")}
                                                                            onClick={openCategoryPicker}
                                                                        >
                                                                            Change category
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            ) : null}
                                                        </AnimatePresence>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        ) : null}

                                        <div
                                            ref={locationSectionRef}
                                            className={classNames(
                                                "eb-clientv2__smartSection",
                                                "eb-clientv2__smartSection--location",
                                                (isMobile || isCompactRailViewport) && "is-mobile",
                                                showLocationSignal && "is-next-step",
                                            )}
                                            data-tour="clientv2-location-timing"
                                        >
                                            <div className="eb-clientv2__smartSectionHeader">
                                                <div className="eb-clientv2__smartSectionTitle">Location & timing</div>
                                                <div className="eb-clientv2__smartSectionHeaderRight">
                                                    {showLocationSignal ? (
                                                        <NextStepSignalBadge
                                                            prefix={nextStepSignalPrefix}
                                                            detail={nextStepSignalDetail}
                                                            compact
                                                        />
                                                    ) : null}
                                                    <span className="eb-clientv2__helperChip">{startLocationRequirementCopy}</span>
                                                    {hasPickup ? (
                                                        <button
                                                            type="button"
                                                            className="eb-clientv2__collapseBtn"
                                                            onClick={() => {
                                                                setLocationTimingCollapsed((prev) => !prev);
                                                                setAttachmentsSheetOpen(false);
                                                                setExtraNotesSheetOpen(false);
                                                            }}
                                                            aria-label={
                                                                locationTimingCollapsed
                                                                    ? "Expand location and timing"
                                                                    : "Collapse location and timing"
                                                            }
                                                        >
                                                            <span className="eb-clientv2__collapseBtnLabel">
                                                                {locationTimingCollapsed ? "Edit" : "Collapse"}
                                                            </span>
                                                            <span
                                                                className={classNames(
                                                                    "eb-clientv2__collapseChevron",
                                                                    locationTimingCollapsed && "is-rotated",
                                                                )}
                                                                aria-hidden="true"
                                                            >
                                                                <ChevronDown size={16} />
                                                            </span>
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <input
                                                type="file"
                                                multiple
                                                ref={fileInputRef}
                                                onChange={handleFilesPicked}
                                                style={{ display: "none" }}
                                                aria-hidden="true"
                                                // Safari sometimes ignores click() on hidden inputs unless it's focusable.
                                                tabIndex={-1}
                                            />

                                            <AnimatePresence initial={false} mode="wait">
                                                {locationTimingCollapsed && hasPickup ? (
                                                    <motion.button
                                                        key="location-timing-summary"
                                                        type="button"
                                                        className="eb-clientv2__ltSummary"
                                                        onClick={() => setLocationTimingCollapsed(false)}
                                                        initial={{ opacity: 0, y: -6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -6 }}
                                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                                    >
                                                        <div className="eb-clientv2__ltSummaryMain">
                                                            <div className="eb-clientv2__ltSummaryTop">
                                                                <span className="eb-clientv2__ltSummaryLabel">Start</span>
                                                                <span className="eb-clientv2__ltSummaryValue">
                                                                    {String(pickup || "").trim()}
                                                                </span>
                                                            </div>
                                                            <div className="eb-clientv2__ltSummaryMeta">
                                                                <span className="eb-clientv2__ltPill">
                                                                    {describeSchedule({ scheduleType, scheduleSummary })}
                                                                </span>
                                                                <span className="eb-clientv2__ltPill">
                                                                    {proofRequired ? "Proof" : "No proof"}
                                                                </span>
                                                                {hasDropoff ? (
                                                                    <span className="eb-clientv2__ltPill">End</span>
                                                                ) : null}
                                                                {resolvedSelectedFiles.length ? (
                                                                    <span className="eb-clientv2__ltPill">
                                                                        {resolvedSelectedFiles.length} file(s)
                                                                    </span>
                                                                ) : null}
                                                                {hasNotes ? (
                                                                    <span className="eb-clientv2__ltPill">Note</span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        <div className="eb-clientv2__ltSummaryHint">Tap to edit</div>
                                                    </motion.button>
                                                ) : (
                                                    <motion.div
                                                        key="location-timing-body"
                                                        className="eb-clientv2__formGrid"
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 6 }}
                                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                                    >
                                                        <label className="eb-clientv2__field eb-clientv2__field--full">
                                                            <span className="eb-clientv2__fieldLabel">
                                                                <span>{startLocationFieldLabel}</span>
                                                                {startLocationRequired ? (
                                                                    <span className="eb-clientv2__requiredMark" aria-hidden="true">
                                                                        *
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                            <div className="eb-clientv2__withIcon">
                                                                <MapPin size={16} />
                                                                <input
                                                                    ref={pickupFieldRef}
                                                                    type="text"
                                                                    value={pickup}
                                                                    onChange={(e) => onPickupChange?.(e.target.value)}
                                                                    className={classNames(
                                                                        continueAttempted &&
                                                                            startLocationRequired &&
                                                                            !String(pickup || "").trim() &&
                                                                            "is-invalid",
                                                                    )}
                                                                    placeholder="Where should the task begin?"
                                                                />
                                                            </div>
                                                            {continueAttempted &&
                                                            startLocationRequired &&
                                                            !String(pickup || "").trim() ? (
                                                                <span className="eb-clientv2__fieldError">Starting point is required.</span>
                                                            ) : null}
                                                        </label>

                                                        {hasPickup && !(hasDropoff || dropoffOpen) ? (
                                                            <button
                                                                type="button"
                                                                className="eb-clientv2__actionRow eb-clientv2__field--full"
                                                                onClick={() => {
                                                                    setDropoffOpen(true);
                                                                    window.setTimeout(() => {
                                                                        try {
                                                                            dropoffFieldRef.current?.focus?.();
                                                                        } catch {
                                                                            // ignore
                                                                        }
                                                                    }, 0);
                                                                }}
                                                            >
                                                                <span className="eb-clientv2__actionRowLeft">
                                                                    <MapPin size={16} />
                                                                    <span>Add ending point</span>
                                                                </span>
                                                                <span className="eb-clientv2__actionRowMeta">Optional</span>
                                                            </button>
                                                        ) : null}

                                                        <AnimatePresence initial={false}>
                                                            {hasDropoff || dropoffOpen ? (
                                                                <motion.label
                                                                    key="dropoff-field"
                                                                    className="eb-clientv2__field eb-clientv2__field--full"
                                                                    initial={{ opacity: 0, height: 0, y: -4 }}
                                                                    animate={{ opacity: 1, height: "auto", y: 0 }}
                                                                    exit={{ opacity: 0, height: 0, y: -4 }}
                                                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                                                >
                                                                    <span className="eb-clientv2__fieldLabel eb-clientv2__fieldLabelRow">
                                                                        <span>{endLocationFieldLabel}</span>
                                                                        <span className="eb-clientv2__optionalMark">(optional)</span>
                                                                        <button
                                                                            type="button"
                                                                            className="eb-clientv2__fieldInlineBtn"
                                                                            onClick={(event) => {
                                                                                event.preventDefault();
                                                                                event.stopPropagation();
                                                                                onDropoffChange?.("");
                                                                                setDropoffOpen(false);
                                                                            }}
                                                                        >
                                                                            Clear
                                                                        </button>
                                                                    </span>
                                                                    <div className="eb-clientv2__withIcon">
                                                                        <MapPin size={16} />
                                                                        <input
                                                                            ref={dropoffFieldRef}
                                                                            type="text"
                                                                            value={dropoff}
                                                                            onChange={(e) => onDropoffChange?.(e.target.value)}
                                                                            placeholder="Where should the task end?"
                                                                        />
                                                                    </div>
                                                                </motion.label>
                                                            ) : null}
                                                        </AnimatePresence>
                                                        <div className="eb-clientv2__timingRow eb-clientv2__field--full">
                                                            <div className="eb-clientv2__timingHeader">
                                                                <div className="eb-clientv2__timingLabel">{preferredTimeLabel}</div>
                                                                <div className="eb-clientv2__timingCurrent">{selectedPreferredTimeLabel}</div>
                                                            </div>
                                                            <div className="eb-clientv2__timingChips" role="list" aria-label={preferredTimeLabel}>
                                                                {preferredTimeOptions.map((option) => {
                                                                    return (
                                                                        <button
                                                                            key={option.value}
                                                                            type="button"
                                                                            className={classNames(
                                                                                "eb-clientv2__timingChip",
                                                                                preferredTime === option.value && "is-active",
                                                                            )}
                                                                            aria-label={option.label}
                                                                            onClick={() => handlePreferredTimeSelect(option.value)}
                                                                        >
                                                                            <span className="eb-clientv2__timingChipLabel">{option.compactLabel}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            {scheduleCardVisible ? (
                                                                <div className="eb-clientv2__scheduleCard" role="group" aria-label="Scheduled date and time">
                                                                    <div className="eb-clientv2__scheduleCardTop">
                                                                        <div className="eb-clientv2__scheduleCardTitleRow">
                                                                            <CalendarClock size={16} />
                                                                            <span className="eb-clientv2__scheduleCardTitle">{scheduleCardTitle}</span>
                                                                        </div>
                                                                        {hasScheduledWindow && !recurringTimingSelected ? (
                                                                            <button
                                                                                type="button"
                                                                                className="eb-clientv2__scheduleClearBtn"
                                                                                onClick={() => onClearSchedule?.()}
                                                                            >
                                                                                Clear
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                    <div className="eb-clientv2__scheduleCardSummary">{scheduleCardSummary}</div>
                                                                    {recurringTimingSelected ? (
                                                                        <>
                                                                            <div className="eb-clientv2__scheduleOptionGroup" role="list" aria-label="Repeat frequency">
                                                                                {["weekly", "biweekly", "monthly"].map((frequency) => (
                                                                                    <button
                                                                                        key={frequency}
                                                                                        type="button"
                                                                                        className={classNames(
                                                                                            "eb-clientv2__scheduleOptionChip",
                                                                                            String(recurringFrequency || "weekly") === frequency && "is-active",
                                                                                        )}
                                                                                        onClick={() => onRecurringFrequencyChange?.(frequency)}
                                                                                    >
                                                                                        {formatRecurringFrequencyLabel(frequency)}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                            <div className="eb-clientv2__scheduleSubsection">
                                                                                <div className="eb-clientv2__scheduleSubsectionLabel">Days</div>
                                                                                <div className="eb-clientv2__scheduleOptionGroup" role="list" aria-label="Repeat days">
                                                                                    {RECURRING_DAY_OPTIONS.map((day) => {
                                                                                        const selected = Array.isArray(recurringDays) && recurringDays.includes(day);
                                                                                        return (
                                                                                            <button
                                                                                                key={day}
                                                                                                type="button"
                                                                                                className={classNames(
                                                                                                    "eb-clientv2__scheduleOptionChip",
                                                                                                    "eb-clientv2__scheduleOptionChip--day",
                                                                                                    selected && "is-active",
                                                                                                )}
                                                                                                aria-pressed={selected}
                                                                                                onClick={() => handleRecurringDayToggle(day)}
                                                                                            >
                                                                                                {day.slice(0, 3)}
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                                <div className="eb-clientv2__scheduleCardHint">Pick at least one day for a repeating errand.</div>
                                                                            </div>
                                                                            <label className="eb-clientv2__scheduleTimeField">
                                                                                <span className="eb-clientv2__scheduleSubsectionLabel">Time</span>
                                                                                <input
                                                                                    type="time"
                                                                                    value={String(recurringTime || "09:00")}
                                                                                    onChange={(event) => onRecurringTimeChange?.(event.target.value)}
                                                                                />
                                                                            </label>
                                                                            <button
                                                                                type="button"
                                                                                className="eb-clientv2__scheduleCardAction"
                                                                                onClick={() => {
                                                                                    onPreferredTimeChange?.("schedule_later");
                                                                                    onScheduleTypeChange?.("one_time");
                                                                                    onOpenSchedule?.("future");
                                                                                }}
                                                                            >
                                                                                <span>{scheduleCardActionLabel}</span>
                                                                                <ArrowRight size={15} aria-hidden="true" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            className="eb-clientv2__scheduleCardAction"
                                                                            onClick={() =>
                                                                                onOpenSchedule?.(
                                                                                    preferredTime === "today" ? "today" : "future",
                                                                                )
                                                                            }
                                                                        >
                                                                            <span>{scheduleCardActionLabel}</span>
                                                                            <ArrowRight size={15} aria-hidden="true" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        <div className="eb-clientv2__field--full">
                                                            <button
                                                                type="button"
                                                                className={classNames(
                                                                    "eb-clientv2__actionRow",
                                                                    "eb-clientv2__actionRow--toggle",
                                                                    optionalDetailsExpanded && "is-expanded",
                                                                )}
                                                                aria-expanded={optionalDetailsExpanded}
                                                                aria-controls="clientv2-optional-details"
                                                                onClick={() =>
                                                                    setOptionalDetailsExpanded((current) => !current)
                                                                }
                                                            >
                                                                <span className="eb-clientv2__actionRowLeft">
                                                                    <PlusCircle size={16} />
                                                                    <span>Optional details</span>
                                                                </span>
                                                                <span className="eb-clientv2__actionToggleMeta">
                                                                    <span className="eb-clientv2__actionRowMeta">
                                                                        {optionalDetailsSummaryLabel}
                                                                    </span>
                                                                    <span
                                                                        className={classNames(
                                                                            "eb-clientv2__collapseChevron",
                                                                            optionalDetailsExpanded && "is-rotated",
                                                                        )}
                                                                        aria-hidden="true"
                                                                    >
                                                                        <ChevronDown size={16} />
                                                                    </span>
                                                                </span>
                                                            </button>

                                                            <AnimatePresence initial={false}>
                                                                {optionalDetailsExpanded ? (
                                                                    <motion.div
                                                                        id="clientv2-optional-details"
                                                                        key="clientv2-optional-details"
                                                                        className="eb-clientv2__actionPanel"
                                                                        initial={{ opacity: 0, height: 0, y: -4 }}
                                                                        animate={{ opacity: 1, height: "auto", y: 0 }}
                                                                        exit={{ opacity: 0, height: 0, y: -4 }}
                                                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                                                    >
                                                                        <div className="eb-clientv2__actionStack">
                                                                            <button
                                                                                type="button"
                                                                                className="eb-clientv2__actionRow"
                                                                                onClick={openAttachmentsSheet}
                                                                            >
                                                                                <span className="eb-clientv2__actionRowLeft">
                                                                                    <NotebookPen size={16} />
                                                                                    <span>Attachments</span>
                                                                                </span>
                                                                                <span className="eb-clientv2__actionRowMeta">
                                                                                    {resolvedSelectedFiles.length
                                                                                        ? `${resolvedSelectedFiles.length} file(s)`
                                                                                        : "Optional"}
                                                                                </span>
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                className="eb-clientv2__actionRow"
                                                                                onClick={openExtraNotesSheet}
                                                                            >
                                                                                <span className="eb-clientv2__actionRowLeft">
                                                                                    <NotebookPen size={16} />
                                                                                    <span>Extra notes</span>
                                                                                </span>
                                                                                <span className="eb-clientv2__actionRowMeta">
                                                                                    {hasNotes ? "added" : "Optional"}
                                                                                </span>
                                                                            </button>
                                                                        </div>
                                                                    </motion.div>
                                                                ) : null}
                                                            </AnimatePresence>
                                                        </div>

                                                        <div
                                                            className="eb-clientv2__proofRow eb-clientv2__field--full"
                                                            data-tour="clientv2-proof-toggle"
                                                        >
                                                            <div className="eb-clientv2__proofLeft">
                                                                <ShieldCheck size={16} />
                                                                <div>
                                                                    <div className="eb-clientv2__proofTitle">Request proof or receipt</div>
                                                                    <AnimatePresence initial={false}>
                                                                        {proofRequired ? (
                                                                            <motion.div
                                                                                key="proof-hint"
                                                                                className="eb-clientv2__proofHint"
                                                                                initial={{ opacity: 0, y: -3 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                exit={{ opacity: 0, y: -3 }}
                                                                                transition={{ duration: 0.18, ease: "easeOut" }}
                                                                            >
                                                                                We’ll ask the operator to close the loop with evidence.
                                                                            </motion.div>
                                                                        ) : (
                                                                            <motion.div
                                                                                key="proof-off-hint"
                                                                                className="eb-clientv2__proofHint"
                                                                                initial={{ opacity: 0, y: -3 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                exit={{ opacity: 0, y: -3 }}
                                                                                transition={{ duration: 0.18, ease: "easeOut" }}
                                                                            >
                                                                                Optional. Turn on if you need a receipt, photo, or delivery proof.
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            </div>
                                                            <div className="eb-clientv2__proofControls">
                                                                <span
                                                                    className={classNames(
                                                                        "eb-clientv2__proofState",
                                                                        proofRequired && "is-active",
                                                                    )}
                                                                >
                                                                    {proofRequired ? "On" : "Optional"}
                                                                </span>
                                                                <label className="eb-clientv2__switch">
                                                                    <input
                                                                        type="checkbox"
                                                                        aria-label="Toggle proof requirement"
                                                                        checked={proofRequired}
                                                                        onChange={(e) => {
                                                                            const next = Boolean(e?.target?.checked);
                                                                            setProofRequired(next);
                                                                            announceFlowFeedback(next ? "Proof requested" : "Proof optional");
                                                                            if (next) {
                                                                                setProofProceedPromptDismissed(false);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <span />
                                                                </label>
                                                            </div>
                                                        </div>

                                                        {showProofProceedPrompt ? (
                                                            <div
                                                                className="eb-clientv2__proceedPrompt eb-clientv2__field--full"
                                                                role="group"
                                                                aria-label="Proceed to checkout confirmation"
                                                            >
                                                                <div className="eb-clientv2__proceedPromptText">
                                                                    <div className="eb-clientv2__proceedPromptTitle">
                                                                        Completed and ready to proceed?
                                                                    </div>
                                                                    <div className="eb-clientv2__proceedPromptHint">
                                                                        Confirm you’re ready, then jump to checkout.
                                                                    </div>
                                                                </div>
                                                                <div className="eb-clientv2__proceedPromptActions">
                                                                    <button
                                                                        type="button"
                                                                        className="eb-clientv2__proceedPromptBtn"
                                                                        onClick={handleProceedToCheckout}
                                                                    >
                                                                        Yes, proceed
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className={classNames("eb-clientv2__proceedPromptBtn", "is-ghost")}
                                                                        onClick={() => setProofProceedPromptDismissed(true)}
                                                                    >
                                                                        Not yet
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </section>
                                )}

                                <div ref={summaryRef} className="eb-clientv2__reviewAnchor" aria-hidden="true" />
                                <div className="eb-clientv2__bottomSpacer" aria-hidden="true" />
                            </div>

                            <aside
                                ref={createRailRef}
                                className={classNames(
                                    "eb-clientv2__createRail",
                                    desktopFloatingRailActive && "is-floating-placeholder",
                                )}
                                style={desktopFloatingRailActive && desktopFloatingRailBounds.height
                                    ? { minHeight: `${desktopFloatingRailBounds.height}px` }
                                    : undefined}
                                aria-hidden={desktopFloatingRailActive ? "true" : undefined}
                            >
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.25, ease: "easeOut", delay: 0.06 }}
                                    ref={createRailInnerRef}
                                    className="eb-clientv2__createRailInner"
                                >
                                    {renderCreateRailContent()}
                                </motion.div>
                            </aside>
                        </div>
                    </>
                ) : (
                    <section className="eb-clientv2__errands">
                        <div className="eb-clientv2__errandsHeader">
                            <div>
                                <div className="eb-clientv2__errandsTitle">My Errands</div>
                                <div className="eb-clientv2__errandsSubtitle">Recent errands and your archive.</div>
                            </div>
                            <div className="eb-clientv2__searchRow">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search by title, reference, or starting point…"
                                    aria-label="Search errands"
                                />
                            </div>
                        </div>

                        <div
                            className={classNames(
                                "eb-clientv2__errandsLayout",
                                isMobile && "is-mobile",
                                errandsCompactLayout && "is-compact",
                            )}
                        >
                            <div className="eb-clientv2__errandsLeft">
                                <div className="eb-clientv2__errandSections">
                                    <div>
                                        <div className="eb-clientv2__errandSectionHeader">
                                            <div>
                                                <div className="eb-clientv2__errandSectionTitle">Recent</div>
                                                <div className="eb-clientv2__errandSectionMeta">{splitErrands.liveErrands.length} total</div>
                                            </div>
                                            {!isSearchingErrands && splitErrands.liveErrands.length > 3 ? (
                                                <button
                                                    type="button"
                                                    className="eb-clientv2__errandSectionToggle"
                                                    onClick={() => setLiveErrandsExpanded((v) => !v)}
                                                >
                                                    {liveErrandsExpanded ? "Show less" : `Show all (${splitErrands.liveErrands.length})`}
                                                </button>
                                            ) : null}
                                        </div>

                                        <div className="eb-clientv2__errandList">
                                            {visibleLiveErrands.length === 0 ? (
                                                <div className="eb-clientv2__empty">No errands yet.</div>
                                            ) : (
                                                visibleLiveErrands.map((e) => {
                                                    const id = String(e?.id);
                                                    const status = normalizeStatusKey(e);
                                                    const badge = status || "submitted";
                                                    return (
                                                        <div
                                                            key={`live-${id}`}
                                                            className={classNames("eb-clientv2__errandRow", String(selectedErrandId) === id && "is-selected")}
                                                            onClick={() => setSelectedErrandId(id)}
                                                            role="button"
                                                            tabIndex={0}
                                                            onKeyDown={(evt) => {
                                                                if (evt.key === "Enter") setSelectedErrandId(id);
                                                            }}
                                                        >
                                                            <div className="eb-clientv2__errandRowMain">
                                                                    <div className="eb-clientv2__errandRowTitle">{e?.title || "Errand request"}</div>
                                                                <div className="eb-clientv2__errandRowMeta">
                                                                    <span>{e?.pickupLocation || ""}</span>
                                                                </div>
                                                            </div>
                                                            <div className="eb-clientv2__errandRowRight">
                                                                <span className={classNames("eb-clientv2__status", `is-${badge.replace(/\s+/g, "-")}`)}>{badge}</span>
                                                                <button
                                                                    type="button"
                                                                    className="eb-clientv2__openBtn"
                                                                    onClick={(evt) => {
                                                                        evt.stopPropagation();
                                                                        onOpenErrand?.(e);
                                                                    }}
                                                                >
                                                                    Open
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="eb-clientv2__errandSectionHeader">
                                            <div>
                                                <div className="eb-clientv2__errandSectionTitle">Archive</div>
                                                <div className="eb-clientv2__errandSectionMeta">{splitErrands.archivedErrands.length} total</div>
                                            </div>
                                            {!isSearchingErrands && splitErrands.archivedErrands.length > 0 ? (
                                                <button
                                                    type="button"
                                                    className="eb-clientv2__errandSectionToggle"
                                                    onClick={() => setArchivedErrandsExpanded((v) => !v)}
                                                >
                                                    {archivedErrandsExpanded
                                                        ? "Hide"
                                                        : `Show all (${splitErrands.archivedErrands.length})`}
                                                </button>
                                            ) : null}
                                        </div>

                                        <div className="eb-clientv2__errandList eb-clientv2__errandList--archive">
                                            {visibleArchivedErrands.length === 0 ? (
                                                <div className="eb-clientv2__empty">
                                                    {isSearchingErrands
                                                        ? "No matching archived errands."
                                                        : !archivedErrandsExpanded && splitErrands.archivedErrands.length > 0
                                                            ? `Archived errands are hidden. Click Show all (${splitErrands.archivedErrands.length}) to view.`
                                                            : "No archived errands."}
                                                </div>
                                            ) : (
                                                visibleArchivedErrands.map((e) => {
                                                    const id = String(e?.id);
                                                    const status = normalizeStatusKey(e);
                                                    const badge = status || "archived";
                                                    return (
                                                        <div
                                                            key={`arch-${id}`}
                                                            className={classNames("eb-clientv2__errandRow", String(selectedErrandId) === id && "is-selected")}
                                                            onClick={() => setSelectedErrandId(id)}
                                                            role="button"
                                                            tabIndex={0}
                                                            onKeyDown={(evt) => {
                                                                if (evt.key === "Enter") setSelectedErrandId(id);
                                                            }}
                                                        >
                                                            <div className="eb-clientv2__errandRowMain">
                                                                    <div className="eb-clientv2__errandRowTitle">{e?.title || "Errand request"}</div>
                                                                <div className="eb-clientv2__errandRowMeta">
                                                                    <span>{e?.pickupLocation || ""}</span>
                                                                </div>
                                                            </div>
                                                            <div className="eb-clientv2__errandRowRight">
                                                                <span className={classNames("eb-clientv2__status", `is-${badge.replace(/\s+/g, "-")}`)}>{badge}</span>
                                                                <button
                                                                    type="button"
                                                                    className="eb-clientv2__openBtn"
                                                                    onClick={(evt) => {
                                                                        evt.stopPropagation();
                                                                        onOpenErrand?.(e);
                                                                    }}
                                                                >
                                                                    Open
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {!isMobile ? (
                                <div className="eb-clientv2__errandsRight">
                                    <div className="eb-clientv2__preview">
                                        {selectedErrand ? (
                                            <>
                                                {(() => {
                                                    const status = normalizeStatusKey(selectedErrand) || "submitted";
                                                    const statusLabel = String(status || "submitted").replace(/_/g, " ");
                                                    const reference = String(selectedErrand?.referenceNumber || "").trim();
                                                    const pickupLabel = String(selectedErrand?.pickupLocation || "").trim();
                                                    const dropoffLabel = String(selectedErrand?.dropoffLocation || "").trim();
                                                    const isTrackingLive = Boolean(selectedErrandTrackingInfo?.tracking_allowed);
                                                    const trackingLoading = Boolean(selectedErrandTrackingInfo?.loading);
                                                    const trackingError = String(selectedErrandTrackingInfo?.error || "").trim();
                                                    const liveMapVisible = selectedErrandLiveMapVisible;
                                                    const timelineItems = selectedErrandTimeline.slice(-4);
                                                    const createdAt =
                                                        selectedErrand?.createdAt ||
                                                        selectedErrand?.created_at ||
                                                        selectedErrand?.submittedAt ||
                                                        selectedErrand?.submitted_at ||
                                                        selectedErrand?.created ||
                                                        null;
                                                    const updatedAt =
                                                        selectedErrand?.updatedAt ||
                                                        selectedErrand?.updated_at ||
                                                        selectedErrand?.lastUpdatedAt ||
                                                        selectedErrand?.last_updated_at ||
                                                        null;
                                                    const timestampLabel =
                                                        formatErrandDate(updatedAt) ||
                                                        formatErrandDate(createdAt) ||
                                                        "";
                                                    const timestampPrefix = updatedAt ? "Updated" : createdAt ? "Submitted" : "";

                                                    return (
                                                        <>
                                                            <div className="eb-clientv2__previewHeader">
                                                                <div>
                                                                    <div className="eb-clientv2__previewKicker">Selected errand</div>
                                                                    <div className="eb-clientv2__previewTitle">
                                                                            {selectedErrand?.title || "Errand request"}
                                                                    </div>
                                                                </div>
                                                                <span
                                                                    className={classNames(
                                                                        "eb-clientv2__status",
                                                                        `is-${String(status).replace(/\s+/g, "-")}`,
                                                                    )}
                                                                    title={statusLabel}
                                                                >
                                                                    {statusLabel}
                                                                </span>
                                                            </div>

                                                            <div className="eb-clientv2__previewMetaRow">
                                                                <div className="eb-clientv2__previewMetaBlock">
                                                                    <div className="eb-clientv2__previewMetaLabel">Reference</div>
                                                                    <div className="eb-clientv2__previewMetaValue">
                                                                        {reference || "-"}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    className="eb-clientv2__previewCopyBtn"
                                                                    disabled={!reference}
                                                                    onClick={async () => {
                                                                        if (!reference) return;
                                                                        const ok = await copyToClipboard(reference);
                                                                        setCopyFeedback(ok ? "Copied" : "Copy failed");
                                                                    }}
                                                                >
                                                                    <Copy size={14} />
                                                                    <span>{copyFeedback || "Copy"}</span>
                                                                </button>
                                                            </div>

                                                            {(timestampPrefix && timestampLabel) ? (
                                                                <div className="eb-clientv2__previewTimestamp">
                                                                    <CalendarClock size={14} />
                                                                    <span>{timestampPrefix} {timestampLabel}</span>
                                                                </div>
                                                            ) : null}

                                                            <div className="eb-clientv2__previewInfoGrid">
                                                                <div className="eb-clientv2__previewInfoCard">
                                                                    <div className="eb-clientv2__previewInfoTop">
                                                                        <span className="eb-clientv2__previewInfoIcon" aria-hidden="true">
                                                                            <MapPin size={14} />
                                                                        </span>
                                                                        <div className="eb-clientv2__previewInfoLabel">Starting</div>
                                                                    </div>
                                                                    <div className="eb-clientv2__previewInfoValue">
                                                                        {pickupLabel || "Not set"}
                                                                    </div>
                                                                </div>

                                                                <div className="eb-clientv2__previewInfoCard">
                                                                    <div className="eb-clientv2__previewInfoTop">
                                                                        <span className="eb-clientv2__previewInfoIcon" aria-hidden="true">
                                                                            <MapPin size={14} />
                                                                        </span>
                                                                        <div className="eb-clientv2__previewInfoLabel">Ending</div>
                                                                    </div>
                                                                    <div className="eb-clientv2__previewInfoValue">
                                                                        {dropoffLabel || "Optional"}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="eb-clientv2__previewSection">
                                                                <div className="eb-clientv2__previewSectionHeader">
                                                                    <div className="eb-clientv2__previewSectionTitle">Live activity</div>
                                                                    {isTrackingLive ? (
                                                                        <span className="eb-clientv2__previewLiveBadge">Live now</span>
                                                                    ) : null}
                                                                </div>

                                                                {timelineItems.length ? (
                                                                    <div className="eb-clientv2__previewTimeline" role="list" aria-label="Selected errand timeline">
                                                                        {timelineItems.map((item, index) => {
                                                                            const isCurrent = index === timelineItems.length - 1;
                                                                            const timestamp = formatErrandDateTime(item.timestamp);
                                                                            return (
                                                                                <div
                                                                                    key={item.key}
                                                                                    className={classNames(
                                                                                        "eb-clientv2__previewTimelineItem",
                                                                                        isCurrent && "is-current",
                                                                                    )}
                                                                                    role="listitem"
                                                                                >
                                                                                    <span className="eb-clientv2__previewTimelineDot" aria-hidden="true" />
                                                                                    <div className="eb-clientv2__previewTimelineBody">
                                                                                        <div className="eb-clientv2__previewTimelineLabelRow">
                                                                                            <div className="eb-clientv2__previewTimelineLabel">{item.label}</div>
                                                                                            {timestamp ? (
                                                                                                <div className="eb-clientv2__previewTimelineTime">{timestamp}</div>
                                                                                            ) : null}
                                                                                        </div>
                                                                                        {item.note ? (
                                                                                            <div className="eb-clientv2__previewTimelineNote">{item.note}</div>
                                                                                        ) : null}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <div className="eb-clientv2__previewHint">
                                                                        Activity updates will appear here once the errand starts moving.
                                                                    </div>
                                                                )}

                                                                <div className="eb-clientv2__previewHintRow">
                                                                    {trackingLoading ? (
                                                                        <div className="eb-clientv2__previewHint">Checking live GPS availability…</div>
                                                                    ) : trackingError ? (
                                                                        <div className="eb-clientv2__previewHint">{trackingError}</div>
                                                                    ) : isTrackingLive ? (
                                                                        <div className="eb-clientv2__previewHint">
                                                                            Live GPS is available while the pilot is actively running the errand.
                                                                        </div>
                                                                    ) : (
                                                                        <div className="eb-clientv2__previewHint">
                                                                            Live GPS will appear here after the pilot starts the errand.
                                                                        </div>
                                                                    )}

                                                                    <div className="eb-clientv2__previewActionRow">
                                                                        {selectedErrand?.id ? (
                                                                            <button
                                                                                type="button"
                                                                                className="eb-clientv2__previewSecondaryBtn"
                                                                                onClick={() => refreshTrackingStatus?.(selectedErrand.id)}
                                                                            >
                                                                                Refresh live status
                                                                            </button>
                                                                        ) : null}
                                                                        {isTrackingLive && selectedErrand?.id ? (
                                                                            <button
                                                                                type="button"
                                                                                className="eb-clientv2__previewSecondaryBtn"
                                                                                onClick={() => {
                                                                                    if (liveMapVisible) {
                                                                                        scrollRefIntoView(selectedErrandMapRef, { block: "start" });
                                                                                        return;
                                                                                    }
                                                                                    onOpenTracking?.(selectedErrand);
                                                                                }}
                                                                            >
                                                                                {liveMapVisible ? "Focus live map" : "Open live map"}
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {liveMapVisible ? (
                                                                <div className="eb-clientv2__previewSection" ref={selectedErrandMapRef}>
                                                                    <div className="eb-clientv2__previewSectionHeader">
                                                                        <div className="eb-clientv2__previewSectionTitle">Live GPS map</div>
                                                                    </div>
                                                                    <div className="eb-clientv2__previewMapShell">
                                                                        <Suspense fallback={<div className="eb-clientv2__previewHint">Loading live map…</div>}>
                                                                            <PilotTrackerComponent
                                                                                errandId={selectedErrand.id}
                                                                                apiBaseUrl={apiBaseUrl}
                                                                                isCustomer
                                                                            />
                                                                        </Suspense>
                                                                    </div>
                                                                </div>
                                                            ) : null}

                                                            <button
                                                                type="button"
                                                                className="eb-clientv2__previewOpen"
                                                                onClick={() => onOpenErrand?.(selectedErrand)}
                                                            >
                                                                Open details
                                                            </button>
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <div className="eb-clientv2__previewEmpty">
                                                <div className="eb-clientv2__previewEmptyIcon" aria-hidden="true">
                                                    <ClipboardList size={22} />
                                                </div>
                                                <div className="eb-clientv2__previewEmptyTitle">Select an errand</div>
                                                <div className="eb-clientv2__previewEmptyBody">
                                                    Pick one from the list to see reference, locations, and quick actions.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </section>
                )}

                {attachmentsSheetOpen && typeof document !== "undefined"
                    ? createPortal(
                        <div
                            className="eb-template-browser-overlay"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Attachments"
                            onPointerDown={(event) => {
                                if (event.target === event.currentTarget) setAttachmentsSheetOpen(false);
                            }}
                        >
                            <div
                                className={classNames("eb-template-browser-modal", "eb-clientv2__sheetModal")}
                                onPointerDown={(event) => event.stopPropagation()}
                            >
                                <div className="eb-clientv2__sheetHeader">
                                    <div>
                                        <div className="eb-clientv2__sheetTitle">Attachments</div>
                                        <div className="eb-clientv2__sheetSubtitle">
                                            Optional · Add reference docs, photos, receipts, etc.
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="modal-close"
                                        onClick={() => setAttachmentsSheetOpen(false)}
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="eb-clientv2__sheetBody">
                                    <div className="eb-clientv2__sheetActions">
                                        <button
                                            type="button"
                                            className="eb-clientv2__panelAction"
                                            onClick={() => {
                                                try {
                                                    fileInputRef.current?.click?.();
                                                } catch {
                                                    // ignore
                                                }
                                            }}
                                        >
                                            Add files
                                        </button>
                                        <button
                                            type="button"
                                            className="eb-clientv2__panelAction is-secondary"
                                            onClick={() => setAttachmentsSheetOpen(false)}
                                        >
                                            Done
                                        </button>
                                    </div>

                                    {resolvedSelectedFiles.length ? (
                                        <ul className="eb-clientv2__fileList">
                                            {resolvedSelectedFiles.map((file, idx) => (
                                                <li key={`${file?.name || "file"}-${idx}`} className="eb-clientv2__fileRow">
                                                    <div className="eb-clientv2__fileMain">
                                                        <div className="eb-clientv2__fileName">{file?.name || "Attachment"}</div>
                                                        <div className="eb-clientv2__fileMeta">{formatFileSize(file?.size)}</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="eb-clientv2__fileRemove"
                                                        onClick={() => onRemoveSelectedFile?.(idx)}
                                                    >
                                                        Remove
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="eb-clientv2__panelEmpty">No files added yet.</div>
                                    )}
                                </div>
                            </div>
                        </div>,
                        document.body,
                    )
                    : null}

                {extraNotesSheetOpen && typeof document !== "undefined"
                    ? createPortal(
                        <div
                            className="eb-template-browser-overlay"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Extra notes"
                            onPointerDown={(event) => {
                                if (event.target === event.currentTarget) setExtraNotesSheetOpen(false);
                            }}
                        >
                            <div
                                className={classNames("eb-template-browser-modal", "eb-clientv2__sheetModal")}
                                onPointerDown={(event) => event.stopPropagation()}
                            >
                                <div className="eb-clientv2__sheetHeader">
                                    <div>
                                        <div className="eb-clientv2__sheetTitle">Extra notes</div>
                                        <div className="eb-clientv2__sheetSubtitle">
                                            Optional · Gate codes, parking info, call-on-arrival notes.
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="modal-close"
                                        onClick={() => setExtraNotesSheetOpen(false)}
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="eb-clientv2__sheetBody">
                                    <textarea
                                        ref={extraNotesRef}
                                        rows={6}
                                        value={String(accessNotes || "")}
                                        onChange={(e) => onAccessNotesChange?.(e.target.value)}
                                        maxLength={300}
                                        placeholder="Gate codes, parking instructions, meeting point, or handover details."
                                        className="eb-clientv2__panelTextarea"
                                    />
                                    <div className="eb-clientv2__sheetFooter">
                                        <div className="eb-clientv2__panelCharCount">{String(accessNotes || "").length}/300</div>
                                        <button
                                            type="button"
                                            className="eb-clientv2__panelAction is-secondary"
                                            onClick={() => setExtraNotesSheetOpen(false)}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body,
                    )
                    : null}

                {categoryDrawerOpen && typeof document !== "undefined"
                    ? createPortal(
                        <div
                            className="eb-template-browser-overlay"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Browse categories"
                            onPointerDown={(event) => {
                                if (event.target === event.currentTarget) setCategoryDrawerOpen(false);
                            }}
                        >
                            <div
                                className="eb-template-browser-modal"
                                onPointerDown={(event) => event.stopPropagation()}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        justifyContent: "space-between",
                                        gap: 12,
                                        marginBottom: 12,
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>
                                            Browse categories
                                        </div>
                                        <div style={{ color: "rgba(15, 23, 42, 0.65)", fontSize: 13, marginTop: 4 }}>
                                            Pick a category. Templates and pricing will adapt.
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="modal-close"
                                        onClick={() => setCategoryDrawerOpen(false)}
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="eb-template-browser-list" style={{ minHeight: 260, paddingBottom: 28 }}>
                                    {CATALOG_CATEGORIES.map((category) => {
                                        const isSelected = category.key === resolvedCatalogCategoryKey;
                                        const from = formatFromPrice({
                                            pricesByLane,
                                            laneKey: category.laneKey,
                                            currencyKey: currency,
                                            tierKey: "standard",
                                        });
                                        return (
                                            <button
                                                key={category.key}
                                                type="button"
                                                className="eb-template-browser-item"
                                                aria-current={isSelected ? "true" : undefined}
                                                onClick={() => handleSelectCategory(category)}
                                                style={
                                                    isSelected
                                                        ? {
                                                            background: "rgba(99, 102, 241, 0.08)",
                                                            border: "1px solid rgba(99, 102, 241, 0.25)",
                                                        }
                                                        : {
                                                            background: "rgba(248, 250, 252, 0.85)",
                                                            border: "1px solid rgba(148, 163, 184, 0.35)",
                                                        }
                                                }
                                            >
                                                <div style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }} aria-hidden="true">
                                                    {category.icon || "✨"}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 900,
                                                            color: "#0f172a",
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            gap: 10,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                minWidth: 0,
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {category.title}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: 12,
                                                                fontWeight: 900,
                                                                color: "rgba(15, 23, 42, 0.72)",
                                                            }}
                                                        >
                                                            {from}
                                                        </span>
                                                    </div>
                                                    {category.description ? (
                                                        <div
                                                            style={{
                                                                color: "rgba(15, 23, 42, 0.65)",
                                                                marginTop: 3,
                                                                fontSize: 13,
                                                            }}
                                                        >
                                                            {category.description}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>,
                        document.body,
                    )
                    : null}

                {templatePickerOpen && typeof document !== "undefined"
                    ? createPortal(
                        <div
                            className="eb-template-browser-overlay"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Choose a template"
                            onPointerDown={(event) => {
                                if (event.target === event.currentTarget) setTemplatePickerOpen(false);
                            }}
                        >
                            <div
                                className="eb-template-browser-modal"
                                onPointerDown={(event) => event.stopPropagation()}
                            >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    marginBottom: 12,
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>
                                        Choose a template
                                    </div>
                                    <div style={{ color: "rgba(15, 23, 42, 0.65)", fontSize: 13, marginTop: 4 }}>
                                        {resolvedCategory ? resolvedCategory.title : "Select a category first"}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="modal-close"
                                    onClick={() => setTemplatePickerOpen(false)}
                                    aria-label="Close"
                                >
                                    ×
                                </button>
                            </div>

                            <input
                                type="text"
                                value={templateSearch}
                                onChange={(e) =>
                                    setTemplateSearch(
                                        String(e.target.value || "").replace(
                                            /[\u200B-\u200D\uFEFF]/g,
                                            "",
                                        ),
                                    )
                                }
                                placeholder="Search templates…"
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    border: "1px solid rgba(148, 163, 184, 0.6)",
                                    outline: "none",
                                    marginBottom: 12,
                                    fontSize: 14,
                                }}
                            />

                            {effectiveTemplateName ? (
                                <div className="eb-clientv2__templatePickerSupportCard">
                                    <div className="eb-clientv2__templatePickerSupportTop">
                                        <div>
                                            <div className="eb-clientv2__templatePickerSupportTitle">{effectiveTemplateName}</div>
                                            <div className="eb-clientv2__templatePickerSupportMeta">
                                                {supportTypeQuestionLabel}: {selectedSupportTypeSummaryLabel} · {selectedSupportPricingMeta.totalLabel || resolvedEstimatedTotal || "-"}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={classNames(
                                                "eb-clientv2__templatePickerDoneBtn",
                                                templatePickerDoneReady && "is-ready",
                                            )}
                                            onClick={() => {
                                                setTemplatePickerOpen(false);
                                                if (isMobile && String(effectiveTemplateName || "").trim()) {
                                                    setMobileSpotlightCollapseQueued(true);
                                                }
                                                setPendingScrollToTemplateAndPricing(!shouldSuppressFlowFeedback);
                                            }}
                                        >
                                            Done
                                        </button>
                                    </div>

                                    <div className="eb-clientv2__templatePickerSupportScroller">
										<div ref={templatePickerSupportSwitchRef} className="eb-clientv2__templatePickerSupportSwitch">
                                            {supportTypeOptions.map((option) => {
                                                const pricingMeta = supportPricingByOption[option.id] || {};
                                                const isSelected = supportType === option.id;
                                                return (
                                                    <button
                                                        key={`picker-${option.id}`}
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={isSelected}
                                                        className={classNames(
                                                            "eb-clientv2__supportOption",
                                                            "eb-clientv2__supportOption--compact",
                                                            isSelected && "is-active",
                                                        )}
                                                        onClick={(event) => handleTemplatePickerSupportSelect(option.id, event)}
                                                    >
                                                        <span className="eb-clientv2__supportOptionTitle">{option.label}</span>
                                                        <span className="eb-clientv2__supportOptionMeta">{pricingMeta.deltaLabel || "Included"}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {supportRailState.canScrollLeft ? (
                                            <button
                                                type="button"
                                                className={classNames("eb-clientv2__templatePickerSlideEdge", "is-left")}
                                                aria-label="Scroll support choices left"
                                                onClick={() => scrollTemplatePickerSupportRailBy(-1)}
                                            >
												<ArrowLeft size={15} />
                                            </button>
                                        ) : null}
                                        {supportRailState.canScrollRight ? (
                                            <button
                                                type="button"
                                                className="eb-clientv2__templatePickerSlideEdge"
                                                aria-label="Scroll support choices right"
                                                onClick={() => scrollTemplatePickerSupportRailBy(1)}
                                            >
											<ArrowRight size={15} />
										</button>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            <div
                                ref={templateListRef}
                                className="eb-template-browser-list"
                                style={{ minHeight: 240, paddingBottom: 120 }}
                            >
                                {resolvedCatalogCategoryKey ? null : (
                                    <div style={{ padding: 12, color: "rgba(15, 23, 42, 0.7)" }}>
                                        Select a category first.
                                    </div>
                                )}
                                {resolvedCatalogCategoryKey &&
                                normalizedTemplateSearch &&
                                visibleTemplates.length === 0 ? (
                                    <div style={{ padding: 12, color: "rgba(15, 23, 42, 0.7)" }}>
                                        No templates match your search.
                                    </div>
                                ) : null}
                                {resolvedCatalogCategoryKey &&
                                !normalizedTemplateSearch &&
                                visibleTemplates.length === 0 ? (
                                    <div style={{ padding: 12, color: "rgba(15, 23, 42, 0.7)" }}>
                                        No templates are available for this category yet.
                                    </div>
                                ) : null}
                                {resolvedCatalogCategoryKey
                                    ? visibleTemplates
                                        .filter((tpl) => {
                                            const name = String(tpl?.name || "").trim();
                                            return Boolean(name);
                                        })
                                        .map((tpl) => {
                                        const isSelected =
                                            String(tpl?.name || "").trim() === effectiveTemplateName;
                                        return (
                                            <button
                                                key={tpl.id || String(tpl?.name || "").trim()}
                                                type="button"
                                                className="eb-template-browser-item"
                                                data-template-selected={isSelected ? "true" : "false"}
                                                aria-current={isSelected ? "true" : undefined}
                                                onClick={(event) => {
                                                    handleTemplatePickerTemplateSelect(tpl, event);
                                                }}
                                                style={
                                                    isSelected
                                                        ? {
                                                            background: "rgba(99, 102, 241, 0.08)",
                                                            border: "1px solid rgba(99, 102, 241, 0.25)",
                                                        }
                                                        : {
                                                            background: "rgba(248, 250, 252, 0.85)",
                                                            border: "1px solid rgba(148, 163, 184, 0.35)",
                                                        }
                                                }
                                            >
                                                <div style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }} aria-hidden="true">
                                                    {tpl.icon || "✨"}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="eb-template-browser-itemName" style={{ fontWeight: 900, color: "#0f172a" }}>
                                                        {tpl.name}
                                                        {isSelected ? (
                                                            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: "rgba(79, 70, 229, 1)" }}>
                                                                Selected
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {tpl.description ? (
                                                        <div style={{ color: "rgba(15, 23, 42, 0.65)", marginTop: 3, fontSize: 13 }}>
                                                            {tpl.description}
                                                        </div>
                                                    ) : null}
                                                    {Array.isArray(tpl.requiredSkills) && tpl.requiredSkills.length ? (
                                                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                            {tpl.requiredSkills.slice(0, 4).map((tag) => (
                                                                <span
                                                                    key={`${tpl.id}-${tag}`}
                                                                    style={{
                                                                        fontSize: 11,
                                                                        padding: "2px 8px",
                                                                        borderRadius: 999,
                                                                        background: "rgba(15, 23, 42, 0.06)",
                                                                        color: "rgba(15, 23, 42, 0.7)",
                                                                    }}
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </button>
                                        );
                                    })
                                    : null}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )
                : null}
            </div>
        </div>
    );

    return MotionConfig ? (
        <MotionConfig reducedMotion={reduceDashboardMotion ? "always" : "never"}>{dashboardContent}</MotionConfig>
    ) : (
        <Fragment>{dashboardContent}</Fragment>
    );
}
