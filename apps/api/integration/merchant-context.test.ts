import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID, createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { base, db, admin, login, required } from './delivery-fixtures.ts';
import { withSubject, createDatabase } from '../src/infrastructure/database.ts';
import { createMerchantContextRepository } from '../src/infrastructure/merchant-context.repository.ts';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';
import { createMerchantContextHandler } from '../src/modules/merchants/merchant-context.handler.ts';

const merchantId = 'merchant_synthetic_a';
const paths = ['/v1/me', `/v1/merchants/${merchantId}/branches`] as const;
function get(path: string, token?: string) {
  return fetch(`${base}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
}
async function read(path: string, token: string) {
  const response = await get(path, token);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.json();
}

test('merchant context integration: authenticated identity, minimal DTO and cross-tenant isolation', async () => {
  const a = await login();
  const b = await login('b');
  const expected = { merchant: { merchantId, name: 'Comercio sintético A' },
    branch: { branchId: 'branch_synthetic_a', name: 'Sucursal sintética a' } };
  assert.deepEqual(await read(paths[0], a.token), { subjectId: a.subjectId, memberships: [expected] });
  assert.deepEqual(await read(paths[1], a.token), { merchant: expected.merchant, branches: [expected.branch] });
  for (const [identity, other] of [[a, 'b'], [b, 'a']] as const) {
    const denied = await get(`/v1/merchants/merchant_synthetic_${other}/branches`, identity.token);
    const missing = await get('/v1/merchants/nonexistent/branches', identity.token);
    assert.equal(denied.status, 404);
    assert.equal(denied.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await denied.json(), await missing.json());
    const rows = await withSubject(db, identity, (tx) => tx.branch.findMany());
    assert.deepEqual(rows.map((row) => row.id), [identity === a ? 'branch_synthetic_a' : 'branch_synthetic_b']);
  }
  assert.deepEqual(await db.branch.findMany(), [], 'No subject context escapes the transaction pool');
});

test('merchant context integration: multiple memberships do not authorize sibling branches', async () => {
  const a = await login();
  const suffix = randomUUID();
  const extraMerchant = `merchant_${suffix}`;
  const sharedBranch = `branch_${suffix}`;
  const siblingBranch = `sibling_${suffix}`;
  const memberId = `membership_${suffix}`;
  const siblingMemberId = `sibling_membership_${suffix}`;
  await admin.merchant.create({ data: { id: extraMerchant, name: 'Comercio adicional sintético' } });
  try {
    await admin.branch.createMany({ data: [sharedBranch, siblingBranch].map((id) => ({
      id, merchantId: extraMerchant, name: 'Sucursal adicional sintética', latitude: 0, longitude: 0,
    })) });
    await admin.membership.create({ data: { id: memberId, subjectId: a.subjectId,
      merchantId: extraMerchant, branchId: sharedBranch } });
    const me = await read('/v1/me', a.token);
    assert.deepEqual(me.memberships.map((entry: { merchant: { merchantId: string } }) => entry.merchant.merchantId),
      [extraMerchant, merchantId].sort());
    const branches = await read(`/v1/merchants/${extraMerchant}/branches`, a.token);
    assert.deepEqual(branches.branches, [{ branchId: sharedBranch, name: 'Sucursal adicional sintética' }]);
    await admin.membership.create({ data: { id: siblingMemberId, subjectId: a.subjectId,
      merchantId: extraMerchant, branchId: siblingBranch } });
    const expanded = await read(`/v1/merchants/${extraMerchant}/branches`, a.token);
    assert.deepEqual(expanded.branches.map((branch: { branchId: string }) => branch.branchId),
      [sharedBranch, siblingBranch].sort());
    assert.equal((await read('/v1/me', a.token)).memberships.length, 3);
    await admin.membership.update({ where: { id: siblingMemberId }, data: { enabled: false } });
    await admin.membership.update({ where: { id: memberId }, data: { enabled: false } });
    assert.equal((await read('/v1/me', a.token)).memberships.length, 1);
    assert.equal((await get(`/v1/merchants/${extraMerchant}/branches`, a.token)).status, 404);
  } finally {
    // Only this test's UUID-namespaced synthetic fixtures; never existing records.
    await admin.membership.deleteMany({ where: { id: { in: [memberId, siblingMemberId] } } });
    await admin.branch.deleteMany({ where: { id: { in: [sharedBranch, siblingBranch] } } });
    await admin.merchant.delete({ where: { id: extraMerchant } });
  }
});

test('merchant context integration: current membership, merchant and branch enabled states are required', async () => {
  const a = await login();
  for (const entity of ['membership', 'merchant', 'branch'] as const) {
    const setEnabled = (enabled: boolean) => {
      switch (entity) {
        case 'membership': return admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled } });
        case 'merchant': return admin.merchant.update({ where: { id: merchantId }, data: { enabled } });
        case 'branch': return admin.branch.update({ where: { id: 'branch_synthetic_a' }, data: { enabled } });
      }
    };
    await setEnabled(false);
    try {
      assert.deepEqual(await read('/v1/me', a.token), { subjectId: a.subjectId, memberships: [] });
      const response = await get(paths[1], a.token);
      assert.equal(response.status, 404);
      assert.deepEqual(await withSubject(db, a, (tx) => tx.branch.findMany()), []);
    } finally { await setEnabled(true); }
    assert.equal((await read('/v1/me', a.token)).memberships.length, 1);
  }
});

function expiredToken(subjectId: string): string {
  // Sign only a deliberately expired fixture with this isolated local Auth key.
  assert.equal(process.env.LOCAL_SYNTHETIC_MODE, 'true');
  assert.equal(new URL(required('SUPABASE_URL')).hostname, '127.0.0.1');
  const env: string[] = JSON.parse(execFileSync('docker', ['inspect', 'supabase_auth_delivery-local',
    '--format', '{{json .Config.Env}}'], { encoding: 'utf8' }));
  const key = env.find((entry) => entry.startsWith('GOTRUE_JWT_SECRET='))?.slice('GOTRUE_JWT_SECRET='.length);
  assert.ok(key, 'Local Auth signing key must exist; never print it');
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: subjectId, role: 'authenticated',
    aud: 'authenticated', iat: 1, exp: 2 })}`;
  return `${payload}.${createHmac('sha256', key).update(payload).digest('base64url')}`;
}

test('merchant context integration: absent, invalid, tampered and expired tokens fail real Supabase Auth', async () => {
  const a = await login();
  const parts = a.token.split('.');
  parts[1] = Buffer.from(JSON.stringify({ sub: a.subjectId, exp: 9999999999 })).toString('base64url');
  const expired = expiredToken(a.subjectId);
  const expiredAuth = await fetch(`${required('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: required('SUPABASE_PUBLISHABLE_KEY'), authorization: `Bearer ${expired}` },
    signal: AbortSignal.timeout(5000),
  });
  assert.ok([401, 403].includes(expiredAuth.status), 'Supabase Auth must reject the expired token');
  assert.match(await expiredAuth.text(), /expir/i, 'Auth must reject this validly signed fixture specifically for expiry');
  for (const token of [undefined, 'invalid-token', parts.join('.'), expired]) {
    for (const path of paths) {
      const response = await get(path, token);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), { type: 'about:blank', title: 'Autenticación requerida.',
        status: 401, code: 'UNAUTHENTICATED' });
    }
  }
});

test('merchant context integration: real database read rejection returns safe 503', async () => {
  const a = await login();
  await admin.$executeRaw`REVOKE SELECT ON app."Branch" FROM delivery_api`;
  try {
    for (const path of paths) {
      const response = await get(path, a.token);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), { type: 'about:blank', title: 'Servicio temporalmente no disponible.',
        status: 503, code: 'SERVICE_UNAVAILABLE' });
    }
  } finally { await admin.$executeRaw`GRANT SELECT ON app."Branch" TO delivery_api`; }
});

test('merchant context integration: unavailable Auth or PostgreSQL cannot produce success or sensitive errors', async () => {
  const a = await login();
  const unavailableUrl = new URL(required('DATABASE_URL'));
  unavailableUrl.port = '1';
  const unavailable = createDatabase(unavailableUrl.href);
  const auth = createSupabaseAuthenticator(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'));
  const authDown = createSupabaseAuthenticator('http://127.0.0.1:59999', required('SUPABASE_PUBLISHABLE_KEY'));
  try {
    for (const [database, authenticate] of [[unavailable, auth], [db, authDown]] as const) {
      const handler = createMerchantContextHandler({ ...createMerchantContextRepository(database), authenticate });
      for (const path of paths) {
        const response = await handler(new Request(`${base}${path}`, { headers: { authorization: `Bearer ${a.token}` } }));
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.deepEqual(await response.json(), { type: 'about:blank', title: 'Servicio temporalmente no disponible.',
          status: 503, code: 'SERVICE_UNAVAILABLE' });
      }
    }
  } finally { await unavailable.$disconnect(); }
});
