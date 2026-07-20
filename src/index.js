import React from "react";
import ReactDOM from "react-dom/client";
import Bootstrap from "./Bootstrap";

// Production hardening: after a deploy, some users can have an old HTML shell
// cached that points at JS chunks that no longer exist (CloudFront/SW race).
// That manifests as ChunkLoadError / "Loading chunk failed" and typically
// requires one manual refresh. We do a one-time auto-reload instead.
if (typeof window !== "undefined") {
	try {
		const RELOAD_GUARD_KEY = "eb:chunk-reload-once";

		const shouldAutoReloadForError = (err) => {
			const message =
				(err &&
					(err.message ||
						(typeof err.toString === "function" && err.toString()))) ||
				"";
			return /ChunkLoadError|Loading chunk\s+\d+\s+failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
				message,
			);
		};

		const maybeReloadOnce = (err) => {
			if (!shouldAutoReloadForError(err)) return;
			const already = window.sessionStorage?.getItem(RELOAD_GUARD_KEY);
			if (already) return;
			window.sessionStorage?.setItem(RELOAD_GUARD_KEY, "1");
			// Prefer replace to avoid leaving a broken entry in history.
			window.location.replace(window.location.href);
		};

		window.addEventListener("error", (event) => {
			maybeReloadOnce(event?.error || event);
		});
		window.addEventListener("unhandledrejection", (event) => {
			maybeReloadOnce(event?.reason || event);
		});
	} catch {
		// Never let hardening logic block boot.
	}
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<React.StrictMode>
		<Bootstrap />
	</React.StrictMode>,
);
