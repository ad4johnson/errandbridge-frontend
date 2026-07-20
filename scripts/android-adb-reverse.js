#!/usr/bin/env node

/**
 * Ensure Android emulator/device can reach a host-local backend via http://localhost:<port>
 * by running: adb reverse tcp:<port> tcp:<port>
 *
 * Why: In Android Studio runs, "localhost" inside the app normally points to the
 * emulator/device itself, not your Mac. `adb reverse` makes localhost work.
 *
 * Usage:
 *   node scripts/android-adb-reverse.js --port 8001
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function parseArgs(argv) {
    const args = new Set(argv);
    let port = 8001;
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === "--port" && argv[i + 1]) {
            const parsed = Number(argv[i + 1]);
            if (Number.isFinite(parsed) && parsed > 0) port = parsed;
        }
    }
    return { port, dryRun: args.has("--dry-run") || args.has("--print-only") };
}

function findAdb() {
    // 1) Respect explicit env vars
    const envRoots = [process.env.ANDROID_SDK_ROOT, process.env.ANDROID_HOME]
        .filter(Boolean)
        .map((p) => String(p));
    for (const root of envRoots) {
        const candidate = path.join(root, "platform-tools", "adb");
        if (fs.existsSync(candidate)) return candidate;
    }

    // 2) Common macOS default
    const macDefault = path.join(os.homedir(), "Library", "Android", "sdk", "platform-tools", "adb");
    if (fs.existsSync(macDefault)) return macDefault;

    // 3) Fall back to PATH
    return "adb";
}

function run(command, args, options = {}) {
    return spawnSync(command, args, {
        stdio: options.stdio || "inherit",
        shell: false,
        env: process.env,
    });
}

const { port, dryRun } = parseArgs(process.argv.slice(2));
const adb = findAdb();

if (dryRun) {
    console.log(JSON.stringify({ adb, port }, null, 2));
    process.exit(0);
}

// Check that adb exists when we're using an absolute path.
if (path.isAbsolute(adb) && !fs.existsSync(adb)) {
    console.error(`[adb-reverse] adb not found at: ${adb}`);
    process.exit(1);
}

// Show devices (non-fatal if none)
const devices = run(adb, ["devices"], { stdio: "pipe" });
const devicesOut = String(devices.stdout || "");
const hasDevice = devicesOut
    .split("\n")
    .slice(1)
    .some((line) => /\bdevice\b/.test(line) && !/\boffline\b/.test(line));

if (!hasDevice) {
    console.warn("[adb-reverse] No Android device/emulator detected. Start the emulator/device, then re-run.");
    console.warn("[adb-reverse] Tip: Android emulator users can also use http://10.0.2.2:8001 without adb reverse.");
    process.exit(0);
}

const reverseArgs = ["reverse", `tcp:${port}`, `tcp:${port}`];
console.log(`[adb-reverse] Running: ${adb} ${reverseArgs.join(" ")}`);
const result = run(adb, reverseArgs);
if (result.status !== 0) {
    process.exit(result.status || 1);
}

console.log(`[adb-reverse] OK. Android app can use http://localhost:${port}`);
