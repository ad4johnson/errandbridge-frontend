#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const buildGradlePath = path.resolve(__dirname, '..', 'android', 'app', 'build.gradle');
const dryRun = process.argv.includes('--dry-run');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseVersionName(versionName) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(versionName);
  if (!match) {
    fail(`Unsupported Android versionName format: ${versionName}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

const source = fs.readFileSync(buildGradlePath, 'utf8');

const versionCodeMatch = source.match(/versionCode\s+(\d+)/);
const versionNameMatch = source.match(/versionName\s+"([^"]+)"/);

if (!versionCodeMatch || !versionNameMatch) {
  fail('Could not find versionCode/versionName in android/app/build.gradle');
}

const currentVersionCode = Number(versionCodeMatch[1]);
const currentVersionName = versionNameMatch[1];
const parsed = parseVersionName(currentVersionName);

const nextVersionCode = currentVersionCode + 1;
const nextVersionName = `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;

const updated = source
  .replace(/versionCode\s+\d+/, `versionCode ${nextVersionCode}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${nextVersionName}"`);

if (!dryRun) {
  fs.writeFileSync(buildGradlePath, updated);
}

const summary = {
  file: buildGradlePath,
  currentVersionCode,
  nextVersionCode,
  currentVersionName,
  nextVersionName,
  dryRun,
};

console.log(JSON.stringify(summary, null, 2));
