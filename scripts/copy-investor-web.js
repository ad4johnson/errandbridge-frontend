/* eslint-disable no-console */

const fs = require("node:fs");
const path = require("node:path");

const FRONTEND_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");

const SOURCE_DIR = path.resolve(REPO_ROOT, "document-md", "investor-web");
const CANONICAL_PDF_SOURCE = path.resolve(
	REPO_ROOT,
	"document-md",
	"INVESTOR_DECK_ERRANDBRIDGE.pdf",
);
const BUILD_DIR = path.resolve(FRONTEND_ROOT, "build");
const DEST_DIR = path.resolve(BUILD_DIR, "investors");
const DOCS_DEST_DIR = path.resolve(BUILD_DIR, "document-md");

const shouldSkip = (filePath) => {
	const base = path.basename(filePath);
	return base === ".DS_Store" || base.startsWith("._");
};

const copyInvestorWeb = () => {
	if (!fs.existsSync(BUILD_DIR)) {
		throw new Error(
			`Expected build directory at ${BUILD_DIR}. Run \"npm run build\" first.`,
		);
	}

	if (!fs.existsSync(SOURCE_DIR)) {
		console.warn(
			`[investors] Source folder not found (${SOURCE_DIR}). Skipping investor web copy.`,
		);
		return;
	}

	try {
		fs.rmSync(DEST_DIR, { recursive: true, force: true });
	} catch {
		// ignore
	}

	fs.mkdirSync(DEST_DIR, { recursive: true });

	const sourceIndexPath = path.resolve(SOURCE_DIR, "index.html");

	fs.cpSync(SOURCE_DIR, DEST_DIR, {
		recursive: true,
		filter: (src) => !shouldSkip(src) && src !== sourceIndexPath,
	});

	const deckPath = path.resolve(DEST_DIR, "deck.html");
	const pdfPath = path.resolve(DEST_DIR, "ErrandBridge-Investor-Deck.pdf");
	const canonicalPdfPath = path.resolve(DEST_DIR, "INVESTOR_DECK_ERRANDBRIDGE.pdf");
	const logoPath = path.resolve(
		DEST_DIR,
		"image",
		"INVESTOR_DECK_ERRANDBRIDGE",
		"logo-full.png",
	);

	const deckExists = fs.existsSync(deckPath);
	const pdfExists = fs.existsSync(pdfPath);

	if (!pdfExists) {
		throw new Error(
			`[investors] Copy completed but expected PDF missing. Found deck=${deckExists}, pdf=${pdfExists}`,
		);
	}

	if (!deckExists) {
		console.warn(
			"[investors] deck.html not found; continuing (PDF-first investor landing is supported).",
		);
	}

	// Publish a canonical PDF name too (useful for stable links across tooling/docs).
	try {
		if (fs.existsSync(CANONICAL_PDF_SOURCE)) {
			fs.copyFileSync(CANONICAL_PDF_SOURCE, canonicalPdfPath);
		} else {
			fs.copyFileSync(pdfPath, canonicalPdfPath);
		}
	} catch (err) {
		throw new Error(`[investors] Failed to create canonical PDF alias: ${err?.message || err}`);
	}

	if (!fs.existsSync(canonicalPdfPath)) {
		throw new Error(
			`[investors] Expected canonical PDF alias missing (${canonicalPdfPath}).`,
		);
	}

	// Guardrail: the investor landing/deck expects images; without them production will render broken.
	if (!fs.existsSync(logoPath)) {
		throw new Error(
			`[investors] Expected deck image assets missing (e.g. ${logoPath}). Ensure document-md/investor-web/image is committed and present in CI builds.`,
		);
	}

	// Also publish the PDF under a documentation-style path for stable links.
	// This enables: https://errandbridge.com/document-md/INVESTOR_DECK_ERRANDBRIDGE.pdf
	fs.mkdirSync(DOCS_DEST_DIR, { recursive: true });
	const docsPdfPath = path.resolve(DOCS_DEST_DIR, "INVESTOR_DECK_ERRANDBRIDGE.pdf");
	try {
		if (fs.existsSync(CANONICAL_PDF_SOURCE)) {
			fs.copyFileSync(CANONICAL_PDF_SOURCE, docsPdfPath);
		} else {
			fs.copyFileSync(pdfPath, docsPdfPath);
		}
	} catch (err) {
		throw new Error(`[investors] Failed to publish docs PDF: ${err?.message || err}`);
	}

	if (!fs.existsSync(docsPdfPath)) {
		throw new Error(`[investors] Expected docs PDF missing (${docsPdfPath}).`);
	}

	console.log(`[investors] Copied investor web package -> ${DEST_DIR}`);
};

copyInvestorWeb();
