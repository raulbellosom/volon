import { AccountError } from '../../ports/courier-account.ts';
import { createLocalCourierApi } from './local-courier-api.ts';

const CONFIG = { authUrl: 'http://127.0.0.1:56321', apiUrl: 'http://127.0.0.1:3100', publishableKey: 'sb_publishable_placeholder_for_tests_only' };
const NOW = Date.parse('2026-10-19T15:00:00.000Z');
const SESSION = { accessToken: 'token-1', expiresAt: NOW + 60_000 };
const ME = { courierId: 'courier_a', availability: { status: 'offline', version: 3, changedAt: '2026-10-19T14:59:00.000Z' } };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const problem = (status: number, code: string) => json({ type: 'about:blank', title: 'x', status, code }, status);

function setup(reply: (url: string, init: RequestInit) => Promise<Response> | Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return reply(url, init);
  }) as unknown as typeof fetch;
  return { api: createLocalCourierApi(CONFIG, { fetchImpl, now: () => NOW, timeoutMs: 50 }), calls };
}

const kindOf = (promise: Promise<unknown>) => promise.then(() => 'ok', (error: unknown) => (error instanceof AccountError ? error.kind : String(error)));

describe('local courier HTTP adapter', () => {
  it('signs in with the publishable key and keeps only the token and its expiry', async () => {
    const { api, calls } = setup(() => json({ access_token: 'jwt', expires_in: 600, refresh_token: 'r', user: { id: 'u' } }));
    expect(await api.signIn('courier@example.test', 'pw')).toEqual({ accessToken: 'jwt', expiresAt: NOW + 600_000 });
    expect(calls[0]!.url).toBe('http://127.0.0.1:56321/auth/v1/token?grant_type=password');
    expect(calls[0]!.init.headers).toMatchObject({ apikey: CONFIG.publishableKey });
    expect(calls[0]!.url).not.toContain('pw');
  });

  it('maps rejected credentials to invalid-credentials', async () => {
    const { api } = setup(() => json({ error: 'invalid_grant' }, 400));
    expect(await kindOf(api.signIn('x@example.test', 'bad'))).toBe('invalid-credentials');
  });

  it('reads the profile with the bearer and validates it with the shared contract', async () => {
    const { api, calls } = setup(() => json(ME));
    expect(await api.getMe(SESSION)).toEqual(ME);
    expect(calls[0]!.url).toBe('http://127.0.0.1:3100/v1/couriers/me');
    expect(calls[0]!.init.headers).toMatchObject({ authorization: 'Bearer token-1' });
  });

  it('sends status, expectedVersion and the idempotency key', async () => {
    const { api, calls } = setup(() => json({ ...ME, availability: { ...ME.availability, status: 'available', version: 4 } }));
    const result = await api.setAvailability(SESSION, { status: 'available', expectedVersion: 3 }, 'key-1');
    expect(result.availability.version).toBe(4);
    expect(calls[0]!.init.method).toBe('POST');
    expect(calls[0]!.init.headers).toMatchObject({ 'idempotency-key': 'key-1', 'content-type': 'application/json' });
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ status: 'available', expectedVersion: 3 });
  });

  it('refuses a request the contract would reject, before sending it', async () => {
    const { api, calls } = setup(() => json(ME));
    await expect(api.setAvailability(SESSION, { status: 'busy' as never, expectedVersion: 3 }, 'k')).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  it.each([
    [401, 'UNAUTHENTICATED', 'unauthenticated'],
    [404, 'NOT_FOUND', 'not-enabled'],
    [409, 'VERSION_CONFLICT', 'version-conflict'],
    [409, 'IDEMPOTENCY_CONFLICT', 'idempotency-conflict'],
    [422, 'INVALID_COURIER_REQUEST', 'invalid'],
    [503, 'SERVICE_UNAVAILABLE', 'unavailable'],
  ])('maps %i %s to %s', async (status, code, kind) => {
    const { api } = setup(() => problem(status, code));
    expect(await kindOf(api.setAvailability(SESSION, { status: 'available', expectedVersion: 3 }, 'k'))).toBe(kind);
  });

  it('rejects a malformed or extended profile instead of rendering it', async () => {
    const { api } = setup(() => json({ ...ME, displayName: 'not allowed' }));
    expect(await kindOf(api.getMe(SESSION))).toBe('unexpected');
  });

  it('reports a network failure as offline and a slow server as timeout', async () => {
    expect(await kindOf(setup(() => Promise.reject(new TypeError('Network request failed'))).api.getMe(SESSION))).toBe('offline');
    const slow = setup((_url, init) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    expect(await kindOf(slow.api.getMe(SESSION))).toBe('timeout');
  });

  it('does not call the API with an expired session', async () => {
    const { api, calls } = setup(() => json(ME));
    expect(await kindOf(api.getMe({ accessToken: 't', expiresAt: NOW - 1 }))).toBe('unauthenticated');
    expect(calls).toHaveLength(0);
  });
});
