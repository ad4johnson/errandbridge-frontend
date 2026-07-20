import { streamTextChunks } from "./messageStream";

describe("streamTextChunks", () => {
	test("emits progressive chunks and ends with the full string", async () => {
		const chunks = [];
		await streamTextChunks("Hello", (value) => chunks.push(value), {
			minDelay: 0,
			maxDelay: 0,
			punctuationDelay: 0,
		});

		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks[0]).toBe("H");
		expect(chunks[chunks.length - 1]).toBe("Hello");
	});
});