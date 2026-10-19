import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/infrastructure/database.ts';
import { createPaymentService } from '../src/modules/payments/payment.service.ts';
import { createPaymentStore } from '../src/infrastructure/payment.repository.ts';
import { courierLogin, expiredCourierToken } from './courier-fixtures.ts';
import { delivery, identity, payments, db, admin, withSubject, authenticate, required } from './payment-fixtures.ts';

test('payment preparation uses stored money, replays exact receipt and never grants eligibility', async () => {
  const { actor, id, amountMinor } = await delivery();
  const before = await admin.delivery.findUniqueOrThrow({ where: { id } });
  const key = randomUUID();
  const receipt = await payments.prepare(actor, { deliveryId: id }, key);
  assert.equal(receipt.amountMinor, amountMinor);
  assert.equal(receipt.status, 'pending');
  assert.equal(receipt.attempt.status, 'not_submitted');
  assert.deepEqual(Object.keys(receipt).sort(), ['amountMinor', 'attempt', 'createdAt', 'currency', 'deliveryId', 'intentId', 'status', 'version']);
  assert.deepEqual(Object.keys(receipt.attempt).sort(), ['attemptId', 'status']);
  assert.ok(Math.abs(Date.now() - Date.parse(receipt.createdAt)) < 10000);
  assert.deepEqual(await payments.prepare(actor, { deliveryId: id }, key), receipt);
  assert.deepEqual(await payments.eligibility(actor, { deliveryId: id }), { deliveryId: id, eligible: false, reason: 'PSP_NOT_CONFIGURED' });
  assert.deepEqual(await admin.delivery.findUniqueOrThrow({ where: { id } }), before);
  const attempt = await admin.servicePaymentAttempt.findUniqueOrThrow({ where: { id: receipt.attempt.attemptId } });
  assert.equal(attempt.provider, null);
  assert.equal(attempt.providerPaymentId, null);
});

test('concurrent preparations with same and different keys create exactly one intent/attempt', async () => {
  const { actor, id } = await delivery();
  const key = randomUUID();
  const result = await Promise.all(Array.from({ length: 12 }, (_, index) => payments.prepare(actor, { deliveryId: id }, index % 2 ? key : randomUUID())));
  assert.equal(new Set(result.map((row) => row.intentId)).size, 1);
  assert.equal(new Set(result.map((row) => row.attempt.attemptId)).size, 1);
  assert.equal(await admin.servicePaymentIntent.count({ where: { deliveryId: id } }), 1);
  assert.ok(result[0]);
  assert.equal(await admin.servicePaymentAttempt.count({ where: { intentId: result[0].intentId } }), 1);
});

test('idempotency key cannot be reused to charge a different delivery', async () => {
  const a = await delivery();
  const b = await delivery();
  const key = randomUUID();
  await payments.prepare(a.actor, { deliveryId: a.id }, key);
  await assert.rejects(payments.prepare(a.actor, { deliveryId: b.id }, key), { code: 'IDEMPOTENCY_CONFLICT' });
  assert.equal(await admin.servicePaymentIntent.count({ where: { deliveryId: b.id } }), 0);
});

test('RLS hides payments across tenants, branches and courier identities; no subject means no rows', async () => {
  const a = await delivery();
  const b = await identity('b');
  const courier = await courierLogin();
  await payments.prepare(a.actor, { deliveryId: a.id }, randomUUID());
  for (const actor of [b, { subjectId: courier.subjectId }]) {
    await assert.rejects(payments.prepare(actor, { deliveryId: a.id }, randomUUID()), { code: 'NOT_FOUND' });
    await assert.rejects(payments.eligibility(actor, { deliveryId: a.id }), { code: 'NOT_FOUND' });
    await withSubject(db, actor, async (tx) => {
      assert.equal(await tx.servicePaymentIntent.count({ where: { deliveryId: a.id } }), 0);
      assert.equal(await tx.servicePaymentAttempt.count(), 0);
      assert.equal(await tx.servicePaymentCommand.count(), 0);
    });
  }
  assert.equal(await db.servicePaymentIntent.count(), 0);
  const branchId = 'branch_finance_' + randomUUID();
  await admin.branch.create({ data: { id: branchId, merchantId: 'merchant_synthetic_a', name: 'Sucursal sintética sin membresía', latitude: 0, longitude: 0 } });
  await withSubject(db, a.actor, async (tx) => { assert.equal(await tx.branch.count({ where: { id: branchId } }), 0); });
});

