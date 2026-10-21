import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { randomUUID } from 'node:crypto';
import { StripeCheckoutTestAdapter } from '../src/infrastructure/stripe-test/adapter.ts';
import { STRIPE_TEST_API_VERSION } from '../src/infrastructure/stripe-test/config.ts';
import { sandbox, fixtureSecrets } from './stripe-test.fixtures.ts';

beforeEach(() => { mock.method(globalThis, 'fetch', () => { throw new Error('External network forbidden'); }); });
afterEach(() => mock.restoreAll());

test('Stripe test creates exact hosted Session from authorized server money, never a client amount or redirect', async () => {
  const s = sandbox();
  const receipt = await s.adapter.create(s.actor, s.input);
  assert.deepEqual(receipt, { scope: 'offline-test', intentId: s.fixture.intentId, sessionId: 'cs_test_offline',
    state: 'pending', eligible: false, duplicate: false });
  const post = s.remote.requests.find((request) => request.method === 'POST');
  assert.ok(post);
  const params = new URLSearchParams(post.body);
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '4400');
  assert.equal(params.get('line_items[0][price_data][currency]'), 'mxn');
  assert.equal(params.get('line_items[0][quantity]'), '1');
  assert.equal(params.get('mode'), 'payment');
  assert.equal(params.has('payment_method_types[0]'), false);
  assert.equal(params.has('allowed_payment_method_types[0]'), false);
  assert.equal(params.get('payment_intent_data[capture_method]'), 'automatic');
  assert.equal(params.get('client_reference_id'), s.fixture.intentId);
  assert.equal(params.get('success_url'), 'http://127.0.0.1:5173/stripe-test/success');
  assert.equal(params.get('cancel_url'), 'http://127.0.0.1:5173/stripe-test/cancel');
  assert.equal(post.headers.Authorization, 'Bearer ' + fixtureSecrets.apiKey);
  assert.equal(post.headers['Stripe-Version'], STRIPE_TEST_API_VERSION);
  assert.equal(post.redirect, 'error');
  assert.equal(post.signal.aborted, false);
  assert.ok(!JSON.stringify(receipt).includes('synthetic-not-returned'));
  for (const key of ['amountMinor', 'currency', 'success_url', 'cancel_url', 'paid', 'eligible', 'accountId', 'sessionId', 'subjectId'])
    await assert.rejects(s.adapter.create(s.actor, { ...s.input, [key]: 'forged' }), { code: 'INVALID_COMMAND' });
  assert.equal(s.remote.requests.filter((request) => request.method === 'POST').length, 1);
});

test('concurrent creates/retries produce one session and stable server key; configuration drift cannot charge again', async () => {
  const s = sandbox();
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => s.adapter.create(s.actor, s.input)));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  for (const r of results) if (r.status === 'rejected') assert.equal(r.reason.code, 'REQUEST_BUSY');
  assert.equal((await s.adapter.create(s.actor, s.input)).sessionId, 'cs_test_offline');
  assert.equal(s.remote.requests.filter((request) => request.method === 'POST').length, 1);
  const changed = new StripeCheckoutTestAdapter({ ...s.options, config: { ...s.options.config, returnOrigin: 'http://localhost:9999' } });
  await assert.rejects(changed.create(s.actor, s.input), { code: 'IDEMPOTENCY_CONFLICT' });
});

test('timeout persists an uncertain reservation, explicit retry reuses identical key/body, and stale retry is blocked', async () => {
  const s = sandbox();
  s.remote.intercept = (request) => request.method === 'POST' ? new Promise(() => {}) : null;
  const adapter = new StripeCheckoutTestAdapter({ ...s.options, timeoutMs: 10 });
  assert.equal((await adapter.create(s.actor, s.input)).state, 'unknown');
  const first = s.remote.requests.find((request) => request.method === 'POST');
  assert.ok(first?.signal.aborted);
  assert.equal(s.remote.requests.filter((request) => request.method === 'POST').length, 1);
  s.remote.intercept = undefined;
  await adapter.create(s.actor, s.input);
  const posts = s.remote.requests.filter((request) => request.method === 'POST');
  assert.equal(posts.length, 2);
  assert.equal(posts[0]?.headers['Idempotency-Key'], posts[1]?.headers['Idempotency-Key']);
  assert.equal(posts[0]?.body, posts[1]?.body);
  const stale = sandbox();
  stale.remote.intercept = (request) => request.method === 'POST' ? Promise.reject(new Error('Uncertain')) : null;
  assert.equal((await stale.adapter.create(stale.actor, stale.input)).state, 'unknown');
  stale.time.now += 23 * 3600000;
  await assert.rejects(stale.adapter.create(stale.actor, stale.input), { code: 'RETRY_WINDOW_EXPIRED' });
  assert.equal(stale.remote.requests.filter((request) => request.method === 'POST').length, 1);
});

