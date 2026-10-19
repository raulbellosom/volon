import type {
  BranchSummary,
  DeliveryDestination,
  DeliveryHistoryQuery,
  DeliveryHistoryResponse,
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
  DeliveryLocationsResponse,
  DeliveryResponse,
  MeResponse,
  PickupLocationResponse,
} from '@delivery/contracts';

export type { BranchSummary, DeliveryDestination, DeliveryQuoteRequest, DeliveryLocationsResponse, PickupLocationResponse, DeliveryHistoryQuery, DeliveryHistoryResponse, DeliveryQuoteResponse, DeliveryResponse, MeResponse };

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
  getDeliveryByReference(reference: string): Promise<DeliveryResponse>;
  /** One page of a branch's deliveries, newest first; `nextCursor` is `null` on the last page. */
  listDeliveries(query: DeliveryHistoryQuery): Promise<DeliveryHistoryResponse>;
  /** Branch pickup coordinates from its record (not geocoded, never a street address). */
  getPickupLocation(branchId: string): Promise<PickupLocationResponse>;
  /** Locations the server stored with a quote or a delivery; the source of truth to show. */
  getQuoteLocations(quoteId: string): Promise<DeliveryLocationsResponse>;
  getDeliveryLocations(deliveryId: string): Promise<DeliveryLocationsResponse>;
}

/** How the app is wired: the real backend, or synthetic fixtures for local design work. */
export type ApiMode = 'http' | 'demo';
