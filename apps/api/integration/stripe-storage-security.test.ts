import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { durable, admin, db, identity, withSubject, createPostgresCheckoutSandboxStore, StripeCheckoutTestAdapter,
  eventBytes, signStripeFixture, scopedCount, localOnlyFetch, pause } from './stripe-persistence-fixtures.ts';
import { delivery, payments } from './payment-fixtures.ts';
import { denyFinancialEligibility } from '../src/modules/dispatch-lab/dispatch.ports.ts';
const fetchOriginal = globalThis.fetch;
beforeEach(() => { mock.method(globalThis, 'fetch', localOnlyFetch(fetchOriginal)); });
afterEach(() => mock.restoreAll());

test('FORCE RLS on all sandbox tables, no unscoped access, administrative connections rejected before secrets', async () => {
  const s = await durable();
  await s.adapter.create(s.actor, s.input);
  const [countRow] = await admin.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_class
    WHERE relnamespace = 'app'::regnamespace AND relname IN ('StripeSandboxScenario','StripeSandboxSubmission','StripeSandboxEvent')
      AND relrowsecurity AND relforcerowsecurity`;
  assert.equal(Number(countRow?.count), 3);
  assert.equal(await db.stripeSandboxScenario.count(), 0);
  assert.equal(await db.stripeSandboxSubmission.count(), 0);
  assert.equal(await db.stripeSandboxEvent.count(), 0);
  let secrets = 0;
  const unsafe = new StripeCheckoutTestAdapter({ ...s.options, store: createPostgresCheckoutSandboxStore(admin),
    secrets: async () => { secrets++; return s.options.secrets(); } });
  await assert.rejects(unsafe.create(s.actor, s.input), { code: 'INFRASTRUCTURE_UNAVAILABLE' });
  assert.equal(secrets, 0);
  await assert.rejects(s.adapter.create({ subjectId: '' }, s.input), { code: 'NOT_FOUND' });
  await assert.rejects(s.adapter.create(s.actor, { intentId: s.scenario.id, subjectId: randomUUID() }), { code: 'INVALID_COMMAND' });
});

test('two actors/merchants cannot read, reserve, replay or change each other; even shared branch membership grants no scenario ownership', async () => {
  const s = await durable();
  await s.adapter.create(s.actor, s.input);
  const b = await identity('b');
  assert.equal(await scopedCount(b, s.scenario.id), 0);
  await assert.rejects(s.adapter.create(b, s.input), { code: 'NOT_FOUND' });
  await assert.rejects(s.adapter.reconcile(b, s.input), { code: 'NOT_FOUND' });
  const membershipId = randomUUID();
  const existing = await admin.membership.findUnique({ where: { subjectId_branchId: { subjectId: b.subjectId, branchId: s.scenario.branchId } } });
  if (!existing) await admin.membership.create({ data: { id: membershipId, subjectId: b.subjectId,
    branchId: s.scenario.branchId, merchantId: s.scenario.merchantId } });
  try {
    assert.equal(await scopedCount(b, s.scenario.id), 0);
    await assert.rejects(s.adapter.create(b, s.input), { code: 'NOT_FOUND' });
    const changed = await withSubject(db, b, async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.stripe_sandbox','offline-test-v1',true)`;
      return tx.stripeSandboxSubmission.updateMany({ where: { scenarioId: s.scenario.id }, data: { state: 'captured_test' } });
    });
    assert.equal(changed.count, 0);
  } finally { if (!existing) await admin.membership.delete({ where: { id: membershipId } }); }
});

test('same owner cannot access a second branch without current membership; disabled branch/merchant/scenario fail closed', async () => {
  const s = await durable();
  const branch = await admin.branch.create({ data: { id: 'stripe_branch_' + randomUUID(), merchantId: s.scenario.merchantId,
    name: 'Sucursal sintética aislada', latitude: 0, longitude: 0 } });
  const second = await admin.stripeSandboxScenario.create({ data: { id: randomUUID(), subjectId: s.actor.subjectId,
    branchId: branch.id, merchantId: branch.merchantId, amountMinor: 4400, accountId: 'acct_offline' } });
  await assert.rejects(s.adapter.create(s.actor, { intentId: second.id }), { code: 'NOT_FOUND' });
  const membership = await admin.membership.create({ data: { id: randomUUID(), subjectId: s.actor.subjectId, branchId: branch.id, merchantId: branch.merchantId } });
  try {
    const lease = await s.store.reserve(s.actor, second.id, second.accountId);
    await s.store.save(s.actor, lease, true);
    for (const table of ['branch', 'merchant', 'scenario'] as const) {
      const id = table === 'branch' ? branch.id : table === 'merchant' ? branch.merchantId : second.id;
      const update = (enabled: boolean) => table === 'branch' ? admin.branch.update({ where: { id }, data: { enabled } })
        : table === 'merchant' ? admin.merchant.update({ where: { id }, data: { enabled } })
        : admin.stripeSandboxScenario.update({ where: { id }, data: { enabled } });
      await update(false);
      try { await assert.rejects(s.store.reserve(s.actor, second.id, second.accountId), { code: 'NOT_FOUND' }); }
      finally { await update(true); }
    }
  } finally { await admin.membership.delete({ where: { id: membership.id } }); }
});

