import { record } from './config.ts';
import { stripeTestHash } from './checkout-parameters.ts';
import { rejectRecovery, type RecoveryEvidence } from './recovery-contract.ts';

/** Private, operator-reviewed HTTP export; never stored in SQL or printed. Not a Stripe signature proof. */
export function validateRecoveryArtifact(bytes: string, evidence: RecoveryEvidence) {
  try {
    if (Buffer.byteLength(bytes)>65536 || stripeTestHash(bytes)!==evidence.artifactDigest) rejectRecovery();
    const value: unknown = JSON.parse(bytes);
    if (!record(value) || value.status!==400 || value.accountId!==evidence.accountId || value.scenarioId!==evidence.scenarioId
      || value.requestId!==evidence.stripeRequestId || value.apiVersion!==evidence.apiVersion
      || !record(value.response) || !record(value.response.error)
      || value.response.error.type!==evidence.errorType || value.response.error.param!==evidence.errorParam) rejectRecovery();
  } catch { rejectRecovery(); }
}
