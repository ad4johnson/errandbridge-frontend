const CATEGORY_BASE_PRICES = {
	routine: { GBP: 35, USD: 45, EUR: 35, NGN: 12000 },
	documents: { GBP: 45, USD: 60, EUR: 45, NGN: 18000 },
	sensitive: { GBP: 65, USD: 85, EUR: 65, NGN: 25000 },
	property: { GBP: 85, USD: 110, EUR: 85, NGN: 30000 },
	airport: { GBP: 55, USD: 70, EUR: 55, NGN: 20000 },
	familyEmergency: { GBP: 69, USD: 90, EUR: 69, NGN: 25000 },
	custom: { GBP: 55, USD: 70, EUR: 55, NGN: 20000 },
};

const SUPPORT_TYPE_CHARGES = {
	standard_assistance: { GBP: 0, USD: 0, EUR: 0, NGN: 0 },
	bike_support: { GBP: 7, USD: 9, EUR: 7, NGN: 3000 },
	car_support: { GBP: 18, USD: 23, EUR: 18, NGN: 7000 },
	flexible: { GBP: 0, USD: 0, EUR: 0, NGN: 0 },
};

const PRIORITY_MULTIPLIERS = {
	standard: 1,
	priority: 1.2,
	premium: 1.45,
};

const DISTANCE_BANDS = [
	{ maxKm: 5, chargeByCurrency: { GBP: 0, USD: 0, EUR: 0, NGN: 0 } },
	{ maxKm: 15, chargeByCurrency: { GBP: 8, USD: 10, EUR: 8, NGN: 3500 } },
	{ maxKm: 30, chargeByCurrency: { GBP: 15, USD: 19, EUR: 15, NGN: 6500 } },
	{ maxKm: 60, chargeByCurrency: { GBP: 28, USD: 35, EUR: 28, NGN: 12000 } },
];

const SAME_CITY_DEFAULT_KM = 8;
const DIFFERENT_CITY_DEFAULT_KM = 24;
const CROSS_REGION_DEFAULT_KM = 75;

function normalizeCurrency(currency) {
	return String(currency || "GBP").trim().toUpperCase();
}

function normalizeCategoryId({ categoryId, laneKey }) {
	const rawCategory = String(categoryId || "").trim();
	if (rawCategory) {
		if (rawCategory === "personal") return "routine";
		if (rawCategory === "banking" || rawCategory === "legal" || rawCategory === "health")
			return "sensitive";
		if (rawCategory === "family") return "familyEmergency";
		if (rawCategory === "shopping" || rawCategory === "business") return "routine";
		return rawCategory;
	}
	return String(laneKey || "routine").trim() || "routine";
}

function normalizeSupportType(value) {
	const raw = String(value || "").trim().toLowerCase();
	if (["standard_assistance", "standard", "foot"].includes(raw)) return "standard_assistance";
	if (["bike_support", "bike"].includes(raw)) return "bike_support";
	if (["car_support", "car"].includes(raw)) return "car_support";
	return "flexible";
}

function normalizePriority(value) {
	const raw = String(value || "").trim().toLowerCase();
	if (raw === "premium") return "premium";
	if (raw === "priority") return "priority";
	return "standard";
}

function normalizeLocationToken(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ")
		.replace(/[^\w,\s/-]/g, "");
}

function extractTailToken(value) {
	const normalized = normalizeLocationToken(value);
	if (!normalized) return "";
	const parts = normalized
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	return parts[parts.length - 1] || normalized;
}

