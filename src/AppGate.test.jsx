import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter } from "react-router-dom";

import AppGate from "./AppGate";

jest.mock("./App", () => ({
	__esModule: true,
	default: () => <div>Full app shell</div>,
}));

jest.mock("./LandingApp", () => ({
	__esModule: true,
	default: () => <div>Lite landing shell</div>,
}));

const ROUTER_FUTURE_FLAGS = {
	v7_startTransition: true,
	v7_relativeSplatPath: true,
};

const renderWithRoute = (route) =>
	render(
		<MemoryRouter future={ROUTER_FUTURE_FLAGS} initialEntries={[route]}>
			<Suspense fallback={<div>Loading…</div>}>
				<AppGate />
			</Suspense>
		</MemoryRouter>,
	);

describe("AppGate public entry routing", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test("uses the main app shell on the public root URL", async () => {
		renderWithRoute("/");

		expect(await screen.findByText(/full app shell/i)).toBeInTheDocument();
		expect(screen.queryByText(/lite landing shell/i)).not.toBeInTheDocument();
	});

	test("keeps the lightweight landing shell on /lite", async () => {
		renderWithRoute("/lite");

		expect(await screen.findByText(/lite landing shell/i)).toBeInTheDocument();
		expect(screen.queryByText(/full app shell/i)).not.toBeInTheDocument();
	});
});
