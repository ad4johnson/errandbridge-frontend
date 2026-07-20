import { create } from "zustand";

// Unified mobile surface orchestration.
// Priority (highest -> lowest):
// - activeModal (cookiePreferences/appPromo/pilotPromo/loginSheet/...) blocks everything else
// - cookieBannerOpen blocks lower surfaces
// - activePanel (assistant/story)
// - sticky CTA
// - collapsed chips/icons

export const useUISurfaces = create((set) => ({
	/** @type {null | 'cookiePreferences' | 'appPromo' | 'pilotPromo' | 'loginSheet' | 'payment'} */
	activeModal: null,

	/** @type {null | 'assistant' | 'story' | 'toxi'} */
	activePanel: null,

	cookieBannerOpen: false,
	cookieBannerHeightPx: 0,

	openModal: (modal) =>
		set((state) => ({
			activeModal: modal || null,
			activePanel: null,
			// Cookie preferences is part of the cookie-consent flow; keep the banner
			// logically open so it returns after closing the sheet.
			cookieBannerOpen:
				modal === "cookiePreferences" ? state.cookieBannerOpen : false,
		})),

	closeModal: () =>
		set((state) => ({
			activeModal: state.activeModal ? null : state.activeModal,
		})),

	openPanel: (panel) =>
		set(() => ({
			activePanel: panel || null,
			activeModal: null,
			cookieBannerOpen: false,
		})),

	closePanel: () =>
		set(() => ({
			activePanel: null,
		})),

	setCookieBannerOpen: (open) =>
		set(() => ({
			cookieBannerOpen: Boolean(open),
			// Banner should clear panels/modals to avoid stacking.
			activeModal: null,
			activePanel: null,
		})),

	setCookieBannerHeightPx: (heightPx) =>
		set(() => ({
			cookieBannerHeightPx: Math.max(0, Number(heightPx) || 0),
		})),

	closeAllSurfaces: () =>
		set(() => ({
			activeModal: null,
			activePanel: null,
			cookieBannerOpen: false,
		})),
}));
