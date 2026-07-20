const prefersReducedMotion = () => {
	try {
		return Boolean(
			window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
		);
	} catch {
		return false;
	}
};

const getScrollParent = (node) => {
	try {
		let el = node?.parentElement || null;
		while (el && el !== document.body) {
			const style = window.getComputedStyle(el);
			const overflowY = style?.overflowY || "";
			const canScroll =
				(overflowY === "auto" || overflowY === "scroll") &&
				(el.scrollHeight || 0) > (el.clientHeight || 0) + 2;
			if (canScroll) return el;
			el = el.parentElement;
		}
		return (
			document.scrollingElement ||
			document.documentElement ||
			document.body
		);
	} catch {
		return document.documentElement;
	}
};

const setScrollerTop = (scroller, top) => {
	try {
		if (!scroller) return;
		if (typeof scroller.scrollTo === "function") {
			scroller.scrollTo({ top, behavior: "auto" });
			return;
		}
		// eslint-disable-next-line no-param-reassign
		scroller.scrollTop = top;
	} catch {
		// ignore
	}
};

/**
 * Scrolls the current page back to the top.
 *
 * This tries multiple strategies because some mobile WebViews (incl. iOS/Capacitor)
 * can be finicky about whether the window or a nested container owns scroll.
 */
export const scrollPageToTop = (origin, options = {}) => {
	if (typeof window === "undefined" || typeof document === "undefined") return false;

	const behavior = options.behavior || (prefersReducedMotion() ? "auto" : "smooth");
	const originEl = origin?.currentTarget || origin?.target || origin;
	const scroller = getScrollParent(originEl);

	let didScroll = false;

	// 1) Scroll the detected scroller.
	try {
		if (scroller && typeof scroller.scrollTo === "function") {
			scroller.scrollTo({ top: 0, behavior });
			didScroll = true;
		} else if (scroller && typeof scroller.scrollTop === "number") {
			// eslint-disable-next-line no-param-reassign
			scroller.scrollTop = 0;
			didScroll = true;
		}
	} catch {
		// ignore
	}

	// 2) Also try window scrolling.
	try {
		window.scrollTo({ top: 0, behavior });
		didScroll = true;
	} catch {
		try {
			window.scrollTo(0, 0);
			didScroll = true;
		} catch {
			// ignore
		}
	}

	// 3) Deterministic fallback: force common scrollers to 0.
	try {
		setScrollerTop(document.scrollingElement, 0);
		setScrollerTop(document.documentElement, 0);
		setScrollerTop(document.body, 0);
		if (
			scroller &&
			scroller !== document.scrollingElement &&
			scroller !== document.documentElement &&
			scroller !== document.body
		) {
			setScrollerTop(scroller, 0);
		}
	} catch {
		// ignore
	}

	// 4) One more tick for stubborn WebViews.
	try {
		window.requestAnimationFrame(() => {
			try {
				setScrollerTop(document.scrollingElement, 0);
				setScrollerTop(document.documentElement, 0);
				setScrollerTop(document.body, 0);
				if (
					scroller &&
					scroller !== document.scrollingElement &&
					scroller !== document.documentElement &&
					scroller !== document.body
				) {
					setScrollerTop(scroller, 0);
				}
			} catch {
				// ignore
			}
		});
	} catch {
		// ignore
	}

	return didScroll;
};
