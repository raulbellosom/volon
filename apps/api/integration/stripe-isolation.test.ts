import assert from 'node:assert/strict';
import { test } from 'node:test';
import { admin, delivery, identity, payments } from './payment-fixtures.ts';
import { base } from './delivery-fixtures.ts';
import { MemoryCheckoutFixtures, OfflineStripe, fixtureSecrets, eventBytes, signStripeFixture } from '../tests/stripe-test.fixtures.ts';
import { StripeCheckoutTestAdapter } from '../src/infrastructure/stripe-test/adapter.ts';
import { denyFinancialEligibility } from '../src/modules/dispatch-lab/dispatch.ports.ts';

test('real local Auth/PostgreSQL: offline Stripe capture cannot mutate or financially qualify operational Delivery', async () => {
  const a = await delivery();
  const before = await admin.delivery.findUniqueOrThrow({ where: { id: a.id } });
  const quote = await admin.pricingQuote.findUniqueOrThrow({ where: { id: before.quoteId } });
  const reference = await admin.deliveryPublicReference.findUniqueOrThrow({ where: { deliveryId: a.id } });
  const store = new MemoryCheckoutFixtures();
  // A separate fixture copies only the synthetic server-owned amount, never Delivery ID or its immutable attempt.
  const fixture = store.add(a.actor, a.amountMinor);
  assert.notEqual(fixture.intentId, a.id);
  const remote = new OfflineStripe(fixture);
  const adapter = new StripeCheckoutTestAdapter({ config: { environment: 'offline-test', accountId: 'acct_offline', returnOrigin: 'http://127.0.0.1:5173' },
    secrets: async () => fixtureSecrets, store, transport: remote.transport });
  await adapter.create(a.actor, { intentId: fixture.intentId });
  remote.paid();
  const body = eventBytes('checkout.session.completed', remote.checkout, Date.now());
  const observation = await adapter.observe(a.actor, { intentId: fixture.intentId }, body, signStripeFixture(body, Date.now()));
  assert.equal(observation.state, 'captured_test');
  assert.equal(observation.eligible, false);
  assert.equal((await payments.eligibility(a.actor, { deliveryId: a.id })).eligible, false);
  assert.equal(denyFinancialEligibility.evaluate(a.id), 'missing');
  assert.equal(await admin.servicePaymentIntent.count({ where: { deliveryId: a.id } }), 0);
  await assert.rejects(payments.prepare(a.actor, { deliveryId: a.id, observation }, 'forbidden-fixture-injection'), { code: 'INVALID_COMMAND' });
  assert.deepEqual(await admin.delivery.findUniqueOrThrow({ where: { id: a.id } }), before);
  assert.deepEqual(await admin.pricingQuote.findUniqueOrThrow({ where: { id: quote.id } }), quote);
  assert.deepEqual(await admin.deliveryPublicReference.findUniqueOrThrow({ where: { deliveryId: a.id } }), reference);
  const b = await identity('b');
  await assert.rejects(adapter.reconcile(b, { intentId: fixture.intentId }), { code: 'NOT_FOUND' });
  await assert.rejects(payments.eligibility(b, { deliveryId: a.id }), { code: 'NOT_FOUND' });
});

test('HTTP API still rejects client payment flags and exposes no Stripe payment/webhook endpoint', async () => {
  const a = await delivery();
  const current = await admin.delivery.findUniqueOrThrow({ where: { id: a.id } });
  const response = await fetch(base + '/v1/deliveries', { method: 'POST', headers: {
    authorization: `Bearer ${a.actor.token}`, 'content-type': 'application/json', 'idempotency-key': 'forbidden-stripe-flags',
  }, body: JSON.stringify({ branchId: current.branchId, quoteId: current.quoteId, paid: true, eligible: true }) });
  assert.equal(response.status, 422);
  for (const path of ['/v1/payments/checkout', '/v1/payments/stripe/webhook']) {
    const result = await fetch(base + path, { method: 'POST', headers: { authorization: `Bearer ${a.actor.token}` } });
    assert.equal(result.status, 404);
  }
  assert.deepEqual(await admin.delivery.findUniqueOrThrow({ where: { id: a.id } }), current);
});
