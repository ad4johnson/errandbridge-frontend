// Public service catalog (2-layer): top-level categories -> templates.
// This powers Client UI v2 (category cards + template chooser) and keeps
// template depth intact for pricing, routing, and future analytics.

import { TEMPLATE_SUGGESTIONS } from "./templateData";

export const CATALOG_CATEGORIES = [
    {
        key: "personal",
        title: "Personal / Routine",
        description:
            "Routine errands, family support, shopping help, returns, and everyday execution.",
        icon: "📦",
        laneKey: "routine",
    },
    {
        key: "documents",
        title: "Documents & Government",
        description:
            "Passports, certificates, embassy visits, verified collections, and document handling.",
        icon: "📄",
        laneKey: "documents",
    },
    {
        key: "banking",
        title: "Banking & Financial",
        description: "Bank errands and account follow-ups that need verification.",
        icon: "🏦",
        laneKey: "sensitive",
    },
    {
        key: "legal",
        title: "Legal / Sensitive",
        description:
            "Legal submissions, KYC follow-ups, notary support, and higher-trust hand-offs.",
        icon: "🛡️",
        laneKey: "sensitive",
    },
    {
        key: "property",
        title: "Property Inspection",
        description:
            "Remote property verification, site checks, and higher-touch physical inspection tasks.",
        icon: "🏠",
        laneKey: "property",
    },
    {
        key: "airport",
        title: "Airport / Travel",
        description:
            "Travel assistance, airport support, and time-sensitive arrival coordination.",
        icon: "✈️",
        laneKey: "airport",
    },
    {
        key: "family",
        title: "Family Emergency",
        description:
            "Urgent personal support where trust, speed, and proof matter most.",
        icon: "🚑",
        laneKey: "familyEmergency",
    },
    {
        key: "shopping",
        title: "Shopping & Essentials",
        description: "Grocery, pharmacy, and household shopping.",
        icon: "🛍️",
        laneKey: "routine",
    },
    {
        key: "business",
        title: "Business Support",
        description: "Office runs, vendor coordination, and business errands.",
        icon: "🏢",
        laneKey: "routine",
    },
    {
        key: "health",
        title: "Health / Care",
        description: "Care-related errands and health support.",
        icon: "🩺",
        laneKey: "sensitive",
    },
    {
        key: "custom",
        title: "Custom",
        description: "Special errands or anything else that does not match the listed categories.",
        icon: "✨",
        laneKey: "custom",
    },
];

