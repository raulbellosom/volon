import type { LabEvidence, EvidenceReceipt, LabOrigin } from './evidence.contract.ts';
export interface LabExpectation { readonly expectedAmountMinor: number; readonly currency: string; readonly providerPaymentId: string }
type Projection = Pick<EvidenceReceipt, 'state' | 'disposition' | 'needsReconciliation'>;
export function projectEvidence(previous: EvidenceReceipt | null, event: LabEvidence, expected: LabExpectation, origin: LabOrigin): Projection {
  const state = previous?.state ?? 'pending';
  if (origin !== 'synthetic-fixture') return { state, disposition: 'rejected_origin', needsReconciliation: true };
  if (event.amountMinor !== expected.expectedAmountMinor || event.currency !== expected.currency || event.providerPaymentId !== expected.providerPaymentId)
    return { state, disposition: 'mismatch', needsReconciliation: true };
  const ignored = (): Projection => ({ state, disposition: 'ignored_stale', needsReconciliation: previous?.needsReconciliation ?? true });
  // Adverse evidence is sticky. A later capture must never silently reinstate eligibility.
  if (state === 'disputed' || (state === 'reversed' && event.kind !== 'disputed')) return ignored();
  if (event.kind === 'reversed' || event.kind === 'disputed')
    return { state: event.kind, disposition: 'applied', needsReconciliation: true };
  if (state === 'confirmed') return ignored();
  if (event.kind === 'captured') return { state: event.source === 'synthetic_reconciliation' ? 'confirmed' : 'capture_pending',
    disposition: 'applied', needsReconciliation: event.source !== 'synthetic_reconciliation' };
  if ((state === 'capture_pending' && event.kind !== 'unknown') || (state === 'authorized' && event.kind === 'pending')) return ignored();
  return { state: event.kind, disposition: 'applied', needsReconciliation: true };
}
