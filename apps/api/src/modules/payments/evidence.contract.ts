import { exactRecord, PaymentFailure, uuid } from './payment.contract.ts';
export type EvidenceKind = 'pending' | 'unknown' | 'rejected' | 'authorized' | 'capture_pending' | 'captured' | 'reversed' | 'disputed';
export type EvidenceState = Exclude<EvidenceKind, 'captured'> | 'confirmed';
export type EvidenceDisposition = 'applied' | 'ignored_stale' | 'mismatch' | 'rejected_origin';
export interface LabEvidence {
  readonly caseId: string;
  readonly eventId: string;
  readonly providerPaymentId: string;
  readonly source: 'synthetic_webhook' | 'synthetic_reconciliation';
  readonly kind: EvidenceKind;
  readonly amountMinor: number;
  readonly currency: string;
  readonly occurredAt: string;
  readonly expectedVersion: number;
}
export interface EvidenceReceipt {
  readonly caseId: string;
  readonly eventId: string;
  readonly state: EvidenceState;
  readonly version: number;
  readonly disposition: EvidenceDisposition;
  readonly needsReconciliation: boolean;
  readonly receivedAt: string;
}
export type LabOrigin = 'synthetic-fixture' | 'rejected';
/** NOT a PSP verification port. Positive implementation exists only in integration fixtures. */
export interface LabOriginVerifier { verify(canonical: string, proof: string): Promise<LabOrigin> }
export const denyLabOrigin: LabOriginVerifier = Object.freeze({ verify: async (): Promise<LabOrigin> => 'rejected' });
const fixtureId = (id: unknown): id is string => typeof id === 'string' && /^fixture_[A-Za-z0-9_-]{1,100}$/.test(id);
export function parseLabEvidence(value: unknown): LabEvidence {
  const row = exactRecord(value, ['caseId', 'eventId', 'providerPaymentId', 'source', 'kind', 'amountMinor', 'currency', 'occurredAt', 'expectedVersion']);
  if (typeof row.caseId !== 'string' || !uuid.test(row.caseId) || !fixtureId(row.eventId) || !fixtureId(row.providerPaymentId)
    || typeof row.source !== 'string' || !['synthetic_webhook', 'synthetic_reconciliation'].includes(row.source)
    || typeof row.kind !== 'string' || !['pending', 'unknown', 'rejected', 'authorized', 'capture_pending', 'captured', 'reversed', 'disputed'].includes(row.kind)
    || !Number.isSafeInteger(row.amountMinor) || Number(row.amountMinor) < 0 || Number(row.amountMinor) > 2147483647
    || typeof row.currency !== 'string' || !/^[A-Z]{3}$/.test(row.currency)
    || typeof row.occurredAt !== 'string' || !Number.isFinite(Date.parse(row.occurredAt))
    || new Date(row.occurredAt).toISOString() !== row.occurredAt
    || !Number.isInteger(row.expectedVersion) || Number(row.expectedVersion) < 0 || Number(row.expectedVersion) > 2147483646)
    throw new PaymentFailure('INVALID_COMMAND');
  // Fixed order for signatures and deduplication, independent of JSON property order.
  return { caseId: row.caseId, eventId: row.eventId, providerPaymentId: row.providerPaymentId,
    source: row.source as LabEvidence['source'], kind: row.kind as EvidenceKind, amountMinor: Number(row.amountMinor),
    currency: row.currency, occurredAt: row.occurredAt, expectedVersion: Number(row.expectedVersion) };
}
