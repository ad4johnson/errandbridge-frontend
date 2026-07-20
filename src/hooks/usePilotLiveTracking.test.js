import "@testing-library/jest-dom";
import { act, renderHook, waitFor } from "@testing-library/react";

import { usePilotLiveTracking } from "./usePilotLiveTracking";

const mockCanUsePilotDevGpsTestMode = jest.fn(() => false);

jest.mock("../lib/pilotDevGps", () => ({
	canUsePilotDevGpsTestMode: (...args) => mockCanUsePilotDevGpsTestMode(...args),
	isLocalDevHostname: (hostname) =>
		hostname === "localhost" || hostname === "127.0.0.1",
}));

let watchCallback;
const originalNavigatorGeolocation = Object.getOwnPropertyDescriptor(
	global.navigator,
	"geolocation",
);
const originalWindowCapacitor = Object.getOwnPropertyDescriptor(
	global.window,
	"Capacitor",
);
const originalWindowMatchMedia = Object.getOwnPropertyDescriptor(
	global.window,
	"matchMedia",
);
const originalWindowSecureContext = Object.getOwnPropertyDescriptor(
	global.window,
	"isSecureContext",
);

jest.mock("@capacitor/geolocation", () => ({
	Geolocation: {
		checkPermissions: jest.fn(async () => ({ location: "granted", coarseLocation: "granted" })),
		requestPermissions: jest.fn(async () => ({ location: "granted", coarseLocation: "granted" })),
		getCurrentPosition: jest.fn(async () => ({
			coords: {
				latitude: 6.5244,
				longitude: 3.3792,
				accuracy: 10,
				speed: 0,
				heading: null,
				altitude: null,
			},
			timestamp: Date.now(),
		})),
		watchPosition: jest.fn(async (_options, callback) => {
			watchCallback = callback;
			return "watch-1";
		}),
		clearWatch: jest.fn(async () => undefined),
	},
}));

