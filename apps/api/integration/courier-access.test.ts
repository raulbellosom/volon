import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withSubject, createDatabase, assertRuntimeRole } from '../src/infrastructure/database.ts';
import { createCourierRepository } from '../src/infrastructure/courier.repository.ts';
import { createCourierHandler } from '../src/modules/couriers/courier.handler.ts';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';
import { admin, db, base, required, courierLogin, merchantLogin, getCourier, ownState,
  changeAvailability, expiredCourierToken } from './courier-fixtures.ts';

test('Courier access: real identity, strict minimal DTO, no merchant or private data privileges', async () => {
  const a = await courierLogin();
  const b = await courierLogin('b');
  for (const [identity, suffix] of [[a, 'a'], [b, 'b']] as const) {
    const dto = await ownState(identity.token);
    assert.equal(dto.courierId, `courier_synthetic_${suffix}`);
    assert.deepEqual(Object.keys(dto).sort(), ['availability', 'courierId']);
    const rows = await withSubject(db, identity, (tx) => tx.courier.findMany());
    assert.deepEqual(rows.map((row) => row.id), [dto.courierId]);
    const shifts = await withSubject(db, identity, (tx) => tx.courierShift.findMany());
    assert.deepEqual(shifts.map((row) => row.courierId), [dto.courierId]);
    const foreign = await withSubject(db, identity, (tx) => tx.courierShift.updateMany({
      where: { courierId: `courier_synthetic_${suffix === 'a' ? 'b' : 'a'}` },
      data: { status: 'available', version: { increment: 1 } },
    }));
    assert.equal(foreign.count, 0);
    await withSubject(db, identity, async (tx) => {
      for (const rows of [await tx.merchant.findMany(), await tx.branch.findMany(), await tx.membership.findMany(),
        await tx.delivery.findMany(), await tx.pricingQuote.findMany()]) assert.deepEqual(rows, []);
      await tx.$queryRaw`SELECT set_config('app.private_location_lab', 'synthetic-v1', true)`;
      assert.deepEqual(await tx.privateLocationEnvelope.findMany(), []);
    });
    const me = await fetch(`${base}/v1/me`, { headers: { authorization: `Bearer ${identity.token}` } });
    assert.deepEqual((await me.json()).memberships, []);
    assert.equal((await getCourier(identity.token, '/v1/couriers/other')).status, 404);
    assert.equal((await getCourier(identity.token, '/v1/couriers/me?courierId=other')).status, 422);
  }
  assert.deepEqual(await db.courier.findMany(), []);
  assert.deepEqual(await db.courierShift.findMany(), []);
  assert.deepEqual(await db.courierAvailabilityCommand.findMany(), []);
});

test('Courier access: absent, tampered, invalid and expired bearer rejected by real Supabase', async () => {
  const a = await courierLogin();
  const parts = a.token.split('.');
  parts[1] = Buffer.from(JSON.stringify({ sub: a.subjectId, exp: 9999999999 })).toString('base64url');
  for (const token of [undefined, 'invalid-token', parts.join('.'), expiredCourierToken(a.subjectId)]) {
    const read = await getCourier(token);
    assert.equal(read.status, 401);
    assert.equal(read.headers.get('cache-control'), 'no-store');
    const change = await fetch(`${base}/v1/couriers/me/availability`, { method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {} });
    assert.equal(change.status, 401);
  }
});

test('Courier access: missing and disabled profiles return identical 404; disable forces offline and replay denied', async () => {
  const a = await courierLogin();
  const missing = await merchantLogin();
  const state = await ownState(a.token);
  const request = { status: 'available' as const, expectedVersion: state.availability.version };
  const key = `disable-${crypto.randomUUID()}`;
  const response = await changeAvailability(a.token, request, key);
  assert.equal(response.status, 200);
  await admin.courier.update({ where: { id: state.courierId }, data: { enabled: false } });
  try {
    for (const token of [a.token, missing.token]) {
      const result = await getCourier(token);
      assert.equal(result.status, 404);
      assert.deepEqual(await result.json(), { type: 'about:blank', title: 'Recurso no encontrado.', status: 404, code: 'NOT_FOUND' });
      assert.equal((await changeAvailability(token, request, key)).status, 404);
    }
    assert.deepEqual(await withSubject(db, a, (tx) => tx.courierAvailabilityCommand.findMany()), []);
  } finally { await admin.courier.update({ where: { id: state.courierId }, data: { enabled: true } }); }
  const after = await ownState(a.token);
  assert.equal(after.availability.status, 'offline');
  assert.equal(after.availability.version, state.availability.version + 2);
});

