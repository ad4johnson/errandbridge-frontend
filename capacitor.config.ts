import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CapacitorConfig } from '@capacitor/cli';

function normalizeEnv(v: string | undefined): string | undefined {
  const s = (v ?? '').trim();
  return s ? s : undefined;
}

function normalizeBool(v: string | undefined): boolean {
  const s = (v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function detectCapacitorPlatform(): 'ios' | 'android' | undefined {
  const explicit = normalizeEnv(process.env.CAPACITOR_PLATFORM)?.toLowerCase();
  if (explicit === 'ios' || explicit === 'android') return explicit;

  // Heuristic: when Capacitor CLI loads this config, its argv typically includes the platform
  // (e.g. `npx cap sync ios`). We use this to pick the right platform-specific live-reload URL.
  try {
    const argv = (process.argv || []).map((a) => String(a).toLowerCase());
    if (argv.includes('ios')) return 'ios';
    if (argv.includes('android')) return 'android';
  } catch {
    // ignore
  }
  return undefined;
}

function readDotenvFileValue(filePath: string, key: string): string | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    let found: string | undefined;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const k = match[1];
      if (k !== key) continue;
      let v = match[2] ?? '';
      // Strip inline comments for unquoted values: KEY=value # comment
      if (!(v.startsWith('"') || v.startsWith("'"))) {
        v = v.split(' #')[0].trim();
      }
      // Unquote simple quoted values
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      found = v;
    }
    return found;
  } catch {
    return undefined;
  }
}

function readDotenvValue(key: string): string | undefined {
  // Deterministic resolution anchored to this config file's directory.
  // NOTE: We intentionally ONLY read the dedicated Capacitor dotenv files here.
  // This prevents a stray shell env var or generic `.env` from forcing the native
  // apps into live-reload mode (which causes "Could not connect to the server"
  // when the dev server isn't running).
  const candidates = [
    path.resolve(__dirname, '.env.capacitor'),
    path.resolve(__dirname, '.env.capacitor.local'),
  ];

  for (const p of candidates) {
    const v = readDotenvFileValue(p, key);
    if (v !== undefined) return v;
  }
  return undefined;
}

const platform = detectCapacitorPlatform();

// IMPORTANT: Default to loading bundled assets (webDir) for native shells.
// Live-reload should only be enabled explicitly; otherwise you'll get
// "Could not connect to the server" if the dev server isn't running.
const liveReloadEnabled = normalizeBool(readDotenvValue('CAPACITOR_LIVE_RELOAD'));

const serverUrl = liveReloadEnabled
  ? normalizeEnv(
      // Prefer platform-specific keys written by scripts/set-capacitor-server-url.js
      (platform === 'ios' ? readDotenvValue('CAPACITOR_SERVER_URL_IOS') : undefined)
        || (platform === 'android' ? readDotenvValue('CAPACITOR_SERVER_URL_ANDROID') : undefined)
        || readDotenvValue('CAPACITOR_SERVER_URL')
        // Back-compat keys (legacy)
        || (platform === 'ios' ? readDotenvValue('REACT_APP_CAPACITOR_SERVER_URL_IOS') : undefined)
        || (platform === 'android' ? readDotenvValue('REACT_APP_CAPACITOR_SERVER_URL_ANDROID') : undefined)
        || readDotenvValue('REACT_APP_CAPACITOR_SERVER_URL')
    )
  : undefined;

const allowNavigation = [
  '*.errandbridge.com',
  'localhost',
  '127.0.0.1',
  // Android emulator host mappings
  '10.0.2.2',
  '10.0.3.2',
  'app.local',
];

// If the server URL is set, automatically allow its hostname too (useful for
// physical devices where the URL is a LAN IP).
if (serverUrl) {
  try {
    const u = new URL(serverUrl);
    if (u.hostname && !allowNavigation.includes(u.hostname)) {
      allowNavigation.push(u.hostname);
    }
  } catch {
    // ignore
  }
}

const config: CapacitorConfig = {
  appId: 'com.errandbridge.app',
  appName: 'ErrandBridge',
  webDir: 'build',
  server: {
    url: serverUrl || undefined,
    cleartext: true,
    iosScheme: 'capacitor',
    androidScheme: 'http',
    allowNavigation
  }
};

export default config;
