import type { DeliveryQuoteRequest, QuotePoint } from '@delivery/contracts';
import { QuoteFailure, type QuoteActor } from '../pricing/quote.service.ts';

/** Spatial policy is server-owned and separate from a commercial rate. */
export interface RoadCoverageInspection {
  readonly trustedPickup: QuotePoint;
  readonly pickupMatches: boolean;
  readonly pickupCovered: boolean;
  readonly dropoffCovered: boolean;
}

export interface RoadLeg {
  readonly source: 'road-network';
  readonly provider: string;
  readonly distanceMeters: number;
  /** Routing-model estimate only; not a promised delivery ETA. */
  readonly estimatedDurationSeconds: number;
}

export interface RoadEligibilityDependencies {
  readonly canQuote: (actor: QuoteActor, branchId: string) => Promise<boolean>;
  readonly inspectCoverage: (request: DeliveryQuoteRequest, actor: QuoteActor) =>
    Promise<RoadCoverageInspection>;
  readonly resolveRoadRoute: (pickup: QuotePoint, dropoff: QuotePoint) => Promise<RoadLeg>;
  readonly maximumRouteMeters: number;
  readonly coverageVersion: string;
}

export interface RoadEligibilityResult {
  readonly route: RoadLeg;
  readonly coverageVersion: string;
}

/**
 * Readiness check, NOT a commercial quote. Connecting pricing requires
 * approval of real tariffs, routing supplier and pilot zone (DEC-04/07/09).
 */
export function createRoadEligibilityService(dependencies: RoadEligibilityDependencies) {
  const { maximumRouteMeters, coverageVersion } = dependencies;
  if (!Number.isSafeInteger(maximumRouteMeters) || maximumRouteMeters < 1
    || !/^[A-Za-z0-9_-]{1,64}$/.test(coverageVersion)) {
    throw new RangeError('Invalid road coverage policy');
  }

  return async (actor: QuoteActor, request: DeliveryQuoteRequest): Promise<RoadEligibilityResult> => {
    if (!await dependencies.canQuote(actor, request.branchId)) throw new QuoteFailure('ACCESS_DENIED');

    let inspection: RoadCoverageInspection;
    try {
      inspection = await dependencies.inspectCoverage(request, actor);
    } catch (error) {
      if (error instanceof QuoteFailure && error.code === 'ACCESS_DENIED') throw error;
      throw new QuoteFailure('ROUTING_UNAVAILABLE');
    }
    if (!inspection.pickupMatches || !inspection.pickupCovered || !inspection.dropoffCovered) {
      throw new QuoteFailure('OUTSIDE_COVERAGE');
    }

    let route: RoadLeg;
    try {
      route = await dependencies.resolveRoadRoute(inspection.trustedPickup, request.dropoff);
    } catch {
      // No-route is not proof of being outside the geofence. Never fallback to a straight line.
      throw new QuoteFailure('ROUTING_UNAVAILABLE');
    }
    if (route.source !== 'road-network' || typeof route.provider !== 'string'
      || !/^[a-z0-9_-]{1,32}$/.test(route.provider)
      || !Number.isSafeInteger(route.distanceMeters) || route.distanceMeters < 0
      || !Number.isSafeInteger(route.estimatedDurationSeconds)
      || route.estimatedDurationSeconds < 0) {
      throw new QuoteFailure('ROUTING_UNAVAILABLE');
    }
    if (route.distanceMeters > maximumRouteMeters) throw new QuoteFailure('OUTSIDE_COVERAGE');

    return Object.freeze({
      route: Object.freeze({ ...route }),
      coverageVersion,
    });
  };
}
