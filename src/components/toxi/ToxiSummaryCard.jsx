import React from "react";

function parseRow(row) {
	const value = String(row || "").trim();
	if (!value) return null;
	const separatorIndex = value.indexOf(":");
	if (separatorIndex === -1) {
		return { label: "Detail", value };
	}

	return {
		label: value.slice(0, separatorIndex).trim(),
		value: value.slice(separatorIndex + 1).trim(),
	};
}

export default function ToxiSummaryCard({
	rows = [],
	ready,
	missingLabels = [],
	title = "Request summary",
	description,
	statusLabel,
	statusTone = "default",
	missingTitle = "Still needed",
	emptyState = "Add the core details and I’ll keep the request organized here.",
	compact = false,
}) {
	const safeRows = Array.isArray(rows)
		? rows.map(parseRow).filter(Boolean)
		: [];
	const safeMissing = Array.isArray(missingLabels)
		? missingLabels.filter(Boolean)
		: [];
	const resolvedDescription =
		description ||
		(ready
			? "Everything needed for the next step is captured."
			: "I’ll keep the details clean and highlight what’s still missing.");
	const resolvedStatusLabel = statusLabel || (ready ? "Ready" : "In progress");
	const statusToneClassName =
		statusTone === "success"
			? "bg-emerald-50 text-emerald-700"
			: statusTone === "neutral"
				? "bg-slate-100 text-slate-700"
				: "bg-blue-50 text-blue-700";

	if (!safeRows.length && !safeMissing.length) return null;

	return (
		<section
			className={compact
				? "rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-3 shadow-[0_12px_28px_rgba(15,23,42,0.07)] backdrop-blur"
				: "rounded-[26px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-3.5 shadow-[0_16px_34px_rgba(15,23,42,0.08)] backdrop-blur"
			}
			aria-label="Live summary"
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className={compact ? "text-[10px] font-black uppercase tracking-[0.15em] text-violet-600" : "text-[11px] font-black uppercase tracking-[0.16em] text-violet-600"}>
						{title}
					</div>
					<div className={compact ? "mt-1 text-[11px] font-semibold text-slate-500" : "mt-1 text-[12px] font-semibold text-slate-500"}>
						{resolvedDescription}
					</div>
				</div>
				<div
					className={`rounded-full ${compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]"} font-black uppercase tracking-[0.12em] ${statusToneClassName}`}
				>
					{resolvedStatusLabel}
				</div>
			</div>

			{safeRows.length ? (
				<div className="mt-3 grid gap-2">
					{safeRows.map((row) => (
						<div
							key={`${row.label}:${row.value}`}
							className={compact
								? "grid gap-1 rounded-[16px] border border-slate-200/80 bg-white/80 px-3 py-2 shadow-[0_8px_16px_rgba(15,23,42,0.04)] sm:grid-cols-[minmax(78px,auto)_1fr] sm:items-baseline sm:gap-2.5"
								: "grid gap-1 rounded-[18px] border border-slate-200/80 bg-white/80 px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)] sm:grid-cols-[minmax(88px,auto)_1fr] sm:items-baseline sm:gap-3"
							}
						>
							<div className={compact ? "text-[10px] font-black uppercase tracking-[0.12em] text-slate-500" : "text-[11px] font-black uppercase tracking-[0.12em] text-slate-500"}>
								{row.label}
							</div>
							<div className={compact ? "min-w-0 text-[12px] font-semibold leading-snug text-slate-800" : "min-w-0 text-[13px] font-semibold leading-snug text-slate-800"}>
								{row.value}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className={compact ? "mt-3 rounded-[18px] bg-white/75 px-3 py-2.5 text-[12px] font-semibold text-slate-500" : "mt-3 rounded-[20px] bg-white/75 px-3.5 py-3 text-[13px] font-semibold text-slate-500"}>
					{emptyState}
				</div>
			)}

			{safeMissing.length ? (
				<div className="mt-3 border-t border-slate-200/80 pt-3">
					<div className={compact ? "text-[10px] font-black uppercase tracking-[0.14em] text-slate-500" : "text-[11px] font-black uppercase tracking-[0.14em] text-slate-500"}>
						{missingTitle}
					</div>
					<div className={compact ? "mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-600" : "mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-slate-600"}>
						{safeMissing.map((label, index) => (
							<React.Fragment key={label}>
								<span>{label}</span>
								{index < safeMissing.length - 1 ? (
									<span aria-hidden="true" className="text-slate-300">•</span>
								) : null}
							</React.Fragment>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}
