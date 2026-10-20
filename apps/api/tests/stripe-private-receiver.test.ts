import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startPrivateStripeTestReceiver } from '../src/infrastructure/stripe-test/private-receiver.ts';
import { sandbox, eventBytes, signStripeFixture } from './stripe-test.fixtures.ts';
import { CheckoutTestFailure } from '../src/modules/payments/checkout-sandbox.port.ts';

test('private loopback ingress preserves original bytes for HMAC, rejects forgery and returns only a minimal receipt', async () => {
  const s = sandbox(); await s.adapter.create(s.actor, s.input); s.remote.paid();
  const body = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now);
  const receiver = await startPrivateStripeTestReceiver({ observe: (bytes, sig) => s.adapter.observeRecorded(s.actor, s.input, bytes, sig) });
  const url = `http://127.0.0.1:${receiver.port}/stripe-test-events`;
  const send = (bytes: Uint8Array, signature: string) => fetch(url, { method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: Buffer.from(bytes) });
  try {
    const before = s.remote.requests.length;
    const invalid = await send(body, 't=1,v1=' + '0'.repeat(64));
    assert.equal(invalid.status, 400); assert.equal(s.remote.requests.length, before);
    const signature = signStripeFixture(body, s.time.now);
    const success = await send(body, signature);
    assert.equal(success.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await success.json(), { received: true, duplicate: false, eligible: false });
    const replay = await send(body, signature);
    assert.deepEqual(await replay.json(), { received: true, duplicate: true, eligible: false });
    const changed = Buffer.concat([body, Buffer.from(' ')]);
    assert.equal((await send(changed, signature)).status, 400);
    assert.equal(s.store.get(s.fixture.intentId).fixture.events.size, 1);
  } finally { await receiver.close(); }
});

test('private ingress rejects browser origins, cookies, compression, wrong path/method and oversized signatures before callback', async () => {
  let calls = 0;
  const receiver = await startPrivateStripeTestReceiver({ observe: async () => { calls++; throw new Error('No echo of private detail'); } });
  try {
    for (const headers of [{ Origin: 'https://evil.test' }, { Cookie: 'private=value' }, { 'Content-Encoding': 'gzip' },
      { 'stripe-signature': 'x'.repeat(4097) }]) {
      const response = await fetch(`http://127.0.0.1:${receiver.port}/stripe-test-events`, { method: 'POST',
        headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=x', ...headers }, body: '{}' });
      assert.equal(response.status, 400);
    }
    assert.equal((await fetch(`http://127.0.0.1:${receiver.port}/stripe-test-events?x=1`)).status, 400);
    const large = await fetch(`http://127.0.0.1:${receiver.port}/stripe-test-events`, { method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=x' }, body: 'x'.repeat(65537) });
    assert.equal(large.status, 400);
    assert.equal(calls, 0);
  } finally { await receiver.close(); }
});

test('private ingress has bounded lifetime and attempts and never serializes callback error messages', async () => {
  let calls = 0;
  const receiver = await startPrivateStripeTestReceiver({ observe: async () => { calls++; throw new CheckoutTestFailure('INVALID_SIGNATURE'); } });
  try {
    for (let i = 0; i < 21; i++) {
      const response = await fetch(`http://127.0.0.1:${receiver.port}/stripe-test-events`, { method: 'POST',
        headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=x' }, body: '{}' });
      assert.equal(response.status, 400); assert.equal(await response.text(), '');
    }
    assert.equal(calls, 20);
  } finally { await receiver.close(); }
  const temporary = await startPrivateStripeTestReceiver({ ttlMs: 10, observe: async () => { throw new Error('Unused'); } });
  await new Promise((r) => setTimeout(r, 30));
  await assert.rejects(fetch(`http://127.0.0.1:${temporary.port}/stripe-test-events`));
  await temporary.close();
});

test('private ingress never acknowledges a valid signed event when provider timeout prevented its durable receipt', async () => {
  const s = sandbox(); await s.adapter.create(s.actor, s.input);
  s.remote.paid(); await s.adapter.reconcile(s.actor, s.input);
  const body = eventBytes('charge.refunded', { ...s.remote.charge, amount_refunded: 1 }, s.time.now);
  const receiver = await startPrivateStripeTestReceiver({ observe: (b, sig) => s.adapter.observeRecorded(s.actor, s.input, b, sig) });
  try {
    const send = () => fetch(`http://127.0.0.1:${receiver.port}/stripe-test-events`, { method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signStripeFixture(body, s.time.now) }, body });
    s.remote.intercept = () => Promise.reject(new Error('Provider unavailable'));
    assert.equal((await send()).status, 503);
    assert.equal(s.store.get(s.fixture.intentId).fixture.adverse, 'refunded');
    assert.equal(s.store.get(s.fixture.intentId).fixture.events.size, 0);
    s.remote.intercept = undefined;
    assert.equal((await send()).status, 200);
    assert.equal(s.store.get(s.fixture.intentId).fixture.events.size, 1);
  } finally { await receiver.close(); }
});
