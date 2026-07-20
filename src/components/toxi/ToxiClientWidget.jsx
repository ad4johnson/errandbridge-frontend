import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	buildPrefillRequest,
	createConciergeSession,
	FIELD_LABELS,
	getLiveSummary,
	getMissingFields,
	makeSummary,
} from "../../toxi/conciergeEngine.ts";

import {
	handleHybridToxiMessage,
} from "../../lib/toxi/toxiHybridController";
import useToxiAssistant from "../../hooks/useToxiAssistant";

import ToxiChatPanel from "./ToxiChatPanel";
import ToxiSummaryCard from "./ToxiSummaryCard";

import { streamTextChunks } from "../../lib/toxi/messageStream";
const DEFAULT_TEMPLATE = "Official Document / Office Pickup";
const INVALID_REQUEST_VALUE_PATTERNS = [
	/^(?:location|pickup(?:\s+location)?|drop\s*off(?:\s+location)?|destination|ending(?:\s+location)?|end\s+location)$/i,
	/^(?:where it should start|where it should end|when it needs to be handled|what needs to be handled)$/i,
	/^(?:change|update|add|edit|set|help me add|help me change)\b/i,
	/^still missing\b/i,
];

const safeNow = () => Date.now();

const sanitizeRequestValue = (value) => {
	const clean = String(value || "").trim();
	if (!clean) return "";
	if (INVALID_REQUEST_VALUE_PATTERNS.some((pattern) => pattern.test(clean))) {
		return "";
	}
	return clean;
};

const buildWelcomeForMode = (mode, ctx) => {
	if (mode === "request_builder") {
		if (ctx?.assistEnabled === false) {
			return "Guided tips are off. I’m here if you want help - ask anytime.";
		}
		const stageKey = String(ctx?.assistContext?.stageKey || "").trim();
		if (stageKey) {
			switch (stageKey) {
				case "category":
					return "Start by picking a service. If you tell me the goal in one sentence, I’ll point you to the best category.";
				case "template":
					return "Choose a template next (it pre-fills the form). Want the best 2–3 options for your situation?";
				case "pricing":
						return "Pick a tier, then we’ll jump straight into “Describe your errand”.";
					case "title":
						return "Add a short title next. It helps keep the request crisp for the operator.";
				case "pickup":
						return "Add the starting point + ending point. Short address snippets are fine. We can refine details later.";
				case "details":
					return "Describe your errand in 1–2 sentences. Include timing or any “must do / must not do” instructions.";
				case "review":
						return "You’re at the finish line. Review and pay when ready. Want me to sanity-check the request details first?";
				default:
					break;
			}
		}
		const hasPickup = Boolean(ctx?.draft?.pickup);
		const hasDropoff = Boolean(ctx?.draft?.dropoff);
		if (hasPickup && hasDropoff) {
			return "I’ll help shape this request while you talk. Want to add timing, notes, or anything to change?";
		}
		return "Let’s shape this request together. Start with the starting point, ending location, or timing you already know.";
	}

	if (mode === "client_support") {
		const ref = ctx?.activeErrand?.referenceNumber;
		return ref
			? `I can help with this errand (${ref}). What do you need - status, proof, payment, or an issue?`
			: "I can help with an existing errand. Share your reference (example: EB-36-5084) or tell me what happened.";
	}

	return "Tell me what you need - and I’ll guide you.";
};

function ToxiAttachmentsCard({ items, onOpen }) {
	const rows = Array.isArray(items) ? items : [];
	return (
		<div className="rounded-[26px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
			<div className="text-[13px] font-extrabold text-slate-900">Attachments</div>
			<div className="mt-2 grid gap-2">
				{rows.map((a) => (
					<div
						key={a?.id || a?.url || a?.filename}
						className="flex items-center justify-between gap-3 rounded-[20px] border border-white/80 bg-slate-50/90 px-3 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
					>
						<div className="min-w-0">
							<div className="truncate text-[12px] font-extrabold text-slate-900">
								{a?.filename || "Attachment"}
							</div>
							{a?.reviewStatus ? (
								<div className="text-[11px] font-semibold text-slate-500">
									Review: {String(a.reviewStatus)}
								</div>
							) : null}
						</div>
						<button
							type="button"
							className="shrink-0 rounded-[16px] bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-3 py-2 text-[12px] font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] hover:opacity-95"
							onClick={() => onOpen?.(a)}
						>
							Open
						</button>
					</div>
				))}
			</div>
		</div>
	);
}

