// Back-compat shim.
// Older code uses `useUIState` with `cookieBannerOpen`/`cookieModalOpen`.
// We now orchestrate all surfaces with `useUISurfaces`.

import { useUISurfaces } from "./ui-surfaces";

export function useUIState(selector) {
	return useUISurfaces((state) => {
		const cookieModalOpen = state.activeModal === "cookiePreferences";
		const mapped = {
			cookieBannerOpen: state.cookieBannerOpen,
			cookieModalOpen,
			setCookieBannerOpen: state.setCookieBannerOpen,
			setCookieModalOpen: (open) =>
				state.openModal(open ? "cookiePreferences" : null),
			closeAllOverlays: state.closeAllSurfaces,
		};
		return typeof selector === "function" ? selector(mapped) : mapped;
	});
}
