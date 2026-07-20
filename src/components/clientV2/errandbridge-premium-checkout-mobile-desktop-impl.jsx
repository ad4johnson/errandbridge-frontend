import { useEffect, useMemo, useRef, useState } from "react";
import {
	ArrowRight,
	Bot,
	BriefcaseBusiness,
	CalendarClock,
	Check,
	ChevronDown,
	Clock3,
	FileText,
	Landmark,
	MapPin,
	NotebookPen,
	Paperclip,
	Plane,
	Receipt,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	UserRound,
} from "lucide-react";

const categories = [
	{
		id: "personal",
		name: "Personal / Routine",
		displayName: "Personal / Routine",
		description:
			"Routine errands, family support, shopping help, returns, and everyday execution.",
		fromPrice: 35,
		template: "Queue / Appointment Assistance",
		icon: BriefcaseBusiness,
		tags: ["Family support", "Everyday help"],
		tint: "from-violet-50 to-sky-50",
	},
	{
		id: "documents",
		name: "Documents & Government",
		displayName: "Documents & Government",
		description:
			"Passports, certificates, embassy visits, verified collections, and document handling.",
		fromPrice: 45,
		template: "Official Document / Office Pickup",
		icon: FileText,
		tags: ["Verification", "Office handling"],
		tint: "from-indigo-50 to-slate-50",
	},
	{
		id: "banking",
		name: "Banking & Financial",
		displayName: "Banking & Financial",
		description: "Bank errands and account follow-ups that need verification.",
		fromPrice: 65,
		template: "Branch Follow-up / Card Pickup",
		icon: Landmark,
		tags: ["High trust", "Receipts"],
		tint: "from-emerald-50 to-cyan-50",
	},
	{
		id: "legal",
		name: "Legal / Sensitive",
		displayName: "Legal / Sensitive",
		description:
			"Legal submissions, KYC follow-ups, notary support, and higher-trust hand-offs.",
		fromPrice: 65,
		template: "Legal / Sensitive Task",
		icon: ShieldCheck,
		tags: ["Sensitive", "Identity checks"],
		tint: "from-rose-50 to-orange-50",
	},
	{
		id: "health",
		name: "Health / Care",
		displayName: "Health / Care",
		description:
			"Care-related errands, prescription support, and follow-up coordination.",
		fromPrice: 65,
		template: "Prescription Pickup / Care Support",
		icon: Stethoscope,
		tags: ["Privacy-aware", "Care support"],
		tint: "from-teal-50 to-emerald-50",
	},
	{
		id: "travel",
		name: "Airport / Travel",
		displayName: "Airport / Travel",
		description:
			"Travel assistance, airport support, and time-sensitive arrival coordination.",
		fromPrice: 55,
		template: "Airport Pickup / Assistance",
		icon: Plane,
		tags: ["Time-sensitive", "Arrival support"],
		tint: "from-sky-50 to-indigo-50",
	},
];

const pricingByCategory = {
	personal: [
		{
			id: "standard",
			name: "Standard",
			price: 35,
			description: "Best for routine errands with flexible timing.",
		},
		{
			id: "priority",
			name: "Priority",
			price: 55,
			description: "Best for more urgent errands that need faster dispatch.",
		},
		{
			id: "premium",
			name: "Premium",
			price: 85,
			description:
				"Best for urgent, complex, or hands-on errands needing tighter coordination.",
		},
	],
	documents: [
		{
			id: "standard",
			name: "Standard",
			price: 45,
			description:
				"Best for office pickups and normal document coordination.",
		},
		{
			id: "priority",
			name: "Priority",
			price: 65,
			description:
				"Best for time-sensitive document follow-up and faster dispatch.",
		},
		{
			id: "premium",
			name: "Premium",
			price: 95,
			description:
				"Best for higher-sensitivity, urgent, or multi-step document support.",
		},
	],
	banking: [
		{
			id: "standard",
			name: "Standard",
			price: 65,
			description:
				"Best for routine verified banking errands with flexible timing.",
		},
		{
			id: "priority",
			name: "Priority",
			price: 95,
			description:
				"Best for time-sensitive bank follow-ups requiring faster coordination.",
		},
		{
			id: "premium",
			name: "Premium",
			price: 145,
			description:
				"Best for urgent or more complex financial errands needing closer follow-through.",
		},
	],
	legal: [
		{
			id: "standard",
			name: "Standard",
			price: 65,
			description:
				"Best for lower-complexity legal and sensitive support with flexible timing.",
		},
		{
			id: "priority",
			name: "Priority",
			price: 95,
			description:
				"Best for more urgent legal support that needs faster dispatch.",
		},
		{
			id: "premium",
			name: "Premium",
			price: 145,
			description:
				"Best for higher-trust, urgent, or multi-step sensitive tasks.",
		},
	],
	health: [
		{
			id: "standard",
			name: "Standard",
			price: 65,
			description: "Best for care-related support with normal timing.",
		},
		{
			id: "priority",
			name: "Priority",
			price: 90,
			description:
				"Best for time-sensitive prescription or lab-related support.",
		},
		{
			id: "premium",
			name: "Premium",
			price: 130,
			description: "Best for urgent care errands that need extra coordination.",
		},
	],
	travel: [
		{
			id: "standard",
			name: "Standard",
			price: 55,
			description: "Best for routine arrival support with clear timing.",
		},
		{
			id: "priority",
			name: "Priority",
			price: 85,
			description: "Best for tighter arrival windows and faster response.",
		},
		{
			id: "premium",
			name: "Premium",
			price: 125,
			description:
				"Best for urgent travel support, hand-offs, and close follow-through.",
		},
	],
};

