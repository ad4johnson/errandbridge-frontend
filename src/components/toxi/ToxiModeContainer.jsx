import React from "react";

import ToxiClientWidget from "./ToxiClientWidget";
import ToxiConciergeWidget from "./ToxiConciergeWidget";

/** @typedef {'concierge' | 'request_builder' | 'client_support'} ToxiMode */

export default function ToxiModeContainer({
	mode,
	open,
	disabled,
	hideLauncher = false,
	pauseTeaser = false,
	anchorBottomPx,
	anchorRightPx,
	anchorIncludeSafeAreaBottom,
	onOpen,
	onClose,

	onStartSignup,

	pageContext,
	apiBaseUrl,
	getAuthToken,
	onRequestBuilderPatch,
	onOpenPricing,
	onAssistantAction,
	onOpenSupport,
	onPreviewFileUrl,
	onRequestHumanAgent,
	assistantConfig,
}) {
	if (mode === "concierge") {
		return (
			<ToxiConciergeWidget
				open={open}
				disabled={disabled}
				hideLauncher={hideLauncher}
				pauseTeaser={pauseTeaser}
				anchorBottomPx={anchorBottomPx}
				anchorRightPx={anchorRightPx}
				anchorIncludeSafeAreaBottom={anchorIncludeSafeAreaBottom}
				onOpen={onOpen}
				onClose={onClose}
				onStartSignup={onStartSignup}
				pageContext={pageContext}
				resetKey={pageContext?.resetKey}
				assistantConfig={assistantConfig}
			/>
		);
	}

	return (
		<ToxiClientWidget
			open={open}
			disabled={disabled}
			hideLauncher={hideLauncher}
			pauseTeaser={pauseTeaser}
			anchorBottomPx={anchorBottomPx}
			anchorRightPx={anchorRightPx}
			anchorIncludeSafeAreaBottom={anchorIncludeSafeAreaBottom}
			onOpen={onOpen}
			onClose={onClose}
			mode={mode}
			pageContext={pageContext}
			apiBaseUrl={apiBaseUrl}
			getAuthToken={getAuthToken}
			onRequestBuilderPatch={onRequestBuilderPatch}
			onOpenPricing={onOpenPricing}
			onAssistantAction={onAssistantAction}
			onOpenSupport={onOpenSupport}
			onPreviewFileUrl={onPreviewFileUrl}
			onRequestHumanAgent={onRequestHumanAgent}
			assistantConfig={assistantConfig}
		/>
	);
}
