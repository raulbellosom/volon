import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadStripeFixtureEnvironment, parseStripeFixtureEnvironment, stripeFixtureMode } from '../../../scripts/local/stripe-fixture-environment.ts';
import { stripeFixtureOutput } from '../../../scripts/local/stripe-fixture-store.ts';

const config = 'LOCAL_SYNTHETIC_MODE=true\nSUPABASE_URL=http://127.0.0.1:56321\n'
  + 'MIGRATION_DATABASE_URL=postgresql://postgres:synthetic_password@127.0.0.1:56322/postgres?schema=app\n'
  + 'STRIPE_SANDBOX_ACCOUNT_ID=acct_synthetic\n';

test('fixture reads only required settings, without API key or Auth credentials, exporting no secrets', async () => {
  const local = parseStripeFixtureEnvironment(config + 'STRIPE_SANDBOX_API_KEY=never_use_this_private_sentinel\n');
  assert.deepEqual(Object.keys(local).sort(), ['accountId', 'databaseUrl']);
  assert.ok(!JSON.stringify(local).includes('private_sentinel'));
  const before = { ...process.env };
  assert.deepEqual(await loadStripeFixtureEnvironment({}, async () => config, () => {}), local);
  assert.equal(Object.keys(process.env).length === Object.keys(before).length
    && Object.keys(before).every((key) => process.env[key] === before[key]), true);
  assert.equal(stripeFixtureMode(['--dry-run']), 'dry-run');
  assert.equal(stripeFixtureMode(['--create']), 'create');
  for (const args of [[], ['--create', '--dry-run'], ['--account', 'acct_secret'], ['--create', 'extra']])
    assert.throws(() => stripeFixtureMode(args), { message: 'INVALID_COMMAND' });
});

test('absent, malformed and non-local settings fail closed with sanitized errors', () => {
  for (const contents of ['', config.replace('LOCAL_SYNTHETIC_MODE=true', 'LOCAL_SYNTHETIC_MODE=false'),
    config.replace('acct_synthetic', ''), config.replace('acct_synthetic', 'sk_live_forbidden'),
    config.replace('56321', '54321'), config.replace('127.0.0.1:56322', 'remote.test:56322'),
    config.replace('56322', '54322'), config.replace('postgres:synthetic_password', 'delivery_api:synthetic_password'),
    config.replace('/postgres?', '/other?'), config.replace('?schema=app', '?schema=app&sslmode=disable'),
    config.replace('?schema=app', '?schema=app&schema=public'), config + 'NODE_ENV=production\n',
    config + 'CI=true\n', config + 'HTTPS_PROXY=private_sentinel\n', 'x'.repeat(65537)])
    assert.throws(() => parseStripeFixtureEnvironment(contents), { message: 'CONFIGURATION_INVALID' });
});

test('CI/cloud/production/debug or conflicting inherited settings reject before file reads', async () => {
  let reads = 0;
  for (const env of [{ CI: 'true' }, { GITHUB_ACTIONS: 'true' }, { CODEX_CLOUD: 'true' },
    { NODE_ENV: 'production' }, { NODE_OPTIONS: '--inspect' }, { STRIPE_SANDBOX_ACCOUNT_ID: 'acct_override' },
    { MIGRATION_DATABASE_URL: 'private_override' }])
    await assert.rejects(loadStripeFixtureEnvironment(env, async () => { reads++; return config; }, () => {}),
      { message: 'CONFIGURATION_INVALID' });
  assert.equal(reads, 0);
  await assert.rejects(loadStripeFixtureEnvironment({}, async () => { throw new Error('private file detail'); }, () => {}),
    { message: 'CONFIGURATION_INVALID' });
  await assert.rejects(loadStripeFixtureEnvironment({}, async () => { reads++; return config; }, () => { throw new Error('tracked'); }),
    { message: 'CONFIGURATION_INVALID' });
  assert.equal(reads, 0);
});

test('CLI refuses tracked or non-ignored env files and CI without exposing secrets or requiring a TTY', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stripe-fixture-'));
  const script = resolve('scripts/local/stripe-fixture.ts');
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR };
  const run = (extra = {}) => spawnSync(process.execPath, ['--experimental-strip-types', script, '--dry-run'],
    { cwd: directory, env: { ...env, ...extra }, encoding: 'utf8', timeout: 20000 });
  try {
    execFileSync('git', ['init', '--quiet', directory], { stdio: 'ignore' });
    await writeFile(join(directory, '.env.local'), config + 'STRIPE_SANDBOX_API_KEY=private_sentinel\n');
    for (const setup of [async () => {}, async () => { execFileSync('git', ['add', '.env.local'], { cwd: directory, stdio: 'ignore' }); }]) {
      await setup();
      const result = run();
      assert.equal(result.status, 1);
      assert.ok(result.stderr.includes('BLOQUEADO=CONFIGURATION_INVALID'));
      assert.ok(!(result.stdout + result.stderr).includes('private_sentinel'));
      assert.ok(!(result.stdout + result.stderr).includes('synthetic_password'));
    }
    assert.equal(run({ CI: 'true' }).status, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('outputs contain only result, scenario UUID, amount and zero Stripe calls', () => {
  assert.equal(stripeFixtureOutput({ result: 'LISTO_PARA_CREAR', scenarioId: null }),
    'RESULTADO=LISTO_PARA_CREAR\nESCENARIO_UUID=NO_CREADO\nIMPORTE=44.00 MXN\nSOLICITUDES_A_STRIPE=0');
});
