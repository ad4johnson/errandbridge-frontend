import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	extractErrandIdFromReference,
	extractErrandReference,
	routeToxiIntent,
} from "../lib/toxi/intentRouter";
import { streamTextChunks } from "../lib/toxi/messageStream";

const SUPPORT_SESSION_KEY = "supportSessionId";

const safeNow = () => Date.now();

const normalizeStatusLabel = (value) =>
	String(value || "unknown")
		.replace(/_/g, " ")
		.trim();

function normalizeSupportMessages(messages) {
	if (!Array.isArray(messages)) return [];
	return messages
		.map((msg) => {
			const senderType = msg?.sender_type || "system";
			const role = senderType === "customer" ? "user" : "assistant";
			const text = String(msg?.message || "");
			if (!text.trim()) return null;
			return {
				id: `support-${msg.id || safeNow()}`,
				role,
				text,
				timestamp: msg?.created_at || null,
			};
		})
		.filter(Boolean);
}

async function fetchSupportSessionMessages({ apiBaseUrl, sessionId, token }) {
	if (!apiBaseUrl || !sessionId) return [];
	const headers = token ? { Authorization: `Bearer ${token}` } : {};
	const res = await fetch(
		`${apiBaseUrl}/api/v1/support/sessions/${encodeURIComponent(sessionId)}/messages`,
		{ headers },
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.detail || "Unable to load support messages.");
	}
	return normalizeSupportMessages(data?.messages || []);
}

async function postSupportChat({ apiBaseUrl, sessionId, message, token }) {
	const headers = { "Content-Type": "application/json" };
	if (token) headers.Authorization = `Bearer ${token}`;

	const res = await fetch(`${apiBaseUrl}/api/v1/support/chat`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			message,
			session_id: sessionId || null,
		}),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.detail || "Unable to reach support right now.");
	}
	return {
		sessionId: data?.session_id || sessionId || null,
		responseText: data?.response || "",
		needsHandoff: Boolean(data?.needs_handoff),
	};
}

async function fetchTrackingStatus({ apiBaseUrl, errandId, token }) {
	if (!apiBaseUrl || !errandId) throw new Error("Missing errand id.");
	const headers = token ? { Authorization: `Bearer ${token}` } : {};
	const res = await fetch(
		`${apiBaseUrl}/api/v1/tracking/status/${encodeURIComponent(errandId)}`,
		{ headers },
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.detail || "Unable to load tracking status.");
	}
	return data;
}

async function fetchErrandAttachments({ apiBaseUrl, errandId, token }) {
	if (!apiBaseUrl || !errandId) throw new Error("Missing errand id.");
	const headers = token ? { Authorization: `Bearer ${token}` } : {};
	const res = await fetch(
		`${apiBaseUrl}/errands/${encodeURIComponent(errandId)}/attachments`,
		{ headers },
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.detail || "Unable to load attachments.");
	}
	return Array.isArray(data) ? data : [];
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

function buildSupportWelcome(pageContext) {
	const lifecycle = pageContext?.lifecycle || {};
	const ref = pageContext?.activeErrand?.referenceNumber;
	if (lifecycle?.hasPendingReview) {
		return "Hi, I’m Toxi 👋 Hope you’ve had a great experience so far using EB - please don’t forget to review and rate your Pilot.";
	}
	if (lifecycle?.hasReferralShareAvailable && lifecycle?.hasSubmittedAnyReview) {
		return "Thank you for your review 👋 You can also share your referral link - if someone uses your code before December, you’ll get 10% off your next request.";
	}
	if (lifecycle?.isReturningClient) {
		return "Welcome back 👋 Need help with a new errand request, update, proof, or support?";
	}
	if (ref) {
		return `Hi - I’m Toxi. I’m here to help with ${ref}, whether you need status, proof, timing changes, or support.`;
	}
	return "Hi, I’m Toxi - need help with an errand request, update, proof, or support?";
}

function buildDashboardQuickActions(pageContext) {
	const ref = pageContext?.activeErrand?.referenceNumber;
	return [
		{
			id: "qa-status",
			label: "Track errand",
			message: ref
				? `What’s the latest status for ${ref}?`
				: "What’s the latest status of my errand?",
		},
		{
			id: "qa-proof",
			label: "View proof",
			message: ref
				? `Show me proof and attachments for ${ref}.`
				: "Show me proof and attachments for my errand.",
		},
		{
			id: "qa-update",
			label: "Adjust timing",
			message: ref
				? `I need to change the starting-point time window for ${ref}.`
				: "I need to change my starting-point time window.",
		},
		{ id: "qa-pricing", label: "See pricing", action: "open_pricing" },
		{ id: "qa-support", label: "Get support", action: "open_support" },
	];
}

