import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseCourierMeResponse, type CourierAvailabilityRequest } from '@delivery/contracts';
import { base, required } from './delivery-fixtures.ts';
export { admin, db, base, required, login as merchantLogin } from './delivery-fixtures.ts';

export async function courierLogin(suffix = 'a') {
  const response = await fetch(`${required('SUPABASE_URL')}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: required('SUPABASE_PUBLISHABLE_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({ email: `courier-${suffix}@example.test`, password: required('SYNTHETIC_USER_PASSWORD') }),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  return { token: body.access_token as string, subjectId: body.user.id as string };
}
export function getCourier(token?: string, path = '/v1/couriers/me') {
  return fetch(base + path, { headers: token ? { authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(15000) });
}
export function changeAvailability(token: string, body: CourierAvailabilityRequest, key: string = randomUUID()) {
  return fetch(`${base}/v1/couriers/me/availability`, { method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
}
export async function ownState(token: string) {
  const result = await getCourier(token);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  return parseCourierMeResponse(await result.json());
}
export function expiredCourierToken(subjectId: string) {
  assert.equal(process.env.LOCAL_SYNTHETIC_MODE, 'true');
  assert.equal(new URL(required('SUPABASE_URL')).hostname, '127.0.0.1');
  const env: string[] = JSON.parse(execFileSync('docker', ['inspect', 'supabase_auth_delivery-local',
    '--format', '{{json .Config.Env}}'], { encoding: 'utf8' }));
  const secret = env.find((entry) => entry.startsWith('GOTRUE_JWT_SECRET='))?.slice('GOTRUE_JWT_SECRET='.length);
  assert.ok(secret, 'Local fixture signing key, never log');
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: subjectId, role: 'authenticated', aud: 'authenticated', iat: 1, exp: 2 })}`;
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
