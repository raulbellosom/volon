import type { PaymentActor } from './payment.contract.ts';

/** Deliberately incompatible with operational VerifiedProviderEvidence. */
export type CheckoutTestState = 'pending' | 'unknown' | 'failed' | 'capture_pending'
  | 'captured_test' | 'expired' | 'refunded' | 'disputed';
export interface CheckoutTestObservation {
  readonly scope: 'offline-test';
  readonly intentId: string;
  readonly sessionId: string | null;
  readonly state: CheckoutTestState;
  readonly eligible: false;
  readonly duplicate: boolean;
}
export interface SandboxCheckoutPort {
  create(actor: PaymentActor, request: unknown): Promise<CheckoutTestObservation>;
  reconcile(actor: PaymentActor, request: unknown): Promise<CheckoutTestObservation>;
  observe(actor: PaymentActor, request: unknown, body: Uint8Array, signature: string): Promise<CheckoutTestObservation>;
}
export interface SandboxSubmission {
  readonly key: string;
  readonly hash: string;
  readonly startedAt: number;
  sessionId: string | null;
  paymentId: string | null;
  chargeId: string | null;
}
export interface CheckoutSandboxFixture {
  readonly purpose: 'isolated-payment-fixture';
  readonly intentId: string;
  readonly amountMinor: number;
  readonly currency: 'MXN';
  submission: SandboxSubmission | null;
  adverse: 'refunded' | 'disputed' | null;
  readonly events: Map<string, { readonly digest: string; readonly receipt: CheckoutTestObservation }>;
}
/** Must reauthorize on every call, serialize by fixture and enforce global external-ID/event uniqueness.
 * Concrete stores exist ONLY in tests.
 * Future SQL persistence requires a reservation/lease protocol, not network under DB locks. */
export interface CheckoutSandboxStore {
  run<T>(actor: PaymentActor, intentId: string, work: (fixture: CheckoutSandboxFixture) => Promise<T>): Promise<T>;
}
export class CheckoutTestFailure extends Error {
  readonly code: 'INVALID_COMMAND' | 'CONFIGURATION_INVALID' | 'NOT_FOUND' | 'IDEMPOTENCY_CONFLICT'
    | 'RETRY_WINDOW_EXPIRED' | 'INVALID_SIGNATURE' | 'EVENT_REJECTED' | 'REPLAY_CONFLICT'
    | 'PROVIDER_REJECTED' | 'RESPONSE_MISMATCH' | 'REQUEST_UNKNOWN' | 'TRANSPORT_DISABLED' | 'INFRASTRUCTURE_UNAVAILABLE';
  constructor(code: CheckoutTestFailure['code']) { super(code); this.code = code; }
}
