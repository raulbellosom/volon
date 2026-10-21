import assert from 'node:assert/strict';
import { after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { loadOfflineIntegrationEnvironment } from './integration-environment.ts';
import { createDatabase } from '../src/infrastructure/database.ts';

loadOfflineIntegrationEnvironment();
export function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}
export const base = required('API_URL');
export const db = createDatabase(required('DATABASE_URL'));
export const admin = createDatabase(required('MIGRATION_DATABASE_URL'));
after(async () => { await db.$disconnect(); await admin.$disconnect(); });

export async function login(tenant = 'a') {
  const response = await fetch(`${required('SUPABASE_URL')}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: required('SUPABASE_PUBLISHABLE_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({ email: `merchant-${tenant}@example.test`, password: required('SYNTHETIC_USER_PASSWORD') }),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  return { token: body.access_token as string, subjectId: body.user.id as string };
}

export async function newQuote(token: string, tenant = 'a') {
  const response = await fetch(`${base}/v1/delivery-quotes`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ branchId: `branch_synthetic_${tenant}`, pickup: { lat: 0, lng: 0 },
      dropoff: { lat: 0.02, lng: 0.02 }, serviceType: 'local_delivery' }),
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(typeof body.quoteId, 'string');
  return body.quoteId as string;
}

export function createDelivery(token: string, quoteId: string, key: string = randomUUID(), branchId = 'branch_synthetic_a') {
  return fetch(`${base}/v1/deliveries`, { method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify({ branchId, quoteId }), signal: AbortSignal.timeout(15000),
  });
}

export function readDelivery(token: string, id: string) {
  return fetch(`${base}/v1/deliveries/${id}`, { headers: { authorization: `Bearer ${token}` } });
}
