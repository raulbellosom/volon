import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseDeliveryHistoryQuery, parseDeliveryHistoryResponse,
  InvalidDeliveryHistoryQuery, InvalidDeliveryResponse } from '../src/index.ts';

const item = { deliveryId: 'delivery_a', publicReference: 'VL-26-7K9M2Q', branchId: 'branch_a', quoteId: 'quote_a',
  status: 'requested', version: 1, createdAt: '2026-10-18T00:00:00.000Z',
  pricing: { amountMinor: 100, currency: 'MXN', rateVersion: 'synthetic-v1',
    lines: [{ code: 'base_delivery', amountMinor: 100 }, { code: 'distance_delivery', amountMinor: 0 }] } };

test('history query: bounded defaults, explicit limits and closed singular parameters', () => {
  assert.deepEqual(parseDeliveryHistoryQuery(new URLSearchParams('branchId=branch_a')),
    { branchId: 'branch_a', limit: 20, cursor: null });
  for (const limit of [1, 20, 100]) {
    assert.equal(parseDeliveryHistoryQuery(new URLSearchParams(`branchId=a&limit=${limit}&cursor=abc`)).limit, limit);
  }
  for (const query of ['', 'branchId=', 'branchId=a&branchId=b', 'branchId=a&limit=1&limit=2',
    'branchId=a&cursor=a&cursor=b', 'branchId=../a', `branchId=${'a'.repeat(129)}`, 'branchId=a&subjectId=b',
    'branchId=a&cursor=', 'branchId=a&cursor=abc=', `branchId=a&cursor=${'a'.repeat(1025)}`,
    ...['', '0', '101', '-1', '1.5', '1e2', '01', ' 1', '+1', 'Infinity', '1000'].map((limit) =>
      `branchId=a&limit=${encodeURIComponent(limit)}`),
  ]) assert.throws(() => parseDeliveryHistoryQuery(new URLSearchParams(query)), InvalidDeliveryHistoryQuery);
});

test('history response: reuses strict Delivery DTO, validates empty/final pages and freezes projection', () => {
  assert.deepEqual(parseDeliveryHistoryResponse({ items: [], nextCursor: null }), { items: [], nextCursor: null });
  const page = parseDeliveryHistoryResponse({ items: [item], nextCursor: 'opaque' });
  assert.deepEqual(page.items, [item]);
  assert.notEqual(page.items[0], item);
  assert.ok(Object.isFrozen(page.items));
  assert.ok(Object.isFrozen(page.items[0]?.pricing));
  for (const value of [null, {}, { items: [], nextCursor: 'opaque' },
    { items: [item], nextCursor: null, totalCount: 1 }, { items: [item], nextCursor: '' },
    { items: [item], nextCursor: 'x'.repeat(1025) }, { items: [item], nextCursor: 1 },
    { items: Array.from({ length: 101 }, () => item), nextCursor: null },
    ...['subjectId', 'merchantId', 'idempotencyKeyHash', 'requestHash', 'routeSnapshot'].map((key) =>
      ({ items: [{ ...item, [key]: 'private' }], nextCursor: null })),
    { items: [{ ...item, pricing: { ...item.pricing, amountMinor: 999 } }], nextCursor: null },
  ]) assert.throws(() => parseDeliveryHistoryResponse(value), InvalidDeliveryResponse);
});

test('history schema: bounded page response references the existing Delivery response contract', async () => {
  const schema = JSON.parse(await readFile(new URL('../delivery-history.schema.json', import.meta.url), 'utf8'));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.limit.maximum, 100);
  assert.equal(schema.properties.limit.default, 20);
  assert.equal(schema.$defs.response.additionalProperties, false);
  assert.equal(schema.$defs.response.properties.items.maxItems, 100);
  assert.equal(schema.$defs.response.properties.items.items.$ref, 'urn:delivery:contracts:delivery:v1#/$defs/response');
});
