import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test, mock, beforeEach, afterEach } from 'node:test';
import { admin, db } from './delivery-fixtures.ts';
import { createDatabase } from '../src/infrastructure/database.ts';
import { required } from './delivery-fixtures.ts';
import { assertStripeFixtureRole, readStripeFixtureIdentity, prepareStripeFixtureScenario,
  prepareStripeFixture, type StripeFixtureIdentity, type StripeFixtureResult } from '../../../scripts/local/stripe-fixture-store.ts';

beforeEach(() => { mock.method(globalThis, 'fetch', () => { throw new Error('No HTTP allowed'); }); });
afterEach(() => mock.restoreAll());

async function binding(): Promise<StripeFixtureIdentity> {
  const actual = await admin.$transaction((tx) => readStripeFixtureIdentity(tx, 'dry-run'));
  const merchantId = 'fixture_' + randomUUID();
  const branchId = 'fixture_' + randomUUID();
  await admin.merchant.create({ data: { id: merchantId, name: 'Fixture sintético aislado' } });
  await admin.branch.create({ data: { id: branchId, merchantId, name: 'Fixture sintético', latitude: 0, longitude: 0 } });
  return { ...actual, merchantId, branchId };
}
const prepare = (identity: StripeFixtureIdentity, mode: 'dry-run' | 'create' = 'create', account = 'acct_fixture') =>
  admin.$transaction((tx) => prepareStripeFixtureScenario(tx, identity, account, mode));

test('fixture admin and fixed provisioned identity are required; runtime role is denied', async () => {
  await admin.$transaction(async (tx) => {
    await assertStripeFixtureRole(tx);
    const actor = await readStripeFixtureIdentity(tx, 'create');
    assert.equal(actor.branchId, 'branch_synthetic_a');
    assert.equal(actor.merchantId, 'merchant_synthetic_a');
  });
  await assert.rejects(db.$transaction((tx) => assertStripeFixtureRole(tx)), { code: 'AUTHORIZATION_DENIED' });
  await assert.rejects(prepareStripeFixture(db, 'acct_fixture', 'create'), { code: 'AUTHORIZATION_DENIED' });
});

test('dry-run is read only, create persists one offline MXN 4400 scenario and reuse preserves every field', async () => {
  const actor = await binding();
  assert.deepEqual(await prepare(actor, 'dry-run'), { result: 'LISTO_PARA_CREAR', scenarioId: null });
  assert.equal(await admin.stripeSandboxScenario.count({ where: { branchId: actor.branchId } }), 0);
  const created = await prepare(actor);
  assert.equal(created.result, 'CREADO');
  assert.ok(created.scenarioId);
  const row = await admin.stripeSandboxScenario.findUniqueOrThrow({ where: { id: created.scenarioId } });
  assert.equal(row.amountMinor, 4400); assert.equal(row.currency, 'MXN'); assert.equal(row.purpose, 'offline-test');
  for (const mode of ['dry-run', 'create'] as const) {
    assert.deepEqual(await prepare(actor, mode), { result: 'REUTILIZADO', scenarioId: created.scenarioId });
    assert.deepEqual(await admin.stripeSandboxScenario.findUnique({ where: { id: created.scenarioId } }), row);
  }
});

