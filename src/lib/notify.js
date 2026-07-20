// Lightweight notifier used by App.js to decouple UI toasts from business logic.
//
// Contract:
//   notify(message, { type?: 'success'|'info'|'warning'|'error', durationMs?: number })
//
// Implementation:
// - Uses the app's existing CustomEvent toast bus (`eb:toast`).
// - SSR/Jest safe (no `window` assumptions).


/**
 * Lightweight notifier used by App.js to decouple UI toasts from business logic.
 *
 * Contract:
 *   notify(message, { type?: 'success'|'info'|'warning'|'error', durationMs?: number, dedupeKey?: string })
 *
 * Note: App.js also calls notify.success/info/warning/error for convenience.
 */
export function notify(message, options = {}) {
	const text = typeof message === "string" ? message : String(message ?? "");
	if (!text.trim()) return;

	const detail = {
		message: text,
		type: options.type || "info",
		dedupeKey:
			typeof options.dedupeKey === "string" && options.dedupeKey.trim()
				? options.dedupeKey.trim()
				: undefined,
		durationMs: Number.isFinite(options.durationMs)
			? options.durationMs
			: undefined,
	};

	if (typeof window === "undefined") {
		// eslint-disable-next-line no-console
		console.log(`[notify:${detail.type}]`, detail.message);
		return;
	}

	try {
		window.dispatchEvent(new CustomEvent("eb:toast", { detail }));
	} catch {
		// eslint-disable-next-line no-console
		console.log(`[notify:${detail.type}]`, detail.message);
	}
}

// Convenience helpers: App.js historically calls notify.success/info/etc.
notify.success = (message, options = {}) =>
	notify(message, { ...options, type: "success" });
notify.info = (message, options = {}) => notify(message, { ...options, type: "info" });
notify.warning = (message, options = {}) =>
	notify(message, { ...options, type: "warning" });
notify.error = (message, options = {}) => notify(message, { ...options, type: "error" });

