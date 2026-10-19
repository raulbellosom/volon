import assert from 'node:assert/strict';
import test from 'node:test';
import { commandDigest, createDeliveryService, DeliveryFailure,
  type DeliveryStore, type DeliveryTransaction } from '../src/modules/deliveries/delivery.service.ts';
import type { DeliveryResponse } from '@delivery/contracts';

const response: DeliveryResponse = { deliveryId: 'delivery_test', publicReference: 'VL-26-7K9M2Q', branchId: 'branch_test', quoteId: 'quote_test',
  status: 'requested', version: 1, createdAt: '2026-10-17T00:00:00.000Z', pricing: {
    amountMinor: 3000, currency: 'MXN', rateVersion: 'synthetic-v1', lines: [
      { code: 'base_delivery', amountMinor: 3000 }, { code: 'distance_delivery', amountMinor: 0 },
    ],
  } };
const request = { branchId: 'branch_test', quoteId: 'quote_test' };
const actor = { subjectId: 'synthetic' };

function fixture(overrides: Partial<DeliveryTransaction> = {}) {
  let inserts = 0;
  const tx: DeliveryTransaction = {
    lockKey: async () => {}, hasBranch: async () => true, findCommand: async () => null,
    loadLockedQuote: async () => ({ id: 'quote_test', branchId: 'branch_test', merchantId: 'merchant_test',
      expiresAt: new Date('2026-10-17T00:10:00Z'), amountMinor: 3000, baseAmountMinor: 3000,
      distanceAmountMinor: 0, currency: 'MXN', rateVersion: 'synthetic-v1',
      route: { branchId: 'branch_test', pickup: { lat: 0, lng: 0 }, dropoff: { lat: 0, lng: 0 }, serviceType: 'local_delivery' } }),
    quoteInUse: async () => false, currentTime: async () => new Date('2026-10-17T00:00:00Z'),
    insert: async () => { inserts++; return response; }, ...overrides,
  };
  const store: DeliveryStore = { transaction: async (_actor, operation) => operation(tx), readDelivery: async () => null };
  return { create: createDeliveryService(store), inserts: () => inserts };
}

test('Delivery service: expiry equality is rejected using transaction clock', async () => {
  const setup = fixture({ currentTime: async () => new Date('2026-10-17T00:10:00Z') });
  await assert.rejects(setup.create(actor, request, 'key'), { code: 'QUOTE_EXPIRED' });
  assert.equal(setup.inserts(), 0);
});

test('Delivery service: a normalized replay bypasses quote expiry but never revoked permission', async () => {
  const findCommand = async () => ({ requestHash: commandDigest(JSON.stringify(request)), response });
  const setup = fixture({ findCommand, loadLockedQuote: async () => { throw new Error('Must not reload quote'); } });
  assert.deepEqual(await setup.create(actor, { quoteId: 'quote_test', branchId: 'branch_test' }, 'key'), response);
  assert.equal(setup.inserts(), 0);
  await assert.rejects(fixture({ hasBranch: async () => false, findCommand }).create(actor, request, 'key'), { code: 'ACCESS_DENIED' });
});

test('Delivery service: conflicting key, missing quote and used quote never insert', async () => {
  for (const [overrides, code] of [
    [{ findCommand: async () => ({ requestHash: 'different', response }) }, 'IDEMPOTENCY_CONFLICT'],
    [{ loadLockedQuote: async () => null }, 'QUOTE_NOT_FOUND'],
    [{ quoteInUse: async () => true }, 'QUOTE_ALREADY_USED'],
  ] as const) {
    const setup = fixture(overrides);
    await assert.rejects(setup.create(actor, request, 'key'), (error: unknown) => error instanceof DeliveryFailure && error.code === code);
    assert.equal(setup.inserts(), 0);
  }
});
