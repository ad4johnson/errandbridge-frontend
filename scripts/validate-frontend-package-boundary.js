#!/usr/bin/env node
/*
 * Validate that frontend deploy/mobile packages contain only frontend assets.
 *
 * This is intentionally path-based rather than content-based: frontend bundles
 * are allowed to contain API URLs/strings, but must never package backend source,
 * Python files, Docker configs, databases, uploads, or Alembic migrations.
 */
const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');

const packageDirs = [
  path.join(frontendRoot, 'build'),
  path.join(frontendRoot, 'android', 'app', 'src', 'main', 'assets', 'public'),
  path.join(frontendRoot, 'ios', 'App', 'App', 'public'),
];

const forbiddenPathParts = new Set([
  'errandbridge-backend',
  'alembic',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.venv',
  'uploads',
]);

const forbiddenFileNames = new Set([
  'Dockerfile',
  'docker-compose.yml',
  'requirements.txt',
  'alembic.ini',
  'main.py',
  'database.py',
  'schema.py',
  'auth.py',
  'prestart.sh',
  'rds-global-bundle.pem',
]);

const forbiddenExtensions = new Set([
  '.py',
  '.pyc',
  '.pyo',
  '.db',
  '.sqlite',
  '.sqlite3',
]);

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function walk(dir, visitor) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Unable to read ${dir}: ${error.message}`);
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    visitor(fullPath, entry);
    if (entry.isDirectory()) {
      walk(fullPath, visitor);
    }
  }
}

function isForbiddenPackagedPath(fullPath) {
  const relativeToRepo = path.relative(repoRoot, fullPath);
  const parts = relativeToRepo.split(path.sep).filter(Boolean);
  const basename = path.basename(fullPath);
  const ext = path.extname(basename).toLowerCase();

  if (parts.some((part) => forbiddenPathParts.has(part))) {
    return 'forbidden backend/runtime directory marker';
  }
  if (forbiddenFileNames.has(basename)) {
    return 'forbidden backend/config file name';
  }
  if (forbiddenExtensions.has(ext)) {
    return 'forbidden backend/runtime file extension';
  }
  return null;
}

const violations = [];
const scanned = [];

for (const packageDir of packageDirs) {
  if (!exists(packageDir)) continue;
  scanned.push(path.relative(repoRoot, packageDir));
  walk(packageDir, (fullPath) => {
    const reason = isForbiddenPackagedPath(fullPath);
    if (reason) {
      violations.push({
        reason,
        path: path.relative(repoRoot, fullPath),
      });
    }
  });
}

if (!scanned.length) {
  console.warn('[package-boundary] No frontend package directories found yet; run npm run build first.');
  process.exit(0);
}

if (violations.length) {
  console.error('❌ Frontend package boundary failed. Backend/runtime files must not be shipped in web/mobile packages.');
  for (const item of violations.slice(0, 80)) {
    console.error(` - ${item.path} (${item.reason})`);
  }
  if (violations.length > 80) {
    console.error(` - ...and ${violations.length - 80} more`);
  }
  process.exit(1);
}

console.log(`✅ Frontend package boundary clean (${scanned.join(', ')})`);
