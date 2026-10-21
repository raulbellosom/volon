import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { manualStripeServices, validateStripeLocalServices } from '../src/infrastructure/stripe-test/local-services.ts';
import { validateDockerResources, verifyManualDatabase } from '../../../scripts/local/stripe-manual/identity.ts';
import { assertHistoricalEvidence } from '../../../scripts/local/stripe-manual/history.ts';
import { systemEnvironment } from '../../../scripts/local/stripe-manual/files.ts';
import { assertOfflineIntegrationTarget } from '../integration/integration-environment.ts';

const instance = '11111111-1111-4111-8111-111111111111';
const env = { LOCAL_ENVIRONMENT_KIND: 'manual-stripe-test-v1', LOCAL_STRIPE_INSTANCE_ID: instance,
  LOCAL_SYNTHETIC_MODE: 'true', SUPABASE_URL: 'http://127.0.0.1:57321',
  DATABASE_URL: 'postgresql://delivery_api:private@127.0.0.1:57322/postgres?schema=app' };

test('manual profile admits only approved ports and purpose; no secrets in transport metadata', () => {
  const services = manualStripeServices(env);
  validateStripeLocalServices(services);
  assert.equal(JSON.stringify(services).includes('private'), false);
  for (const patch of [{ LOCAL_ENVIRONMENT_KIND: '' }, { LOCAL_STRIPE_INSTANCE_ID: 'unknown' },
    { SUPABASE_URL: 'http://127.0.0.1:56321' }, { DATABASE_URL: env.DATABASE_URL.replace('57322', '56322') },
    { DATABASE_URL: env.DATABASE_URL + '&sslmode=disable' }, { SUPABASE_URL: 'http://localhost:57321' }])
    assert.throws(() => manualStripeServices({ ...env, ...patch }));
  assert.throws(() => validateStripeLocalServices({ ...services, databasePort: '56322' } as never));
  assert.throws(() => assertOfflineIntegrationTarget(env));
  assert.throws(() => assertOfflineIntegrationTarget({ LOCAL_STRIPE_INSTANCE_ID: instance }));
});

function resources() {
  return ['db', 'auth', 'gateway'].map((service) => ({
    Config: { Labels: { 'delivery.purpose': 'manual-stripe-test-v1', 'delivery.instance': instance, 'com.docker.compose.service': service } },
    NetworkSettings: { Networks: { 'delivery-stripe-manual': {} }, Ports: service === 'db'
      ? { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '57322' }] }
      : service === 'gateway' ? { '8000/tcp': [{ HostIp: '127.0.0.1', HostPort: '57321' }] } : {} },
    Mounts: service === 'db' ? [{ Type: 'volume', Name: 'delivery-stripe-manual-db', Destination: '/var/lib/postgresql/manual' }] : [],
  }));
}
test('resource checks reject historical volumes, shared networks, missing and public port mappings', () => {
  validateDockerResources(resources(), instance);
  for (const mutate of [
    (rows: ReturnType<typeof resources>) => { rows.pop(); },
    (rows: ReturnType<typeof resources>) => { rows[0]!.Mounts[0]!.Name = 'supabase_db_delivery-local'; },
    (rows: ReturnType<typeof resources>) => { rows[0]!.NetworkSettings.Networks = { 'delivery-local': {} } as never; },
    (rows: ReturnType<typeof resources>) => { rows[0]!.NetworkSettings.Ports = {}; },
    (rows: ReturnType<typeof resources>) => { rows[0]!.NetworkSettings.Ports['5432/tcp']![0]!.HostIp = '0.0.0.0'; },
    (rows: ReturnType<typeof resources>) => { rows[0]!.Config.Labels['delivery.instance'] = 'other'; },
    (rows: ReturnType<typeof resources>) => { rows[0]!.Mounts.push({ Type: 'bind', Name: 'unknown', Destination: '/var/lib/postgresql/manual' }); },
  ]) { const rows = resources(); mutate(rows); assert.throws(() => validateDockerResources(rows, instance), /MANUAL_INSTANCE_BLOCKED/); }
});

test('history preservation and database provenance fail closed without leaking evidence', async () => {
  const expected = { fingerprint: 'private-evidence', scenarios: 148, submissions: 127, events: 51 };
  assertHistoricalEvidence(expected, { ...expected });
  for (const change of [{ fingerprint: 'changed' }, { scenarios: 149 }, { submissions: 126 }, { events: 0 }])
    assert.throws(() => assertHistoricalEvidence(expected, { ...expected, ...change }), { message: 'MANUAL_INSTANCE_BLOCKED' });
  for (const rows of [[], [{ valid: false }]]) {
    const db = { $queryRaw: async () => rows };
    await assert.rejects(verifyManualDatabase(db as never, instance, 'acct_private'), { message: 'MANUAL_INSTANCE_BLOCKED' });
  }
  await verifyManualDatabase({ $queryRaw: async () => [{ valid: true }] } as never, instance, 'acct_private');
});

test('child processes and compose receive no Stripe credentials; integrations reject private manual checkout', () => {
  assert.equal(Object.keys(systemEnvironment()).some((key) => /STRIPE|DATABASE|SUPABASE|TOKEN|KEY/i.test(key)), false);
  const compose = readFileSync('infra/stripe-manual/compose.yaml', 'utf8');
  assert.equal(/STRIPE_SANDBOX|\.env\.local|56321|56322|delivery-local/.test(compose), false);
  assert.match(compose, /127\.0\.0\.1:57322:5432/);
  assert.match(compose, /127\.0\.0\.1:57321:8000/);
  assert.equal(/stripe\.com|https\.request/.test(readFileSync('scripts/local/stripe-manual/bootstrap.ts', 'utf8')), false);
});

test('official provisioner and fixture reject CI before Docker or database access, with sanitized output', () => {
  for (const [file, arg] of [['stripe-manual.ts', 'up'], ['stripe-fixture.ts', '--create']]) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', `scripts/local/${file}`, arg!],
      { encoding: 'utf8', timeout: 10000, env: { ...systemEnvironment(), CI: 'true', STRIPE_SANDBOX_API_KEY: 'rk_test_private_sentinel' } });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /BLOCKED|BLOQUEADO/);
    assert.equal((result.stdout + result.stderr).includes('private_sentinel'), false);
    assert.equal((result.stdout + result.stderr).includes('57322'), false);
  }
});
