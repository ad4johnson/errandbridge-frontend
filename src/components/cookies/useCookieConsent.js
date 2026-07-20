import { useCallback, useEffect, useState } from "react";
import {
	defaultConsent,
	getStoredCookieConsent,
	saveCookieConsent,
} from "./cookie-consent";

export function useCookieConsent() {
	const [consent, setConsent] = useState(defaultConsent);
	const [resolved, setResolved] = useState(false);

	useEffect(() => {
		const stored = getStoredCookieConsent();
		if (stored) setConsent(stored);
		setResolved(Boolean(stored?.consentGiven));
	}, []);

	const updateConsent = useCallback((next) => {
		saveCookieConsent(next);
		setConsent(next);
		setResolved(Boolean(next?.consentGiven));
	}, []);

	return { consent, resolved, updateConsent };
}