export function estimateDistanceKmFromLocations(startLocation, endLocation) {
	const start = normalizeLocationToken(startLocation);
	const end = normalizeLocationToken(endLocation);

	if (!start || !end) {
		return { distanceKm: null, source: "missing_location" };
	}
	if (start === end) {
		return { distanceKm: 0, source: "exact_match" };
	}
	if (start.includes(end) || end.includes(start)) {
		return { distanceKm: 5, source: "same_place_hint" };
	}

	const startTail = extractTailToken(start);
	const endTail = extractTailToken(end);
	if (startTail && endTail && startTail === endTail) {
		return { distanceKm: SAME_CITY_DEFAULT_KM, source: "same_city_text_inference" };
	}

	const startParts = start.split(",").map((part) => part.trim()).filter(Boolean);
	const endParts = end.split(",").map((part) => part.trim()).filter(Boolean);
	const startRegion = startParts.length > 1 ? startParts[startParts.length - 2] : "";
	const endRegion = endParts.length > 1 ? endParts[endParts.length - 2] : "";
	if (startRegion && endRegion && startRegion !== endRegion) {
		return { distanceKm: CROSS_REGION_DEFAULT_KM, source: "cross_region_text_inference" };
	}

	return { distanceKm: DIFFERENT_CITY_DEFAULT_KM, source: "different_city_text_inference" };
}

function moneyMajorToMinor(amountMajor, currency) {
	const cur = normalizeCurrency(currency);
	if (!Number.isFinite(amountMajor)) return 0;
	if (["JPY", "KRW"].includes(cur)) return Math.round(amountMajor);
	return Math.round(amountMajor * 100);
}

function toMoney(amountMajor, currency) {
	const minor = moneyMajorToMinor(amountMajor, currency);
	return {
		minor,
		amountMinor: minor,
		currency: normalizeCurrency(currency),
	};
}

function getBasePriceMajor({ categoryId, currency }) {
	const cur = normalizeCurrency(currency);
	const categoryPricing = CATEGORY_BASE_PRICES[categoryId] || CATEGORY_BASE_PRICES.routine;
	return Number(categoryPricing?.[cur] ?? categoryPricing?.GBP ?? 35);
}

function getSupportChargeMajor({ supportType, currency }) {
	const cur = normalizeCurrency(currency);
	const supportPricing =
		SUPPORT_TYPE_CHARGES[supportType] || SUPPORT_TYPE_CHARGES.standard_assistance;
	return Number(supportPricing?.[cur] ?? supportPricing?.GBP ?? 0);
}

function resolveDistanceCharge({ distanceKm, currency, hasEndingPoint }) {
	if (!hasEndingPoint) {
		return {
			chargeMajor: 0,
			bandLabel: "Single location",
			isDynamicQuote: false,
		};
	}

	if (!Number.isFinite(distanceKm)) {
		return {
			chargeMajor: 0,
			bandLabel: "Pending route validation",
			isDynamicQuote: false,
		};
	}

	const roundedKm = Math.max(0, Number(distanceKm));
	const matchedBand = DISTANCE_BANDS.find((band) => roundedKm <= band.maxKm);
	if (!matchedBand) {
		const dynamicCharge = normalizeCurrency(currency) === "NGN" ? 15000 : 35;
		return {
			chargeMajor: dynamicCharge,
			bandLabel: "60+ km dynamic route",
			isDynamicQuote: true,
		};
	}

	return {
		chargeMajor: Number(
			matchedBand.chargeByCurrency?.[normalizeCurrency(currency)] ??
				matchedBand.chargeByCurrency?.GBP ??
				0,
		),
		bandLabel: `Up to ${matchedBand.maxKm} km`,
		isDynamicQuote: false,
	};
}