test('Courier access: runtime cannot provision, elevate, transplant identity, forge clock or enter busy', async () => {
  const a = await courierLogin();
  const b = await courierLogin('b');
  await assert.rejects(withSubject(db, a, (tx) => tx.courier.create({ data: { id: 'forged', subjectId: crypto.randomUUID() } })));
  await assert.rejects(withSubject(db, a, (tx) => tx.courier.update({ where: { id: 'courier_synthetic_a' }, data: { enabled: false } })));
  const state = await ownState(a.token);
  await assert.rejects(withSubject(db, a, (tx) => tx.courierShift.update({ where: { courierId: state.courierId },
    data: { status: 'busy', version: { increment: 1 } } })));
  await assert.rejects(withSubject(db, a, (tx) => tx.courierShift.update({ where: { courierId: state.courierId },
    data: { changedAt: new Date('2000-01-01') } })));
  await assert.rejects(admin.courier.update({ where: { id: state.courierId }, data: { subjectId: b.subjectId } }));
  const before = await admin.delivery.count();
  for (const extra of [{ courierId: 'courier_synthetic_b' }, { subjectId: b.subjectId },
    { paymentVerified: true }, { changedAt: '2000-01-01T00:00:00Z' }]) {
    assert.equal((await changeAvailability(a.token, { status: 'available', expectedVersion: state.availability.version, ...extra })).status, 422);
  }
  assert.equal(await admin.delivery.count(), before);
});

test('Courier access: FORCE RLS, column grants and command ledger block direct cross-courier writes and mutation', async () => {
  const a = await courierLogin();
  const b = await courierLogin('b');
  const before = await ownState(b.token);
  assert.equal((await changeAvailability(b.token, { status: 'offline', expectedVersion: before.availability.version })).status, 200);
  const state = await ownState(b.token);
  assert.deepEqual(await withSubject(db, a, (tx) => tx.courierAvailabilityCommand.findMany({
    where: { courierId: state.courierId },
  })), []);
  await assert.rejects(withSubject(db, a, (tx) => tx.courierAvailabilityCommand.create({ data: {
    courierId: state.courierId, idempotencyKeyHash: 'a'.repeat(64), requestHash: 'b'.repeat(64),
    status: state.availability.status, version: state.availability.version, changedAt: new Date(state.availability.changedAt),
  } })));
  const ownReceipt = await admin.courierAvailabilityCommand.findFirstOrThrow({ where: { courierId: state.courierId } });
  await assert.rejects(admin.courierAvailabilityCommand.update({ where: { courierId_idempotencyKeyHash: {
    courierId: state.courierId, idempotencyKeyHash: ownReceipt.idempotencyKeyHash,
  } }, data: { requestHash: 'c'.repeat(64) } }));
  const tables = await admin.$queryRaw<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
    SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relnamespace = 'app'::regnamespace
    AND relname IN ('Courier', 'CourierShift', 'CourierAvailabilityCommand')`;
  assert.equal(tables.length, 3);
  assert.ok(tables.every((table) => table.relrowsecurity && table.relforcerowsecurity));
  const [privileges] = await admin.$queryRaw<{ provision: boolean; clock: boolean; anonymous: boolean }[]>`
    SELECT has_table_privilege('delivery_api', 'app."Courier"', 'INSERT') AS provision,
      has_column_privilege('delivery_api', 'app."CourierShift"', 'changedAt', 'UPDATE') AS clock,
      has_table_privilege('authenticated', 'app."Courier"', 'SELECT') AS anonymous`;
  assert.deepEqual(privileges, { provision: false, clock: false, anonymous: false });
  try {
    await admin.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE delivery_api`;
      await assert.rejects(assertRuntimeRole(tx), /not restricted/,
        'An administrative login cannot disguise itself with SET ROLE');
    });
  } catch (error) {
    // Supabase may prohibit this role switch entirely; do not grant membership to make it pass.
    assert.match(String(error), /permission denied to set role/);
  }
});

test('Courier access: DB unavailable, revoked grants, admin connections and Auth unavailable fail closed', async () => {
  const a = await courierLogin();
  const brokenUrl = new URL(required('DATABASE_URL'));
  brokenUrl.port = '1';
  const broken = createDatabase(brokenUrl.href);
  const authenticate = createSupabaseAuthenticator(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'));
  const authDown = createSupabaseAuthenticator('http://127.0.0.1:59999', required('SUPABASE_PUBLISHABLE_KEY'));
  try {
    for (const [database, auth] of [[broken, authenticate], [admin, authenticate], [db, authDown]] as const) {
      const handler = createCourierHandler({ ...createCourierRepository(database), authenticate: auth });
      for (const method of ['GET', 'POST']) {
        const response = await handler(new Request(`${base}/v1/couriers/me${method === 'POST' ? '/availability' : ''}`, {
          method, headers: { authorization: `Bearer ${a.token}`, 'content-type': 'application/json', 'idempotency-key': 'failure-fixture' },
          ...(method === 'POST' ? { body: JSON.stringify({ status: 'offline', expectedVersion: 1 }) } : {}),
        }));
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), { type: 'about:blank', title: 'Servicio temporalmente no disponible.',
          status: 503, code: 'SERVICE_UNAVAILABLE' });
      }
    }
  } finally { await broken.$disconnect(); }
  await admin.$executeRaw`REVOKE SELECT ON app."CourierShift" FROM delivery_api`;
  try { assert.equal((await getCourier(a.token)).status, 503); }
  finally { await admin.$executeRaw`GRANT SELECT ON app."CourierShift" TO delivery_api`; }
});