test('revoked membership, disabled branch/merchant deny new commands and idempotent replay', async () => {
  const a = await delivery();
  const key = randomUUID();
  await payments.prepare(a.actor, { deliveryId: a.id }, key);
  for (const entity of ['membership', 'branch', 'merchant'] as const) {
    const id = `${entity}_synthetic_a`;
    const model = admin[entity];
    // All three delegate signatures accept this common shape; keep concrete calls for strict TS.
    const set = async (enabled: boolean) => {
      if (entity === 'membership') await admin.membership.update({ where: { id }, data: { enabled } });
      else if (entity === 'branch') await admin.branch.update({ where: { id }, data: { enabled } });
      else await admin.merchant.update({ where: { id }, data: { enabled } });
    };
    assert.ok(model);
    try {
      await set(false);
      await assert.rejects(payments.prepare(a.actor, { deliveryId: a.id }, key), { code: 'NOT_FOUND' });
      await assert.rejects(payments.eligibility(a.actor, { deliveryId: a.id }), { code: 'NOT_FOUND' });
    } finally { await set(true); }
  }
});

test('client amounts/paid flags, direct writes and administrative connections cannot confirm payment', async () => {
  const a = await delivery();
  for (const patch of [{ paid: true }, { amountMinor: 1 }, { currency: 'USD' }, { eligible: true }])
    await assert.rejects(payments.prepare(a.actor, { deliveryId: a.id, ...patch }, randomUUID()), { code: 'INVALID_COMMAND' });
  const row = await payments.prepare(a.actor, { deliveryId: a.id }, randomUUID());
  await assert.rejects(withSubject(db, a.actor, (tx) => tx.servicePaymentIntent.update({ where: { id: row.intentId }, data: { status: 'confirmed' } })));
  await assert.rejects(withSubject(db, a.actor, (tx) => tx.servicePaymentIntent.create({ data: {
    id: randomUUID(), deliveryId: a.id, amountMinor: 1, currency: 'MXN', status: 'confirmed',
  } })));
  await assert.rejects(admin.servicePaymentAttempt.update({ where: { id: row.attempt.attemptId }, data: { providerPaymentId: 'fake' } }));
  await assert.rejects(createPaymentService(createPaymentStore(admin)).prepare(a.actor, { deliveryId: a.id }, randomUUID()), { code: 'INFRASTRUCTURE_UNAVAILABLE' });
});

test('PostgreSQL enforces amount match and requires an attempt at commit; failures leave no intent', async () => {
  const a = await delivery();
  await assert.rejects(withSubject(db, a.actor, (tx) => tx.$executeRaw`INSERT INTO app."ServicePaymentIntent" (id, "deliveryId", "amountMinor", currency)
    VALUES (${randomUUID()}::uuid, ${a.id}, ${a.amountMinor + 1}, 'MXN')`));
  await assert.rejects(withSubject(db, a.actor, (tx) => tx.$executeRaw`INSERT INTO app."ServicePaymentIntent" (id, "deliveryId", "amountMinor", currency)
    VALUES (${randomUUID()}::uuid, ${a.id}, ${a.amountMinor}, 'MXN')`));
  assert.equal(await admin.servicePaymentIntent.count({ where: { deliveryId: a.id } }), 0);
  await payments.prepare(a.actor, { deliveryId: a.id }, randomUUID());
});

test('missing/invalid/expired tokens fail real local Supabase verification', async () => {
  const actor = await identity();
  for (const token of [undefined, 'invalid.token.signature', expiredCourierToken(actor.subjectId)]) {
    const request = new Request('http://localhost/lab', { headers: token ? { authorization: `Bearer ${token}` } : {} });
    assert.equal(await authenticate(request), null);
  }
});

test('database outage yields only a safe error and cannot be mistaken for eligibility', async () => {
  const url = new URL(required('DATABASE_URL'));
  url.port = '1';
  const broken = createDatabase(url.toString());
  try {
    const a = await identity();
    const service = createPaymentService(createPaymentStore(broken));
    await assert.rejects(service.eligibility(a, { deliveryId: randomUUID() }), { message: 'INFRASTRUCTURE_UNAVAILABLE' });
    await assert.rejects(service.prepare(a, { deliveryId: randomUUID() }, randomUUID()), { message: 'INFRASTRUCTURE_UNAVAILABLE' });
  } finally { await broken.$disconnect(); }
});
