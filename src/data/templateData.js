export const TEMPLATE_SUGGESTIONS = {
	"Official Document / Office Pickup": `Official document pickup + ending point. Add:
Office/vendor name -
Reference number -
Starting-point time window -`,
	"Personal Delivery": `Personal delivery request. Add:
Item description -
Recipient name/contact -
Ending time window -`,
	"Mystery Shopper": `Shopping request. Add:
Store/market name or link -
Item list (sizes, colours, brands) -
Budget or price range -
Substitution preferences -
Delivery contact -`,
	"Bank Transaction": `Bank transaction support. Add:
Bank name and branch -
Transaction type + amount -
Required documents (ID/proof of address) -`,
	"Medical / Pharmacy Pickup": `Medical/pharmacy pickup. Add:
Pharmacy or clinic name -
Prescription/order reference -
Starting point -
Special handling (temperature-sensitive, fragile) -
Ending contact -`,
	"Government Office / Immigration": `Government/immigration support. Add:
Government agency name -
Service type (visa, permit, licence, etc.) -
Reference number -
Documents required -
Starting point and office hours -
Required ID or authorisation letter -`,
	"Hotel / Hospitality": `Hotel/hospitality request. Add:
Hotel name and reference -
Guest name -
Room number -
Item description -
Ending location (room, front desk, etc.) -
Contact person -`,
	"International Parcel": `International parcel support. Add:
Sender location -
Recipient location -
Package contents (for customs) -
Declared value -
Required documentation (commercial invoice, etc.) -
Insurance needs -`,
	"Legal / Notary": `Legal/notary support. Add:
Law firm or notary name -
Document type (contract, affidavit, etc.) -
Recipient location -
Completion deadline -
Signature requirements -`,
	"Corporate Logistics": `Corporate logistics request. Add:
Company name and contact -
Item/document description -
Quantity -
Special handoff instructions -
Receipt confirmation required -`,
	"Grocery / Market Run": `Grocery/market run. Add:
Store or market name -
Shopping list and brands -
Budget/price range -
Substitution preferences -
Ending contact -`,
	"Food Order Pickup": `Food order pickup. Add:
Restaurant name -
Order number -
Pickup time window -
Ending instructions -
Dietary notes (if any) -`,
	"Laundry / Dry Cleaning": `Laundry/dry cleaning pickup. Add:
Laundry shop name -
Ticket number -
Pickup time window -
Ending location -
Special handling notes -`,
	"Electronics / Repair Pickup": `Electronics/repair pickup. Add:
Vendor name -
Item/device description -
Job/repair reference -
Pickup time window -
Ending contact -`,
	"School / Campus Errand": `School/campus errand. Add:
School name and department -
Contact person -
Starting point -
Ending point -
Timing constraints -`,
	"Event / Gift Dropoff": `Event/gift hand-off. Add:
Event venue -
Recipient name/contact -
Gift/item description -
Ending time -
Access instructions -`,
	"Construction / Hardware Supplies": `Construction/hardware supplies run. Add:
Supplier name -
Item list and quantities -
Pickup time -
Ending site contact -
Safety instructions -`,
	"Home Services / Repairs": `Home service/repairs support. Add:
Service type (plumbing, electrical, etc.) -
Provider name/contact -
Address and access notes -
Preferred time window -
Materials or parts needed -`,
	"Pet Care / Vet Pickup": `Pet care/vet support. Add:
Pet name and type -
Clinic or groomer name -
Appointment time -
Special handling notes -
Emergency contact -`,
	"Travel / Airport Assistance": `Airport/travel support. Add:
Airline and flight number -
Pickup/ending terminal -
Passenger name/contact -
Timing constraints -
Luggage details -`,
	"Office Supplies Run": `Office supplies run. Add:
Office/store name -
Item list and quantities -
Budget or approval contact -
Delivery instructions -`,
	"Courier / Document Delivery": `Deliver the documents from Boluwatife Onifade in Ikeja, Lagos to Mrs Shobowale Adam in Lekki, Lagos. Delivery should be completed before 6pm, and the recipient requires a signature on arrival.`,
	"Suggested Template": `Suggested template. Add:
Provide the key contacts -
Add time windows -
Include any proof expectations -`,
	Other: `Describe your errand. Add:
What needs to be done -
Any special instructions -
Contact information -`,
};

export const TEMPLATE_KEYWORDS = {
	"Official Document / Office Pickup": [
		"office",
		"document",
		"pickup",
		"file",
		"report",
		"memo",
		"contract",
	],
	"Bank Transaction": [
		"bank",
		"account",
		"deposit",
		"withdrawal",
		"transaction",
		"finance",
		"check",
	],
	"Medical / Pharmacy Pickup": [
		"pharmacy",
		"medicine",
		"prescription",
		"doctor",
		"hospital",
		"clinic",
		"medical",
		"drug",
	],
	"Government Office / Immigration": [
		"government",
		"visa",
		"passport",
		"immigration",
		"permit",
		"license",
		"official",
		"agency",
	],
	"Hotel / Hospitality": [
		"hotel",
		"guest",
		"room",
		"hospitality",
		"reservation",
		"check-in",
	],
	"International Parcel": [
		"parcel",
		"international",
		"customs",
		"shipping",
		"cross-border",
		"export",
		"import",
	],
	"Legal / Notary": [
		"legal",
		"notary",
		"lawyer",
		"contract",
		"affidavit",
		"court",
		"attorney",
	],
	"Corporate Logistics": [
		"corporate",
		"business",
		"company",
		"office",
		"logistics",
		"delivery",
		"shipment",
	],
	"Personal Delivery": [
		"deliver",
		"personal",
		"send",
		"gift",
		"item",
		"package",
	],
	"Mystery Shopper": [
		"mystery",
		"mystery shopper",
		"shopper",
		"shopping",
		"boutique",
		"store",
		"buy",
		"purchase",
	],
	"Grocery / Market Run": [
		"grocery",
		"market",
		"supermarket",
		"food",
		"produce",
	],
	"Food Order Pickup": ["restaurant", "food order", "takeout", "pickup food"],
	"Laundry / Dry Cleaning": ["laundry", "dry cleaning", "wash", "cleaning"],
	"Electronics / Repair Pickup": [
		"electronics",
		"repair",
		"device",
		"phone",
		"laptop",
		"service center",
	],
	"School / Campus Errand": [
		"school",
		"campus",
		"university",
		"college",
		"student",
	],
	"Event / Gift Dropoff": ["event", "gift", "venue", "party", "celebration"],
	"Construction / Hardware Supplies": [
		"construction",
		"hardware",
		"supplies",
		"tools",
		"building",
	],
	"Home Services / Repairs": [
		"plumbing",
		"electric",
		"repair",
		"maintenance",
		"home service",
	],
	"Pet Care / Vet Pickup": ["pet", "vet", "veterinary", "grooming", "animal"],
	"Travel / Airport Assistance": [
		"airport",
		"flight",
		"airline",
		"terminal",
		"travel",
	],
	"Office Supplies Run": ["office supplies", "stationery", "printer", "paper"],
	"Courier / Document Delivery": [
		"courier",
		"document delivery",
		"signature",
		"dropoff",
	],
	"Suggested Template": ["suggested", "recommend", "auto"],
	Other: [],
};
