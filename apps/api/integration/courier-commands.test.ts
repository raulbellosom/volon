import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { withSubject } from '../src/infrastructure/database.ts';
import { admin, db, courierLogin, ownState, changeAvailability } from './courier-fixtures.ts';

test('Courier commands: persisted availability and exact replay after later commands without rewinding state', async () => {
  const a = await courierLogin();
  const state = await ownState(a.token);
  const beforeDeliveries = await admin.delivery.count();
  const request = { status: 'available' as const, expectedVersion: state.availability.version };
  const key = randomUUID();
  const response = await changeAvailability(a.token, request, key);
  assert.equal(response.status, 200);
  const original = await response.json();
  assert.equal(original.availability.version, request.expectedVersion + 1);
  assert.ok(Date.parse(original.availability.changedAt) >= Date.parse(state.availability.changedAt));
  assert.equal((await changeAvailability(a.token, { status: 'offline', expectedVersion: original.availability.version })).status, 200);
  const replay = await changeAvailability(a.token, request, key);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), original);
  const latest = await ownState(a.token);
  assert.equal(latest.availability.status, 'offline');
  assert.equal(latest.availability.version, original.availability.version + 1);
  const conflict = await changeAvailability(a.token, { ...request, status: 'offline' }, key);
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'IDEMPOTENCY_CONFLICT');
  const stale = await changeAvailability(a.token, request);
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).code, 'VERSION_CONFLICT');
  assert.equal(await admin.delivery.count(), beforeDeliveries);
  await withSubject(db, a, async (tx) => {
    const rows = await tx.courierAvailabilityCommand.findMany();
    assert.ok(rows.length >= 2);
    assert.ok(rows.every((row) => row.courierId === state.courierId));
    assert.ok(rows.every((row) => row.idempotencyKeyHash !== key));
  });
});

test('Courier commands: concurrent duplicate requests commit once; two distinct keys with same version have one winner', async () => {
  const a = await courierLogin();
  const state = await ownState(a.token);
  const key = randomUUID();
  const request = { status: 'available' as const, expectedVersion: state.availability.version };
  const duplicates = await Promise.all(Array.from({ length: 4 }, () => changeAvailability(a.token, request, key)));
  assert.deepEqual(duplicates.map((row) => row.status), [200, 200, 200, 200]);
  const receipts = await Promise.all(duplicates.map((row) => row.json()));
  assert.ok(receipts.every((row) => JSON.stringify(row) === JSON.stringify(receipts[0])));
  const nextVersion = (await ownState(a.token)).availability.version;
  assert.equal(nextVersion, state.availability.version + 1);
  const racing = await Promise.all(['offline', 'available'].map((status) => changeAvailability(a.token, {
    status: status as 'offline' | 'available', expectedVersion: nextVersion,
  })));
  assert.deepEqual(racing.map((row) => row.status).sort(), [200, 409]);
  assert.equal((await ownState(a.token)).availability.version, nextVersion + 1);
});

test('Courier commands: identical idempotency keys are independent across courier identities', async () => {
  const a = await courierLogin();
  const b = await courierLogin('b');
  const key = randomUUID();
  for (const identity of [a, b]) {
    const state = await ownState(identity.token);
    assert.equal((await changeAvailability(identity.token, { status: 'offline', expectedVersion: state.availability.version }, key)).status, 200);
  }
  const rows = await withSubject(db, a, (tx) => tx.courierAvailabilityCommand.findMany());
  assert.ok(rows.every((row) => row.courierId === 'courier_synthetic_a'));
});

test('Courier commands: deferred commit failure rolls back state and ledger, then same request retries successfully', async () => {
  const a = await courierLogin();
  const before = await ownState(a.token);
  const count = await admin.courierAvailabilityCommand.count({ where: { courierId: before.courierId } });
  const request = { status: 'available' as const, expectedVersion: before.availability.version };
  const key = randomUUID();
  await admin.$executeRawUnsafe(`CREATE FUNCTION app.test_courier_commit_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'synthetic private database diagnostic'; END; $$`);
  try {
    await admin.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER test_courier_commit_failure AFTER INSERT ON app."CourierAvailabilityCommand"
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.test_courier_commit_failure()`);
    try {
      const failed = await changeAvailability(a.token, request, key);
      assert.equal(failed.status, 503);
      assert.doesNotMatch(await failed.text(), /diagnostic|postgres|Prisma|requestHash/);
      assert.deepEqual(await ownState(a.token), before);
      assert.equal(await admin.courierAvailabilityCommand.count({ where: { courierId: before.courierId } }), count);
    } finally { await admin.$executeRawUnsafe('DROP TRIGGER test_courier_commit_failure ON app."CourierAvailabilityCommand"'); }
  } finally { await admin.$executeRawUnsafe('DROP FUNCTION app.test_courier_commit_failure()'); }
  assert.equal((await changeAvailability(a.token, request, key)).status, 200);
});

test('Courier commands: administrative revocation during lock wait prevents command and stale replay', async () => {
  const a = await courierLogin();
  const state = await ownState(a.token);
  const request = { status: 'available' as const, expectedVersion: state.availability.version };
  let release: () => void = () => {};
  let acquired: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { acquired = resolve; });
  const disable = admin.$transaction(async (tx) => {
    await tx.courier.update({ where: { id: state.courierId }, data: { enabled: false } });
    acquired();
    await gate;
  }, { timeout: 10000 });
  await ready;
  const pending = changeAvailability(a.token, request);
  try {
    const deadline = Date.now() + 3000;
    let blocked = false;
    while (Date.now() < deadline) {
      const [row] = await admin.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count
        FROM pg_stat_activity WHERE usename = 'delivery_api' AND wait_event = 'advisory'`;
      if (row && row.count > 0) { blocked = true; break; }
      await setTimeout(25);
    }
    assert.equal(blocked, true, 'Request waits behind administrative revoke lock');
    release();
    await disable;
    assert.equal((await pending).status, 404);
  } finally {
    release();
    await disable;
    await admin.courier.update({ where: { id: state.courierId }, data: { enabled: true } });
  }
  assert.equal((await ownState(a.token)).availability.status, 'offline');
});
