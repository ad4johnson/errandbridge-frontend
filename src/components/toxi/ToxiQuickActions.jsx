import React from "react";

const DEFAULT_ACTIONS = [
	{ id: "grocery", label: "Groceries", message: "Buy groceries for my family." },
	{ id: "courier", label: "Courier", message: "Send a package/document for me." },
	{ id: "passport", label: "Passport", message: "Pick up my passport/visa for me." },
	{ id: "airport", label: "Airport", message: "I need airport pickup/transport." },
];

export default function ToxiQuickActions({
	actions = DEFAULT_ACTIONS,
	onPick,
	disabled,
	compact = false,
}) {
	return (
		<div
			className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}
			aria-label="Quick actions"
		>
			{actions.map((a) => (
				<button
					key={a.id}
					type="button"
					onClick={() => onPick?.(a)}
					disabled={disabled}
					className={compact
						? "rounded-full border border-slate-200/85 bg-white/92 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
						: "rounded-full border border-slate-200/85 bg-white/92 px-3 py-2 text-[12px] font-bold text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
					}
				>
					{a.label}
				</button>
			))}
		</div>
	);
}