function ToxiActionLinkCard({ actionLink }) {
	const label = String(actionLink?.label || "Open").trim();
	const url = String(actionLink?.href || actionLink?.url || "").trim();
	if (!url) return null;

	return (
		<div className="rounded-[26px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
			<div className="text-[13px] font-extrabold text-slate-900">Next step</div>
			<div className="mt-2 flex items-center justify-between gap-3">
				<div className="min-w-0 text-[12px] font-semibold text-slate-600">
					{label}
				</div>
				<button
					type="button"
					className="shrink-0 rounded-[16px] bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-3 py-2 text-[12px] font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] hover:opacity-95"
					onClick={() => {
						try {
							window.open(url, "_blank", "noopener,noreferrer");
						} catch {
							// ignore
						}
					}}
				>
					Open
				</button>
			</div>
		</div>
	);
}

const getDraftAsConciergeSeed = (draft) => {
	const pickup = sanitizeRequestValue(draft?.pickup);
	const dropoff = sanitizeRequestValue(draft?.dropoff);
	const template = sanitizeRequestValue(draft?.template);
	const note = sanitizeRequestValue(draft?.note);
	const title = sanitizeRequestValue(draft?.title);

	const timingParts = [draft?.pickupTimeSlotDate, draft?.pickupTimeSlotStart, draft?.pickupTimeSlotEnd]
		.map((v) => sanitizeRequestValue(v))
		.filter(Boolean);
	const timing = timingParts.length ? timingParts.join(" ") : "";

	return {
		serviceType: template ? { value: template, confidence: "high", source: "user" } : undefined,
		notes: (note || title)
			? { value: note || title, confidence: "high", source: "user" }
			: undefined,
		pickupLocation: pickup
			? { value: pickup, confidence: "high", source: "user" }
			: undefined,
		dropoffLocation: dropoff
			? { value: dropoff, confidence: "high", source: "user" }
			: undefined,
		deadline: timing
			? { value: timing, confidence: "medium", source: "user" }
			: undefined,
	};
};

const normalize = (value) => String(value || "").trim();

function buildRequestBuilderTransferPatch(state, draft = {}) {
	const prefill = buildPrefillRequest(state || {});
	const timingText = sanitizeRequestValue(prefill?.timing);
	const baseNote = sanitizeRequestValue(prefill?.notes);
	const noteSegments = [];

	if (baseNote) noteSegments.push(baseNote);
	if (
		timingText &&
		!noteSegments.some((segment) =>
			String(segment || "").toLowerCase().includes(timingText.toLowerCase()),
		)
	) {
		noteSegments.push(`Timing: ${timingText}`);
	}

	return {
		template: sanitizeRequestValue(prefill?.template),
		title: sanitizeRequestValue(prefill?.description),
		note: noteSegments.join("\n\n"),
		pickup: sanitizeRequestValue(prefill?.startLocation),
		dropoff: sanitizeRequestValue(prefill?.endLocation),
		pickupTimeSlotDate: sanitizeRequestValue(draft?.pickupTimeSlotDate),
		pickupTimeSlotStart: sanitizeRequestValue(draft?.pickupTimeSlotStart),
		pickupTimeSlotEnd: sanitizeRequestValue(draft?.pickupTimeSlotEnd),
	};
}

function toLowerHintLabel(label) {
	return String(label || "one more detail")
		.trim()
		.replace(/^\w/, (char) => char.toLowerCase());
}