describe("usePilotLiveTracking", () => {
	beforeEach(() => {
		const { Geolocation } = jest.requireMock("@capacitor/geolocation");
		watchCallback = undefined;
		jest.clearAllMocks();
		Geolocation.checkPermissions.mockResolvedValue({
			location: "granted",
			coarseLocation: "granted",
		});
		Geolocation.requestPermissions.mockResolvedValue({
			location: "granted",
			coarseLocation: "granted",
		});
		Geolocation.getCurrentPosition.mockResolvedValue({
			coords: {
				latitude: 6.5244,
				longitude: 3.3792,
				accuracy: 10,
				speed: 0,
				heading: null,
				altitude: null,
			},
			timestamp: Date.now(),
		});
		Geolocation.watchPosition.mockImplementation(async (_options, callback) => {
			watchCallback = callback;
			return "watch-1";
		});
		Geolocation.clearWatch.mockResolvedValue(undefined);
		mockCanUsePilotDevGpsTestMode.mockReset();
		mockCanUsePilotDevGpsTestMode.mockReturnValue(false);
		window.localStorage.clear();
		jest.spyOn(global, "fetch").mockResolvedValue({
			ok: false,
			status: 403,
			json: async () => ({ detail: "You are not assigned to this errand" }),
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		if (originalNavigatorGeolocation) {
			Object.defineProperty(
				global.navigator,
				"geolocation",
				originalNavigatorGeolocation,
			);
		} else {
			delete global.navigator.geolocation;
		}
		if (originalWindowCapacitor) {
			Object.defineProperty(global.window, "Capacitor", originalWindowCapacitor);
		} else {
			delete global.window.Capacitor;
		}
		if (originalWindowMatchMedia) {
			Object.defineProperty(global.window, "matchMedia", originalWindowMatchMedia);
		}
		if (originalWindowSecureContext) {
			Object.defineProperty(
				global.window,
				"isSecureContext",
				originalWindowSecureContext,
			);
		}
	});

	test("prefers high-accuracy browser geolocation on coarse-pointer mobile web", async () => {
		global.fetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({}),
		});

		const browserClearWatch = jest.fn();
		const browserGetCurrentPosition = jest.fn((success) => {
			success({
				coords: {
					latitude: 6.5244,
					longitude: 3.3792,
					accuracy: 25,
					speed: 0,
					heading: null,
					altitude: null,
				},
				timestamp: Date.now(),
			});
		});
		const browserWatchPosition = jest.fn(() => 222);

		Object.defineProperty(global.navigator, "geolocation", {
			configurable: true,
			value: {
				watchPosition: browserWatchPosition,
				clearWatch: browserClearWatch,
				getCurrentPosition: browserGetCurrentPosition,
			},
		});

		Object.defineProperty(global.window, "Capacitor", {
			configurable: true,
			value: {
				isNativePlatform: () => false,
			},
		});

		Object.defineProperty(global.window, "matchMedia", {
			configurable: true,
			value: jest.fn().mockImplementation((query) => ({
				matches: query === "(pointer: coarse)",
				media: query,
				addListener: jest.fn(),
				removeListener: jest.fn(),
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
				dispatchEvent: jest.fn(),
			})),
		});

		const { result } = renderHook(() =>
			usePilotLiveTracking({
				errandId: 77,
				apiBaseUrl: "https://api.example.com",
				token: "pilot-token",
				updateInterval: 0,
				minimumUpdateInterval: 0,
			}),
		);

		await act(async () => {
			await result.current.startTracking();
		});

		expect(browserGetCurrentPosition).toHaveBeenCalledWith(
			expect.any(Function),
			expect.any(Function),
			expect.objectContaining({
				enableHighAccuracy: true,
			}),
		);
		expect(browserWatchPosition).toHaveBeenCalledWith(
			expect.any(Function),
			expect.any(Function),
			expect.objectContaining({
				enableHighAccuracy: true,
				maximumAge: 5000,
			}),
		);
	});

	test("waits for a better fix when browser geolocation is too inaccurate", async () => {
		global.fetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({}),
		});

		const browserClearWatch = jest.fn();
		const browserGetCurrentPosition = jest.fn((success) => {
			success({
				coords: {
					latitude: 6.5244,
					longitude: 3.3792,
					accuracy: 900,
					speed: 0,
					heading: null,
					altitude: null,
				},
				timestamp: Date.now(),
			});
		});
		let browserWatchSuccess;
		const browserWatchPosition = jest.fn((success) => {
			browserWatchSuccess = success;
			return 333;
		});

		Object.defineProperty(global.navigator, "geolocation", {
			configurable: true,
			value: {
				watchPosition: browserWatchPosition,
				clearWatch: browserClearWatch,
				getCurrentPosition: browserGetCurrentPosition,
			},
		});

		Object.defineProperty(global.window, "Capacitor", {
			configurable: true,
			value: {
				isNativePlatform: () => false,
			},
		});

		const { result } = renderHook(() =>
			usePilotLiveTracking({
				errandId: 77,
				apiBaseUrl: "https://api.example.com",
				token: "pilot-token",
				updateInterval: 0,
				minimumUpdateInterval: 0,
			}),
		);

		await act(async () => {
			await result.current.startTracking();
		});

		expect(result.current.tracking).toBe(false);
		expect(result.current.loadingGps).toBe(true);
		expect(result.current.error).toMatch(/more accurate live location/i);

		await act(async () => {
			browserWatchSuccess({
				coords: {
					latitude: 6.5245,
					longitude: 3.3793,
					accuracy: 45,
					speed: 0,
					heading: null,
					altitude: null,
				},
				timestamp: Date.now() + 5000,
			});
			await Promise.resolve();
		});

		await waitFor(() => {
			expect(result.current.tracking).toBe(true);
			expect(result.current.point).toEqual(
				expect.objectContaining({
					latitude: 6.5245,
					longitude: 3.3793,
					accuracy: 45,
				}),
			);
		});
	});

	test("stops tracking after backend rejects location updates with 403", async () => {
		const { Geolocation } = await import("@capacitor/geolocation");
		const { result } = renderHook(() =>
			usePilotLiveTracking({
				errandId: 77,
				apiBaseUrl: "https://api.example.com",
				token: "pilot-token",
				updateInterval: 0,
				minimumUpdateInterval: 0,
			}),
		);

		await act(async () => {
			await result.current.startTracking();
		});

		await act(async () => {
				watchCallback?.({
				coords: {
					latitude: 6.5244,
					longitude: 3.3792,
					accuracy: 10,
					speed: 0,
					heading: null,
					altitude: null,
				},
				timestamp: Date.now(),
			});
				await Promise.resolve();
		});

		await waitFor(() => {
			expect(result.current.tracking).toBe(false);
			expect(result.current.error).toMatch(/no longer assigned to you/i);
		});

			expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: "watch-1" });
	});

	test("stops an existing watch when the active errand changes", async () => {
		const { Geolocation } = await import("@capacitor/geolocation");
		const { result, rerender } = renderHook(
			({ errandId }) =>
				usePilotLiveTracking({
					errandId,
					apiBaseUrl: "https://api.example.com",
					token: "pilot-token",
					updateInterval: 0,
					minimumUpdateInterval: 0,
				}),
			{ initialProps: { errandId: 77 } },
		);

		await act(async () => {
			await result.current.startTracking();
		});

		await act(async () => {
			rerender({ errandId: 88 });
			await Promise.resolve();
		});

		await waitFor(() => {
			expect(result.current.tracking).toBe(false);
		});

		expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: "watch-1" });
	});

	test("ignores repeated watch callbacks after the first terminal 403", async () => {
		const fetchSpy = global.fetch;
		const { result } = renderHook(() =>
			usePilotLiveTracking({
				errandId: 77,
				apiBaseUrl: "https://api.example.com",
				token: "pilot-token",
				updateInterval: 0,
				minimumUpdateInterval: 0,
			}),
		);

		await act(async () => {
			await result.current.startTracking();
		});

		const point = {
			coords: {
				latitude: 6.5244,
				longitude: 3.3792,
				accuracy: 10,
				speed: 0,
				heading: null,
				altitude: null,
			},
			timestamp: Date.now(),
		};

		await act(async () => {
			watchCallback?.(point);
			await Promise.resolve();
		});

		await waitFor(() => {
			expect(result.current.tracking).toBe(false);
		});

		await act(async () => {
			watchCallback?.({ ...point, timestamp: Date.now() + 5 });
			await Promise.resolve();
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	test("includes tracking fingerprint headers on location updates", async () => {
		const fetchSpy = global.fetch;
		const { result } = renderHook(() =>
			usePilotLiveTracking({
				errandId: 77,
				apiBaseUrl: "https://api.example.com",
				token: "pilot-token",
				updateInterval: 0,
				minimumUpdateInterval: 0,
			}),
		);

		await act(async () => {
			await result.current.startTracking();
		});

		await act(async () => {
			watchCallback?.({
				coords: {
					latitude: 6.5244,
					longitude: 3.3792,
					accuracy: 10,
					speed: 0,
					heading: null,
					altitude: null,
				},
				timestamp: Date.now(),
			});
			await Promise.resolve();
		});

		await waitFor(() => {
			expect(fetchSpy).toHaveBeenCalled();
		});

		const [, requestInit] = fetchSpy.mock.calls[0];
		expect(requestInit.headers["X-EB-Tracking-Client"]).toBe("usePilotLiveTracking");
		expect(requestInit.headers["X-EB-Tracking-Client-Version"]).toBe("2026-04-12");
		expect(requestInit.headers["X-EB-Tracking-Session"]).toMatch(/^hook-/);
		expect(JSON.parse(requestInit.body)).toEqual(
			expect.objectContaining({
				errand_id: 77,
				source: "mobile_app",
			}),
		);
		expect(JSON.parse(requestInit.body).recorded_at).toMatch(/T.*Z$/);
	});

		test("queues points offline and replays them before the next live update", async () => {
			const fetchSpy = global.fetch;
			const { Geolocation } = await import("@capacitor/geolocation");
			jest.spyOn(console, "error").mockImplementation(() => {});
			Geolocation.getCurrentPosition.mockRejectedValue(
				new Error("skip quick fix for offline queue test"),
			);
			fetchSpy
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					json: async () => ({ detail: "Temporary outage" }),
				})
				.mockResolvedValue({
					ok: true,
					status: 200,
					json: async () => ({}),
				});

			const { result } = renderHook(() =>
				usePilotLiveTracking({
					errandId: 77,
					apiBaseUrl: "https://api.example.com",
					token: "pilot-token",
					updateInterval: 0,
					minimumUpdateInterval: 0,
				}),
			);

			await act(async () => {
				await result.current.startTracking();
			});

			await act(async () => {
				watchCallback?.({
					coords: {
						latitude: 6.5244,
						longitude: 3.3792,
						accuracy: 10,
						speed: 0,
						heading: null,
						altitude: null,
					},
					timestamp: Date.now(),
				});
				await Promise.resolve();
			});

			await waitFor(() => {
				expect(result.current.queuedPointsCount).toBe(1);
				expect(result.current.syncState).toBe("offline_queueing");
			});

			await act(async () => {
				watchCallback?.({
					coords: {
						latitude: 6.5344,
						longitude: 3.3892,
						accuracy: 10,
						speed: 2,
						heading: 180,
						altitude: null,
					},
					timestamp: Date.now() + 5000,
				});
				await Promise.resolve();
			});

			await waitFor(() => {
				expect(result.current.queuedPointsCount).toBe(0);
				expect(result.current.syncState).toBe("live");
			});

			expect(fetchSpy).toHaveBeenCalledTimes(3);
		});

	test("falls back to browser geolocation when Capacitor is not implemented on web", async () => {
		const { Geolocation } = await import("@capacitor/geolocation");

		Geolocation.checkPermissions.mockRejectedValue(
			new Error("Not implemented on web."),
		);
		Geolocation.requestPermissions.mockRejectedValue(
			new Error("Not implemented on web."),
		);
		Geolocation.watchPosition.mockRejectedValue(new Error("Not implemented on web."));

		global.fetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({}),
		});

		const browserClearWatch = jest.fn();
		const browserGetCurrentPosition = jest.fn((success) => {
			success({
				coords: {
					latitude: 6.5244,
					longitude: 3.3792,
					accuracy: 10,
					speed: 0,
					heading: null,
					altitude: null,
				},
				timestamp: Date.now(),
			});
		});
		const browserWatchPosition = jest.fn(() => 99);

		Object.defineProperty(global.navigator, "geolocation", {
			configurable: true,
			value: {
				watchPosition: browserWatchPosition,
				clearWatch: browserClearWatch,
				getCurrentPosition: browserGetCurrentPosition,
			},
		});

		const { result } = renderHook(() =>
			usePilotLiveTracking({
				errandId: 77,
				apiBaseUrl: "https://api.example.com",
				token: "pilot-token",
				updateInterval: 0,
				minimumUpdateInterval: 0,
			}),
		);

		await act(async () => {
			await result.current.startTracking();
		});

		expect(browserWatchPosition).toHaveBeenCalled();

		await act(async () => {
			await result.current.stopTracking();
		});

		expect(browserClearWatch).toHaveBeenCalledWith(99);
	});

	test("prefers browser geolocation on web even when Capacitor APIs exist", async () => {
		const { Geolocation } = await import("@capacitor/geolocation");

		global.fetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({}),
		});

		const browserClearWatch = jest.fn();
		const browserGetCurrentPosition = jest.fn((success) => {
			success({
				coords: {
					latitude: 6.5244,
					longitude: 3.3792,
					accuracy: 25,
					speed: 0,
					heading: null,
					altitude: null,
				},
				timestamp: Date.now(),
			});
		});
		const browserWatchPosition = jest.fn(() => 321);

		Object.defineProperty(global.navigator, "geolocation", {
			configurable: true,
			value: {
				watchPosition: browserWatchPosition,
				clearWatch: browserClearWatch,
				getCurrentPosition: browserGetCurrentPosition,
			},
		});

		Object.defineProperty(global.window, "Capacitor", {
			configurable: true,
			value: {
				isNativePlatform: () => false,
			},
		});

		const { result } = renderHook(() =>
			usePilotLiveTracking({
				errandId: 77,
				apiBaseUrl: "https://api.example.com",
				token: "pilot-token",
				updateInterval: 0,
				minimumUpdateInterval: 0,
			}),
		);

		await act(async () => {
			await result.current.startTracking();
		});

		expect(browserGetCurrentPosition).toHaveBeenCalled();
		expect(browserWatchPosition).toHaveBeenCalled();
		expect(Geolocation.watchPosition).not.toHaveBeenCalled();

		await act(async () => {
			await result.current.stopTracking();
		});

		expect(browserClearWatch).toHaveBeenCalledWith(321);
	});

	test("allows dev test GPS on local web even without a secure context", async () => {
		mockCanUsePilotDevGpsTestMode.mockReturnValue(true);
		global.fetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({}),
		});

		Object.defineProperty(global.window, "isSecureContext", {
			configurable: true,
			value: false,
		});

		const { result } = renderHook(() =>
			usePilotLiveTracking({
				errandId: 77,
				apiBaseUrl: "http://192.168.1.121:8001",
				token: "pilot-token",
				updateInterval: 0,
				minimumUpdateInterval: 0,
			}),
		);

		await act(async () => {
			await result.current.startTracking({
				devPoint: {
					latitude: 6.5244,
					longitude: 3.3792,
					accuracy: 15,
				},
			});
		});

		await waitFor(() => {
			expect(result.current.tracking).toBe(true);
			expect(result.current.error).toBeNull();
			expect(result.current.point).toEqual(
				expect.objectContaining({
					latitude: 6.5244,
					longitude: 3.3792,
				}),
			);
		});
	});
});