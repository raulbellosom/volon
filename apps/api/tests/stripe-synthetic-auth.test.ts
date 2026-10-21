import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authenticateStripeSyntheticUser } from '../../../scripts/local/stripe-synthetic-auth.ts';
import { manualStripeServices } from '../src/infrastructure/stripe-test/local-services.ts';

const subjectId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const local = { services: manualStripeServices({ LOCAL_SYNTHETIC_MODE: 'true', LOCAL_ENVIRONMENT_KIND: 'manual-stripe-test-v1',
  LOCAL_STRIPE_INSTANCE_ID: subjectId, SUPABASE_URL: 'http://127.0.0.1:57321',
  DATABASE_URL: 'postgresql://delivery_api:private@127.0.0.1:57322/postgres?schema=app' }),
  syntheticPassword: 'private_password_sentinel', publishableKey: 'private_local_key_sentinel' };
const session = { access_token: 'private.token_sentinel.signature', refresh_token: 'private_refresh_sentinel', token_type: 'bearer',
  user: { id: subjectId, email: 'merchant-a@example.test' } };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

test('password grant and existing authenticator use only local Auth; only verified actor escapes memory scope', async (t) => {
  const previousEnv = { ...process.env };
  const calls: string[] = [];
  const fetch = t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
    const url = String(input); calls.push(url);
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal instanceof AbortSignal);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('apikey'), local.publishableKey);
    if (calls.length === 1) {
      assert.equal(url, 'http://127.0.0.1:57321/auth/v1/token?grant_type=password');
      assert.equal(init?.method, 'POST');
      assert.equal(headers.get('authorization'), null);
      assert.deepEqual(JSON.parse(String(init?.body)), { email: 'merchant-a@example.test', password: local.syntheticPassword });
      return json(session);
    }
    assert.equal(url, 'http://127.0.0.1:57321/auth/v1/user');
    assert.equal(headers.get('authorization'), 'Bearer ' + session.access_token);
    return json({ id: subjectId });
  });
  assert.deepEqual(await authenticateStripeSyntheticUser(local), { subjectId });
  fetch.mock.restore();
  assert.equal(calls.length, 2);
  assert.equal(JSON.stringify({ ...process.env }) === JSON.stringify(previousEnv), true);
});

test('expired/invalid tokens, foreign email or subject, and mismatched authenticated identity fail closed', async (t) => {
  for (const [body, userResponse, expected] of [
    [session, json({}, 401), undefined],
    [{ ...session, access_token: 'token\r\nInjected' }, json({ id: subjectId }), undefined],
    [{ ...session, user: { id: otherId, email: 'merchant-b@example.test' } }, json({ id: otherId }), undefined],
    [session, json({ id: otherId }), undefined],
    [session, json({ id: subjectId }), ''],
    [{ ...session, user: { id: otherId, email: 'merchant-a@example.test' } }, json({ id: otherId }), subjectId],
    [{ ...session, token_type: 'unexpected' }, json({ id: subjectId }), undefined],
  ] as const) {
    const fetch = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof globalThis.fetch>[0]) => String(url).includes('/token?') ? json(body) : userResponse);
    await assert.rejects(authenticateStripeSyntheticUser(local, expected), { code: 'NOT_FOUND' });
    fetch.mock.restore();
  }
});

test('missing secrets or invalid instance reject before requests, without credential details', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('must not request'); });
  for (const change of [{ syntheticPassword: '' }, { publishableKey: '' }, { syntheticPassword: 'x'.repeat(1025) },
    { services: { ...local.services, authOrigin: 'https://api.stripe.com' } }])
    await assert.rejects(authenticateStripeSyntheticUser({ ...local, ...change } as typeof local), { code: 'CONFIGURATION_INVALID' });
  assert.equal(calls, 0);
});

test('unavailable services, invalid JSON and rejected passwords produce sanitized errors, no logs or retries', async (t) => {
  const output: unknown[] = [];
  for (const name of ['log', 'error', 'warn'] as const) t.mock.method(console, name, (...args: unknown[]) => { output.push(args); });
  for (const stage of ['login', 'user'] as const) for (const failure of ['throw', 'http', 'json', 'credentials'] as const) {
    let calls = 0;
    const fetch = t.mock.method(globalThis, 'fetch', async () => {
      calls++;
      if (stage === 'user' && calls === 1) return json(session);
      if (failure === 'throw') throw new Error(local.syntheticPassword + session.access_token);
      if (failure === 'json') return new Response(local.publishableKey);
      return json({ error: local.syntheticPassword + session.refresh_token }, failure === 'http' ? 503 : 401);
    });
    await assert.rejects(authenticateStripeSyntheticUser(local), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, failure === 'credentials' ? 'NOT_FOUND' : 'INFRASTRUCTURE_UNAVAILABLE');
      assert.equal('cause' in error, false);
      return true;
    });
    assert.equal(calls, stage === 'user' ? 2 : 1);
    fetch.mock.restore();
  }
  assert.deepEqual(output, []);
});

test('revalidation performs a new password login and rejects a changed subject', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof globalThis.fetch>[0]) => {
    calls++;
    const id = calls > 2 ? otherId : subjectId;
    return String(url).includes('/token?') ? json({ ...session, user: { ...session.user, id } }) : json({ id });
  });
  const actor = await authenticateStripeSyntheticUser(local);
  await assert.rejects(authenticateStripeSyntheticUser(local, actor.subjectId), { code: 'NOT_FOUND' });
  assert.equal(calls, 4);
});