function computePatchImpact({ patch, draft }) {
	const impact = {};
	const draftTemplate = normalize(draft?.template);
	const patchTemplate = normalize(patch?.template);

	impact.template = {
		willFillBlank:
			Boolean(patchTemplate) &&
			(!draftTemplate ||
				(draftTemplate === DEFAULT_TEMPLATE && patchTemplate !== DEFAULT_TEMPLATE)),
		wouldOverwrite:
			Boolean(patchTemplate) &&
			Boolean(draftTemplate) &&
			draftTemplate !== patchTemplate &&
			!(draftTemplate === DEFAULT_TEMPLATE && patchTemplate !== DEFAULT_TEMPLATE),
		warning:
			draftTemplate === DEFAULT_TEMPLATE && patchTemplate && patchTemplate !== DEFAULT_TEMPLATE
				? "replaces default selection"
				: "",
	};

	for (const key of ["title", "note", "pickup", "dropoff"]) {
		const draftValue = normalize(draft?.[key]);
		const patchValue = normalize(patch?.[key]);
		impact[key] = {
			willFillBlank: Boolean(patchValue) && !draftValue,
			wouldOverwrite: Boolean(patchValue) && Boolean(draftValue) && draftValue !== patchValue,
			warning: "",
		};
	}

	return impact;
}

async function streamAssistantMessage({
	setMessages,
	text,
	id,
	content = null,
	timestamp = safeNow(),
}) {
	setMessages((prev) => [
		...prev,
		{
			id,
			role: "assistant",
			text: "",
			content,
			timestamp,
		},
	]);

	await streamTextChunks(text, (partial) => {
		setMessages((prev) =>
			prev.map((message) =>
				message.id === id ? { ...message, text: partial } : message,
			),
		);
	});
}

