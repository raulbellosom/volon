import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createDatabase, withSubject, assertRuntimeRole } from '../src/infrastructure/database.ts';
import { createQuoteRepository } from '../src/infrastructure/quote.repository.ts';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';
import { createSyntheticRouteAdapter } from '../src/infrastructure/synthetic-route.adapter.ts';
import { createApi } from '../src/app.ts';
import { createHttpServer } from '../src/http/server.ts';

process.loadEnvFile('.env.local');
function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}
const base = required('API_URL');
const db = createDatabase(required('DATABASE_URL'));
const admin = createDatabase(required('MIGRATION_DATABASE_URL'));
after(async () => { await db.$disconnect(); await admin.$disconnect(); });

async function login(tenant: string) {
  const response = await fetch(`${required('SUPABASE_URL')}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: required('SUPABASE_PUBLISHABLE_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({ email: `merchant-${tenant}@example.test`, password: required('SYNTHETIC_USER_PASSWORD') }),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200, 'Local Supabase Auth must authenticate the seeded user');
  const body = await response.json();
  return { token: body.access_token as string, subjectId: body.user.id as string };
}
const payload = (tenant: string) => ({ branchId: `branch_synthetic_${tenant}`,
  pickup: { lat: 0, lng: 0 }, dropoff: { lat: 0.01, lng: 0.01 }, serviceType: 'local_delivery' });
async function quote(token: string, tenant: string, endpoint = base) {
  return fetch(`${endpoint}/v1/delivery-quotes`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload(tenant)), signal: AbortSignal.timeout(15000),
  });
}

test('local backend: healthy listener, restricted runtime role and real PostGIS query', async () => {
  assert.equal((await fetch(`${base}/health`)).status, 200);
  await assertRuntimeRole(db);
  const [spatial] = await db.$queryRaw<{ distance: number; version: string }[]>`
    SELECT extensions.PostGIS_Version() AS version, extensions.ST_Distance(
      extensions.ST_SetSRID(extensions.ST_MakePoint(0, 0), 4326)::extensions.geography,
      extensions.ST_SetSRID(extensions.ST_MakePoint(0.01, 0.01), 4326)::extensions.geography
    ) AS distance`;
  assert.ok(spatial && spatial.distance > 1500 && spatial.distance < 1600);
  assert.match(spatial.version, /^3\./);
});

test('local backend: two authenticated merchants create/read their own quotes and cannot cross scopes', async () => {
  const a = await login('a');
  const b = await login('b');
  const aResponse = await quote(a.token, 'a');
  const bResponse = await quote(b.token, 'b');
  assert.equal(aResponse.status, 201);
  assert.equal(bResponse.status, 201);
  const aQuote = await aResponse.json();
  const bQuote = await bResponse.json();
  for (const [owner, other, snapshot] of [[a, b, aQuote], [b, a, bQuote]] as const) {
    const url = `${base}/v1/delivery-quotes/${snapshot.quoteId}`;
    const own = await fetch(url, { headers: { authorization: `Bearer ${owner.token}` } });
    assert.equal(own.status, 200);
    assert.deepEqual(await own.json(), snapshot);
    const denied = await fetch(url, { headers: { authorization: `Bearer ${other.token}` } });
    assert.equal(denied.status, 404);
    const rows = await withSubject(db, other, (tx) => tx.pricingQuote.findMany({ where: { id: snapshot.quoteId } }));
    assert.equal(rows.length, 0, 'RLS protects even a query without an application tenant filter');
  }
  assert.equal((await quote(a.token, 'b')).status, 403);
  assert.equal((await quote(b.token, 'a')).status, 403);
  assert.equal((await quote('invalid-token', 'a')).status, 401);
  const noSubject = await db.pricingQuote.findMany();
  assert.equal(noSubject.length, 0, 'Transaction subject does not leak through the connection pool');
});

test('local backend: forged pickup and outside synthetic coverage are rejected', async () => {
  const a = await login('a');
  for (const body of [{ ...payload('a'), pickup: { lat: 1, lng: 1 } },
    { ...payload('a'), dropoff: { lat: 1, lng: 1 } }]) {
    const response = await fetch(`${base}/v1/delivery-quotes`, {
      method: 'POST', headers: { authorization: `Bearer ${a.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 422);
  }
});

test('local backend: revoked branch membership blocks both reading and creating', async () => {
  const a = await login('a');
  const response = await quote(a.token, 'a');
  assert.equal(response.status, 201);
  const snapshot = await response.json();
  await admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled: false } });
  try {
    assert.equal((await quote(a.token, 'a')).status, 403);
    assert.equal((await fetch(`${base}/v1/delivery-quotes/${snapshot.quoteId}`,
      { headers: { authorization: `Bearer ${a.token}` } })).status, 404);
  } finally {
    await admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled: true } });
  }
});

test('local backend: a PostgreSQL write rejection returns 503 and creates no quote', async () => {
  const a = await login('a');
  const count = await admin.pricingQuote.count();
  await admin.$executeRaw`REVOKE INSERT ON app."PricingQuote" FROM delivery_api`;
  try {
    const response = await quote(a.token, 'a');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { type: 'about:blank', title: 'Servicio temporalmente no disponible.',
      status: 503, code: 'SERVICE_UNAVAILABLE' });
    assert.equal(await admin.pricingQuote.count(), count);
  } finally { await admin.$executeRaw`GRANT INSERT ON app."PricingQuote" TO delivery_api`; }
});

test('local backend: unreachable PostgreSQL never becomes a successful HTTP operation', async () => {
  const a = await login('a');
  const unavailableUrl = new URL(required('DATABASE_URL'));
  unavailableUrl.port = '1';
  const unavailable = createDatabase(unavailableUrl.href);
  const server = createHttpServer(createApi({
    ...createQuoteRepository(unavailable), resolveRoute: createSyntheticRouteAdapter(unavailable),
    authenticate: createSupabaseAuthenticator(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY')),
    now: () => new Date(), newQuoteId: randomUUID, ttlMilliseconds: 600000,
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    const response = await quote(a.token, 'a', `http://127.0.0.1:${address.port}`);
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes('postgres'));
  } finally {
    await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); });
    await unavailable.$disconnect();
  }
});

test('local backend: RLS rejects a cross-merchant insert even when application checks are bypassed', async () => {
  const a = await login('a');
  await assert.rejects(withSubject(db, a, (tx) => tx.pricingQuote.create({ data: {
    id: randomUUID(), subjectId: a.subjectId, merchantId: 'merchant_synthetic_b',
    branchId: 'branch_synthetic_b', request: {}, amountMinor: 3000, baseAmountMinor: 3000,
    distanceAmountMinor: 0, currency: 'MXN', expiresAt: new Date(Date.now() + 600000), rateVersion: 'synthetic-test',
  } })));
});
