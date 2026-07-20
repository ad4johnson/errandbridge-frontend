import { useEffect, useMemo, useState } from "react";

const formatMessageTime = (value) => {
	if (!value) return "";

	const asDate = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(asDate.getTime())) return "";

	return asDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const AssistantPanel = ({
	isMobile,
	messagesRef,
	messages,
	loading,
	needsHandoff,
	error,
	input,
	onInputChange,
	onKeyDown,
	onSend,
	onClose,
	onContactSupport,
	onDragStart,
}) => {
	const isSendDisabled = loading || input.trim().length < 2;
	const [headerCompact, setHeaderCompact] = useState(false);

	useEffect(() => {
		// Compact the header slightly once the user scrolls the conversation.
		// This keeps the panel feeling lighter on small screens.
		const el = messagesRef?.current;
		if (!el) return undefined;

		const onScroll = () => {
			const next = (el.scrollTop || 0) > 12;
			setHeaderCompact((prev) => (prev === next ? prev : next));
		};

		onScroll();
		el.addEventListener("scroll", onScroll, { passive: true });
		return () => el.removeEventListener("scroll", onScroll);
	}, [messagesRef]);

	const panelWidth = isMobile ? 360 : 400;
	const panelHeight = isMobile ? 640 : 720;
	const headerPaddingY = headerCompact ? 10 : 16;
	const headerPaddingX = isMobile ? 14 : 16;
	const avatarSize = headerCompact ? 36 : 42;

	const quickActions = useMemo(
		() => [
			{
				id: "send",
				label: "Send Errand",
				message: "Help me create a new errand",
			},
			{
				id: "track",
				label: "Track Errand",
				message: "Help me track my errand",
			},
			{
				id: "pricing",
				label: "Pricing",
				message: "Explain pricing for my errand",
			},
			{
				id: "proof",
				label: "Proof & Docs",
				message: "What proof or documents are required?",
			},
			{
				id: "support",
				label: "Support",
				message: "I need support with an existing errand",
			},
		],
		[],
	);

	const suggestedPrompts = useMemo(
		() => [
			{
				id: "prompt-send",
				label: "Send an errand",
				message: "Help me create a new errand",
			},
			{
				id: "prompt-price",
				label: "Check pricing",
				message: "Explain pricing for my errand",
			},
			{
				id: "prompt-track",
				label: "Track order",
				message: "Help me track my errand",
			},
			{
				id: "prompt-about",
				label: "About ErrandBridge",
				message: "Tell me about ErrandBridge",
			},
			{
				id: "prompt-coverage",
				label: "Coverage areas",
				message: "Where do you operate?",
			},
		],
		[],
	);

	const pushQuickMessage = (text) => {
		if (!text) return;
		onInputChange(text);
		requestAnimationFrame(() => onSend());
	};

	const hasOnlyWelcome =
		messages?.length === 1 && messages?.[0]?.role === "assistant";

	return (
		<div
			style={{
				width: panelWidth,
				maxWidth: "calc(100vw - 24px)",
				height: panelHeight,
				maxHeight: isMobile ? "calc(100vh - 120px)" : "calc(100vh - 32px)",
				borderRadius: 28,
				overflow: "hidden",
				background: "#fff",
				border: "1px solid #e5e7eb",
				boxShadow: "0 30px 80px rgba(15, 23, 42, 0.22)",
				display: "flex",
				flexDirection: "column",
			}}
			role="dialog"
			aria-label="ErrandBridge assistant"
		>
			{/* Header */}
			<div
				onPointerDown={onDragStart}
				style={{
					padding: `${headerPaddingY}px ${headerPaddingX}px`,
					background: "linear-gradient(180deg, #1d4ed8, #2563eb)",
					color: "#fff",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					cursor: onDragStart ? "grab" : "default",
					touchAction: onDragStart ? "none" : "auto",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					<div
						aria-hidden="true"
						style={{
							width: avatarSize,
							height: avatarSize,
							borderRadius: 999,
							background: "rgba(255, 255, 255, 0.18)",
							display: "grid",
							placeItems: "center",
							boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
						}}
					>
						<span style={{ fontSize: 18 }}>👩🏽‍💼</span>
					</div>
					<div>
						<div
							style={{
								fontWeight: 800,
								fontSize: headerCompact ? 15 : 16,
								lineHeight: 1.1,
							}}
						>
							Toxi
						</div>
						{!headerCompact && (
							<div
								style={{
									fontSize: 12,
									display: "flex",
									alignItems: "center",
									gap: 8,
									opacity: 0.95,
									marginTop: 3,
								}}
							>
								<span
									style={{
										width: 8,
										height: 8,
										borderRadius: "50%",
										background: "#22c55e",
										display: "inline-block",
									}}
								/>
								Online - ready to help
							</div>
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					style={{
						width: 36,
						height: 36,
						borderRadius: 999,
						border: "none",
						background: "rgba(255, 255, 255, 0.18)",
						color: "#fff",
						fontSize: 18,
						cursor: "pointer",
					}}
					aria-label="Close assistant"
				>
					✕
				</button>
			</div>

			{/* Quick actions */}
			<div
				style={{
					padding: "12px 14px",
					background: "#fff",
					borderBottom: "1px solid #edf2f7",
				}}
			>
				<div
					style={{
						display: "flex",
						flexWrap: isMobile ? "nowrap" : "wrap",
						gap: 8,
						overflowX: isMobile ? "auto" : "visible",
						WebkitOverflowScrolling: isMobile ? "touch" : undefined,
						paddingBottom: isMobile ? 4 : 0,
					}}
				>
					{quickActions.map((action) => (
						<button
							key={action.id}
							type="button"
							onClick={() => pushQuickMessage(action.message)}
							disabled={loading}
							style={{
								borderRadius: 999,
								border: "1px solid #e2e8f0",
								padding: "8px 12px",
								background: "#f8fafc",
								fontSize: 12,
								fontWeight: 700,
								color: "#0f172a",
								cursor: loading ? "not-allowed" : "pointer",
								whiteSpace: "nowrap",
								flex: isMobile ? "0 0 auto" : undefined,
							}}
						>
							{action.label}
						</button>
					))}
				</div>
			</div>

			{/* Messages */}
			<div
				ref={messagesRef}
				style={{
					flex: 1,
					overflowY: "auto",
					padding: 14,
					background: "#f8fafc",
					display: "flex",
					flexDirection: "column",
					gap: 12,
				}}
			>
				{messages.map((message) => {
					const isUser = message.role === "user";
					const timestampLabel = formatMessageTime(
						message.timestamp || message.createdAt || message.time,
					);
					return (
						<div
							key={message.id}
							style={{
								display: "flex",
								justifyContent: isUser ? "flex-end" : "flex-start",
							}}
						>
							<div
								style={{
									maxWidth: "84%",
									padding: "10px 12px",
									borderRadius: 18,
									fontSize: 13,
									lineHeight: 1.45,
									background: isUser ? "#2563eb" : "#ffffff",
									color: isUser ? "#ffffff" : "#0f172a",
									border: isUser ? "1px solid #1d4ed8" : "1px solid #e5e7eb",
									boxShadow: isUser
										? "none"
										: "0 10px 24px rgba(15, 23, 42, 0.08)",
									whiteSpace: "pre-wrap",
								}}
							>
								{message.text}
								{timestampLabel && (
									<div
										style={{
											marginTop: 6,
											fontSize: 11,
											lineHeight: 1,
											opacity: 0.82,
											color: isUser ? "rgba(255,255,255,0.92)" : "#64748b",
											textAlign: "right",
										}}
									>
										{timestampLabel}
									</div>
								)}
							</div>
						</div>
					);
				})}

				{hasOnlyWelcome && (
					<div
						style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: -2 }}
					>
						{suggestedPrompts.map((prompt) => (
							<button
								key={prompt.id}
								type="button"
								onClick={() => pushQuickMessage(prompt.message)}
								disabled={loading}
								style={{
									borderRadius: 999,
									border: "1px solid #dbeafe",
									padding: "7px 10px",
									background: "#eff6ff",
									fontSize: 12,
									fontWeight: 700,
									color: "#1d4ed8",
									cursor: loading ? "not-allowed" : "pointer",
								}}
							>
								{prompt.label}
							</button>
						))}
					</div>
				)}

				{loading && (
					<div style={{ display: "flex", justifyContent: "flex-start" }}>
						<div
							style={{
								padding: "8px 10px",
								borderRadius: 14,
								fontSize: 12,
								background: "#e2e8f0",
								color: "#334155",
							}}
						>
							Typing…
						</div>
					</div>
				)}
			</div>

			{needsHandoff && (
				<div
					style={{
						padding: 12,
						background: "#fffbeb",
						borderTop: "1px solid #fde68a",
						fontSize: 12,
						color: "#92400e",
					}}
				>
					Want a human agent? We’ve alerted the team. You can also{" "}
					<button
						type="button"
						onClick={onContactSupport}
						style={{
							background: "none",
							border: "none",
							color: "#1d4ed8",
							fontWeight: 800,
							cursor: "pointer",
							padding: 0,
						}}
					>
						contact support
					</button>
					.
				</div>
			)}

			{error && (
				<div
					style={{
						padding: 12,
						background: "#fee2e2",
						borderTop: "1px solid #fecaca",
						fontSize: 12,
						color: "#991b1b",
					}}
				>
					{error}
				</div>
			)}

			{/* Input */}
			<div
				style={{
					padding: 12,
					borderTop: "1px solid #e5e7eb",
					background: "#fff",
				}}
			>
				<div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
					<textarea
						value={input}
						onChange={(event) => onInputChange(event.target.value)}
						onKeyDown={onKeyDown}
						placeholder="Ask about errands, pricing, tracking, or support…"
						rows={2}
						disabled={loading}
						style={{
							flex: 1,
							resize: "none",
							borderRadius: 999,
							border: "1px solid #e2e8f0",
							padding: "10px 12px",
							fontSize: 13,
							outline: "none",
						}}
					/>
					<button
						type="button"
						onClick={onSend}
						disabled={isSendDisabled}
						style={{
							width: 44,
							height: 44,
							borderRadius: 999,
							border: "none",
							background: isSendDisabled ? "#bfdbfe" : "#2563eb",
							color: "#fff",
							fontWeight: 900,
							cursor: isSendDisabled ? "not-allowed" : "pointer",
							boxShadow: isSendDisabled
								? "none"
								: "0 12px 28px rgba(37, 99, 235, 0.35)",
							display: "grid",
							placeItems: "center",
						}}
						aria-label="Send message"
					>
						➤
					</button>
				</div>
				<div
					style={{
						marginTop: 10,
						fontSize: 11,
						color: "#64748b",
						textAlign: "center",
					}}
				>
					Powered by ErrandBridge AI
				</div>
			</div>
		</div>
	);
};

export default AssistantPanel;
