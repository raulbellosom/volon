import { InvalidDeliveryResponse, parseDeliveryHistoryResponse, type DeliveryHistoryQuery,
  type DeliveryResponse } from '@delivery/contracts';
import type { QuoteActor } from '../pricing/quote.service.ts';
import { decodeDeliveryHistoryCursor, encodeDeliveryHistoryCursor,
  type DeliveryHistoryBoundary } from './delivery-history.cursor.ts';

export interface DeliveryHistoryStore {
  /** Null means branch not visible. Otherwise ordered rows, including at most one lookahead item. */
  readonly readHistory: (actor: QuoteActor, query: DeliveryHistoryQuery,
    boundary: DeliveryHistoryBoundary | null) => Promise<readonly DeliveryResponse[] | null>;
}

export function createDeliveryHistoryService(store: DeliveryHistoryStore) {
  return async (actor: QuoteActor, query: DeliveryHistoryQuery) => {
    const boundary = decodeDeliveryHistoryCursor(query.cursor, query.branchId);
    const rows = await store.readHistory(actor, query, boundary);
    if (rows === null) return null;
    if (rows.some((row) => row.branchId !== query.branchId)) throw new InvalidDeliveryResponse();
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    const nextCursor = rows.length > query.limit && last
      ? encodeDeliveryHistoryCursor(query.branchId, { createdAt: last.createdAt, deliveryId: last.deliveryId }) : null;
    return parseDeliveryHistoryResponse({ items, nextCursor });
  };
}
