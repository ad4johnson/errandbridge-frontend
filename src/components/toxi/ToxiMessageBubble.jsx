import React from "react";

export default function ToxiMessageBubble({ role, text, children, variant, compact = false }) {
	const mine = role === "user";
	const welcomeAssistantBubble = !mine && variant === "welcome";
	const plainText = String(text || "").trim();
	const paragraphs = plainText
		? plainText
				.split(/\n{2,}/)
				.map((segment) => segment.trim())
				.filter(Boolean)
		: [];
	const bubbleClassName = mine
		? compact
			? "max-w-[90%] rounded-[24px] rounded-br-[10px] bg-[linear-gradient(135deg,_#1D4ED8,_#2563EB_52%,_#7C3AED)] px-3.5 py-3 text-[13px] font-semibold leading-6 text-white shadow-[0_16px_36px_rgba(37,99,235,0.22)] sm:px-4"
			: "max-w-[92%] rounded-[30px] rounded-br-[12px] bg-[linear-gradient(135deg,_#1D4ED8,_#2563EB_52%,_#7C3AED)] px-4.5 py-4 text-[14px] font-semibold leading-7 text-white shadow-[0_20px_50px_rgba(37,99,235,0.26)] sm:px-5 sm:text-[15px]"
		: welcomeAssistantBubble
			? compact
				? "max-w-[82%] rounded-[22px] rounded-bl-[10px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(247,249,252,0.96))] px-3.5 py-2.5 text-[13px] font-semibold leading-6 text-slate-900 shadow-[0_10px_20px_rgba(15,23,42,0.05)] sm:max-w-[76%]"
				: "max-w-[84%] rounded-[26px] rounded-bl-[10px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(247,249,252,0.96))] px-4 py-3 text-[14px] font-semibold leading-7 text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:max-w-[78%] sm:px-4.5 sm:text-[15px]"
			: compact
				? "max-w-[86%] rounded-[22px] rounded-bl-[10px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,247,250,0.96))] px-3.5 py-3 text-[13px] font-semibold leading-6 text-slate-900 shadow-[0_10px_22px_rgba(15,23,42,0.06)] sm:max-w-[80%]"
				: "max-w-[88%] rounded-[26px] rounded-bl-[10px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,247,250,0.96))] px-4 py-3.5 text-[14px] font-semibold leading-7 text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.07)] sm:max-w-[82%] sm:px-4.5 sm:text-[15px]";
	const assistantLabel = welcomeAssistantBubble ? "Toxi • welcome" : "Toxi";
	return (
		<div className={mine ? "flex justify-end" : "flex justify-start"}>
			<div className={bubbleClassName}>
				{mine ? null : (
					<div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
						<span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 shadow-[0_0_0_4px_rgba(99,102,241,0.12)]" />
						<span>{assistantLabel}</span>
					</div>
				)}
				{children ? (
					children
				) : mine ? (
					<div className="whitespace-pre-wrap text-pretty">{plainText}</div>
				) : (
					<div className="grid gap-2.5 text-pretty">
						{paragraphs.length
							? paragraphs.map((paragraph, index) => (
									<p
										key={`${role}-${index}`}
										className="m-0 whitespace-pre-wrap font-medium leading-[1.75] text-slate-800"
									>
										{paragraph}
									</p>
								))
							: null}
					</div>
				)}
			</div>
		</div>
	);
}