const timingOptions = [
	{ id: "asap", label: "ASAP", icon: Clock3 },
	{ id: "schedule", label: "Schedule", icon: CalendarClock },
	{ id: "repeat", label: "Repeat", icon: Receipt },
];

function cx(...classes) {
	return classes.filter(Boolean).join(" ");
}

function formatCurrency(amount, unit = "GBP") {
	return new Intl.NumberFormat("en-GB", {
		style: "currency",
		currency: unit,
		maximumFractionDigits: 2,
	}).format(amount);
}

function getCategory(categoryId) {
	return categories.find((c) => c.id === categoryId) ?? null;
}

function getTiers(categoryId) {
	return categoryId ? pricingByCategory[categoryId] ?? [] : [];
}

function getSelectedTier(categoryId, tierId) {
	const tiers = getTiers(categoryId);
	return tiers.find((t) => t.id === tierId) ?? null;
}

function getBaseTotal(state) {
	const tier = getSelectedTier(state.categoryId, state.pricingTierId);
	let total = tier?.price ?? 0;
	if (state.proofRequired) total += 1.8;
	return total;
}

function isDescriptionUsable(text) {
	const cleaned = text.trim();
	if (!cleaned) return false;
	const words = cleaned.split(/\s+/).filter(Boolean).length;
	const chars = cleaned.length;
	const bulletCount = (cleaned.match(/[\n]\s*[-•*]/g) || []).length;
	return chars >= 90 || words >= 18 || bulletCount >= 3;
}

function getNextStep(state) {
	if (!state.categoryId) {
		return {
			key: "category",
			label: "Choose a category",
			sectionId: "category-section",
			hint:
				"Pick the closest service type so pricing, templates, and next steps stay aligned.",
			progressTarget: 10,
		};
	}
	if (!state.template) {
		return {
			key: "template",
			label: "Choose a template",
			sectionId: "template-section",
			hint:
				"Pick the closest template and the structured prompts will line up automatically.",
			progressTarget: 20,
		};
	}
	if (!state.pricingTierId) {
		return {
			key: "pricing",
			label: "Select priority level",
			sectionId: "pricing-section",
			hint:
				"Choose the lowest tier that still matches urgency and sensitivity.",
			progressTarget: 25,
		};
	}
	if (!isDescriptionUsable(state.description)) {
		return {
			key: "details",
			label: "Describe your errand",
			sectionId: "details-section",
			hint:
				"Include what needs doing, reference numbers, recipients, and timing constraints.",
			progressTarget: 40,
		};
	}
	if (!state.startLocation.trim()) {
		return {
			key: "location",
			label: "Add starting point",
			sectionId: "location-section",
			hint:
				"Add the starting point so operator matching and routing stay accurate.",
			progressTarget: 55,
		};
	}
	if (!state.timing) {
		return {
			key: "timing",
			label: "Choose timing",
			sectionId: "location-section",
			hint:
				"Select ASAP, Schedule, or Repeat so fulfilment follows the right path.",
			progressTarget: 70,
		};
	}
	return {
		key: "review",
		label: "Review & pay",
		sectionId: "review-rail",
		hint:
			"Everything required is in place. Review the summary and continue when ready.",
		progressTarget: 100,
	};
}

function getToxiMessage(state) {
	const next = getNextStep(state);
	const map = {
		category: "Choose a category next so I can tailor pricing, templates, and guidance.",
		template: "Good choice. Pick the closest template and I’ll keep the rest aligned.",
		pricing: "Select a priority level next. I’ll then open the right drafting path for you.",
		details: "Describe the errand in your own words. I’ll help structure the easy parts.",
		location: "Add the starting point next so operator matching and pricing stay accurate.",
		timing: "Choose timing next so dispatch and fulfilment logic are correct.",
		review:
			"Everything required is ready. Review the summary and continue when you’re comfortable.",
	};
	return map[next.key];
}

function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		const onResize = () => setIsMobile(window.innerWidth < 1024);
		onResize();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	return isMobile;
}

function getProgressWidthClass(progress) {
	if (progress >= 100) return "w-full";
	if (progress >= 85) return "w-[85%]";
	if (progress >= 70) return "w-[70%]";
	if (progress >= 55) return "w-[55%]";
	if (progress >= 40) return "w-[40%]";
	if (progress >= 25) return "w-[25%]";
	if (progress >= 20) return "w-[20%]";
	if (progress >= 10) return "w-[10%]";
	return "w-[4%]";
}

