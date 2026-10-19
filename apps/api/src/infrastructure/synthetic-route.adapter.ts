import type { PrismaClient } from '@prisma/client';
import type { DeliveryQuoteRequest } from '@delivery/contracts';
import { withSubject } from './database.ts';
import { QuoteFailure, type QuoteActor } from '../modules/pricing/quote.service.ts';

// Deliberately not a road-routing provider. Only zero-origin synthetic fixtures.
const policy = Object.freeze({ baseFeeMinor: 3000, includedDistanceMeters: 2000,
  additionalFeePerStartedKmMinor: 700, maximumRouteMeters: 8000 });

export function createSyntheticRouteAdapter(db: PrismaClient) {
  return (request: DeliveryQuoteRequest, actor: QuoteActor) => withSubject(db, actor, async (tx) => {
    const branch = await tx.branch.findUnique({ where: { id: request.branchId } });
    if (!branch) throw new QuoteFailure('ACCESS_DENIED');
    const [route] = await tx.$queryRaw<{ distance: number; pickupMatches: boolean; synthetic: boolean }[]>`
      SELECT ceil(extensions.ST_Distance(
        extensions.ST_SetSRID(extensions.ST_MakePoint(${branch.longitude}, ${branch.latitude}), 4326)::extensions.geography,
        extensions.ST_SetSRID(extensions.ST_MakePoint(${request.dropoff.lng}, ${request.dropoff.lat}), 4326)::extensions.geography
      ))::float8 AS distance,
      extensions.ST_DWithin(
        extensions.ST_SetSRID(extensions.ST_MakePoint(${branch.longitude}, ${branch.latitude}), 4326)::extensions.geography,
        extensions.ST_SetSRID(extensions.ST_MakePoint(${request.pickup.lng}, ${request.pickup.lat}), 4326)::extensions.geography,
        1
      ) AS "pickupMatches", ${branch.latitude === 0 && branch.longitude === 0} AS synthetic`;
    if (!route) throw new Error('No spatial result');
    return { eligible: route.pickupMatches && route.synthetic && route.distance <= policy.maximumRouteMeters,
      distanceMeters: route.distance, policy, rateVersion: 'synthetic-geodesic-v1',
      trustedPickup: { lat: branch.latitude, lng: branch.longitude } };
  });
}
