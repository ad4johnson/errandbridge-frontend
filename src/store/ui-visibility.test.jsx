import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";

import { useUISurfaces } from "./ui-surfaces";
import { useUIVisibility } from "./ui-visibility";

function VisibilityProbe() {
	const { activeModal, activePanel, showAssistantIcon, showToxiPanel } =
		useUIVisibility();

	return (
		<div>
			<div data-testid="active-modal">{activeModal || "none"}</div>
			<div data-testid="active-panel">{activePanel || "none"}</div>
			<div data-testid="show-assistant-icon">
				{showAssistantIcon ? "yes" : "no"}
			</div>
			<div data-testid="show-toxi-panel">{showToxiPanel ? "yes" : "no"}</div>
		</div>
	);
}

describe("useUIVisibility", () => {
	afterEach(() => {
		act(() => {
			useUISurfaces.setState({
				activeModal: null,
				activePanel: null,
				cookieBannerOpen: false,
				cookieBannerHeightPx: 0,
			});
		});
	});

	test("treats payment as a blocking modal surface and clears Toxi", () => {
		render(<VisibilityProbe />);

		act(() => {
			useUISurfaces.getState().openPanel("toxi");
		});

		expect(screen.getByTestId("active-panel")).toHaveTextContent("toxi");
		expect(screen.getByTestId("show-toxi-panel")).toHaveTextContent("yes");

		act(() => {
			useUISurfaces.getState().openModal("payment");
		});

		expect(screen.getByTestId("active-modal")).toHaveTextContent("payment");
		expect(screen.getByTestId("active-panel")).toHaveTextContent("none");
		expect(screen.getByTestId("show-assistant-icon")).toHaveTextContent("no");
		expect(screen.getByTestId("show-toxi-panel")).toHaveTextContent("no");
	});
});
