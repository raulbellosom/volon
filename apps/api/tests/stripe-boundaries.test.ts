import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { randomUUID } from 'node:crypto';
import { sandbox, OfflineStripe, eventBytes, signStripeFixture } from './stripe-test.fixtures.ts';
import { StripeCheckoutTestAdapter } from '../src/infrastructure/stripe-test/adapter.ts';

beforeEach(() => { mock.method(globalThis, 'fetch', () => { throw new Error('External network forbidden'); }); });
afterEach(() => mock.restoreAll());

test('amount limits and provider response size/type bounds fail before financial observations', async () => {
  for (const amountMinor of [0, 999, 100000000, 4400.5]) {
    const s = sandbox();
    Object.assign(s.store.get(s.fixture.intentId).fixture, { amountMinor });
    await assert.rejects(s.adapter.create(s.actor, s.input), { code: 'INVALID_COMMAND' });
    assert.equal(s.remote.requests.length, 0);
  }
  const s = sandbox();
  s.remote.intercept = () => Promise.resolve({ status: 200, body: new Uint8Array(262145) });
  await assert.rejects(s.adapter.create(s.actor, s.input), { code: 'RESPONSE_MISMATCH' });
});

test('secret manager or store failure exposes no secret, account or infrastructure error detail', async () => {
  const s = sandbox();
  for (const overrides of [{ secrets: async () => { throw new Error('private secret'); } },
    { store: { reserve: async () => { throw new Error('postgres://private'); }, save: async () => {} } }])
    await assert.rejects(new StripeCheckoutTestAdapter({ ...s.options, ...overrides }).create(s.actor, s.input),
      { message: 'INFRASTRUCTURE_UNAVAILABLE' });
});

test('revocation during transport prevents returning a newly created Session receipt', async () => {
  const s = sandbox();
  s.remote.intercept = (request) => {
    if (request.method !== 'POST') return null;
    s.store.get(s.fixture.intentId).enabled = false;
    return Promise.resolve({ status: 200, body: Buffer.from(JSON.stringify(s.remote.checkout)) });
  };
  await assert.rejects(s.adapter.create(s.actor, s.input), { code: 'NOT_FOUND' });
  assert.ok(s.store.get(s.fixture.intentId).fixture.submission);
});

test('one provider event ID cannot be rebound to a second independently authorized fixture', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  const first = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now, { id: 'evt_global_fixture' });
  await s.adapter.observe(s.actor, s.input, first, signStripeFixture(first, s.time.now));
  const fixture = s.store.add(s.actor);
  const remote = new OfflineStripe(fixture, 'other');
  const adapter = new StripeCheckoutTestAdapter({ ...s.options, transport: remote.transport });
  const input = { intentId: fixture.intentId };
  await adapter.create(s.actor, input);
  const second = eventBytes('checkout.session.completed', remote.checkout, s.time.now, { id: 'evt_global_fixture' });
  await assert.rejects(adapter.observe(s.actor, input, second, signStripeFixture(second, s.time.now)), { code: 'REPLAY_CONFLICT' });
  assert.equal(s.store.get(fixture.intentId).fixture.events.size, 0);
});

test('outage after a captured test payment returns unknown, never cached success', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  s.remote.paid();
  assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'captured_test');
  s.remote.intercept = () => Promise.reject(new Error('Unavailable'));
  const receipt = await s.adapter.reconcile(s.actor, s.input);
  assert.equal(receipt.state, 'unknown');
  assert.equal(receipt.eligible, false);
});

test('returned observations are immutable and replays reconstruct eligible:false rather than trusting a mutable receipt', async () => {
  const s = sandbox();
  await s.adapter.create(s.actor, s.input);
  s.remote.paid();
  const body = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now);
  const signature = signStripeFixture(body, s.time.now);
  const receipt = await s.adapter.observe(s.actor, s.input, body, signature);
  assert.equal(Object.isFrozen(receipt), true);
  assert.throws(() => Object.assign(receipt, { eligible: true }));
  const stored = s.store.get(s.fixture.intentId).fixture.events.values().next().value;
  assert.ok(stored);
  // Even corrupted test storage must not be copied as a financial authorization.
  Object.assign(stored, { receipt: { ...stored.receipt, eligible: true } });
  assert.equal((await s.adapter.observe(s.actor, s.input, body, signature)).eligible, false);
});

test('unauthorized scopes never consult the secret manager and inherited intent IDs are rejected', async () => {
  const s = sandbox();
  let secretReads = 0;
  const adapter = new StripeCheckoutTestAdapter({ ...s.options, secrets: async () => {
    secretReads++; return s.options.secrets();
  } });
  await assert.rejects(adapter.create({ subjectId: randomUUID() }, s.input), { code: 'NOT_FOUND' });
  const inherited = Object.assign(Object.create({ intentId: s.fixture.intentId }), { amountMinor: 1 });
  await assert.rejects(adapter.create(s.actor, inherited), { code: 'INVALID_COMMAND' });
  assert.equal(secretReads, 0);
  assert.equal(s.remote.requests.length, 0);
});
