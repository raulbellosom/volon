import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stripeSessionParameters, stripeSessionKey, stripeTestHash } from '../src/infrastructure/stripe-test/checkout-parameters.ts';
import { STRIPE_TEST_API_VERSION } from '../src/infrastructure/stripe-test/config.ts';
import { createStripeRequestBudget } from '../src/infrastructure/stripe-test/https-policy.ts';
import { assertStripeTrialApproval, stripeTrialDigest, validateStripeTrialPlan } from '../src/infrastructure/stripe-test/trial-plan.ts';
import { trialPlan, wireRequest } from './stripe-https.fixtures.ts';
import { sandbox } from './stripe-test.fixtures.ts';

// Public, entirely artificial vector. Never derive these expected values from a private plan or database.
const id = '11111111-1111-4111-8111-111111111111';
const origin = 'http://127.0.0.1:5173';
const expected = 'mode=payment&client_reference_id=' + id + '&metadata%5BintentId%5D=' + id
  + '&payment_intent_data%5Bmetadata%5D%5BintentId%5D=' + id
  + '&payment_intent_data%5Bcapture_method%5D=automatic&line_items%5B0%5D%5Bquantity%5D=1'
  + '&line_items%5B0%5D%5Bprice_data%5D%5Bcurrency%5D=mxn&line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=4400'
  + '&line_items%5B0%5D%5Bprice_data%5D%5Bproduct_data%5D%5Bname%5D=Servicio+log%C3%ADstico+de+prueba'
  + '&success_url=http%3A%2F%2F127.0.0.1%3A5173%2Fstripe-test%2Fsuccess&cancel_url=http%3A%2F%2F127.0.0.1%3A5173%2Fstripe-test%2Fcancel';
const legacyBody = (body: string) => body.replace('mode=payment&', 'mode=payment&payment_method_types%5B0%5D=card&');
const digest = (body: string) => stripeTestHash(STRIPE_TEST_API_VERSION + ':acct_offline:' + body);

test('dynamic Checkout omits selectors and pins exact form bytes and synthetic SHA-256 vectors', () => {
  const form = stripeSessionParameters(id, 4400, origin);
  assert.equal(form.toString(), expected);
  assert.equal([...form.keys()].some((key) => /payment_method_types/.test(key)), false);
  assert.equal(stripeTestHash(form.toString()), 'ee86c949867a5521024e7d0855b8063e2613116475ab328b594c2306f0191190');
  assert.equal(digest(form.toString()), '3c4b3c9d7da64547c9c26696daee35f88e54354efe2e783f8f72a7da3079efc3');
  assert.equal(digest(legacyBody(expected)), '7662621a515ebc6dd42b1ee1bdcfcf2fafc58acc12873f06cbfbea14bfdbb01a');
  assert.notEqual(digest(expected), digest(legacyBody(expected)));
  assert.equal(form.toString(), stripeSessionParameters(id, 4400, origin).toString());
});

test('wire budget accepts only corrected canonical body, rejecting legacy and unapproved allowlists', () => {
  const plan = validateStripeTrialPlan({ ...trialPlan(), scenarioId: id });
  const consume = createStripeRequestBudget(plan);
  consume(wireRequest());
  const post = wireRequest({ method: 'POST', url: 'https://api.stripe.com/v1/checkout/sessions', body: expected,
    headers: { ...wireRequest().headers, 'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': stripeSessionKey(plan.accountId, id) } });
  for (const body of [legacyBody(expected), expected + '&allowed_payment_method_types%5B0%5D=card'])
    assert.throws(() => consume({ ...post, body }), { code: 'TRANSPORT_DISABLED' });
  consume(post);
  assert.throws(() => consume(post), { code: 'TRANSPORT_DISABLED' });
});

test('a legacy persisted request hash blocks corrected payload before even the synthetic account GET', async () => {
  const s = sandbox();
  const row = s.store.get(s.fixture.intentId).fixture;
  row.state = 'unknown';
  row.submission = { key: stripeSessionKey('acct_offline', row.intentId),
    hash: digest(legacyBody(stripeSessionParameters(row.intentId, 4400, origin).toString())), startedAt: s.time.now,
    sessionId: null, paymentId: null, chargeId: null };
  const before = structuredClone(row);
  await assert.rejects(s.adapter.create(s.actor, s.input), { code: 'IDEMPOTENCY_CONFLICT' });
  assert.equal(s.remote.requests.length, 0);
  assert.deepEqual(s.store.get(row.intentId).fixture, before);
});

test('an approval for a prior HEAD cannot authorize a corrected revision', () => {
  const old = trialPlan();
  const next = validateStripeTrialPlan({ ...old, revision: 'b'.repeat(40) });
  assert.notEqual(stripeTrialDigest(old), stripeTrialDigest(next));
  assert.throws(() => assertStripeTrialApproval(next, 'AUTORIZO STRIPE TEST ' + stripeTrialDigest(old)), { code: 'TRANSPORT_DISABLED' });
});
