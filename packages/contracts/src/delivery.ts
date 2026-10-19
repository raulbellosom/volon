import type { DeliveryQuoteResponse } from './delivery-quote.ts';

export interface CreateDeliveryRequest {
  readonly branchId: string;
  readonly quoteId: string;
}

export interface DeliveryResponse {
  readonly deliveryId: string;
  readonly publicReference: string;
  readonly branchId: string;
  readonly quoteId: string;
  readonly status: 'requested';
  readonly version: 1;
  readonly createdAt: string;
  readonly pricing: {
    readonly amountMinor: number;
    readonly currency: 'MXN';
    readonly lines: DeliveryQuoteResponse['lines'];
    readonly rateVersion: string;
  };
}

export class InvalidDeliveryRequest extends Error {}
export class InvalidIdempotencyKey extends Error {}

const OPAQUE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function parseCreateDeliveryRequest(value: unknown): CreateDeliveryRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || Object.keys(value).length !== 2 || !Object.hasOwn(value, 'branchId') || !Object.hasOwn(value, 'quoteId')
    || !('branchId' in value) || typeof value.branchId !== 'string' || !OPAQUE_ID.test(value.branchId)
    || !('quoteId' in value) || typeof value.quoteId !== 'string' || !OPAQUE_ID.test(value.quoteId)) {
    throw new InvalidDeliveryRequest('Solicitud de entrega inválida.');
  }
  return Object.freeze({ branchId: value.branchId, quoteId: value.quoteId });
}

export function parseIdempotencyKey(value: string | null): string {
  if (value === null || !OPAQUE_ID.test(value)) {
    throw new InvalidIdempotencyKey('Clave de idempotencia ausente o inválida.');
  }
  return value;
}