test('membership revoked after reserve blocks confirmation and replay; restored permission recovers prior server binding', async () => {
  const s = await durable(1000);
  s.remote.intercept = (r) => r.method === 'POST' ? (async () => {
    await admin.membership.update({ where: { subjectId_branchId: { subjectId: s.actor.subjectId, branchId: s.scenario.branchId } }, data: { enabled: false } });
    return { status: 200, body: Buffer.from(JSON.stringify(s.remote.checkout)) };
  })() : null;
  try {
    await assert.rejects(s.adapter.create(s.actor, s.input), { code: 'NOT_FOUND' });
    assert.equal(await scopedCount(s.actor, s.scenario.id), 0);
    await assert.rejects(s.adapter.reconcile(s.actor, s.input), { code: 'NOT_FOUND' });
    const row = await admin.stripeSandboxSubmission.findUniqueOrThrow({ where: { scenarioId: s.scenario.id } });
    assert.equal(row.sessionId, null); assert.ok(row.key);
  } finally {
    await admin.membership.update({ where: { subjectId_branchId: { subjectId: s.actor.subjectId, branchId: s.scenario.branchId } }, data: { enabled: true } });
  }
  await pause(1100);
  s.remote.intercept = undefined;
  const restarted = new StripeCheckoutTestAdapter({ ...s.options, store: createPostgresCheckoutSandboxStore(db) });
  assert.equal((await restarted.create(s.actor, s.input)).sessionId, s.remote.checkout.id);
  assert.equal(s.remote.sessions.size, 1);
  const posts = s.remote.requests.filter((r) => r.method === 'POST');
  assert.equal(posts[0]?.headers['Idempotency-Key'], posts[1]?.headers['Idempotency-Key']);
});

test('global event uniqueness across owners rolls back both projection and event; same ID with another digest is rejected', async () => {
  const a = await durable(), b = await durable(30000, 'b');
  for (const s of [a, b]) { await s.adapter.create(s.actor, s.input); s.remote.paid(); }
  const id = 'evt_' + randomUUID().replaceAll('-', '');
  const first = eventBytes('checkout.session.completed', a.remote.checkout, Date.now(), { id });
  await a.adapter.observe(a.actor, a.input, first, signStripeFixture(first, Date.now()));
  const second = eventBytes('checkout.session.completed', b.remote.checkout, Date.now(), { id });
  await assert.rejects(b.adapter.observe(b.actor, b.input, second, signStripeFixture(second, Date.now())), { code: 'REPLAY_CONFLICT' });
  assert.equal(await admin.stripeSandboxEvent.count({ where: { eventId: id } }), 1);
  const row = await admin.stripeSandboxSubmission.findUniqueOrThrow({ where: { scenarioId: b.scenario.id } });
  assert.equal(row.state, 'pending'); assert.equal(row.paymentId, null); assert.equal(row.chargeId, null);
});

test('global external Session uniqueness prevents rebinding; runtime cannot provision scenarios or rewrite history', async () => {
  const a = await durable(), b = await durable(30000, 'b');
  await a.adapter.create(a.actor, a.input);
  b.remote.checkout.id = a.remote.checkout.id;
  b.remote.checkout.url = 'https://checkout.stripe.com/c/pay/' + String(a.remote.checkout.id);
  await assert.rejects(b.adapter.create(b.actor, b.input), { code: 'IDEMPOTENCY_CONFLICT' });
  assert.equal((await admin.stripeSandboxSubmission.findUniqueOrThrow({ where: { scenarioId: b.scenario.id } })).sessionId, null);
  await assert.rejects(withSubject(db, a.actor, async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.stripe_sandbox','offline-test-v1',true)`;
    return tx.stripeSandboxScenario.create({ data: { ...a.scenario, id: randomUUID() } });
  }));
  await assert.rejects(admin.stripeSandboxScenario.update({ where: { id: a.scenario.id }, data: { amountMinor: 9999 } }));
});

test('durable captured observation remains ineligible and cannot mutate Delivery, quote, folio or historical prepared payment', async () => {
  const d = await delivery();
  const prepared = await payments.prepare(d.actor, { deliveryId: d.id }, randomUUID());
  const before = await admin.delivery.findUniqueOrThrow({ where: { id: d.id } });
  const quote = await admin.pricingQuote.findUniqueOrThrow({ where: { id: before.quoteId } });
  const folio = await admin.deliveryPublicReference.findUniqueOrThrow({ where: { deliveryId: d.id } });
  const s = await durable(); await s.adapter.create(s.actor, s.input); s.remote.paid();
  const body = eventBytes('checkout.session.completed', s.remote.checkout, Date.now());
  const receipt = await s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, Date.now()));
  assert.equal(receipt.state, 'captured_test'); assert.equal(receipt.eligible, false);
  assert.equal((await payments.eligibility(d.actor, { deliveryId: d.id })).eligible, false);
  assert.equal(denyFinancialEligibility.evaluate(d.id), 'missing');
  assert.deepEqual(await payments.prepare(d.actor, { deliveryId: d.id }, randomUUID()), prepared);
  assert.deepEqual(await admin.delivery.findUniqueOrThrow({ where: { id: d.id } }), before);
  assert.deepEqual(await admin.pricingQuote.findUniqueOrThrow({ where: { id: quote.id } }), quote);
  assert.deepEqual(await admin.deliveryPublicReference.findUniqueOrThrow({ where: { deliveryId: d.id } }), folio);
  const stored = await admin.stripeSandboxEvent.findFirstOrThrow({ where: { scenarioId: s.scenario.id } });
  assert.deepEqual(Object.keys(stored).sort(), ['accountId','digest','eventId','receivedAt','scenarioId','state','version']);
  for (const secret of ['client_secret','billing_details','Comprador','whsec_','sk_test_','metadata','url'])
    assert.ok(!JSON.stringify({ receipt, stored }).includes(secret));
});
