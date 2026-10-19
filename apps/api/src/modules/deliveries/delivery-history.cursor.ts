import { InvalidDeliveryHistoryQuery } from '@delivery/contracts';

export interface DeliveryHistoryBoundary {
  readonly createdAt: string;
  readonly deliveryId: string;
}

export function encodeDeliveryHistoryCursor(branchId: string, boundary: DeliveryHistoryBoundary): string {
  return Buffer.from(JSON.stringify({ v: 1, branchId, createdAt: boundary.createdAt,
    deliveryId: boundary.deliveryId })).toString('base64url');
}

export function decodeDeliveryHistoryCursor(cursor: string | null, branchId: string): DeliveryHistoryBoundary | null {
  if (cursor === null) return null;
  try {
    if (!/^[A-Za-z0-9_-]{1,1024}$/.test(cursor)) throw new InvalidDeliveryHistoryQuery();
    const row: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).length !== 4
      || !('v' in row) || row.v !== 1 || !('branchId' in row) || row.branchId !== branchId
      || !('createdAt' in row) || typeof row.createdAt !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.createdAt)
      || new Date(row.createdAt).getUTCFullYear() < 1
      || new Date(row.createdAt).toISOString() !== row.createdAt
      || !('deliveryId' in row) || typeof row.deliveryId !== 'string'
      || !/^[A-Za-z0-9_-]{1,128}$/.test(row.deliveryId)) throw new InvalidDeliveryHistoryQuery();
    const boundary = Object.freeze({ createdAt: row.createdAt, deliveryId: row.deliveryId });
    if (encodeDeliveryHistoryCursor(branchId, boundary) !== cursor) throw new InvalidDeliveryHistoryQuery();
    return boundary;
  } catch { throw new InvalidDeliveryHistoryQuery(); }
}
