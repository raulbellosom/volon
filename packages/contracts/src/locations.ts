import { parseDeliveryQuoteRequest, type QuotePoint } from './delivery-quote.ts';
import { parseDeliveryDestination } from './destination.ts';

export interface PickupLocationResponse {
  readonly branchId: string;
  readonly coordinates: QuotePoint;
  readonly source: 'branch_record';
  readonly verification: 'unverified';
}

export interface DeliveryLocationsResponse {
  readonly branchId: string;
  readonly pickup: {
    readonly coordinates: QuotePoint;
    readonly source: 'branch_record' | 'legacy_input';
    readonly verification: 'unverified';
  };
  readonly dropoff: {
    readonly coordinates: QuotePoint;
    readonly addressLine: string | null;
    readonly instructions: string | null;
    readonly source: 'synthetic' | 'legacy_input';
    readonly verification: 'unverified';
  };
}

function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) {
    throw new Error('Invalid location response');
  }
  return value as Record<string, unknown>;
}

export function parsePickupLocationResponse(value: unknown): PickupLocationResponse {
  const row = record(value, ['branchId', 'coordinates', 'source', 'verification']);
  const route = parseDeliveryQuoteRequest({ branchId: row.branchId, pickup: row.coordinates,
    dropoff: row.coordinates, serviceType: 'local_delivery' });
  if (row.source !== 'branch_record' || row.verification !== 'unverified') throw new Error('Invalid pickup');
  return Object.freeze({ branchId: route.branchId, coordinates: route.pickup,
    source: 'branch_record', verification: 'unverified' });
}

export function parseDeliveryLocationsResponse(value: unknown): DeliveryLocationsResponse {
  const row = record(value, ['branchId', 'pickup', 'dropoff']);
  const pickup = record(row.pickup, ['coordinates', 'source', 'verification']);
  const dropoff = record(row.dropoff, ['coordinates', 'addressLine', 'instructions', 'source', 'verification']);
  const route = parseDeliveryQuoteRequest({ branchId: row.branchId, pickup: pickup.coordinates,
    dropoff: dropoff.coordinates, serviceType: 'local_delivery' });
  if ((pickup.source !== 'branch_record' && pickup.source !== 'legacy_input')
    || pickup.verification !== 'unverified' || dropoff.verification !== 'unverified') throw new Error('Invalid location');
  let addressLine: string | null = null;
  let instructions: string | null = null;
  if (dropoff.source === 'synthetic') {
    const destination = parseDeliveryDestination({ addressLine: dropoff.addressLine, source: dropoff.source,
      verification: dropoff.verification, ...(dropoff.instructions !== null ? { instructions: dropoff.instructions } : {}) });
    addressLine = destination.addressLine;
    instructions = destination.instructions ?? null;
  } else if (dropoff.source !== 'legacy_input' || dropoff.addressLine !== null || dropoff.instructions !== null) {
    throw new Error('Invalid legacy location');
  }
  return Object.freeze({ branchId: route.branchId,
    pickup: Object.freeze({ coordinates: route.pickup, source: pickup.source, verification: 'unverified' }),
    dropoff: Object.freeze({ coordinates: route.dropoff, addressLine, instructions,
      source: dropoff.source, verification: 'unverified' }) });
}
