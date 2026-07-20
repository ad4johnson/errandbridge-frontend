export default function PuzzleModal({
	open,
	onClose,
	puzzle,
	puzzleInput,
	setPuzzleInput,
	puzzleShowAnswer,
	puzzleAttempts,
	handlePuzzleSubmit,
	handleNextPuzzle,
}) {
	if (!open) return null;
	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				background: "#0007",
				zIndex: 1000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "20px",
			}}
		>
			<button
				type="button"
				aria-label="Close puzzle"
				onClick={onClose}
				style={{
					position: "absolute",
					inset: 0,
					background: "transparent",
					border: "none",
					cursor: "pointer",
				}}
			/>
			<div
				style={{
					background: "#fff",
					borderRadius: 16,
					padding: 32,
					width: "100%",
					maxWidth: 400,
					boxShadow: "0 4px 24px #0003",
					position: "relative",
					boxSizing: "border-box",
					zIndex: 1,
				}}
			>
				<button
					type="button"
					onClick={onClose}
					style={{
						position: "absolute",
						top: 12,
						right: 16,
						background: "none",
						border: "none",
						fontSize: 22,
						cursor: "pointer",
						color: "#888",
					}}
				>
					&times;
				</button>
				<h3 style={{ fontWeight: 700, fontSize: 22, marginBottom: 12 }}>
					Puzzle Time!
				</h3>
				<div style={{ marginBottom: 16, fontSize: 17 }}>{puzzle.q}</div>
				<form onSubmit={handlePuzzleSubmit}>
					<input
						type="text"
						value={puzzleInput}
						onChange={(e) => setPuzzleInput(e.target.value)}
						disabled={puzzleShowAnswer}
						placeholder="Your answer..."
						style={{
							width: "100%",
							padding: 8,
							fontSize: 16,
							borderRadius: 8,
							border: "1.5px solid #bfc2d9",
							marginBottom: 10,
						}}
					/>
					<button
						type="submit"
						style={{
							background: "#2563eb",
							color: "#fff",
							border: "none",
							borderRadius: 8,
							padding: "8px 18px",
							fontWeight: 600,
							fontSize: 16,
							cursor: "pointer",
							marginRight: 8,
						}}
						disabled={puzzleShowAnswer}
					>
						Submit
					</button>
					<button
						type="button"
						style={{
							background: "#f3f4f6",
							color: "#2563eb",
							border: "none",
							borderRadius: 8,
							padding: "8px 18px",
							fontWeight: 600,
							fontSize: 16,
							cursor: "pointer",
						}}
						onClick={handleNextPuzzle}
					>
						Next
					</button>
				</form>
				<div style={{ marginTop: 10, color: "#e74c3c", fontWeight: 600 }}>
					{puzzleShowAnswer && <span>Answer: {puzzle.a}</span>}
				</div>
				<div style={{ marginTop: 8, color: "#888", fontSize: 14 }}>
					Attempts: {puzzleAttempts} / 3
				</div>
			</div>
		</div>
	);
}
