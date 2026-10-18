import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { withSubject } from '../src/infrastructure/database.ts';
import { admin, db, login, newQuote, createDelivery } from './delivery-fixtures.ts';

async function whileQuoteLocked(quoteId: string, work: () => Promise<void>) {
  let release: () => void = () => {};
  let acquired: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { acquired = resolve; });
  const blocker = admin.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'delivery-quote:' + quoteId}, 0))::text`;
    acquired();
    await gate;
  }, { timeout: 10000 });
  await ready;
  try { await work(); }
  finally { release(); await blocker; }
}

async function waitForBlockedRequest() {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const [row] = await admin.$queryRaw<{ waiting: number }[]>`
      SELECT count(*)::integer AS waiting FROM pg_stat_activity
      WHERE usename = 'delivery_api' AND wait_event = 'advisory'`;
    if (row && row.waiting > 0) return;
    await setTimeout(25);
  }
  throw new Error('Request did not reach the PostgreSQL quote lock');
}

test('Delivery transaction: rechecks wall-clock expiry after waiting for the quote lock', async () => {
  const a = await login();
  const quoteId = await newQuote(a.token);
  let pending: Promise<Response> | undefined;
  await whileQuoteLocked(quoteId, async () => {
    pending = createDelivery(a.token, quoteId);
    await waitForBlockedRequest();
    // Expiry occurs after the API transaction started; now() would be stale here.
    await admin.$executeRaw`UPDATE app."PricingQuote" SET "expiresAt" = clock_timestamp() WHERE id = ${quoteId}`;
  });
  assert.ok(pending);
  const response = await pending;
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'QUOTE_EXPIRED');
  assert.equal(await admin.delivery.count({ where: { quoteId } }), 0);
});

test('Delivery transaction: revocation committed during a lock wait prevents creation', async () => {
  const a = await login();
  const quoteId = await newQuote(a.token);
  let pending: Promise<Response> | undefined;
  try {
    await whileQuoteLocked(quoteId, async () => {
      pending = createDelivery(a.token, quoteId);
      await waitForBlockedRequest();
      await admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled: false } });
    });
    assert.ok(pending);
    const response = await pending;
    assert.ok([403, 404].includes(response.status));
    assert.equal(await admin.delivery.count({ where: { quoteId } }), 0);
  } finally {
    await admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled: true } });
  }
});

test('Delivery transaction: a deferred PostgreSQL failure rolls back command and quote consumption; retry succeeds', async () => {
  const a = await login();
  const quoteId = await newQuote(a.token);
  const key = randomUUID();
  await admin.$executeRawUnsafe(`CREATE FUNCTION app.test_delivery_commit_failure() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic commit failure'; END; $$`);
  try {
    await admin.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER test_delivery_commit_failure
      AFTER INSERT ON app."Delivery" DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION app.test_delivery_commit_failure()`);
    try {
      const failed = await createDelivery(a.token, quoteId, key);
      assert.equal(failed.status, 503);
      assert.ok(!(await failed.text()).includes('synthetic commit failure'));
      assert.equal(await admin.delivery.count({ where: { quoteId } }), 0);
    } finally { await admin.$executeRawUnsafe('DROP TRIGGER test_delivery_commit_failure ON app."Delivery"'); }
  } finally { await admin.$executeRawUnsafe('DROP FUNCTION app.test_delivery_commit_failure()'); }
  const retried = await createDelivery(a.token, quoteId, key);
  assert.equal(retried.status, 201);
  assert.equal(await admin.delivery.count({ where: { quoteId } }), 1);
});

test('Delivery transaction: RLS rejects a forged snapshot and a cross-tenant insert without application filters', async () => {
  const a = await login();
  const b = await login('b');
  const quoteId = await newQuote(a.token);
  const quote = await admin.pricingQuote.findUniqueOrThrow({ where: { id: quoteId } });
  const data = { id: randomUUID(), quoteId, subjectId: a.subjectId, branchId: quote.branchId,
    merchantId: quote.merchantId, amountMinor: quote.amountMinor, baseAmountMinor: quote.baseAmountMinor,
    distanceAmountMinor: quote.distanceAmountMinor, currency: quote.currency, rateVersion: quote.rateVersion,
    routeSnapshot: { branchId: quote.branchId, pickup: { lat: 0, lng: 0 }, dropoff: { lat: 0.02, lng: 0.02 }, serviceType: 'local_delivery' },
    idempotencyKeyHash: 'a'.repeat(64), requestHash: 'b'.repeat(64) };
  await assert.rejects(withSubject(db, a, (tx) => tx.delivery.create({ data: {
    ...data, amountMinor: data.amountMinor + 1, baseAmountMinor: data.baseAmountMinor + 1,
  } })));
  await assert.rejects(withSubject(db, b, (tx) => tx.delivery.create({ data: { ...data, subjectId: b.subjectId } })));
  assert.equal(await admin.delivery.count({ where: { quoteId } }), 0);
});
