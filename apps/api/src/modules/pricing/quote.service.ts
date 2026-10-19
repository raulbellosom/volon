import { parseDeliveryQuoteRequest, type QuotePoint, type DeliveryQuoteRequest, type DeliveryQuoteResponse } from '@delivery/contracts';
import type { RouteSnapshot } from './route-snapshot.ts';
import { calculateDeliveryQuote, type DeliveryRatePolicy } from '@delivery/pricing';

export class QuoteFailure extends Error {
  readonly code: 'ACCESS_DENIED' | 'OUTSIDE_COVERAGE' | 'ROUTING_UNAVAILABLE';

  constructor(code: QuoteFailure['code']) {
    super(code);
    this.code = code;
  }
}

/** Trusted server context; never constructed from request JSON or unverified headers. */
export interface QuoteActor {
  readonly subjectId: string;
}

export interface StoredQuote {
  readonly subjectId: string;
  readonly branchId: string;
  readonly request: RouteSnapshot;
  readonly response: DeliveryQuoteResponse;
  readonly rateVersion: string;
}

export interface QuoteDependencies {
  /** Verify current membership, permission and enabled branch; fail closed. */
  readonly canQuote: (actor: QuoteActor, branchId: string) => Promise<boolean>;
  /** Resolve branch pickup, coverage and route server-side. No client distance/rate. */
  readonly resolveRoute: (request: DeliveryQuoteRequest, actor: QuoteActor) => Promise<{
    readonly eligible: boolean;
    readonly distanceMeters: number;
    readonly policy: DeliveryRatePolicy;
    readonly rateVersion: string;
    readonly trustedPickup?: QuotePoint;
  }>;
  /** Must confirm storage before success; production needs durable scoped storage. */
  readonly saveQuote: (quote: StoredQuote) => Promise<void>;
  readonly now: () => Date;
  readonly newQuoteId: () => string;
  readonly ttlMilliseconds: number;
}

export function createQuoteService(dependencies: QuoteDependencies) {
  const { ttlMilliseconds } = dependencies;
  if (!Number.isSafeInteger(ttlMilliseconds) || ttlMilliseconds <= 0) {
    throw new RangeError('Invalid quote TTL');
  }

  return async (actor: QuoteActor, request: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse> => {
    request = parseDeliveryQuoteRequest(request);
    if (!await dependencies.canQuote(actor, request.branchId)) throw new QuoteFailure('ACCESS_DENIED');
    const route = await dependencies.resolveRoute(request, actor);
    if (!route.eligible) throw new QuoteFailure('OUTSIDE_COVERAGE');
    if (request.destination && !route.trustedPickup) throw new QuoteFailure('ROUTING_UNAVAILABLE');
    const snapshot: RouteSnapshot = route.trustedPickup
      ? Object.freeze({ ...request, pickup: Object.freeze({ ...route.trustedPickup }), pickupOrigin: 'branch_record' })
      : request;
    if (route.distanceMeters > route.policy.maximumRouteMeters) throw new QuoteFailure('OUTSIDE_COVERAGE');
    const result = calculateDeliveryQuote({ policy: route.policy, routeDistanceMeters: route.distanceMeters });
    const quoteId = dependencies.newQuoteId();
    if (!quoteId || !route.rateVersion) throw new Error('Invalid quote configuration');
    const response: DeliveryQuoteResponse = Object.freeze({
      quoteId,
      expiresAt: new Date(dependencies.now().getTime() + ttlMilliseconds).toISOString(),
      currency: result.logisticsFee.currency,
      amountMinor: result.logisticsFee.amountMinor,
      lines: Object.freeze([
        Object.freeze({ code: 'base_delivery' as const, amountMinor: route.policy.baseFeeMinor }),
        Object.freeze({ code: 'distance_delivery' as const,
          amountMinor: result.logisticsFee.amountMinor - route.policy.baseFeeMinor }),
      ]),
      coverage: 'eligible',
    });
    await dependencies.saveQuote(Object.freeze({
      subjectId: actor.subjectId, branchId: request.branchId, request: snapshot, response, rateVersion: route.rateVersion,
    }));
    return response;
  };
}
