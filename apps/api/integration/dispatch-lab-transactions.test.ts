import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/infrastructure/database.ts';
import { createDispatchLabRepository } from '../src/infrastructure/dispatch-lab.repository.ts';
import { createDispatchLabService } from '../src/modules/dispatch-lab/dispatch.service.ts';
import { actors, scenario, offer, accept, execute, admin, db, withSubject, repository, financial } from './dispatch-lab-fixtures.ts';

test('dispatch lab: replay, double tap and canonical hashes preserve exactly one fact; conflicts do not consume keys', async () => {
  const { a } = await actors();
  const ref = await scenario();
  const offerKey = randomUUID();
  const row = await offer(a, ref, 300, offerKey);
  const key = randomUUID();
  const [first, replay] = await Promise.all([accept(a, row.id, key), accept(a, row.id, key)]);
  assert.deepEqual(first, replay);
  await assert.rejects(accept(a, row.id, key, 2), { code: 'IDEMPOTENCY_CONFLICT' });
  await assert.rejects(execute(a, { operation: 'decline', id: row.id, expectedVersion: 1 }, key), { code: 'IDEMPOTENCY_CONFLICT' });
  await assert.rejects(accept(a, row.id, randomUUID(), 1), { code: 'VERSION_CONFLICT' });
  await assert.rejects(execute(a, { operation: 'revoke', id: first.id, expectedVersion: 2 }, randomUUID()), { code: 'VERSION_CONFLICT' });
  const revoked = await execute(a, { operation: 'revoke', id: first.id, expectedVersion: 1 }, randomUUID());
  assert.equal(revoked.status, 'revoked');
  assert.equal(revoked.version, 2);
  assert.deepEqual(await accept(a, row.id, key), first);
  assert.deepEqual(await offer(a, ref, 300, offerKey), row);
  assert.equal((await admin.dispatchLabAssignment.findUniqueOrThrow({ where: { id: first.id } })).status, 'revoked');
  // offered + accepted + active + revoked; neither replay creates a new fact.
  assert.equal(await admin.dispatchLabOutbox.count({ where: { syntheticDeliveryRef: ref } }), 4);
  const another = await offer(a, ref);
  const next = await accept(a, another.id);
  assert.notEqual(first.id, next.id);
  assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: ref, status: 'active' } }), 1);
});

test('dispatch lab: default financial gate and missing/pending/failed/revoked conditions cannot offer or accept', async () => {
  const { a } = await actors();
  const ref = await scenario();
  const denied = createDispatchLabService(repository);
  await assert.rejects(denied(a, { operation: 'offer', syntheticDeliveryRef: ref, ttlSeconds: 300 }, randomUUID()), { code: 'FINANCIAL_INELIGIBLE' });
  const row = await offer(a, ref);
  await assert.rejects(denied(a, { operation: 'accept', id: row.id, expectedVersion: 1 }, randomUUID()), { code: 'FINANCIAL_INELIGIBLE' });
  for (const condition of ['missing', 'pending', 'failed', 'revoked'] as const) {
    financial.set(ref, condition);
    await assert.rejects(offer(a, ref), { code: 'FINANCIAL_INELIGIBLE' });
    await assert.rejects(accept(a, row.id), { code: 'FINANCIAL_INELIGIBLE' });
  }
  assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: ref } }), 0);
  assert.equal(await admin.dispatchLabOutbox.count({ where: { syntheticDeliveryRef: ref } }), 1);
});

test('dispatch lab: unavailable DB/admin connection and outbox failure do not expose SQL or consume offers', async () => {
  const { a } = await actors();
  const ref = await scenario();
  const row = await offer(a, ref);
  const unavailable = createDatabase('postgresql://synthetic:synthetic@127.0.0.1:1/postgres');
  try {
    for (const connection of [unavailable, admin]) await assert.rejects(
      createDispatchLabService(createDispatchLabRepository(connection), financial)(a,
        { operation: 'accept', id: row.id, expectedVersion: 1 }, randomUUID()),
      { code: 'INFRASTRUCTURE_UNAVAILABLE', message: 'INFRASTRUCTURE_UNAVAILABLE' });
  } finally { await unavailable.$disconnect(); }
  const key = randomUUID();
  await admin.$executeRawUnsafe('REVOKE INSERT ON app."DispatchLabOutbox" FROM delivery_api');
  try { await assert.rejects(accept(a, row.id, key), { code: 'INFRASTRUCTURE_UNAVAILABLE' }); }
  finally { await admin.$executeRawUnsafe('GRANT INSERT ON app."DispatchLabOutbox" TO delivery_api'); }
  assert.equal((await admin.dispatchLabOffer.findUniqueOrThrow({ where: { id: row.id } })).status, 'offered');
  assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: ref } }), 0);
  assert.equal(await admin.dispatchLabOutbox.count({ where: { syntheticDeliveryRef: ref } }), 1);
  assert.equal((await accept(a, row.id, key)).status, 'active');
});

test('dispatch lab: deferred commit failure rolls back assignment, offer, receipt and outbox; retry commits once', async () => {
  const { a } = await actors();
  const ref = await scenario();
  const row = await offer(a, ref);
  const key = randomUUID();
  await admin.$executeRawUnsafe(`CREATE FUNCTION app.test_dispatch_commit_failure() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic commit failure'; END; $$`);
  try {
    await admin.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER test_dispatch_commit_failure
      AFTER INSERT ON app."DispatchLabAssignment" DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION app.test_dispatch_commit_failure()`);
    try { await assert.rejects(accept(a, row.id, key), { code: 'INFRASTRUCTURE_UNAVAILABLE' }); }
    finally { await admin.$executeRawUnsafe('DROP TRIGGER test_dispatch_commit_failure ON app."DispatchLabAssignment"'); }
  } finally { await admin.$executeRawUnsafe('DROP FUNCTION app.test_dispatch_commit_failure()'); }
  assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: ref } }), 0);
  assert.equal(await admin.dispatchLabOutbox.count({ where: { syntheticDeliveryRef: ref } }), 1);
  assert.equal((await admin.dispatchLabOffer.findUniqueOrThrow({ where: { id: row.id } })).version, 1);
  const result = await accept(a, row.id, key);
  assert.deepEqual(await accept(a, row.id, key), result);
  assert.equal(await admin.dispatchLabOutbox.count({ where: { syntheticDeliveryRef: ref } }), 3);
  // Fresh connection proves committed durability, rather than an in-memory projection.
  const observer = createDatabase(process.env.DATABASE_URL ?? '');
  try {
    const visible = await withSubject(observer, a, async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.dispatch_lab', 'synthetic-v1', true)`;
      return tx.dispatchLabAssignment.findUnique({ where: { id: result.id } });
    });
    assert.equal(visible?.status, 'active');
  } finally { await observer.$disconnect(); }
});

test('dispatch lab: a direct SQL transition without its outbox cannot commit, even for an administrator', async () => {
  const { a } = await actors();
  const row = await offer(a, await scenario());
  await assert.rejects(admin.dispatchLabOffer.update({ where: { id: row.id }, data: { status: 'withdrawn', version: 2 } }));
  assert.equal((await admin.dispatchLabOffer.findUniqueOrThrow({ where: { id: row.id } })).status, 'offered');
  await assert.rejects(admin.dispatchLabOutbox.deleteMany({ where: { aggregateId: row.id } }));
  await assert.rejects(admin.dispatchLabScenario.delete({ where: { id: row.syntheticDeliveryRef } }));
  assert.equal(await db.dispatchLabOffer.count(), 0);
});
