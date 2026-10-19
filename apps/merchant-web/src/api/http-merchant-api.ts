import { parseMeResponse } from '@delivery/contracts';
import { ApiError } from './api-error.ts';
import { requestJson } from './http-client.ts';
import type { AuthApi, MerchantApi, Session } from './merchant-api.ts';
import { readDelivery, readHistory, readLocations, readPickup, readQuote } from './response-guards.ts';

function parsed<T>(parse: (value: unknown) => T, value: unknown): T {
  try {
    return parse(value);
  } catch {
    throw new ApiError('unexpected', null, 'MALFORMED_RESPONSE');
  }
}

/** Calls the API through the same-origin `/v1` path (proxied in development). */
export function createHttpMerchantApi(getToken: () => string | null): MerchantApi {
  const authorized = (): Record<string, string> => {
    const token = getToken();
    if (!token) throw new ApiError('unauthenticated');
    return { authorization: `Bearer ${token}` };
  };
  return {
    getMe: async () => parsed(parseMeResponse, await requestJson('/v1/me', { headers: authorized() })),
    createQuote: async (request) =>
      readQuote(await requestJson('/v1/delivery-quotes', { method: 'POST', body: request, headers: authorized() })),
    createDelivery: async ({ branchId, quoteId, idempotencyKey }) =>
      readDelivery(await requestJson('/v1/deliveries', {
        method: 'POST',
        body: { branchId, quoteId },
        headers: { ...authorized(), 'idempotency-key': idempotencyKey },
      })),
    getDelivery: async (deliveryId) =>
      readDelivery(await requestJson(`/v1/deliveries/${encodeURIComponent(deliveryId)}`, { headers: authorized() })),
    listDeliveries: async ({ branchId, limit, cursor }) => {
      const params = new URLSearchParams({ branchId, limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      return readHistory(await requestJson(`/v1/deliveries?${params}`, { headers: authorized() }), branchId);
    },
    getPickupLocation: async (branchId) =>
      readPickup(await requestJson(`/v1/branches/${encodeURIComponent(branchId)}/pickup-location`, { headers: authorized() }), branchId),
    getQuoteLocations: async (quoteId) =>
      readLocations(await requestJson(`/v1/delivery-quotes/${encodeURIComponent(quoteId)}/locations`, { headers: authorized() })),
    getDeliveryLocations: async (deliveryId) =>
      readLocations(await requestJson(`/v1/deliveries/${encodeURIComponent(deliveryId)}/locations`, { headers: authorized() })),
  };
}

/**
 * Supabase Auth password grant through the same-origin `/auth/v1` path. In development the
 * Vite proxy adds the publishable key; a deployed build needs its own gateway (pending).
 */
export function createHttpAuthApi(): AuthApi {
  return {
    async signIn(email, password): Promise<Session> {
      let body: unknown;
      try {
        body = await requestJson('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
      } catch (error) {
        // GoTrue answers bad credentials with 400; show them as a sign-in problem, not a form bug.
        if (error instanceof ApiError && error.kind === 'invalid') throw new ApiError('unauthenticated', error.status, 'INVALID_CREDENTIALS');
        throw error;
      }
      if (typeof body !== 'object' || body === null || !('access_token' in body) || typeof body.access_token !== 'string') {
        throw new ApiError('unexpected', null, 'MALFORMED_RESPONSE');
      }
      const seconds = 'expires_in' in body && typeof body.expires_in === 'number' ? body.expires_in : 3600;
      return { accessToken: body.access_token, expiresAt: Date.now() + seconds * 1000, email };
    },
  };
}
