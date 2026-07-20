/* eslint-disable no-console */

const http = require("http");
const fs = require("fs");
const path = require("path");

const BUILD_DIR = path.resolve(__dirname, "..", "build");

const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".mp4": "video/mp4",
	".txt": "text/plain; charset=utf-8",
};

function getArg(name, fallback) {
	const idx = process.argv.indexOf(name);
	if (idx === -1) return fallback;
	const value = process.argv[idx + 1];
	return value ?? fallback;
}

function getCacheControl(urlPath) {
	// HTML should always revalidate.
	if (urlPath.endsWith(".html") || urlPath === "/" || urlPath === "/index.html") {
		return "no-cache";
	}

	// CRA runtime manifests should revalidate.
	if (
		urlPath === "/asset-manifest.json" ||
		urlPath === "/manifest.json" ||
		urlPath === "/service-worker.js"
	) {
		return "no-cache";
	}

	// Hashed build assets: cache aggressively.
	if (urlPath.startsWith("/static/")) {
		return "public, max-age=31536000, immutable";
	}

	// Other public assets (logos, badges, videos): cache long for Lighthouse.
	return "public, max-age=31536000";
}

function acceptsHtml(req) {
	const accept = req.headers?.accept || "";
	return accept.includes("text/html") || accept.includes("*/*");
}

function isSafePath(resolvedPath) {
	const rel = path.relative(BUILD_DIR, resolvedPath);
	return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function tryStat(filePath) {
	try {
		return fs.statSync(filePath);
	} catch {
		return null;
	}
}

function serveFile(req, res, urlPath, filePath) {
	const ext = path.extname(filePath);
	const type = MIME_TYPES[ext] || "application/octet-stream";

	res.statusCode = 200;
	res.setHeader("Content-Type", type);
	res.setHeader("Cache-Control", getCacheControl(urlPath));
	res.setHeader("X-Content-Type-Options", "nosniff");

	const stream = fs.createReadStream(filePath);
	stream.on("error", () => {
		res.statusCode = 500;
		res.end("Server error");
	});
	stream.pipe(res);
}

function serveNotFound(res) {
	res.statusCode = 404;
	res.setHeader("Content-Type", "text/plain; charset=utf-8");
	res.end("Not found");
}

function serveIndex(req, res) {
	const indexPath = path.join(BUILD_DIR, "index.html");
	const stat = tryStat(indexPath);
	if (!stat?.isFile?.()) return serveNotFound(res);
	serveFile(req, res, "/index.html", indexPath);
}

const portRaw = getArg("--port", process.env.PORT || "5005");
const port = Number.parseInt(String(portRaw), 10);

const server = http.createServer((req, res) => {
	try {
		const urlObj = new URL(req.url || "/", "http://localhost");
		let urlPath = decodeURIComponent(urlObj.pathname || "/");

		// Normalize path.
		if (urlPath === "/") urlPath = "/index.html";

		const candidate = path.join(BUILD_DIR, urlPath);
		const resolved = path.resolve(candidate);

		if (!isSafePath(resolved)) {
			res.statusCode = 400;
			res.end("Bad request");
			return;
		}

		const stat = tryStat(resolved);
		if (stat?.isFile?.()) {
			serveFile(req, res, urlPath, resolved);
			return;
		}

		// SPA fallback for routes (but not for missing assets with extensions).
		if (!path.extname(urlPath) && acceptsHtml(req)) {
			serveIndex(req, res);
			return;
		}

		serveNotFound(res);
	} catch {
		res.statusCode = 500;
		res.end("Server error");
	}
});

server.listen(port, () => {
	console.log(`[serve-build-with-cache] Serving ${BUILD_DIR}`);
	console.log(`[serve-build-with-cache] http://localhost:${port}`);
});
