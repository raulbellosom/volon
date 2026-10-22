import type { Prisma, PrismaClient } from '@prisma/client';
import type { PaymentActor } from '../../modules/payments/payment.contract.ts';
import { assertRuntimeRole } from '../database.ts';
import { RecoveryFailure, parseRecoveryEvidence, type RecoveryEvidence } from './recovery-contract.ts';

export async function recoveryContext(tx: Prisma.TransactionClient, instanceId: string) {
  await tx.$queryRaw`SELECT set_config('app.stripe_sandbox','offline-test-v1',true), set_config('app.stripe_recovery','offline-recovery-v1',true)`;
  const [row] = await tx.$queryRaw<{ safe: boolean }[]>`SELECT stripe_recovery_private.lab_ready(${instanceId}::uuid) AS safe`;
  if (!row?.safe) throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
}
export async function verifyRecoveryLab(db: PrismaClient, instanceId: string) {
  try {
    await assertRuntimeRole(db);
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await recoveryContext(tx,instanceId);
    });
  } catch { throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED'); }
}
export async function recoveryTransaction<T>(db: PrismaClient, actor: PaymentActor, instance: string,
  readOnly: boolean, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  try {
    await assertRuntimeRole(db);
    return await db.$transaction(async (tx) => {
      if (readOnly) await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await tx.$queryRaw`SELECT set_config('app.subject_id',${actor.subjectId},true)`;
      await recoveryContext(tx,instance);
      return work(tx);
    }, { timeout: 10000, maxWait: 10000, isolationLevel: readOnly ? 'RepeatableRead' : 'ReadCommitted' });
  } catch (error) {
    if (error instanceof RecoveryFailure) throw error;
    // Never include SQL, parameters, Prisma diagnostics or evidence in errors.
    const meta = error && typeof error === 'object' && 'meta' in error ? error.meta : null;
    const code = meta && typeof meta === 'object' && 'code' in meta ? meta.code : undefined;
    throw new RecoveryFailure(code === '23505' ? 'RECOVERY_CONFLICT' : code === '23514' ? 'RECOVERY_REJECTED' : 'RECOVERY_UNAVAILABLE');
  }
}
export async function inspectRecovery(db: PrismaClient, actor: PaymentActor, instance: string, scenarioId: string) {
  return recoveryTransaction(db,actor,instance,true,async (tx) => {
    const scenario = await tx.stripeSandboxScenario.findUnique({ where: { id: scenarioId }, include: { submission: true } });
    if (!scenario) throw new RecoveryFailure('RECOVERY_REJECTED');
    const submission = scenario.submission;
    const decisions = await tx.stripeSandboxRecoveryDecision.count({ where: { scenarioId } });
    const successors = await tx.stripeSandboxSuccessor.count({ where: { scenarioId } });
    const events = await tx.stripeSandboxEvent.count({ where: { scenarioId } });
    const reasons: string[] = [];
    if (!submission?.key || !submission.hash || !submission.startedAt) reasons.push('NO_CHECKPOINT');
    if (submission?.sessionId || submission?.paymentId || submission?.chargeId || submission?.adverse || events) reasons.push('BINDING_OR_EVENT');
    if (submission?.leaseToken || submission?.leaseUntil) reasons.push('LEASE_PRESENT');
    if (!['unknown','failed'].includes(submission?.state ?? '')) reasons.push('UNCERTAIN_STATE');
    if (decisions || successors) reasons.push('DECISION_ALREADY_CONSUMED');
    return { state: submission?.state ?? 'absent', decisions, successors, events, reasons,
      evidenceRequired: true, stripeRequests: 0, eligible: false, writesEnabledForManual: false };
  });
}
export async function prepareSuccessor(db: PrismaClient, actor: PaymentActor, instance: string, input: unknown, head: string) {
  const evidence: RecoveryEvidence = parseRecoveryEvidence(input);
  if (actor.subjectId !== evidence.reviewedBy || head !== evidence.approvalHead) throw new RecoveryFailure('RECOVERY_REJECTED');
  return recoveryTransaction(db,actor,instance,false,async (tx) => {
    const [row] = await tx.$queryRaw<{ id: string }[]>`SELECT stripe_recovery_private.prepare(${instance}::uuid,${JSON.stringify(evidence)}::jsonb,${head})::text AS id`;
    if (!row) throw new RecoveryFailure('RECOVERY_UNAVAILABLE');
    return { successorId: row.id, stripeRequests: 0, eligible: false, state: 'prepared-offline' as const };
  });
}
