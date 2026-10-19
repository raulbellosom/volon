import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvalidDeliveryResponse, parseDeliveryQuoteResponse, parseDeliveryResponse,
} from '../src/index.ts';

const breakdown = [
  { code: 'base_delivery', amountMinor: 3000 },
  { code: 'distance_delivery', amountMinor: 700 },
];
const quote = {
  quoteId: 'quote_a', expiresAt: '2026-10-18T23:00:00.000Z',
  currency: 'MXN', amountMinor: 3700, lines: breakdown, coverage: 'eligible',
};
const delivery = {
  deliveryId: 'd1', publicReference: 'VL-26-7K9M2Q', branchId: 'b1', quoteId: 'quote_a', status: 'requested',
  version: 1, createdAt: '2026-10-18T23:00:00.000Z',
  pricing: { amountMinor: 3700, currency: 'MXN', lines: breakdown, rateVersion: 'synthetic-v1' },
};

test('quote responses: two exact lines, sum, UTC, and detached immutable DTO', () => {
  const received = parseDeliveryQuoteResponse(quote);
  assert.deepEqual(received, quote);
  assert.ok(Object.isFrozen(received) && Object.isFrozen(received.lines) && Object.isFrozen(received.lines[0]));
  quote.lines[0]!.amountMinor = 9999;
  assert.equal(received.lines[0]!.amountMinor, 3000);
  quote.lines[0]!.amountMinor = 3000;
});

test('quote responses: reject shape changes, forged totals, malformed dates or money', () => {
  for (const value of [
    null, [], { ...quote, attacker: 'x' },
    { ...quote, amountMinor: 3701 }, { ...quote, amountMinor: 3.7 },
    { ...quote, amountMinor: Number.MAX_SAFE_INTEGER + 1 },
    { ...quote, lines: [breakdown[0]] },
    { ...quote, lines: [breakdown[0], breakdown[0]] },
    { ...quote, lines: [{ ...breakdown[0], secret: 'x' }, breakdown[1]] },
    { ...quote, expiresAt: '2026-10-18' }, { ...quote, expiresAt: 'invalid' },
    { ...quote, coverage: 'unknown' }, { ...quote, currency: 'USD' },
  ]) assert.throws(() => parseDeliveryQuoteResponse(value), InvalidDeliveryResponse);
});

test('delivery responses: validate version, pricing, identifiers and currency', () => {
  const received = parseDeliveryResponse(delivery);
  assert.deepEqual(received, delivery);
  assert.ok(Object.isFrozen(received.pricing) && Object.isFrozen(received.pricing.lines));
  for (const value of [
    null, [], { ...delivery, version: 2 }, { ...delivery, status: 'delivered' },
    { ...delivery, deliveryId: 'unsafe/id' }, { ...delivery, createdAt: 'yesterday' },
    { ...delivery, pricing: { ...delivery.pricing, rateVersion: '' } },
    { ...delivery, pricing: { ...delivery.pricing, amountMinor: 3701 } },
    { ...delivery, pricing: { ...delivery.pricing, lines: [] } },
    { ...delivery, pricing: { ...delivery.pricing, hidden: 'x' } },
    { ...delivery, subjectId: 'leak' },
  ]) assert.throws(() => parseDeliveryResponse(value), InvalidDeliveryResponse);
});
