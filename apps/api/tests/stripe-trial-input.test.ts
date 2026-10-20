import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { hiddenInputChunk, readHiddenStripeValue } from '../../../scripts/local/stripe-hidden-input.ts';
import { sandbox, fixtureSecrets, eventBytes, signStripeFixture } from './stripe-test.fixtures.ts';
import { StripeCheckoutTestAdapter } from '../src/infrastructure/stripe-test/adapter.ts';

test('hidden input editor handles bounded ASCII, backspace and CRLF but rejects escape, cancel and pasted extra lines', async () => {
  assert.deepEqual(hiddenInputChunk('abc', '\bD\r\n'), { value: 'abD', done: true });
  assert.deepEqual(hiddenInputChunk('', 'synthetic_only'), { value: 'synthetic_only', done: false });
  for (const chunk of ['\x03','\x04','\x1b[A','line1\nline2','é','x'.repeat(8193)])
    assert.throws(() => hiddenInputChunk('', chunk), { code: 'INVALID_COMMAND' });
  await assert.rejects(readHiddenStripeValue('Never echo input'), { code: 'TRANSPORT_DISABLED' });
});

test('manual executable preflight remains offline under CI; execution flags cannot bypass TTY or use secret arguments', () => {
  const env = { ...process.env, CI: 'true', GITHUB_ACTIONS: 'true' };
  const run = (args: string[]) => spawnSync(process.execPath, ['--experimental-strip-types','scripts/local/stripe-trial.ts',...args],
    { env, encoding: 'utf8', timeout: 20000 });
  const preview = run(['--preflight']);
  assert.equal(preview.status, 0);
  assert.equal(JSON.parse(preview.stdout).readyForExternalCalls, false);
  for (const args of [['--plan','create','00000000-0000-0000-0000-000000000000'],
    ['--create','00000000-0000-0000-0000-000000000000','a'.repeat(64)], ['--key','sk_live_synthetic_forbidden']]) {
    const result = run(args);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error, 'TRANSPORT_DISABLED');
    assert.ok(!result.stdout.includes('sk_live_') && !result.stderr.includes('sk_live_'));
  }
});

test('create/reconcile do not require invented webhook secrets; observe fails closed without its independent whsec', async () => {
  const s = sandbox();
  const adapter = new StripeCheckoutTestAdapter({ ...s.options, secrets: async () => ({ apiKey: fixtureSecrets.apiKey }) });
  await adapter.create(s.actor, s.input);
  s.remote.paid();
  assert.equal((await adapter.reconcile(s.actor, s.input)).eligible, false);
  const body = eventBytes('checkout.session.completed', s.remote.checkout, s.time.now);
  const count = s.remote.requests.length;
  await assert.rejects(adapter.observe(s.actor, s.input, body, signStripeFixture(body, s.time.now)), { code: 'CONFIGURATION_INVALID' });
  assert.equal(s.remote.requests.length, count);
  assert.equal(s.store.get(s.fixture.intentId).fixture.events.size, 0);
});
