function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function streamTextChunks(
	fullText,
	onChunk,
	{ minDelay = 10, maxDelay = 24, punctuationDelay = 70 } = {},
) {
	const text = String(fullText || "");
	if (!text) {
		onChunk?.("");
		return;
	}

	// Tests should be deterministic and fast.
	// Streaming + random delays are great for UX, but they can introduce flakes in Jest.
	// In test env, preserve progressive chunk semantics without introducing real time delays.
	if (process.env.NODE_ENV === "test") {
		let acc = "";
		for (const char of text) {
			acc += char;
			onChunk?.(acc);
		}
		return;
	}

	let acc = "";
	for (const char of text) {
		acc += char;
		onChunk?.(acc);
		const baseDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
		const extraDelay = /[.,!?]/.test(char) ? punctuationDelay : 0;
		await wait(Math.max(0, baseDelay + extraDelay));
	}
}