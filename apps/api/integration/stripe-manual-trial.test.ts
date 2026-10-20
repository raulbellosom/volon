import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { durable, admin, db, identity, createPostgresCheckoutSandboxStore, StripeCheckoutTestAdapter,
  eventBytes, signStripeFixture, localOnlyFetch } from './stripe-persistence-fixtures.ts';
import { firstStripeTrialStore, loadStripeTrialPlan } from '../src/infrastructure/stripe-test/trial-service.ts';
import { tlsProvider } from './stripe-tls-fixtures.ts';
import { startPrivateStripeTestReceiver } from '../src/infrastructure/stripe-test/private-receiver.ts';
const originalFetch = globalThis.fetch;
beforeEach(() => { mock.method(globalThis, 'fetch', localOnlyFetch(originalFetch)); });
afterEach(() => mock.restoreAll());
const revision = 'a'.repeat(40);
const expiry = () => new Date(Date.now() + 60000).toISOString();

test('manual plan is authorized by real local Auth/RLS, fixed to MXN 44 and refuses administrative or foreign actors', async () => {
  const s = await durable();
  const plan = await loadStripeTrialPlan(db, s.actor, s.scenario.id, 'create', revision, expiry());
  assert.equal(plan.amountMinor, 4400); assert.equal(plan.maxSessions, 1); assert.equal(plan.maxRequests, 2);
  await assert.rejects(loadStripeTrialPlan(db, await identity('b'), s.scenario.id, 'create', revision, expiry()), { code: 'NOT_FOUND' });
  await assert.rejects(loadStripeTrialPlan(admin, s.actor, s.scenario.id, 'create', revision, expiry()), { code: 'INFRASTRUCTURE_UNAVAILABLE' });
  const wrongAmount = await admin.stripeSandboxScenario.create({ data: { id: randomUUID(), subjectId: s.actor.subjectId,
    branchId: s.scenario.branchId, merchantId: s.scenario.merchantId, amountMinor: 4401, accountId: 'acct_offline' } });
  await assert.rejects(loadStripeTrialPlan(db, s.actor, wrongAmount.id, 'create', revision, expiry()), { code: 'INVALID_COMMAND' });
  assert.equal(s.remote.requests.length, 0);
});

test('controlled TLS + PostgreSQL: one initial Session and authenticated GET reconciliation, no automatic second create', async () => {
  const s = await durable();
  const plan = await loadStripeTrialPlan(db, s.actor, s.scenario.id, 'create', revision, expiry());
  const server = await tlsProvider(s.remote);
  try {
    const adapter = new StripeCheckoutTestAdapter({ ...s.options, store: firstStripeTrialStore(db),
      secrets: async () => ({ apiKey: 'sk_test_offline_fixture' }), transport: server.transport(plan) });
    const receipt = await adapter.create(s.actor, s.input);
    assert.equal(receipt.eligible, false); assert.equal(server.count(), 2); assert.equal(s.remote.sessions.size, 1);
    await assert.rejects(adapter.create(s.actor, s.input), { code: 'REQUEST_UNKNOWN' });
    await assert.rejects(loadStripeTrialPlan(db, s.actor, s.scenario.id, 'create', revision, expiry()), { code: 'REQUEST_UNKNOWN' });
    assert.equal(server.count(), 2);
    s.remote.paid();
    const reconcile = await loadStripeTrialPlan(db, s.actor, s.scenario.id, 'reconcile', revision, expiry());
    const query = new StripeCheckoutTestAdapter({ ...s.options, transport: server.transport(reconcile) });
    assert.equal((await query.reconcile(s.actor, s.input)).state, 'captured_test');
    assert.equal(server.count(), 6);
    assert.equal(s.remote.requests.filter((r) => r.method === 'POST').length, 1);
  } finally { await server.close(); }
});

test('TLS interruption after acceptance persists unknown; manual retry stops and separately simulated recovery uses identical key/body', async () => {
  const s = await durable();
  const plan = await loadStripeTrialPlan(db, s.actor, s.scenario.id, 'create', revision, expiry());
  const server = await tlsProvider(s.remote);
  try {
    server.behavior.dropPost = true;
    const adapter = new StripeCheckoutTestAdapter({ ...s.options, store: firstStripeTrialStore(db), transport: server.transport(plan) });
    assert.equal((await adapter.create(s.actor, s.input)).state, 'unknown');
    const row = await admin.stripeSandboxSubmission.findUniqueOrThrow({ where: { scenarioId: s.scenario.id } });
    assert.ok(row.key && row.hash && row.startedAt); assert.equal(row.sessionId, null); assert.equal(row.state, 'unknown');
    const count = server.count();
    const restarted = new StripeCheckoutTestAdapter({ ...s.options, store: firstStripeTrialStore(db), transport: server.transport(plan) });
    await assert.rejects(restarted.create(s.actor, s.input), { code: 'REQUEST_UNKNOWN' });
    assert.equal(server.count(), count);
    // Foundation recovery is tested OFFLINE only. The real manual CLI exposes no POST-recovery command.
    server.behavior.dropPost = false;
    const recovery = new StripeCheckoutTestAdapter({ ...s.options, store: createPostgresCheckoutSandboxStore(db), transport: server.transport(plan) });
    assert.equal((await recovery.create(s.actor, s.input)).sessionId, s.remote.checkout.id);
    const posts = s.remote.requests.filter((r) => r.method === 'POST');
    assert.equal(posts.length, 2); assert.equal(posts[0]?.headers['Idempotency-Key'], posts[1]?.headers['Idempotency-Key']);
    assert.equal(posts[0]?.body, posts[1]?.body); assert.equal(s.remote.sessions.size, 1);
  } finally { await server.close(); }
});

test('temporary loopback webhook uses original signed bytes, fresh Auth and durable replay after receiver/worker restart', async () => {
  const s = await durable(); await s.adapter.create(s.actor, s.input); s.remote.paid();
  const make = () => startPrivateStripeTestReceiver({ observe: async (body, signature) => {
    const actor = await identity();
    const adapter = new StripeCheckoutTestAdapter({ ...s.options, store: createPostgresCheckoutSandboxStore(db) });
    return adapter.observeRecorded(actor, s.input, body, signature);
  } });
  const body = eventBytes('checkout.session.completed', s.remote.checkout, Date.now());
  const signature = signStripeFixture(body, Date.now());
  const send = (port: number, sig: string) => fetch(`http://127.0.0.1:${port}/stripe-test-events`, { method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': sig }, body });
  const receiver = await make();
  try {
    const count = s.remote.requests.length;
    assert.equal((await send(receiver.port, 't=1,v1=' + '0'.repeat(64))).status, 400);
    assert.equal(s.remote.requests.length, count);
    assert.equal((await send(receiver.port, signature)).status, 200);
  } finally { await receiver.close(); }
  const restarted = await make();
  try {
    const count = s.remote.requests.length;
    const response = await send(restarted.port, signature);
    assert.deepEqual(await response.json(), { received: true, duplicate: true, eligible: false });
    assert.equal(s.remote.requests.length, count);
    assert.equal(await admin.stripeSandboxEvent.count({ where: { scenarioId: s.scenario.id } }), 1);
  } finally { await restarted.close(); }
});
