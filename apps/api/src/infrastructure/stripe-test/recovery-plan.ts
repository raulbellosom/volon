import type { PrismaClient, Prisma } from '@prisma/client';
import type { PaymentActor } from '../../modules/payments/payment.contract.ts';
import { uuid } from '../../modules/payments/payment.contract.ts';
import { record } from './config.ts';
import { stripeTestHash } from './checkout-parameters.ts';
import { successorDigest, successorKey, rejectRecovery } from './recovery-contract.ts';
import { recoveryTransaction } from './recovery-store.ts';

const fields = ['version','purpose','operation','instanceId','decisionId','successorId','scenarioId','subjectId','branchId','merchantId',
  'accountId','revision','payloadVersion','payloadDigest','amountMinor','currency','expiresAt','maxRequests','maxSessions','readyForExternalCalls'] as const;
export interface RecoveryPlan {
  readonly version: 2; readonly purpose: 'stripe-test-recovery-proposal'; readonly operation: 'create-successor';
  readonly instanceId: string; readonly decisionId: string; readonly successorId: string; readonly scenarioId: string;
  readonly subjectId: string; readonly branchId: string; readonly merchantId: string; readonly accountId: string;
  readonly revision: string; readonly payloadVersion: 'dynamic-checkout-v1'; readonly payloadDigest: string;
  readonly amountMinor: 4400; readonly currency: 'MXN'; readonly expiresAt: string;
  readonly maxRequests: 2; readonly maxSessions: 1; readonly readyForExternalCalls: false;
}
export function validateRecoveryPlan(value: unknown): RecoveryPlan {
  if (!record(value) || Object.keys(value).length !== fields.length || fields.some((key) => !Object.hasOwn(value,key))) rejectRecovery();
  if (value.version !== 2 || value.purpose !== 'stripe-test-recovery-proposal' || value.operation !== 'create-successor'
    || value.payloadVersion !== 'dynamic-checkout-v1' || value.amountMinor !== 4400 || value.currency !== 'MXN'
    || value.maxRequests !== 2 || value.maxSessions !== 1 || value.readyForExternalCalls !== false) rejectRecovery();
  for (const key of ['instanceId','decisionId','successorId','scenarioId','subjectId'] as const)
    if (typeof value[key] !== 'string' || !uuid.test(value[key])) rejectRecovery();
  if (typeof value.revision !== 'string' || !/^[0-9a-f]{40}$/.test(value.revision)
    || typeof value.accountId !== 'string' || !/^acct_[A-Za-z0-9_]{1,100}$/.test(value.accountId)
    || typeof value.branchId !== 'string' || !/^branch_(synthetic_[ab]|recovery_test_[0-9a-f]{32})$/.test(value.branchId)
    || value.merchantId !== value.branchId.replace('branch_','merchant_')
    || value.payloadDigest !== successorDigest(value.accountId,String(value.scenarioId))
    || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt))
    || new Date(value.expiresAt).toISOString() !== value.expiresAt) rejectRecovery();
  return Object.freeze(Object.fromEntries(fields.map((key) => [key,value[key]]))) as unknown as RecoveryPlan;
}
export const recoveryPlanDigest = (plan: RecoveryPlan) => stripeTestHash(JSON.stringify(validateRecoveryPlan(plan)));
export function assertRecoveryPlan(plan: RecoveryPlan, head: string, now = Date.now()) {
  const valid = validateRecoveryPlan(plan), remaining = Date.parse(valid.expiresAt) - now;
  if (!Number.isFinite(now) || head !== valid.revision || remaining <= 0 || remaining > 3600000) rejectRecovery();
}
export async function loadRecoveryPlan(db: PrismaClient, actor: PaymentActor, instance: string, successorId: string, head: string, expiresAt: string) {
  return recoveryTransaction(db,actor,instance,true,(tx) => readRecoveryPlan(tx,actor,instance,successorId,head,expiresAt));
}
/** Shared data loading only; callers must establish their independent instance/Auth/RLS context. */
export async function readRecoveryPlan(tx: Prisma.TransactionClient, actor: PaymentActor, instance: string, successorId: string, head: string, expiresAt: string) {
    const next = await tx.stripeSandboxSuccessor.findUnique({ where: { id: successorId }, include: { decision: true } });
    if (!next || next.state !== 'prepared-offline' || next.decision.approvalHead !== head
      || next.key !== successorKey(next.accountId,next.scenarioId,next.id)) rejectRecovery();
    const scenario = await tx.stripeSandboxScenario.findUnique({ where: { id: next.scenarioId } });
    const [snapshot] = await tx.$queryRaw<{ digest: string }[]>`SELECT encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex') AS digest
      FROM app."StripeSandboxSubmission" p WHERE "scenarioId" = ${next.scenarioId}::uuid`;
    if (!scenario || snapshot?.digest !== next.decision.submissionDigest || scenario.subjectId !== actor.subjectId) rejectRecovery();
    const plan = validateRecoveryPlan({ version: 2, purpose: 'stripe-test-recovery-proposal', operation: 'create-successor',
      instanceId: instance, decisionId: next.decisionId, successorId: next.id, scenarioId: next.scenarioId, subjectId: actor.subjectId,
      branchId: scenario.branchId, merchantId: scenario.merchantId, accountId: next.accountId, revision: head,
      payloadVersion: next.payloadVersion, payloadDigest: next.payloadDigest, amountMinor: next.amountMinor, currency: next.currency,
      expiresAt, maxRequests: 2, maxSessions: 1, readyForExternalCalls: false });
    assertRecoveryPlan(plan,head);
    return plan;
}
