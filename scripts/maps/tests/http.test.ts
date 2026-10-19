import assert from 'node:assert/strict';
import test from 'node:test';
import { createEvaluationHttp } from '../http.ts';
import { EvaluationFailure } from '../types.ts';

const url = new URL('https://synthetic.invalid/?key=not-a-real-secret');
test('HTTP: safe errors, body limit, deadline and explicit bounded retry', async () => {
  for (const [fetcher, code] of [
    [async () => Response.json({ secret: 'sensitive' }, { status: 401 }), 'auth'],
    [async () => Response.json({}, { status: 403 }), 'auth'],
    [async () => Response.json({}, { status: 429 }), 'quota'],
    [async () => Response.json({}, { status: 503 }), 'unavailable'],
    [async () => { throw new Error(url.href); }, 'network'],
    [async () => new Response('{'), 'invalid_response'],
    [async () => new Response('a'.repeat(1048577)), 'invalid_response'],
    [async () => new Promise<Response>(() => undefined), 'timeout'],
  ] as const) {
    let calls = 0;
    const http = createEvaluationHttp({ timeoutMs: code === 'timeout' ? 10 : 1000,
      fetcher: async () => { calls++; return fetcher(); } });
    await assert.rejects(http(url), (error: unknown) => error instanceof EvaluationFailure
      && error.code === code && error.attempts === 1 && !/secret|synthetic|sensitive/.test(error.message));
    assert.equal(calls, 1);
  }
  let calls = 0;
  const http = createEvaluationHttp({ retries: 1, maxRequests: 2, fetcher: async () => ++calls === 1
    ? new Response(null, { status: 429, headers: { 'retry-after': '0' } }) : Response.json({ ok: true }) });
  assert.equal((await http(url)).attempts, 2);
  await assert.rejects(http(url), (error: unknown) => error instanceof EvaluationFailure && error.attempts === 0 && error.code === 'quota');
  assert.equal(calls, 2);
});

test('HTTP: no retry for auth, malformed data or Retry-After beyond bounded budget', async () => {
  for (const fetcher of [
    async () => new Response(null, { status: 403 }),
    async () => new Response('{'),
    async () => new Response(null, { status: 429, headers: { 'retry-after': '600' } }),
    async () => new Response(null, { status: 429, headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' } }),
  ]) {
    let calls = 0;
    await assert.rejects(createEvaluationHttp({ retries: 1, fetcher: async () => { calls++; return fetcher(); } })(url));
    assert.equal(calls, 1);
  }
  assert.throws(() => createEvaluationHttp({ fetcher: fetch, retries: 2 }));
  assert.throws(() => createEvaluationHttp({ fetcher: fetch, timeoutMs: 0 }));
});
