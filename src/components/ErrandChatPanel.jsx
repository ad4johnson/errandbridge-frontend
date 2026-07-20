import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./ErrandChatPanel.css";

const normalizeBase = (base) => {
	const raw = (base || "").trim();
	if (!raw) return "";
	return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

const formatTime = (value) => {
	try {
		return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	} catch {
		return "";
	}
};

const areMessagesEqual = (previous, next) => {
	if (previous === next) return true;
	if (!Array.isArray(previous) || !Array.isArray(next)) return false;
	if (previous.length !== next.length) return false;

	for (let index = 0; index < previous.length; index += 1) {
		const prevMessage = previous[index] || {};
		const nextMessage = next[index] || {};
		if (
			prevMessage.id !== nextMessage.id ||
			prevMessage.message !== nextMessage.message ||
			prevMessage.created_at !== nextMessage.created_at ||
			prevMessage.sender_name !== nextMessage.sender_name ||
			prevMessage.sender_type !== nextMessage.sender_type ||
			Boolean(prevMessage.mine) !== Boolean(nextMessage.mine)
		) {
			return false;
		}
	}

	return true;
};

const ErrandChatPanel = ({
	errandId,
	apiBaseUrl,
	token,
	title = "💬 Chat",
	variant = "default",
	showHeader = true,
	quickReplies = [],
	smartQuickReplies = false,
	systemMessages = [],
	placeholder = "Type a message…",
	maxMessageChars = 2000,
	sendOnEnter = "auto",
	pollMs = 3000,
	limit = 100,
	disabled = false,
	disabledMessage = "Chat is unavailable once this errand is completed.",
}) => {
	const base = useMemo(() => normalizeBase(apiBaseUrl), [apiBaseUrl]);
	const [messages, setMessages] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);
	const [showJumpToLatest, setShowJumpToLatest] = useState(false);
	const listRef = useRef(null);
	const composerRef = useRef(null);
	const lastCountRef = useRef(0);
	const complianceNotice = "In-app chats are monitored for data compliance, security, and protection.";
	const encryptionNotice = "Messages are transmitted over encrypted connections when available.";
	const securityReminderNotice = "For your security, do not share passwords, payment details, or one-time codes in chat.";
	const baseLooksEncryptedInTransit = Boolean(base && base.toLowerCase().startsWith("https://"));
	const resolvedSendOnEnter = useMemo(() => {
		if (sendOnEnter === true || sendOnEnter === false) return sendOnEnter;
		if (typeof window === "undefined") return true;
		try {
			const isCoarsePointer = Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
			// On touch-first devices, Enter is commonly expected to insert a newline.
			return !isCoarsePointer;
		} catch {
			return true;
		}
	}, [sendOnEnter]);
	const draftStorageKey = useMemo(() => {
		if (!errandId) return null;
		const safeVariant = String(variant || "default").trim() || "default";
		return `eb:chatDraft:${safeVariant}:${String(errandId)}`;
	}, [errandId, variant]);
	const effectiveQuickReplies = useMemo(() => {
		const provided = Array.isArray(quickReplies) ? quickReplies.filter(Boolean) : [];
		if (provided.length > 0) return provided;
		if (!smartQuickReplies) return [];
		if (variant === "room") {
			return ["On my way", "Arrived", "Running 5 minutes late", "Delivered"]; 
		}
		return ["Can you confirm the ETA?", "I'm here", "Thanks"];
	}, [quickReplies, smartQuickReplies, variant]);
	const effectiveSystemMessages = useMemo(() => {
		const provided = Array.isArray(systemMessages) ? systemMessages.filter(Boolean) : [];
		const extras = [complianceNotice, securityReminderNotice];
		if (baseLooksEncryptedInTransit) {
			extras.push(encryptionNotice);
		}
		const merged = [...extras, ...provided].filter(Boolean);
		const seen = new Set();
		return merged.filter((msg) => {
			const key = String(msg).trim();
			if (!key) return false;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}, [baseLooksEncryptedInTransit, systemMessages]);
	const lastSystemMessageCountRef = useRef(effectiveSystemMessages.length);
	const pendingScrollFrameRef = useRef(null);
	const shouldStickToBottomRef = useRef(true);
	const isRoomVariant = variant === "room";

	const canUseChat = Boolean(errandId && token);
	const chatLocked = Boolean(disabled);

	const buildUrl = useCallback(
		(path) => (base ? `${base}${path}` : path),
		[base],
	);

	const scrollToBottom = useCallback(() => {
		const listElement = listRef.current;
		if (!listElement) return;
		listElement.scrollTop = listElement.scrollHeight;
		shouldStickToBottomRef.current = true;
		setShowJumpToLatest(false);
	}, []);

	const fetchMessages = useCallback(async ({ showLoader = false } = {}) => {
		if (!canUseChat) return;
		setError(null);
		if (showLoader) {
			setLoading(true);
		}
		try {
			const res = await fetch(
				buildUrl(`/api/v1/errands/${encodeURIComponent(errandId)}/messages?limit=${encodeURIComponent(limit)}`),
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(payload.detail || "Unable to load chat messages");
			}
			const nextMessages = Array.isArray(payload.messages) ? payload.messages : [];
			setMessages((previous) => (areMessagesEqual(previous, nextMessages) ? previous : nextMessages));
		} catch (err) {
			setError(err?.message || "Unable to load chat messages");
		} finally {
			if (showLoader) {
				setLoading(false);
			}
		}
	}, [buildUrl, canUseChat, errandId, limit, token]);

	useEffect(() => {
		void fetchMessages({ showLoader: true });
		if (!canUseChat) return undefined;
		const interval = window.setInterval(() => {
			void fetchMessages();
		}, Math.max(2500, Number(pollMs) || 3000));
		return () => window.clearInterval(interval);
	}, [canUseChat, fetchMessages, pollMs]);

	useEffect(() => {
		const listElement = listRef.current;
		if (!listElement) return undefined;

		const updateStickiness = () => {
			const isSticky = listElement.scrollTop + listElement.clientHeight >= listElement.scrollHeight - 32;
			shouldStickToBottomRef.current = isSticky;
			setShowJumpToLatest(!isSticky);
		};

		updateStickiness();
		listElement.addEventListener("scroll", updateStickiness, { passive: true });

		return () => {
			listElement.removeEventListener("scroll", updateStickiness);
		};
	}, []);

	useEffect(() => {
		const hasNewMessages = messages.length > lastCountRef.current;
		const hasNewSystemMessages = effectiveSystemMessages.length > lastSystemMessageCountRef.current;

		lastCountRef.current = messages.length;
		lastSystemMessageCountRef.current = effectiveSystemMessages.length;

		if (!hasNewMessages && !hasNewSystemMessages) return undefined;
		if (!shouldStickToBottomRef.current) return undefined;

		if (typeof window === "undefined") {
			scrollToBottom();
			return undefined;
		}

		pendingScrollFrameRef.current = window.requestAnimationFrame(scrollToBottom);
		return () => {
			if (pendingScrollFrameRef.current) {
				window.cancelAnimationFrame(pendingScrollFrameRef.current);
				pendingScrollFrameRef.current = null;
			}
		};
	}, [effectiveSystemMessages.length, messages.length, scrollToBottom]);

	useEffect(() => () => {
		if (pendingScrollFrameRef.current && typeof window !== "undefined") {
			window.cancelAnimationFrame(pendingScrollFrameRef.current);
		}
	}, []);

	useEffect(() => {
		if (!composerRef.current) return;
		composerRef.current.style.height = "auto";
		composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, isRoomVariant ? 132 : 108)}px`;
	}, [draft, isRoomVariant]);

	useEffect(() => {
		if (!draftStorageKey) return undefined;
		if (typeof window === "undefined") return undefined;
		try {
			const saved = window.localStorage.getItem(draftStorageKey);
			if (saved && !(draft || "").trim()) {
				setDraft(saved);
			}
		} catch {
			// Ignore storage errors (private mode, disabled storage, etc.)
		}
		return undefined;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [draftStorageKey]);

	useEffect(() => {
		if (!draftStorageKey) return undefined;
		if (typeof window === "undefined") return undefined;
		const handle = window.setTimeout(() => {
			try {
				const value = String(draft || "");
				if (value.trim()) {
					window.localStorage.setItem(draftStorageKey, value);
				} else {
					window.localStorage.removeItem(draftStorageKey);
				}
			} catch {
				// Ignore storage errors
			}
		}, 250);
		return () => window.clearTimeout(handle);
	}, [draft, draftStorageKey]);

	const applyQuickReply = useCallback((reply) => {
		const clean = String(reply || "").trim();
		if (!clean) return;
		setDraft((prev) => {
			const current = String(prev || "");
			if (!current.trim()) return clean;
			const needsSpace = !current.endsWith(" ") && !current.endsWith("\n");
			return `${current}${needsSpace ? " " : ""}${clean}`;
		});
		if (composerRef.current) {
			composerRef.current.focus();
		}
	}, []);

	const sendMessage = useCallback(async (overrideText) => {
		if (!canUseChat || chatLocked) return;
		const text = (overrideText ?? draft ?? "").trim();
		if (!text) return;
		shouldStickToBottomRef.current = true;
		setSending(true);
		setError(null);
		try {
			const res = await fetch(
				buildUrl(`/api/v1/errands/${encodeURIComponent(errandId)}/messages`),
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ message: text }),
				},
			);
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(payload.detail || "Unable to send message");
			}
			setDraft("");
			await fetchMessages();
		} catch (err) {
			setError(err?.message || "Unable to send message");
		} finally {
			setSending(false);
		}
	}, [buildUrl, canUseChat, chatLocked, draft, errandId, fetchMessages, token]);

	const messageCount = messages.length;
	const messageCountLabel =
		messageCount === 0
			? "No chat messages yet"
			: `${messageCount} message${messageCount === 1 ? "" : "s"}`;

	return (
		<div
			className={`errand-chat-panel ${isRoomVariant ? "errand-chat-panel--room" : ""}`}
		>
			{showHeader ? (
				<div className="errand-chat-header">
					<div className="errand-chat-title">{title}</div>
					<button
						type="button"
						className="errand-chat-refresh"
						onClick={() => fetchMessages({ showLoader: true })}
						disabled={!canUseChat || loading}
						title="Refresh"
					>
						↻
					</button>
				</div>
			) : null}

			{!canUseChat ? (
				<div className="errand-chat-muted">Chat is available after login.</div>
			) : (
				<>
					{error && <div className="errand-chat-error">⚠️ {error}</div>}
					{isRoomVariant ? (
						<div className="errand-chat-room-toolbar">
							<div>
								<div className="errand-chat-room-toolbar__title">Operational chat</div>
								<div className="errand-chat-room-toolbar__subtitle">
									Use this thread for client coordination, arrival notices, and pickup/dropoff updates.
								</div>
							</div>
							<div className="errand-chat-room-toolbar__actions">
								<span className="errand-chat-count">{messageCountLabel}</span>
								{effectiveSystemMessages.length > 0 ? (
									<span className="errand-chat-notice-count">
										{effectiveSystemMessages.length} notice{effectiveSystemMessages.length === 1 ? "" : "s"}
									</span>
								) : null}
								<button
									type="button"
									className="errand-chat-refresh"
									onClick={() => fetchMessages({ showLoader: true })}
									disabled={!canUseChat || loading}
									title="Refresh"
								>
									↻
								</button>
							</div>
						</div>
					) : null}
					<div className="errand-chat-list-wrapper">
						<div ref={listRef} className="errand-chat-list" role="log" aria-live="polite">
						{loading && messages.length === 0 ? (
							<div className="errand-chat-muted">Loading messages…</div>
						) : (
							<>
								{effectiveSystemMessages.map((msg) => (
									<div key={`system-${msg}`} className="errand-chat-system-message">
										{msg}
									</div>
								))}
								{messages.length === 0 ? (
									<div className={`errand-chat-empty-state ${isRoomVariant ? "errand-chat-empty-state--room" : ""}`}>
										<div className="errand-chat-empty-state__icon">💬</div>
										<div className="errand-chat-empty-state__title">No messages yet</div>
										<div className="errand-chat-empty-state__copy">
											Share pickup updates, arrival notices, or timing confirmations here.
										</div>
									</div>
								) : (
									messages.map((msg) => (
										<div
											key={msg.id}
											className={`errand-chat-bubble ${msg.mine ? "mine" : "theirs"}`}
										>
											<div className="errand-chat-meta">
												<span className="errand-chat-sender">{msg.sender_name || msg.sender_type}</span>
												<span className="errand-chat-time">{formatTime(msg.created_at)}</span>
											</div>
											<div className="errand-chat-text">{msg.message}</div>
										</div>
									))
								)}
							</>
						)}
						</div>
						{showJumpToLatest ? (
							<button
								type="button"
								className="errand-chat-jump"
								onClick={scrollToBottom}
								title="Jump to latest"
							>
								Jump to latest
							</button>
						) : null}
					</div>

					<div className="errand-chat-composer">
						{chatLocked ? (
							<div className="errand-chat-muted" role="status">
								{disabledMessage}
							</div>
						) : null}
						{effectiveQuickReplies.length > 0 && !(draft || "").trim() ? (
							<div className="errand-chat-quick-replies">
								{effectiveQuickReplies.map((reply) => (
									<button
										key={reply}
										type="button"
										onClick={() => applyQuickReply(reply)}
										disabled={sending || chatLocked}
									>
										{reply}
									</button>
								))}
							</div>
						) : null}
						<div className="errand-chat-composer__row">
							<textarea
								className="errand-chat-composer__input"
								ref={composerRef}
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								rows={1}
								placeholder={placeholder}
								maxLength={Math.max(1, Number(maxMessageChars) || 2000)}
								aria-label="Chat message"
								aria-describedby="errand-chat-composer-hint"
								onKeyDown={(e) => {
									if (!resolvedSendOnEnter) return;
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										void sendMessage();
									}
								}}
								disabled={sending || chatLocked}
							/>
							<button
								type="button"
								onClick={() => sendMessage()}
								disabled={sending || chatLocked || !(draft || "").trim()}
							>
								{sending ? "Sending…" : "Send"}
							</button>
						</div>
						<div className="errand-chat-composer__footer">
							<div className="errand-chat-composer__hint" id="errand-chat-composer-hint">
								{resolvedSendOnEnter ? "Enter to send. Shift + Enter for a new line." : "Tap Send to send. Use Enter for a new line."}
							</div>
							<div className="errand-chat-composer__count" aria-hidden="true">
								{String(draft || "").length}/{Math.max(1, Number(maxMessageChars) || 2000)}
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default ErrandChatPanel;
