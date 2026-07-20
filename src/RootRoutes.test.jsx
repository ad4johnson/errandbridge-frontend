import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import RootRoutes from "./RootRoutes";

jest.mock("./LandingApp", () => ({
	__esModule: true,
	default: () => <div>Lightweight landing</div>,
}));

jest.mock("./CustomerAuthPage", () => ({
	__esModule: true,
	default: () => <div>Customer auth route</div>,
}));

jest.mock("./RootApp", () => ({
	__esModule: true,
	default: () => <div>Pilot root route</div>,
}));

jest.mock("./pages/legal/LegalRoutes", () => ({
	__esModule: true,
	default: () => <div>Legal routes</div>,
}));

const originalLocation = window.location;

const setHostname = (url) => {
	Object.defineProperty(window, "location", {
		configurable: true,
		value: new URL(url),
	});
};

const renderAtRoute = (route) =>
	render(
		<MemoryRouter
			initialEntries={[route]}
			future={{
				v7_startTransition: true,
				v7_relativeSplatPath: true,
			}}
		>
			<RootRoutes />
		</MemoryRouter>,
	);

describe("RootRoutes auth host routing", () => {
	afterEach(() => {
		Object.defineProperty(window, "location", {
			configurable: true,
			value: originalLocation,
		});
	});

	test("renders the pilot root app for /login on the pilot host", async () => {
		setHostname("https://pilot.errandbridge.com/login");

		renderAtRoute("/login");

		expect(await screen.findByText(/pilot root route/i)).toBeInTheDocument();
		expect(screen.queryByText(/customer auth route/i)).not.toBeInTheDocument();
	});

	test("renders the customer auth page for /login on the main host", async () => {
		setHostname("https://www.errandbridge.com/login");

		renderAtRoute("/login");

		expect(await screen.findByText(/customer auth route/i)).toBeInTheDocument();
		expect(screen.queryByText(/pilot root route/i)).not.toBeInTheDocument();
	});

	test("renders the full app for / on the main host", async () => {
		setHostname("https://www.errandbridge.com/");

		renderAtRoute("/");

		expect(await screen.findByText(/pilot root route/i)).toBeInTheDocument();
		expect(screen.queryByText(/lightweight landing/i)).not.toBeInTheDocument();
	});

	test("renders the lightweight landing for /lite", async () => {
		setHostname("https://www.errandbridge.com/lite");

		renderAtRoute("/lite");

		expect(await screen.findByText(/lightweight landing/i)).toBeInTheDocument();
		// RootApp should not be mounted for the ultra-light landing route.
		expect(screen.queryByText(/pilot root route/i)).not.toBeInTheDocument();
	});
});