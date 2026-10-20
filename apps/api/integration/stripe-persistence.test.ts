import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { durable, admin, db, createPostgresCheckoutSandboxStore, StripeCheckoutTestAdapter,
  eventBytes, signStripeFixture, deferred, localOnlyFetch } from './stripe-persistence-fixtures.ts';
const fetchOriginal = globalThis.fetch;
beforeEach(() => { mock.method(globalThis, 'fetch', localOnlyFetch(fetchOriginal)); });
afterEach(() => mock.restoreAll());

test('20 concurrent creates: one POST, durable binding and no open SQL transaction or lock during transport', async () => {
  const s = await durable();
  const entered = deferred();
  const release = deferred();
  s.remote.intercept = (r) => r.method === 'POST' ? (async () => {
    entered.resolve(); await release.promise;
    return { status: 200, body: Buffer.from(JSON.stringify(s.remote.checkout)) };
  })() : null;
  const first = s.adapter.create(s.actor, s.input);
  await entered.promise;
  try {
    const [countRow] = await admin.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_stat_activity
      WHERE usename = 'delivery_api' AND xact_start IS NOT NULL`;
    assert.equal(Number(countRow?.count), 0);
    // An unrelated SQL transaction can acquire the same row lock immediately.
    await admin.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "scenarioId" FROM app."StripeSandboxSubmission" WHERE "scenarioId" = ${s.scenario.id}::uuid FOR UPDATE NOWAIT`;
    });
    const peers = await Promise.allSettled(Array.from({ length: 20 }, () => s.adapter.create(s.actor, s.input)));
    for (const result of peers) {
      assert.equal(result.status, 'rejected');
      if (result.status === 'rejected') assert.equal(result.reason.code, 'REQUEST_BUSY');
    }
  } finally { release.resolve(); }
  const result = await first;
  assert.equal(result.eligible, false);
  assert.equal(s.remote.requests.filter((r) => r.method === 'POST').length, 1);
  const restarted = new StripeCheckoutTestAdapter({ ...s.options, store: createPostgresCheckoutSandboxStore(db) });
  assert.equal((await restarted.create(s.actor, s.input)).sessionId, result.sessionId);
  assert.equal(s.remote.requests.filter((r) => r.method === 'POST').length, 1);
  const row = await admin.stripeSandboxSubmission.findUniqueOrThrow({ where: { scenarioId: s.scenario.id } });
  assert.equal(row.leaseToken, null);
  assert.ok(row.startedAt && row.version > 1);
});

test('20 concurrent signed events, restart replay and altered digest keep one immutable event', async () => {
  const s = await durable();
  await s.adapter.create(s.actor, s.input);
  s.remote.paid();
  const body = eventBytes('checkout.session.completed', s.remote.checkout, Date.now());
  const signature = signStripeFixture(body, Date.now());
  const outcomes = await Promise.allSettled(Array.from({ length: 20 }, () => s.adapter.observe(s.actor, s.input, body, signature)));
  assert.ok(outcomes.some((r) => r.status === 'fulfilled'));
  for (const r of outcomes) if (r.status === 'rejected') assert.equal(r.reason.code, 'REQUEST_BUSY');
  assert.equal(await admin.stripeSandboxEvent.count({ where: { scenarioId: s.scenario.id } }), 1);
  const restarted = new StripeCheckoutTestAdapter({ ...s.options, store: createPostgresCheckoutSandboxStore(db) });
  const count = s.remote.requests.length;
  assert.equal((await restarted.observe(s.actor, s.input, body, signature)).duplicate, true);
  assert.equal(s.remote.requests.length, count);
  const parsed = JSON.parse(body.toString()); parsed.data.object.metadata = { ignored: 'changed' };
  const changed = Buffer.from(JSON.stringify(parsed));
  await assert.rejects(restarted.observe(s.actor, s.input, changed, signStripeFixture(changed, Date.now())), { code: 'REPLAY_CONFLICT' });
  await assert.rejects(admin.stripeSandboxEvent.updateMany({ where: { scenarioId: s.scenario.id }, data: { state: 'pending' } }));
  await assert.rejects(admin.stripeSandboxEvent.deleteMany({ where: { scenarioId: s.scenario.id } }));
  assert.equal((await admin.stripeSandboxEvent.findFirstOrThrow({ where: { scenarioId: s.scenario.id } })).state, 'captured_test');
});
