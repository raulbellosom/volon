import type { Session } from '../api/merchant-api.ts';

// Tab-scoped storage: the bearer token dies with the tab and is never shared across windows.
// Values are wrapped in try/catch because storage can be blocked (private mode, policies).

const SESSION_KEY = 'volon-merchant-session';
const BRANCH_KEY = 'volon-merchant-branch';

function read(key: string): string | null {
  try {
    return globalThis.sessionStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) globalThis.sessionStorage?.removeItem(key);
    else globalThis.sessionStorage?.setItem(key, value);
  } catch {
    // Storage unavailable: the session simply lasts until reload.
  }
}

function isSession(value: unknown): value is Session {
  return typeof value === 'object' && value !== null
    && 'accessToken' in value && typeof value.accessToken === 'string'
    && 'expiresAt' in value && typeof value.expiresAt === 'number'
    && 'email' in value && typeof value.email === 'string';
}

function storedSession(): Session | null {
  const raw = read(SESSION_KEY);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isSession(value) ? value : null;
  } catch {
    return null;
  }
}

/** The tab's session while its token is still valid. */
export function loadSession(now: number = Date.now()): Session | null {
  const session = storedSession();
  return session && session.expiresAt > now ? session : null;
}

/** True when this tab kept a session whose token already expired (say why we ask to sign in). */
export function hasExpiredSession(now: number = Date.now()): boolean {
  const session = storedSession();
  return session !== null && session.expiresAt <= now;
}

export function saveSession(session: Session | null): void {
  write(SESSION_KEY, session ? JSON.stringify(session) : null);
  if (!session) write(BRANCH_KEY, null);
}

export const loadBranchId = (): string | null => read(BRANCH_KEY);
export const saveBranchId = (branchId: string | null): void => write(BRANCH_KEY, branchId);
