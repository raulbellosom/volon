// Runs the app's real HTTP adapter against the local lab (issue #17): sign-in, profile, availability,
// replay, stale version, key reuse with another payload, wrong password and courier isolation.
// Usage from the repo root, with `pnpm local:up` running:
//   node --experimental-strip-types apps/courier-mobile/scripts/local-smoke.mts
// Prints outcomes only: never passwords, tokens or keys. Restores the original availability.
import assert from 'node:assert/strict';
import { createLocalCourierApi } from '../src/adapters/http/local-courier-api.ts';
import { AccountError } from '../src/ports/courier-account.ts';

process.loadEnvFile('.env.local');
const env = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key} in .env.local`);
  return value;
};
const authUrl = new URL(env('SUPABASE_URL'));
const apiUrl = new URL(env('API_URL'));
if (process.env.LOCAL_SYNTHETIC_MODE !== 'true' || authUrl.hostname !== '127.0.0.1' || apiUrl.hostname !== '127.0.0.1') {
  throw new Error('Only the isolated loopback lab is supported.');
}

const api = createLocalCourierApi({ authUrl: authUrl.origin, apiUrl: apiUrl.origin, publishableKey: env('SUPABASE_PUBLISHABLE_KEY') });
const password = env('SYNTHETIC_USER_PASSWORD');
const kind = (promise: Promise<unknown>) => promise.then(() => 'ok', (error: unknown) => (error instanceof AccountError ? error.kind : 'other'));
const key = (label: string) => `smoke-${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const step = (name: string, detail: string) => console.log(`✓ ${name}: ${detail}`);

step('wrong password', await kind(api.signIn('courier-a@example.test', `${password}-wrong`)));
const session = await api.signIn('courier-a@example.test', password);
step('sign-in courier A', 'token received (not printed)');

const start = await api.getMe(session);
step('GET /v1/couriers/me', `${start.courierId} ${start.availability.status} v${start.availability.version}`);

const target = start.availability.status === 'offline' ? 'available' : 'offline';
const firstKey = key('toggle');
const changed = await api.setAvailability(session, { status: target, expectedVersion: start.availability.version }, firstKey);
assert.equal(changed.availability.version, start.availability.version + 1);
step('POST availability', `${changed.availability.status} v${changed.availability.version}`);

const replay = await api.setAvailability(session, { status: target, expectedVersion: start.availability.version }, firstKey);
assert.deepEqual(replay, changed);
step('replay same key', 'original receipt returned, nothing rewritten');

step('stale expectedVersion', await kind(api.setAvailability(session, { status: start.availability.status, expectedVersion: start.availability.version }, key('stale'))));
step('same key, other payload', await kind(api.setAvailability(session, { status: start.availability.status, expectedVersion: changed.availability.version }, firstKey)));

const restored = await api.setAvailability(session, { status: start.availability.status, expectedVersion: changed.availability.version }, key('restore'));
step('restore original status', `${restored.availability.status} v${restored.availability.version}`);

const historical = await api.setAvailability(session, { status: target, expectedVersion: start.availability.version }, firstKey);
const current = await api.getMe(session);
assert.notDeepEqual(historical.availability, current.availability);
step('historical replay vs fresh GET', `replay says ${historical.availability.status} v${historical.availability.version}; server is ${current.availability.status} v${current.availability.version}`);

const other = await api.getMe(await api.signIn('courier-b@example.test', password));
assert.notEqual(other.courierId, start.courierId);
step('courier B isolation', `B sees only its own profile (${other.courierId})`);