test('foreign/revoked actors and operational records cannot enter the sandbox store', async () => {
  const s = sandbox();
  await assert.rejects(s.adapter.create({ subjectId: randomUUID() }, s.input), { code: 'NOT_FOUND' });
  assert.equal(s.remote.requests.length, 0);
  await s.adapter.create(s.actor, s.input);
  s.store.get(s.fixture.intentId).enabled = false;
  await assert.rejects(s.adapter.create(s.actor, s.input), { code: 'NOT_FOUND' });
  await assert.rejects(s.adapter.reconcile(s.actor, s.input), { code: 'NOT_FOUND' });
  const operational = sandbox();
  Object.assign(operational.store.get(operational.fixture.intentId).fixture, { purpose: 'operational-payment' });
  await assert.rejects(operational.adapter.create(operational.actor, operational.input), { code: 'INVALID_COMMAND' });
  assert.equal(operational.remote.requests.length, 0);
});

test('default transport, live keys, production modes and unsafe return origins fail closed', async () => {
  const s = sandbox();
  const { transport: _unused, ...withoutTransport } = s.options;
  await assert.rejects(new StripeCheckoutTestAdapter(withoutTransport).create(s.actor, s.input), { code: 'TRANSPORT_DISABLED' });
  for (const apiKey of ['sk_live_not_allowed', 'rk_live_not_allowed', '', 'sk_test_secret\r\nInjected'])
    await assert.rejects(new StripeCheckoutTestAdapter({ ...s.options, secrets: async () => ({ ...fixtureSecrets, apiKey }) })
      .create(s.actor, s.input), { code: 'CONFIGURATION_INVALID' });
  for (const returnOrigin of ['https://evil.test', 'http://127.0.0.1', 'http://127.0.0.1:5173/path',
    'http://user:password@127.0.0.1:5173', 'http://localhost:5173?next=evil', 'http://localhost:5173#fragment'])
    assert.throws(() => new StripeCheckoutTestAdapter({ ...s.options, config: { ...s.options.config, returnOrigin } }), { code: 'CONFIGURATION_INVALID' });
  assert.throws(() => new StripeCheckoutTestAdapter({ ...s.options,
    config: { ...s.options.config, environment: 'production' as 'offline-test' } }), { code: 'CONFIGURATION_INVALID' });
});

test('account mismatch blocks POST and does not publish provider errors or secrets', async () => {
  const s = sandbox();
  s.remote.account.id = 'acct_foreign';
  await assert.rejects(s.adapter.create(s.actor, s.input), { message: 'RESPONSE_MISMATCH' });
  assert.equal(s.remote.requests.filter((request) => request.method === 'POST').length, 0);
  s.remote.intercept = () => Promise.reject(new Error('secret credential and provider internals'));
  assert.equal((await s.adapter.create(s.actor, s.input)).state, 'unknown');
});

test('malicious hosted URLs, amounts, currencies and live Session responses fail without exposing URLs', async () => {
  for (const patch of [{ url: 'https://evil.test/c/pay/cs_test_offline' }, { url: 'https://user:secret@checkout.stripe.com/c/pay/cs_test_offline' },
    { url: 'https://checkout.stripe.com/c/pay/cs_test_foreign' }, { amount_total: 1 }, { currency: 'usd' }, { livemode: true },
    { mode: 'subscription' }, { client_reference_id: randomUUID() }, { id: 'cs_live_forbidden' }]) {
    const s = sandbox();
    Object.assign(s.remote.checkout, patch);
    await assert.rejects(s.adapter.create(s.actor, s.input), { code: 'RESPONSE_MISMATCH' });
    assert.ok(s.store.get(s.fixture.intentId).fixture.submission, 'Uncertain reservation must survive response validation failure');
  }
});

test('HTTP failures distinguish unknown, rejection and malformed responses; no implicit retry', async () => {
  for (const status of [429, 409, 500, 503]) {
    const s = sandbox();
    s.remote.intercept = () => Promise.resolve({ status, body: Buffer.from('secret') });
    assert.equal((await s.adapter.create(s.actor, s.input)).state, 'unknown');
    assert.equal(s.remote.requests.length, 1);
  }
  for (const [status, body, code] of [[400, '{}', 'PROVIDER_REJECTED'], [401, '{}', 'PROVIDER_REJECTED'],
    [302, '{}', 'PROVIDER_REJECTED'], [200, 'not json', 'RESPONSE_MISMATCH'], [200, '[]', 'RESPONSE_MISMATCH']] as const) {
    const s = sandbox();
    s.remote.intercept = () => Promise.resolve({ status, body: Buffer.from(body) });
    await assert.rejects(s.adapter.create(s.actor, s.input), { code });
  }
});
