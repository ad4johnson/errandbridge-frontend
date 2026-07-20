export const acquireBodyScrollLock = () => {
	if (typeof document === "undefined") return () => {};
	const body = document.body;
	if (!body) return () => {};
	const html = document.documentElement;

	const currentCount = Number(body.dataset.ebScrollLocks || 0) || 0;
	if (currentCount === 0) {
		// Persist previous styles so nested overlays can share one lock safely.
		body.dataset.ebScrollOverflow = body.style.overflow || "";
		body.dataset.ebScrollPaddingRight = body.style.paddingRight || "";
		body.dataset.ebScrollPosition = body.style.position || "";
		body.dataset.ebScrollTop = body.style.top || "";
		body.dataset.ebScrollLeft = body.style.left || "";
		body.dataset.ebScrollRight = body.style.right || "";
		body.dataset.ebScrollWidth = body.style.width || "";
		body.dataset.ebScrollScrollY = String(
			typeof window !== "undefined" ? window.scrollY || 0 : 0,
		);
		body.dataset.ebScrollHtmlOverflow = html?.style?.overflow || "";

		// Avoid layout shift when hiding scrollbar (desktop browsers).
		try {
			const scrollBarWidth =
				window.innerWidth - (html?.clientWidth || window.innerWidth);
			if (scrollBarWidth > 0) {
				body.style.paddingRight = `${scrollBarWidth}px`;
			}
		} catch {
			// ignore
		}

		// iOS/Safari/WKWebView-friendly background freeze:
		// - body { position: fixed; top: -scrollY } prevents background scroll
		// - html overflow hidden reduces elastic scroll / overscroll interactions
		const scrollY = Number(body.dataset.ebScrollScrollY || 0) || 0;
		body.style.position = "fixed";
		body.style.top = `-${scrollY}px`;
		body.style.left = "0";
		body.style.right = "0";
		body.style.width = "100%";
		body.style.overflow = "hidden";
		if (html?.style) html.style.overflow = "hidden";
	}

	const nextCount = currentCount + 1;
	body.dataset.ebScrollLocks = String(nextCount);
	// Ensure overflow stays locked even if something else tries to change it.
	body.style.overflow = "hidden";

	return () => {
		const count = Number(body.dataset.ebScrollLocks || 0) || 0;
		const reduced = Math.max(0, count - 1);
		body.dataset.ebScrollLocks = String(reduced);
		if (reduced === 0) {
			const restoreOverflow = body.dataset.ebScrollOverflow || "";
			const restorePaddingRight = body.dataset.ebScrollPaddingRight || "";
			const restorePosition = body.dataset.ebScrollPosition || "";
			const restoreTop = body.dataset.ebScrollTop || "";
			const restoreLeft = body.dataset.ebScrollLeft || "";
			const restoreRight = body.dataset.ebScrollRight || "";
			const restoreWidth = body.dataset.ebScrollWidth || "";
			const restoreHtmlOverflow = body.dataset.ebScrollHtmlOverflow || "";
			const scrollY = Number(body.dataset.ebScrollScrollY || 0) || 0;

			body.style.overflow = restoreOverflow;
			body.style.paddingRight = restorePaddingRight;
			body.style.position = restorePosition;
			body.style.top = restoreTop;
			body.style.left = restoreLeft;
			body.style.right = restoreRight;
			body.style.width = restoreWidth;
			if (html?.style) html.style.overflow = restoreHtmlOverflow;

			// Restore the scroll position we froze at.
			try {
				const ua =
					typeof window !== "undefined"
						? window.navigator?.userAgent || ""
						: "";
				const isJSDOM = /jsdom/i.test(ua);
				if (!isJSDOM && typeof window !== "undefined" && typeof window.scrollTo === "function") {
					window.scrollTo(0, scrollY);
				}
			} catch {
				// ignore
			}

			delete body.dataset.ebScrollOverflow;
			delete body.dataset.ebScrollPaddingRight;
			delete body.dataset.ebScrollPosition;
			delete body.dataset.ebScrollTop;
			delete body.dataset.ebScrollLeft;
			delete body.dataset.ebScrollRight;
			delete body.dataset.ebScrollWidth;
			delete body.dataset.ebScrollScrollY;
			delete body.dataset.ebScrollHtmlOverflow;
			delete body.dataset.ebScrollLocks;
		}
	};
};
