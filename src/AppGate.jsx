import { lazy, useMemo } from "react";
import { useLocation } from "react-router-dom";

const FullApp = lazy(() => import("./App"));
const LandingApp = lazy(() => import("./LandingApp"));

const isLandingPathname = (pathname = "") => {
	const p = pathname || "/";
	// Keep the lightweight marketing shell available only on the explicit
	// performance route so the public root URL stays aligned with /home.
	return p === "/lite";
};

const hasCustomerAuthToken = () => {
	try {
		// App.js uses "authToken" in multiple places; some legacy flows used "token".
		return Boolean(localStorage.getItem("authToken") || localStorage.getItem("token"));
	} catch {
		return false;
	}
};

export default function AppGate() {
	const location = useLocation();
	const pathname = location?.pathname || "/";

	const shouldUseLanding = useMemo(() => {
		// Keep the fastest possible landing only on the explicit lite route.
		if (!isLandingPathname(pathname)) return false;
		// Preserve existing behavior for signed-in users hitting "/".
		if (hasCustomerAuthToken()) return false;
		return true;
	}, [pathname]);

	const Component = shouldUseLanding ? LandingApp : FullApp;
	return <Component />;
}
