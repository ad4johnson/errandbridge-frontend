#!/usr/bin/env node

/**
 * Build + sync Android with a device-reachable API base.
 *
 * Defaults:
 * - If --emulator is passed, uses http://10.0.2.2:8001
 * - Otherwise, attempts to auto-detect your Mac's LAN IP and uses http://<LAN_IP>:8001
 * - Falls back to http://localhost:8001 if no LAN IP is detected
 */

const { spawnSync } = require("node:child_process");
const os = require("node:os");

function isPrivateIpv4(address) {
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(String(address || ""))) return false;
    return (
        address.startsWith("10.") ||
        address.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
    );
}

function scoreInterface(name = "") {
    const key = String(name || "").toLowerCase();
    if (key === "en0") return 100;
    if (key === "en1") return 95;
    if (key.startsWith("en")) return 90;
    if (key.startsWith("bridge")) return 80;
    if (key.startsWith("utun")) return 10;
    if (key.startsWith("lo")) return 0;
    return 50;
}

function detectCurrentLanIp() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const [name, entries] of Object.entries(interfaces)) {
        for (const entry of entries || []) {
            if (!entry || entry.internal || entry.family !== "IPv4") continue;
            if (!isPrivateIpv4(entry.address)) continue;
            candidates.push({
                name,
                address: entry.address,
                score: scoreInterface(name),
            });
        }
    }

    candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return candidates[0] || null;
}

function run(command, args, env) {
    const result = spawnSync(command, args, {
        stdio: "inherit",
        env,
        shell: false,
    });
    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

const rawArgs = new Set(process.argv.slice(2));
const printOnly = rawArgs.has("--print-only") || rawArgs.has("--dry-run");
const useEmulator = rawArgs.has("--emulator");
const forceLocalhost = rawArgs.has("--localhost");

let resolvedBase = "http://localhost:8001";

if (forceLocalhost) {
    resolvedBase = "http://localhost:8001";
    console.log(
        "[cap:sync:android:localhost-api] Using http://localhost:8001 (requires adb reverse for emulator/device).",
    );
} else if (useEmulator) {
    resolvedBase = "http://10.0.2.2:8001";
} else {
    const candidate = detectCurrentLanIp();
    resolvedBase = candidate ? `http://${candidate.address}:8001` : "http://localhost:8001";
    if (candidate) {
        console.log(
            `[cap:sync:android:auto-api] Using ${candidate.address} from ${candidate.name} for local backend access.`,
        );
    } else {
        console.warn(
            "[cap:sync:android:auto-api] No private LAN IPv4 detected; falling back to http://localhost:8001.",
        );
    }
}

if (printOnly) {
    console.log(resolvedBase);
    process.exit(0);
}

const env = {
    ...process.env,
    REACT_APP_USE_DEVICE_API: "true",
    REACT_APP_DEVICE_API_BASE: resolvedBase,
};

run("npm", ["run", "build"], env);
run("npx", ["cap", "sync", "android"], env);
