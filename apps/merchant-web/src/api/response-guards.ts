import type { DeliveryQuoteResponse, DeliveryResponse } from '@delivery/contracts';
import { ApiError } from './api-error.ts';

// `@delivery/contracts` only ships request parsers for quotes and deliveries. These checks keep
// the client from rendering a malformed body; the backend stays the authority on every amount.

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isMinor = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const LINE_CODES = new Set(['base_delivery', 'distance_delivery']);

function isLines(value: unknown): value is DeliveryQuoteResponse['lines'] {
  return Array.isArray(value) && value.every((line) => isObject(line) && LINE_CODES.has(String(line['code'])) && isMinor(line['amountMinor']));
}

function malformed(): never {
  throw new ApiError('unexpected', null, 'MALFORMED_RESPONSE');
}

export function readQuote(value: unknown): DeliveryQuoteResponse {
  if (
    !isObject(value) || !isText(value['quoteId']) || !isText(value['expiresAt']) || value['currency'] !== 'MXN'
    || !isMinor(value['amountMinor']) || !isLines(value['lines']) || value['coverage'] !== 'eligible'
  ) return malformed();
  return value as unknown as DeliveryQuoteResponse;
}

export function readDelivery(value: unknown): DeliveryResponse {
  if (!isObject(value) || !isText(value['deliveryId']) || !isText(value['branchId']) || !isText(value['quoteId'])) return malformed();
  const pricing = value['pricing'];
  if (
    value['status'] !== 'requested' || !isText(value['createdAt']) || !isObject(pricing)
    || !isMinor(pricing['amountMinor']) || pricing['currency'] !== 'MXN' || !isLines(pricing['lines']) || !isText(pricing['rateVersion'])
  ) return malformed();
  return value as unknown as DeliveryResponse;
}
