import { ApiError } from '../api/api-error.ts';
import type { AuthApi, DeliveryQuoteResponse, DeliveryResponse, MerchantApi } from '../api/merchant-api.ts';
import { DEMO_DELIVERY_ERRORS, DEMO_EMAILS, demoHistory, demoMe, demoQuote } from './demo-fixtures.ts';

export interface DemoOptions {
  /** Artificial latency so loading states are visible; 0 in tests. */
  latencyMs?: number;
  now?: () => number;
}

/**
 * In-memory stand-in for the backend. Loaded only by `vite --mode demo` in development and
 * by tests; it never authenticates anyone and its data never leaves the browser tab.
 */
export function createDemoApis({ latencyMs = 450, now = Date.now }: DemoOptions = {}): { auth: AuthApi; api: MerchantApi } {
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, latencyMs));
  const quotes = new Map<string, DeliveryQuoteResponse>();
  const deliveries = new Map<string, DeliveryResponse>(demoHistory(now()).map((delivery) => [delivery.deliveryId, delivery]));
  const byIdempotencyKey = new Map<string, DeliveryResponse>();
  let signedInAs = '';
  let sequence = 0;
  let created = 0;

  const auth: AuthApi = {
    async signIn(email) {
      await wait();
      signedInAs = email.trim().toLowerCase();
      return { accessToken: 'demo-token', expiresAt: now() + 3_600_000, email: signedInAs };
    },
  };

  const api: MerchantApi = {
    async getMe() {
      await wait();
      if (signedInAs === DEMO_EMAILS.forbidden) throw new ApiError('forbidden', 403, 'ACCESS_DENIED');
      if (signedInAs === DEMO_EMAILS.noBranches) return { subjectId: demoMe.subjectId, memberships: [] };
      return demoMe;
    },
    async createQuote() {
      await wait();
      sequence += 1;
      const quote = demoQuote(sequence, now());
      quotes.set(quote.quoteId, quote);
      return quote;
    },
    async createDelivery({ branchId, quoteId, idempotencyKey }) {
      await wait();
      const replay = byIdempotencyKey.get(idempotencyKey);
      if (replay) return replay;
      const quote = quotes.get(quoteId);
      if (!quote) throw new ApiError('not-found', 404, 'QUOTE_NOT_FOUND');
      if (Date.parse(quote.expiresAt) <= now()) throw new ApiError('quote-expired', 409, 'QUOTE_EXPIRED');
      const delivery: DeliveryResponse = {
        deliveryId: `delivery_demo_${++created}`,
        branchId,
        quoteId,
        status: 'requested',
        version: 1,
        createdAt: new Date(now()).toISOString(),
        pricing: { amountMinor: quote.amountMinor, currency: 'MXN', lines: quote.lines, rateVersion: 'demo' },
      };
      deliveries.set(delivery.deliveryId, delivery);
      byIdempotencyKey.set(idempotencyKey, delivery);
      return delivery;
    },
    async getDelivery(deliveryId) {
      await wait();
      if (deliveryId === DEMO_DELIVERY_ERRORS.forbidden) throw new ApiError('forbidden', 403, 'ACCESS_DENIED');
      if (deliveryId === DEMO_DELIVERY_ERRORS.unavailable) throw new ApiError('unavailable', 503, 'SERVICE_UNAVAILABLE');
      const delivery = deliveries.get(deliveryId);
      if (!delivery) throw new ApiError('not-found', 404, 'NOT_FOUND');
      return delivery;
    },
    async listDeliveries({ branchId, limit, cursor }) {
      await wait();
      // Same shape as the API: newest first and an opaque cursor (here, the next offset).
      const rows = [...deliveries.values()]
        .filter((delivery) => delivery.branchId === branchId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.deliveryId.localeCompare(a.deliveryId));
      const offset = cursor ? Number(cursor.slice(1)) : 0;
      if (!Number.isSafeInteger(offset) || offset < 0) throw new ApiError('invalid', 422, 'INVALID_DELIVERY_HISTORY_QUERY');
      const items = rows.slice(offset, offset + limit);
      const next = offset + limit;
      return { items, nextCursor: items.length > 0 && next < rows.length ? `o${next}` : null };
    },
  };

  return { auth, api };
}
