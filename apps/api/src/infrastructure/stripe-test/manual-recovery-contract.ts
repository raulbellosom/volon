import { uuid } from '../../modules/payments/payment.contract.ts';
import { record } from './config.ts';
import { stripeTestHash } from './checkout-parameters.ts';
import { rejectRecovery, type RecoveryEvidence } from './recovery-contract.ts';

const reviewFields = ['version','scenarioId','accountId','stripeRequestId','reviewedBy','reviewedAt','source',
  'originalAttemptConfirmed','noSessionConfirmed','noOtherPostConfirmed','notInferredFromHttp400','windowFrom','windowTo','artifactDigest'] as const;
export interface ManualRecoveryReview {
  readonly version: 1; readonly scenarioId: string; readonly accountId: string; readonly stripeRequestId: string;
  readonly reviewedBy: string; readonly reviewedAt: string; readonly source: 'stripe-request-and-session-history-reviewed';
  readonly originalAttemptConfirmed: true; readonly noSessionConfirmed: true; readonly noOtherPostConfirmed: true;
  readonly notInferredFromHttp400: true; readonly windowFrom: string; readonly windowTo: string; readonly artifactDigest: string;
}
export function parseManualReview(value: unknown, evidence: RecoveryEvidence, startedAt: Date, now = Date.now()): ManualRecoveryReview {
  if (!record(value) || Object.keys(value).length !== reviewFields.length || reviewFields.some((key) => !Object.hasOwn(value,key))) rejectRecovery();
  if (value.version !== 1 || value.source !== 'stripe-request-and-session-history-reviewed'
    || value.scenarioId !== evidence.scenarioId || value.accountId !== evidence.accountId || value.stripeRequestId !== evidence.stripeRequestId
    || value.reviewedBy !== evidence.reviewedBy || value.originalAttemptConfirmed !== true || value.noSessionConfirmed !== true
    || value.noOtherPostConfirmed !== true || value.notInferredFromHttp400 !== true
    || typeof value.artifactDigest !== 'string' || !/^[a-f0-9]{64}$/.test(value.artifactDigest)
    || value.artifactDigest === evidence.artifactDigest) rejectRecovery();
  for (const key of ['reviewedAt','windowFrom','windowTo'] as const)
    if (typeof value[key] !== 'string' || !Number.isFinite(Date.parse(value[key])) || new Date(value[key]).toISOString() !== value[key]) rejectRecovery();
  const from = Date.parse(String(value.windowFrom)), to = Date.parse(String(value.windowTo)), reviewed = Date.parse(String(value.reviewedAt));
  if (!Number.isFinite(now) || from > startedAt.getTime() || to < startedAt.getTime() || from > to
    || to > reviewed || reviewed > now || now - to > 3600000 || now - reviewed > 3600000) rejectRecovery();
  return Object.freeze(Object.fromEntries(reviewFields.map((key) => [key,value[key]]))) as unknown as ManualRecoveryReview;
}
export function validateManualReviewArtifact(bytes: string, review: ManualRecoveryReview) {
  if (!bytes.trim() || Buffer.byteLength(bytes) > 65536 || stripeTestHash(bytes) !== review.artifactDigest) rejectRecovery();
}

const proposalFields = ['version','purpose','operationId','instanceId','identityDigest','scenarioId','subjectId','branchId','merchantId',
  'accountId','revision','evidenceDigest','reviewDigest','submissionDigest','payloadDigest','schemaDigest','createdAt','expiresAt',
  'sourceCounts','effects','readyForExternalCalls','operatorAuthenticationRequired'] as const;
export interface ManualRecoveryProposal {
  readonly version: 1; readonly purpose: 'manual-stripe-recovery-local'; readonly operationId: string;
  readonly instanceId: string; readonly identityDigest: string; readonly scenarioId: string; readonly subjectId: string;
  readonly branchId: 'branch_synthetic_a'; readonly merchantId: 'merchant_synthetic_a'; readonly accountId: string;
  readonly revision: string; readonly evidenceDigest: string; readonly reviewDigest: string; readonly submissionDigest: string;
  readonly payloadDigest: string; readonly schemaDigest: string; readonly createdAt: string; readonly expiresAt: string;
  readonly sourceCounts: { readonly scenarios: 1; readonly submissions: 1; readonly events: 0; readonly decisions: 0; readonly successors: 0 };
  readonly effects: { readonly decisions: 1; readonly successors: 1; readonly historicalUpdates: 0; readonly stripeRequests: 0 };
  readonly readyForExternalCalls: false; readonly operatorAuthenticationRequired: true;
}
export function parseManualProposal(value: unknown, head: string, now = Date.now()): ManualRecoveryProposal {
  if (!record(value) || Object.keys(value).length !== proposalFields.length || proposalFields.some((key) => !Object.hasOwn(value,key))) rejectRecovery();
  if (value.version !== 1 || value.purpose !== 'manual-stripe-recovery-local' || value.revision !== head || !/^[a-f0-9]{40}$/.test(head)
    || value.branchId !== 'branch_synthetic_a' || value.merchantId !== 'merchant_synthetic_a'
    || typeof value.accountId !== 'string' || !/^acct_[A-Za-z0-9_]{1,100}$/.test(value.accountId)
    || value.readyForExternalCalls !== false || value.operatorAuthenticationRequired !== true) rejectRecovery();
  for (const key of ['operationId','instanceId','scenarioId','subjectId'] as const)
    if (typeof value[key] !== 'string' || !uuid.test(value[key])) rejectRecovery();
  for (const key of ['identityDigest','evidenceDigest','reviewDigest','submissionDigest','payloadDigest','schemaDigest'] as const)
    if (typeof value[key] !== 'string' || !/^[a-f0-9]{64}$/.test(value[key])) rejectRecovery();
  if (!record(value.sourceCounts) || JSON.stringify(Object.keys(value.sourceCounts).sort()) !== JSON.stringify(['decisions','events','scenarios','submissions','successors'])
    || value.sourceCounts.scenarios !== 1 || value.sourceCounts.submissions !== 1 || value.sourceCounts.events !== 0
    || value.sourceCounts.decisions !== 0 || value.sourceCounts.successors !== 0
    || !record(value.effects) || JSON.stringify(Object.keys(value.effects).sort()) !== JSON.stringify(['decisions','historicalUpdates','stripeRequests','successors'])
    || value.effects.decisions !== 1 || value.effects.successors !== 1 || value.effects.historicalUpdates !== 0 || value.effects.stripeRequests !== 0) rejectRecovery();
  for (const key of ['createdAt','expiresAt'] as const)
    if (typeof value[key] !== 'string' || !Number.isFinite(Date.parse(value[key])) || new Date(value[key]).toISOString() !== value[key]) rejectRecovery();
  const created = Date.parse(String(value.createdAt)), expires = Date.parse(String(value.expiresAt));
  if (!Number.isFinite(now) || created > now || expires <= now || expires <= created || expires - created > 3600000) rejectRecovery();
  return Object.freeze(Object.fromEntries(proposalFields.map((key) => [key,value[key]]))) as unknown as ManualRecoveryProposal;
}
export const manualProposalDigest = (proposal: ManualRecoveryProposal) => stripeTestHash(JSON.stringify(proposal));
