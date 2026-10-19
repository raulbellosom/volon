import type {
  BranchSummary,
  DeliveryHistoryQuery,
  DeliveryHistoryResponse,
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
  DeliveryResponse,
  MeResponse,
} from '@delivery/contracts';

export type { BranchSummary, DeliveryHistoryQuery, DeliveryHistoryResponse, DeliveryQuoteResponse, DeliveryResponse, MeResponse };

/** Bearer session issued by the identity provider (Supabase Auth). */
export interface Session {
  readonly accessToken: string;
  /** Epoch milliseconds; the app signs out once it passes. */
  readonly expiresAt: number;
  readonly email: string;
}

export interface AuthApi {
  signIn(email: string, password: string): Promise<Session>;
}

/**
 * Operations the merchant panel needs, one per existing endpoint on `main`.
 * Screens depend on this port, never on `fetch`, so the demo adapter can stand in locally.
 */
export interface MerchantApi {
  getMe(): Promise<MeResponse>;
  createQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse>;
  createDelivery(input: { branchId: string; quoteId: string; idempotencyKey: string }): Promise<DeliveryResponse>;
  getDelivery(deliveryId: string): Promise<DeliveryResponse>;
  /** One page of a branch's deliveries, newest first; `nextCursor` is `null` on the last page. */
  listDeliveries(query: DeliveryHistoryQuery): Promise<DeliveryHistoryResponse>;
}

/** How the app is wired: the real backend, or synthetic fixtures for local design work. */
export type ApiMode = 'http' | 'demo';