// Templates are operationally meaningful. Each template maps to:
// - laneKey: pricing lane (used by public tier model)
// - requiredSkills: pilot expertise routing tags (future assignment engine)
// - trustLevel: sets expectations + proof defaults
// - builderFields: drives smart-builder prompts (note scaffolding)
export const CATALOG_TEMPLATES = [
    // Documents & Government
    {
        id: "passport_visa_pickup",
        categoryKey: "documents",
        name: "Passport / Visa Pickup",
        description:
            "Collect passports, visas, permits, and official docs from offices.",
        icon: "📄",
        laneKey: "documents",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: [
            "documents",
            "government offices",
            "verification handling",
        ],
        builderFields: [
            "Office / agency name",
            "Reference number",
            "Pickup window / hours",
            "Authorisation letter / ID requirements",
            "Recipient + handover instructions",
            "Proof required (photo/scan/receipt)",
        ],
    },
    {
        id: "embassy_consulate_visit",
        categoryKey: "documents",
        name: "Embassy / Consulate Visit",
        description:
            "Submit or collect documents at an embassy/consulate with updates.",
        icon: "🏛️",
        laneKey: "documents",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["documents", "appointments", "government offices"],
        builderFields: [
            "Embassy/consulate name + address",
            "Appointment time (if any)",
            "What to submit/collect",
            "Reference numbers",
            "Contact person + phone",
            "Proof required (receipt/confirmation)",
        ],
    },
    {
        id: "certificate_collection",
        categoryKey: "documents",
        name: "Certificate Collection",
        description:
            "Birth, marriage, school, or other certificate collection.",
        icon: "🗂️",
        laneKey: "documents",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["documents", "verification", "government offices"],
        builderFields: [
            "Certificate type",
            "Issuing office / registry",
            "Reference number",
            "Name(s) on certificate",
            "Pickup window / requirements",
            "Proof required (scan/photo)",
        ],
    },
    {
        id: "school_document_processing",
        categoryKey: "documents",
        name: "School Document Processing",
        description:
            "Handle school-related submissions, collections, and admin follow-ups.",
        icon: "🎓",
        laneKey: "documents",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["documents", "follow-up", "administration"],
        builderFields: [
            "School name + department",
            "Student name / ID",
            "What to submit/collect",
            "Deadlines",
            "Contact person + phone",
            "Proof required (receipt/scan)",
        ],
    },
    {
        id: "legal_document_submission",
        categoryKey: "documents",
        name: "Legal Document Submission",
        description:
            "Submit legal documents, affidavits, and signed packets with proof.",
        icon: "⚖️",
        laneKey: "documents",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["documents", "verified handling", "proof capture"],
        builderFields: [
            "Recipient office / court / firm",
            "Document list",
            "Filing reference (if any)",
            "Deadline",
            "Delivery / return instructions",
            "Proof required (stamped receipt)",
        ],
    },
    {
        id: "notary_signature_assistance",
        categoryKey: "documents",
        name: "Notary / Signature Assistance",
        description:
            "Coordinate notary visits, signatures, and higher-trust document handling.",
        icon: "🖊️",
        laneKey: "documents",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["documents", "appointments", "verified handling"],
        builderFields: [
            "Notary / lawyer name",
            "Document type",
            "Who needs to sign",
            "Appointment time + location",
            "ID requirements",
            "Proof required (confirmation)",
        ],
    },
    {
        id: "court_registry_filing",
        categoryKey: "legal",
        name: "Court / Registry Submission",
        description:
            "Submit court or registry filings and return stamped proof.",
        icon: "🏛️",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["legal", "government offices", "proof capture"],
        builderFields: [
            "Court/registry name + address",
            "What to file",
            "Case/filing reference (if any)",
            "Deadline",
            "Return instructions (originals/copies)",
            "Proof required (stamped receipt/photo)",
        ],
    },
    {
        id: "kyc_compliance_submission",
        categoryKey: "legal",
        name: "KYC / Verification Follow-up",
        description:
            "Follow up on KYC, verification, and acceptance with a confirmed reference.",
        icon: "🛡️",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["documents", "verification", "confidential handling"],
        builderFields: [
            "Recipient organisation + department",
            "Document checklist",
            "Reference number (if any)",
            "Office hours / appointment",
            "Contact person + phone",
            "Proof required (receipt/reference)",
        ],
    },
    {
        id: "legal_notary",
        categoryKey: "legal",
        name: "Legal / Notary",
        description: "Legal/notary support for sensitive filings and trusted hand-offs.",
        icon: "⚖️",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["legal", "confidential handling", "proof capture"],
        builderFields: [
            "Law firm / notary office",
            "What needs to be signed / submitted",
            "Reference number",
            "Appointment time or deadline",
            "Recipient + contact",
            "Proof required (stamped receipt / confirmation)",
        ],
    },
    {
        id: "sensitive_document_handoff",
        categoryKey: "legal",
        name: "Sensitive Document Handoff",
        description:
            "Transfer confidential documents with identity checks and verified hand-off proof.",
        icon: "🧷",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["confidential handling", "identity verification", "proof capture"],
        builderFields: [
            "Document pack details",
            "Pickup location",
            "Recipient name + ID check requirements",
            "Handoff deadline",
            "Return instructions",
            "Proof required (photo/signature/reference)",
        ],
    },
    {
        id: "compliance_filing_support",
        categoryKey: "legal",
        name: "Compliance / Filing Support",
        description:
            "Handle compliance submissions, regulator filings, and sensitive office follow-through.",
        icon: "🗃️",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["legal", "filing support", "confidential handling"],
        builderFields: [
            "Organisation / regulator name",
            "Filing checklist",
            "Reference number",
            "Deadline",
            "Contact person + phone",
            "Proof required (receipt/reference)",
        ],
    },
    {
        id: "government_office_immigration",
        categoryKey: "documents",
        name: "Government Office / Immigration",
        description:
            "Handle government office submissions, follow-ups, and verified collections.",
        icon: "🏛️",
        laneKey: "documents",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["government offices", "documents", "verification"],
        builderFields: [
            "Agency name",
            "Service type (visa/permit/licence)",
            "Reference number",
            "Documents required",
            "Office hours",
            "Proof required (receipt/confirmation)",
        ],
    },

    // Banking & Financial
    {
        id: "bank_transaction",
        categoryKey: "banking",
        name: "Bank Transaction",
        description: "Deposit, withdrawal, account or branch errands.",
        icon: "🏦",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["finance errands", "verification", "trusted handling"],
        builderFields: [
            "Bank name + branch",
            "Transaction type + amount",
            "Account details (masked as needed)",
            "Required documents (ID/proof)",
            "Receipt requirement",
            "Contact person + phone",
        ],
    },
    {
        id: "card_pickup_replacement",
        categoryKey: "banking",
        name: "Card Pickup / Replacement",
        description:
            "Collect or replace ATM/debit/credit cards with verification.",
        icon: "💳",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["finance errands", "verification", "trusted handling"],
        builderFields: [
            "Bank name + branch",
            "Card type",
            "Pickup authorisation",
            "ID requirements",
            "Handover instructions",
            "Proof required (confirmation)",
        ],
    },
    {
        id: "account_update_kyc",
        categoryKey: "banking",
        name: "Account Update / KYC",
        description:
            "Update customer details, submit KYC docs, and follow up as needed.",
        icon: "🧾",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: [
            "finance errands",
            "documents",
            "verification",
            "follow-up",
        ],
        builderFields: [
            "Bank name + branch",
            "What to update",
            "KYC document list",
            "Deadline",
            "Contact person",
            "Proof required (receipt/confirmation)",
        ],
    },
    {
        id: "bill_payment_settlement",
        categoryKey: "banking",
        name: "Bill Payment / Settlement",
        description:
            "Pay and confirm bills/settlements with receipts as proof.",
        icon: "💡",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["finance errands", "receipts", "trusted handling"],
        builderFields: [
            "Bill type + provider",
            "Amount",
            "Account/reference",
            "Payment method",
            "Receipt requirement",
            "Confirmation contact",
        ],
    },
    {
        id: "pos_atm_followup",
        categoryKey: "banking",
        name: "POS / ATM Follow-up",
        description:
            "Report, trace, or resolve issues with POS/ATM transactions.",
        icon: "🏧",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["finance errands", "follow-up", "documentation"],
        builderFields: [
            "Bank name + branch",
            "Issue summary",
            "Transaction date/time",
            "Amount",
            "Reference number",
            "Proof required (case reference)",
        ],
    },
    {
        id: "cheque_draft_processing",
        categoryKey: "banking",
        name: "Cheque / Draft Processing",
        description:
            "Process banker’s drafts/cheques with required verification.",
        icon: "🪪",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["finance errands", "verification", "documentation"],
        builderFields: [
            "Bank name + branch",
            "Draft/cheque type",
            "Beneficiary",
            "Amount",
            "Collection requirements",
            "Proof required (receipt)",
        ],
    },

    // Personal / Routine
    {
        id: "personal_errand",
        categoryKey: "personal",
        name: "Personal Errand",
        description:
            "Everyday help with personal tasks, pickups, drop-offs, or routine support.",
        icon: "🧍",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["coordination", "communication"],
        builderFields: [
            "What needs to be done",
            "Starting point",
            "Ending point (optional)",
            "Recipient + contact",
            "Timing constraints",
            "Proof required (photo/confirmation)",
        ],
    },
    {
        id: "family_assistance",
        categoryKey: "personal",
        name: "Family Assistance",
        description:
            "Support with family-related errands, check-ins, or household coordination.",
        icon: "👪",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["coordination", "empathy"],
        builderFields: [
            "Who needs support",
            "What to do/check",
            "Location",
            "Contact person + phone",
            "Timing",
            "Proof required (call/photo)",
        ],
    },
    {
        id: "queue_appointment_assistance",
        categoryKey: "personal",
        name: "Queue / Appointment Assistance",
        description:
            "Attend, wait, or support at service centres, offices, or appointments.",
        icon: "🧑‍💼",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["punctuality", "coordination"],
        builderFields: [
            "Venue + address",
            "Appointment time",
            "What to collect/submit",
            "Reference numbers",
            "Contact person",
            "Proof required (receipt/confirmation)",
        ],
    },
    {
        id: "item_return_exchange",
        categoryKey: "personal",
        name: "Item Return / Exchange",
        description:
            "Return or exchange purchased goods and provide proof of completion.",
        icon: "🔁",
        laneKey: "routine",
        trustLevel: "low",
        proofDefault: true,
        requiredSkills: ["coordination", "receipts"],
        builderFields: [
            "Store/vendor",
            "Item description",
            "Receipt/order number",
            "Return/exchange details",
            "Timing",
            "Proof required (receipt/photo)",
        ],
    },
    {
        id: "gift_purchase_delivery",
        categoryKey: "personal",
        name: "Gift Purchase / Delivery",
        description: "Buy and deliver gifts or personal items safely.",
        icon: "🎁",
        laneKey: "routine",
        trustLevel: "low",
        proofDefault: true,
        requiredSkills: ["shopping", "coordination"],
        builderFields: [
            "Gift/item details",
            "Budget",
            "Store/link",
            "Recipient + contact",
            "Delivery window",
            "Proof required (photo/confirmation)",
        ],
    },
    {
        id: "home_support_visit",
        categoryKey: "personal",
        name: "Home Support Visit",
        description:
            "Assist with simple home-related checks or support requests.",
        icon: "🏠",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["inspection", "reporting"],
        builderFields: [
            "Address",
            "What to check",
            "Access instructions",
            "Who to contact on arrival",
            "Deadline",
            "Proof required (photos/notes)",
        ],
    },

    // Shopping & Essentials
    {
        id: "mystery_shopper",
        categoryKey: "shopping",
        name: "Mystery Shopper",
        description:
            "Shop from stores/markets and deliver items with substitutions as needed.",
        icon: "🛍️",
        laneKey: "routine",
        trustLevel: "low",
        proofDefault: true,
        requiredSkills: ["shopping", "substitutions"],
        builderFields: [
            "Store/market name or link",
            "Item list (sizes, colours, brands)",
            "Budget",
            "Substitution preferences",
            "Delivery contact",
            "Proof required (receipt/photo)",
        ],
    },
    {
        id: "grocery_market_run",
        categoryKey: "shopping",
        name: "Grocery / Market Run",
        description: "Buy groceries/household items and deliver.",
        icon: "🧺",
        laneKey: "routine",
        trustLevel: "low",
        proofDefault: true,
        requiredSkills: ["shopping", "substitutions"],
        builderFields: [
            "Store/market",
            "Shopping list",
            "Budget",
            "Substitutions",
            "Delivery contact",
            "Proof required (receipt)",
        ],
    },
    {
        id: "food_order_pickup",
        categoryKey: "shopping",
        name: "Food Order Pickup",
        description: "Pick up a food order and deliver.",
        icon: "🍲",
        laneKey: "routine",
        trustLevel: "low",
        proofDefault: true,
        requiredSkills: ["pickup", "timing"],
        builderFields: [
            "Restaurant name",
            "Order number",
            "Pickup window",
            "Delivery instructions",
            "Dietary notes",
            "Proof required (photo/confirmation)",
        ],
    },
    {
        id: "laundry_dry_cleaning",
        categoryKey: "shopping",
        name: "Laundry / Dry Cleaning",
        description: "Coordinate laundry/dry cleaning pickup and return.",
        icon: "🧺",
        laneKey: "routine",
        trustLevel: "low",
        proofDefault: true,
        requiredSkills: ["coordination", "communication"],
        builderFields: [
            "Laundry shop name",
            "Ticket/order number",
            "Pickup window",
            "Return location",
            "Special handling notes",
            "Proof required (receipt/photo)",
        ],
    },
    {
        id: "electronics_repair_pickup",
        categoryKey: "shopping",
        name: "Electronics / Repair Pickup",
        description:
            "Collect repaired devices, gadgets, or electronics accessories and deliver.",
        icon: "📱",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["coordination", "communication", "receipts"],
        builderFields: [
            "Vendor/repair shop",
            "Device or item description",
            "Repair/job reference",
            "Pickup time window",
            "Delivery contact",
            "Proof required (receipt/photo)",
        ],
    },
    {
        id: "construction_hardware_supplies",
        categoryKey: "shopping",
        name: "Construction / Hardware Supplies",
        description:
            "Buy and deliver hardware, fittings, or construction support items.",
        icon: "✨",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["coordination", "communication", "shopping"],
        builderFields: [
            "Supplier/store name",
            "Item list + quantities",
            "Budget",
            "Pickup timing",
            "Site contact",
            "Proof required (receipt/photo)",
        ],
    },

    // Property inspection
    {
        id: "inspection_verification",
        categoryKey: "property",
        name: "Inspection / Verification",
        description:
            "On-site checks: photos, status verification, measurements, and reporting.",
        icon: "📷",
        laneKey: "property",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["inspection", "photography", "reporting"],
        builderFields: [
            "Address/site",
            "What exactly to inspect",
            "Photos required",
            "Access instructions",
            "Deadline",
            "Report format (bullets/photos)",
        ],
    },
    {
        id: "home_services_repairs",
        categoryKey: "property",
        name: "Home Services / Repairs",
        description:
            "Coordinate tradespeople, repair visits, and simple property support tasks.",
        icon: "🛠️",
        laneKey: "property",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["inspection", "reporting", "coordination"],
        builderFields: [
            "Property address",
            "Service type (plumbing/electrical/etc.)",
            "Provider name/contact",
            "Access instructions",
            "Preferred time window",
            "Proof required (photos/summary)",
        ],
    },
    {
        id: "key_handover_access_check",
        categoryKey: "property",
        name: "Tenant / Agent Property Check",
        description:
            "Meet tenants or agents, confirm access, and verify property condition.",
        icon: "🗝️",
        laneKey: "property",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["inspection", "trusted handling", "reporting"],
        builderFields: [
            "Property address",
            "Who is handing over / receiving",
            "Access method / key details",
            "Time window",
            "Verification requirements",
            "Proof required (photos/signature)",
        ],
    },
    {
        id: "occupancy_utility_check",
        categoryKey: "property",
        name: "Utility / Meter Verification",
        description:
            "Capture meter readings, utility status, and site-readiness proof.",
        icon: "🔎",
        laneKey: "property",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["inspection", "photography", "reporting"],
        builderFields: [
            "Property address",
            "What to verify",
            "Photos or readings required",
            "Access instructions",
            "Deadline",
            "Report format",
        ],
    },
    {
        id: "site_check_project_visit",
        categoryKey: "property",
        name: "Site Check / Project Visit",
        description:
            "Visit a property or project site to capture progress, access, and visual proof.",
        icon: "🏗️",
        laneKey: "property",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["inspection", "photography", "reporting"],
        builderFields: [
            "Site address",
            "What to verify",
            "Project contact",
            "Access instructions",
            "Photos needed",
            "Report format (photos / notes / short summary)",
        ],
    },

    // Airport / Travel
    {
        id: "airport_pickup_assistance",
        categoryKey: "airport",
        name: "Airport Pickup / Assistance",
        description:
            "Meet at airport, coordinate arrival, and assist with transport/hand-off.",
        icon: "✈️",
        laneKey: "airport",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["travel support", "punctuality", "live coordination"],
        builderFields: [
            "Airport + terminal",
            "Flight number + arrival time",
            "Passenger name",
            "Contact number",
            "Destination",
            "Luggage help (yes/no)",
        ],
    },
    {
        id: "travel_airport_assistance",
        categoryKey: "airport",
        name: "Travel / Airport Assistance",
        description:
            "Airport/travel support for arrivals, departures, and coordination.",
        icon: "🛫",
        laneKey: "airport",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["travel assistance", "coordination", "punctuality"],
        builderFields: [
            "Airport or station",
            "Flight/train details",
            "Passenger name",
            "What support is needed",
            "Destination / next stop",
            "Live coordination contact",
        ],
    },
    {
        id: "hotel_hospitality",
        categoryKey: "airport",
        name: "Arrival Coordination",
        description:
            "Coordinate arrival timing, waiting points, and final hand-off updates.",
        icon: "🏨",
        laneKey: "airport",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["travel assistance", "coordination", "communication"],
        builderFields: [
            "Hotel name + address",
            "Guest name",
            "Room/front desk instructions",
            "Item or support needed",
            "Timing window",
            "Proof required (photo/confirmation)",
        ],
    },
    {
        id: "baggage_document_handoff",
        categoryKey: "airport",
        name: "Luggage / Handoff Support",
        description:
            "Support luggage or travel-item hand-offs with verified receipt when needed.",
        icon: "🧳",
        laneKey: "airport",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["travel assistance", "verification", "coordination"],
        builderFields: [
            "Airport/terminal",
            "Passenger or recipient name",
            "Bag/item/document details",
            "Flight details",
            "Handoff instructions",
            "Proof required (photo/signature)",
        ],
    },
    {
        id: "driver_pickup_verification",
        categoryKey: "airport",
        name: "Driver / Pickup Verification",
        description:
            "Verify the assigned driver, vehicle, and hand-off contact before pickup.",
        icon: "🚘",
        laneKey: "airport",
        trustLevel: "high",
        proofDefault: false,
        requiredSkills: ["travel support", "verification", "live coordination"],
        builderFields: [
            "Airport / pickup point",
            "Driver or service name",
            "Vehicle details",
            "Passenger name",
            "Contact number",
            "Verification proof needed (optional)",
        ],
    },

    // Family emergency
    {
        id: "family_emergency_support",
        categoryKey: "family",
        name: "Family Emergency Support",
        description:
            "Urgent family assistance requiring fast response and verified updates.",
        icon: "🚑",
        laneKey: "familyEmergency",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["urgent response", "empathy", "trust verified"],
        builderFields: [
            "Who needs help",
            "Urgency + deadline",
            "Address",
            "Contact person + phone",
            "What to do / check",
            "Proof required (call/photos)",
        ],
    },
    {
        id: "welfare_check_family_visit",
        categoryKey: "family",
        name: "Urgent Welfare Check",
        description:
            "Visit, check in, and provide verified updates for a loved one quickly.",
        icon: "❤️",
        laneKey: "familyEmergency",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["empathy", "trust verified", "reporting"],
        builderFields: [
            "Person to check on",
            "Address",
            "Emergency contact",
            "What to verify",
            "Time sensitivity",
            "Proof required (call/photos)",
        ],
    },
    {
        id: "childcare_school_emergency_handoff",
        categoryKey: "family",
        name: "Rapid Family Coordination",
        description:
            "Coordinate urgent family hand-offs, updates, and next-step logistics fast.",
        icon: "🧒",
        laneKey: "familyEmergency",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["urgent response", "coordination", "trust verified"],
        builderFields: [
            "School or pickup location",
            "Child/student name",
            "Authorised contacts",
            "Pickup deadline",
            "Handoff instructions",
            "Proof required (photo/call)",
        ],
    },
    {
        id: "elder_support_care_check",
        categoryKey: "family",
        name: "Hospital / Care Follow-up",
        description:
            "Handle hospital visits, care confirmations, and verified follow-through updates.",
        icon: "🫶",
        laneKey: "familyEmergency",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["empathy", "care handling", "trust verified"],
        builderFields: [
            "Person needing support",
            "Address",
            "Medication or care notes",
            "Emergency contact",
            "What help is needed",
            "Proof required (call/photos/notes)",
        ],
    },
    {
        id: "emergency_purchase_delivery",
        categoryKey: "family",
        name: "Emergency Purchase / Delivery",
        description:
            "Buy and deliver urgent household, hospital, or family essentials with proof.",
        icon: "🛒",
        laneKey: "familyEmergency",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["urgent response", "empathy", "trust verified"],
        builderFields: [
            "What needs to be purchased",
            "Budget",
            "Pickup store or pharmacy",
            "Delivery address",
            "Recipient + contact",
            "Proof required (receipt/photo/call)",
        ],
    },

    // Custom
    {
        id: "custom_special_errand",
        categoryKey: "custom",
        name: "Special Errand / Other",
        description:
            "Use this when your request does not fit a listed category but still needs hands-on help.",
        icon: "✨",
        laneKey: "custom",
        trustLevel: "medium",
        proofDefault: false,
        requiredSkills: ["coordination", "adaptability", "communication"],
        builderFields: [
            "What needs to be done",
            "Who is involved",
            "Starting point",
            "Ending point (optional)",
            "Preferred time",
            "Key instructions",
        ],
    },

    // Business support
    {
        id: "corporate_logistics",
        categoryKey: "business",
        name: "Corporate Logistics",
        description:
            "Office/vendor coordination, deliveries, and business errands.",
        icon: "🏢",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["business errands", "coordination", "proof capture"],
        builderFields: [
            "Company name + contact",
            "What to deliver/collect",
            "Quantity",
            "Pickup location",
            "Delivery location",
            "Proof required (receipt/signature)",
        ],
    },
    {
        id: "office_supplies_run",
        categoryKey: "business",
        name: "Office Supplies Run",
        description:
            "Purchase and deliver office supplies, printer items, and admin essentials.",
        icon: "🏬",
        laneKey: "routine",
        trustLevel: "low",
        proofDefault: true,
        requiredSkills: ["business errands", "coordination", "receipts"],
        builderFields: [
            "Office/store name",
            "Item list + quantities",
            "Budget or approver",
            "Pickup timing",
            "Delivery location",
            "Proof required (receipt/photo)",
        ],
    },
    {
        id: "vendor_inventory_pickup",
        categoryKey: "business",
        name: "Vendor / Delivery Coordination",
        description:
            "Coordinate vendor deliveries, collections, and confirmed hand-offs.",
        icon: "📦",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["business errands", "coordination", "proof capture"],
        builderFields: [
            "Vendor name + contact",
            "Items to collect",
            "Quantity",
            "Pickup location",
            "Delivery destination",
            "Proof required (receipt/signature)",
        ],
    },
    {
        id: "document_drop_pickup",
        categoryKey: "business",
        name: "Document Drop / Pickup",
        description:
            "Move signed business documents between offices, vendors, or branches with proof.",
        icon: "📄",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["business errands", "documentation", "proof capture"],
        builderFields: [
            "Pickup office",
            "Delivery office",
            "Document pack details",
            "Recipient + contact",
            "Deadline",
            "Proof required (signature/receipt/photo)",
        ],
    },
    {
        id: "office_admin_followup",
        categoryKey: "business",
        name: "Office Admin Follow-up",
        description:
            "Handle admin follow-ups, branch visits, and operational confirmations for teams.",
        icon: "🗂️",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["business errands", "coordination", "documentation"],
        builderFields: [
            "Office / branch name",
            "What to confirm or collect",
            "Reference number",
            "Contact person",
            "Deadline",
            "Proof required (call/reference/photo)",
        ],
    },
    {
        id: "international_parcel_business",
        categoryKey: "business",
        name: "International Parcel",
        description:
            "International parcel support for customs docs, handoff, and coordination.",
        icon: "🌍",
        laneKey: "routine",
        trustLevel: "medium",
        proofDefault: true,
        requiredSkills: ["business errands", "coordination", "documentation"],
        builderFields: [
            "Sender location",
            "Recipient location",
            "Parcel contents",
            "Declared value",
            "Documentation needed",
            "Proof required (receipt/tracking)",
        ],
    },

    // Health / Care
    {
        id: "medical_pharmacy_pickup",
        categoryKey: "health",
        name: "Medical / Pharmacy Pickup",
        description:
            "Pick up prescriptions or medical items and deliver with care.",
        icon: "💊",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["care handling", "verification", "privacy"],
        builderFields: [
            "Pharmacy/clinic name",
            "Prescription/order reference",
            "Pickup name",
            "Special handling (fragile/temp)",
            "Delivery contact",
            "Proof required (receipt/photo)",
        ],
    },
    {
        id: "pet_care_vet_pickup",
        categoryKey: "health",
        name: "Pet Care / Vet Pickup",
        description:
            "Pet care/vet support with careful handling and verified updates.",
        icon: "🐾",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["care handling", "privacy", "verification"],
        builderFields: [
            "Pet name + type",
            "Clinic or groomer",
            "Appointment time",
            "Special handling notes",
            "Emergency contact",
            "Proof required (call/photo)",
        ],
    },
    {
        id: "clinic_lab_document_dropoff",
        categoryKey: "health",
        name: "Lab Result / Test Collection",
        description:
            "Collect lab results, test reports, or care documents with privacy and verification.",
        icon: "🧪",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["care handling", "verification", "privacy"],
        builderFields: [
            "Clinic/lab name",
            "What is being delivered",
            "Reference number",
            "Recipient name",
            "Timing window",
            "Proof required (receipt/photo)",
        ],
    },
    {
        id: "wellness_care_support_visit",
        categoryKey: "health",
        name: "Caregiver Supply Run",
        description:
            "Deliver caregiver supplies, comfort items, and care essentials with verified updates.",
        icon: "🩵",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["care handling", "privacy", "empathy"],
        builderFields: [
            "Person needing support",
            "Address",
            "What support is needed",
            "Medication or care notes",
            "Emergency contact",
            "Proof required (call/photos/notes)",
        ],
    },
    {
        id: "medical_appointment_support",
        categoryKey: "health",
        name: "Medical Appointment Support",
        description:
            "Support appointment attendance, document handoff, and verified medical follow-through.",
        icon: "🩺",
        laneKey: "sensitive",
        trustLevel: "high",
        proofDefault: true,
        requiredSkills: ["care handling", "privacy", "verification"],
        builderFields: [
            "Clinic / hospital name",
            "Patient name",
            "Appointment time",
            "What support is needed",
            "Escort / contact details",
            "Proof required (confirmation / photo / notes)",
        ],
    },
];

