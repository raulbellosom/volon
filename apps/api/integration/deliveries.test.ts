import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { withSubject } from '../src/infrastructure/database.ts';
import { admin, db, login, newQuote, createDelivery, readDelivery, base } from './delivery-fixtures.ts';

test('Delivery: creates requested without Payment/Order and preserves the immutable quote snapshot', async () => {
  const a = await login();
  const quoteId = await newQuote(a.token);
  const original = await admin.pricingQuote.findUniqueOrThrow({ where: { id: quoteId } });
  const created = await createDelivery(a.token, quoteId);
  assert.equal(created.status, 201);
  const delivery = await created.json();
  assert.equal(created.headers.get('cache-control'), 'no-store');
  assert.equal(delivery.status, 'requested');
  assert.equal(delivery.version, 1);
  assert.equal(delivery.pricing.amountMinor, original.amountMinor);
  assert.equal(delivery.pricing.rateVersion, original.rateVersion);
  assert.deepEqual(delivery.pricing.lines, [
    { code: 'base_delivery', amountMinor: original.baseAmountMinor },
    { code: 'distance_delivery', amountMinor: original.distanceAmountMinor },
  ]);
  for (const field of ['paid', 'payment', 'dispatchEligible', 'subjectId', 'idempotencyKeyHash', 'routeSnapshot']) {
    assert.equal(field in delivery, false);
  }
  const stored = await admin.delivery.findUniqueOrThrow({ where: { id: delivery.deliveryId } });
  assert.deepEqual(stored.routeSnapshot, original.request);
  await admin.pricingQuote.update({ where: { id: quoteId }, data: {
    amountMinor: original.amountMinor + 500, baseAmountMinor: original.baseAmountMinor + 500, rateVersion: 'synthetic-v2',
  } });
  assert.deepEqual(await (await readDelivery(a.token, delivery.deliveryId)).json(), delivery);
  await assert.rejects(admin.delivery.update({ where: { id: delivery.deliveryId }, data: { rateVersion: 'changed' } }));
});

test('Delivery: persistent identical replay survives expiry and JSON property order changes', async () => {
  const a = await login();
  const quoteId = await newQuote(a.token);
  const key = randomUUID();
  const first = await createDelivery(a.token, quoteId, key);
  assert.equal(first.status, 201);
  const snapshot = await first.json();
  await admin.pricingQuote.update({ where: { id: quoteId }, data: { expiresAt: new Date(0) } });
  const replay = await fetch(`${base}/v1/deliveries`, { method: 'POST',
    headers: { authorization: `Bearer ${a.token}`, 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify({ quoteId, branchId: 'branch_synthetic_a' }),
  });
  assert.equal(replay.status, 201);
  assert.deepEqual(await replay.json(), snapshot);
  assert.equal(await admin.delivery.count({ where: { quoteId } }), 1);
});

test('Delivery: same key with a different quote conflicts without consuming the second quote', async () => {
  const a = await login();
  const q1 = await newQuote(a.token);
  const q2 = await newQuote(a.token);
  const key = randomUUID();
  assert.equal((await createDelivery(a.token, q1, key)).status, 201);
  const conflict = await createDelivery(a.token, q2, key);
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(await admin.delivery.count({ where: { quoteId: q2 } }), 0);
  assert.equal((await createDelivery(a.token, q2)).status, 201);
});

test('Delivery: simultaneous identical commands all resolve to one committed resource', async () => {
  const a = await login();
  const quoteId = await newQuote(a.token);
  const key = randomUUID();
  const responses = await Promise.all(Array.from({ length: 8 }, () => createDelivery(a.token, quoteId, key)));
  assert.deepEqual(responses.map((response) => response.status), Array(8).fill(201));
  const bodies = await Promise.all(responses.map((response) => response.json()));
  for (const body of bodies) assert.deepEqual(body, bodies[0]);
  assert.equal(await admin.delivery.count({ where: { quoteId } }), 1);
});

test('Delivery: concurrent distinct keys cannot reuse one quote', async () => {
  const a = await login();
  const quoteId = await newQuote(a.token);
  const responses = await Promise.all(Array.from({ length: 8 }, () => createDelivery(a.token, quoteId)));
  assert.equal(responses.filter((response) => response.status === 201).length, 1);
  assert.equal(responses.filter((response) => response.status === 409).length, 7);
  for (const response of responses.filter((item) => item.status === 409)) {
    assert.equal((await response.json()).code, 'QUOTE_ALREADY_USED');
  }
  assert.equal(await admin.delivery.count({ where: { quoteId } }), 1);
});

test('Delivery: rejects expiry, unknown quotes and quotes outside the authorized branch', async () => {
  const a = await login();
  const b = await login('b');
  const expired = await newQuote(a.token);
  await admin.pricingQuote.update({ where: { id: expired }, data: { expiresAt: new Date(0) } });
  const denial = await createDelivery(a.token, expired);
  assert.equal(denial.status, 409);
  assert.equal((await denial.json()).code, 'QUOTE_EXPIRED');
  const bQuote = await newQuote(b.token, 'b');
  for (const quoteId of [bQuote, randomUUID()]) {
    const result = await createDelivery(a.token, quoteId);
    assert.equal(result.status, 404);
    assert.equal((await result.json()).code, 'QUOTE_NOT_FOUND');
  }
  assert.equal((await createDelivery(a.token, bQuote, randomUUID(), 'branch_synthetic_b')).status, 403);
  assert.equal(await admin.delivery.count({ where: { quoteId: { in: [expired, bQuote] } } }), 0);
});

test('Delivery: strict tenant/branch isolation and immediate revocation include idempotent replays', async () => {
  const a = await login();
  const b = await login('b');
  const quoteId = await newQuote(a.token);
  const key = randomUUID();
  const created = await createDelivery(a.token, quoteId, key);
  assert.equal(created.status, 201);
  const delivery = await created.json();
  assert.equal((await readDelivery(b.token, delivery.deliveryId)).status, 404);
  assert.equal((await readDelivery('invalid', delivery.deliveryId)).status, 401);
  assert.equal((await createDelivery('invalid', quoteId)).status, 401);
  assert.equal((await withSubject(db, b, (tx) => tx.delivery.findMany({ where: { id: delivery.deliveryId } }))).length, 0);
  assert.equal((await db.delivery.findMany()).length, 0);
  for (const setEnabled of [
    (enabled: boolean) => admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled } }),
    (enabled: boolean) => admin.branch.update({ where: { id: 'branch_synthetic_a' }, data: { enabled } }),
    (enabled: boolean) => admin.merchant.update({ where: { id: 'merchant_synthetic_a' }, data: { enabled } }),
  ]) {
    await setEnabled(false);
    try {
      assert.equal((await readDelivery(a.token, delivery.deliveryId)).status, 404);
      assert.equal((await createDelivery(a.token, quoteId, key)).status, 403);
    } finally { await setEnabled(true); }
  }
});

