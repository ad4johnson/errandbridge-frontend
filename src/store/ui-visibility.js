import { useMemo } from "react";
import { useUISurfaces } from "./ui-surfaces";

export function useUIVisibility() {
	const activeModal = useUISurfaces((s) => s.activeModal);
	const activePanel = useUISurfaces((s) => s.activePanel);
	const cookieBannerOpen = useUISurfaces((s) => s.cookieBannerOpen);

	return useMemo(() => {
		const hasBlockingSurface = Boolean(activeModal || cookieBannerOpen);

		return {
			activeModal,
			activePanel,
			cookieBannerOpen,
			hasBlockingSurface,

			// Sticky CTA is lowest priority. Keep it hidden while any panel is open.
			showStickyCTA: !activeModal && !cookieBannerOpen && activePanel === null,

			// Assistant icon can remain unless a modal is active (optional design choice).
			showAssistantIcon: !activeModal,
			showAssistantPanel: activePanel === "assistant",
			showAssistantTooltip:
				!activeModal && !cookieBannerOpen && activePanel === null,
			showToxiPanel: activePanel === "toxi",

			// Story behavior: collapsed chip when nothing else is active; expanded only when panel is 'story'.
			showStoryExpanded: activePanel === "story",
			showStoryCollapsed: !activeModal && !cookieBannerOpen && activePanel === null,
		};
	}, [activeModal, activePanel, cookieBannerOpen]);
}
