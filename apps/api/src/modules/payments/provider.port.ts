/** Future contract only. No implementation, caller, credentials or monetary operation. */
export type ProviderPaymentState = 'pending' | 'unknown' | 'rejected' | 'authorized'
  | 'capture_pending' | 'captured' | 'reversed' | 'refunded' | 'disputed';
export interface ProviderScope { readonly provider: string; readonly accountId: string }
export type ProviderSubmission =
  | { readonly state: 'unknown'; readonly paymentId: string | null }
  | { readonly state: Exclude<ProviderPaymentState, 'unknown'>; readonly paymentId: string };
export interface VerifiedProviderEvidence {
  readonly scope: ProviderScope;
  readonly eventId: string;
  readonly paymentId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly state: ProviderPaymentState;
  readonly source: 'webhook' | 'provider_query' | 'reconciliation';
  readonly occurredAt: string;
  readonly receivedAt: string;
  readonly verifiedAt: string;
  readonly payloadDigest: string;
  readonly verification: { readonly method: 'cryptographic_webhook' | 'authenticated_query'; readonly keyRef: string };
}
export interface PaymentProviderPort {
  /** Server-owned amount from persisted intent; never a client-supplied amount. Timeout must be unknown. */
  readonly submit: (command: { readonly intentId: string; readonly deliveryId: string; readonly amountMinor: number;
    readonly currency: string; readonly idempotencyKey: string }) => Promise<ProviderSubmission>;
  /** Authenticate original bytes before trusting JSON. Scope is server-owned; account must match evidence. */
  readonly verify: (scope: ProviderScope, rawBody: Uint8Array, headers: Readonly<Record<string, string>>)
    => Promise<VerifiedProviderEvidence | { readonly rejected: true }>;
  /** Authenticated provider query. Not equivalent to a browser redirect or client response. */
  readonly reconcile: (scope: ProviderScope, paymentId: string) => Promise<VerifiedProviderEvidence>;
}