const sectionShell =
	"rounded-[28px] border border-slate-200/70 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";

const glassPanel =
	"bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(245,243,255,0.76),rgba(239,246,255,0.78))] border border-violet-200/50 shadow-[0_22px_55px_rgba(15,23,42,0.10),0_6px_20px_rgba(99,102,241,0.08),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl";

const rowCapsule =
	"rounded-[18px] border border-slate-200/70 bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]";

function PremiumDirectionCue({ label, tone = "violet" }) {
	const isEmerald = tone === "emerald";

	return (
		<span
			className={cx(
				"inline-flex items-center gap-2 font-bold transition duration-200 group-hover:tracking-[0.01em]",
				isEmerald ? "text-emerald-700" : "text-violet-600",
			)}
		>
			<span>{label}</span>
			<span
				className={cx(
					"inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-[0_8px_18px_rgba(99,102,241,0.12)] transition duration-200 group-hover:translate-x-0.5",
					isEmerald
						? "border-emerald-200 bg-emerald-100/90 text-emerald-700"
						: "border-violet-200 bg-[linear-gradient(135deg,rgba(124,92,255,0.14),rgba(96,165,250,0.16))] text-violet-600",
				)}
			>
				<ArrowRight className="h-3.5 w-3.5" />
			</span>
		</span>
	);
}

function SectionCard({ id, title, accentClass, active, children, right }) {
	return (
		<section
			id={id}
			className={cx(
				sectionShell,
				accentClass,
				"p-5 lg:p-6 transition-all",
				active &&
					"ring-2 ring-violet-300/60 shadow-[0_0_0_6px_rgba(167,139,250,0.08),0_18px_55px_rgba(15,23,42,0.08)]",
			)}
		>
			<div className="mb-4 flex items-start justify-between gap-3">
				<div>
					<h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-slate-950">
						{title}
					</h3>
				</div>
				{right}
			</div>
			{children}
		</section>
	);
}

