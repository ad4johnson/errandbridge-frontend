export function isSupportIntent(text: string): boolean {
	const t = String(text || "").toLowerCase();
	return (
		t.includes("support") ||
		t.includes("help") ||
		t.includes("issue") ||
		t.includes("problem") ||
		t.includes("complaint") ||
		t.includes("refund") ||
		t.includes("dispute")
	);
}

export function isStatusIntent(text: string): boolean {
	const t = String(text || "").toLowerCase();
	return (
		t.includes("track") ||
		t.includes("tracking") ||
		t.includes("status") ||
		t.includes("where is") ||
		t.includes("progress") ||
		t.includes("eta") ||
		t.includes("update")
	);
}
