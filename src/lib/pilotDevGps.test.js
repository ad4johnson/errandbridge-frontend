import { canUsePilotDevGpsTestMode, isLocalDevHostname } from "./pilotDevGps";

describe("pilotDevGps", () => {
	test("recognizes private network and .local hosts as local dev hosts", () => {
		expect(isLocalDevHostname("192.168.1.121")).toBe(true);
		expect(isLocalDevHostname("10.0.0.8")).toBe(true);
		expect(isLocalDevHostname("errandbridge.local")).toBe(true);
		expect(isLocalDevHostname("pilot.errandbridge.com")).toBe(false);
	});

	test("allows pilot GPS test mode when using a local-like API base", () => {
		expect(canUsePilotDevGpsTestMode("http://192.168.1.121:8001")).toBe(true);
	});
});
