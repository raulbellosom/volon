/** Internal v1 laboratory contract. Deliberately not exported to client packages. */
export type DispatchCommand =
  | { readonly operation: 'offer'; readonly syntheticDeliveryRef: string; readonly ttlSeconds: number }
  | { readonly operation: 'accept' | 'decline' | 'withdraw' | 'expire' | 'revoke';
      readonly id: string; readonly expectedVersion: number };
interface ReceiptBase {
  readonly id: string;
  readonly syntheticDeliveryRef: string;
  readonly courierId: string;
  readonly version: number;
  readonly changedAt: string;
}
export type DispatchReceipt =
  | (ReceiptBase & { readonly kind: 'offer'; readonly status: 'offered' | 'accepted' | 'declined' | 'withdrawn' | 'expired'; readonly expiresAt: string })
  | (ReceiptBase & { readonly kind: 'assignment'; readonly status: 'active' | 'revoked' });
export class DispatchFailure extends Error {
  readonly code: 'INVALID_COMMAND' | 'NOT_FOUND' | 'FINANCIAL_INELIGIBLE' | 'COURIER_UNAVAILABLE'
    | 'VERSION_CONFLICT' | 'STATE_CONFLICT' | 'OFFER_EXPIRED' | 'NOT_EXPIRED'
    | 'IDEMPOTENCY_CONFLICT' | 'INFRASTRUCTURE_UNAVAILABLE';
  constructor(code: DispatchFailure['code']) { super(code); this.code = code; }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DispatchFailure('INVALID_COMMAND');
  return value as Record<string, unknown>;
}
function exact(row: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(row).length !== keys.length || keys.some((key) => !(key in row))) throw new DispatchFailure('INVALID_COMMAND');
}
const id = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);
const version = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0 && value < 2147483647;
export function parseDispatchCommand(value: unknown): DispatchCommand {
  const row = record(value);
  if (row.operation === 'offer') {
    exact(row, ['operation', 'syntheticDeliveryRef', 'ttlSeconds']);
    if (!id(row.syntheticDeliveryRef) || !Number.isInteger(row.ttlSeconds) || Number(row.ttlSeconds) < 1 || Number(row.ttlSeconds) > 300)
      throw new DispatchFailure('INVALID_COMMAND');
    return { operation: 'offer', syntheticDeliveryRef: row.syntheticDeliveryRef, ttlSeconds: Number(row.ttlSeconds) };
  }
  exact(row, ['operation', 'id', 'expectedVersion']);
  if (typeof row.operation !== 'string' || !['accept', 'decline', 'withdraw', 'expire', 'revoke'].includes(row.operation)
    || !id(row.id) || !version(row.expectedVersion))
    throw new DispatchFailure('INVALID_COMMAND');
  return { operation: row.operation as Exclude<DispatchCommand['operation'], 'offer'>, id: row.id, expectedVersion: row.expectedVersion };
}
export function parseDispatchReceipt(value: unknown): DispatchReceipt {
  const row = record(value);
  exact(row, ['kind', 'id', 'syntheticDeliveryRef', 'courierId', 'status', 'version', 'changedAt', ...(row.kind === 'offer' ? ['expiresAt'] : [])]);
  const timestamp = (time: unknown) => typeof time === 'string' && Number.isFinite(Date.parse(time)) && new Date(time).toISOString() === time;
  if (!id(row.id) || !id(row.syntheticDeliveryRef) || typeof row.status !== 'string'
    || typeof row.courierId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(row.courierId)
    || !Number.isInteger(row.version) || Number(row.version) < 1 || Number(row.version) > 2147483647 || !timestamp(row.changedAt)
    || (row.kind === 'offer' ? !['offered', 'accepted', 'declined', 'withdrawn', 'expired'].includes(String(row.status)) || !timestamp(row.expiresAt)
      : row.kind !== 'assignment' || !['active', 'revoked'].includes(String(row.status)))) throw new DispatchFailure('INVALID_COMMAND');
  return row as unknown as DispatchReceipt;
}
export function validateDispatchKey(key: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(key)) throw new DispatchFailure('INVALID_COMMAND');
}