export default function ToxiClientWidget({
	open,
	onOpen,
	onClose,
	disabled,
	hideLauncher = false,
	pauseTeaser = false,
	anchorBottomPx = 16,
	anchorRightPx = 16,
	anchorIncludeSafeAreaBottom = true,

	mode,
	pageContext,
	apiBaseUrl,
	getAuthToken,

	onRequestBuilderPatch,
	onOpenPricing,
	onAssistantAction,
	onOpenSupport,
	onPreviewFileUrl,
	onRequestHumanAgent,
	assistantConfig,
}) {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [error, setError] = useState("");
	const [requestBuilderState, setRequestBuilderState] = useState(null);

	const assistEnabled = pageContext?.assistEnabled === false ? false : true;
	const v2AssistContext = useMemo(() => {
		if (mode !== "request_builder") return null;
		const ctx = pageContext?.assistContext;
		if (!ctx || ctx?.source !== "client_v2") return null;
		return ctx;
	}, [mode, pageContext?.assistContext]);

	const requestBuilderSessionRef = useRef(null);
	const didInitRef = useRef(false);
	const lastInitModeRef = useRef(null);
	const dashboardAssistant = useToxiAssistant({
		open: open && mode === "client_support",
		pageContext,
		apiBaseUrl,
		getAuthToken,
		onOpenPricing,
		onOpenSupport,
		onPreviewFileUrl,
		onRequestHumanAgent,
		buildAttachmentsContent: (items, context) => (
			<ToxiAttachmentsCard
				items={items}
				onOpen={(att) => {
					const url = att?.url ? `${context.apiBaseUrl}${att.url}` : null;
					if (!url) return;
					if (context.onPreviewFileUrl) {
						context.onPreviewFileUrl(url);
						return;
					}
					try {
						window.open(url, "_blank", "noopener,noreferrer");
					} catch {
						// ignore
					}
				}}
			/>
		),
	});

	const summaryRows = useMemo(() => {
		if (mode !== "request_builder") return [];
		return getLiveSummary(requestBuilderState || {});
	}, [mode, requestBuilderState]);

	const requestBuilderMissingLabels = useMemo(() => {
		if (mode !== "request_builder") return [];
		return getMissingFields(requestBuilderState || {}).map(
			(field) => FIELD_LABELS[field],
		);
	}, [mode, requestBuilderState]);

	const requestBuilderReady = useMemo(
		() => Boolean(requestBuilderState?.isReadyForRequest),
		[requestBuilderState],
	);

	const requestBuilderHint = useMemo(() => {
		if (mode !== "request_builder") return "";
		if (requestBuilderReady) {
			return "Ready to continue - review and submit in the form.";
		}

		return `Still needed: ${toLowerHintLabel(requestBuilderMissingLabels[0])}`;
	}, [mode, requestBuilderMissingLabels, requestBuilderReady]);

	useEffect(() => {
		if (!open) return;
		const shouldInit =
			!didInitRef.current || lastInitModeRef.current !== String(mode || "");
		if (!shouldInit) return;

		didInitRef.current = true;
		lastInitModeRef.current = String(mode || "");

		setError("");
		const welcomeText = buildWelcomeForMode(mode, pageContext);
		setMessages([
			{
				id: `welcome-${mode}`,
				role: "assistant",
				text: welcomeText,
				variant: "welcome",
				timestamp: safeNow(),
			},
		]);

		if (mode === "request_builder") {
			try {
				const session = createConciergeSession(
					getDraftAsConciergeSeed(pageContext?.draft || {}),
				);
				requestBuilderSessionRef.current = session;
				setRequestBuilderState(session.state);
			} catch {
				const session = createConciergeSession();
				requestBuilderSessionRef.current = session;
				setRequestBuilderState(session.state);
			}
		}
		if (mode !== "request_builder") {
			requestBuilderSessionRef.current = null;
			setRequestBuilderState(null);
		}
		// NOTE: Intentionally do not re-init on pageContext changes. The widget must
		// preserve conversation/session across unrelated rerenders (e.g. pricing modal).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode, open]);

	const quickActions = useMemo(() => {
		if (mode === "request_builder") {
			// Client UI v2: prefer direct shortcut actions into the grouped form flow.
			if (v2AssistContext && assistEnabled) {
				const missing = Array.isArray(v2AssistContext?.missingRequired)
					? v2AssistContext.missingRequired
					: [];
				const missingSet = new Set(missing);
				const actions = [];
				if (!v2AssistContext?.serviceKey || missingSet.has("Select a service")) {
					actions.push({
						id: "v2-qa-category",
						label: "Choose service",
						action: "assistant_action",
						type: "scroll_to_category",
					});
				}
				if (!v2AssistContext?.templateName || missingSet.has("Select a template")) {
					actions.push({
						id: "v2-qa-template",
						label:
							Number(v2AssistContext?.categoryTemplateCount) > 0
								? `Browse ${Number(v2AssistContext.categoryTemplateCount)} templates`
								: "Choose template",
						action: "assistant_action",
						type: "open_template_picker",
					});
				}
				if (v2AssistContext?.serviceKey && !v2AssistContext?.tierConfirmed) {
					actions.push({
						id: "v2-qa-pricing",
						label: "Compare priority levels",
						action: "assistant_action",
						type: "scroll_to_pricing",
					});
				}
				if (missingSet.has("Describe what you need") || !String(pageContext?.draft?.note || "").trim()) {
					actions.push({
						id: "v2-qa-details",
						label: "Add details",
						action: "assistant_action",
						type: "scroll_to_details",
					});
				}
				if (missingSet.has("Add starting point") || !String(pageContext?.draft?.pickup || "").trim()) {
					actions.push({
						id: "v2-qa-pickup",
						label: "Add starting point",
						action: "assistant_action",
						type: "scroll_to_pickup",
					});
				}
				actions.push({
					id: "v2-qa-review",
					label: "Jump to review",
					action: "assistant_action",
					type: "scroll_to_review",
				});
				return actions;
			}

			// If assist is disabled (but we're still on v2 create), keep the panel passive.
			if (v2AssistContext && !assistEnabled) {
				return [];
			}

			const missing = getMissingFields(requestBuilderState || {});
			const missingSet = new Set(missing);
			return [
				{
					id: "qa-timing",
					label: missingSet.has("deadline") ? "Add timing" : "Update timing",
					message: missingSet.has("deadline")
						? "Help me add the timing for this request."
						: "I want to change the timing for this request.",
				},
				{
					id: "qa-pickup",
					label: missingSet.has("pickupLocation") ? "Add starting point" : "Change starting point",
					message: missingSet.has("pickupLocation")
						? "Help me add the starting point."
						: "I want to change the starting point.",
				},
				{
					id: "qa-dropoff",
					label: missingSet.has("dropoffLocation")
						? "Add ending location"
						: "Change ending location",
					message: missingSet.has("dropoffLocation")
						? "Help me add the ending location."
						: "I want to change the ending location.",
				},
				{ id: "qa-pricing", label: "Check price", action: "open_pricing" },
			];
		}

		return dashboardAssistant.quickActions;
	}, [
		assistEnabled,
		dashboardAssistant.quickActions,
		mode,
		pageContext?.draft?.note,
		pageContext?.draft?.pickup,
		requestBuilderState,
		v2AssistContext,
	]);

	const sendMessage = useCallback(async (rawMessage) => {
		if (sending) return;
		const message = String(rawMessage || "").trim();
		if (message.length < 2) return;

		const now = safeNow();
		setError("");
		setSending(true);
		setInput((current) => (current === rawMessage ? "" : current));

		setMessages((prev) => [
			...prev,
			{ id: `user-${now}`, role: "user", text: message, timestamp: now },
		]);

		try {
			if (mode === "request_builder") {
				const draft = pageContext?.draft || {};
				const seed = getDraftAsConciergeSeed(draft);
				const session = requestBuilderSessionRef.current
					? requestBuilderSessionRef.current
					: createConciergeSession(seed);
				const token = getAuthToken?.() || null;
				const { nextSession, turn, payload } = await handleHybridToxiMessage({
					apiBaseUrl,
					token,
					userText: message,
					mode: "request_builder",
					pageContext: {
						surface: pageContext?.surface || null,
						draft,
						assistContext: v2AssistContext || pageContext?.assistContext || null,
					},
					session,
				});
				requestBuilderSessionRef.current = nextSession;
				setRequestBuilderState(nextSession.state);
				const assistantText =
					String(payload?.text || "").trim() ||
					turn?.assistantText ||
					"Got it - tell me a bit more.";

				const prefill = buildPrefillRequest(nextSession.state);
				const patch = {
					template: sanitizeRequestValue(prefill?.template),
					title: sanitizeRequestValue(prefill?.description),
					note: sanitizeRequestValue(prefill?.notes),
					pickup: sanitizeRequestValue(prefill?.startLocation),
					dropoff: sanitizeRequestValue(prefill?.endLocation),
				};

				const summary = makeSummary(nextSession.state);
				const patchImpact = computePatchImpact({ patch, draft });
				const hasAnyPatchValue = Object.values(patch || {}).some((v) =>
					Boolean(normalize(v)),
				);
				const hasAnyFillBlank = Object.values(patchImpact || {}).some((m) =>
					Boolean(m?.willFillBlank),
				);

				const assistantMsgId = `toxi-${safeNow()}`;
				await streamAssistantMessage({
					setMessages,
					id: assistantMsgId,
					text: assistantText,
					content: payload?.actionLink?.href ? (
						<ToxiActionLinkCard actionLink={payload.actionLink} />
					) : null,
				});

				if (hasAnyPatchValue && hasAnyFillBlank) {
					onRequestBuilderPatch?.({ patch, summary, mode: "fill_blanks" });
				}
				return;
			}

			if (mode === "client_support") {
				await dashboardAssistant.handleSend(message);
				return;
			}
		} catch (err) {
			setError(err?.message || "Unable to send right now.");
		} finally {
			setSending(false);
		}
	}, [apiBaseUrl, dashboardAssistant, getAuthToken, mode, onRequestBuilderPatch, pageContext, sending, v2AssistContext]);

	const handleQuickAction = useCallback(
		(action) => {
			if (!action || sending) return;
			if (mode === "client_support") {
				dashboardAssistant.handleQuickAction(action);
				return;
			}
			if (action.action === "assistant_action") {
				onAssistantAction?.({ type: action.type });
				return;
			}
			if (action.action === "open_pricing") {
				onOpenPricing?.();
				return;
			}
			if (action.action === "open_support") {
				onOpenSupport?.();
				return;
			}
			if (action.action === "request_human") {
				onRequestHumanAgent?.();
				return;
			}
			if (action.message) {
				sendMessage(action.message);
			}
		},
		[dashboardAssistant, mode, onAssistantAction, onOpenPricing, onOpenSupport, onRequestHumanAgent, sendMessage, sending],
	);

	const handleSend = useCallback(
		(overrideText) => {
			if (mode === "client_support") {
				dashboardAssistant.handleSend(overrideText ?? dashboardAssistant.input);
				return;
			}
			sendMessage(overrideText ?? input);
		},
		[dashboardAssistant, input, mode, sendMessage],
	);

	const handleKeyDown = useCallback(
		(event) => {
			if (mode === "client_support") {
				dashboardAssistant.handleKeyDown(event);
				return;
			}
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				handleSend();
			}
		},
		[dashboardAssistant, handleSend, mode],
	);

	const handleContinueToForm = useCallback(() => {
		if (mode === "request_builder") {
			const patch = buildRequestBuilderTransferPatch(
				requestBuilderState,
				pageContext?.draft || {},
			);
			const hasTransferableValue = Object.values(patch || {}).some((value) =>
				Boolean(normalize(value)),
			);
			if (hasTransferableValue) {
				onRequestBuilderPatch?.({
					patch,
					summary: makeSummary(requestBuilderState || {}),
					mode: "overwrite",
				});
			}
		}
		onClose?.();
	}, [mode, onClose, onRequestBuilderPatch, pageContext, requestBuilderState]);

	const cta = useMemo(() => {
		if (mode === "request_builder") {
			return {
				label: "Continue to form →",
				disabled: false,
				hint: requestBuilderHint,
				secondaryLabel: "Edit details manually",
				secondaryDisabled: false,
				onSecondaryClick: () => onClose?.(),
				onClick: handleContinueToForm,
			};
		}
		return dashboardAssistant.cta;
	}, [dashboardAssistant.cta, handleContinueToForm, mode, onClose, requestBuilderHint]);

	return (
		<ToxiChatPanel
			open={open}
			disabled={disabled}
			hideLauncher={hideLauncher}
			anchorBottomPx={anchorBottomPx}
			anchorRightPx={anchorRightPx}
			anchorIncludeSafeAreaBottom={anchorIncludeSafeAreaBottom}
			launcherActive={mode === "request_builder" && assistEnabled}
			onOpen={onOpen}
			onClose={onClose}
			title={mode === "client_support" ? dashboardAssistant.title : "Toxi"}
			subtitle={
				mode === "request_builder"
					? "I’ll keep this request tidy while we talk."
					: dashboardAssistant.subtitle
			}
			eyebrowLabel={mode === "request_builder" ? "Request guide" : undefined}
			quickActionsLabel={
				mode === "request_builder" && assistEnabled ? "Helpful prompts" : undefined
			}
			avatar={{
				glyph: "concierge",
				label: "EB",
				bgClassName:
					"bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_rgba(15,23,42,1)_55%)]",
			}}
			launcherTitle={mode === "client_support" ? dashboardAssistant.launcherTitle : "Toxi"}
			launcherSubtitle={
				mode === "request_builder"
					? "Help with this request"
					: dashboardAssistant.launcherSubtitle
			}
			launcherAriaLabel={mode === "client_support" ? dashboardAssistant.launcherAriaLabel : "Open Toxi"}
			assistantConfig={assistantConfig}
			pauseTeaser={pauseTeaser}
			panelMode={mode === "request_builder" ? "request_builder" : "default"}
			onResetConversation={mode === "client_support" ? dashboardAssistant.resetChat : undefined}
			summarySlot={
				mode === "request_builder" ? (
					v2AssistContext ? (
						<ToxiSummaryCard
							rows={[
								`Step: ${String(v2AssistContext?.currentStepLabel || "").trim()}`,
								v2AssistContext?.validationHint
									? `Next: ${String(v2AssistContext.validationHint).trim()}`
									: "Next: Review & pay",
								v2AssistContext?.categoryTitle
									? `Service: ${String(v2AssistContext.categoryTitle).trim()}`
									: "",
								v2AssistContext?.templateName
									? `Template: ${String(v2AssistContext.templateName).trim()}`
									: "",
								v2AssistContext?.templateDescription
									? `Template focus: ${String(v2AssistContext.templateDescription).trim()}`
									: "",
								Number(v2AssistContext?.categoryTemplateCount) > 0
									? `Options: ${Number(v2AssistContext.categoryTemplateCount)} templates`
									: "",
								v2AssistContext?.tierKey
									? `Tier: ${String(v2AssistContext.tierKey).trim()}`
									: "",
								Number.isFinite(Number(v2AssistContext?.progress))
									? `Progress: ${Math.round(Number(v2AssistContext.progress))}%`
									: "",
							].filter(Boolean)}
							ready={
								!Array.isArray(v2AssistContext?.missingRequired) ||
								v2AssistContext.missingRequired.length === 0
							}
							missingLabels={(
								Array.isArray(v2AssistContext?.missingRequired)
									? v2AssistContext.missingRequired
									: []
							).concat(
								v2AssistContext?.serviceKey && !v2AssistContext?.tierConfirmed
									? ["Confirm pricing tier"]
									: [],
							)}
							title="Create flow"
							description={
								assistEnabled
									? "I’ll keep the key steps and what’s missing visible while you fill the form."
									: "Assist is off. I’ll stay passive, but still keep your progress visible."
							}
							statusLabel={assistEnabled ? "Guided" : "Passive"}
							statusTone={assistEnabled ? "neutral" : "neutral"}
							compact
						/>
					) : assistEnabled ? (
						<ToxiSummaryCard
							rows={summaryRows}
							ready={requestBuilderReady}
							missingLabels={requestBuilderMissingLabels}
							title="Request snapshot"
							description="Conversation first - structure stays here as details land."
							statusLabel={requestBuilderReady ? "Ready to continue" : "Building request"}
							statusTone={requestBuilderReady ? "success" : "neutral"}
							compact
						/>
					) : null
				) : dashboardAssistant.summaryCard ? (
					<ToxiSummaryCard
						rows={dashboardAssistant.summaryCard.rows}
						ready={false}
						title={dashboardAssistant.summaryCard.title}
						description={dashboardAssistant.summaryCard.description}
						statusLabel={dashboardAssistant.summaryCard.statusLabel}
						statusTone={dashboardAssistant.summaryCard.statusTone}
					/>
				) : null
			}
			messages={mode === "client_support" ? dashboardAssistant.messages : messages}
			quickActions={quickActions}
			onQuickAction={handleQuickAction}
			quickActionsDisabled={mode === "client_support" ? dashboardAssistant.sending : sending}
			input={mode === "client_support" ? dashboardAssistant.input : input}
			inputPlaceholder={
				mode === "request_builder"
					? "Tell Toxi what to add or change…"
					: dashboardAssistant.inputPlaceholder
			}
			onInputChange={mode === "client_support" ? dashboardAssistant.setInput : setInput}
			onKeyDown={handleKeyDown}
			onSend={handleSend}
			sending={mode === "client_support" ? dashboardAssistant.sending : sending}
			error={mode === "client_support" ? dashboardAssistant.error : error}
			ctaLabel={cta.label}
			ctaDisabled={cta.disabled}
			onCta={cta.onClick}
			secondaryCtaLabel={cta.secondaryLabel}
			secondaryCtaDisabled={cta.secondaryDisabled}
			onSecondaryCta={cta.onSecondaryClick}
			ctaHint={cta.hint}
		/>
	);
}
