import {
  parseDeliveryHistoryResponse, parseDeliveryLocationsResponse, parseDeliveryQuoteResponse, parseDeliveryResponse,
  parsePickupLocationResponse, type DeliveryHistoryResponse, type DeliveryLocationsResponse, type PickupLocationResponse, type DeliveryQuoteResponse, type DeliveryResponse,
} from '@delivery/contracts';
import { ApiError } from './api-error.ts';

/** App error boundary; JSON shape and financial invariants belong to shared contracts. */
function parse<T>(fn: (value: unknown) => T, value: unknown): T {
  try { return fn(value); }
  catch { throw new ApiError('unexpected', null, 'MALFORMED_RESPONSE'); }
}

export const readQuote = (value: unknown): DeliveryQuoteResponse =>
  parse(parseDeliveryQuoteResponse, value);

export const readDelivery = (value: unknown): DeliveryResponse =>
  parse(parseDeliveryResponse, value);

/** A page must also belong to the branch that was asked for; anything else is never shown. */
export function readHistory(value: unknown, branchId: string): DeliveryHistoryResponse {
  const page = parse(parseDeliveryHistoryResponse, value);
  if (page.items.some((item) => item.branchId !== branchId)) throw new ApiError('unexpected', null, 'MALFORMED_RESPONSE');
  return page;
}

/** The pickup must belong to the branch that was asked for. */
export function readPickup(value: unknown, branchId: string): PickupLocationResponse {
  const pickup = parse(parsePickupLocationResponse, value);
  if (pickup.branchId !== branchId) throw new ApiError('unexpected', null, 'MALFORMED_RESPONSE');
  return pickup;
}

export const readLocations = (value: unknown): DeliveryLocationsResponse => parse(parseDeliveryLocationsResponse, value);