function buildDashboardSummary(pageContext) {
	const errand = pageContext?.activeErrand;
	if (!errand) return null;

	const pickup = errand?.pickupLocation || errand?.pickup_location || "";
	const dropoff = errand?.dropoffLocation || errand?.dropoff_location || "";
	const title = errand?.title || errand?.description || "";
	const reference = errand?.referenceNumber || errand?.reference_number || "";
	const status = normalizeStatusLabel(errand?.status || "");
	const rows = [
		title ? `Task: ${title}` : null,
		reference ? `Reference: ${reference}` : null,
		status ? `Status: ${status}` : null,
		pickup ? `Starting point: ${pickup}` : null,
		dropoff ? `Ending point: ${dropoff}` : null,
	].filter(Boolean);

	if (!rows.length) return null;

	return {
		title: "Errand snapshot",
		description: reference
			? `Toxi is focused on ${reference}. Ask for status, proof, timing changes, or support.`
			: "Live dashboard context for this conversation.",
		statusLabel: pageContext?.surface === "tracking_page" ? "Live context" : "Focused errand",
		statusTone: "neutral",
		rows,
	};
}

function clearStoredSupportSession() {
	try {
		window.localStorage?.removeItem(SUPPORT_SESSION_KEY);
	} catch {
		// ignore
	}
}

