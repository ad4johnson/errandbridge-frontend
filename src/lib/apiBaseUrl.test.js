import {
	getCapacitorHostedBaseUrl,
	getCapacitorLoopbackFallbackUrl,
	getRuntimeApiBaseOverride,
	isHostedApiBaseUrl,
	isLocalLikeApiBaseUrl,
	isLoopbackApiBaseUrl,
	normalizeCapacitorLoopbackBaseUrl,
	resolveApiBaseUrl,
	setRuntimeApiBaseOverride,
} from "./apiBaseUrl";

const withMockedCapacitorIos = (callback) => {
	const originalCapacitor = window.Capacitor;
	const originalNavigator = window.navigator;

	window.Capacitor = {
		getPlatform: () => "ios",
	};
	Object.defineProperty(window, "navigator", {
		configurable: true,
		value: {
			...(originalNavigator || {}),
			userAgent: "iPhone",
		},
	});

	try {
		callback();
	} finally {
		window.Capacitor = originalCapacitor;
		Object.defineProperty(window, "navigator", {
			configurable: true,
			value: originalNavigator,
		});
	}
};

const withMockedCapacitorAndroid = (callback) => {
	const originalCapacitor = window.Capacitor;
	const originalNavigator = window.navigator;

	window.Capacitor = {
		getPlatform: () => "android",
	};
	Object.defineProperty(window, "navigator", {
		configurable: true,
		value: {
			...(originalNavigator || {}),
			userAgent: "Android",
		},
	});

	try {
		callback();
	} finally {
		window.Capacitor = originalCapacitor;
		Object.defineProperty(window, "navigator", {
			configurable: true,
			value: originalNavigator,
		});
	}
};

