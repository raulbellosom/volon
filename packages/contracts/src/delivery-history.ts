import type { DeliveryResponse } from './delivery.ts';
import { InvalidDeliveryResponse, parseDeliveryResponse } from './response.ts';

export interface DeliveryHistoryQuery {
  readonly branchId: string;
  readonly limit: number;
  readonly cursor: string | null;
}

export interface DeliveryHistoryResponse {
  readonly items: readonly DeliveryResponse[];
  readonly nextCursor: string | null;
}

export class InvalidDeliveryHistoryQuery extends Error {
  constructor() { super('Consulta de historial inválida.'); }
}

export const DELIVERY_HISTORY_DEFAULT_LIMIT = 20;
export const DELIVERY_HISTORY_MAX_LIMIT = 100;
const CURSOR = /^[A-Za-z0-9_-]{1,1024}$/;

export function parseDeliveryHistoryQuery(params: URLSearchParams): DeliveryHistoryQuery {
  for (const key of params.keys()) {
    if (!['branchId', 'limit', 'cursor'].includes(key) || params.getAll(key).length !== 1) {
      throw new InvalidDeliveryHistoryQuery();
    }
  }
  const branchId = params.get('branchId');
  const limit = params.get('limit');
  const cursor = params.get('cursor');
  if (!branchId || !/^[A-Za-z0-9_-]{1,128}$/.test(branchId)
    || (limit !== null && (!/^[1-9][0-9]{0,2}$/.test(limit) || Number(limit) > DELIVERY_HISTORY_MAX_LIMIT))
    || (cursor !== null && !CURSOR.test(cursor))) throw new InvalidDeliveryHistoryQuery();
  return Object.freeze({ branchId, limit: limit === null ? DELIVERY_HISTORY_DEFAULT_LIMIT : Number(limit), cursor });
}

export function parseDeliveryHistoryResponse(value: unknown): DeliveryHistoryResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== 2 || !('items' in value) || !('nextCursor' in value)
    || !Object.hasOwn(value, 'items') || !Object.hasOwn(value, 'nextCursor')
    || !Array.isArray(value.items) || value.items.length > DELIVERY_HISTORY_MAX_LIMIT
    || (value.nextCursor !== null && (typeof value.nextCursor !== 'string' || !CURSOR.test(value.nextCursor)))
    || (value.items.length === 0 && value.nextCursor !== null)) throw new InvalidDeliveryResponse();
  return Object.freeze({ items: Object.freeze(value.items.map(parseDeliveryResponse)), nextCursor: value.nextCursor });
}
