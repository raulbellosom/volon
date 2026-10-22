import type { Prisma, PrismaClient } from '@prisma/client';
import type { PaymentActor } from '../../modules/payments/payment.contract.ts';
import { assertRuntimeRole } from '../database.ts';
import { RecoveryFailure, successorDigest, parseRecoveryEvidence } from './recovery-contract.ts';
import { parseManualReview, parseManualProposal, manualProposalDigest, type ManualRecoveryProposal } from './manual-recovery-contract.ts';
import { stripeSessionKey, stripeSessionParameters, stripeTestHash } from './checkout-parameters.ts';
import { STRIPE_TEST_API_VERSION } from './config.ts';

export async function manualRecoveryScope(tx: Prisma.TransactionClient, actor: PaymentActor) {
  await assertRuntimeRole(tx);
  await tx.$queryRaw`SELECT set_config('app.subject_id',${actor.subjectId},true),set_config('app.stripe_sandbox','offline-test-v1',true),
    set_config('app.stripe_recovery','offline-recovery-v1',true),set_config('app.stripe_manual_recovery','manual-stripe-recovery-v1',true)`;
}
export async function manualRecoveryTransaction<T>(db: PrismaClient, actor: PaymentActor, instance: string, account: string,
  readOnly: boolean, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  try {
    return await db.$transaction(async (tx) => {
      if (readOnly) await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await manualRecoveryScope(tx,actor);
      const [ready] = await tx.$queryRaw<{safe:boolean}[]>`SELECT stripe_recovery_private.manual_ready(${instance}::uuid,${account}) AS safe`;
      if (!ready?.safe) throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
      return work(tx);
    },{timeout:15000,maxWait:5000,isolationLevel:readOnly?'RepeatableRead':'ReadCommitted'});
  } catch (error) {
    if (error instanceof RecoveryFailure) throw error;
    throw new RecoveryFailure('RECOVERY_UNAVAILABLE');
  }
}
export async function readManualRecoveryState(tx: Prisma.TransactionClient, actor: PaymentActor, account: string) {
  const scenarios = await tx.stripeSandboxScenario.findMany({where:{branchId:'branch_synthetic_a'},include:{submission:true},take:2});
  const s = scenarios[0];
  if (scenarios.length !== 1 || !s || s.subjectId !== actor.subjectId || s.accountId !== account
    || s.merchantId !== 'merchant_synthetic_a' || !s.enabled || s.purpose !== 'offline-test' || s.amountMinor !== 4400 || s.currency !== 'MXN')
    throw new RecoveryFailure('RECOVERY_REJECTED');
  const p = s.submission;
  const sourceCounts = {scenarios:scenarios.length,submissions:p?1:0,events:await tx.stripeSandboxEvent.count({where:{scenarioId:s.id}}),
    decisions:await tx.stripeSandboxRecoveryDecision.count({where:{scenarioId:s.id}}),successors:await tx.stripeSandboxSuccessor.count({where:{scenarioId:s.id}})};
  const reasons: string[] = [];
  if (!p?.key || !p.hash || !p.startedAt) reasons.push('ORIGINAL_CHECKPOINT_REQUIRED');
  const oldBody = stripeSessionParameters(s.id,4400,'http://127.0.0.1:5173').toString()
    .replace('mode=payment&','mode=payment&payment_method_types%5B0%5D=card&');
  if (p?.key !== stripeSessionKey(account,s.id) || p.hash !== stripeTestHash(STRIPE_TEST_API_VERSION+':'+account+':'+oldBody))
    reasons.push('LEGACY_PAYLOAD_NOT_CONFIRMED');
  if (p?.sessionId || p?.paymentId || p?.chargeId || p?.adverse || sourceCounts.events) reasons.push('BINDING_OR_EVENT');
  if (p?.leaseToken || p?.leaseUntil) reasons.push('LEASE_PRESENT');
  if (!['unknown','failed'].includes(p?.state ?? '')) reasons.push('STATE_NOT_RECOVERABLE');
  if (sourceCounts.decisions || sourceCounts.successors) reasons.push('DECISION_ALREADY_CONSUMED');
  const [row] = await tx.$queryRaw<{digest:string}[]>`SELECT encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex') AS digest
    FROM app."StripeSandboxSubmission" p WHERE "scenarioId"=${s.id}::uuid`;
  if (!row?.digest) throw new RecoveryFailure('RECOVERY_REJECTED');
  return {scenario:s,submission:p,sourceCounts,reasons,submissionDigest:row.digest};
}
export async function inspectManualRecovery(db: PrismaClient, actor: PaymentActor, account: string) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    await manualRecoveryScope(tx,actor);
    const state = await readManualRecoveryState(tx,actor,account);
    const [migration] = await tx.$queryRaw<{installed:boolean}[]>`SELECT to_regprocedure('stripe_recovery_private.manual_prepare(uuid,jsonb,jsonb,text,text)') IS NOT NULL AS installed`;
    return {counts:state.sourceCounts,state:state.submission?.state ?? 'absent',technicalBlockers:[...state.reasons,
      ...(!migration?.installed?['MANUAL_FUNCTION_MIGRATION_PENDING']:[])],
      requiredReviews:['OFFICIAL_HTTP_400_ARTIFACT','ORIGINAL_ATTEMPT_CORRESPONDENCE','INDEPENDENT_SESSION_AND_POST_HISTORY','FINAL_LOCAL_AUTHORIZATION'],
      sessionAbsenceConfirmed:false,operatorAuthenticated:false,provisionedIdentityVerified:true,
      eligible:false,manualWritesAuthorized:false,stripeRequests:0};
  },{isolationLevel:'RepeatableRead',timeout:10000});
}
export async function jsonDigest(tx: Prisma.TransactionClient, value: unknown) {
  const [row] = await tx.$queryRaw<{digest:string}[]>`SELECT encode(sha256(convert_to(${JSON.stringify(value)}::jsonb::text,'UTF8')),'hex') AS digest`;
  if (!row) throw new RecoveryFailure('RECOVERY_UNAVAILABLE');
  return row.digest;
}
export async function manualCatalogDigest(tx: Prisma.TransactionClient) {
  const [row] = await tx.$queryRaw<{digest:string}[]>`SELECT stripe_recovery_private.manual_catalog_digest() AS digest`;
  if (!row) throw new RecoveryFailure('RECOVERY_UNAVAILABLE');
  return row.digest;
}
export async function validateManualOperation(tx: Prisma.TransactionClient, actor: PaymentActor, account: string,
  evidenceInput: unknown, reviewInput: unknown, proposalInput: unknown, head: string) {
  const evidence = parseRecoveryEvidence(evidenceInput), state = await readManualRecoveryState(tx,actor,account);
  if (state.reasons.length || !state.submission?.startedAt || state.submissionDigest !== evidence.submissionDigest
    || evidence.scenarioId !== state.scenario.id || evidence.accountId !== account || evidence.reviewedBy !== actor.subjectId
    || evidence.approvalHead !== head) throw new RecoveryFailure('RECOVERY_REJECTED');
  const review = parseManualReview(reviewInput,evidence,state.submission.startedAt), proposal = parseManualProposal(proposalInput,head);
  if (proposal.subjectId !== actor.subjectId || proposal.accountId !== account || proposal.scenarioId !== state.scenario.id
    || proposal.submissionDigest !== state.submissionDigest || proposal.evidenceDigest !== await jsonDigest(tx,evidence)
    || proposal.reviewDigest !== await jsonDigest(tx,review) || proposal.schemaDigest !== await manualCatalogDigest(tx)
    || proposal.payloadDigest !== successorDigest(account,state.scenario.id)) throw new RecoveryFailure('RECOVERY_REJECTED');
  return {evidence,review,proposal,state};
}
export async function executeManualRecovery(db: PrismaClient, actor: PaymentActor, instance: string, account: string,
  evidenceInput: unknown, reviewInput: unknown, proposalInput: ManualRecoveryProposal, head: string, approvedDigest: string) {
  return manualRecoveryTransaction(db,actor,instance,account,false,async (tx) => {
    const {evidence,review,proposal,state} = await validateManualOperation(tx,actor,account,evidenceInput,reviewInput,proposalInput,head);
    if (proposal.instanceId !== instance || manualProposalDigest(proposal) !== approvedDigest) throw new RecoveryFailure('RECOVERY_REJECTED');
    const [row] = await tx.$queryRaw<{id:string}[]>`SELECT stripe_recovery_private.manual_prepare(${instance}::uuid,${JSON.stringify(evidence)}::jsonb,
      ${JSON.stringify(review)}::jsonb,${JSON.stringify(proposal)},${approvedDigest})::text AS id`;
    const after = await readManualRecoveryState(tx,actor,account);
    if (!row || after.submissionDigest !== state.submissionDigest || after.sourceCounts.decisions !== 1 || after.sourceCounts.successors !== 1
      || after.sourceCounts.events !== 0 || await manualCatalogDigest(tx) !== proposal.schemaDigest) throw new RecoveryFailure('RECOVERY_REJECTED');
    return {successorId:row.id,historyUnchanged:true,counts:after.sourceCounts,eligible:false,stripeRequests:0};
  });
}
