import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createEvidenceLabService } from '../src/modules/payments/evidence.service.ts';
import { createPaymentEvidenceStore } from '../src/infrastructure/payment-evidence.repository.ts';
import { createDispatchLabService } from '../src/modules/dispatch-lab/dispatch.service.ts';
import { createDispatchLabRepository } from '../src/infrastructure/dispatch-lab.repository.ts';
import { fixture, observe, nextEvent, evidence, evidenceStore, sign, identity, payments, db, admin, withSubject } from './payment-fixtures.ts';
import { courierLogin } from './courier-fixtures.ts';

test('pending, unknown, rejected and authorization are auditable, capture needs synthetic reconciliation', async () => {
  const { actor, event, id } = await fixture();
  let version = 0;
  for (const kind of ['pending', 'unknown', 'rejected', 'authorized', 'captured'] as const) {
    const receipt = await observe(actor, nextEvent(event, version, { kind }));
    assert.equal(receipt.state, kind === 'captured' ? 'capture_pending' : kind);
    assert.equal(receipt.needsReconciliation, true);
    assert.equal(receipt.version, ++version);
  }
  const reconciled = await observe(actor, nextEvent(event, version, { kind: 'captured', source: 'synthetic_reconciliation' }));
  assert.equal(reconciled.state, 'confirmed');
  assert.equal(reconciled.needsReconciliation, false);
  assert.deepEqual(Object.keys(reconciled).sort(), ['caseId', 'disposition', 'eventId', 'needsReconciliation', 'receivedAt', 'state', 'version']);
  assert.equal(await admin.paymentEvidenceLabEvent.count({ where: { caseId: event.caseId } }), 6);
  assert.deepEqual(await payments.eligibility(actor, { deliveryId: id }), { deliveryId: id, eligible: false, reason: 'PSP_NOT_CONFIGURED' });
  assert.equal(await admin.servicePaymentIntent.count({ where: { deliveryId: id } }), 0);
  const row = await admin.delivery.findUniqueOrThrow({ where: { id } });
  assert.equal(row.status, 'requested');
  assert.equal(row.version, 1);
});

test('forged or modified messages and default verifier cannot apply a capture', async () => {
  const { actor, event } = await fixture();
  const captured = { ...event, kind: 'captured' as const, source: 'synthetic_reconciliation' as const };
  const forged = await evidence.observe(actor, captured, '0'.repeat(64));
  assert.equal(forged.disposition, 'rejected_origin');
  assert.equal(forged.state, 'pending');
  const original = nextEvent(event, 1, { kind: 'captured' });
  const modified = { ...original, amountMinor: original.amountMinor + 1 };
  assert.equal((await evidence.observe(actor, modified, sign(original))).disposition, 'rejected_origin');
  const defaultResult = await createEvidenceLabService(evidenceStore).observe(actor, nextEvent(event, 2, { kind: 'captured' }), 'anything');
  assert.equal(defaultResult.state, 'pending');
  assert.equal(defaultResult.disposition, 'rejected_origin');
});

test('verified but mismatched amounts, currencies or provider IDs never change state', async () => {
  const { actor, event } = await fixture();
  let version = 0;
  for (const patch of [{ amountMinor: event.amountMinor + 1 }, { currency: 'USD' }, { providerPaymentId: 'fixture_other' }]) {
    const receipt = await observe(actor, nextEvent(event, version++, { kind: 'captured', source: 'synthetic_reconciliation', ...patch }));
    assert.equal(receipt.disposition, 'mismatch');
    assert.equal(receipt.state, 'pending');
    assert.equal(receipt.needsReconciliation, true);
  }
});

test('duplicate evidence replays original receipt, payload reuse conflicts, and stale versions fail', async () => {
  const { actor, event } = await fixture();
  const first = await observe(actor, event);
  assert.deepEqual(await observe(actor, event), first);
  await assert.rejects(observe(actor, { ...event, kind: 'captured' }), { code: 'IDEMPOTENCY_CONFLICT' });
  await assert.rejects(observe(actor, nextEvent(event, 0)), { code: 'VERSION_CONFLICT' });
  const second = await observe(actor, nextEvent(event, 1, { kind: 'unknown' }));
  assert.deepEqual(await observe(actor, event), first);
  assert.equal(second.version, 2);
  assert.equal(await admin.paymentEvidenceLabEvent.count({ where: { caseId: event.caseId } }), 2);
});

