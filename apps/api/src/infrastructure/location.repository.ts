import type { PrismaClient } from '@prisma/client';
import type { DeliveryLocationsResponse } from '@delivery/contracts';
import type { LocationStore } from '../modules/locations/location.handler.ts';
import { parseRouteSnapshot } from '../modules/pricing/route-snapshot.ts';
import { withSubject } from './database.ts';

function locations(value: unknown, branchId: string): DeliveryLocationsResponse {
  const route = parseRouteSnapshot(value);
  if (route.branchId !== branchId) throw new Error('Invalid snapshot scope');
  return { branchId: route.branchId,
    pickup: { coordinates: route.pickup, source: route.pickupOrigin ?? 'legacy_input', verification: 'unverified' },
    dropoff: { coordinates: route.dropoff, addressLine: route.destination?.addressLine ?? null,
      instructions: route.destination?.instructions ?? null, source: route.destination?.source ?? 'legacy_input',
      verification: 'unverified' } };
}

export function createLocationRepository(db: PrismaClient): LocationStore {
  return {
    readPickup: (actor, id) => withSubject(db, actor, async (tx) => {
      const branch = await tx.branch.findUnique({ where: { id }, select: { id: true, latitude: true, longitude: true } });
      return branch ? { branchId: branch.id, coordinates: { lat: branch.latitude, lng: branch.longitude },
        source: 'branch_record', verification: 'unverified' } : null;
    }),
    readQuoteLocations: (actor, id) => withSubject(db, actor, async (tx) => {
      const row = await tx.pricingQuote.findUnique({ where: { id }, select: { request: true, branchId: true } });
      return row ? locations(row.request, row.branchId) : null;
    }),
    readDeliveryLocations: (actor, id) => withSubject(db, actor, async (tx) => {
      const row = await tx.delivery.findUnique({ where: { id }, select: { routeSnapshot: true, branchId: true } });
      return row ? locations(row.routeSnapshot, row.branchId) : null;
    }),
  };
}
