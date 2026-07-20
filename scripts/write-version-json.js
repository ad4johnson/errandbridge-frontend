/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const pkg = readJson(path.join(__dirname, '..', 'package.json'));

  const buildDir = path.join(__dirname, '..', 'build');
  const indexHtmlPath = path.join(buildDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error('[version.json] build/index.html not found. Run the CRA build first.');
    process.exit(1);
  }

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const mainMatch = indexHtml.match(/static\/js\/main\.[a-f0-9]+\.js/);
  const mainBundle = mainMatch ? mainMatch[0] : null;

  const gitSha = process.env.GITHUB_SHA || process.env.GIT_SHA || '';
  const releaseVersion = process.env.RELEASE_VERSION || process.env.REACT_APP_RELEASE_VERSION || '';
  const buildId = process.env.GITHUB_RUN_ID || process.env.BUILD_ID || '';

  const payload = {
    name: 'errandbridge-frontend',
    packageVersion: pkg.version,
    gitSha: gitSha || null,
    releaseVersion: releaseVersion || null,
    buildId: buildId || null,
    builtAt: new Date().toISOString(),
    mainBundle,
    indexSha256: sha256File(indexHtmlPath),
  };

  fs.writeFileSync(path.join(buildDir, 'version.json'), JSON.stringify(payload, null, 2) + '\n');
  fs.writeFileSync(path.join(repoRoot, 'output.json'), JSON.stringify(payload, null, 2) + '\n');

  console.log('[version.json] wrote build/version.json');
  console.log(payload);
}

main();
