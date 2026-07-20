export default function Toast({ message }) {
	if (!message) return null;
	return (
		<div
			style={{
				position: "fixed",
				top: 24,
				left: "50%",
				transform: "translateX(-50%)",
				background: "#2563eb",
				color: "#fff",
				padding: "12px 32px",
				borderRadius: 10,
				fontWeight: 600,
				fontSize: 16,
				zIndex: 2000,
				boxShadow: "0 2px 12px #0002",
			}}
		>
			{message}
		</div>
	);
}
