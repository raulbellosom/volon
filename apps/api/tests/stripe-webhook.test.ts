import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { StripeCheckoutTestAdapter } from '../src/infrastructure/stripe-test/adapter.ts';
import { sandbox, eventBytes, signStripeFixture, fixtureSecrets } from './stripe-test.fixtures.ts';

beforeEach(() => { mock.method(globalThis, 'fetch', () => { throw new Error('External network forbidden'); }); });
afterEach(() => mock.restoreAll());

test('valid original-body signature triggers authenticated reconciliation, never metadata-derived payment authority', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  s.remote.paid();
  const object = { ...s.remote.checkout, metadata: { intentId: 'pretend-other-intent', paid: true } };
  const body = eventBytes('checkout.session.completed', object, s.time.now);
  const result = await s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, s.time.now));
  assert.equal(result.intentId, s.fixture.intentId);
  assert.equal(result.state, 'captured_test');
  assert.equal(result.eligible, false);
  assert.equal(result.scope, 'offline-test');
  assert.deepEqual(Object.keys(result).sort(), ['duplicate', 'eligible', 'intentId', 'scope', 'sessionId', 'state']);
  assert.ok(s.remote.requests.some((request) => request.url.endsWith('/payment_intents/pi_offline')));
  assert.ok(s.remote.requests.some((request) => request.url.endsWith('/charges/ch_offline')));
  assert.ok(!JSON.stringify(result).includes('metadata'));
});

test('forged signatures, altered bytes, stale/future timestamp, wrong secret and malformed headers perform zero remote requests', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  const body = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now);
  const original = signStripeFixture(body, s.time.now);
  const altered = Buffer.concat([body, Buffer.from(' ')]);
  const count = s.remote.requests.length;
  for (const [bytes, header] of [[body, ''], [body, original.replace('v1=', 'v0=')], [body, original + ',t=1'],
    [altered, original], [body, signStripeFixture(body, s.time.now - 301000)],
    [body, signStripeFixture(body, s.time.now + 301000)], [body, signStripeFixture(body, s.time.now, 'wrong-fixture')],
    [body, original + '=extra'], [body, 'x'.repeat(4097)]] as const)
    await assert.rejects(s.adapter.observe(s.actor, s.input, bytes, header), { code: 'INVALID_SIGNATURE' });
  assert.equal(s.remote.requests.length, count);
  assert.equal(s.store.get(s.fixture.intentId).fixture.events.size, 0);
});

test('multiple v1 signatures permit rotation, while excessive signatures and oversized bodies are rejected', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  const body = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now);
  const signature = signStripeFixture(body, s.time.now);
  assert.equal((await s.adapter.observe(s.actor, s.input, body, signature + ',v1=' + '0'.repeat(64))).eligible, false);
  await assert.rejects(s.adapter.observe(s.actor, s.input, body, signature + (',v1=' + '0'.repeat(64)).repeat(8)), { code: 'INVALID_SIGNATURE' });
  await assert.rejects(s.adapter.observe(s.actor, s.input, new Uint8Array(65537), signature), { code: 'INVALID_SIGNATURE' });
});

test('live/Connect/foreign accounts, API versions, unexpected event types and payload types fail before transport', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  const count = s.remote.requests.length;
  for (const patch of [{ livemode: true }, { account: 'acct_foreign' }, { account: 'acct_offline' }, { context: 'acct_foreign' },
    { api_version: '2020-08-27' }, { api_version: '2022-11-15' }, { api_version: '2026-10-01.endive' }, { type: 'invoice.paid' }, { created: -1 }, { created: s.time.now / 1000 + 301 },
    { data: { object: { ...s.remote.checkout, livemode: true } } }, { data: { object: { ...s.remote.checkout, object: 'payment_intent' } } }]) {
    const body = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now, patch);
    await assert.rejects(s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, s.time.now)), { code: 'EVENT_REJECTED' });
  }
  assert.equal(s.remote.requests.length, count);
});

test('duplicate signed events are ignored atomically; changed payload under same ID is a replay conflict', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  s.remote.paid();
  const body = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now);
  const signature = signStripeFixture(body, s.time.now);
  const result = await Promise.allSettled(Array.from({ length: 20 }, () => s.adapter.observe(s.actor, s.input, body, signature)));
  assert.equal(result.filter((row) => row.status === 'fulfilled').length, 1);
  for (const row of result) if (row.status === 'rejected') assert.equal(row.reason.code, 'REQUEST_BUSY');
  assert.equal((await s.adapter.observe(s.actor, s.input, body, signature)).duplicate, true);
  assert.equal(s.store.get(s.fixture.intentId).fixture.events.size, 1);
  const count = s.remote.requests.length;
  await s.adapter.observe(s.actor, s.input, body, signature);
  assert.equal(s.remote.requests.length, count);
  const modified = JSON.parse(body.toString());
  modified.data.object.metadata = { paid: 'forged' };
  const changed = Buffer.from(JSON.stringify(modified));
  await assert.rejects(s.adapter.observe(s.actor, s.input, changed, signStripeFixture(changed, s.time.now)), { code: 'REPLAY_CONFLICT' });
});

test('resource IDs and amounts must match server bindings even with a valid signature and spoofed metadata', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  for (const patch of [{ id: 'cs_test_foreign' }, { amount_total: 1 }, { currency: 'usd' }, { mode: 'subscription' },
    { payment_intent: 'pi_foreign' }]) {
    const body = eventBytes('checkout.session.completed', { ...s.remote.checkout, ...patch, metadata: { intentId: s.fixture.intentId } }, s.time.now);
    await assert.rejects(s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, s.time.now)), { code: 'RESPONSE_MISMATCH' });
  }
  assert.equal(s.store.get(s.fixture.intentId).fixture.events.size, 0);
});

test('webhook before server binding and revoked actor replays do not consume event ID', async () => {
  const s = sandbox();
  const body = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now);
  const signature = signStripeFixture(body, s.time.now);
  await assert.rejects(s.adapter.observe(s.actor, s.input, body, signature), { code: 'EVENT_REJECTED' });
  await s.adapter.create(s.actor, s.input);
  await s.adapter.observe(s.actor, s.input, body, signature);
  s.store.get(s.fixture.intentId).enabled = false;
  await assert.rejects(s.adapter.observe(s.actor, s.input, body, signature), { code: 'NOT_FOUND' });
});

test('snapshot occurs before awaiting secret provider; caller mutation cannot change signed bytes', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  const body = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now);
  const signature = signStripeFixture(body, s.time.now);
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const adapter = new StripeCheckoutTestAdapter({ ...s.options, secrets: async () => { await gate; return fixtureSecrets; } });
  const pending = adapter.observe(s.actor, s.input, body, signature);
  body.fill(0);
  release();
  assert.equal((await pending).state, 'pending');
});

test('signed invalid JSON/UTF-8 fails safely, without logging or contacting transport', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  const count = s.remote.requests.length;
  for (const body of [Buffer.from('not json'), Buffer.from([0xff, 0xfe])])
    await assert.rejects(s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, s.time.now)), { code: 'INVALID_SIGNATURE' });
  assert.equal(s.remote.requests.length, count);
});
