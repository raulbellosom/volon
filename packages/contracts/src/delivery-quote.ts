export interface QuotePoint {
  readonly lat: number;
  readonly lng: number;
}

export interface DeliveryQuoteRequest {
  readonly branchId: string;
  readonly pickup: QuotePoint;
  readonly dropoff: QuotePoint;
  readonly serviceType: 'local_delivery';
}

export interface DeliveryQuoteResponse {
  readonly quoteId: string;
  readonly expiresAt: string;
  readonly currency: 'MXN';
  readonly amountMinor: number;
  readonly lines: readonly {
    readonly code: 'base_delivery' | 'distance_delivery';
    readonly amountMinor: number;
  }[];
  readonly coverage: 'eligible';
}

export class InvalidQuoteRequest extends Error {
  constructor() {
    super('Solicitud de cotización inválida.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function parsePoint(value: unknown): QuotePoint {
  if (!isRecord(value) || !hasExactKeys(value, ['lat', 'lng'])
    || typeof value.lat !== 'number' || !Number.isFinite(value.lat) || Math.abs(value.lat) > 90
    || typeof value.lng !== 'number' || !Number.isFinite(value.lng) || Math.abs(value.lng) > 180) {
    throw new InvalidQuoteRequest();
  }
  return Object.freeze({ lat: value.lat, lng: value.lng });
}

/** Runtime boundary; keep aligned with delivery-quote.schema.json. */
export function parseDeliveryQuoteRequest(value: unknown): DeliveryQuoteRequest {
  if (!isRecord(value) || !hasExactKeys(value, ['branchId', 'pickup', 'dropoff', 'serviceType'])
    || typeof value.branchId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.branchId)
    || value.serviceType !== 'local_delivery') {
    throw new InvalidQuoteRequest();
  }
  return Object.freeze({
    branchId: value.branchId,
    pickup: parsePoint(value.pickup),
    dropoff: parsePoint(value.dropoff),
    serviceType: value.serviceType,
  });
}
