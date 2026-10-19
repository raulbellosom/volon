/** Internal v1 only: no HTTP or client payment authority. */
export interface PaymentActor { readonly subjectId: string }
export interface PreparedPayment {
  readonly intentId: string;
  readonly deliveryId: string;
  readonly amountMinor: number;
  readonly currency: 'MXN';
  readonly status: 'pending';
  readonly version: 1;
  readonly createdAt: string;
  readonly attempt: { readonly attemptId: string; readonly status: 'not_submitted' };
}
export interface FinancialIneligibility {
  readonly deliveryId: string;
  readonly eligible: false;
  readonly reason: 'PSP_NOT_CONFIGURED';
}
export class PaymentFailure extends Error {
  readonly code: 'INVALID_COMMAND' | 'NOT_FOUND' | 'IDEMPOTENCY_CONFLICT' | 'VERSION_CONFLICT' | 'INFRASTRUCTURE_UNAVAILABLE';
  constructor(code: PaymentFailure['code']) { super(code); this.code = code; }
}
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function exactRecord(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PaymentFailure('INVALID_COMMAND');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== fields.length || fields.some((key) => !Object.hasOwn(row, key)))
    throw new PaymentFailure('INVALID_COMMAND');
  return row;
}
export function parsePaymentRequest(value: unknown): { readonly deliveryId: string } {
  const row = exactRecord(value, ['deliveryId']);
  if (typeof row.deliveryId !== 'string' || !uuid.test(row.deliveryId)) throw new PaymentFailure('INVALID_COMMAND');
  return { deliveryId: row.deliveryId };
}
export function validatePaymentKey(value: string) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new PaymentFailure('INVALID_COMMAND');
}
export function validatePaymentActor(value: PaymentActor) {
  if (!value || typeof value.subjectId !== 'string' || !uuid.test(value.subjectId)) throw new PaymentFailure('NOT_FOUND');
}
export function infrastructureFailure(error: unknown): never {
  if (error instanceof PaymentFailure) throw error;
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
    throw new PaymentFailure('IDEMPOTENCY_CONFLICT');
  throw new PaymentFailure('INFRASTRUCTURE_UNAVAILABLE');
}
