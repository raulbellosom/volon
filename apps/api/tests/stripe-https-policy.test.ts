import { manualStripeServices } from '../src/infrastructure/stripe-test/local-services.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertLocalStripeTerminal, assertLocalStripeServices, publicStripeIpv4, validateStripeWireRequest,
  createStripeRequestBudget } from '../src/infrastructure/stripe-test/https-policy.ts';
import { createApprovedStripeTestTransport } from '../src/infrastructure/stripe-test/https-transport.ts';
import { stripeSessionKey, stripeSessionParameters } from '../src/infrastructure/stripe-test/checkout-parameters.ts';
import { assertStripeTrialApproval, stripeTrialDigest, validateStripeTrialPlan } from '../src/infrastructure/stripe-test/trial-plan.ts';
import { boundedStripeHttps } from '../src/infrastructure/stripe-test/https-wire.ts';
import { trialPlan, wireRequest } from './stripe-https.fixtures.ts';

test('host, protocol, routes, methods, headers and Live/unknown credentials reject before DNS or sockets', () => {
  const badUrls = ['http://api.stripe.com/v1/account','https://evil.test/v1/account','https://api.stripe.com.evil.test/v1/account',
    'https://user:private@api.stripe.com/v1/account','https://api.stripe.com:444/v1/account','https://api.stripe.com/v1/account?x=1',
    'https://api.stripe.com/v1/account#token','https://api.stripe.com/v1/checkout/sessions','https://api.stripe.com/v1/refunds',
    'https://api.stripe.com/v1/%61ccount','https://api.stripe.com/a/../v1/account','https://api.stripe.com:443/v1/account'];
  let network = 0;
  const io = { resolve: async () => { network++; return '127.0.0.1'; }, open: (() => { network++; throw new Error('Forbidden'); }) as typeof import('node:https').request };
  for (const url of badUrls) assert.throws(() => boundedStripeHttps(wireRequest({ url }), io), { code: 'TRANSPORT_DISABLED' });
  const original = wireRequest();
  for (const patch of [{ method: 'POST' as const }, { body: 'unexpected' },
    { headers: { ...original.headers, 'Stripe-Account': 'acct_foreign' } }, { headers: { ...original.headers, Host: 'evil.test' } },
    { headers: { ...original.headers, 'Stripe-Version': 'old' } }])
    assert.throws(() => validateStripeWireRequest(wireRequest(patch)), { code: 'TRANSPORT_DISABLED' });
  for (const key of ['sk_live_forbidden','rk_live_forbidden','pk_test_unsupported','sk_org_unsupported','sk_test_bad\r\nInjected'])
    assert.throws(() => validateStripeWireRequest(wireRequest({ headers: { ...original.headers, Authorization: 'Bearer ' + key } })), { code: 'TRANSPORT_DISABLED' });
  const wrapped = wireRequest();
  Object.assign(wrapped.headers, { Authorization: new String('Bearer sk_test_offline_fixture') });
  assert.throws(() => validateStripeWireRequest(wrapped), { code: 'TRANSPORT_DISABLED' });
  assert.equal(network, 0);
});

test('DNS IPv4 public-only policy blocks metadata, loopback, private, mapped IPv6 and reserved networks', () => {
  for (const ip of ['0.0.0.0','10.1.2.3','127.0.0.1','169.254.169.254','172.31.1.1','192.168.1.2','100.64.1.1',
    '192.0.2.1','198.18.0.1','198.51.100.1','203.0.113.1','224.1.2.3','255.255.255.255','::1','::ffff:127.0.0.1','invalid'])
    assert.equal(publicStripeIpv4(ip), false, ip);
  assert.equal(publicStripeIpv4('8.8.8.8'), true); // Format classification only: no DNS or connection.
});

test('create budget binds one exact MXN 44 body and stable key; no retries, extra requests or alternate origins', () => {
  const plan = trialPlan();
  const account = wireRequest();
  const post = wireRequest({ url: 'https://api.stripe.com/v1/checkout/sessions', method: 'POST',
    body: stripeSessionParameters(plan.scenarioId, 4400, plan.returnOrigin).toString(), headers: { ...account.headers,
      'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': stripeSessionKey(plan.accountId, plan.scenarioId) } });
  const consume = createStripeRequestBudget(plan);
  assert.throws(() => consume(post), { code: 'TRANSPORT_DISABLED' });
  consume(account);
  for (const body of [post.body + '&currency=usd', stripeSessionParameters(plan.scenarioId, 4401, plan.returnOrigin).toString(),
    stripeSessionParameters(plan.scenarioId, 4400, 'http://localhost:9999').toString(), 'x'.repeat(16385)])
    assert.throws(() => consume({ ...post, body }), { code: 'TRANSPORT_DISABLED' });
  consume(post);
  assert.throws(() => consume(post), { code: 'TRANSPORT_DISABLED' });
  assert.throws(() => consume(account), { code: 'TRANSPORT_DISABLED' });
});