test('out of order reports do not regress confirmation; disputes and reversals stay blocking', async () => {
  const { actor, event } = await fixture();
  await observe(actor, { ...event, kind: 'captured', source: 'synthetic_reconciliation' });
  const late = await observe(actor, nextEvent(event, 1, { kind: 'pending', occurredAt: '2020-01-01T00:00:00.000Z' }));
  assert.equal(late.state, 'confirmed');
  assert.equal(late.disposition, 'ignored_stale');
  const bad = await evidence.observe(actor, nextEvent(event, 2, { kind: 'pending' }), 'invalid');
  assert.equal(bad.state, 'confirmed');
  assert.equal(bad.needsReconciliation, true);
  assert.equal((await observe(actor, nextEvent(event, 3, { kind: 'reversed' }))).state, 'reversed');
  assert.equal((await observe(actor, nextEvent(event, 4, { kind: 'captured', source: 'synthetic_reconciliation' }))).state, 'reversed');
  assert.equal((await observe(actor, nextEvent(event, 5, { kind: 'disputed' }))).state, 'disputed');
  assert.equal((await observe(actor, nextEvent(event, 6, { kind: 'captured', source: 'synthetic_reconciliation' }))).state, 'disputed');
});

test('two competing financial observations serialize and one stale version loses; exact concurrent retries deduplicate', async () => {
  const { actor, event } = await fixture();
  const contenders = await Promise.allSettled([observe(actor, event), observe(actor, nextEvent(event, 0, { kind: 'unknown' }))]);
  assert.equal(contenders.filter((row) => row.status === 'fulfilled').length, 1);
  const loser = contenders.find((row) => row.status === 'rejected');
  assert.ok(loser?.status === 'rejected');
  assert.equal(loser.reason.code, 'VERSION_CONFLICT');
  const retry = nextEvent(event, 1, { kind: 'authorized' });
  const receipts = await Promise.all(Array.from({ length: 8 }, () => observe(actor, retry)));
  for (const receipt of receipts) assert.deepEqual(receipt, receipts[0]);
  assert.equal(await admin.paymentEvidenceLabEvent.count({ where: { caseId: event.caseId } }), 2);
});

test('lab RLS requires opt-in plus effective branch membership; foreign courier and merchant cannot observe or read', async () => {
  const a = await fixture();
  const b = await identity('b');
  const courier = await courierLogin();
  await observe(a.actor, a.event);
  await withSubject(db, a.actor, async (tx) => { assert.equal(await tx.paymentEvidenceLabCase.count(), 0); });
  for (const actor of [b, { subjectId: courier.subjectId }]) {
    await assert.rejects(observe(actor, a.event), { code: 'NOT_FOUND' });
    await withSubject(db, actor, async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.payment_evidence_lab', 'synthetic-v1', true)`;
      assert.equal(await tx.paymentEvidenceLabCase.count({ where: { id: a.event.caseId } }), 0);
      assert.equal(await tx.paymentEvidenceLabEvent.count({ where: { caseId: a.event.caseId } }), 0);
    });
  }
  await assert.rejects(createEvidenceLabService(createPaymentEvidenceStore(admin)).observe(a.actor, a.event, ''), { code: 'INFRASTRUCTURE_UNAVAILABLE' });
});

test('RLS-hidden global event IDs produce a safe conflict without exposing foreign receipts', async () => {
  const a = await fixture();
  const b = await fixture('b');
  await observe(a.actor, a.event);
  await assert.rejects(observe(b.actor, { ...b.event, eventId: a.event.eventId }), { code: 'IDEMPOTENCY_CONFLICT' });
  assert.equal(await admin.paymentEvidenceLabEvent.count({ where: { caseId: b.event.caseId } }), 0);
});

test('revoked membership prevents even original evidence replay; evidence remains immutable', async () => {
  const { actor, event } = await fixture();
  await observe(actor, event);
  try {
    await admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled: false } });
    await assert.rejects(observe(actor, event), { code: 'NOT_FOUND' });
  } finally { await admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled: true } }); }
  const row = await admin.paymentEvidenceLabEvent.findUniqueOrThrow({ where: { eventId: event.eventId } });
  await assert.rejects(admin.paymentEvidenceLabEvent.update({ where: { id: row.id }, data: { state: 'confirmed' } }));
  await assert.rejects(admin.paymentEvidenceLabEvent.delete({ where: { id: row.id } }));
  await assert.rejects(withSubject(db, actor, (tx) => tx.paymentEvidenceLabCase.create({ data: {
    id: randomUUID(), merchantId: 'merchant_synthetic_a', branchId: 'branch_synthetic_a',
    expectedAmountMinor: 1, currency: 'MXN', providerPaymentId: 'fixture_' + randomUUID(),
  } })));
});

test('synthetic financial confirmation is not wired to the default dispatch lab', async () => {
  const { actor, event } = await fixture();
  await observe(actor, { ...event, kind: 'captured', source: 'synthetic_reconciliation' });
  const courier = await courierLogin();
  const scenario = await admin.dispatchLabScenario.create({ data: { id: randomUUID() } });
  const execute = createDispatchLabService(createDispatchLabRepository(db));
  await assert.rejects(execute({ subjectId: courier.subjectId }, { operation: 'offer', syntheticDeliveryRef: scenario.id, ttlSeconds: 60 }, randomUUID()),
    { code: 'FINANCIAL_INELIGIBLE' });
  assert.equal(await admin.dispatchLabOffer.count({ where: { syntheticDeliveryRef: scenario.id } }), 0);
});
