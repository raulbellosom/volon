import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { parsePaymentRequest, validatePaymentKey, PaymentFailure } from '../src/modules/payments/payment.contract.ts';
import { createPaymentService, type PaymentStore } from '../src/modules/payments/payment.service.ts';
import { parseLabEvidence, denyLabOrigin, type LabEvidence, type EvidenceReceipt } from '../src/modules/payments/evidence.contract.ts';
import { projectEvidence } from '../src/modules/payments/evidence.policy.ts';
import { createEvidenceLabService } from '../src/modules/payments/evidence.service.ts';
import { denyFinancialEligibility } from '../src/modules/dispatch-lab/dispatch.ports.ts';

const actor = { subjectId: randomUUID() };
const request = { deliveryId: randomUUID() };
const event: LabEvidence = { caseId: randomUUID(), eventId: 'fixture_event', providerPaymentId: 'fixture_payment',
  source: 'synthetic_webhook', kind: 'captured', amountMinor: 4900, currency: 'MXN', occurredAt: '2026-10-19T00:00:00.000Z', expectedVersion: 0 };
const expected = { expectedAmountMinor: 4900, currency: 'MXN', providerPaymentId: 'fixture_payment' };
const previous = (state: EvidenceReceipt['state']): EvidenceReceipt => ({ caseId: event.caseId, eventId: 'fixture_previous',
  state, version: 1, disposition: 'applied', needsReconciliation: state !== 'confirmed', receivedAt: event.occurredAt });

test('finance contract rejects client money, paid flags, actors, clocks and malformed keys', () => {
  assert.deepEqual(parsePaymentRequest(request), request);
  for (const input of [null, [], {}, { deliveryId: 'other' }, ...['amountMinor', 'currency', 'paid', 'eligible', 'subjectId',
    'providerPaymentId', 'expectedVersion', 'createdAt'].map((key) => ({ ...request, [key]: true }))])
    assert.throws(() => parsePaymentRequest(input), { code: 'INVALID_COMMAND' });
  for (const key of ['', ' ', 'x'.repeat(129), 'é', '\n']) assert.throws(() => validatePaymentKey(key));
  validatePaymentKey('opaque_123-KEY');
});

test('operative eligibility has no positive provider, and errors never disclose infrastructure', async () => {
  const store: PaymentStore = { authorize: async () => {}, prepare: async () => { throw new Error('postgres://private-secret'); } };
  const service = createPaymentService(store);
  assert.deepEqual(await service.eligibility(actor, request), { ...request, eligible: false, reason: 'PSP_NOT_CONFIGURED' });
  await assert.rejects(service.prepare(actor, request, 'key'), { message: 'INFRASTRUCTURE_UNAVAILABLE' });
  await assert.rejects(service.prepare({ subjectId: 'forged' }, request, 'key'), { code: 'NOT_FOUND' });
  assert.equal(denyFinancialEligibility.evaluate(request.deliveryId), 'missing');
});

test('evidence contract canonicalizes property order and rejects extra/unbounded/malformed data', () => {
  assert.equal(JSON.stringify(parseLabEvidence(Object.fromEntries(Object.entries(event).reverse()))), JSON.stringify(event));
  for (const patch of [{ paid: true }, { card: 'sensitive' }, { eventId: 'real-provider' }, { amountMinor: -1 },
    { amountMinor: 1.1 }, { amountMinor: 2147483648 }, { currency: 'mxn' }, { occurredAt: '2026-02-31T00:00:00.000Z' },
    { expectedVersion: -1 }, { expectedVersion: 2147483647 }, { source: 'client' }, { kind: 'paid' },
    { source: ['synthetic_webhook'] }, { kind: ['captured'] }])
    assert.throws(() => parseLabEvidence({ ...event, ...patch }), { code: 'INVALID_COMMAND' });
});

test('unverified origin and mismatched money, currency or external ID cannot confirm', () => {
  assert.equal(projectEvidence(null, event, expected, 'rejected').disposition, 'rejected_origin');
  for (const patch of [{ amountMinor: 1 }, { currency: 'USD' }, { providerPaymentId: 'fixture_other' }])
    assert.deepEqual(projectEvidence(null, { ...event, ...patch }, expected, 'synthetic-fixture'),
      { state: 'pending', disposition: 'mismatch', needsReconciliation: true });
});

test('authorization, webhook capture and reconciled synthetic capture are distinct', () => {
  assert.equal(projectEvidence(null, { ...event, kind: 'authorized' }, expected, 'synthetic-fixture').state, 'authorized');
  assert.equal(projectEvidence(null, event, expected, 'synthetic-fixture').state, 'capture_pending');
  assert.deepEqual(projectEvidence(null, { ...event, source: 'synthetic_reconciliation' }, expected, 'synthetic-fixture'),
    { state: 'confirmed', disposition: 'applied', needsReconciliation: false });
  for (const kind of ['pending', 'unknown', 'rejected'] as const)
    assert.equal(projectEvidence(null, { ...event, kind }, expected, 'synthetic-fixture').needsReconciliation, true);
});

test('late lower states never undo confirmation; reversals and disputes remain blocking', () => {
  for (const kind of ['pending', 'authorized', 'rejected', 'capture_pending', 'unknown'] as const)
    assert.equal(projectEvidence(previous('confirmed'), { ...event, kind }, expected, 'synthetic-fixture').disposition, 'ignored_stale');
  for (const state of ['reversed', 'disputed'] as const)
    assert.equal(projectEvidence(previous(state), { ...event, source: 'synthetic_reconciliation' }, expected, 'synthetic-fixture').state, state);
  assert.equal(projectEvidence(previous('confirmed'), { ...event, kind: 'disputed' }, expected, 'synthetic-fixture').state, 'disputed');
  assert.equal(projectEvidence(previous('capture_pending'), { ...event, kind: 'pending' }, expected, 'synthetic-fixture').state, 'capture_pending');
});

test('laboratory denies origin by default; verifier errors fail closed before persistence', async () => {
  let calls = 0;
  const store = { observe: async (_actor: unknown, _event: unknown, _hash: string, origin: string) => {
    calls++; assert.equal(origin, 'rejected'); return previous('pending');
  } };
  await createEvidenceLabService(store).observe(actor, event, 'untrusted');
  assert.equal(await denyLabOrigin.verify('anything', 'anything'), 'rejected');
  await assert.rejects(createEvidenceLabService(store, { verify: async () => { throw new Error('secret'); } })
    .observe(actor, event, 'proof'), { message: 'INFRASTRUCTURE_UNAVAILABLE' });
  assert.equal(calls, 1);
  await assert.rejects(createEvidenceLabService(store).observe(actor, event, 'x'.repeat(513)), { code: 'INVALID_COMMAND' });
  assert.ok(new PaymentFailure('NOT_FOUND') instanceof Error);
});
