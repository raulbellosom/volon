/**
 * Courier-side view models for the demo. None of these exist in the backend yet: there is no
 * Courier, CourierShift, AssignmentOffer or Assignment API. Names follow
 * docs/specification/state-machines.md so a future contract can map onto them.
 */

/** Synthetic identity; never a real account. */
export interface CourierIdentity {
  readonly courierId: string;
  readonly displayName: string;
  readonly vehicle: 'motorcycle';
}

/** Proposed CourierShift states. Only simulated here: no presence is reported to any server. */
export type ShiftStatus = 'offline' | 'available' | 'busy';

/** Proposed AssignmentOffer states. */
export type OfferStatus = 'offered' | 'accepted' | 'declined' | 'expired' | 'withdrawn';

export interface OfferStop {
  /** Business name for pickups; for drop-offs a fictitious neighborhood. */
  readonly title: string;
  /** Always fictitious («Calle Ficticia 12»); never geocoded, never a real home. */
  readonly addressLine: string;
  readonly instructions: string | null;
}

export interface CourierOffer {
  readonly offerId: string;
  /** Short reference shown to the courier, e.g. «DEMO-1042». */
  readonly reference: string;
  readonly status: OfferStatus;
  /** Decided by the (simulated) server clock, never by the device. */
  readonly expiresAt: string;
  readonly pickup: OfferStop;
  readonly dropoff: OfferStop;
  /** Artificial package description, e.g. «Bolsa chica». */
  readonly packageNote: string;
}

/** A page of offers plus the simulated server time used to compute countdowns. */
export interface OfferInbox {
  readonly serverTime: string;
  readonly offers: readonly CourierOffer[];
}
