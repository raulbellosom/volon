import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { sandbox, eventBytes, signStripeFixture, OfflineStripe } from './stripe-test.fixtures.ts';
import { StripeCheckoutTestAdapter } from '../src/infrastructure/stripe-test/adapter.ts';

beforeEach(() => { mock.method(globalThis, 'fetch', () => { throw new Error('External network forbidden'); }); });
afterEach(() => mock.restoreAll());

test('completed/unpaid, processing, failed and expired stay distinct from a captured test payment', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'pending');
  Object.assign(s.remote.checkout, { status: 'complete', payment_intent: 'pi_offline', url: null });
  s.remote.intent.status = 'processing';
  assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'pending');
  Object.assign(s.remote.intent, { status: 'requires_payment_method', last_payment_error: { code: 'card_declined' } });
  assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'failed');
  Object.assign(s.remote.checkout, { status: 'expired' });
  assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'expired');
});

test('session completed event alone cannot confirm; async success/failure depend on current authenticated query', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  Object.assign(s.remote.checkout, { status: 'complete', payment_intent: 'pi_offline', url: null });
  for (const type of ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed']) {
    const body = eventBytes(type, s.remote.checkout, s.time.now);
    assert.equal((await s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, s.time.now))).state, 'pending');
  }
  s.remote.paid();
  const body = eventBytes('checkout.session.async_payment_succeeded', s.remote.checkout, s.time.now);
  const receipt = await s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, s.time.now));
  assert.equal(receipt.state, 'captured_test');
  assert.equal(receipt.eligible, false);
});

test('success requires complete Session, succeeded PI, full received/captured amounts and actual charge', async () => {
  for (const [object, patch] of [['checkout', { payment_status: 'unpaid' }], ['checkout', { status: 'open', url: 'https://checkout.stripe.com/c/pay/cs_test_offline' }],
    ['intent', { status: 'processing' }], ['intent', { amount_received: 0 }], ['intent', { latest_charge: null }],
    ['charge', { captured: false, amount_captured: 0 }], ['charge', { paid: false }], ['charge', { amount_captured: 4300 }]] as const) {
    const s = sandbox();
    await s.adapter.create(s.actor, s.input);
    s.remote.paid();
    Object.assign(s.remote[object], patch);
    const receipt = await s.adapter.reconcile(s.actor, s.input);
    assert.notEqual(receipt.state, 'captured_test');
    assert.equal(receipt.eligible, false);
  }
});

test('authenticated response discrepancies and Connect transfers cannot produce captured observations', async () => {
  for (const [object, patch] of [['intent', { currency: 'usd' }], ['intent', { amount: 1 }], ['intent', { livemode: true }],
    ['intent', { id: 'pi_foreign' }], ['intent', { capture_method: 'manual' }], ['intent', { transfer_data: { destination: 'acct_other' } }],
    ['charge', { amount: 1 }], ['charge', { payment_intent: 'pi_foreign' }], ['charge', { livemode: true }],
    ['charge', { currency: 'usd' }], ['charge', { on_behalf_of: 'acct_foreign' }]] as const) {
    const s = sandbox();
    await s.adapter.create(s.actor, s.input);
    s.remote.paid();
    Object.assign(s.remote[object], patch);
    await assert.rejects(s.adapter.reconcile(s.actor, s.input), { code: 'RESPONSE_MISMATCH' });
  }
});

test('partial refund and dispute remain blocking across fresh success and duplicate old notifications', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  s.remote.paid();
  const success = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now);
  await s.adapter.observe(s.actor, s.input, success, signStripeFixture(success, s.time.now));
  const refund = eventBytes('charge.refunded', { ...s.remote.charge, amount_refunded: 100 }, s.time.now);
  assert.equal((await s.adapter.observe(s.actor, s.input, refund, signStripeFixture(refund, s.time.now))).state, 'refunded');
  assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'refunded');
  assert.equal((await s.adapter.observe(s.actor, s.input, success, signStripeFixture(success, s.time.now))).state, 'refunded');
  const dispute = { id: 'dp_offline', object: 'dispute', livemode: false, charge: 'ch_offline', payment_intent: 'pi_offline',
    currency: 'mxn', amount: 4400, status: 'won' };
  for (const type of ['charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed']) {
    const body = eventBytes(type, dispute, s.time.now);
    assert.equal((await s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, s.time.now))).state, 'disputed');
  }
  assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'disputed');
});

test('queried refunds/disputes suspend without webhook, and signed adverse evidence stays blocking on outage', async () => {
  for (const patch of [{ amount_refunded: 50 }, { disputed: true }]) {
    const s = sandbox();
    await s.adapter.create(s.actor, s.input);
    s.remote.paid();
    Object.assign(s.remote.charge, patch);
    assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'disputed' in patch ? 'disputed' : 'refunded');
  }
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  s.remote.paid();
  await s.adapter.reconcile(s.actor, s.input);
  s.remote.intercept = () => Promise.reject(new Error('Unavailable'));
  const body = eventBytes('charge.refunded', { ...s.remote.charge, amount_refunded: 100 }, s.time.now);
  assert.equal((await s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, s.time.now))).state, 'refunded');
  assert.equal(s.store.get(s.fixture.intentId).fixture.events.size, 0, 'Unreconciled observation remains retryable');
});

test('late failed/canceled notifications cannot overwrite a currently captured test payment', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  s.remote.paid();
  await s.adapter.reconcile(s.actor, s.input);
  for (const type of ['payment_intent.payment_failed', 'payment_intent.canceled', 'payment_intent.succeeded']) {
    const body = eventBytes(type, s.remote.intent, s.time.now, { created: 1 });
    assert.equal((await s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, s.time.now))).state, 'captured_test');
  }
});

test('declined attempts may precede a different successful Charge on the same bound PI, without a second Session', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  s.remote.checkout.payment_intent = 'pi_offline';
  Object.assign(s.remote.intent, { latest_charge: 'ch_declined', last_payment_error: { code: 'card_declined' } });
  s.remote.intercept = (request) => request.url.endsWith('/charges/ch_declined') ? Promise.resolve({ status: 200,
    body: Buffer.from(JSON.stringify({ ...s.remote.charge, id: 'ch_declined', status: 'failed' })) }) : null;
  assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'failed');
  assert.equal(s.store.get(s.fixture.intentId).fixture.submission?.chargeId, null);
  s.remote.paid();
  assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'captured_test');
  assert.equal(s.store.get(s.fixture.intentId).fixture.submission?.chargeId, 'ch_offline');
  assert.equal(s.remote.requests.filter((request) => request.method === 'POST').length, 1);
});

test('global external bindings prevent another fixture from reusing a Session, even when metadata is spoofed', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  const other = s.store.add(s.actor);
  const remote = new OfflineStripe(other);
  const adapter = new StripeCheckoutTestAdapter({ ...s.options, transport: remote.transport });
  await assert.rejects(adapter.create(s.actor, { intentId: other.intentId }), { code: 'IDEMPOTENCY_CONFLICT' });
  assert.equal(s.store.get(other.intentId).fixture.submission, null);
});