function slugifyTemplateId(name) {
    return String(name || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 64);
}

function parseBuilderFieldsFromSuggestion(suggestion) {
    const raw = String(suggestion || "");
    if (!raw) return [];
    return raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !/^add:?$/i.test(line))
        .filter((line) => /-\s*$/.test(line))
        .map((line) => line.replace(/-\s*$/, "").trim())
        .filter(Boolean);
}

function inferLegacyCategoryKey(templateName) {
    const name = String(templateName || "").toLowerCase();
    const explicit = {
        "official document / office pickup": "documents",
        "government office / immigration": "documents",
        "school / campus errand": "documents",
        "courier / document delivery": "documents",
        "bank transaction": "banking",
        "legal / notary": "legal",
        "travel / airport assistance": "airport",
        "medical / pharmacy pickup": "health",
        "pet care / vet pickup": "health",
        "corporate logistics": "business",
        "office supplies run": "business",
        "mystery shopper": "shopping",
        "grocery / market run": "shopping",
        "food order pickup": "shopping",
        "laundry / dry cleaning": "shopping",
        "electronics / repair pickup": "shopping",
        "international parcel": "business",
        "hotel / hospitality": "personal",
        "personal delivery": "personal",
        "event / gift dropoff": "personal",
        "construction / hardware supplies": "shopping",
        "home services / repairs": "property",
        "suggested template": "personal",
    };
    if (explicit[name]) return explicit[name];

    if (name.includes("airport") || name.includes("travel")) return "airport";
    if (name.includes("passport") || name.includes("immigration")) return "documents";
    if (name.includes("bank") || name.includes("transaction") || name.includes("atm"))
        return "banking";
    if (name.includes("legal") || name.includes("notary") || name.includes("court"))
        return "legal";
    if (name.includes("pharmacy") || name.includes("medical") || name.includes("vet"))
        return "health";
    if (name.includes("office")) return "business";
    if (name.includes("grocery") || name.includes("market") || name.includes("food"))
        return "shopping";
    return "personal";
}

