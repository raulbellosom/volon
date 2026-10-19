import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';
import { createPaymentService, digest } from '../src/modules/payments/payment.service.ts';
import { createPaymentStore } from '../src/infrastructure/payment.repository.ts';
import { createDelivery, base } from './delivery-fixtures.ts';
import { fixture, delivery, identity, observe, nextEvent, payments, db, admin, required, withSubject } from './payment-fixtures.ts';

async function blocked(lock: string, start: () => Promise<unknown>, revoke: () => Promise<unknown>) {
  let release = () => {};
  let acquired = () => {};
  const ready = new Promise<void>((resolve) => { acquired = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const held = admin.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))::text`;
    acquired(); await gate;
  }, { timeout: 10000 });
  await ready;
  // Attach a handler before releasing the asynchronous failure.
  const result = start().then(() => ({ code: 'UNEXPECTED_SUCCESS' }), (error: unknown) => error);
  try {
    let waiting = false;
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const [row] = await admin.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE usename = 'delivery_api' AND wait_event = 'advisory'`;
      if (row && row.count > 0) { waiting = true; break; }
      await setTimeout(20);
    }
    assert.equal(waiting, true);
    await revoke();
  } finally { release(); await held; }
  return result;
}

test('membership revoked while commands wait is rechecked before preparing or recording evidence', async () => {
  const a = await fixture();
  const revoke = () => admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled: false } });
  const restore = () => admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled: true } });
  try {
    const result = await blocked('payment-delivery:' + a.id, () => payments.prepare(a.actor, { deliveryId: a.id }, randomUUID()), revoke);
    assert.ok(result && typeof result === 'object' && 'code' in result);
    assert.equal(result.code, 'NOT_FOUND');
  } finally { await restore(); }
  assert.equal(await admin.servicePaymentIntent.count({ where: { deliveryId: a.id } }), 0);
  try {
    const result = await blocked('payment-lab:' + a.event.caseId, () => observe(a.actor, a.event), revoke);
    assert.ok(result && typeof result === 'object' && 'code' in result);
    assert.equal(result.code, 'NOT_FOUND');
  } finally { await restore(); }
  assert.equal(await admin.paymentEvidenceLabEvent.count({ where: { caseId: a.event.caseId } }), 0);
});

test('same merchant does not grant another branch; only its effective member can prepare and read', async () => {
  const a = await identity();
  const b = await identity('b');
  const branchId = 'branch_finance_' + randomUUID();
  const memberId = 'membership_finance_' + randomUUID();
  await admin.branch.create({ data: { id: branchId, merchantId: 'merchant_synthetic_a', name: 'Prueba financiera sintética', latitude: 0, longitude: 0 } });
  await admin.membership.create({ data: { id: memberId, subjectId: b.subjectId, merchantId: 'merchant_synthetic_a', branchId } });
  try {
    const quote = await fetch(base + '/v1/delivery-quotes', { method: 'POST', headers: {
      authorization: `Bearer ${b.token}`, 'content-type': 'application/json',
    }, body: JSON.stringify({ branchId, pickup: { lat: 0, lng: 0 }, dropoff: { lat: 0.02, lng: 0.02 }, serviceType: 'local_delivery' }) });
    assert.equal(quote.status, 201);
    const response = await createDelivery(b.token, (await quote.json()).quoteId as string, randomUUID(), branchId);
    assert.equal(response.status, 201);
    const id = (await response.json()).deliveryId as string;
    const receipt = await payments.prepare(b, { deliveryId: id }, randomUUID());
    await assert.rejects(payments.prepare(a, { deliveryId: id }, randomUUID()), { code: 'NOT_FOUND' });
    await withSubject(db, a, async (tx) => {
      assert.equal(await tx.servicePaymentIntent.count({ where: { id: receipt.intentId } }), 0);
      assert.equal(await tx.servicePaymentAttempt.count({ where: { intentId: receipt.intentId } }), 0);
    });
    await admin.membership.update({ where: { id: memberId }, data: { enabled: false } });
    await assert.rejects(payments.prepare(b, { deliveryId: id }, randomUUID()), { code: 'NOT_FOUND' });
  } finally {
    await admin.membership.update({ where: { id: memberId }, data: { enabled: false } });
    await admin.branch.update({ where: { id: branchId }, data: { enabled: false } });
  }
});

