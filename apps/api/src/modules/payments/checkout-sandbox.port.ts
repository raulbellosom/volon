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
  startedAt: number;
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
  state: CheckoutTestState;
  readonly events: Map<string, { readonly digest: string; readonly receipt: CheckoutTestObservation }>;
}
export interface CheckoutSandboxReservation {
  readonly token: string;
  version: number;
  readonly fixture: CheckoutSandboxFixture;
}
/** Each method is a short storage operation. No provider callback can enter a transaction. */
export interface CheckoutSandboxStore {
  reserve(actor: PaymentActor, intentId: string, accountId: string): Promise<CheckoutSandboxReservation>;
  save(actor: PaymentActor, reservation: CheckoutSandboxReservation, release: boolean): Promise<void>;
}
export class CheckoutTestFailure extends Error {
  readonly code: 'INVALID_COMMAND' | 'CONFIGURATION_INVALID' | 'NOT_FOUND' | 'IDEMPOTENCY_CONFLICT'
    | 'RETRY_WINDOW_EXPIRED' | 'INVALID_SIGNATURE' | 'EVENT_REJECTED' | 'REPLAY_CONFLICT'
    | 'PROVIDER_REJECTED' | 'RESPONSE_MISMATCH' | 'REQUEST_UNKNOWN' | 'TRANSPORT_DISABLED' | 'INFRASTRUCTURE_UNAVAILABLE'
    | 'REQUEST_BUSY' | 'VERSION_CONFLICT';
  constructor(code: CheckoutTestFailure['code']) { super(code); this.code = code; }
}
