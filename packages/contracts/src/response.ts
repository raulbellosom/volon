import type { DeliveryQuoteResponse } from './delivery-quote.ts';
import type { DeliveryResponse } from './delivery.ts';

/** Response boundary shared by the API and clients; never trust JSON based on TypeScript alone. */
export class InvalidDeliveryResponse extends Error {
  constructor() { super('Invalid logistics response'); }
}

type Json = Record<string, unknown>;

function shape(value: unknown, keys: readonly string[]): Json {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== keys.length
    || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new InvalidDeliveryResponse();
  }
  return value as Json;
}

function nonEmpty(value: unknown, maxLength?: number): string {
  if (typeof value !== 'string' || value.length === 0
    || (maxLength !== undefined && (value.length > maxLength
      || !/^[A-Za-z0-9_-]+$/.test(value)))) {
    throw new InvalidDeliveryResponse();
  }
  return value;
}

function timestamp(value: unknown): string {
  // Backend contracts explicitly publish UTC; reject ambiguous local timestamps.
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)
    || !Number.isFinite(Date.parse(value))) {
    throw new InvalidDeliveryResponse();
  }
  return value;
}

function minor(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new InvalidDeliveryResponse();
  }
  return value;
}

function lines(value: unknown): DeliveryQuoteResponse['lines'] {
  if (!Array.isArray(value) || value.length !== 2) throw new InvalidDeliveryResponse();
  const parts = value.map((entry: unknown) => {
    const row = shape(entry, ['code', 'amountMinor']);
    if (row.code !== 'base_delivery' && row.code !== 'distance_delivery') {
      throw new InvalidDeliveryResponse();
    }
    return Object.freeze({ code: row.code, amountMinor: minor(row.amountMinor) });
  });
  if (parts[0]?.code === parts[1]?.code) throw new InvalidDeliveryResponse();
  return Object.freeze(parts);
}

function assertTotal(amount: number, parts: DeliveryQuoteResponse['lines']): void {
  if (!Number.isSafeInteger(parts[0]!.amountMinor + parts[1]!.amountMinor)
    || parts[0]!.amountMinor + parts[1]!.amountMinor !== amount) {
    throw new InvalidDeliveryResponse();
  }
}

export function parseDeliveryQuoteResponse(value: unknown): DeliveryQuoteResponse {
  const row = shape(value, ['quoteId', 'expiresAt', 'currency', 'amountMinor', 'lines', 'coverage']);
  if (row.currency !== 'MXN' || row.coverage !== 'eligible') throw new InvalidDeliveryResponse();
  const amountMinor = minor(row.amountMinor);
  const parsedLines = lines(row.lines);
  assertTotal(amountMinor, parsedLines);
  return Object.freeze({
    quoteId: nonEmpty(row.quoteId),
    expiresAt: timestamp(row.expiresAt),
    currency: 'MXN',
    amountMinor,
    lines: parsedLines,
    coverage: 'eligible',
  });
}

export function parseDeliveryResponse(value: unknown): DeliveryResponse {
  const row = shape(value,
    ['deliveryId', 'branchId', 'quoteId', 'status', 'version', 'createdAt', 'pricing']);
  if (row.status !== 'requested' || row.version !== 1) throw new InvalidDeliveryResponse();
  const price = shape(row.pricing, ['amountMinor', 'currency', 'lines', 'rateVersion']);
  if (price.currency !== 'MXN') throw new InvalidDeliveryResponse();
  const amountMinor = minor(price.amountMinor);
  const parsedLines = lines(price.lines);
  assertTotal(amountMinor, parsedLines);
  return Object.freeze({
    deliveryId: nonEmpty(row.deliveryId, 128),
    branchId: nonEmpty(row.branchId, 128),
    quoteId: nonEmpty(row.quoteId, 128),
    status: 'requested',
    version: 1,
    createdAt: timestamp(row.createdAt),
    pricing: Object.freeze({
      amountMinor, currency: 'MXN',
      lines: parsedLines,
      rateVersion: nonEmpty(price.rateVersion),
    }),
  });
}