function GlassReadinessBar({ progress, nextLabel, nextHint, onJump, isMobile }) {
	const progressWidthClass = getProgressWidthClass(progress);

	if (isMobile) {
		return (
			<button
				type="button"
				onClick={onJump}
				className={cx(
					glassPanel,
					"group w-full rounded-[22px] px-4 py-3 text-left transition hover:-translate-y-[1px]",
				)}
				aria-label={`Checkout readiness ${progress} percent. Next step ${nextLabel}.`}
			>
				<div className="flex items-center justify-between gap-3">
					<div className="inline-flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
						<Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" />
						<span className="truncate">Next up</span>
					</div>
					<div className="shrink-0 text-[22px] font-black tracking-[-0.04em] text-violet-600">
						{progress}%
					</div>
				</div>
				<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
					<div
						className={cx(
							"h-full rounded-full bg-[linear-gradient(90deg,#7c3aed,#8b5cf6,#7aa2ff)] transition-all duration-300",
							progressWidthClass,
						)}
					/>
				</div>
				<div className="mt-2 flex items-center justify-between gap-3">
					<div className="min-w-0">
						<div className="truncate text-[15px] font-semibold text-slate-900">
							{nextLabel}
						</div>
						<div className="truncate text-[12px] text-slate-500">
							{nextHint || "Tap to jump ahead"}
						</div>
					</div>
					<span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-[linear-gradient(135deg,rgba(124,92,255,0.14),rgba(96,165,250,0.14))] text-violet-600 shadow-[0_8px_18px_rgba(99,102,241,0.12)] transition duration-200 group-hover:translate-x-0.5">
						<ArrowRight className="h-4 w-4" />
					</span>
				</div>
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={onJump}
			className={cx(
				glassPanel,
				"group flex w-full items-center justify-between gap-3 rounded-[24px] px-4 py-3 text-left transition hover:-translate-y-[1px]",
			)}
		>
			<div className="min-w-0">
				<div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500">
					<Sparkles className="h-4 w-4" /> Checkout readiness
				</div>
				<div className="truncate text-[15px] font-semibold text-slate-900">
					Next: {nextLabel}
				</div>
			</div>
			<div className="shrink-0 rounded-full border border-violet-200/70 bg-white/80 px-3 py-1 text-sm font-extrabold text-violet-600">
				{progress}%
			</div>
		</button>
	);
}

function ReviewRail({ state, progress, nextStep, onContinue }) {
	const clampedProgress = Math.max(0, Math.min(100, Number(progress) || 0));
	const ringRadius = 14;
	const ringCircumference = 2 * Math.PI * ringRadius;
	const ringOffset = ringCircumference * (1 - clampedProgress / 100);

	const category = getCategory(state.categoryId);
	const tier = getSelectedTier(state.categoryId, state.pricingTierId);
	const total = getBaseTotal(state);

	return (
		<div id="review-rail" className="space-y-4">
			<div className={cx(sectionShell, glassPanel, "rounded-[30px] p-5")}>
				<div className="mb-4 flex items-start justify-between gap-4">
					<div>
						<div className="text-xs text-slate-500">Checkout</div>
						<h3 className="text-[18px] font-extrabold tracking-[-0.02em] text-slate-950">
							Review &amp; pay
						</h3>
						<div className="mt-1 text-sm font-semibold text-slate-600">
							Next step: {nextStep.label}
						</div>
					</div>
					<div className="relative h-12 w-12 shrink-0 rounded-full bg-white/70 p-1 shadow-inner">
						<div className="absolute inset-0 rounded-full border border-violet-200/50" />
						<svg
							className="absolute inset-1"
							viewBox="0 0 36 36"
							aria-hidden="true"
							focusable="false"
						>
							<circle
								cx="18"
								cy="18"
								r={ringRadius}
								fill="none"
								stroke="rgba(226,232,240,0.9)"
								strokeWidth="4"
							/>
							<circle
								cx="18"
								cy="18"
								r={ringRadius}
								fill="none"
								stroke="rgb(139 92 246)"
								strokeWidth="4"
								strokeLinecap="round"
								strokeDasharray={ringCircumference}
								strokeDashoffset={ringOffset}
								transform="rotate(-90 18 18)"
							/>
						</svg>
						<div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-white text-sm font-extrabold text-slate-900">
							{clampedProgress}%
						</div>
					</div>
				</div>

				<div className="space-y-3">
					{[
						["Region", `${state.region} • ${state.currency}`],
						["Service type", category?.displayName ?? "Not set yet"],
						["Template", state.template ?? "Not set yet"],
						["Priority level", tier?.name ?? "Not set yet"],
						[
							"Timing",
							state.timing
								? timingOptions.find((t) => t.id === state.timing)?.label
								: "Not set yet",
						],
						["Starting point", state.startLocation || "Not set yet"],
						["Proof", state.proofRequired ? "Required" : "Not required"],
					].map(([label, value]) => (
						<div
							key={label}
							className={cx(
								rowCapsule,
								"flex items-center justify-between gap-4 px-4 py-3",
							)}
						>
							<span className="text-sm text-slate-500">{label}</span>
							<span
								className={cx(
									"max-w-[58%] text-right text-[15px] font-bold text-slate-900",
									value === "Not set yet" && "text-slate-400",
								)}
							>
								{value}
							</span>
						</div>
					))}
				</div>

				<div className="mt-4 rounded-[22px] border border-violet-200/60 bg-[linear-gradient(135deg,rgba(124,92,255,0.10),rgba(59,130,246,0.08))] p-4">
					<div className="text-sm text-slate-500">Estimated total</div>
					<div className="mt-2 text-[28px] font-extrabold tracking-[-0.03em] text-slate-950">
						{formatCurrency(total || 0, state.currency)}
					</div>
					<div className="mt-1 text-sm text-slate-500">
						Still needed: {nextStep.label}
					</div>
				</div>

				<div className="my-4 h-px bg-slate-200/80" />

				<button
					type="button"
					onClick={onContinue}
					className="inline-flex h-14 w-full items-center justify-center rounded-[20px] bg-[linear-gradient(90deg,#b8b1f8,#b7cbf3)] text-base font-extrabold text-white shadow-[0_12px_32px_rgba(99,102,241,0.18)] transition hover:brightness-[1.03]"
				>
					Continue
				</button>

				<div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm font-semibold text-slate-600">
					{[
						[ShieldCheck, "Secure checkout"],
						[Sparkles, "Live updates"],
						[Check, "Proof-ready"],
					].map(([Icon, label]) => (
						<div
							key={label}
							className={cx(
								rowCapsule,
								"flex items-center justify-center gap-2 px-3 py-2",
							)}
						>
							<Icon className="h-4 w-4" />
							<span className="truncate">{label}</span>
						</div>
					))}
				</div>

				<div className="mt-4 text-sm text-slate-500">
					Powered by Stripe Checkout.
				</div>
				<button
					type="button"
					onClick={onContinue}
					className="mt-1 text-sm font-semibold text-rose-500 hover:text-rose-600"
				>
					{nextStep.label}
				</button>
			</div>

			<div className="rounded-[28px] border border-slate-800/20 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.28),transparent_20%),linear-gradient(135deg,#141d3f,#1b2748,#112034)] p-5 text-white shadow-[0_24px_65px_rgba(15,23,42,0.24)]">
				<div className="mb-4 flex items-start gap-3">
					<div
						className={cx(
							"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-300/25 transition-all",
							state.smartStructuring
								? "bg-violet-500/15 shadow-[0_0_0_6px_rgba(124,92,255,0.08),0_10px_24px_rgba(124,92,255,0.22)]"
								: "bg-white/5",
						)}
					>
						<Bot
							className={cx(
								"h-6 w-6",
								state.smartStructuring ? "text-violet-200" : "text-white/70",
							)}
						/>
					</div>
					<div>
						<div className="text-[13px] text-white/60">Toxi assist</div>
						<div className="text-lg font-extrabold">Context-aware guidance</div>
					</div>
				</div>
				<p className="text-[15px] leading-7 text-white/85">{getToxiMessage(state)}</p>
				<button
					type="button"
					className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[18px] bg-[linear-gradient(90deg,#7c3aed,#3567e8)] font-bold shadow-[0_12px_30px_rgba(59,130,246,0.22)] transition hover:brightness-105"
				>
					Open assistant
				</button>
				<div className="mt-4 flex items-center justify-between rounded-[20px] bg-emerald-50 px-4 py-3 text-slate-800">
					<div>
						<div className="font-extrabold">Smart structuring</div>
						<div className="text-sm text-slate-500">
							Contextual tips and assistant shortcuts are active while you fill the form.
						</div>
					</div>
					<button
						type="button"
						onClick={() =>
							state.smartStructuring ? onContinue() : onContinue()
						}
						className={cx(
							"relative h-8 w-14 rounded-full transition",
							state.smartStructuring ? "bg-emerald-400" : "bg-slate-300",
						)}
						aria-label="Toggle smart structuring"
						title="Toggle smart structuring"
					>
						<span
							className={cx(
								"absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
								state.smartStructuring ? "left-7" : "left-1",
							)}
						/>
					</button>
				</div>
			</div>
		</div>
	);
}

export default function ErrandBridgePremiumCheckout() {
	const isMobile = useIsMobile();
	const [state, setState] = useState({
		region: "UK",
		currency: "GBP",
		categoryId: "documents",
		template: "Official Document / Office Pickup",
		pricingTierId: "standard",
		shortTitle: "Legal / sensitive task",
		description:
			"Government/immigration support. Add:\nGovernment agency name –\nService type (visa, permit, licence, etc.) –\nReference number –\nDocuments required –\nStarting point and office hours –\nRequired ID or authorisation letter –",
		startLocation: "",
		endLocation: "",
		timing: "asap",
		proofRequired: true,
		attachmentsCount: 0,
		note: "",
		smartStructuring: true,
	});

	const [builderFocused, setBuilderFocused] = useState(false);
	const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
	const [guidedMode, setGuidedMode] = useState(true);

	const sectionRefs = {
		category: useRef(null),
		template: useRef(null),
		pricing: useRef(null),
		details: useRef(null),
		location: useRef(null),
		review: useRef(null),
	};

	const category = useMemo(() => getCategory(state.categoryId), [state.categoryId]);
	const tiers = useMemo(() => getTiers(state.categoryId), [state.categoryId]);
	const selectedTier = useMemo(
		() => getSelectedTier(state.categoryId, state.pricingTierId),
		[state.categoryId, state.pricingTierId],
	);
	const nextStep = useMemo(() => getNextStep(state), [state]);
	const progress = useMemo(() => nextStep.progressTarget, [nextStep.progressTarget]);
	const total = useMemo(() => getBaseTotal(state), [state]);

	useEffect(() => {
		if (isDescriptionUsable(state.description)) {
			const timer = window.setTimeout(() => setShowCompletionPrompt(true), 1500);
			return () => window.clearTimeout(timer);
		}
		setShowCompletionPrompt(false);
	}, [state.description]);

	const jumpToStep = (step = nextStep) => {
		const el = document.getElementById(step.sectionId);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	};

	const handleContinue = () => {
		jumpToStep(nextStep);
	};

	const chooseCategory = (categoryId) => {
		const c = getCategory(categoryId);
		setState((s) => ({
			...s,
			categoryId,
			template: c?.template ?? null,
			pricingTierId: null,
			shortTitle: `${String(c?.displayName || "New").toLowerCase()} errand`,
			description: "",
		}));
		window.requestAnimationFrame(() => {
			document
				.getElementById("pricing-section")
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		});
	};

	const selectTier = (tierId) => {
		setState((s) => ({ ...s, pricingTierId: tierId }));
		window.requestAnimationFrame(() => {
			document
				.getElementById("details-section")
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		});
		setBuilderFocused(true);
	};

	return (
		<div className="min-h-screen bg-[linear-gradient(135deg,#f5f2ff_0%,#eef5ff_55%,#f9fbff_100%)] px-4 py-6 text-slate-900 lg:px-8">
			<div className="mx-auto max-w-[1500px]">
				<div className="mb-5 inline-flex rounded-full border border-white/70 bg-white/70 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
					<button
						type="button"
						className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 font-bold text-slate-950 shadow-sm"
					>
						<Check className="h-4 w-4" /> New Errand
					</button>
					<button
						type="button"
						className="inline-flex h-12 items-center gap-2 rounded-full px-5 font-semibold text-slate-500"
					>
						<NotebookPen className="h-4 w-4" /> My Errands
					</button>
				</div>

				<div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
					<GlassReadinessBar
						progress={progress}
						nextLabel={nextStep.label}
						nextHint={nextStep.hint}
						onJump={handleContinue}
						isMobile={isMobile}
					/>
					{!isMobile ? (
						<div className="lg:sticky lg:top-5 lg:self-start">
							<ReviewRail
								state={state}
								progress={progress}
								nextStep={nextStep}
								onContinue={handleContinue}
							/>
						</div>
					) : null}
				</div>

				<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
					<div className="space-y-6">
						<section className="rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_30%),linear-gradient(135deg,#7c4dff,#5b78ff,#4da7ff)] p-6 text-white shadow-[0_25px_60px_rgba(79,70,229,0.24)]">
							<div className="mb-3 flex flex-wrap gap-2">
								{["Premium create", "Live tracking", "Proof of completion"].map(
									(item) => (
										<span
											key={item}
											className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-bold"
										>
											{item}
										</span>
									),
								)}
							</div>
							<h1 className="max-w-3xl text-4xl font-extrabold tracking-[-0.04em] lg:text-6xl">
								Build a high-confidence errand
							</h1>
							<p className="mt-3 max-w-3xl text-base leading-7 text-white/88 lg:text-lg">
								Choose a catalog template for clean pricing, or use Smart builder for custom details. We’ll match the right operator and keep you updated end-to-end.
							</p>
							<div className="mt-5 grid gap-3 md:grid-cols-3">
								{[
									[
										"Clarity first",
										"Structured inputs reduce back-and-forth and delays.",
									],
									[
										"Verified execution",
										"Vetted operators with clear instructions and proof.",
									],
									[
										"Checkout ready",
										"Progress shows what’s missing before you pay.",
									],
								].map(([title, body]) => (
									<div key={title} className="rounded-[24px] border border-white/14 bg-white/14 p-4 backdrop-blur-sm">
										<div className="font-extrabold">{title}</div>
										<div className="mt-1 text-sm text-white/80">{body}</div>
									</div>
								))}
							</div>
						</section>

						<div className="inline-flex rounded-full border border-slate-200/70 bg-white/70 p-1 shadow-sm backdrop-blur">
							<button
								type="button"
								className={cx(
									"rounded-full px-5 py-3 text-sm font-bold",
									guidedMode ? "bg-white text-slate-950" : "text-slate-500",
								)}
								onClick={() => setGuidedMode(true)}
							>
								Catalog pricing
							</button>
							<button
								type="button"
								className={cx(
									"rounded-full px-5 py-3 text-sm font-bold",
									!guidedMode ? "bg-white text-slate-950" : "text-slate-500",
								)}
								onClick={() => setGuidedMode(false)}
							>
								Smart builder
							</button>
						</div>

						<div ref={sectionRefs.category}>
							<SectionCard
								id="category-section"
								title="Category"
								accentClass="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,246,255,0.94))]"
								active={nextStep.key === "category"}
							>
								<div className="mb-4 rounded-[18px] border border-violet-200/60 bg-violet-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
									<span className="inline-flex items-center gap-2">
										<Sparkles className="h-4 w-4 text-violet-500" />
										Choose your errand category. We’ll tailor pricing, templates, and next steps.
									</span>
								</div>
								<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
									{categories.map((item) => {
										const Icon = item.icon;
										const selected = state.categoryId === item.id;
										return (
											<button key={item.id} type="button" onClick={() => chooseCategory(item.id)} className={cx("rounded-[24px] border p-4 text-left transition duration-200", "bg-white/90 hover:-translate-y-[2px] hover:shadow-[0_16px_35px_rgba(15,23,42,0.08)]", selected ? "border-violet-300 ring-4 ring-violet-200/40" : "border-slate-200/70")}>
												<div className="mb-3 flex items-start justify-between gap-3">
													<div className={cx("flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br", item.tint)}>
														<Icon className="h-5 w-5 text-slate-700" />
													</div>
													<div className="text-right">
														<div className="text-xs text-slate-400">From</div>
														<div className="text-2xl font-extrabold tracking-[-0.03em]">£{item.fromPrice}</div>
													</div>
												</div>
												<div className="truncate text-lg font-extrabold tracking-[-0.02em] text-slate-950">{item.displayName}</div>
												<p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
												<div className="mt-3 flex flex-wrap gap-2">
													{item.tags.map((tag) => (
														<span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{tag}</span>
													))}
												</div>
												<div className="mt-4 flex items-center justify-between">
													<span className={cx("text-sm font-bold", selected ? "text-violet-600" : "text-slate-400")}>{selected ? "Selected" : "Select category"}</span>
													<span
														className={cx(
															"inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-[0_8px_18px_rgba(99,102,241,0.10)] transition duration-200",
															selected
																? "border-violet-200 bg-[linear-gradient(135deg,rgba(124,92,255,0.16),rgba(96,165,250,0.16))] text-violet-600"
																: "border-slate-200 bg-white text-slate-400",
														)}
													>
														<ArrowRight className="h-4 w-4" />
													</span>
												</div>
											</button>
										);
									})}
								</div>
							</SectionCard>
						</div>

						<div ref={sectionRefs.template}>
							<SectionCard
								id="template-section"
								title="Template"
								accentClass="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(242,247,255,0.94))]"
								active={nextStep.key === "template"}
							>
								<div className="text-base text-slate-500">
									{category?.displayName ?? "Choose a category first"}
								</div>
								<button
									type="button"
									className="group mt-3 text-lg"
								>
									<PremiumDirectionCue label="Change template" />
								</button>
								<p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
									Pick the closest match so pricing, prompts, and pilot matching stay aligned.
								</p>
								<div className="mt-4 rounded-[22px] border border-violet-200/60 bg-violet-50/50 p-4">
									<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<div className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-500">
												Selected template
											</div>
											<div className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-slate-950">
												{state.template ?? "No template selected yet"}
											</div>
										</div>
										<button
											type="button"
											className="group inline-flex h-12 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 font-bold text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.05)]"
										>
											<PremiumDirectionCue label="Browse categories" />
										</button>
									</div>
								</div>
							</SectionCard>
						</div>

						<div ref={sectionRefs.pricing}>
							<SectionCard
								id="pricing-section"
								title="Priority levels"
								accentClass="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(239,252,247,0.92))]"
								active={nextStep.key === "pricing"}
							>
								<div className="text-base text-slate-500">
									{category?.displayName ?? "Choose a category first"}
								</div>
								<button
									type="button"
									className="group mt-3 text-lg"
								>
									<PremiumDirectionCue label="Change category" />
								</button>
								<div className="mb-4 mt-5 text-lg text-slate-600">
									Tap a level to see what’s included and why it costs more.
								</div>
								<div className="mb-4 rounded-[20px] border border-violet-200/60 bg-violet-50/50 p-4 text-lg font-semibold leading-8 text-slate-700">
									<span className="inline-flex items-start gap-2">
										<Sparkles className="mt-1 h-5 w-5 shrink-0 text-violet-500" />
										Tip: choose the lowest tier that still matches urgency + sensitivity. You can change it anytime.
									</span>
								</div>
								<div className="space-y-4">
									{tiers.map((tier) => {
										const selected = state.pricingTierId === tier.id;
										return (
											<button
												key={tier.id}
												type="button"
												onClick={() => selectTier(tier.id)}
												className={cx(
													"w-full rounded-[26px] border p-5 text-left transition",
													selected
														? "border-emerald-300 bg-[linear-gradient(180deg,#f0fff6,#ecfff7)] shadow-[0_0_0_6px_rgba(34,197,94,0.08)]"
														: "border-slate-200/70 bg-white/90 hover:-translate-y-[1px]",
												)}
											>
												<div className="flex items-start justify-between gap-4">
													<div>
														<div className="flex items-center gap-3">
															<div className="text-[26px] font-extrabold tracking-[-0.03em] text-slate-950">
																{tier.name}
															</div>
															{selected ? (
																<span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-700">
																	Selected
																</span>
															) : null}
														</div>
														<p className="mt-2 max-w-2xl text-lg leading-8 text-slate-600">
															{tier.description}
														</p>
													</div>
													<div className="text-[42px] font-extrabold tracking-[-0.04em] text-slate-950">
														£{tier.price}
													</div>
												</div>
											</button>
										);
									})}
								</div>
							</SectionCard>
						</div>

						<div ref={sectionRefs.details}>
							<SectionCard
								id="details-section"
								title="Core details"
								accentClass="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(238,247,255,0.93))]"
								active={nextStep.key === "details"}
							>
								<div className="mb-4 rounded-[18px] border border-violet-200/60 bg-violet-50/50 px-4 py-3 text-sm font-semibold text-slate-700">
									<span className="inline-flex items-center gap-2">
										<Sparkles className="h-4 w-4 text-violet-500" />
										Include what to do, any must-haves, and a recipient name/phone if needed.
									</span>
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									<label className="block">
										<div className="mb-2 text-sm font-semibold text-slate-500">Short title</div>
										<div className={cx(rowCapsule, "flex h-12 items-center gap-3 px-4")}>
											<NotebookPen className="h-4 w-4 text-blue-500" />
											<input
												value={state.shortTitle}
												onChange={(e) => setState((s) => ({ ...s, shortTitle: e.target.value }))}
												className="w-full bg-transparent outline-none"
											/>
										</div>
									</label>
									<div>
										<div className="mb-2 text-sm font-semibold text-slate-500">Priority level</div>
										<div className={cx(rowCapsule, "flex h-12 items-center justify-between gap-3 px-4")}>
											<div>
												<div className="font-extrabold text-slate-950">{selectedTier?.name ?? "Not set yet"}</div>
												<div className="text-sm text-slate-500">Routine fulfilment with normal dispatch + coordination.</div>
											</div>
											<ChevronDown className="h-4 w-4 text-slate-400" />
										</div>
									</div>
								</div>
								<label className="mt-4 block">
									<div className="mb-2 text-sm font-semibold text-slate-500">Describe what you need</div>
									<textarea
										value={state.description}
										onFocus={() => setBuilderFocused(true)}
										onBlur={() => setBuilderFocused(false)}
										onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
										placeholder="Include key details, reference numbers, recipients, and timing constraints..."
										className={cx(
											"w-full rounded-[24px] border border-slate-200/80 bg-white/85 px-5 py-4 text-[16px] leading-7 text-slate-900 outline-none transition",
											builderFocused ? "min-h-[240px] ring-4 ring-violet-200/40" : "min-h-[120px]",
										)}
									/>
								</label>
								{showCompletionPrompt && isDescriptionUsable(state.description) ? (
									<div className="mt-4 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
										Great, your description looks usable. Next: add location &amp; timing.
										<button
											type="button"
											onClick={() => jumpToStep(getNextStep(state))}
											className="group ml-2 inline-flex items-center"
										>
											<PremiumDirectionCue label="Go there" tone="emerald" />
										</button>
									</div>
								) : null}
							</SectionCard>
						</div>

						<div ref={sectionRefs.location}><SectionCard id="location-section" title="Location & timing" accentClass="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(238,252,247,0.94))]" active={nextStep.key === "location" || nextStep.key === "timing"} right={<span className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-bold text-slate-500">Starting point required • Ending point optional</span>}><label className="block"><div className="mb-2 text-sm font-semibold text-slate-500">Starting point <span className="text-rose-500">*</span></div><div className={cx(rowCapsule, "flex h-14 items-center gap-3 px-4")}><MapPin className="h-5 w-5 text-slate-400" /><input value={state.startLocation} onChange={(e) => setState((s) => ({ ...s, startLocation: e.target.value }))} placeholder="Where should the task begin?" className="w-full bg-transparent text-[17px] outline-none placeholder:text-slate-400" /></div></label><div className="mt-5"><div className="mb-3 text-sm font-semibold text-slate-500">Preferred time</div><div className="flex flex-wrap gap-3">{timingOptions.map((option) => {const Icon = option.icon; const active = state.timing === option.id; return (<button key={option.id} type="button" onClick={() => setState((s) => ({ ...s, timing: option.id }))} className={cx("inline-flex h-12 items-center gap-2 rounded-full border px-5 font-extrabold transition", active ? "border-violet-300 bg-violet-50 text-slate-950 shadow-[0_0_0_4px_rgba(167,139,250,0.10)]" : "border-slate-200 bg-white/80 text-slate-600")}><Icon className="h-4 w-4" /> {option.label}</button>);})}</div></div><div className="mt-4 rounded-[22px] border border-slate-200/70 bg-white/80 p-4"><div className="flex items-center justify-between gap-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-slate-500" /><div><div className="text-[18px] font-extrabold tracking-[-0.02em]">Request proof or receipt</div><div className="text-sm text-slate-500">Helps your operator close the loop with evidence.</div></div></div><button type="button" onClick={() => setState((s) => ({ ...s, proofRequired: !s.proofRequired }))} className={cx("relative h-9 w-16 rounded-full transition", state.proofRequired ? "bg-emerald-400" : "bg-slate-300")} aria-label="Toggle proof or receipt requirement" title="Toggle proof or receipt requirement"><span className={cx("absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all", state.proofRequired ? "left-8" : "left-1")} /></button></div></div><div className="mt-4 space-y-3">{[[Paperclip, "Attachments", "Optional"],[NotebookPen, "Extra notes", "Optional"]].map(([Icon, label, meta]) => (<button key={label} type="button" className={cx(rowCapsule, "flex h-14 w-full items-center justify-between gap-3 px-4")}><span className="inline-flex items-center gap-3 font-bold text-slate-700"><Icon className="h-5 w-5 text-slate-500" /> {label}</span><span className="text-sm font-semibold text-slate-400">{meta}</span></button>))}</div></SectionCard></div>
					</div>

					{!isMobile ? <div /> : null}
				</div>
			</div>

			{isMobile && guidedMode ? (
				<div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[520px] px-4 pb-4"><div className={cx(sectionShell, glassPanel, "rounded-[28px] p-4")}><div className="mb-2 flex items-center justify-between gap-3"><div><div className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-500">Review &amp; pay</div><div className="text-[18px] font-extrabold tracking-[-0.02em] text-slate-950">{formatCurrency(total || 0, state.currency)} <span className="text-slate-400">· {progress}%</span></div></div><button type="button" onClick={handleContinue} className="inline-flex h-14 items-center justify-center rounded-[20px] bg-[linear-gradient(90deg,#b6abff,#a8c7ff)] px-8 font-extrabold text-white shadow-[0_12px_30px_rgba(99,102,241,0.18)]">Continue</button></div><div className="text-sm font-semibold text-slate-500">Next: {nextStep.label}</div></div></div>
			) : null}

			{isMobile && !guidedMode ? (
				<button type="button" className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[radial-gradient(circle_at_top_left,#7c3aed,#19214f_60%)] text-white shadow-[0_24px_45px_rgba(15,23,42,0.28)]" aria-label="Open assistant" title="Open assistant"><UserRound className="h-8 w-8" /></button>
			) : null}
		</div>
	);
}
