import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { createDatabase } from '../src/infrastructure/database.ts';
import { durable, admin, db, createPostgresCheckoutSandboxStore, StripeCheckoutTestAdapter,
  eventBytes, signStripeFixture, deferred, pause, localOnlyFetch } from './stripe-persistence-fixtures.ts';
const fetchOriginal = globalThis.fetch;
beforeEach(() => { mock.method(globalThis, 'fetch', localOnlyFetch(fetchOriginal)); });
afterEach(() => mock.restoreAll());

test('hard process interruption after simulated POST: expired lease recovers identical key/body and one logical Session', async () => {
  const s = await durable(1000);
  const suffix = String(s.remote.checkout.id).slice('cs_test_'.length);
  const child = fork(new URL('./stripe-crash-worker.ts', import.meta.url), [s.actor.subjectId, s.scenario.id, suffix],
    { execArgv: ['--experimental-strip-types'], stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  let posted: { key: string; body: string };
  try {
    const [message] = await Promise.race([once(child, 'message'),
      once(child, 'exit').then(() => { throw new Error('Worker exited before checkpoint'); }),
      pause(10000).then(() => { throw new Error('Worker checkpoint timeout'); })]);
    assert.equal(message.posted, true);
    posted = message;
  } finally {
    child.kill('SIGKILL');
    if (child.exitCode === null && child.signalCode === null) await once(child, 'exit');
  }
  const before = await admin.stripeSandboxSubmission.findUniqueOrThrow({ where: { scenarioId: s.scenario.id } });
  assert.equal(before.sessionId, null);
  assert.ok(before.key && before.startedAt && before.leaseToken);
  await pause(1100);
  s.remote.sessions.set(posted.key, { body: posted.body, id: String(s.remote.checkout.id) });
  // New database client represents a restarted worker; the simulated provider retains the same Session for this key.
  const restartedDb = createDatabase(process.env.DATABASE_URL ?? '');
  try {
    const adapter = new StripeCheckoutTestAdapter({ ...s.options, store: createPostgresCheckoutSandboxStore(restartedDb) });
    const result = await adapter.create(s.actor, s.input);
    assert.equal(result.sessionId, s.remote.checkout.id);
    const post = s.remote.requests.find((r) => r.method === 'POST');
    assert.equal(post?.headers['Idempotency-Key'], posted.key);
    assert.equal(post?.body, posted.body);
    await adapter.create(s.actor, s.input);
    assert.equal(s.remote.requests.filter((r) => r.method === 'POST').length, 1);
    assert.equal(s.remote.sessions.size, 1);
  } finally { await restartedDb.$disconnect(); }
});

test('commit acknowledgement loss recovers persisted Session and event receipts without repeating POST or event', async () => {
  const s = await durable();
  let lose = true;
  const store = { reserve: s.store.reserve, save: async (...args: Parameters<typeof s.store.save>) => {
    await s.store.save(...args);
    if (args[2] && lose) { lose = false; throw new Error('Acknowledgement lost after commit'); }
  } };
  const adapter = new StripeCheckoutTestAdapter({ ...s.options, store });
  await assert.rejects(adapter.create(s.actor, s.input), { code: 'INFRASTRUCTURE_UNAVAILABLE' });
  const restarted = new StripeCheckoutTestAdapter({ ...s.options, store: createPostgresCheckoutSandboxStore(db) });
  await restarted.create(s.actor, s.input);
  assert.equal(s.remote.requests.filter((r) => r.method === 'POST').length, 1);
  s.remote.paid();
  const body = eventBytes('checkout.session.completed', s.remote.checkout, Date.now());
  lose = true;
  await assert.rejects(adapter.observe(s.actor, s.input, body, signStripeFixture(body, Date.now())), { code: 'INFRASTRUCTURE_UNAVAILABLE' });
  assert.equal((await restarted.observe(s.actor, s.input, body, signStripeFixture(body, Date.now()))).duplicate, true);
  assert.equal(await admin.stripeSandboxEvent.count({ where: { scenarioId: s.scenario.id } }), 1);
});

test('lease expiry and new reservation fence a delayed response using CAS; explicit recovery keeps the same key', async () => {
  const s = await durable(1000);
  const entered = deferred(), release = deferred();
  s.remote.intercept = (r) => r.method === 'POST' ? (async () => {
    entered.resolve(); await release.promise;
    return { status: 200, body: Buffer.from(JSON.stringify(s.remote.checkout)) };
  })() : null;
  const first = s.adapter.create(s.actor, s.input);
  const rejected = assert.rejects(first, { code: 'VERSION_CONFLICT' });
  await entered.promise;
  await pause(1100);
  const replacementStore = createPostgresCheckoutSandboxStore(db);
  const lease = await replacementStore.reserve(s.actor, s.scenario.id, s.scenario.accountId);
  assert.equal(lease.fixture.state, 'unknown');
  release.resolve(); await rejected;
  assert.equal((await admin.stripeSandboxSubmission.findUniqueOrThrow({ where: { scenarioId: s.scenario.id } })).sessionId, null);
  await replacementStore.save(s.actor, lease, true);
  s.remote.intercept = undefined;
  const restarted = new StripeCheckoutTestAdapter({ ...s.options, store: replacementStore });
  await restarted.create(s.actor, s.input);
  const posts = s.remote.requests.filter((r) => r.method === 'POST');
  assert.equal(posts.length, 2);
  assert.equal(posts[0]?.headers['Idempotency-Key'], posts[1]?.headers['Idempotency-Key']);
  assert.equal(posts[0]?.body, posts[1]?.body);
  assert.equal(s.remote.sessions.size, 1);
});

test('actual PostgreSQL outage before checkpoint prevents POST; outage after transport leaves recoverable unknown reservation', async () => {
  for (const afterTransport of [false, true]) {
    const s = await durable(1000);
    const unavailable = createDatabase('postgresql://unavailable:unavailable@127.0.0.1:1/postgres?schema=app');
    const dead = createPostgresCheckoutSandboxStore(unavailable);
    const store = { reserve: s.store.reserve, save: async (...args: Parameters<typeof s.store.save>) => {
      if (afterTransport && !args[2]) return s.store.save(...args);
      return dead.save(...args);
    } };
    try {
      await assert.rejects(new StripeCheckoutTestAdapter({ ...s.options, store }).create(s.actor, s.input),
        { code: 'INFRASTRUCTURE_UNAVAILABLE', message: 'INFRASTRUCTURE_UNAVAILABLE' });
      assert.equal(s.remote.requests.filter((r) => r.method === 'POST').length, afterTransport ? 1 : 0);
      const row = await admin.stripeSandboxSubmission.findUniqueOrThrow({ where: { scenarioId: s.scenario.id } });
      assert.equal(row.sessionId, null);
      assert.equal(!!row.key, afterTransport);
      await pause(1100);
      const restarted = new StripeCheckoutTestAdapter({ ...s.options, store: createPostgresCheckoutSandboxStore(db) });
      await restarted.create(s.actor, s.input);
      const posts = s.remote.requests.filter((r) => r.method === 'POST');
      if (afterTransport) assert.equal(posts[0]?.headers['Idempotency-Key'], posts[1]?.headers['Idempotency-Key']);
    } finally { await unavailable.$disconnect(); }
  }
});

test('signed bound refund is durable before unavailable provider; restart/late success never removes refund or dispute', async () => {
  const s = await durable();
  await s.adapter.create(s.actor, s.input); s.remote.paid();
  assert.equal((await s.adapter.reconcile(s.actor, s.input)).state, 'captured_test');
  const entered = deferred(), release = deferred();
  s.remote.intercept = () => (async () => { entered.resolve(); await release.promise; throw new Error('Simulated timeout'); })();
  const refund = { ...s.remote.charge, amount_refunded: 1, refunded: false };
  const body = eventBytes('charge.refunded', refund, Date.now());
  const pending = s.adapter.observe(s.actor, s.input, body, signStripeFixture(body, Date.now()));
  await entered.promise;
  assert.equal((await admin.stripeSandboxSubmission.findUniqueOrThrow({ where: { scenarioId: s.scenario.id } })).adverse, 'refunded');
  release.resolve();
  assert.equal((await pending).state, 'refunded');
  assert.equal(await admin.stripeSandboxEvent.count({ where: { scenarioId: s.scenario.id } }), 0);
  s.remote.intercept = undefined;
  const restarted = new StripeCheckoutTestAdapter({ ...s.options, store: createPostgresCheckoutSandboxStore(db) });
  assert.equal((await restarted.observe(s.actor, s.input, body, signStripeFixture(body, Date.now()))).state, 'refunded');
  const dispute = eventBytes('charge.dispute.closed', { object: 'dispute', id: 'dp_synthetic', livemode: false,
    charge: s.remote.charge.id, payment_intent: s.remote.intent.id, currency: 'mxn', amount: 4400, status: 'won' }, Date.now());
  assert.equal((await restarted.observe(s.actor, s.input, dispute, signStripeFixture(dispute, Date.now()))).state, 'disputed');
  assert.equal((await restarted.reconcile(s.actor, s.input)).state, 'disputed');
  assert.equal((await restarted.create(s.actor, s.input)).state, 'disputed');
});