function inferLegacyIcon(templateName) {
    const name = String(templateName || "").toLowerCase();
    if (name.includes("passport") || name.includes("document")) return "📄";
    if (name.includes("bank") || name.includes("transaction") || name.includes("atm"))
        return "🏦";
    if (name.includes("legal") || name.includes("notary")) return "⚖️";
    if (name.includes("pharmacy") || name.includes("medical")) return "💊";
    if (name.includes("airport") || name.includes("travel")) return "✈️";
    if (name.includes("grocery") || name.includes("market")) return "🛒";
    if (name.includes("laundry")) return "🧺";
    if (name.includes("electronics") || name.includes("repair")) return "📱";
    if (name.includes("office")) return "🏢";
    if (name.includes("gift") || name.includes("event")) return "🎁";
    return "✨";
}

function inferLegacySkills(categoryKey, laneKey) {
    if (categoryKey === "documents")
        return ["documents", "verification handling", "government offices"];
    if (categoryKey === "banking")
        return ["finance errands", "verification", "trusted handling"];
    if (categoryKey === "legal")
        return ["legal", "confidential handling", "proof capture"];
    if (categoryKey === "airport") return ["travel assistance", "coordination"];
    if (categoryKey === "health") return ["care handling", "privacy", "verification"];
    if (categoryKey === "business") return ["business errands", "coordination"];
    if (laneKey === "property") return ["inspection", "reporting"];
    return ["coordination", "communication"];
}

