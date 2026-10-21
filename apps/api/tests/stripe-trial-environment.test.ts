import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadStripeTrialEnvironment, assertStripeTrialAccount } from '../../../scripts/local/stripe-trial-environment.ts';
import { sandbox } from './stripe-test.fixtures.ts';
import { StripeCheckoutTestAdapter } from '../src/infrastructure/stripe-test/adapter.ts';
import { validateStripeWireRequest } from '../src/infrastructure/stripe-test/https-policy.ts';
import { wireRequest } from './stripe-https.fixtures.ts';
import { stripeSandboxPreflight } from '../src/infrastructure/stripe-test/preflight.ts';

const services = 'LOCAL_SYNTHETIC_MODE=true\nSUPABASE_URL=http://127.0.0.1:56321\n'
  + 'DATABASE_URL=postgresql://delivery_api:synthetic@127.0.0.1:56322/postgres?schema=app\n';
const file = services + 'STRIPE_SANDBOX_ACCOUNT_ID=acct_offline\nSTRIPE_SANDBOX_API_KEY=rk_test_synthetic_only\n';

test('local file requires both account and Test key, with no required webhook or publishable key', async () => {
  for (const key of ['rk_test_synthetic_only', 'sk_test_synthetic_only']) {
    const local = await loadStripeTrialEnvironment({}, true, async () => file.replace('rk_test_synthetic_only', key));
    assert.equal(local.secrets.apiKey, key);
    assert.equal(local.secrets.webhookSecret, undefined);
    assertStripeTrialAccount(local.accountId, { accountId: 'acct_offline' });
    assert.throws(() => assertStripeTrialAccount(local.accountId, { accountId: 'acct_foreign' }), { code: 'CONFIGURATION_INVALID' });
  }
  for (const contents of [services, file.replace('STRIPE_SANDBOX_ACCOUNT_ID=acct_offline\n', ''),
    file.replace('STRIPE_SANDBOX_API_KEY=rk_test_synthetic_only\n', ''), file.replace('acct_offline', ''),
    file.replace('rk_test_synthetic_only', ''), file + 'STRIPE_SANDBOX_WEBHOOK_SECRET=\n'])
    await assert.rejects(loadStripeTrialEnvironment({}, true, async () => contents), { code: 'CONFIGURATION_INVALID' });
});

test('CI, cloud, production, non-TTY and unsafe TLS fail before opening any file', async () => {
  let reads = 0;
  const read = async () => { reads++; return file; };
  for (const env of [{ CI: 'true' }, { GITHUB_ACTIONS: 'true' }, { CODEX_CLOUD: 'true' },
    { NODE_ENV: 'production' }, { HTTPS_PROXY: 'private' }, { NODE_OPTIONS: '--inspect' }])
    await assert.rejects(loadStripeTrialEnvironment(env, true, read), { code: 'TRANSPORT_DISABLED' });
  await assert.rejects(loadStripeTrialEnvironment({}, false, read), { code: 'TRANSPORT_DISABLED' });
  assert.equal(reads, 0);
  await assert.rejects(loadStripeTrialEnvironment({}, true, async () => file + 'CI=true\n'), { code: 'TRANSPORT_DISABLED' });
});

test('Live keys, wrong types, environment overrides and file failures expose only sanitized errors', async () => {
  for (const key of ['rk_live_synthetic', 'sk_live_synthetic', 'pk_live_synthetic', 'pk_test_synthetic', 'sk_org_synthetic']) {
    await assert.rejects(loadStripeTrialEnvironment({}, true, async () => file.replace('rk_test_synthetic_only', key)),
      { message: 'CONFIGURATION_INVALID' });
    const request = wireRequest();
    assert.throws(() => validateStripeWireRequest({ ...request, headers: { ...request.headers, Authorization: 'Bearer ' + key } }),
      { code: 'TRANSPORT_DISABLED' });
  }
  await assert.rejects(loadStripeTrialEnvironment({ STRIPE_SANDBOX_API_KEY: 'sk_test_override' }, true, async () => file),
    { message: 'CONFIGURATION_INVALID' });
  await assert.rejects(loadStripeTrialEnvironment({}, true, async () => { throw new Error('private content'); }),
    { message: 'CONFIGURATION_INVALID' });
  await assert.rejects(loadStripeTrialEnvironment({}, true, async () => 'x'.repeat(65537)), { code: 'CONFIGURATION_INVALID' });
});

test('optional future keys are validated and never emitted in preflight', async () => {
  const contents = file + 'STRIPE_SANDBOX_WEBHOOK_SECRET=whsec_synthetic_only\nSTRIPE_SANDBOX_PUBLISHABLE_KEY=pk_test_synthetic_only\n';
  const local = await loadStripeTrialEnvironment({}, true, async () => contents);
  assert.equal(local.secrets.webhookSecret, 'whsec_synthetic_only');
  const report = stripeSandboxPreflight({ STRIPE_SANDBOX_API_KEY: local.secrets.apiKey,
    STRIPE_SANDBOX_PUBLISHABLE_KEY: 'pk_test_synthetic_only' });
  assert.ok(!JSON.stringify(report).includes('synthetic_only'));
  for (const key of ['pk_live_synthetic', 'sk_test_synthetic', ''])
    await assert.rejects(loadStripeTrialEnvironment({}, true, async () => file + 'STRIPE_SANDBOX_PUBLISHABLE_KEY=' + key),
      { code: 'CONFIGURATION_INVALID' });
});

test('restricted Test key crosses adapter and wire validation, with fixed version and eligibility false', async () => {
  const s = sandbox();
  const local = await loadStripeTrialEnvironment({}, true, async () => file);
  const adapter = new StripeCheckoutTestAdapter({ ...s.options, secrets: async () => local.secrets });
  assert.equal((await adapter.create(s.actor, s.input)).eligible, false);
  s.remote.paid();
  assert.equal((await adapter.reconcile(s.actor, s.input)).eligible, false);
  for (const request of s.remote.requests) validateStripeWireRequest(request);
  for (const version of ['2022-11-15', '2026-10-01.endive', '']) {
    const request = wireRequest();
    assert.throws(() => validateStripeWireRequest({ ...request, headers: { ...request.headers, 'Stripe-Version': version } }),
      { code: 'TRANSPORT_DISABLED' });
  }
});

test('restricted key without Account permission or with a different account cannot POST and leaks no provider error', async () => {
  for (const response of [
    { status: 403, body: Buffer.from('{"error":{"message":"private credential details"}}') },
    { status: 200, body: Buffer.from('{"object":"account","id":"acct_foreign"}') },
  ]) {
    const s = sandbox();
    s.remote.intercept = () => Promise.resolve(response);
    const adapter = new StripeCheckoutTestAdapter({ ...s.options, secrets: async () => ({ apiKey: 'rk_test_synthetic_only' }) });
    await assert.rejects(adapter.create(s.actor, s.input),
      { message: response.status === 403 ? 'PROVIDER_REJECTED' : 'RESPONSE_MISMATCH' });
    assert.equal(s.remote.requests.length, 1);
    assert.equal(s.remote.requests[0]?.method, 'GET');
  }
});