test('reconcile budget is GET-only, verifies account first and pins persisted session/payment/charge', () => {
  const plan = validateStripeTrialPlan({ ...trialPlan('reconcile'), paymentId: 'pi_known', chargeId: 'ch_known' });
  const consume = createStripeRequestBudget(plan);
  assert.throws(() => consume(wireRequest({ url: 'https://api.stripe.com/v1/payment_intents/pi_known' })), { code: 'TRANSPORT_DISABLED' });
  consume(wireRequest());
  assert.throws(() => consume(wireRequest({ url: 'https://api.stripe.com/v1/checkout/sessions/cs_test_foreign' })), { code: 'TRANSPORT_DISABLED' });
  consume(wireRequest({ url: 'https://api.stripe.com/v1/checkout/sessions/cs_test_offline' }));
  assert.throws(() => consume(wireRequest({ url: 'https://api.stripe.com/v1/payment_intents/pi_foreign' })), { code: 'TRANSPORT_DISABLED' });
  consume(wireRequest({ url: 'https://api.stripe.com/v1/payment_intents/pi_known' }));
  consume(wireRequest({ url: 'https://api.stripe.com/v1/charges/ch_known' }));
  assert.throws(() => consume(wireRequest()), { code: 'TRANSPORT_DISABLED' });
});

test('manual guard blocks unattended, production, cloud, proxies and TLS/debug overrides; services must be local synthetic runtime', () => {
  assertLocalStripeTerminal({}, true);
  assert.throws(() => assertLocalStripeTerminal({}, false), { code: 'TRANSPORT_DISABLED' });
  for (const key of ['CI','GITHUB_ACTIONS','CODESPACES','CODEX_CLOUD','VERCEL','AWS_EXECUTION_ENV',
    'NODE_OPTIONS','NODE_TLS_REJECT_UNAUTHORIZED','NODE_EXTRA_CA_CERTS','HTTP_PROXY','https_proxy','ALL_PROXY'])
    assert.throws(() => assertLocalStripeTerminal({ [key]: 'false' }, true), { code: 'TRANSPORT_DISABLED' });
  assert.throws(() => assertLocalStripeTerminal({ NODE_ENV: 'production' }, true), { code: 'TRANSPORT_DISABLED' });
  const env = { LOCAL_ENVIRONMENT_KIND: 'manual-stripe-test-v1', LOCAL_STRIPE_INSTANCE_ID: '11111111-1111-4111-8111-111111111111', LOCAL_SYNTHETIC_MODE: 'true', SUPABASE_URL: 'http://127.0.0.1:57321',
    DATABASE_URL: 'postgresql://delivery_api:synthetic@127.0.0.1:57322/postgres?schema=app' };
  assertLocalStripeServices(env);
  for (const change of [{ LOCAL_SYNTHETIC_MODE: 'false' }, { SUPABASE_URL: 'https://foreign.example.test' },
    { DATABASE_URL: env.DATABASE_URL.replace('delivery_api:', 'postgres:') }, { DATABASE_URL: env.DATABASE_URL.replace('127.0.0.1','10.0.0.1') }])
    assert.throws(() => assertLocalStripeServices({ ...env, ...change }), { code: 'TRANSPORT_DISABLED' });
  // Tests never mint approval or invoke the real resolver. A non-TTY process cannot compose real networking.
  assert.throws(() => createApprovedStripeTestTransport(trialPlan(), 'forged', manualStripeServices(env), async () => {}), { code: 'TRANSPORT_DISABLED' });
});

test('strict canonical plans, hash confirmation and one-hour expiry cannot be forged or widened', () => {
  const plan = trialPlan();
  const digest = stripeTrialDigest(plan);
  const reversed = Object.fromEntries(Object.entries(plan).reverse());
  assert.equal(stripeTrialDigest(validateStripeTrialPlan(reversed)), digest);
  assertStripeTrialApproval(plan, 'AUTORIZO STRIPE TEST ' + digest);
  for (const change of [{ amountMinor: 4401 }, { maxSessions: 2 }, { maxRequests: 100 }, { currency: 'USD' },
    { returnOrigin: 'https://evil.test' }, { subjectId: 'forged' }, { extra: true }, { operation: { toString: () => 'create' } }])
    assert.throws(() => validateStripeTrialPlan({ ...plan, ...change }), { code: 'INVALID_COMMAND' });
  assert.throws(() => assertStripeTrialApproval(plan, 'wrong'), { code: 'TRANSPORT_DISABLED' });
  for (const offset of [-1, 7200000]) {
    const expired = validateStripeTrialPlan({ ...plan, expiresAt: new Date(Date.now() + offset).toISOString() });
    assert.throws(() => assertStripeTrialApproval(expired, 'AUTORIZO STRIPE TEST ' + stripeTrialDigest(expired)), { code: 'TRANSPORT_DISABLED' });
  }
});