test('deferred infrastructure failure rolls back intent, attempt and receipt and allows an honest retry', async () => {
  const a = await delivery();
  const key = randomUUID();
  await admin.$executeRawUnsafe(`CREATE FUNCTION app.finance_test_fail_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    RAISE EXCEPTION 'Synthetic commit failure' USING ERRCODE = '23514'; END $$`);
  try {
    await admin.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER finance_test_fail_commit AFTER INSERT ON app."ServicePaymentCommand"
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.finance_test_fail_commit()`);
    await assert.rejects(payments.prepare(a.actor, { deliveryId: a.id }, key), { message: 'INFRASTRUCTURE_UNAVAILABLE' });
    assert.equal(await admin.servicePaymentIntent.count({ where: { deliveryId: a.id } }), 0);
    assert.equal(await admin.servicePaymentCommand.count({ where: { subjectId: a.actor.subjectId, idempotencyKeyHash: digest(key) } }), 0);
    assert.equal(await admin.servicePaymentAttempt.count({ where: { intent: { deliveryId: a.id } } }), 0);
  } finally {
    await admin.$executeRawUnsafe('DROP TRIGGER IF EXISTS finance_test_fail_commit ON app."ServicePaymentCommand"');
    await admin.$executeRawUnsafe('DROP FUNCTION app.finance_test_fail_commit()');
  }
  assert.equal((await payments.prepare(a.actor, { deliveryId: a.id }, key)).status, 'pending');
});

test('inaccessible evidence ledger fails closed without a new projection; restored access permits retry', async () => {
  const a = await fixture();
  await observe(a.actor, a.event);
  const event = nextEvent(a.event, 1, { kind: 'captured', source: 'synthetic_reconciliation' });
  try {
    await admin.$executeRawUnsafe('REVOKE SELECT ON app."PaymentEvidenceLabEvent" FROM delivery_api');
    await assert.rejects(observe(a.actor, event), { code: 'INFRASTRUCTURE_UNAVAILABLE' });
    assert.equal(await admin.paymentEvidenceLabEvent.count({ where: { caseId: event.caseId } }), 1);
  } finally { await admin.$executeRawUnsafe('GRANT SELECT ON app."PaymentEvidenceLabEvent" TO delivery_api'); }
  assert.equal((await observe(a.actor, event)).state, 'confirmed');
  assert.equal((await payments.eligibility(a.actor, { deliveryId: a.id })).eligible, false);
});

test('event commit failure rolls back the entire version and permits replay without a gap', async () => {
  const a = await fixture();
  await admin.$executeRawUnsafe(`CREATE FUNCTION app.finance_test_event_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    RAISE EXCEPTION 'Synthetic event failure' USING ERRCODE = '23514'; END $$`);
  try {
    await admin.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER finance_test_event_failure AFTER INSERT ON app."PaymentEvidenceLabEvent"
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.finance_test_event_failure()`);
    await assert.rejects(observe(a.actor, a.event), { code: 'INFRASTRUCTURE_UNAVAILABLE' });
    assert.equal(await admin.paymentEvidenceLabEvent.count({ where: { caseId: a.event.caseId } }), 0);
  } finally {
    await admin.$executeRawUnsafe('DROP TRIGGER IF EXISTS finance_test_event_failure ON app."PaymentEvidenceLabEvent"');
    await admin.$executeRawUnsafe('DROP FUNCTION app.finance_test_event_failure()');
  }
  assert.equal((await observe(a.actor, a.event)).version, 1);
});

test('Supabase outage prevents authentication and no financial command is invoked', async () => {
  const a = await identity();
  const auth = createSupabaseAuthenticator('http://127.0.0.1:1', required('SUPABASE_PUBLISHABLE_KEY'));
  let called = false;
  await assert.rejects(async () => {
    const actor = await auth(new Request('http://localhost/lab', { headers: { authorization: `Bearer ${a.token}` } }));
    assert.ok(actor);
    called = true;
    await payments.prepare(actor, { deliveryId: randomUUID() }, randomUUID());
  });
  assert.equal(called, false);
});

test('migration credentials cannot impersonate runtime role or use financial services', async () => {
  const a = await identity();
  await assert.rejects(admin.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE delivery_api');
  }));
  await assert.rejects(createPaymentService(createPaymentStore(admin)).eligibility(a, { deliveryId: randomUUID() }), { code: 'INFRASTRUCTURE_UNAVAILABLE' });
});