function worker(identity: StripeFixtureIdentity): Promise<StripeFixtureResult> {
  return new Promise((resolve, reject) => {
    const child = fork(fileURLToPath(new URL('./stripe-fixture-worker.ts', import.meta.url)), [], {
      execArgv: ['--experimental-strip-types'], stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR },
    });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Fixture worker timeout')); }, 20000);
    child.once('error', () => { clearTimeout(timer); reject(new Error('Fixture worker unavailable')); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Fixture worker exited without result')); });
    child.once('message', (value: unknown) => {
      clearTimeout(timer);
      if (!value || typeof value !== 'object' || !('result' in value) || !('scenarioId' in value)
        || (value.result !== 'CREADO' && value.result !== 'REUTILIZADO') || typeof value.scenarioId !== 'string') {
        reject(new Error('Invalid fixture worker result')); return;
      }
      resolve({ result: value.result, scenarioId: value.scenarioId });
    });
    child.send({ ...identity, databaseUrl: required('MIGRATION_DATABASE_URL') });
  });
}

test('two independent Node processes concurrently create exactly one scenario', async () => {
  const actor = await binding();
  const results = await Promise.all([worker(actor), worker(actor)]);
  assert.equal(results.filter((result) => result.result === 'CREADO').length, 1);
  assert.equal(results.filter((result) => result.result === 'REUTILIZADO').length, 1);
  assert.equal(results[0]?.scenarioId, results[1]?.scenarioId);
  assert.equal(await admin.stripeSandboxScenario.count({ where: { branchId: actor.branchId } }), 1);
});

test('any previous submission blocks both modes, even without a key; changing account cannot bypass history', async () => {
  const actor = await binding(); const created = await prepare(actor); assert.ok(created.scenarioId);
  await admin.stripeSandboxSubmission.create({ data: { scenarioId: created.scenarioId, accountId: 'acct_fixture' } });
  const before = await admin.stripeSandboxSubmission.findUnique({ where: { scenarioId: created.scenarioId } });
  for (const mode of ['dry-run', 'create'] as const) {
    await assert.rejects(prepare(actor, mode), { code: 'HISTORY_BLOCKED' });
    await assert.rejects(prepare(actor, mode, 'acct_changed'), { code: 'HISTORY_BLOCKED' });
  }
  assert.deepEqual(await admin.stripeSandboxSubmission.findUnique({ where: { scenarioId: created.scenarioId } }), before);
  assert.equal(await admin.stripeSandboxScenario.count({ where: { branchId: actor.branchId } }), 1);
});

test('wrong account, disabled scenario, wrong owner/amount or multiple scenarios block without replacement', async () => {
  const actor = await binding(); const first = await prepare(actor); assert.ok(first.scenarioId);
  await assert.rejects(prepare(actor, 'create', 'acct_wrong'), { code: 'SCENARIO_CONFLICT' });
  await admin.stripeSandboxScenario.update({ where: { id: first.scenarioId }, data: { enabled: false } });
  await assert.rejects(prepare(actor), { code: 'SCENARIO_CONFLICT' });
  const secondActor = await binding();
  await admin.stripeSandboxScenario.create({ data: { id: randomUUID(), ...secondActor, accountId: 'acct_fixture', amountMinor: 4401 } });
  await assert.rejects(prepare(secondActor), { code: 'SCENARIO_CONFLICT' });
  const thirdActor = await binding();
  await prepare(thirdActor);
  await assert.rejects(prepare({ ...thirdActor, subjectId: randomUUID() }), { code: 'SCENARIO_CONFLICT' });
  await admin.stripeSandboxScenario.create({ data: { id: randomUUID(), ...thirdActor, accountId: 'acct_fixture', amountMinor: 4400 } });
  await assert.rejects(prepare(thirdActor), { code: 'SCENARIO_CONFLICT' });
});

test('disabled membership/branch/merchant and mismatched Auth subject deny provisioning', async () => {
  const original = await admin.membership.findUniqueOrThrow({ where: { id: 'membership_synthetic_a' } });
  for (const target of ['membership', 'branch', 'merchant', 'subject'] as const) {
    try {
      if (target === 'membership') await admin.membership.update({ where: { id: original.id }, data: { enabled: false } });
      if (target === 'branch') await admin.branch.update({ where: { id: original.branchId }, data: { enabled: false } });
      if (target === 'merchant') await admin.merchant.update({ where: { id: original.merchantId }, data: { enabled: false } });
      if (target === 'subject') await admin.membership.update({ where: { id: original.id }, data: { subjectId: randomUUID() } });
      await assert.rejects(prepareStripeFixture(admin, 'acct_fixture', 'create'), { code: 'AUTHORIZATION_DENIED' });
    } finally {
      await admin.membership.update({ where: { id: original.id }, data: { enabled: original.enabled, subjectId: original.subjectId } });
      await admin.branch.update({ where: { id: original.branchId }, data: { enabled: true } });
      await admin.merchant.update({ where: { id: original.merchantId }, data: { enabled: true } });
    }
  }
});

test('read-only wrapper cannot write and a failed transaction rolls back creation without modifying history', async () => {
  // Existing scenarios may include history from other integrations: only read, never reset or bypass it.
  const before = await admin.stripeSandboxScenario.count({ where: { branchId: 'branch_synthetic_a' } });
  await prepareStripeFixture(admin, 'acct_fixture', 'dry-run').catch((error: unknown) => {
    assert.ok(error instanceof Error && ['HISTORY_BLOCKED', 'SCENARIO_CONFLICT'].includes(error.message));
  });
  assert.equal(await admin.stripeSandboxScenario.count({ where: { branchId: 'branch_synthetic_a' } }), before);
  const actor = await binding();
  await assert.rejects(admin.$transaction(async (tx) => {
    await prepareStripeFixtureScenario(tx, actor, 'acct_fixture', 'create');
    throw new Error('Injected failure');
  }), { message: 'Injected failure' });
  assert.equal(await admin.stripeSandboxScenario.count({ where: { branchId: actor.branchId } }), 0);
  assert.equal((await prepare(actor)).result, 'CREADO');
  const unavailable = createDatabase('postgresql://postgres:private_sentinel@127.0.0.1:1/postgres?schema=app');
  try { await assert.rejects(prepareStripeFixture(unavailable, 'acct_fixture', 'create'), { message: 'INFRASTRUCTURE_UNAVAILABLE' }); }
  finally { await unavailable.$disconnect(); }
});