const withEnv = (overrides, callback) => {
	const originals = new Map();

	Object.entries(overrides).forEach(([key, value]) => {
		originals.set(key, process.env[key]);
		if (typeof value === "undefined") {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	});

	try {
		callback();
	} finally {
		originals.forEach((value, key) => {
			if (typeof value === "undefined") {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		});
	}
};

describe("apiBaseUrl iOS loopback normalization", () => {
	afterEach(() => {
		setRuntimeApiBaseOverride("");
	});

	test("normalizes localhost to 127.0.0.1 for Capacitor iOS", () => {
		expect(
			normalizeCapacitorLoopbackBaseUrl("http://localhost:8001", "ios"),
		).toBe("http://localhost:8001");
	});

	test("normalizes stale iOS loopback port 8000 to 8001", () => {
		expect(
			normalizeCapacitorLoopbackBaseUrl("http://localhost:8000", "ios"),
		).toBe("http://localhost:8001");
		expect(
			normalizeCapacitorLoopbackBaseUrl("http://127.0.0.1:8000", "ios"),
		).toBe("http://127.0.0.1:8001");
	});

	test("preserves explicit non-8000 iOS loopback ports", () => {
		expect(
			normalizeCapacitorLoopbackBaseUrl("http://localhost:9000", "ios"),
		).toBe("http://localhost:9000");
		expect(
			normalizeCapacitorLoopbackBaseUrl("http://127.0.0.1:9000", "ios"),
		).toBe("http://127.0.0.1:9000");
	});

	test("keeps android loopback urls unchanged", () => {
		expect(
			normalizeCapacitorLoopbackBaseUrl("http://10.0.2.2:8001", "android"),
		).toBe("http://10.0.2.2:8001");
	});

	test("returns alternate loopback host for iOS retry", () => {
		expect(
			getCapacitorLoopbackFallbackUrl("http://127.0.0.1:8001/graphql", "ios"),
		).toBe("http://localhost:8001/graphql");
	});

	test("prefers explicit device API only when device mode is enabled", () => {
		withMockedCapacitorIos(() => {
			withEnv(
				{
					REACT_APP_FORCE_API_BASE: "false",
					REACT_APP_FORCED_API_BASE: undefined,
					REACT_APP_USE_DEVICE_API: "false",
					REACT_APP_DEVICE_API_BASE: "http://192.168.0.50:8001",
				},
				() => {
						expect(resolveApiBaseUrl()).toBe("http://localhost:8001");

					process.env.REACT_APP_USE_DEVICE_API = "true";
					expect(resolveApiBaseUrl()).toBe("http://192.168.0.50:8001");
				},
			);
		});
	});

	test("device API mode ignores runtime override (does not clear it)", () => {
		withMockedCapacitorIos(() => {
			withEnv(
				{
					REACT_APP_USE_DEVICE_API: "true",
					REACT_APP_DEVICE_API_BASE: "http://192.168.0.50:8001",
					REACT_APP_FORCE_API_BASE: "false",
					REACT_APP_FORCED_API_BASE: undefined,
				},
				() => {
					setRuntimeApiBaseOverride("http://127.0.0.1:8001");
					expect(resolveApiBaseUrl()).toBe("http://192.168.0.50:8001");
					expect(getRuntimeApiBaseOverride()).toBe("http://127.0.0.1:8001");
				},
			);
		});
	});

	test("ignores stale platform-specific Capacitor override unless explicitly forced", () => {
		withMockedCapacitorIos(() => {
			withEnv(
				{
					REACT_APP_FORCED_API_BASE: undefined,
					REACT_APP_CAPACITOR_API_BASE_IOS: "http://192.168.1.123:8001",
					REACT_APP_USE_DEVICE_API: "false",
					REACT_APP_FORCE_API_BASE: "false",
					REACT_APP_CAPACITOR_USE_HOSTED_API: "false",
				},
				() => {
						expect(resolveApiBaseUrl()).toBe("http://localhost:8001");

					process.env.REACT_APP_FORCE_API_BASE = "true";
					expect(resolveApiBaseUrl()).toBe("http://192.168.1.123:8001");
				},
			);
		});
	});

	test("uses hosted API only when Capacitor hosted mode is explicitly enabled", () => {
		withMockedCapacitorIos(() => {
			withEnv(
				{
					REACT_APP_CAPACITOR_USE_HOSTED_API: "true",
					REACT_APP_API_BASE: "https://api.errandbridge.com",
					REACT_APP_USE_DEVICE_API: "false",
					REACT_APP_FORCE_API_BASE: "false",
				},
				() => {
					expect(resolveApiBaseUrl()).toBe("https://api.errandbridge.com");
				},
			);
		});
	});

	test("forced API base overrides platform-specific Capacitor local defaults", () => {
		withMockedCapacitorAndroid(() => {
			withEnv(
				{
					REACT_APP_FORCE_API_BASE: "true",
					REACT_APP_FORCED_API_BASE: "https://api.errandbridge.com",
					REACT_APP_CAPACITOR_API_BASE_ANDROID: "http://10.0.2.2:8001",
					REACT_APP_USE_DEVICE_API: "false",
				},
				() => {
					expect(resolveApiBaseUrl()).toBe("https://api.errandbridge.com");
				},
			);
		});
	});

	test("defaults production Capacitor builds to hosted API", () => {
		withMockedCapacitorIos(() => {
			withEnv(
				{
					NODE_ENV: "production",
					REACT_APP_CAPACITOR_USE_HOSTED_API: "false",
					REACT_APP_API_BASE: "https://api.errandbridge.com",
					REACT_APP_USE_DEVICE_API: "false",
					REACT_APP_FORCE_API_BASE: "false",
				},
				() => {
					expect(resolveApiBaseUrl()).toBe("https://api.errandbridge.com");
				},
			);
		});
	});

	test("respects loopback runtime override in production Capacitor builds", () => {
		withMockedCapacitorIos(() => {
			withEnv(
				{
					NODE_ENV: "production",
					REACT_APP_API_BASE: "https://api.errandbridge.com",
					REACT_APP_USE_DEVICE_API: "false",
					REACT_APP_FORCE_API_BASE: "false",
				},
				() => {
					setRuntimeApiBaseOverride("http://127.0.0.1:8001");
					expect(resolveApiBaseUrl()).toBe("http://127.0.0.1:8001");
					expect(getRuntimeApiBaseOverride()).toBe("http://127.0.0.1:8001");
				},
			);
		});
	});

	test("respects LAN runtime override in production Capacitor builds", () => {
		withMockedCapacitorIos(() => {
			withEnv(
				{
					NODE_ENV: "production",
					REACT_APP_API_BASE: "https://api.errandbridge.com",
					REACT_APP_USE_DEVICE_API: "false",
					REACT_APP_FORCE_API_BASE: "false",
				},
				() => {
					setRuntimeApiBaseOverride("http://192.168.1.42:8001");
					expect(resolveApiBaseUrl()).toBe("http://192.168.1.42:8001");
					expect(getRuntimeApiBaseOverride()).toBe("http://192.168.1.42:8001");
				},
			);
		});
	});

	test("persists and resolves runtime override before capacitor defaults", () => {
		withMockedCapacitorIos(() => {
			setRuntimeApiBaseOverride("https://api.errandbridge.com");
			expect(getRuntimeApiBaseOverride()).toBe("https://api.errandbridge.com");
			expect(resolveApiBaseUrl()).toBe("https://api.errandbridge.com");
		});
	});

	test("normalizes stale iOS loopback runtime override port to 8001", () => {
		withMockedCapacitorIos(() => {
			setRuntimeApiBaseOverride("http://127.0.0.1:8000");
			expect(resolveApiBaseUrl()).toBe("http://127.0.0.1:8001");
		});
	});

	test("clears malformed runtime override hosts", () => {
		withMockedCapacitorIos(() => {
			setRuntimeApiBaseOverride("http://172.0.0:8001");
			expect(getRuntimeApiBaseOverride()).toBeUndefined();

			setRuntimeApiBaseOverride("http://172.0.0.5:8001");
			expect(getRuntimeApiBaseOverride()).toBeUndefined();
		});
	});

	test("identifies loopback api bases and exposes hosted fallback base", () => {
		expect(isLoopbackApiBaseUrl("http://localhost:8001")).toBe(true);
		expect(isLoopbackApiBaseUrl("http://127.0.0.1:8001")).toBe(true);
		expect(isLoopbackApiBaseUrl("https://api.errandbridge.com")).toBe(false);
		expect(isLocalLikeApiBaseUrl("http://192.168.1.42:8001")).toBe(true);
		expect(isLocalLikeApiBaseUrl("http://10.0.2.2:8001")).toBe(true);
		expect(isHostedApiBaseUrl("https://api.errandbridge.com")).toBe(true);
		expect(isHostedApiBaseUrl("http://192.168.1.42:8001")).toBe(false);
		expect(getCapacitorHostedBaseUrl()).toBeTruthy();
	});

	test("prefers local API when running on localhost (even in production builds)", () => {
		// JSDOM defaults to localhost, but make it explicit for readability.
		try {
			window.history.pushState({}, "", "http://localhost:3000/");
		} catch {
			// ignore
		}

		withEnv(
			{
				NODE_ENV: "production",
				REACT_APP_API_BASE: "https://api.errandbridge.com",
				REACT_APP_LOCAL_API_BASE: "http://localhost:8001",
				REACT_APP_FORCE_API_BASE: "false",
				REACT_APP_USE_DEVICE_API: "false",
				REACT_APP_DEVICE_API_BASE: undefined,
			},
			() => {
				setRuntimeApiBaseOverride("");
				expect(resolveApiBaseUrl()).toBe("http://localhost:8001");
			},
		);
	});

	test("can force hosted API on localhost via REACT_APP_FORCE_API_BASE", () => {
		try {
			window.history.pushState({}, "", "http://localhost:3000/");
		} catch {
			// ignore
		}

		withEnv(
			{
				NODE_ENV: "production",
				REACT_APP_API_BASE: "https://api.errandbridge.com",
				REACT_APP_LOCAL_API_BASE: "http://localhost:8001",
				REACT_APP_FORCE_API_BASE: "true",
				REACT_APP_USE_DEVICE_API: "false",
				REACT_APP_DEVICE_API_BASE: undefined,
			},
			() => {
				setRuntimeApiBaseOverride("");
				expect(resolveApiBaseUrl()).toBe("https://api.errandbridge.com");
			},
		);
	});

	test("ignores a stale hosted runtime override on localhost web", () => {
		try {
			window.history.pushState({}, "", "http://localhost:3000/login");
		} catch {
			// ignore
		}

		withEnv(
			{
				NODE_ENV: "development",
				REACT_APP_API_BASE: "http://localhost:8001",
				REACT_APP_LOCAL_API_BASE: "http://localhost:8001",
				REACT_APP_FORCE_API_BASE: "false",
				REACT_APP_USE_DEVICE_API: "false",
				REACT_APP_DEVICE_API_BASE: undefined,
			},
			() => {
				setRuntimeApiBaseOverride("https://api.errandbridge.com");
				expect(getRuntimeApiBaseOverride()).toBe("https://api.errandbridge.com");
				expect(resolveApiBaseUrl()).toBe("http://localhost:8001");
			},
		);
	});

	test("ignores a stale LAN runtime override on localhost web", () => {
		try {
			window.history.pushState({}, "", "http://localhost:3000/login");
		} catch {
			// ignore
		}

		withEnv(
			{
				NODE_ENV: "development",
				REACT_APP_API_BASE: "http://localhost:8001",
				REACT_APP_LOCAL_API_BASE: "http://localhost:8001",
				REACT_APP_FORCE_API_BASE: "false",
				REACT_APP_USE_DEVICE_API: "false",
				REACT_APP_DEVICE_API_BASE: undefined,
			},
			() => {
				setRuntimeApiBaseOverride("http://192.168.1.42:8001");
				expect(getRuntimeApiBaseOverride()).toBe("http://192.168.1.42:8001");
				expect(resolveApiBaseUrl()).toBe("http://localhost:8001");
			},
		);
	});

	test("ignores device API mode on localhost web even when local env enables it", () => {
		try {
			window.history.pushState({}, "", "http://localhost:3000/login");
		} catch {
			// ignore
		}

		withEnv(
			{
				NODE_ENV: "development",
				REACT_APP_API_BASE: "http://localhost:8001",
				REACT_APP_LOCAL_API_BASE: "http://localhost:8001",
				REACT_APP_FORCE_API_BASE: "true",
				REACT_APP_USE_DEVICE_API: "true",
				REACT_APP_DEVICE_API_BASE: "http://192.168.1.121:8001",
			},
			() => {
				setRuntimeApiBaseOverride("");
				expect(resolveApiBaseUrl()).toBe("http://localhost:8001");
			},
		);
	});
});
