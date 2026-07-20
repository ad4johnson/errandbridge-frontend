import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowUp,
	MessageCircle,
	Mic,
	MicOff,
	Sparkles,
	Volume2,
	VolumeX,
	X,
} from "lucide-react";

import ModalPortal from "../ModalPortal";
import { useUISurfaces } from "../../store/ui-surfaces";
import { acquireBodyScrollLock } from "../../utils/scrollLock";
import {
	readVoiceRepliesPreference,
	writeVoiceRepliesPreference,
} from "../../lib/toxi/assistantConfig";
import {
	cancelSpeech,
	canUseSpeechRecognition,
	canUseSpeechSynthesis,
	createSpeechRecognition,
	speakText,
} from "../../lib/toxi/speech";

import ToxiMessageBubble from "./ToxiMessageBubble";
import ToxiQuickActions from "./ToxiQuickActions";

function ConciergeAvatarGlyph({ className = "" }) {
	return (
		<svg
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<path
				d="M32 7C22.6 7 15 14.8 15 24.4c0 5.6 2.5 10.5 6.7 13.8 1.8-3.9 5.7-6.8 10.3-6.8 4.7 0 8.6 2.9 10.4 6.8 4.1-3.3 6.6-8.2 6.6-13.8C49 14.8 41.4 7 32 7Z"
				fill="currentColor"
				opacity="0.94"
			/>
			<path
				d="M32 35.5c-11.7 0-21.4 8.5-23.3 19.7-.2 1.2.8 2.3 2.1 2.3h42.4c1.3 0 2.3-1.1 2.1-2.3C53.4 44 43.7 35.5 32 35.5Z"
				fill="currentColor"
			/>
		</svg>
	);
}

function ProfessionalAssistantAvatar({ active = false, compact = false, boosted = false }) {
	const shellSize = compact ? "h-[76%] w-[76%]" : "h-[82%] w-[82%]";
	return (
		<div
			className={`relative ${shellSize}`}
			data-testid="toxi-assistant-portrait"
			aria-hidden="true"
		>
			<motion.div
				animate={{
					scale: boosted ? [1, 1.08, 1] : active ? [1, 1.05, 1] : [1, 1.025, 1],
					opacity: boosted ? [0.34, 0.62, 0.34] : active ? [0.22, 0.44, 0.22] : [0.12, 0.24, 0.12],
				}}
				transition={{ duration: boosted ? 1.35 : active ? 1.8 : 2.9, repeat: Infinity, ease: "easeInOut" }}
				className="absolute inset-[-12%] rounded-[32px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.46)_0%,rgba(99,102,241,0.18)_44%,rgba(99,102,241,0)_76%)] blur-lg"
			/>
			{active || boosted ? (
				<motion.div
					animate={{ opacity: boosted ? [0.18, 0.32, 0.18] : [0.1, 0.18, 0.1] }}
					transition={{ duration: boosted ? 1.05 : 1.55, repeat: Infinity, ease: "easeInOut" }}
					className="absolute inset-[2%] rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0.03)_34%,rgba(255,255,255,0)_70%)] blur-[2px]"
				/>
			) : null}
			<div className="absolute inset-0 rounded-[30px] border border-white/30 bg-[linear-gradient(145deg,rgba(244,247,255,0.96)_0%,rgba(197,208,229,0.92)_100%)] p-[4.5%] shadow-[0_16px_38px_rgba(10,10,30,0.26)]">
				<div className="relative h-full w-full overflow-hidden rounded-[26px] border border-white/18 bg-[linear-gradient(160deg,#050f2d_0%,#172b66_40%,#5c48ff_100%)]">
					<div className="absolute inset-[6%] rounded-[21px] border border-white/12" />
					<div className="absolute inset-x-[16%] top-[6%] h-[30%] rounded-b-[28px] rounded-t-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_100%)]" />
					<div className="absolute inset-x-[-6%] bottom-[-8%] h-[54%] rounded-[38px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_72%)]" />
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="relative mt-[8%] h-[72%] w-[70%]">
							<div className="absolute left-1/2 top-[2%] h-[34%] w-[66%] -translate-x-1/2 rounded-t-[30px] rounded-b-[24px] bg-[linear-gradient(180deg,#050914_0%,#0c1733_46%,rgba(12,23,51,0)_100%)]" />
							<div className="absolute left-[14%] top-[14%] h-[34%] w-[22%] rounded-[20px] bg-[linear-gradient(180deg,#0d1835_0%,#121f42_100%)]" />
							<div className="absolute right-[14%] top-[14%] h-[34%] w-[22%] rounded-[20px] bg-[linear-gradient(180deg,#0d1835_0%,#121f42_100%)]" />
							<div className="absolute left-1/2 top-[16%] h-[30%] w-[44%] -translate-x-1/2 rounded-[18px] bg-[linear-gradient(180deg,#f4d9c2_0%,#dfb796_55%,#cb916c_100%)] shadow-[0_5px_12px_rgba(54,26,15,0.18)]" />
							<div className="absolute left-1/2 top-[29%] h-[5%] w-[22%] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(173,118,93,0.7)_0%,rgba(173,118,93,0)_100%)]" />
							<div className="absolute left-1/2 top-[43%] h-[12%] w-[10%] -translate-x-1/2 rounded-b-[10px] bg-[linear-gradient(180deg,#d8a17d_0%,#c18462_100%)]" />
							<div className="absolute left-1/2 top-[49%] h-[16%] w-[32%] -translate-x-1/2 rounded-t-[18px] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7ff_100%)]" />
							<div className="absolute bottom-[6%] left-1/2 h-[34%] w-[74%] -translate-x-1/2 rounded-t-[26px] bg-[linear-gradient(180deg,#071432_0%,#0d1f4d_60%,#15295f_100%)]" />
							<div className="absolute bottom-[16%] left-[8%] h-[22%] w-[24%] rounded-[18px] bg-[linear-gradient(180deg,#0a1738_0%,#0f2455_100%)]" />
							<div className="absolute bottom-[16%] right-[8%] h-[22%] w-[24%] rounded-[18px] bg-[linear-gradient(180deg,#0a1738_0%,#0f2455_100%)]" />
							<div className="absolute bottom-[30%] left-1/2 h-[4%] w-[18%] -translate-x-1/2 rounded-full bg-white/70" />
							<div className="absolute inset-x-[24%] top-[10%] h-[24%] rounded-b-[20px] rounded-t-[18px] bg-[linear-gradient(180deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_100%)]" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function getAssistantTeaserText(surface, assistantName, launcherSubtitle) {
	const safeName = assistantName || "Toxi";
	switch (String(surface || "landing_page")) {
		case "landing_page":
			return `Hi, I’m ${safeName} - need help with an errand request, update, proof, or support?`;
		case "tracking_page":
			return "Need help understanding live tracking updates?";
		case "client_dashboard":
			return "Need help with an errand, update, proof, or support?";
		default:
			return launcherSubtitle || `Hi, I’m ${safeName}. Need a hand?`;
	}
}

function safeSessionGet(key) {
	if (typeof window === "undefined") return null;
	try {
		return window.sessionStorage?.getItem(key) ?? null;
	} catch {
		return null;
	}
}

function safeSessionSet(key, value) {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage?.setItem(key, value);
	} catch {
		// ignore
	}
}


function useTypingTeaser(
	text,
	enabled,
	{ startDelay = 120, charDelay = 26, loop = false, holdDelay = 1800, restartDelay = 420 } = {},
) {
	const [displayedText, setDisplayedText] = useState(enabled ? "" : String(text || ""));
	const [typingComplete, setTypingComplete] = useState(!enabled);

	useEffect(() => {
		const fullText = String(text || "");
		if (!enabled) {
			setDisplayedText(fullText);
			setTypingComplete(true);
			return undefined;
		}

		setDisplayedText("");
		setTypingComplete(false);

		if (!fullText) {
			setTypingComplete(true);
			return undefined;
		}

		let cancelled = false;
		let timeoutId = 0;

		const runCycle = (delayMs = startDelay) => {
			setDisplayedText("");
			setTypingComplete(false);
			let charIndex = 0;

			const tick = () => {
				if (cancelled) return;
				charIndex += 1;
				setDisplayedText(fullText.slice(0, charIndex));
				if (charIndex >= fullText.length) {
					setTypingComplete(true);
					if (!loop) return;
					timeoutId = window.setTimeout(() => {
						if (cancelled) return;
						setDisplayedText("");
						setTypingComplete(false);
						runCycle(restartDelay);
					}, holdDelay);
					return;
				}
				timeoutId = window.setTimeout(tick, charDelay);
			};

			timeoutId = window.setTimeout(tick, delayMs);
		};

		runCycle();

		return () => {
			cancelled = true;
			window.clearTimeout(timeoutId);
		};
	}, [charDelay, enabled, holdDelay, loop, restartDelay, startDelay, text]);

	return { displayedText, typingComplete };
}

function useHalfPageScrollTrigger(enabled) {
	const [show, setShow] = useState(false);

	useEffect(() => {
		if (!enabled || typeof window === "undefined") {
			setShow(false);
			return undefined;
		}

		const onScroll = () => {
			const scrollY = window.scrollY;
			const doc = document.documentElement;
			const fullHeight = Math.max(doc.scrollHeight, doc.clientHeight);
			const viewport = window.innerHeight;
			const scrollable = Math.max(fullHeight - viewport, 0);
			const revealThreshold = Math.min(Math.max(scrollable * 0.4, 420), 520);
			setShow(scrollable > 0 && scrollY > revealThreshold);
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		};
	}, [enabled]);

	return show;
}

function TypingSignal() {
	return (
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 shadow-sm">
				{[0, 1, 2].map((index) => (
					<motion.span
						key={index}
						className="h-2 w-2 rounded-full bg-slate-500"
						animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
						transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.15, ease: "easeInOut" }}
					/>
				))}
			</div>
			<div className="flex items-end gap-1">
				{[8, 14, 10, 16].map((height, index) => (
					<motion.span
						key={`${height}-${index}`}
						className="w-1.5 rounded-full bg-indigo-500/80"
						style={{ height }}
						animate={{ scaleY: [0.5, 1, 0.55] }}
						transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.1, ease: "easeInOut" }}
					/>
				))}
			</div>
		</div>
	);
}

