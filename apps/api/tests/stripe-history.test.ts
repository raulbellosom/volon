import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { summarizeStripeHistory, inspectStripeHistory, type StripeHistoryGroup } from '../../../scripts/local/stripe-history-store.ts';
import { assertOfflineIntegrationTarget } from '../integration/integration-environment.ts';

const group: StripeHistoryGroup = { accountClass: 'offline-fixture-label', state: 'pending', adverse: 'none',
  scenarios: 2, submissions: 1, withKey: 1, withHash: 1, withStartedAt: 1, withSession: 1,
  withPaymentIntent: 0, withCharge: 0, matchingOfflineBindings: 1, events: 0 };

test('history report preserves blockers and provenance uncertainty, with explicit zero counts for unobserved account classes', () => {
  const report = summarizeStripeHistory([group]);
  assert.equal(report.scenarios, 2); assert.equal(report.submissions, 1);
  assert.equal(report.provenance, 'NOT_RECORDED');
  assert.equal(report.externalRequestsFromDatabase, 'INDETERMINATE');
  assert.equal(report.accountClasses['configured-sandbox-unverified'], 0);
  assert.equal(report.blockers[0]?.reason, 'SUBMISSION_EXISTS_EVEN_WITHOUT_KEY');
  assert.equal(report.blockers[1]?.reason, 'MULTIPLE_SCENARIOS');
  assert.equal(report.stripeRequestsByInspection, 0);
  assert.equal(summarizeStripeHistory([]).blockers.length, 0);
  assert.throws(() => summarizeStripeHistory([{ ...group, state: 'private_sentinel' }]), { message: 'INFRASTRUCTURE_UNAVAILABLE' });
});

test('inspection sets READ ONLY before querying, requests repeatable snapshot and exposes no extra private columns', async () => {
  let readOnly = false, queries = 0;
  const tx = {
    $executeRaw: async (sql: TemplateStringsArray) => { readOnly = sql.join('').includes('SET TRANSACTION READ ONLY'); },
    $queryRaw: async () => {
      assert.equal(readOnly, true);
      queries++;
      return queries === 1 ? [{ safe: true }] : queries === 2
        ? [{ ...group, accountId: 'private_sentinel', key: 'private_key', hash: 'private_hash' }]
        : [{ state: 'pending', events: 0, privateValue: 'private_event_id' }];
    },
  };
  const db = { $transaction: async (work: (client: typeof tx) => unknown, options: { isolationLevel: string }) => {
    assert.equal(options.isolationLevel, 'RepeatableRead'); return work(tx);
  } } as unknown as PrismaClient;
  const report = await inspectStripeHistory(db, 'private_sentinel');
  assert.ok(!JSON.stringify(report).includes('private_'));
  assert.equal(queries, 3);
  const broken = { $transaction: async () => { throw new Error('private_connection_string'); } } as unknown as PrismaClient;
  await assert.rejects(inspectStripeHistory(broken, 'private_sentinel'), { message: 'INFRASTRUCTURE_UNAVAILABLE' });
});

test('automated integrations reject any manual Stripe setting in file or process, without echoing its value', () => {
  assert.doesNotThrow(() => assertOfflineIntegrationTarget({}, { LOCAL_SYNTHETIC_MODE: 'true' }));
  for (const key of ['STRIPE_SANDBOX_ACCOUNT_ID', 'STRIPE_SANDBOX_API_KEY', 'STRIPE_SANDBOX_WEBHOOK_SECRET', 'stripe_sandbox_publishable_key'])
    for (const value of ['', 'private_sentinel'])
      assert.throws(() => assertOfflineIntegrationTarget({}, { [key]: value }),
        { message: 'AUTOMATED_INTEGRATION_MANUAL_STACK_BLOCKED: usa un stack desechable separado, sin configuración Stripe manual.' });
});

test('official inspector accepts only --inspect and CI refuses before opening secrets or connecting', () => {
  for (const args of [['--inspect'], ['--create'], ['--inspect', 'private_sentinel']]) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/local/stripe-history.ts', ...args],
      { env: { ...process.env, CI: 'true' }, encoding: 'utf8', timeout: 20000 });
    assert.equal(result.status, 1);
    assert.ok(!(result.stdout + result.stderr).includes('private_sentinel'));
    const report = JSON.parse(result.stderr);
    assert.equal(report.readOnly, true); assert.equal(report.stripeRequestsByInspection, 0);
  }
});

test('integration launcher blocks before discovering tests or opening connections and never echoes configuration', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'integration-guard-'));
  try {
    await writeFile(join(cwd, '.env.local'), 'STRIPE_SANDBOX_API_KEY=private_sentinel\n');
    const result = spawnSync(process.execPath, ['--experimental-strip-types', resolve('scripts/local/test-integration.ts')],
      { cwd, env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot }, encoding: 'utf8', timeout: 20000 });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), 'AUTOMATED_INTEGRATION_BLOCKED: usa un stack desechable separado sin configuración Stripe manual.');
  } finally { await rm(cwd, { recursive: true, force: true }); }
});
