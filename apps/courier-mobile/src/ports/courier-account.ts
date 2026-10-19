import type { CourierAvailabilityRequest, CourierMeResponse } from '@delivery/contracts';

export type { CourierAvailabilityRequest, CourierAvailabilityStatus, CourierMeResponse } from '@delivery/contracts';

/** Bearer session kept in memory only; it dies with the app process. */
export interface CourierSession {
  readonly accessToken: string;
  /** Epoch ms; the app treats the session as expired from then on. */
  readonly expiresAt: number;
}

/** What the screen should do about a failed request. */
export type AccountErrorKind =
  | 'invalid-credentials'
  | 'unauthenticated'
  /** 404 on the courier profile: not provisioned, disabled or revoked. */
  | 'not-enabled'
  | 'version-conflict'
  | 'idempotency-conflict'
  | 'invalid'
  | 'offline'
  | 'timeout'
  | 'unavailable'
  | 'unexpected';

export class AccountError extends Error {
  readonly kind: AccountErrorKind;
  readonly status: number | null;

  constructor(kind: AccountErrorKind, status: number | null = null) {
    super(kind);
    this.name = 'AccountError';
    this.kind = kind;
    this.status = status;
  }
}

/** Failures whose outcome is unknown: the same command may be retried with the same key. */
export const isRetryable = (kind: AccountErrorKind): boolean => kind === 'offline' || kind === 'timeout' || kind === 'unavailable';

/**
 * Courier identity and availability, the only real courier capability today (issue #16).
 * Offers, assignments and delivery steps are deliberately absent from this port.
 */
export interface CourierAccountApi {
  signIn(email: string, password: string): Promise<CourierSession>;
  getMe(session: CourierSession): Promise<CourierMeResponse>;
  setAvailability(session: CourierSession, request: CourierAvailabilityRequest, idempotencyKey: string): Promise<CourierMeResponse>;
}