// Contract:
//   priceErrand({...}) =>
//     { total: { minor, currency }, components: Array, meta: Object }
export function priceErrand({
	template,
	templateId,
	categoryId,
	laneKey,
	supportType,
	startLocation,
	endLocation,
	distanceKm,
	priority,
	sensitivityTier,
	schedule,
	currency,
}) {
	const cur = normalizeCurrency(currency);
	const normalizedCategoryId = normalizeCategoryId({ categoryId, laneKey });
	const normalizedSupportType = normalizeSupportType(supportType);
	const normalizedPriority = normalizePriority(priority || sensitivityTier);
	const hasEndingPoint = Boolean(String(endLocation || "").trim());
	const inferredDistance =
		Number.isFinite(distanceKm) && distanceKm >= 0
			? { distanceKm: Number(distanceKm), source: "provided" }
			: estimateDistanceKmFromLocations(startLocation, endLocation);
	const resolvedDistanceKm = inferredDistance.distanceKm;
	const baseMajor = getBasePriceMajor({ categoryId: normalizedCategoryId, currency: cur });

	let supportChargeMajor = getSupportChargeMajor({
		supportType: normalizedSupportType,
		currency: cur,
	});
	if (normalizedSupportType === "flexible") {
		if (Number.isFinite(resolvedDistanceKm) && resolvedDistanceKm > 15) {
			supportChargeMajor = getSupportChargeMajor({
				supportType: "car_support",
				currency: cur,
			});
		} else if (hasEndingPoint) {
			supportChargeMajor = getSupportChargeMajor({
				supportType: "bike_support",
				currency: cur,
			});
		}
	}

	const distanceMeta = resolveDistanceCharge({
		distanceKm: resolvedDistanceKm,
		currency: cur,
		hasEndingPoint,
	});
	const subtotalMajor = baseMajor + distanceMeta.chargeMajor + supportChargeMajor;
	const multiplier = PRIORITY_MULTIPLIERS[normalizedPriority] || 1;
	const finalTotalMajor = subtotalMajor * multiplier;
	const priorityUpliftMajor = Math.max(0, finalTotalMajor - subtotalMajor);

	return {
		total: toMoney(finalTotalMajor, cur),
		components: [
			{
				code: "template_base",
				label: `Base category price (${normalizedCategoryId})`,
				money: toMoney(baseMajor, cur),
			},
			{
				code: "distance_fee",
				label: distanceMeta.bandLabel,
				money: toMoney(distanceMeta.chargeMajor, cur),
			},
			{
				code: "support_type_fee",
				label: `Support type (${normalizedSupportType})`,
				money: toMoney(supportChargeMajor, cur),
			},
			{
				code: "urgency_fee",
				label: `Priority uplift (${normalizedPriority})`,
				money: toMoney(priorityUpliftMajor, cur),
			},
		],
		meta: {
			template: String(template || templateId || "").trim() || null,
			categoryId: normalizedCategoryId,
			supportType: normalizedSupportType,
			priority: normalizedPriority,
			startLocation: String(startLocation || "").trim() || null,
			endLocation: String(endLocation || "").trim() || null,
			distanceKm: Number.isFinite(resolvedDistanceKm)
				? Number(resolvedDistanceKm.toFixed(2))
				: null,
			distanceSource: inferredDistance.source,
			distanceChargePending:
				hasEndingPoint && !Number.isFinite(distanceKm) && !distanceMeta.isDynamicQuote,
			isDynamicQuote: distanceMeta.isDynamicQuote,
			preMultiplierMajor: subtotalMajor,
			priorityMultiplier: multiplier,
		},
		lineItems: [
			{
				code: "final_price",
				label: "Final price",
				minor: moneyMajorToMinor(finalTotalMajor, cur),
				currency: cur,
			},
		],
		schedule: {
			type: schedule?.type || "now",
		},
	};
}

export function matchPilotCapabilities({
	supportType,
	distanceKm,
	pilot,
}) {
	const normalizedSupportType = normalizeSupportType(supportType);
	const km = Number.isFinite(distanceKm) ? Number(distanceKm) : null;
	const hasBike = Boolean(pilot?.hasBike || pilot?.vehicle_type === "bike");
	const hasCar = Boolean(pilot?.hasCar || pilot?.vehicle_type === "car");
	const crossCity = Boolean(pilot?.crossCityAvailable || pilot?.cross_city_available);
	const radiusKm = Number(pilot?.serviceRadius || pilot?.service_radius_km || 0);

	if (normalizedSupportType === "bike_support" && !hasBike) return false;
	if (normalizedSupportType === "car_support" && !hasCar) return false;
	if (km !== null && km > 30 && !crossCity) return false;
	if (km !== null && radiusKm > 0 && km > radiusKm) return false;
	return Boolean(pilot?.verified !== false && pilot?.available !== false);
}