function AnimatedQuickActions({ children }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: 8, scale: 0.98 }}
			transition={{ duration: 0.24, ease: "easeOut" }}
		>
			{children}
		</motion.div>
	);
}

function renderAvatarContent(
	avatar,
	{ assistantMode = false, active = false, boosted = false } = {},
) {
	if (typeof avatar?.render === "function") {
		return avatar.render();
	}

	if (assistantMode || avatar?.glyph === "assistant_professional") {
		return <ProfessionalAssistantAvatar active={active || boosted} compact boosted={boosted} />;
	}

	if (avatar?.glyph === "concierge") {
		return <ConciergeAvatarGlyph className="h-[66%] w-[66%] text-white" />;
	}

	return avatar?.label || "T";
}

const DEFAULT_AVATAR = {
	label: "T",
	bgClassName:
		"bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_rgba(15,23,42,1)_55%)]",
	glyph: "concierge",
};

export default function ToxiChatPanel({
	open,
	disabled,
	hideLauncher = false,
	anchorBottomPx = 16,
	anchorRightPx,
	anchorIncludeSafeAreaBottom = true,
	layout = "default",
	panelMode = "default",
	launcherActive = false,

	title = "Toxi",
	subtitle = "",
	eyebrowLabel,
	avatar = DEFAULT_AVATAR,

	launcherTitle = "Toxi",
	launcherSubtitle = "Open concierge",
	launcherAriaLabel = "Open Toxi",

	onOpen,
	onClose,

	summarySlot = null,

	messages = [],

	quickActions,
	onQuickAction,
	quickActionsDisabled,
	quickActionsLabel = "Quick starters",

	input,
	inputPlaceholder = "Type…",
	onInputChange,
	onKeyDown,
	onSend,
	sending,

	error,

	ctaLabel,
	ctaDisabled,
	onCta,
	secondaryCtaLabel,
	secondaryCtaDisabled,
	onSecondaryCta,
	ctaHint,
	assistantConfig,
	onResetConversation,
	showTypingIndicator = false,
	assistantBusy = false,
	pauseTeaser = false,
}) {
	const messagesEndRef = useRef(null);
	const messageScrollerRef = useRef(null);
	const inputRef = useRef(null);
	const recognitionRef = useRef(null);
	const initialOpenHandledRef = useRef(false);
	const lastSpokenMessageIdRef = useRef(null);
	const simpleLayout = layout === "simple";
	const requestBuilderShell = panelMode === "request_builder";
	const compactRequestBuilder = requestBuilderShell;
	const assistantMode = Boolean(assistantConfig?.assistantMode);
	const stageTeaserMode = assistantConfig?.teaserMode === "stage";
	const teaserEnabled = Boolean(assistantConfig?.showTeaser);
	const [isMobileViewport, setIsMobileViewport] = useState(() =>
		typeof window !== "undefined" ? window.innerWidth < 960 : true,
	);
	const cookieBannerOpen = useUISurfaces((s) => s.cookieBannerOpen);
	const mobileRequestBuilder = requestBuilderShell && isMobileViewport;
	const suppressLauncherForCookieConsent = Boolean(
		cookieBannerOpen && isMobileViewport && !open,
	);
	const effectiveHideLauncher = Boolean(
		hideLauncher || suppressLauncherForCookieConsent,
	);
	const effectivePauseTeaser = Boolean(
		pauseTeaser || suppressLauncherForCookieConsent,
	);
	const assistantName = useMemo(() => {
		const configuredName = String(assistantConfig?.assistantName || "").trim();
		if (configuredName) return configuredName;
		if (assistantMode) return "Toxi";
		return String(title || launcherTitle || "Toxi").split(" ")[0] || "Toxi";
	}, [assistantConfig?.assistantName, assistantMode, launcherTitle, title]);
	const resolvedTitle = assistantMode ? assistantName : title;
	const resolvedLauncherTitle = assistantMode ? assistantName : launcherTitle;
	const resolvedLauncherAriaLabel = assistantMode
		? `Open ${assistantName}`
		: launcherAriaLabel;
	const hasInput = Boolean(String(input || "").trim());
	const sendVisible = hasInput;
	const ctaVisible = Boolean(ctaLabel);
	const secondaryCtaVisible = Boolean(secondaryCtaLabel);
	const assistantVisualBusy = assistantMode && Boolean(assistantBusy || showTypingIndicator || sending);
	const canToggleVoiceReplies =
		assistantMode &&
		Boolean(assistantConfig?.allowSpeechOutput) &&
		canUseSpeechSynthesis();
	const canUseVoiceInput =
		assistantMode &&
		Boolean(assistantConfig?.allowSpeechInput) &&
		canUseSpeechRecognition();
	const [showTeaser, setShowTeaser] = useState(() =>
		stageTeaserMode ? false : Boolean(assistantConfig?.showTeaser),
	);
	const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(() =>
		assistantMode
			? readVoiceRepliesPreference(Boolean(assistantConfig?.voiceRepliesEnabled))
			: false,
	);
	const [voiceListening, setVoiceListening] = useState(false);
	const [voiceTranscript, setVoiceTranscript] = useState("");
	const normalizedQuickActions = Array.isArray(quickActions)
		? quickActions.filter(Boolean)
		: [];
	const showBackToTop = useHalfPageScrollTrigger(
		assistantMode && Boolean(assistantConfig?.showBackToTop),
	);
	const resolvedAnchorRightPx = Number.isFinite(Number(anchorRightPx))
		? Number(anchorRightPx)
		: assistantMode && isMobileViewport
			? 12
			: 16;
	const assistantFloatingRightPx = resolvedAnchorRightPx;
	const assistantBackToTopRightPx = resolvedAnchorRightPx;
	const assistantTeaserRightPx = resolvedAnchorRightPx;
	const resolveFloatingBottomCss = useCallback(
		(bottomPx) =>
			anchorIncludeSafeAreaBottom
				? `calc(${Math.max(0, Number(bottomPx) || 0)}px + env(safe-area-inset-bottom))`
				: `${Math.max(0, Number(bottomPx) || 0)}px`,
		[anchorIncludeSafeAreaBottom],
	);
	const assistantBackToTopBottomPx = anchorBottomPx + (assistantMode && isMobileViewport ? 82 : 88);
	const assistantTeaserBottomPx = anchorBottomPx + (assistantMode && isMobileViewport ? 90 : 98);
	const defaultNonAssistantTeaserRightPx = resolvedAnchorRightPx;
	const defaultNonAssistantTeaserBottomPx = anchorBottomPx + (isMobileViewport ? 86 : 92);
	const teaserRightPx =
		stageTeaserMode && Number.isFinite(Number(assistantConfig?.teaserRightPx))
			? Number(assistantConfig?.teaserRightPx)
			: assistantMode
				? assistantTeaserRightPx
				: defaultNonAssistantTeaserRightPx;
	const teaserBottomPx =
		stageTeaserMode && Number.isFinite(Number(assistantConfig?.teaserBottomPx))
			? Number(assistantConfig?.teaserBottomPx)
			: assistantMode
				? assistantTeaserBottomPx
				: defaultNonAssistantTeaserBottomPx;
	const launcherAssistActive = Boolean(launcherActive) && !open && !disabled;
	const showBackdrop = !requestBuilderShell || isMobileViewport;
	const activateTeaser = useCallback(() => {
		setShowTeaser(false);
		if (stageTeaserMode) {
			onOpen?.();
		}
	}, [onOpen, stageTeaserMode]);
	const panelStyle = useMemo(() => {
		if (!requestBuilderShell) {
			return {
				bottom: resolveFloatingBottomCss(anchorBottomPx),
				height: "min(82dvh, 860px)",
				maxHeight: "min(82dvh, 860px)",
			};
		}

		if (isMobileViewport) {
			return {
				left: "max(0px, env(safe-area-inset-left))",
				right: "max(0px, env(safe-area-inset-right))",
				bottom: 0,
				height: "min(78dvh, 820px)",
				maxHeight: "min(78dvh, 820px)",
				width: "100vw",
				borderRadius: "24px 24px 0 0",
			};
		}

		return {
			top: 12,
			right: 12,
			bottom: 12,
			left: "auto",
			width: "min(380px, 30vw)",
			height: "calc(100dvh - 24px)",
			maxHeight: "calc(100dvh - 24px)",
			borderRadius: 26,
		};
	}, [anchorBottomPx, isMobileViewport, requestBuilderShell, resolveFloatingBottomCss]);
	const teaserText = useMemo(() => {
		const override = String(assistantConfig?.teaserText || "").trim();
		if (override) return override;
		return getAssistantTeaserText(
			assistantConfig?.surface,
			assistantName,
			launcherSubtitle,
		);
	}, [assistantConfig?.surface, assistantConfig?.teaserText, assistantName, launcherSubtitle]);
	const teaserTyping =
		typeof assistantConfig?.teaserTyping === "boolean"
			? Boolean(assistantConfig.teaserTyping)
			: assistantMode;
	const { displayedText: teaserDisplayText, typingComplete: teaserTypingComplete } =
		useTypingTeaser(
			teaserText,
			teaserTyping &&
				teaserEnabled &&
				showTeaser &&
				!open &&
				!effectivePauseTeaser &&
				!disabled,
			{ loop: false, holdDelay: 1400, restartDelay: 380 },
		);

	const normalizedMessages = useMemo(() => {
		if (!Array.isArray(messages)) return [];
		return messages
			.map((m, idx) => {
				const role = m?.role === "user" ? "user" : "assistant";
				const text = String(m?.text || "");
				const content = m?.content || null;
				if (!text.trim() && !content) return null;
				return {
					id: m?.id || `${role}-${idx}`,
					role,
					text,
					content,
					variant: m?.variant || null,
				};
			})
			.filter(Boolean);
	}, [messages]);
	const latestAssistantMessage = useMemo(() => {
		for (let index = normalizedMessages.length - 1; index >= 0; index -= 1) {
			const message = normalizedMessages[index];
			if (message?.role === "assistant" && String(message?.text || "").trim()) {
				return message;
			}
		}
		return null;
	}, [normalizedMessages]);
	const hasPriorUserMessage = useMemo(
		() => normalizedMessages.some((message) => message?.role === "user"),
		[normalizedMessages],
	);

	const handleToggleVoiceReplies = useCallback(() => {
		setVoiceRepliesEnabled((previous) => {
			const next = !previous;
			writeVoiceRepliesPreference(next);
			if (!next) cancelSpeech();
			return next;
		});
	}, []);

	const handleBackToTop = useCallback(() => {
		if (typeof window === "undefined") return;
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	const handleVoiceButton = useCallback(() => {
		if (!canUseVoiceInput || !recognitionRef.current) return;
		if (voiceListening) {
			try {
				recognitionRef.current.stop();
			} catch {
				// ignore
			}
			return;
		}

		setVoiceTranscript("");
		try {
			recognitionRef.current.start();
		} catch {
			// Some browsers throw if start is called twice.
		}
	}, [canUseVoiceInput, voiceListening]);

	useEffect(() => {
		if (!open) {
			initialOpenHandledRef.current = false;
			return undefined;
		}

		let timeoutId = 0;
		const frameId = window.requestAnimationFrame(() => {
			const prefersCoarsePointer =
				typeof window !== "undefined" && typeof window.matchMedia === "function"
					? window.matchMedia("(pointer: coarse)").matches
					: window.innerWidth < 768;

			try {
				messagesEndRef.current?.scrollIntoView?.({
					behavior: "auto",
					block: "end",
				});
			} catch {
				// ignore
			}

			if (!prefersCoarsePointer) {
				timeoutId = window.setTimeout(() => {
					try {
						inputRef.current?.focus?.({ preventScroll: true });
					} catch {
						try {
							inputRef.current?.focus?.();
						} catch {
							// ignore
						}
					}
				}, 80);
			}

			initialOpenHandledRef.current = true;
		});

		return () => {
			window.cancelAnimationFrame(frameId);
			window.clearTimeout(timeoutId);
		};
	}, [open]);

	useEffect(() => {
		if (!open) return;
		if (!initialOpenHandledRef.current) return;
		const id = window.requestAnimationFrame(() => {
			try {
				messagesEndRef.current?.scrollIntoView?.({
					behavior: normalizedMessages.length <= 1 ? "auto" : "smooth",
					block: "end",
				});
			} catch {
				// ignore
			}
		});
		return () => window.cancelAnimationFrame(id);
	}, [normalizedMessages.length, open]);

	useEffect(() => {
		if (!requestBuilderShell || typeof window === "undefined") return undefined;
		const handleResize = () => setIsMobileViewport(window.innerWidth < 960);
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [requestBuilderShell]);

	useEffect(() => {
		if (!open) return undefined;
		let releaseLock = null;
		const timeoutId = window.setTimeout(() => {
			if (!requestBuilderShell || isMobileViewport) {
				releaseLock = acquireBodyScrollLock();
			}
		}, 40);

		return () => {
			window.clearTimeout(timeoutId);
			releaseLock?.();
		};
	}, [isMobileViewport, open, requestBuilderShell]);

	useEffect(() => {
		if (!open) return undefined;
		if (typeof window === "undefined") return undefined;

		const handleKeyDown = (event) => {
			if (event.key !== "Escape") return;
			onClose?.();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose, open]);

	useEffect(() => {
		if (!assistantMode) {
			setVoiceRepliesEnabled(false);
			return;
		}
		setVoiceRepliesEnabled(
			readVoiceRepliesPreference(Boolean(assistantConfig?.voiceRepliesEnabled)),
		);
	}, [assistantConfig?.voiceRepliesEnabled, assistantMode]);

	useEffect(() => {
		if (!canUseVoiceInput) {
			setVoiceListening(false);
			setVoiceTranscript("");
			recognitionRef.current = null;
			return undefined;
		}

		const recognition = createSpeechRecognition({
			lang: "en-GB",
			continuous: false,
			interimResults: true,
		});
		if (!recognition) return undefined;

		recognition.onstart = () => setVoiceListening(true);
		recognition.onend = () => setVoiceListening(false);
		recognition.onerror = () => setVoiceListening(false);
		recognition.onresult = (event) => {
			let next = "";
			for (let index = event.resultIndex; index < event.results.length; index += 1) {
				next += event.results[index][0].transcript;
			}
			setVoiceTranscript(String(next || "").trim());
		};

		recognitionRef.current = recognition;

		return () => {
			try {
				recognition.stop();
			} catch {
				// ignore
			}
			recognitionRef.current = null;
		};
	}, [canUseVoiceInput]);

	useEffect(() => {
		if (!canUseVoiceInput) return;
		onInputChange?.(voiceTranscript || "");
	}, [canUseVoiceInput, onInputChange, voiceTranscript]);

	useEffect(() => {
		if (!canUseVoiceInput || voiceListening) return undefined;
		const trimmed = String(voiceTranscript || "").trim();
		if (!trimmed || !open) return undefined;
		const timeoutId = window.setTimeout(() => {
			onSend?.(trimmed);
			setVoiceTranscript("");
			onInputChange?.("");
		}, 220);
		return () => window.clearTimeout(timeoutId);
	}, [canUseVoiceInput, onInputChange, onSend, open, voiceListening, voiceTranscript]);

	useEffect(() => {
		// Always reset teaser visibility on page changes.
		setShowTeaser(false);
		return undefined;
	}, [assistantConfig?.pageKey]);

	useEffect(() => {
		if (!assistantMode) return undefined;
		const resetTransient = () => {
			setShowTeaser(false);
				setVoiceListening(false);
				setVoiceTranscript("");
			cancelSpeech();
		};
		window.addEventListener("beforeunload", resetTransient);
		return () => window.removeEventListener("beforeunload", resetTransient);
	}, [assistantMode]);

	useEffect(() => {
		if (!assistantMode) return undefined;
		if (open || !assistantConfig?.showTeaser || effectivePauseTeaser || disabled) {
			setShowTeaser(false);
			return undefined;
		}
		setShowTeaser(true);
		const interval = window.setInterval(() => {
			setShowTeaser(true);
			window.setTimeout(() => setShowTeaser(false), 5200);
		}, 16000);
		const initialTimeout = window.setTimeout(() => setShowTeaser(false), 5200);
		return () => {
			window.clearInterval(interval);
			window.clearTimeout(initialTimeout);
		};
	}, [assistantConfig?.showTeaser, assistantMode, disabled, effectivePauseTeaser, open]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (!stageTeaserMode) return undefined;
		if (!teaserEnabled) {
			setShowTeaser(false);
			return undefined;
		}
		if (open || effectivePauseTeaser || disabled) {
			setShowTeaser(false);
			return undefined;
		}

		const key = String(assistantConfig?.teaserKey || "").trim();
		if (!key) return undefined;
		const oncePerSession = assistantConfig?.teaserOncePerSession !== false;
		const namespace = String(assistantConfig?.storageNamespace || "toxi_");
		const pageKey = String(assistantConfig?.pageKey || "");
		const seenKey = `${namespace}teaser_seen_${pageKey}_${key}`;

		if (oncePerSession && safeSessionGet(seenKey) === "1") {
			return undefined;
		}

		setShowTeaser(true);
		if (oncePerSession) safeSessionSet(seenKey, "1");
		const holdMs = Math.max(800, Number(assistantConfig?.teaserHoldMs) || 5200);
		const timeoutId = window.setTimeout(() => setShowTeaser(false), holdMs);
		return () => window.clearTimeout(timeoutId);
	}, [
		assistantConfig?.pageKey,
		assistantConfig?.storageNamespace,
		assistantConfig?.teaserHoldMs,
		assistantConfig?.teaserKey,
		assistantConfig?.teaserOncePerSession,
		disabled,
		open,
		effectivePauseTeaser,
		stageTeaserMode,
		teaserEnabled,
	]);

	useEffect(() => {
		if (!assistantMode) return undefined;
		if (!canToggleVoiceReplies || !voiceRepliesEnabled) return undefined;
		if (!open || sending) return undefined;
		if (!latestAssistantMessage?.id || !hasPriorUserMessage) return undefined;
		if (lastSpokenMessageIdRef.current === latestAssistantMessage.id) return undefined;
		lastSpokenMessageIdRef.current = latestAssistantMessage.id;
		speakText(latestAssistantMessage.text);
		return () => {
			// Let the current utterance complete unless explicitly cancelled elsewhere.
		};
	}, [
		assistantMode,
		canToggleVoiceReplies,
		hasPriorUserMessage,
		latestAssistantMessage,
		open,
		sending,
		voiceRepliesEnabled,
	]);

	return (
		<ModalPortal>
			<>
			<AnimatePresence>
				{showBackToTop && !disabled ? (
					<motion.button
						initial={{ opacity: 0, y: 18, scale: 0.94 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 16, scale: 0.94 }}
						transition={{ duration: 0.2 }}
						onClick={handleBackToTop}
						className="fixed z-[1498] flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/90 shadow-xl backdrop-blur transition hover:scale-[1.04]"
						style={{
							bottom: resolveFloatingBottomCss(assistantBackToTopBottomPx),
							right: `calc(${assistantBackToTopRightPx}px + env(safe-area-inset-right))`,
						}}
						aria-label="Back to top"
					>
						<ArrowUp className="h-5 w-5 text-slate-700" />
					</motion.button>
				) : null}
			</AnimatePresence>

			{!effectiveHideLauncher ? (
				<AnimatePresence>
					{teaserEnabled && !open && showTeaser && !disabled && !effectivePauseTeaser ? (
						<motion.div
						initial={{ opacity: 0, y: 14, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 8, scale: 0.98 }}
						transition={{ duration: 0.28, ease: "easeOut" }}
						className="fixed z-[1499] w-[250px] sm:w-[290px]"
						style={{
							bottom: resolveFloatingBottomCss(teaserBottomPx),
							right: `calc(${teaserRightPx}px + env(safe-area-inset-right))`,
						}}
					>
						<div
							className={`relative rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.16)] backdrop-blur-md${stageTeaserMode ? " cursor-pointer" : ""}`}
							role={stageTeaserMode ? "button" : undefined}
							tabIndex={stageTeaserMode ? 0 : undefined}
							onClick={stageTeaserMode ? () => activateTeaser() : undefined}
							onKeyDown={(event) => {
								if (!stageTeaserMode) return;
								if (event.key !== "Enter" && event.key !== " ") return;
								event.preventDefault();
								activateTeaser();
							}}
						>
								<div
									className="pr-8 text-sm font-medium leading-5 text-slate-800"
									aria-label={teaserText}
								>
									<span>{teaserDisplayText}</span>
									{assistantMode || !teaserTypingComplete ? (
										<motion.span
											aria-hidden="true"
											className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] rounded-full bg-violet-500 align-bottom"
											animate={{ opacity: [0.25, 1, 0.25] }}
											transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
										/>
									) : null}
							</div>
							<button
								type="button"
								onClick={(event) => {
								event.stopPropagation();
								setShowTeaser(false);
							}}
								className="absolute right-2 top-2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
								aria-label="Dismiss teaser"
							>
								<X className="h-4 w-4" />
							</button>
							<div className="absolute -bottom-2 right-7 h-4 w-4 rotate-45 border-b border-r border-white/60 bg-white/90" />
						</div>
					</motion.div>
					) : null}
				</AnimatePresence>
			) : null}

			{!effectiveHideLauncher ? (
				<motion.div
					className="fixed z-[1500]"
					style={{
						bottom: resolveFloatingBottomCss(anchorBottomPx),
						right: `calc(${assistantFloatingRightPx}px + env(safe-area-inset-right))`,
						pointerEvents: disabled || open ? "none" : "auto",
					}}
					initial={false}
					animate={{
						opacity: disabled || open ? 0 : 1,
						scale: disabled || open ? 0.98 : 1,
						y: disabled || open ? 8 : 0,
					}}
					transition={{ duration: 0.16, ease: "easeOut" }}
					aria-hidden={disabled || open}
				>
				{launcherAssistActive ? (
					<motion.div
						className={`pointer-events-none absolute inset-[-16px] ${
							assistantMode ? "rounded-[38px]" : "rounded-full"
						} bg-[radial-gradient(ellipse_at_center,rgba(124,108,255,0.34)_0%,rgba(56,189,248,0.18)_40%,rgba(124,108,255,0)_74%)] blur-xl`}
						animate={{ opacity: [0.2, 0.52, 0.2], scale: [1, 1.07, 1] }}
						transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
						aria-hidden="true"
					/>
				) : null}
				<button
					type="button"
					onClick={() => onOpen?.()}
					disabled={disabled || open}
					data-testid={assistantMode ? "toxi-launcher-assistant" : "toxi-launcher-default"}
					className={`group relative grid place-items-center overflow-hidden bg-gradient-to-br text-white transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
						assistantMode
							? "h-[76px] w-[76px] rounded-[26px] border border-white/55 bg-[linear-gradient(145deg,#071433_0%,#233ea0_42%,#6d4dff_100%)] shadow-[0_24px_72px_rgba(67,56,202,0.32),0_10px_24px_rgba(7,20,51,0.26)] hover:shadow-[0_28px_82px_rgba(79,70,229,0.38),0_14px_28px_rgba(7,20,51,0.28)] focus:ring-violet-200"
							: "h-[72px] w-[72px] rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2563EB] ring-2 ring-white shadow-[0_24px_80px_rgba(37,99,235,0.42)] hover:shadow-[0_28px_90px_rgba(37,99,235,0.48)] focus:ring-violet-200"
					} ${launcherAssistActive ? "ring-4 ring-violet-300/30" : ""}`}
					aria-label={resolvedLauncherAriaLabel}
					title={resolvedLauncherTitle}
				>
					{assistantMode ? (
						<>
							<div className="pointer-events-none absolute inset-px rounded-[25px] border border-white/18" aria-hidden="true" />
							<div
								className="pointer-events-none absolute inset-[4px] rounded-[22px] bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.08)_24%,rgba(255,255,255,0)_56%),linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.02)_34%,rgba(255,255,255,0)_68%)]"
								aria-hidden="true"
							/>
							<motion.div
								className="pointer-events-none absolute inset-[-8px] rounded-[32px] bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.24)_0%,rgba(129,140,248,0.12)_34%,rgba(129,140,248,0)_72%)] blur-lg"
								animate={{
									opacity: assistantVisualBusy ? [0.35, 0.64, 0.35] : [0.18, 0.32, 0.18],
									scale: assistantVisualBusy ? [1, 1.06, 1] : [1, 1.025, 1],
								}}
								transition={{ duration: assistantVisualBusy ? 1.45 : 2.8, repeat: Infinity, ease: "easeInOut" }}
								aria-hidden="true"
							/>
						</>
					) : null}
					<span
						className={`pointer-events-none absolute inset-[5px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.34),_rgba(255,255,255,0.02)_58%)] ${
							assistantMode ? "rounded-[22px] opacity-0" : "rounded-full"
						}`}
						aria-hidden="true"
					/>
					{!assistantMode ? (
						<span
						className="pointer-events-none absolute right-[calc(100%+14px)] top-1/2 hidden min-w-[180px] -translate-y-1/2 translate-x-1 rounded-[20px] border border-white/80 bg-white/95 px-4 py-2 text-left opacity-0 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur group-hover:translate-x-0 group-hover:opacity-100 sm:block"
						aria-hidden="true"
						>
						<div className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-600">
							{resolvedLauncherTitle}
						</div>
						<div className="mt-0.5 text-[13px] font-bold text-slate-900">
							{launcherSubtitle || resolvedLauncherTitle}
						</div>
						</span>
					) : null}
					<span
						className={`relative grid place-items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_30px_rgba(15,23,42,0.28)] ${
							assistantMode
								? "h-[58px] w-[58px] rounded-[20px] bg-transparent"
								: "h-[54px] w-[54px] rounded-full bg-[#0F172A]"
						}`}
					>
						{assistantMode ? (
							<ProfessionalAssistantAvatar active={!open && !disabled} boosted={assistantVisualBusy} />
						) : (
							<ConciergeAvatarGlyph className="h-8 w-8 text-white" />
						)}
						<motion.span
							className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border border-white/90 bg-white/95 text-violet-600 shadow-[0_10px_25px_rgba(15,23,42,0.16)]"
							animate={assistantMode ? { scale: assistantVisualBusy ? [1, 1.08, 1] : 1 } : undefined}
							transition={assistantMode ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : undefined}
							aria-hidden="true"
						>
							<MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
						</motion.span>
					</span>
				</button>
				</motion.div>
			) : null}

			<AnimatePresence initial={false}>
				{open ? (
					<motion.div
						key="toxi-overlay"
						className="fixed inset-0 z-[1490]"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.14, ease: "easeOut" }}
					>
						{showBackdrop ? (
							<motion.button
								type="button"
								className="absolute inset-0 bg-slate-900/25 backdrop-blur-[2px]"
								onClick={() => onClose?.()}
								aria-label="Close Toxi"
								style={{ touchAction: "none", overscrollBehavior: "none" }}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.14, ease: "easeOut" }}
							/>
						) : null}

						<motion.section
							role="dialog"
							aria-modal="true"
							aria-label={resolvedTitle}
								className={`fixed z-[1500] overflow-hidden border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_22px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl ${
									requestBuilderShell && !isMobileViewport
										? "left-auto"
										: requestBuilderShell
											? "left-3 right-3 w-[min(440px,calc(100vw-24px))] rounded-[24px]"
											: "left-2.5 right-2.5 w-[min(520px,calc(100vw-20px))] rounded-[32px] sm:left-auto sm:right-4"
								}`}
								style={panelStyle}
							initial={{ opacity: 0, y: 18 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 18 }}
							transition={{ duration: 0.16, ease: "easeOut" }}
						>
							<div className="flex h-full min-h-0 flex-col">
					<header className={`flex items-center justify-between ${mobileRequestBuilder ? "gap-2.5 px-4 py-2.5" : compactRequestBuilder ? "gap-3 px-4 py-3" : "gap-4 px-5 py-4"} border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))]`}>
					<div className={`flex items-center ${mobileRequestBuilder ? "gap-2.5" : compactRequestBuilder ? "gap-3" : "gap-3.5"}`}>
						<div
							data-testid={assistantMode ? "toxi-header-avatar" : undefined}
							className={`relative grid place-items-center overflow-hidden border border-white/55 ${
								assistantMode
									? mobileRequestBuilder
										? "h-11 w-11 rounded-[16px] bg-[linear-gradient(145deg,#081433_0%,#223f9f_44%,#6d4dff_100%)]"
										: compactRequestBuilder
										? "h-12 w-12 rounded-[18px] bg-[linear-gradient(145deg,#081433_0%,#223f9f_44%,#6d4dff_100%)]"
										: "h-14 w-14 rounded-[22px] bg-[linear-gradient(145deg,#081433_0%,#223f9f_44%,#6d4dff_100%)]"
									: mobileRequestBuilder
										? "h-11 w-11 rounded-[16px]"
										: compactRequestBuilder
										? "h-12 w-12 rounded-[18px]"
										: "h-14 w-14 rounded-[24px]"
							} ${
								assistantMode ? "" : avatar?.bgClassName || DEFAULT_AVATAR.bgClassName
							} ${mobileRequestBuilder ? "text-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_20px_rgba(15,23,42,0.14)]" : compactRequestBuilder ? "text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_24px_rgba(15,23,42,0.16)]" : "text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_35px_rgba(15,23,42,0.2)]"} font-extrabold text-white`}
						>
							{assistantMode ? <div className={`pointer-events-none absolute inset-[3px] border border-white/14 ${mobileRequestBuilder ? "rounded-[13px]" : compactRequestBuilder ? "rounded-[15px]" : "rounded-[19px]"}`} aria-hidden="true" /> : null}
							{renderAvatarContent(avatar, { assistantMode, active: open, boosted: assistantVisualBusy })}
							<span className={`absolute rounded-full border border-white bg-emerald-400 ${mobileRequestBuilder ? "bottom-1 right-1 h-2 w-2" : compactRequestBuilder ? "bottom-1 right-1 h-2 w-2" : "bottom-1.5 right-1.5 h-2.5 w-2.5"}`} />
						</div>
						<div className="min-w-0">
							<div className={mobileRequestBuilder ? "text-[10px] font-black uppercase tracking-[0.14em] text-violet-600" : compactRequestBuilder ? "text-[10px] font-black uppercase tracking-[0.14em] text-violet-600" : "text-[11px] font-black uppercase tracking-[0.16em] text-violet-600"}>
								{eyebrowLabel || (assistantMode ? "AI concierge" : "Concierge")}
							</div>
							<div className="flex items-center gap-2">
								<div className={mobileRequestBuilder ? "truncate text-[13px] font-extrabold text-slate-950" : compactRequestBuilder ? "truncate text-[14px] font-extrabold text-slate-950" : "truncate text-[15px] font-extrabold text-slate-950"}>
									{resolvedTitle}
								</div>
								{assistantMode ? (
									<span className={`inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 font-bold text-violet-700 ${mobileRequestBuilder ? "px-1.5 py-0.5 text-[9px]" : compactRequestBuilder ? "px-2 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"}`}>
										<Sparkles className="h-3 w-3" /> AI Assistant
									</span>
								) : null}
							</div>
							{subtitle ? (
								<div className={mobileRequestBuilder ? "mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug text-slate-500" : compactRequestBuilder ? "mt-0.5 text-[11px] font-semibold leading-snug text-slate-500" : "mt-0.5 text-[13px] font-semibold leading-snug text-slate-500"}>
									{subtitle}
								</div>
							) : null}
						</div>
					</div>
					<div className="flex items-center gap-2">
						{typeof onResetConversation === "function" ? (
							<button
								type="button"
								onClick={() => onResetConversation?.()}
								className={`rounded-full border border-slate-200/90 bg-white/90 text-[12px] font-bold text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:bg-slate-50 hover:text-slate-900 ${mobileRequestBuilder ? "px-2 py-1.5 text-[10px]" : compactRequestBuilder ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2"}`}
							>
								New chat
							</button>
						) : null}
						{canToggleVoiceReplies ? (
							<button
								type="button"
								onClick={handleToggleVoiceReplies}
								className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 font-bold text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:bg-slate-50 hover:text-slate-900 ${compactRequestBuilder ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-[12px]"}`}
								aria-label={voiceRepliesEnabled ? "Turn voice replies off" : "Turn voice replies on"}
							>
								{voiceRepliesEnabled ? (
									<Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
								) : (
									<VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
								)}
								<span className="hidden sm:inline">Voice {voiceRepliesEnabled ? "on" : "off"}</span>
							</button>
						) : null}
						<button
							type="button"
							onClick={() => onClose?.()}
							className={`grid place-items-center rounded-full border border-slate-200/90 bg-white/90 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:bg-slate-50 hover:text-slate-900 ${mobileRequestBuilder ? "h-8.5 w-8.5" : compactRequestBuilder ? "h-9 w-9" : "h-10 w-10"}`}
							aria-label="Close"
						>
							<X className={mobileRequestBuilder ? "h-3.5 w-3.5" : compactRequestBuilder ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
						</button>
					</div>
					</header>

					<motion.div
						className={`flex min-h-0 flex-1 flex-col ${mobileRequestBuilder ? "px-3 pb-2.5 pt-2" : compactRequestBuilder ? "px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3" : "px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4"} ${
							simpleLayout ? "gap-2.5" : mobileRequestBuilder ? "gap-2" : compactRequestBuilder ? "gap-2.5" : "gap-3"
						}`}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.24, delay: assistantMode ? 0.14 : 0.06, ease: "easeOut" }}
					>
						{!simpleLayout && summarySlot ? (
							<div
								data-testid="toxi-summary-slot"
								className={mobileRequestBuilder ? "shrink-0 max-h-[200px] overflow-y-auto pb-1" : "shrink-0"}
							>
								{summarySlot}
							</div>
						) : null}

						<div data-testid="toxi-message-viewport" className={`min-h-0 flex-1 overflow-hidden border border-white/90 bg-slate-50/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_16px_40px_rgba(15,23,42,0.07)] ${mobileRequestBuilder ? "min-h-[220px] rounded-[22px]" : compactRequestBuilder ? "rounded-[24px]" : "rounded-[30px]"}`}>
							<div
								ref={messageScrollerRef}
								className={`h-full overflow-y-auto [scrollbar-width:thin] ${
									simpleLayout
										? "px-4 py-4 sm:px-5 sm:py-5"
										: mobileRequestBuilder
											? "px-2.5 py-2"
											: compactRequestBuilder
											? "px-2.5 py-2.5 sm:px-3 sm:py-3"
											: "px-3 py-3 sm:px-4 sm:py-4"
								}`}
							>
								<div className={mobileRequestBuilder ? "grid gap-2" : compactRequestBuilder ? "grid gap-2.5" : "grid gap-3.5"}>
									{normalizedMessages.map((m) => (
										<ToxiMessageBubble key={m.id} role={m.role} text={m.text} variant={m.variant} compact={compactRequestBuilder}>
											{m.content}
										</ToxiMessageBubble>
									))}
									{sending || showTypingIndicator ? (
										<div className="flex justify-start">
											<TypingSignal />
										</div>
									) : null}
									<div ref={messagesEndRef} />
								</div>
							</div>
					</div>

					<footer className={`relative z-10 shrink-0 border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] shadow-[0_-10px_30px_rgba(15,23,42,0.06)] ${mobileRequestBuilder ? "px-3 py-2.5" : compactRequestBuilder ? "px-3.5 py-3" : "px-4 py-3.5"}`}>
						<div className={`grid ${mobileRequestBuilder ? "gap-2" : compactRequestBuilder ? "gap-2.5" : "gap-3"}`}>
							{voiceListening ? (
								<div className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
									<motion.span
										className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500"
										animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.15, 0.9] }}
										transition={{ duration: 1, repeat: Infinity }}
									/>
									Listening... speak naturally.
								</div>
							) : null}

							<div
								className={simpleLayout ? "grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end" : mobileRequestBuilder ? "grid gap-2" : compactRequestBuilder ? "grid gap-2.5" : "grid gap-3"}
							>
								<textarea
									ref={inputRef}
									value={input}
									onChange={(e) => onInputChange?.(e.target.value)}
									onKeyDown={onKeyDown}
									rows={simpleLayout || compactRequestBuilder ? 1 : 2}
									placeholder={inputPlaceholder}
									className={`w-full resize-none border border-slate-200 bg-white/95 text-slate-900 shadow-[inset_0_1px_0_rgba(15,23,42,0.03),0_12px_30px_rgba(15,23,42,0.06)] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${
										mobileRequestBuilder
											? "min-h-[52px] rounded-[18px] px-3 py-2.5 text-[13px] font-semibold leading-5"
											: compactRequestBuilder
												? "min-h-[56px] rounded-[20px] px-3.5 py-3 text-[13px] font-semibold leading-6"
											: simpleLayout
												? "min-h-[60px] rounded-[24px] px-4 py-3.5 text-[15px] font-semibold leading-7 sm:min-h-[64px]"
												: "min-h-[72px] rounded-[24px] px-4 py-3.5 text-[15px] font-semibold leading-7"
									}`}
									disabled={Boolean(sending)}
								/>

								{canUseVoiceInput ? (
									<button
										type="button"
										onClick={handleVoiceButton}
										className={`flex items-center justify-center border shadow-sm transition ${
											voiceListening
												? "border-indigo-300 bg-indigo-50 text-indigo-700"
												: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
										} ${mobileRequestBuilder ? "h-10 w-10 rounded-[16px]" : compactRequestBuilder ? "h-11 w-11 rounded-[18px]" : "h-12 w-12 rounded-2xl"}`}
										aria-label={voiceListening ? "Stop voice input" : "Start voice input"}
										title={voiceListening ? "Stop voice input" : "Start voice input"}
										disabled={Boolean(sending)}
									>
										{voiceListening ? (
											<MicOff className="h-5 w-5" />
										) : (
											<Mic className="h-5 w-5" />
										)}
									</button>
								) : null}

								{sendVisible ? (
									<button
										type="button"
										onClick={() => onSend?.()}
										disabled={Boolean(sending || !hasInput)}
										className={`w-full border border-blue-200 bg-white font-bold text-blue-700 shadow-[0_12px_28px_rgba(37,99,235,0.12)] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${mobileRequestBuilder ? "min-w-[88px] rounded-[16px] px-3 py-2 text-[12px]" : compactRequestBuilder ? "min-w-[96px] rounded-[18px] px-3.5 py-2.5 text-[12px]" : "min-w-[110px] rounded-[22px] px-4 py-3 text-[14px]"}`}
									>
										Send
									</button>
								) : simpleLayout ? (
									<div className="hidden sm:block" />
								) : null}
							</div>

							{simpleLayout ? (
								<div className="grid gap-3 rounded-[24px] border border-slate-200/80 bg-white/70 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
									{normalizedQuickActions.length ? (
										<AnimatedQuickActions>
											<div className="grid gap-2">
											<div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
												{quickActionsLabel}
											</div>
											<ToxiQuickActions
												actions={normalizedQuickActions}
												disabled={Boolean(quickActionsDisabled)}
												compact={compactRequestBuilder}
												onPick={(a) => onQuickAction?.(a)}
											/>
											</div>
										</AnimatedQuickActions>
									) : null}

									<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
										{ctaHint ? (
											<div className={compactRequestBuilder ? "text-[11px] font-semibold text-slate-500" : "text-[12px] font-semibold text-slate-500"}>
												{ctaHint}
											</div>
										) : <div />}

										<div className={`flex w-full flex-col gap-2 sm:w-auto sm:items-end ${compactRequestBuilder ? "sm:min-w-[190px]" : "sm:min-w-[220px]"}`}>
											{ctaVisible ? (
												<button
													type="button"
													onClick={() => onCta?.()}
													disabled={Boolean(sending || ctaDisabled)}
													className={`w-full bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#7C3AED] font-extrabold text-white shadow-[0_20px_50px_rgba(37,99,235,0.34)] transition hover:shadow-[0_24px_60px_rgba(37,99,235,0.42)] disabled:cursor-not-allowed disabled:opacity-60 ${mobileRequestBuilder ? "rounded-[16px] px-4 py-2.5 text-[12px] sm:min-w-[160px]" : compactRequestBuilder ? "rounded-[18px] px-4 py-2.5 text-[13px] sm:min-w-[176px]" : "rounded-[22px] px-4 py-3.5 text-[14px] sm:min-w-[190px]"}`}
												>
													{ctaLabel}
												</button>
											) : null}
											{secondaryCtaVisible ? (
												<button
													type="button"
													onClick={() => onSecondaryCta?.()}
													disabled={Boolean(sending || secondaryCtaDisabled)}
													className={`${compactRequestBuilder ? "text-[11px]" : "text-[12px]"} font-bold text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60`}
												>
													{secondaryCtaLabel}
												</button>
											) : null}
										</div>
									</div>

									{error ? (
										<div className={compactRequestBuilder ? "text-[11px] font-bold text-rose-600" : "text-[12px] font-bold text-rose-600"}>
											{error}
										</div>
									) : null}
								</div>
							) : (
								<>
									{normalizedQuickActions.length ? (
										<AnimatedQuickActions>
											<ToxiQuickActions
												actions={normalizedQuickActions}
												disabled={Boolean(quickActionsDisabled)}
												compact={compactRequestBuilder}
												onPick={(a) => onQuickAction?.(a)}
											/>
										</AnimatedQuickActions>
									) : null}

									<div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
										<div className="hidden sm:block" />
										<div className={`flex w-full flex-col gap-2 sm:w-auto sm:items-end ${compactRequestBuilder ? "sm:min-w-[184px]" : "sm:min-w-[210px]"}`}>
											{ctaVisible ? (
												<button
													type="button"
													onClick={() => onCta?.()}
													disabled={Boolean(sending || ctaDisabled)}
													className={`w-full bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#7C3AED] font-extrabold text-white shadow-[0_20px_50px_rgba(37,99,235,0.34)] transition hover:shadow-[0_24px_60px_rgba(37,99,235,0.42)] disabled:cursor-not-allowed disabled:opacity-60 ${compactRequestBuilder ? "rounded-[18px] px-4 py-2.5 text-[13px] sm:min-w-[176px]" : "rounded-[22px] px-4 py-3.5 text-[14px] sm:min-w-[190px]"}`}
												>
													{ctaLabel}
												</button>
											) : null}
											{secondaryCtaVisible ? (
												<button
													type="button"
													onClick={() => onSecondaryCta?.()}
													disabled={Boolean(sending || secondaryCtaDisabled)}
													className={`${compactRequestBuilder ? "text-[11px]" : "text-[12px]"} font-bold text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60`}
												>
													{secondaryCtaLabel}
												</button>
											) : null}
										</div>
									</div>

									{ctaHint ? (
										<div className={`text-center font-semibold text-slate-500 sm:text-left ${compactRequestBuilder ? "text-[11px]" : "text-[12px]"}`}>
											{ctaHint}
										</div>
									) : null}

									{error ? (
										<div className={`text-center font-bold text-rose-600 ${compactRequestBuilder ? "text-[11px]" : "text-[12px]"}`}>
											{error}
										</div>
									) : null}
								</>
							)}
						</div>
					</footer>
							</motion.div>
						</div>
						</motion.section>
					</motion.div>
				) : null}
			</AnimatePresence>
			</>
		</ModalPortal>
	);
}
