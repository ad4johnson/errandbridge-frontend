import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	buildPrefillRequest,
	createConciergeSession,
	FIELD_LABELS,
	getLiveSummary,
	getMissingFields,
	makeSummary,
	stepConcierge,
} from "../../toxi/conciergeEngine.ts";
import { writeToxiConciergeHandoff } from "../../toxi/handoff";
import {
	extractErrandReference,
	routeToxiIntent,
} from "../../lib/toxi/intentRouter";
import { streamTextChunks } from "../../lib/toxi/messageStream";
import { isToxiOpenAiEnabled } from "../../lib/toxi/toxiHybridController";

import ToxiSummaryCard from "./ToxiSummaryCard";
import ToxiChatPanel from "./ToxiChatPanel";

const INITIAL_WELCOME_TEXT =
	"Hi 👋 I’m Toxi. Tell me what you need handled and the city or starting point, and I’ll help shape the rest with care.";
const DEFAULT_INITIAL_TYPING_DELAY_MS = 860;
const DEFAULT_QUICK_ACTIONS_REVEAL_DELAY_MS = 180;

const QUICK_ACTIONS = [
	{ id: "grocery", label: "Shopping help", message: "Buy groceries for my family." },
	{ id: "courier", label: "Send a package", message: "Send a package or document for me." },
	{ id: "passport", label: "Passport pickup", message: "Pick up my passport or visa for me." },
	{ id: "airport", label: "Airport transfer", message: "I need airport pickup and transport." },
];

