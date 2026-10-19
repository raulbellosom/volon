import type { CourierOffer, ShiftStatus } from '../../domain/courier.ts';
import { nextStage, type ActiveDelivery, type WorkflowStage } from '../../domain/workflow.ts';
import { GatewayError, type CourierGateway, type GatewayErrorKind } from '../../ports/courier-gateway.ts';
import { CONTESTED_OFFER_ID, DEMO_COURIER, seedOffers } from './fixtures.ts';

export interface SyntheticOptions {
  /** Simulated server clock in ms; tests pass a fixed one. */
  now?: () => number;
  /** Artificial latency so pending states are visible; 0 in tests. */
  latencyMs?: number;
}

/** Knobs the demo screen uses to show failure states on purpose. */
export interface DemoControls {
  setOffline(offline: boolean): void;
  isOffline(): boolean;
  /** The next command fails once with this kind. */
  failNext(kind: GatewayErrorKind): void;
  /** Back to the initial offers, shift and no active delivery. */
  reset(): void;
}

/**
 * In-memory courier backend for the demo. It never calls the network and never touches real
 * Delivery records. Commands are idempotent per key, like the future API must be.
 */
export function createSyntheticGateway({ now = Date.now, latencyMs = 500 }: SyntheticOptions = {}): { gateway: CourierGateway; controls: DemoControls } {
  let offers: CourierOffer[] = seedOffers(now());
  let shift: ShiftStatus = 'offline';
  let active: ActiveDelivery | null = null;
  let offline = false;
  let pendingFailure: GatewayErrorKind | null = null;
  const replies = new Map<string, unknown>();

  async function call<T>(work: () => T): Promise<T> {
    await new Promise<void>((resolve) => setTimeout(resolve, latencyMs));
    if (offline) throw new GatewayError('offline');
    if (pendingFailure) {
      const kind = pendingFailure;
      pendingFailure = null;
      throw new GatewayError(kind);
    }
    return work();
  }

  /** Same key, same answer: a double press or a retry never runs the command twice. */
  function once<T>(key: string, work: () => T): T {
    if (replies.has(key)) return replies.get(key) as T;
    const result = work();
    replies.set(key, result);
    return result;
  }

  const stamp = () => new Date(now()).toISOString();
  const findOffer = (offerId: string) => {
    const offer = offers.find((item) => item.offerId === offerId);
    if (!offer) throw new GatewayError('not-found');
    return offer;
  };
  const setOfferStatus = (offerId: string, status: CourierOffer['status']) => {
    offers = offers.map((item) => (item.offerId === offerId ? { ...item, status } : item));
  };

  const gateway: CourierGateway = {
    mode: 'demo',
    signIn: () => call(() => DEMO_COURIER),
    setAvailability: (available) => call(() => {
      shift = active && active.stage !== 'delivered' ? 'busy' : available ? 'available' : 'offline';
      return shift;
    }),
    listOffers: () => call(() => ({
      serverTime: stamp(),
      offers: shift === 'available' ? offers.filter((offer) => offer.status === 'offered') : [],
    })),
    acceptOffer: (offerId, key) => call(() => once(key, () => {
      const offer = findOffer(offerId);
      if (offer.status !== 'offered') throw new GatewayError('conflict');
      if (Date.parse(offer.expiresAt) <= now()) {
        setOfferStatus(offerId, 'expired');
        throw new GatewayError('offer-expired');
      }
      if (offerId === CONTESTED_OFFER_ID || shift !== 'available') {
        setOfferStatus(offerId, 'withdrawn');
        throw new GatewayError('conflict');
      }
      setOfferStatus(offerId, 'accepted');
      shift = 'busy';
      active = { assignmentId: `assignment_${offerId}`, offer: { ...offer, status: 'accepted' }, stage: 'accepted', updatedAt: stamp() };
      return active;
    })),
    declineOffer: (offerId, key) => call(() => once(key, () => {
      if (findOffer(offerId).status !== 'offered') throw new GatewayError('conflict');
      setOfferStatus(offerId, 'declined');
    })),
    advance: (assignmentId, from: WorkflowStage, key) => call(() => once(key, () => {
      if (!active || active.assignmentId !== assignmentId) throw new GatewayError('not-found');
      const next = nextStage(from);
      if (active.stage !== from || !next) throw new GatewayError('conflict');
      active = { ...active, stage: next, updatedAt: stamp() };
      if (next === 'delivered') shift = 'available';
      return active;
    })),
  };

  const controls: DemoControls = {
    setOffline: (value) => { offline = value; },
    isOffline: () => offline,
    failNext: (kind) => { pendingFailure = kind; },
    reset: () => {
      offers = seedOffers(now());
      shift = 'offline';
      active = null;
      pendingFailure = null;
      offline = false;
      replies.clear();
    },
  };

  return { gateway, controls };
}
