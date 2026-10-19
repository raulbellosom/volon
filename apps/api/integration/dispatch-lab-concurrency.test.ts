import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { actors, scenario, offer, accept, execute, admin, blocked, waitForBlocked } from './dispatch-lab-fixtures.ts';

test('dispatch lab: two couriers, one delivery, exactly one committed winner and no loser event', async () => {
  const { a, b } = await actors();
  const ref = await scenario();
  const oa = await offer(a, ref);
  const ob = await offer(b, ref);
  const results = await Promise.allSettled([accept(a, oa.id), accept(b, ob.id)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const lost = results.find((r) => r.status === 'rejected');
  assert.ok(lost?.status === 'rejected');
  assert.equal(lost.reason.code, 'STATE_CONFLICT');
  assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: ref, status: 'active' } }), 1);
  assert.equal(await admin.dispatchLabOffer.count({ where: { syntheticDeliveryRef: ref, status: 'accepted' } }), 1);
  assert.equal(await admin.dispatchLabOutbox.count({ where: { syntheticDeliveryRef: ref } }), 4);
});

test('dispatch lab: two deliveries compete for one courier, partial index prevents double booking', async () => {
  const { a } = await actors();
  const refs = [await scenario(), await scenario()];
  const offers = await Promise.all(refs.map((ref) => offer(a, ref)));
  const results = await Promise.allSettled(offers.map((row) => accept(a, row.id)));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  for (const result of results) if (result.status === 'rejected') assert.equal(result.reason.code, 'STATE_CONFLICT');
  assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: { in: refs }, status: 'active' } }), 1);
  assert.equal(await admin.dispatchLabOffer.count({ where: { syntheticDeliveryRef: { in: refs }, status: 'accepted' } }), 1);
});

test('dispatch lab: 24 parallel accepts, two actors, one assignment with exactly one command winner', async () => {
  const { a, b } = await actors();
  const ref = await scenario();
  const offers = [await offer(a, ref), await offer(b, ref)];
  const results = await Promise.allSettled(Array.from({ length: 24 }, (_, index) => {
    const actor = index % 2 === 0 ? a : b;
    return accept(actor, offers[index % 2]?.id ?? randomUUID());
  }));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  for (const result of results) if (result.status === 'rejected')
    assert.ok(['VERSION_CONFLICT', 'STATE_CONFLICT'].includes(result.reason.code), 'Loser must be a domain conflict, never an infrastructure failure');
  assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: ref } }), 1);
  assert.equal(await admin.dispatchLabOutbox.count({ where: { syntheticDeliveryRef: ref, aggregateKind: 'assignment' } }), 1);
});

test('dispatch lab: expires while blocked; database wall clock is rechecked and explicit expiry is audited', async () => {
  const { a } = await actors();
  const ref = await scenario();
  const row = await offer(a, ref, 1);
  let pending: ReturnType<typeof accept> | undefined;
  await blocked('dispatch-lab:' + ref, async () => {
    pending = accept(a, row.id);
    await waitForBlocked();
    const [clock] = await admin.$queryRaw<{ delay: number }[]>`SELECT GREATEST(0,
      EXTRACT(EPOCH FROM (${new Date(row.kind === 'offer' ? row.expiresAt : '')}::timestamptz - clock_timestamp())) * 1000)::float AS delay`;
    await setTimeout((clock?.delay ?? 1000) + 50);
  });
  assert.ok(pending);
  await assert.rejects(pending, { code: 'OFFER_EXPIRED' });
  assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: ref } }), 0);
  const expired = await execute(a, { operation: 'expire', id: row.id, expectedVersion: 1 }, randomUUID());
  assert.equal(expired.status, 'expired');
  assert.equal(await admin.dispatchLabOutbox.count({ where: { aggregateId: row.id } }), 2);
});

test('dispatch lab: offer withdrawal wins the subject lock before acceptance', async () => {
  const { a } = await actors();
  const row = await offer(a, await scenario());
  let withdrawal: ReturnType<typeof execute> | undefined;
  let acceptance: ReturnType<typeof accept> | undefined;
  await blocked('courier-subject:' + a.subjectId, async () => {
    withdrawal = execute(a, { operation: 'withdraw', id: row.id, expectedVersion: 1 }, randomUUID());
    await waitForBlocked();
    acceptance = accept(a, row.id);
  });
  assert.ok(withdrawal && acceptance);
  assert.equal((await withdrawal).status, 'withdrawn');
  await assert.rejects(acceptance, { code: 'VERSION_CONFLICT' });
  assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: row.syntheticDeliveryRef } }), 0);
});

test('dispatch lab: concurrent profile revocation prevents acceptance after waiting for its lock', async () => {
  const { a } = await actors();
  const row = await offer(a, await scenario());
  let pending: ReturnType<typeof accept> | undefined;
  let release = () => {};
  let acquired = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { acquired = resolve; });
  const revocation = admin.$transaction(async (tx) => {
    await tx.courier.update({ where: { subjectId: a.subjectId }, data: { enabled: false } });
    acquired();
    await gate;
  }, { timeout: 10000 });
  try {
    await ready;
    pending = accept(a, row.id);
    await waitForBlocked();
  } finally { release(); await revocation; }
  try {
    assert.ok(pending);
    await assert.rejects(pending, { code: 'NOT_FOUND' });
    assert.equal(await admin.dispatchLabAssignment.count({ where: { syntheticDeliveryRef: row.syntheticDeliveryRef } }), 0);
  } finally { await admin.courier.update({ where: { subjectId: a.subjectId }, data: { enabled: true } }); }
});
