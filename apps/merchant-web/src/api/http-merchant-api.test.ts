import { afterEach, describe, expect, it, vi } from 'vitest';
import { locationSource } from '../geo/location-source.ts';
import { ApiError } from './api-error.ts';
import { createHttpAuthApi, createHttpMerchantApi } from './http-merchant-api.ts';

const problem = (status: number, code: string) =>
  new Response(JSON.stringify({ type: 'about:blank', title: 'x', status, code }), { status, headers: { 'content-type': 'application/problem+json' } });

function mockFetch(response: Response | Error) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
}

afterEach(() => vi.restoreAllMocks());

describe('HTTP adapter', () => {
  it('sends the bearer token and the idempotency key', async () => {
    const fetch = mockFetch(Response.json({
      deliveryId: 'd1', branchId: 'b1', quoteId: 'q1', status: 'requested', version: 1, createdAt: '2026-10-18T20:00:00Z',
      pricing: { amountMinor: 100, currency: 'MXN', lines: [
        { code: 'base_delivery', amountMinor: 100 },
        { code: 'distance_delivery', amountMinor: 0 },
      ], rateVersion: 'r1' },
    }, { status: 201 }));
    const api = createHttpMerchantApi(() => 'token-1');
    await api.createDelivery({ branchId: 'b1', quoteId: 'q1', idempotencyKey: 'key-1' });

    const [path, init] = fetch.mock.calls[0]!;
    expect(path).toBe('/v1/deliveries');
    expect(init?.headers).toMatchObject({ authorization: 'Bearer token-1', 'idempotency-key': 'key-1' });
    expect(JSON.parse(String(init?.body))).toEqual({ branchId: 'b1', quoteId: 'q1' });
  });

  it.each([
    [401, 'UNAUTHENTICATED', 'unauthenticated'],
    [403, 'ACCESS_DENIED', 'forbidden'],
    [404, 'NOT_FOUND', 'not-found'],
    [409, 'QUOTE_EXPIRED', 'quote-expired'],
    [409, 'QUOTE_ALREADY_USED', 'conflict'],
    [422, 'OUTSIDE_COVERAGE', 'invalid'],
    [503, 'SERVICE_UNAVAILABLE', 'unavailable'],
  ])('maps %i %s to %s', async (status, code, kind) => {
    mockFetch(problem(status, code));
    await expect(createHttpMerchantApi(() => 't').getDelivery('d1')).rejects.toMatchObject({ kind, status, code });
  });

  it('reports a network failure as offline', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    await expect(createHttpMerchantApi(() => 't').getMe()).rejects.toMatchObject({ kind: 'offline' });
  });

  it('refuses to call the API without a token', async () => {
    const fetch = mockFetch(Response.json({}));
    await expect(createHttpMerchantApi(() => null).getMe()).rejects.toMatchObject({ kind: 'unauthenticated' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects malformed bodies instead of rendering them', async () => {
    mockFetch(Response.json({ quoteId: 'q1', amountMinor: 12.5, currency: 'MXN', lines: [], coverage: 'eligible', expiresAt: 'x' }, { status: 201 }));
    const request = { branchId: 'b1', pickup: { lat: 0, lng: 0 }, dropoff: { lat: 0, lng: 0 }, serviceType: 'local_delivery' as const };
    await expect(createHttpMerchantApi(() => 't').createQuote(request)).rejects.toMatchObject({ kind: 'unexpected', code: 'MALFORMED_RESPONSE' });
  });

  it('turns rejected credentials into a sign-in error', async () => {
    mockFetch(new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }));
    const failure = await createHttpAuthApi().signIn('a@demo.test', 'x').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ kind: 'unauthenticated', code: 'INVALID_CREDENTIALS' });
  });
});

describe('location source', () => {
  it('only exists in development builds', () => {
    expect(locationSource(true)?.kind).toBe('synthetic');
    expect(locationSource(false)).toBeNull();
  });
});
