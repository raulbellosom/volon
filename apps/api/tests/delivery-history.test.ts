import assert from 'node:assert/strict';
import test from 'node:test';
import { InvalidDeliveryHistoryQuery, type DeliveryResponse } from '@delivery/contracts';
import { decodeDeliveryHistoryCursor, encodeDeliveryHistoryCursor } from '../src/modules/deliveries/delivery-history.cursor.ts';
import { createDeliveryHistoryHandler } from '../src/modules/deliveries/delivery-history.handler.ts';
import { createDeliveryHistoryService } from '../src/modules/deliveries/delivery-history.service.ts';

const actor = { subjectId: '11111111-1111-4111-8111-111111111111' };
const boundary = { createdAt: '2026-10-18T00:00:00.123Z', deliveryId: 'delivery_b' };
const item = (id: string): DeliveryResponse => ({ deliveryId: id, publicReference: 'VL-26-7K9M2Q', branchId: 'branch_a', quoteId: `quote_${id}`,
  status: 'requested', version: 1, createdAt: boundary.createdAt,
  pricing: { amountMinor: 100, currency: 'MXN', rateVersion: 'synthetic-v1',
    lines: [{ code: 'base_delivery', amountMinor: 100 }, { code: 'distance_delivery', amountMinor: 0 }] } });
const request = (query = 'branchId=branch_a') => new Request(`http://local/v1/deliveries?${query}`);

test('history cursor: canonical roundtrip and strict rejection of malformed or cross-branch boundaries', () => {
  const cursor = encodeDeliveryHistoryCursor('branch_a', boundary);
  assert.deepEqual(decodeDeliveryHistoryCursor(cursor, 'branch_a'), boundary);
  assert.equal(decodeDeliveryHistoryCursor(null, 'branch_a'), null);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  for (const bad of ['', 'x'.repeat(1025), 'not_JSON', `${cursor}=`,
    encode([]), encode({ ...boundary, v: 2, branchId: 'branch_a' }),
    encode({ v: 1, branchId: 'branch_a', ...boundary, private: true }),
    encode({ v: 1, branchId: 'branch_a', ...boundary, deliveryId: '../x' }),
    encode({ v: 1, branchId: 'branch_a', ...boundary, createdAt: '2026-02-30T00:00:00.000Z' }),
    encode({ v: 1, branchId: 'branch_a', ...boundary, createdAt: '0000-01-01T00:00:00.000Z' }),
    encode({ v: 1, branchId: 'branch_a', ...boundary, createdAt: '2026-10-18T00:00:00Z' }),
    encode({ v: 1, branchId: 'branch_a', ...boundary, createdAt: '2026-10-18T00:00:00.1234Z' }),
    Buffer.from(' ' + JSON.stringify({ v: 1, branchId: 'branch_a', ...boundary })).toString('base64url'),
  ]) assert.throws(() => decodeDeliveryHistoryCursor(bad, 'branch_a'), InvalidDeliveryHistoryQuery);
  assert.throws(() => decodeDeliveryHistoryCursor(cursor, 'branch_b'), InvalidDeliveryHistoryQuery);
});

test('history service: lookahead never leaks and cursor uses last returned item, not extra row', async () => {
  const service = createDeliveryHistoryService({ readHistory: async (identity, query, after) => {
    assert.deepEqual(identity, actor);
    assert.equal(query.limit, 2);
    assert.equal(after, null);
    return [item('delivery_c'), item('delivery_b'), item('delivery_a')];
  } });
  const page = await service(actor, { branchId: 'branch_a', limit: 2, cursor: null });
  assert.ok(page?.nextCursor);
  assert.deepEqual(page.items.map((row) => row.deliveryId), ['delivery_c', 'delivery_b']);
  assert.deepEqual(decodeDeliveryHistoryCursor(page.nextCursor, 'branch_a'), boundary);
});

test('history service: final/full page and empty page have no cursor; invisible branch stays distinct', async () => {
  for (const rows of [[], [item('delivery_b'), item('delivery_a')], null]) {
    const service = createDeliveryHistoryService({ readHistory: async () => rows });
    const page = await service(actor, { branchId: 'branch_a', limit: 2, cursor: null });
    assert.deepEqual(page, rows === null ? null : { items: rows, nextCursor: null });
  }
});

test('history service: inconsistent repository scope fails closed instead of serializing foreign data', async () => {
  const service = createDeliveryHistoryService({ readHistory: async () => [{ ...item('foreign'), branchId: 'other' }] });
  await assert.rejects(service(actor, { branchId: 'branch_a', limit: 20, cursor: null }));
});

test('history HTTP: authenticates before parsing, rejects bad query/cursor and preserves safe errors', async () => {
  for (const failure of ['unauthenticated', 'auth', 'database', 'notfound', 'invalid']) {
    const handler = createDeliveryHistoryHandler({
      authenticate: async () => {
        if (failure === 'auth') throw new Error('private auth secret');
        return failure === 'unauthenticated' ? null : actor;
      },
      readHistory: async () => {
        if (failure === 'database') throw new Error('postgres private secret');
        if (failure === 'invalid') return [{ ...item('delivery_b'), version: 1, createdAt: 'private' }];
        return null;
      },
    });
    const response = await handler(request());
    assert.equal(response.status, failure === 'unauthenticated' ? 401 : failure === 'notfound' ? 404 : 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('content-type'), 'application/problem+json');
    assert.doesNotMatch(await response.text(), /private|postgres/);
  }
  const handler = createDeliveryHistoryHandler({ authenticate: async () => actor,
    readHistory: async () => { throw new Error('Must not run'); } });
  for (const query of ['', 'branchId=branch_a&limit=101', 'branchId=branch_a&cursor=bad']) {
    const response = await handler(request(query));
    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, 'INVALID_DELIVERY_HISTORY_QUERY');
  }
});

test('history HTTP: success returns only the closed JSON page without caching', async () => {
  const cursor = encodeDeliveryHistoryCursor('branch_a', boundary);
  const handler = createDeliveryHistoryHandler({ authenticate: async () => actor,
    readHistory: async (_, query, after) => {
      assert.equal(query.branchId, 'branch_a');
      assert.deepEqual(after, boundary);
      return [];
    } });
  const response = await handler(request(`branchId=branch_a&cursor=${cursor}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { items: [], nextCursor: null });
});
