import { parseDeliveryQuoteRequest, type DeliveryQuoteRequest } from '@delivery/contracts';

/** Server-only provenance. Never accepted from the quote request boundary. */
export interface RouteSnapshot extends DeliveryQuoteRequest {
  readonly pickupOrigin?: 'branch_record';
}

export function parseRouteSnapshot(value: unknown): RouteSnapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid snapshot');
  const { pickupOrigin, ...request } = value as Record<string, unknown>;
  if (Object.hasOwn(value, 'pickupOrigin') && pickupOrigin !== 'branch_record') throw new Error('Invalid snapshot');
  const route = parseDeliveryQuoteRequest(request);
  return Object.freeze({ ...route, ...(pickupOrigin === 'branch_record' ? { pickupOrigin } : {}) });
}

export function serializeRouteSnapshot(route: RouteSnapshot) {
  return { branchId: route.branchId, serviceType: route.serviceType,
    pickup: { ...route.pickup }, dropoff: { ...route.dropoff },
    ...(route.destination ? { destination: { ...route.destination } } : {}),
    ...(route.pickupOrigin ? { pickupOrigin: route.pickupOrigin } : {}) };
}
