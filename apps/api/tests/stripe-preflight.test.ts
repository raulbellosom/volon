import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { execFileSync } from 'node:child_process';
import { stripeSandboxPreflight } from '../src/infrastructure/stripe-test/preflight.ts';

test('offline preflight documents expected blockers without credentials or external calls', () => {
  const guard = mock.method(globalThis, 'fetch', () => { throw new Error('Network forbidden'); });
  try {
    const report = stripeSandboxPreflight({});
    assert.equal(report.readyForExternalCalls, false);
    assert.equal(report.networkCalls, 0);
    assert.equal(report.operationalEligibility, false);
    assert.equal(report.checks.apiKey, 'missing');
    assert.ok(report.blockers.length >= 4);
    assert.equal(guard.mock.callCount(), 0);
  } finally { guard.mock.restore(); }
});

test('even test-shaped secrets never unlock execution and never appear in output', () => {
  const env = { STRIPE_SANDBOX_API_KEY: 'sk_test_only_synthetic_fixture', STRIPE_SANDBOX_WEBHOOK_SECRET: 'whsec_only_synthetic_fixture',
    STRIPE_SANDBOX_ACCOUNT_ID: 'acct_only_synthetic_fixture' };
  const report = stripeSandboxPreflight(env);
  const output = JSON.stringify(report);
  for (const value of Object.values(env)) assert.ok(!output.includes(value));
  assert.equal(report.readyForExternalCalls, false);
  assert.equal(report.checks.apiKey, 'test-format-unverified');
});

test('live, production, empty and malformed configuration reject without echoing secret contents', () => {
  for (const env of [{ NODE_ENV: 'production' }, { STRIPE_SANDBOX_API_KEY: 'sk_live_forbidden' },
    { STRIPE_SANDBOX_API_KEY: '' }, { STRIPE_SANDBOX_API_KEY: 'sk_test_bad\nInjected' },
    { STRIPE_SANDBOX_WEBHOOK_SECRET: 'incorrect' }, { STRIPE_SANDBOX_ACCOUNT_ID: 'acct_x\nsecret' }])
    assert.throws(() => stripeSandboxPreflight(env), { message: 'CONFIGURATION_INVALID' });
});

test('preflight executable exits successfully with missing configuration and stays offline', () => {
  const env = { ...process.env };
  for (const key of ['STRIPE_SANDBOX_API_KEY', 'STRIPE_SANDBOX_WEBHOOK_SECRET', 'STRIPE_SANDBOX_ACCOUNT_ID', 'NODE_ENV']) delete env[key];
  const output = execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/local/stripe-preflight.ts'], { env, encoding: 'utf8' });
  assert.equal(JSON.parse(output).readyForExternalCalls, false);
});