test('Delivery: missing key and injected state/payment/identity fields are rejected', async () => {
  const a = await login();
  const quoteId = await newQuote(a.token);
  for (const [extra, key, code] of [[{}, '', 'INVALID_IDEMPOTENCY_KEY'],
    [{ paid: true }, randomUUID(), 'INVALID_DELIVERY_REQUEST'],
    [{ status: 'dispatching' }, randomUUID(), 'INVALID_DELIVERY_REQUEST'],
    [{ subjectId: a.subjectId }, randomUUID(), 'INVALID_DELIVERY_REQUEST']] as const) {
    const response = await fetch(`${base}/v1/deliveries`, { method: 'POST',
      headers: { authorization: `Bearer ${a.token}`, 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify({ branchId: 'branch_synthetic_a', quoteId, ...extra }),
    });
    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, code);
  }
  assert.equal(await admin.delivery.count({ where: { quoteId } }), 0);
});

test('Delivery: identical key values are independent per actor/branch, but quote consumption is global', async () => {
  const a = await login();
  const b = await login('b');
  const key = randomUUID();
  const qA = await newQuote(a.token);
  const qB = await newQuote(b.token, 'b');
  assert.equal((await createDelivery(a.token, qA, key)).status, 201);
  assert.equal((await createDelivery(b.token, qB, key, 'branch_synthetic_b')).status, 201);
  const sharedId = 'membership_synthetic_b_shared_a';
  await admin.membership.upsert({ where: { id: sharedId }, update: { subjectId: b.subjectId, enabled: true },
    create: { id: sharedId, subjectId: b.subjectId, branchId: 'branch_synthetic_a', merchantId: 'merchant_synthetic_a' } });
  try {
    const result = await createDelivery(b.token, qA, key);
    assert.equal(result.status, 409);
    assert.equal((await result.json()).code, 'QUOTE_ALREADY_USED');
  } finally { await admin.membership.update({ where: { id: sharedId }, data: { enabled: false } }); }
});

test('Delivery: concurrent different commands on the same key commit only one payload', async () => {
  const a = await login();
  const quotes = [await newQuote(a.token), await newQuote(a.token)];
  const key = randomUUID();
  const results = await Promise.all(quotes.map((quoteId) => createDelivery(a.token, quoteId, key)));
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  for (const result of results.filter((item) => item.status === 409)) {
    assert.equal((await result.json()).code, 'IDEMPOTENCY_CONFLICT');
  }
  assert.equal(await admin.delivery.count({ where: { quoteId: { in: quotes } } }), 1);
});
