/**
 * Fail-closed mode gate.
 * - `demo` (default): synthetic adapter, no network.
 * - `local`: identity and availability against the local lab backend (issue #17). Only in
 *   development builds, only with explicit loopback URLs and a publishable key.
 * Anything else, or an invalid local configuration, blocks the app. A backend failure never
 * falls back to demo: that decision is made once, here, from configuration.
 */
export interface LocalConfig {
  /** Supabase Auth gateway, e.g. http://127.0.0.1:56321 */
  readonly authUrl: string;
  /** Volon API, e.g. http://127.0.0.1:3100 */
  readonly apiUrl: string;
  /** Local Supabase publishable (anon) key; never a service-role key. */
  readonly publishableKey: string;
}

export type AppMode =
  | { kind: 'demo' }
  | { kind: 'local'; config: LocalConfig }
  | { kind: 'blocked'; requested: string; reason: string };

export interface ModeEnv {
  readonly mode?: string | undefined;
  readonly authUrl?: string | undefined;
  readonly apiUrl?: string | undefined;
  readonly publishableKey?: string | undefined;
}

/**
 * Hosts that reach the developer machine's loopback: the machine itself, the Android emulator
 * alias, and a phone through `adb reverse`. LAN or public hosts are refused because the local
 * stack only listens on loopback.
 */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '10.0.2.2']);

function loopbackOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const clean = url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
    return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname) && url.port !== '' && clean ? url.origin : null;
  } catch {
    return null;
  }
}

/** Only a Supabase publishable key is accepted (positive match), so a secret key can never pass. */
function publishableKey(value: string | undefined): string | null {
  const key = value?.trim() ?? '';
  return /^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key) ? key : null;
}

export function resolveAppMode(env: ModeEnv = readEnv(), isDevelopment: boolean = __DEV__): AppMode {
  const requested = env.mode?.trim() ?? '';
  if (requested === '' || requested === 'demo') return { kind: 'demo' };
  if (requested !== 'local') return { kind: 'blocked', requested, reason: 'Ese modo no existe en esta versión.' };
  if (!isDevelopment) return { kind: 'blocked', requested, reason: 'El modo local solo funciona en compilaciones de desarrollo.' };

  const authUrl = loopbackOrigin(env.authUrl);
  const apiUrl = loopbackOrigin(env.apiUrl);
  const key = publishableKey(env.publishableKey);
  if (!authUrl || !apiUrl) {
    return { kind: 'blocked', requested, reason: 'Las direcciones del laboratorio deben ser http://127.0.0.1, localhost o 10.0.2.2 con puerto.' };
  }
  if (!key) return { kind: 'blocked', requested, reason: 'Falta una clave publicable válida del Supabase local.' };
  return { kind: 'local', config: { authUrl, apiUrl, publishableKey: key } };
}

/** Expo inlines `EXPO_PUBLIC_*` only for static property reads like these. */
function readEnv(): ModeEnv {
  return {
    mode: process.env.EXPO_PUBLIC_COURIER_MODE,
    authUrl: process.env.EXPO_PUBLIC_COURIER_AUTH_URL,
    apiUrl: process.env.EXPO_PUBLIC_COURIER_API_URL,
    publishableKey: process.env.EXPO_PUBLIC_COURIER_PUBLISHABLE_KEY,
  };
}
