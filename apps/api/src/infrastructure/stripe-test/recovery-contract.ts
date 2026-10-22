import { uuid } from '../../modules/payments/payment.contract.ts';
import { record, STRIPE_TEST_API_VERSION } from './config.ts';
import { stripeTestHash, stripeSessionParameters } from './checkout-parameters.ts';

export class RecoveryFailure extends Error {
  readonly code: 'RECOVERY_REJECTED' | 'RECOVERY_CONFLICT' | 'RECOVERY_ENVIRONMENT_BLOCKED' | 'RECOVERY_UNAVAILABLE';
  constructor(code: RecoveryFailure['code']) { super(code); this.code = code; }
}
export function rejectRecovery(): never { throw new RecoveryFailure('RECOVERY_REJECTED'); }
export const recoveryFields = ['version','scenarioId','accountId','submissionDigest','stripeRequestId','httpStatus','errorType','errorParam',
  'apiVersion','noSessionConfirmed','noOtherPostConfirmed','reviewedBy','reviewedAt','source','artifactDigest','approvalHead'] as const;
export interface RecoveryEvidence {
  readonly version: 1; readonly scenarioId: string; readonly accountId: string; readonly submissionDigest: string;
  readonly stripeRequestId: string; readonly httpStatus: 400; readonly errorType: 'invalid_request_error';
  readonly errorParam: 'payment_method_types'; readonly apiVersion: typeof STRIPE_TEST_API_VERSION;
  readonly noSessionConfirmed: true; readonly noOtherPostConfirmed: true; readonly reviewedBy: string;
  readonly reviewedAt: string; readonly source: 'stripe-official-error-reviewed'; readonly artifactDigest: string; readonly approvalHead: string;
}
export function parseRecoveryEvidence(value: unknown, now = Date.now()): RecoveryEvidence {
  if (!record(value) || Object.keys(value).length !== recoveryFields.length || recoveryFields.some((key) => !Object.hasOwn(value,key))) rejectRecovery();
  if (value.version !== 1 || value.httpStatus !== 400 || value.errorType !== 'invalid_request_error'
    || value.errorParam !== 'payment_method_types' || value.apiVersion !== STRIPE_TEST_API_VERSION
    || value.source !== 'stripe-official-error-reviewed' || value.noSessionConfirmed !== true || value.noOtherPostConfirmed !== true) rejectRecovery();
  for (const key of ['scenarioId','reviewedBy'] as const) if (typeof value[key] !== 'string' || !uuid.test(value[key])) rejectRecovery();
  for (const key of ['submissionDigest','artifactDigest'] as const) if (typeof value[key] !== 'string' || !/^[0-9a-f]{64}$/.test(value[key])) rejectRecovery();
  if (typeof value.accountId !== 'string' || !/^acct_[A-Za-z0-9_]{1,100}$/.test(value.accountId)
    || typeof value.stripeRequestId !== 'string' || !/^req_[A-Za-z0-9_]{1,100}$/.test(value.stripeRequestId)
    || typeof value.approvalHead !== 'string' || !/^[0-9a-f]{40}$/.test(value.approvalHead)
    || typeof value.reviewedAt !== 'string' || !Number.isFinite(Date.parse(value.reviewedAt)) || !Number.isFinite(now)
    || new Date(value.reviewedAt).toISOString() !== value.reviewedAt || Date.parse(value.reviewedAt) > now
    || now - Date.parse(value.reviewedAt) > 86400000) rejectRecovery();
  return Object.freeze(Object.fromEntries(recoveryFields.map((key) => [key,value[key]]))) as unknown as RecoveryEvidence;
}
export const successorKey = (account: string, scenario: string, successor: string) =>
  'stripe-test-session-' + stripeTestHash('recovery-v1:' + account + ':' + scenario + ':' + successor);
export const successorDigest = (account: string, scenario: string) => stripeTestHash(STRIPE_TEST_API_VERSION + ':' + account + ':'
  + stripeSessionParameters(scenario,4400,'http://127.0.0.1:5173').toString());
