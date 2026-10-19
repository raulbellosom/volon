import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { parseDispatchCommand, parseDispatchReceipt, validateDispatchKey } from '../src/modules/dispatch-lab/dispatch.contract.ts';
import { denyFinancialEligibility } from '../src/modules/dispatch-lab/dispatch.ports.ts';

test('dispatch lab contract: exact versioned commands reject payment, actor, clock and hidden properties', () => {
  const ref = randomUUID();
  assert.deepEqual(parseDispatchCommand({ ttlSeconds: 20, syntheticDeliveryRef: ref, operation: 'offer' }),
    { operation: 'offer', syntheticDeliveryRef: ref, ttlSeconds: 20 });
  for (const value of [null, [], {}, { operation: 'offer', syntheticDeliveryRef: ref, ttlSeconds: 0 },
    { operation: 'offer', syntheticDeliveryRef: ref, ttlSeconds: 301 },
    { operation: 'offer', syntheticDeliveryRef: 'requested', ttlSeconds: 10 },
    ...['paymentVerified', 'paid', 'eligible', 'subjectId', 'courierId', 'expiresAt'].map((key) =>
      ({ operation: 'offer', syntheticDeliveryRef: ref, ttlSeconds: 20, [key]: true })),
    { operation: 'accept', id: ref, expectedVersion: 0 },
    { operation: 'accept', id: ref, expectedVersion: 2147483647 },
    { operation: 'accept', id: ref, expectedVersion: 1.1 },
    { operation: 'busy', id: ref, expectedVersion: 1 }]) assert.throws(() => parseDispatchCommand(value), { code: 'INVALID_COMMAND' });
  for (const operation of ['accept', 'decline', 'withdraw', 'expire', 'revoke'])
    assert.equal(parseDispatchCommand({ operation, id: ref, expectedVersion: 1 }).operation, operation);
  for (const key of ['', 'has spaces', 'x'.repeat(129)]) assert.throws(() => validateDispatchKey(key));
  validateDispatchKey('opaque_KEY-123');
});

test('dispatch lab contract: receipts contain only opaque references, state/version and canonical timestamps', () => {
  const receipt = { kind: 'offer', id: randomUUID(), syntheticDeliveryRef: randomUUID(), courierId: 'courier_synthetic_a',
    status: 'offered', version: 1, changedAt: '2026-10-19T00:00:00.000Z', expiresAt: '2026-10-19T00:00:20.000Z' };
  assert.deepEqual(parseDispatchReceipt(receipt), receipt);
  for (const extra of ['subjectId', 'idempotencyKeyHash', 'requestHash', 'address', 'coordinates', 'snapshot'])
    assert.throws(() => parseDispatchReceipt({ ...receipt, [extra]: 'secret' }));
  assert.throws(() => parseDispatchReceipt({ ...receipt, changedAt: '2026-02-31T00:00:00.000Z' }));
  assert.throws(() => parseDispatchReceipt({ ...receipt, status: 'busy' }));
});

test('dispatch lab finance: default port denies every identifier and has no environment selector', () => {
  for (const ref of [randomUUID(), '', 'paid', 'paymentVerified']) assert.equal(denyFinancialEligibility.evaluate(ref), 'missing');
  assert.equal(Object.isFrozen(denyFinancialEligibility), true);
});