// Bring forward legacy templates so v2 doesn't lose depth.
// We dedupe by name (base catalog entries win).
try {
    const legacyEntries = Object.entries(TEMPLATE_SUGGESTIONS || {}).filter(
        ([name]) => name && name !== "Other",
    );
    const existingNames = new Set(
        CATALOG_TEMPLATES.map((t) => String(t.name || "").trim().toLowerCase()),
    );
    const legacyTemplates = legacyEntries
        .map(([name, suggestion]) => {
            const categoryKey = inferLegacyCategoryKey(name);
            const category = getCatalogCategoryByKey(categoryKey);
            const laneKey = category?.laneKey || "routine";
            const builderFields = parseBuilderFieldsFromSuggestion(suggestion);
            const firstLine = String(suggestion || "")
                .split("\n")[0]
                .replace(/\s*add:\s*$/i, "")
                .trim();
            return {
                id: `legacy_${slugifyTemplateId(name)}`,
                categoryKey,
                name,
                description: firstLine || "Template",
                icon: inferLegacyIcon(name),
                laneKey,
                trustLevel: laneKey === "routine" ? "low" : "high",
                proofDefault: laneKey !== "routine",
                requiredSkills: inferLegacySkills(categoryKey, laneKey),
                builderFields,
            };
        })
        .filter((t) => !existingNames.has(String(t.name || "").trim().toLowerCase()));
    if (legacyTemplates.length) {
        CATALOG_TEMPLATES.push(...legacyTemplates);
    }
} catch {
    // ignore (catalog should still load even if legacy suggestions change)
}

