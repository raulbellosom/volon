import {
  parseDeliveryQuoteResponse, parseDeliveryResponse,
  type DeliveryQuoteResponse, type DeliveryResponse,
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