export default function useToxiAssistant({
	open,
	pageContext,
	apiBaseUrl,
	getAuthToken,
	onOpenPricing,
	onOpenSupport,
	onPreviewFileUrl,
	onRequestHumanAgent,
	buildAttachmentsContent,
}) {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [error, setError] = useState("");
	const [needsHandoff, setNeedsHandoff] = useState(false);
	const [supportSessionId, setSupportSessionId] = useState(() => {
		try {
			return window.localStorage?.getItem(SUPPORT_SESSION_KEY) || null;
		} catch {
			return null;
		}
	});

	const pendingUpdateRef = useRef(null);
	const didInitRef = useRef(false);
	const pageIdentityRef = useRef("");
	const welcomeRunRef = useRef(0);

	const welcomeText = useMemo(() => buildSupportWelcome(pageContext), [pageContext]);
	const quickActions = useMemo(
		() => buildDashboardQuickActions(pageContext),
		[pageContext],
	);
	const summaryCard = useMemo(
		() => buildDashboardSummary(pageContext),
		[pageContext],
	);

	const startWelcomeMessage = useCallback(async () => {
		const runId = welcomeRunRef.current + 1;
		welcomeRunRef.current = runId;
		const timestamp = safeNow();
		const welcomeId = `welcome-client-support-${timestamp}`;

		setMessages([
			{
				id: welcomeId,
				role: "assistant",
				text: "",
				timestamp,
				variant: "welcome",
			},
		]);

		try {
			await streamTextChunks(
				welcomeText,
				(partial) => {
					if (welcomeRunRef.current !== runId) return;
					setMessages([
						{
							id: welcomeId,
							role: "assistant",
							text: partial,
							timestamp,
							variant: "welcome",
						},
					]);
				},
				{ minDelay: 12, maxDelay: 18, punctuationDelay: 90 },
			);
		} catch {
			// Fall back to the final message below.
		}

		if (welcomeRunRef.current !== runId) return;
		setMessages([
			{
				id: welcomeId,
				role: "assistant",
				text: welcomeText,
				timestamp,
				variant: "welcome",
			},
		]);
	}, [welcomeText]);

	const resetChat = useCallback(() => {
		clearStoredSupportSession();
		pendingUpdateRef.current = null;
		setSupportSessionId(null);
		setNeedsHandoff(false);
		setInput("");
		setError("");
		setSending(false);
		startWelcomeMessage().catch(() => {});
	}, [startWelcomeMessage]);

	useEffect(() => {
		if (open) return undefined;
		welcomeRunRef.current += 1;
		return undefined;
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const nextIdentity = JSON.stringify({
			surface: pageContext?.surface || "client_dashboard",
			activeErrandId: pageContext?.activeErrand?.id || null,
		});
		const shouldInit = !didInitRef.current || pageIdentityRef.current !== nextIdentity;
		if (!shouldInit) return;

		didInitRef.current = true;
		pageIdentityRef.current = nextIdentity;
		setError("");
		setMessages([
			{
				id: `welcome-client-support-${safeNow()}`,
				role: "assistant",
				text: welcomeText,
				timestamp: safeNow(),
				variant: "welcome",
			},
		]);
	}, [open, pageContext?.activeErrand?.id, pageContext?.surface, welcomeText]);

	const syncSupportMessages = useCallback(async () => {
		const token = getAuthToken?.() || null;
		if (!supportSessionId) return;
		const items = await fetchSupportSessionMessages({
			apiBaseUrl,
			sessionId: supportSessionId,
			token,
		});
		if (items.length) {
			setMessages(items);
		}
	}, [apiBaseUrl, getAuthToken, supportSessionId]);

	useEffect(() => {
		if (!open) return undefined;
		let alive = true;
		syncSupportMessages().catch(() => {});
		const interval = setInterval(() => {
			if (!alive) return;
			syncSupportMessages().catch(() => {});
		}, needsHandoff ? 8000 : 15000);
		return () => {
			alive = false;
			clearInterval(interval);
		};
	}, [needsHandoff, open, syncSupportMessages]);

	const sendMessage = useCallback(
		async (rawMessage) => {
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
				const token = getAuthToken?.() || null;
				const surface = pageContext?.surface || "client_dashboard";
				const activeErrandId = pageContext?.activeErrand?.id
					? Number(pageContext.activeErrand.id)
					: null;
				const ref =
					extractErrandReference(message) ||
					pageContext?.activeErrand?.referenceNumber ||
					null;
				const parsedErrandId = extractErrandIdFromReference(ref);
				const resolvedErrandId = parsedErrandId || activeErrandId || null;

				if (pendingUpdateRef.current?.errandId) {
					const pending = pendingUpdateRef.current;
					pendingUpdateRef.current = null;
					const updateMessage = `Timing change request for ${pending.reference || `errand #${pending.errandId}`}: ${message}`;
					const result = await postSupportChat({
						apiBaseUrl,
						sessionId: supportSessionId,
						message: updateMessage,
						token,
					});
					setNeedsHandoff(Boolean(result.needsHandoff));
					setSupportSessionId(result.sessionId);
					try {
						window.localStorage?.setItem(SUPPORT_SESSION_KEY, result.sessionId);
					} catch {
						// ignore
					}
					try {
						await syncSupportMessages();
					} catch {
						await streamAssistantMessage({
							setMessages,
							id: `support-${safeNow()}`,
							text:
								result.responseText ||
								"Got it - I’ve shared the timing change request with support.",
						});
					}
					return;
				}

				const intent = routeToxiIntent(message, surface);
				if (intent === "pricing") {
					onOpenPricing?.();
					await streamAssistantMessage({
						setMessages,
						id: `toxi-pricing-${safeNow()}`,
						text: "Opening pricing for you…",
					});
					return;
				}

				if (intent === "track") {
					if (!resolvedErrandId) {
						await streamAssistantMessage({
							setMessages,
							id: `toxi-track-missing-${safeNow()}`,
							text:
								"Share your errand reference (for example, EB-36-5084) and I’ll pull the latest status for you.",
						});
						return;
					}

					const payload = await fetchTrackingStatus({
						apiBaseUrl,
						errandId: resolvedErrandId,
						token,
					});
					const status = normalizeStatusLabel(payload?.status || "unknown");
					const reason = String(payload?.reason || "").trim();
					const extra = reason
						? reason
						: payload?.tracking_allowed
							? payload?.tracking_active
								? "Live tracking is active."
								: "Tracking isn’t active right now."
							: "Tracking isn’t available yet.";

					await streamAssistantMessage({
						setMessages,
						id: `toxi-track-${safeNow()}`,
						text: `${ref ? `Here’s the latest for ${ref}` : "Here’s the latest status"}: ${status}. ${extra}`,
					});
					return;
				}

				if (intent === "proof") {
					if (!resolvedErrandId) {
						await streamAssistantMessage({
							setMessages,
							id: `toxi-proof-missing-${safeNow()}`,
							text:
								"Which errand is this for? Share the reference (for example, EB-36-5084) and I’ll list any attachments I can find.",
						});
						return;
					}

					const items = await fetchErrandAttachments({
						apiBaseUrl,
						errandId: resolvedErrandId,
						token,
					});
					if (!items.length) {
						await streamAssistantMessage({
							setMessages,
							id: `toxi-proof-none-${safeNow()}`,
							text: ref
								? `I couldn’t find any attachments for ${ref} yet.`
								: "I couldn’t find any attachments for that errand yet.",
						});
						return;
					}

					await streamAssistantMessage({
						setMessages,
						id: `toxi-proof-${safeNow()}`,
						text: ref
							? `Here are the attachments I found for ${ref}:`
							: "Here are the attachments I found:",
						content: typeof buildAttachmentsContent === "function"
							? buildAttachmentsContent(items, {
								apiBaseUrl,
								onPreviewFileUrl,
							})
							: null,
					});
					return;
				}

				if (intent === "update") {
					if (!resolvedErrandId) {
						await streamAssistantMessage({
							setMessages,
							id: `toxi-update-missing-${safeNow()}`,
							text:
								"To update the timing, I’ll need your reference (for example, EB-36-5084). Which errand should we change?",
						});
						return;
					}

					pendingUpdateRef.current = {
						errandId: resolvedErrandId,
						reference: ref,
					};
					await streamAssistantMessage({
						setMessages,
						id: `toxi-update-ask-${safeNow()}`,
						text:
							"What new starting-point time window would you like? (Example: 2026-04-08 14:00–16:00)",
					});
					return;
				}

				const result = await postSupportChat({
					apiBaseUrl,
					sessionId: supportSessionId,
					message,
					token,
				});

				setNeedsHandoff(Boolean(result.needsHandoff));
				setSupportSessionId(result.sessionId);
				try {
					window.localStorage?.setItem(SUPPORT_SESSION_KEY, result.sessionId);
				} catch {
					// ignore
				}

				try {
					await syncSupportMessages();
				} catch {
					await streamAssistantMessage({
						setMessages,
						id: `support-${safeNow()}`,
						text: result.responseText || "Thanks - tell me a bit more.",
					});
				}
			} catch (err) {
				setError(err?.message || "Unable to send right now.");
			} finally {
				setSending(false);
			}
		},
		[
			apiBaseUrl,
			buildAttachmentsContent,
			getAuthToken,
			onOpenPricing,
			onPreviewFileUrl,
			pageContext,
			sending,
			supportSessionId,
			syncSupportMessages,
		],
	);

	const handleQuickAction = useCallback(
		(action) => {
			if (!action || sending) return;
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
		[onOpenPricing, onOpenSupport, onRequestHumanAgent, sendMessage, sending],
	);

	const handleSend = useCallback(
		(overrideText) => {
			sendMessage(overrideText ?? input);
		},
		[input, sendMessage],
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

	const cta = useMemo(
		() =>
			needsHandoff
				? {
					label: "Request a human agent →",
					disabled: false,
					hint: "Support will reply here shortly.",
					onClick: () => onRequestHumanAgent?.(),
				}
				: {
					label: "Open support →",
					disabled: false,
					hint: pageContext?.activeErrand?.referenceNumber
						? `Need more help on ${pageContext.activeErrand.referenceNumber}? Continue on the support page.`
						: "You can also email ErrandBridge Support at support@errandbridge.com.",
					onClick: () => onOpenSupport?.(),
				},
		[needsHandoff, onOpenSupport, onRequestHumanAgent, pageContext?.activeErrand?.referenceNumber],
	);

	return {
		messages,
		input,
		setInput,
		sending,
		error,
		quickActions,
		handleQuickAction,
		handleSend,
		handleKeyDown,
		resetChat,
		cta,
		summaryCard,
		title: "Toxi",
		subtitle: pageContext?.activeErrand?.referenceNumber
			? "Gentle help for this errand"
			: "Gentle help for status, proof, and support",
		launcherTitle: "Toxi",
		launcherSubtitle: pageContext?.activeErrand?.referenceNumber
			? "Help with this errand"
			: "Helpful support on your dashboard",
		launcherAriaLabel: "Open Toxi",
		inputPlaceholder: pageContext?.activeErrand?.referenceNumber
			? `Ask about status, proof, updates, or support for ${pageContext.activeErrand.referenceNumber}…`
			: "Ask about status, proof, updates, pricing, or support…",
	};
}