export function getCatalogCategoryByKey(key) {
    return CATALOG_CATEGORIES.find((c) => c.key === key) || null;
}

export function getTemplatesForCategory(categoryKey) {
    return CATALOG_TEMPLATES.filter((t) => t.categoryKey === categoryKey);
}

export function findTemplateByName(templateName) {
    const needle = String(templateName || "").trim().toLowerCase();
    if (!needle) return null;
    return (
        CATALOG_TEMPLATES.find(
            (t) => String(t.name || "").trim().toLowerCase() === needle,
        ) || null
    );
}

export function validateServiceCatalogV2({ silent = false, logger = console } = {}) {
    const categoryKeys = new Set(CATALOG_CATEGORIES.map((c) => c.key));
    const perCategoryCount = new Map(
        CATALOG_CATEGORIES.map((c) => [c.key, 0]),
    );
    const unknownCategoryTemplates = [];
    const templatesMissingBasics = [];
    const nameCounts = new Map();
    const idCounts = new Map();

    for (const t of CATALOG_TEMPLATES) {
        const id = String(t?.id || "").trim();
        const categoryKey = String(t?.categoryKey || "").trim();
        const name = String(t?.name || "").trim();
        const normalizedName = name.toLowerCase();

        if (!id || !categoryKey || !name) {
            templatesMissingBasics.push({ id, categoryKey, name });
        }

        if (!categoryKeys.has(categoryKey)) {
            unknownCategoryTemplates.push({ id, categoryKey, name });
        } else {
            perCategoryCount.set(categoryKey, (perCategoryCount.get(categoryKey) || 0) + 1);
        }

        if (normalizedName) {
            nameCounts.set(normalizedName, (nameCounts.get(normalizedName) || 0) + 1);
        }
        if (id) {
            idCounts.set(id, (idCounts.get(id) || 0) + 1);
        }
    }

    const emptyCategories = [...perCategoryCount.entries()]
        .filter(([, count]) => count <= 0)
        .map(([key]) => key);

    const duplicateNames = [...nameCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([name, count]) => ({ name, count }));
    const duplicateIds = [...idCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([id, count]) => ({ id, count }));

    const result = {
        emptyCategories,
        duplicateNames,
        duplicateIds,
        unknownCategoryTemplates,
        templatesMissingBasics,
        countsByCategory: Object.fromEntries(perCategoryCount.entries()),
    };

    if (process.env.NODE_ENV !== "production" && !silent) {
        try {
            if (emptyCategories.length) {
                logger?.warn?.(
                    `[CATALOG V2] Categories with zero templates: ${emptyCategories.join(", ")}`,
                );
            }
            if (unknownCategoryTemplates.length) {
                logger?.warn?.(
                    `[CATALOG V2] Templates with unknown categoryKey: ${unknownCategoryTemplates
                        .map((t) => `${t.id || "(no id)"}→${t.categoryKey || "(no category)"}`)
                        .join(", ")}`,
                );
            }
            if (duplicateIds.length) {
                logger?.warn?.(
                    `[CATALOG V2] Duplicate template ids: ${duplicateIds
                        .map((d) => `${d.id}×${d.count}`)
                        .join(", ")}`,
                );
            }
            if (duplicateNames.length) {
                logger?.warn?.(
                    `[CATALOG V2] Duplicate template names: ${duplicateNames
                        .map((d) => `${d.name}×${d.count}`)
                        .join(", ")}`,
                );
            }
            if (templatesMissingBasics.length) {
                logger?.warn?.(
                    `[CATALOG V2] Templates missing id/categoryKey/name: ${templatesMissingBasics.length}`,
                );
            }
        } catch {
            // ignore
        }
    }

    return result;
}