const GREETING_ONLY_PATTERN = /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))(?:[!.\s]+)?$/i;
const CASUAL_SOCIAL_PATTERN =
	/\b(?:how are you|how's it going|how is it going|just saying hello|only saying hello|just checking|just checking in|thanks|thank you|okay|ok(?:ay)? then|got it|sounds good)\b/i;

const API_BASE_URL = String(process.env.REACT_APP_API_BASE || "")
	.trim()
	.replace(/\/+$/, "");

function normalizeMessages(history) {
	if (!Array.isArray(history)) return [];
	return history
		.map((m) => {
			const role = m?.role === "user" ? "user" : "assistant";
			const text = String(m?.text || "");
			if (!text.trim()) return null;
			return { role, text };
		})
		.filter(Boolean);
}

function buildGreetingReply(rawText) {
	const text = String(rawText || "").trim().toLowerCase();
	if (!text) return null;
	if (text.includes("how are you") || text.includes("how's it going") || text.includes("how is it going")) {
		return "I’m doing well, thank you 👋 Whenever you’re ready, tell me what you need handled and I’ll help shape it gently, step by step.";
	}
	if (
		text.includes("just saying hello") ||
		text.includes("only saying hello") ||
		text.includes("just checking") ||
		text.includes("just checking in")
	) {
		return "That’s perfectly fine 👋 Whenever you’re ready, just tell me the errand and I’ll help you put it together clearly.";
	}
	if (text === "thanks" || text === "thank you" || text === "thank you!" || text === "thanks!") {
		return "You’re very welcome ✨ When you’re ready, tell me what needs handling and I’ll help organise it with care.";
	}
	if (text === "ok" || text === "okay" || text === "okay then" || text === "sounds good") {
		return "Perfect - whenever you’re ready, tell me what needs handling and I’ll help you shape the request clearly.";
	}
	if (text.includes("good morning")) {
		return "Good morning - tell me what needs handling and the city or starting point, and I’ll help organise it.";
	}
	if (text.includes("good afternoon")) {
		return "Good afternoon - I’m Toxi. Share the errand and the city or starting point, and I’ll keep it tidy for you.";
	}
	if (text.includes("good evening")) {
		return "Good evening - I’m ready when you are. Tell me what needs doing and where it should start, and we can fill in the rest together.";
	}
	if (GREETING_ONLY_PATTERN.test(text)) {
		return "Hi - I’m Toxi. Tell me what you need handled and where it should start, and I’ll help from there.";
	}
	if (CASUAL_SOCIAL_PATTERN.test(text)) {
		return "I’m here whenever you’re ready. Tell me what you need handled and I’ll help organise it clearly, one step at a time.";
	}
	return null;
}

function buildAssistantHistory(items) {
	if (!Array.isArray(items)) return [];
	return items
		.map((item) => {
			const role = item?.role === "user" ? "user" : "assistant";
			const text = String(item?.text || "").trim();
			if (!text) return null;
			return { role, text };
		})
		.filter(Boolean)
		.slice(-10);
}

async function fetchPublicAssistantReply({ message, history }) {
	if (!API_BASE_URL) {
		throw new Error("Missing public assistant API base URL.");
	}

	const res = await fetch(`${API_BASE_URL}/api/v1/assistant/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			message,
			mode: "public",
			history: buildAssistantHistory(history),
		}),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.detail || `Public assistant failed (${res.status})`);
	}

	const replyText = String(data?.replyText || "").trim();
	if (!replyText) {
		throw new Error("Missing public assistant replyText.");
	}

	return replyText;
}

function wait(ms) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function ToxiConciergeWidget({
	open,
	onOpen,
	onClose,
	onStartSignup,
	pageContext,
	disabled,
	hideLauncher = false,
	pauseTeaser = false,
	anchorBottomPx = 16,
	anchorRightPx = 16,
	anchorIncludeSafeAreaBottom = true,
	resetKey,
	assistantConfig,
}) {
	const [session, setSession] = useState(() => createConciergeSession());
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [handoffError, setHandoffError] = useState("");
	const [extraMessages, setExtraMessages] = useState([]);
	const [introMessage, setIntroMessage] = useState(null);
	const [introPhase, setIntroPhase] = useState("idle");
	const [quickActionsVisible, setQuickActionsVisible] = useState(false);
	const previousOpenRef = useRef(open);
	const previousResetKeyRef = useRef(resetKey);
	const introRunRef = useRef(0);
	const surface = pageContext?.surface || "landing_page";
	const initialTypingDelayMs = Math.max(
		0,
		Number(assistantConfig?.initialWelcomeTypingDelayMs ?? DEFAULT_INITIAL_TYPING_DELAY_MS),
	);
	const quickActionsRevealDelayMs = Math.max(
		0,
		Number(
			assistantConfig?.initialQuickActionsRevealDelayMs ??
				DEFAULT_QUICK_ACTIONS_REVEAL_DELAY_MS,
		),
	);

	const summaryRows = useMemo(
		() => getLiveSummary(session?.state || {}),
		[session?.state],
	);
	const landingReady = useMemo(() => {
		const state = session?.state || {};
		const hasTask = Boolean(
			String(state?.serviceType?.value || "").trim() ||
			String(state?.notes?.value || "").trim(),
		);
		const hasStart = Boolean(
			String(state?.pickupLocation?.value || "").trim() ||
			String(state?.city?.value || "").trim() ||
			String(state?.dropoffLocation?.value || "").trim(),
		);
		return hasTask && hasStart;
	}, [session?.state]);
	const missingLabels = useMemo(
		() => getMissingFields(session?.state || {}).map((field) => FIELD_LABELS[field]),
		[session?.state],
	);
	const landingMissingLabels = useMemo(() => {
		const state = session?.state || {};
		const labels = [];
		const hasTask = Boolean(
			String(state?.serviceType?.value || "").trim() ||
			String(state?.notes?.value || "").trim(),
		);
		const hasStart = Boolean(
			String(state?.pickupLocation?.value || "").trim() ||
			String(state?.city?.value || "").trim() ||
			String(state?.dropoffLocation?.value || "").trim(),
		);
		if (!hasTask) labels.push("what needs to be done");
		if (!hasStart) labels.push("where it should start");
		return labels;
	}, [session?.state]);

	const historyMessages = useMemo(
		() => normalizeMessages(session?.state?.history),
		[session?.state?.history],
	);
	const hasUserDrivenConversation =
		historyMessages.length > 0 ||
		summaryRows.length > 0 ||
		extraMessages.some((message) => message?.role === "user");
	const messages = useMemo(() => {
		const introItems = introMessage ? [introMessage] : [];
		return [
			...introItems,
			...historyMessages,
			...(Array.isArray(extraMessages) ? extraMessages : []),
		];
	}, [extraMessages, historyMessages, introMessage]);
	const shouldRunInitialSequence =
		Boolean(open) &&
		Boolean(assistantConfig?.assistantMode) &&
		surface === "landing_page" &&
		!hasUserDrivenConversation;
	const footerHint = useMemo(() => {
		if (landingReady) {
			return "Good to go - continue and Toxi will carry this into signup, then you can add finer details later.";
		}
		if (summaryRows.length) {
			return `Still needed: ${landingMissingLabels.join(", ")}.`;
		}
		return "Start with the task and the city or starting point. Toxi can help fill the rest later.";
	}, [landingMissingLabels, landingReady, summaryRows]);
	const publicAssistantEnabled =
		surface === "landing_page" && Boolean(API_BASE_URL) && isToxiOpenAiEnabled();

	const resetConversation = useCallback(() => {
		introRunRef.current += 1;
		setSession(createConciergeSession());
		setInput("");
		setSending(false);
		setHandoffError("");
		setExtraMessages([]);
		setIntroMessage(null);
		setIntroPhase("idle");
		setQuickActionsVisible(false);
	}, []);

	useEffect(() => {
		if (!open) return;
		setHandoffError("");
		setExtraMessages([]);
	}, [open]);

	useEffect(() => {
		if (!shouldRunInitialSequence) {
			if (!open) {
				setIntroMessage(null);
				setIntroPhase("idle");
				setQuickActionsVisible(false);
			}
			return undefined;
		}

		const runId = introRunRef.current + 1;
		introRunRef.current = runId;
		setIntroMessage(null);
		setIntroPhase("typing");
		setQuickActionsVisible(false);

		const runIntro = async () => {
			if (initialTypingDelayMs > 0) {
				await wait(initialTypingDelayMs);
			}
			if (introRunRef.current !== runId) return;

			setIntroPhase("streaming");
			const introId = "toxi-initial-welcome";
			setIntroMessage({
				id: introId,
				role: "assistant",
				text: "",
				variant: "welcome",
			});

			await streamTextChunks(
				INITIAL_WELCOME_TEXT,
				(partial) => {
					if (introRunRef.current !== runId) return;
					setIntroMessage({
						id: introId,
						role: "assistant",
						text: partial,
						variant: "welcome",
					});
				},
				{ minDelay: 12, maxDelay: 18, punctuationDelay: 90 },
			);

			if (introRunRef.current !== runId) return;
			setIntroMessage({
				id: introId,
				role: "assistant",
				text: INITIAL_WELCOME_TEXT,
				variant: "welcome",
			});
			setIntroPhase("done");
			if (quickActionsRevealDelayMs > 0) {
				await wait(quickActionsRevealDelayMs);
			}
			if (introRunRef.current !== runId) return;
			setQuickActionsVisible(true);
		};

		runIntro().catch(() => {
			if (introRunRef.current !== runId) return;
			setIntroMessage({
				id: "toxi-initial-welcome",
				role: "assistant",
				text: INITIAL_WELCOME_TEXT,
				variant: "welcome",
			});
			setIntroPhase("done");
			setQuickActionsVisible(true);
		});

		return () => {
			if (introRunRef.current === runId) {
				introRunRef.current += 1;
			}
		};
	}, [
		assistantConfig?.assistantMode,
		initialTypingDelayMs,
		open,
		quickActionsRevealDelayMs,
		shouldRunInitialSequence,
		surface,
	]);

	useEffect(() => {
		if (previousOpenRef.current && !open) {
			resetConversation();
		}
		previousOpenRef.current = open;
	}, [open, resetConversation]);

	useEffect(() => {
		if (previousResetKeyRef.current === resetKey) return;
		previousResetKeyRef.current = resetKey;
		resetConversation();
	}, [resetConversation, resetKey]);

	const pushUserText = useCallback(
		async (text) => {
			const trimmed = String(text || "").trim();
			if (!trimmed) return;
			introRunRef.current += 1;
			setIntroPhase("done");
			setIntroMessage(null);
			setQuickActionsVisible(false);
			setSending(true);
			setHandoffError("");

			const socialFallbackReply = buildGreetingReply(trimmed);
			const intent = routeToxiIntent(trimmed, surface);
			const shouldUsePublicAssistant =
				publicAssistantEnabled && (Boolean(socialFallbackReply) || intent !== "create");

			if (shouldUsePublicAssistant) {
				const now = Date.now();
				const userId = `toxi-user-${now}`;
				const assistantId = `toxi-assistant-${now}`;
				const historyForAssistant = [
					...historyMessages,
					...(Array.isArray(extraMessages) ? extraMessages : []),
					{ role: "user", text: trimmed },
				];
				setExtraMessages((prev) => {
					const next = Array.isArray(prev) ? prev.slice() : [];
					next.push({ id: userId, role: "user", text: trimmed });
					next.push({ id: assistantId, role: "assistant", text: "" });
					return next;
				});
				setInput("");

				try {
					const replyText = await fetchPublicAssistantReply({
						message: trimmed,
						history: historyForAssistant,
					});
					await streamTextChunks(replyText, (partial) => {
						setExtraMessages((prev) =>
							prev.map((message) =>
								message.id === assistantId
									? { ...message, text: partial }
									: message,
							),
						);
					});
					setExtraMessages((prev) => {
						const next = Array.isArray(prev) ? prev.slice() : [];
						const assistantIndex = next.findIndex((message) => message.id === assistantId);
						if (assistantIndex === -1) {
							next.push({ id: assistantId, role: "assistant", text: replyText });
						} else {
							next[assistantIndex] = {
								...next[assistantIndex],
								text: replyText,
							};
						}
						return next;
					});
				} catch {
					const fallbackReply =
						socialFallbackReply ||
						"I’m here whenever you’re ready. Tell me what you need handled and I’ll help organise it clearly, one step at a time.";
					await streamTextChunks(fallbackReply, (partial) => {
						setExtraMessages((prev) =>
							prev.map((message) =>
								message.id === assistantId
									? { ...message, text: partial }
									: message,
							),
						);
					});
					setExtraMessages((prev) => {
						const next = Array.isArray(prev) ? prev.slice() : [];
						const assistantIndex = next.findIndex((message) => message.id === assistantId);
						if (assistantIndex === -1) {
							next.push({ id: assistantId, role: "assistant", text: fallbackReply });
						} else {
							next[assistantIndex] = {
								...next[assistantIndex],
								text: fallbackReply,
							};
						}
						return next;
					});
				} finally {
					setSending(false);
				}
				return;
			}

			if (socialFallbackReply) {
				const now = Date.now();
				const userId = `toxi-user-${now}`;
				const assistantId = `toxi-assistant-${now}`;
				setExtraMessages((prev) => {
					const next = Array.isArray(prev) ? prev.slice() : [];
					next.push({ id: userId, role: "user", text: trimmed });
					next.push({ id: assistantId, role: "assistant", text: "" });
					return next;
				});
				setInput("");
				await streamTextChunks(socialFallbackReply, (partial) => {
					setExtraMessages((prev) =>
						prev.map((message) =>
							message.id === assistantId ? { ...message, text: partial } : message,
						),
					);
				});
				setExtraMessages((prev) => {
					const next = Array.isArray(prev) ? prev.slice() : [];
					const userIndex = next.findIndex((message) => message.id === userId);
					if (userIndex === -1) {
						next.push({ id: userId, role: "user", text: trimmed });
					}
					const assistantIndex = next.findIndex((message) => message.id === assistantId);
					if (assistantIndex === -1) {
						next.push({ id: assistantId, role: "assistant", text: socialFallbackReply });
					} else {
						next[assistantIndex] = {
							...next[assistantIndex],
							text: socialFallbackReply,
						};
					}
					return next;
				});
				setSending(false);
				return;
			}

			// Concierge (unauth) should only run deterministic intake for Create intent.
			// For anything that sounds like tracking/proof/updates/support, prompt sign-in.
			if (intent !== "create") {
				const ref = extractErrandReference(trimmed);
				const now = Date.now();
				const userId = `toxi-user-${now}`;
				const assistantId = `toxi-assistant-${now}`;
				const intentLabel =
					intent === "track"
						? "track status"
						: intent === "proof"
							? "view proof"
							: intent === "update"
								? "make changes"
								: intent;
				const responseText = `To ${intentLabel}${ref ? ` for ${ref}` : ""}, please sign in first. Tap “Continue to signup” below and I’ll keep the next step simple.`;
				setExtraMessages((prev) => {
					const next = Array.isArray(prev) ? prev.slice() : [];
					next.push({ id: userId, role: "user", text: trimmed });
					next.push({ id: assistantId, role: "assistant", text: "" });
					return next;
				});
				setInput("");
				await streamTextChunks(responseText, (partial) => {
					setExtraMessages((prev) =>
						prev.map((message) =>
							message.id === assistantId ? { ...message, text: partial } : message,
						),
					);
				});
				setExtraMessages((prev) => {
					const next = Array.isArray(prev) ? prev.slice() : [];
					const userIndex = next.findIndex((message) => message.id === userId);
					if (userIndex === -1) {
						next.push({ id: userId, role: "user", text: trimmed });
					}
					const assistantIndex = next.findIndex((message) => message.id === assistantId);
					if (assistantIndex === -1) {
						next.push({ id: assistantId, role: "assistant", text: responseText });
					} else {
						next[assistantIndex] = {
							...next[assistantIndex],
							text: responseText,
						};
					}
					return next;
				});
				setSending(false);
				return;
			}

			try {
				const previousSession = session;
				const { session: nextSession, turn } = stepConcierge(previousSession, trimmed);
				const interimHistory = Array.isArray(nextSession?.state?.history)
					? nextSession.state.history.slice(0, -1)
					: [];
				setSession({
					...nextSession,
					state: {
						...nextSession.state,
						history: interimHistory,
					},
				});
				const assistantId = `toxi-assistant-${Date.now()}`;
				setExtraMessages([{ id: assistantId, role: "assistant", text: "" }]);
				setInput("");
				await streamTextChunks(turn?.assistantText || "", (partial) => {
					setExtraMessages([{ id: assistantId, role: "assistant", text: partial }]);
				});
				setSession(nextSession);
				setExtraMessages([]);
			} finally {
				setSending(false);
			}
		},
		[extraMessages, historyMessages, publicAssistantEnabled, session, surface],
	);

	const handleSend = useCallback(
		(overrideText) => {
			pushUserText(overrideText ?? input);
		},
		[input, pushUserText],
	);

	const handleKeyDown = useCallback(
		(event) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	const startSignup = useCallback(() => {
		setHandoffError("");
		if (!landingReady) {
			setHandoffError("Tell Toxi what needs handling and the city or starting point so we can carry it into signup.");
			return;
		}

		const prefill = buildPrefillRequest(session.state);
		const payload = {
			version: 1,
			createdAt: Date.now(),
			prefill,
			summary: makeSummary(session.state),
		};

		const ok = writeToxiConciergeHandoff(payload);
		if (!ok) {
			setHandoffError(
				"We couldn't save your request details in this tab. Please disable private browsing or try another browser.",
			);
			return;
		}

		try {
			onStartSignup?.();
		} finally {
			onClose?.();
		}
	}, [landingReady, onClose, onStartSignup, session.state]);

	return (
		<ToxiChatPanel
			open={open}
			disabled={disabled}
			anchorBottomPx={anchorBottomPx}
			anchorRightPx={anchorRightPx}
			anchorIncludeSafeAreaBottom={anchorIncludeSafeAreaBottom}
			onOpen={onOpen}
			onClose={onClose}
			title="Toxi"
			subtitle="Tell me the errand - I’ll prep the details for you with care."
			eyebrowLabel="AI concierge"
			avatar={{
				glyph: "concierge",
				label: "EB",
				bgClassName:
					"bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_rgba(15,23,42,1)_55%)]",
			}}
			launcherTitle="Toxi"
			launcherSubtitle="A gentle concierge in under a minute"
			launcherAriaLabel="Open Toxi"
			layout="simple"
			assistantConfig={assistantConfig}
			pauseTeaser={pauseTeaser}
			onResetConversation={resetConversation}
			summarySlot={
				hasUserDrivenConversation ? (
					<ToxiSummaryCard
						rows={summaryRows}
						ready={landingReady}
						missingLabels={landingReady ? missingLabels : landingMissingLabels}
						title="Your request, cleaned up"
					/>
				) : null
			}
			messages={messages}
			quickActionsDisabled={sending}
			quickActions={!hasUserDrivenConversation && quickActionsVisible ? QUICK_ACTIONS : []}
			quickActionsLabel="Helpful starters"
			onQuickAction={(a) => pushUserText(a?.message)}
			input={input}
			inputPlaceholder="Tell Toxi what you need handled…"
			onInputChange={setInput}
			onKeyDown={handleKeyDown}
			onSend={handleSend}
			sending={sending}
			error={handoffError}
			ctaLabel="Continue to signup →"
			ctaDisabled={!landingReady}
			onCta={startSignup}
			ctaHint={footerHint}
			showTypingIndicator={introPhase === "typing"}
			assistantBusy={introPhase === "typing" || introPhase === "streaming"}
		/>
	);
}
