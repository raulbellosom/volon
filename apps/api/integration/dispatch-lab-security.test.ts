import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { actors, scenario, offer, accept, execute, admin, db, withSubject } from './dispatch-lab-fixtures.ts';
import { createCourierRepository } from '../src/infrastructure/courier.repository.ts';
import { createCourierAvailabilityService } from '../src/modules/couriers/courier.service.ts';
import { required, merchantLogin, base } from './courier-fixtures.ts';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';

test('dispatch lab: FORCE RLS, no admin provisioning, no unscoped rows or foreign actor reads/writes', async () => {
  const { a, b } = await actors();
  const ref = await scenario();
  const oa = await offer(a, ref);
  const ob = await offer(b, ref);
  const [flags] = await admin.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM pg_class
    WHERE relnamespace = 'app'::regnamespace AND relname LIKE 'DispatchLab%' AND relrowsecurity AND relforcerowsecurity`;
  assert.equal(flags?.count, 5);
  const [indexes] = await admin.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM pg_index
    WHERE indrelid = 'app."DispatchLabAssignment"'::regclass AND indisunique AND indpred IS NOT NULL`;
  assert.equal(indexes?.count, 2);
  assert.equal(await db.dispatchLabOffer.count(), 0);
  await assert.rejects(db.dispatchLabScenario.create({ data: { id: randomUUID() } }));
  await assert.rejects(db.dispatchLabScenario.findMany());
  await withSubject(db, a, async (tx) => {
    assert.equal(await tx.dispatchLabOffer.count(), 0);
    await tx.$queryRaw`SELECT set_config('app.dispatch_lab', 'synthetic-v1', true)`;
    assert.ok((await tx.dispatchLabOffer.findMany()).every((row) => row.courierId === oa.courierId));
    assert.equal(await tx.dispatchLabOffer.findUnique({ where: { id: ob.id } }), null);
    assert.equal((await tx.dispatchLabOffer.updateMany({ where: { id: ob.id }, data: { status: 'declined', version: 2 } })).count, 0);
    for (const query of [tx.delivery.findMany(), tx.pricingQuote.findMany(), tx.merchant.findMany(),
      tx.privateLocationEnvelope.findMany(), tx.membership.findMany()]) assert.deepEqual(await query, []);
    assert.ok((await tx.dispatchLabOutbox.findMany()).every((row) => row.courierId === oa.courierId));
    assert.ok((await tx.dispatchLabCommand.findMany()).every((row) => row.courierId === oa.courierId));
  });
  await assert.rejects(accept(a, ob.id), { code: 'NOT_FOUND' });
  await assert.rejects(accept(b, randomUUID()), { code: 'NOT_FOUND' });
  await assert.rejects(withSubject(db, a, async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.dispatch_lab', 'synthetic-v1', true)`;
    await tx.dispatchLabOffer.create({ data: { id: randomUUID(), syntheticDeliveryRef: ref,
      courierId: ob.courierId, expiresAt: new Date(Date.now() + 30000) } });
  }));
  const [grants] = await admin.$queryRaw<{ unsafe: boolean }[]>`SELECT bool_or(
    has_table_privilege('anon', oid, 'SELECT,INSERT,UPDATE,DELETE') OR
    has_table_privilege('authenticated', oid, 'SELECT,INSERT,UPDATE,DELETE')) AS unsafe
    FROM pg_class WHERE relnamespace = 'app'::regnamespace AND relname LIKE 'DispatchLab%' AND relkind = 'r'`;
  assert.equal(grants?.unsafe, false);
});

test('dispatch lab: real Auth rejects absent/invalid token; merchant cannot act as Courier; no dispatch routes', async () => {
  const { a } = await actors();
  const auth = createSupabaseAuthenticator(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'));
  for (const bearer of [undefined, 'Bearer invalid.token.value']) assert.equal(await auth(new Request('http://localhost',
    { headers: bearer ? { authorization: bearer } : {} })), null);
  const merchant = await merchantLogin();
  await assert.rejects(offer(merchant, await scenario()), { code: 'NOT_FOUND' });
  for (const path of ['/v1/dispatch', '/v1/assignment-offers', '/v1/assignments', '/v1/couriers/me/offers'])
    assert.equal((await fetch(base + path)).status, 404);
  const row = await offer(a, await scenario());
  assert.equal(Object.keys(row).length, 8);
  assert.ok(!JSON.stringify(row).includes(a.subjectId));
});

test('dispatch lab: offline denies new work; decline/expiry/revocation are versioned, terminal and replay-safe', async () => {
  const { a } = await actors();
  const ref = await scenario();
  const row = await offer(a, ref);
  await assert.rejects(execute(a, { operation: 'expire', id: row.id, expectedVersion: 1 }, randomUUID()), { code: 'NOT_EXPIRED' });
  const declined = await execute(a, { operation: 'decline', id: row.id, expectedVersion: 1 }, randomUUID());
  assert.equal(declined.status, 'declined');
  await assert.rejects(accept(a, row.id, randomUUID(), 2), { code: 'STATE_CONFLICT' });
  const second = await offer(a, ref);
  const store = createCourierRepository(db);
  const state = await store.read(a);
  assert.ok(state);
  await createCourierAvailabilityService(store)(a, { status: 'offline', expectedVersion: state.availability.version }, randomUUID());
  await assert.rejects(offer(a, ref), { code: 'COURIER_UNAVAILABLE' });
  await assert.rejects(accept(a, second.id), { code: 'COURIER_UNAVAILABLE' });
  // Reactivation does not mark busy; current endpoint contract stays unchanged.
  const offline = await store.read(a);
  assert.ok(offline);
  await createCourierAvailabilityService(store)(a, { status: 'available', expectedVersion: offline.availability.version }, randomUUID());
  const assignment = await accept(a, second.id);
  assert.equal((await store.read(a))?.availability.status, 'available');
  const key = randomUUID();
  const revoked = await execute(a, { operation: 'revoke', id: assignment.id, expectedVersion: 1 }, key);
  assert.deepEqual(await execute(a, { operation: 'revoke', id: assignment.id, expectedVersion: 1 }, key), revoked);
  await assert.rejects(execute(a, { operation: 'revoke', id: assignment.id, expectedVersion: 2 }, randomUUID()), { code: 'STATE_CONFLICT' });
});

test('dispatch lab: disabling an assigned courier hides replay and preserves the reservation instead of double assigning', async () => {
  const { a, b } = await actors();
  const ref = await scenario();
  const oa = await offer(a, ref);
  const ob = await offer(b, ref);
  const key = randomUUID();
  const assignment = await accept(a, oa.id, key);
  await admin.courier.update({ where: { subjectId: a.subjectId }, data: { enabled: false } });
  try {
    await assert.rejects(accept(a, oa.id, key), { code: 'NOT_FOUND' });
    await assert.rejects(accept(b, ob.id), { code: 'STATE_CONFLICT' });
    assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: ref, status: 'active' } }), 1);
    assert.equal((await admin.dispatchLabAssignment.findUniqueOrThrow({ where: { id: assignment.id } })).courierId, oa.courierId);
    await withSubject(db, a, async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.dispatch_lab', 'synthetic-v1', true)`;
      assert.deepEqual(await tx.dispatchLabAssignment.findMany(), []);
      assert.deepEqual(await tx.dispatchLabCommand.findMany(), []);
      assert.deepEqual(await tx.dispatchLabOutbox.findMany(), []);
    });
  } finally { await admin.courier.update({ where: { subjectId: a.subjectId }, data: { enabled: true } }); }
});
