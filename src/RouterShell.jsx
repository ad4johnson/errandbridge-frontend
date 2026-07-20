import { BrowserRouter } from "react-router-dom";

import RootRoutes from "./RootRoutes";

export default function RouterShell() {
	return (
		<BrowserRouter
			future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
		>
			<RootRoutes />
		</BrowserRouter>
	);
}
