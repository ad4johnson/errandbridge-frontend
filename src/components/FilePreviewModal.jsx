import { useEffect, useMemo } from "react";

const FilePreviewModal = ({ open, url, filename, title, onClose }) => {
	const safeTitle = title || filename || "Preview";
	const canRender = Boolean(open && url);

	const downloadName = useMemo(() => {
		if (filename && typeof filename === "string") return filename;
		return "download";
	}, [filename]);

	useEffect(() => {
		if (!canRender) return undefined;
		const onKeyDown = (event) => {
			if (event.key === "Escape") onClose?.();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [canRender, onClose]);

	if (!canRender) return null;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(15, 23, 42, 0.55)",
				zIndex: 4000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 16,
			}}
			role="dialog"
			aria-modal="true"
			aria-label={safeTitle}
		>
			<button
				type="button"
				aria-label="Close preview"
				onClick={() => onClose?.()}
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
					width: "min(1100px, calc(100vw - 32px))",
					height: "min(780px, calc(100vh - 32px))",
					background: "#fff",
					borderRadius: 16,
					boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
					overflow: "hidden",
					position: "relative",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
						padding: "12px 14px",
						borderBottom: "1px solid #e5e7eb",
						background: "linear-gradient(180deg, #ffffff, #f8fafc)",
					}}
				>
					<div
						style={{
							fontWeight: 800,
							fontSize: 14,
							color: "#111827",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
						title={safeTitle}
					>
						{safeTitle}
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<a
							href={url}
							download={downloadName}
							style={{
								padding: "8px 10px",
								borderRadius: 10,
								border: "1px solid #e5e7eb",
								background: "#fff",
								color: "#111827",
								fontSize: 12,
								fontWeight: 800,
								textDecoration: "none",
								cursor: "pointer",
							}}
							title="Download"
						>
							⬇️ Download
						</a>
						<button
							type="button"
							onClick={() => onClose?.()}
							style={{
								width: 34,
								height: 34,
								borderRadius: 999,
								border: "1px solid #e5e7eb",
								background: "#fff",
								cursor: "pointer",
								fontSize: 18,
								lineHeight: "32px",
								fontWeight: 900,
								color: "#374151",
							}}
							aria-label="Close"
						>
							×
						</button>
					</div>
				</div>

				<div style={{ flex: 1, background: "#0b1220" }}>
					<iframe
						title={safeTitle}
						src={url}
						style={{ width: "100%", height: "100%", border: "none" }}
					/>
				</div>
			</div>
		</div>
	);
};

export default FilePreviewModal;
