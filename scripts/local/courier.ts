import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseCourierMeResponse } from '../../packages/contracts/src/index.ts';

process.loadEnvFile('.env.local');
function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error('Missing local configuration');
  return value;
}
try {
  const auth = new URL(required('SUPABASE_URL'));
  const api = new URL(required('API_URL'));
  if (process.env.LOCAL_SYNTHETIC_MODE !== 'true' || auth.hostname !== '127.0.0.1' || auth.port !== '56321'
    || api.hostname !== '127.0.0.1' || api.port !== '3100' || auth.protocol !== 'http:' || api.protocol !== 'http:') {
    throw new Error('Only isolated synthetic local stack supported');
  }
  const login = await fetch(`${auth.origin}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: required('SUPABASE_PUBLISHABLE_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'courier-a@example.test', password: required('SYNTHETIC_USER_PASSWORD') }),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(login.status, 200);
  const body: unknown = await login.json();
  if (!body || typeof body !== 'object' || !('access_token' in body) || typeof body.access_token !== 'string') {
    throw new Error('Invalid local Auth response');
  }
  const headers = { authorization: `Bearer ${body.access_token}` };
  const read = await fetch(`${api.origin}/v1/couriers/me`, { headers });
  assert.equal(read.status, 200);
  const profile = parseCourierMeResponse(await read.json());
  const payload = { status: profile.availability.status === 'offline' ? 'available' : 'offline',
    expectedVersion: profile.availability.version };
  const key = randomUUID();
  const send = () => fetch(`${api.origin}/v1/couriers/me/availability`, { method: 'POST',
    headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(payload) });
  const changed = await send();
  assert.equal(changed.status, 200);
  const response = parseCourierMeResponse(await changed.json());
  const replay = await send();
  assert.equal(replay.status, 200);
  assert.deepEqual(parseCourierMeResponse(await replay.json()), response);
  console.log(JSON.stringify({ profile: response, idempotentReplay: true }, null, 2));
} catch {
  console.error('Laboratorio Courier falló de forma segura; revisa stack y configuración local.');
  process.exitCode = 1;
}
