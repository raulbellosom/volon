import type { CourierIdentity, OfferInbox, ShiftStatus } from '../domain/courier.ts';
import type { ActiveDelivery, WorkflowStage } from '../domain/workflow.ts';

/** What the screen should do about a failed command. */
export type GatewayErrorKind =
  | 'offline'
  /** The offer passed its server expiry. */
  | 'offer-expired'
  /** Someone else changed it first (offer taken or withdrawn, step already moved). */
  | 'conflict'
  | 'not-found'
  | 'unavailable';

export class GatewayError extends Error {
  readonly kind: GatewayErrorKind;

  constructor(kind: GatewayErrorKind) {
    super(kind);
    this.name = 'GatewayError';
    this.kind = kind;
  }
}

/**
 * Port the courier screens depend on. Today only the synthetic adapter implements it; the
 * methods mirror the backend contract a courier API would need (see the app README). Every
 * command takes an idempotency key: a retried press resolves to the same outcome.
 */
export interface CourierGateway {
  readonly mode: 'demo';
  signIn(): Promise<CourierIdentity>;
  setAvailability(available: boolean): Promise<ShiftStatus>;
  listOffers(): Promise<OfferInbox>;
  acceptOffer(offerId: string, idempotencyKey: string): Promise<ActiveDelivery>;
  declineOffer(offerId: string, idempotencyKey: string): Promise<void>;
  /** Moves from `from` to the next step; `conflict` if the step already changed. */
  advance(assignmentId: string, from: WorkflowStage, idempotencyKey: string): Promise<ActiveDelivery>;
}
