import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { PaymentActor } from '../../modules/payments/payment.contract.ts';
import { parseRecoveryEvidence, RecoveryFailure, successorDigest } from './recovery-contract.ts';
import { parseManualReview, parseManualProposal, validateManualReviewArtifact } from './manual-recovery-contract.ts';
import { validateRecoveryArtifact } from './recovery-artifact.ts';
import { manualRecoveryTransaction, readManualRecoveryState, jsonDigest, manualCatalogDigest } from './manual-recovery-store.ts';

export interface ManualRecoveryDossier {
  readonly evidence: unknown; readonly review: unknown; readonly stripeError: string; readonly historyReview: string;
}
export async function proposeManualRecovery(db: PrismaClient, actor: PaymentActor, instance: string, account: string,
  identityDigest: string, head: string, dossier: ManualRecoveryDossier) {
  return manualRecoveryTransaction(db,actor,instance,account,true,async (tx) => {
    const state = await readManualRecoveryState(tx,actor,account), evidence = parseRecoveryEvidence(dossier.evidence);
    if (state.reasons.length || !state.submission?.startedAt || evidence.scenarioId !== state.scenario.id
      || evidence.accountId !== account || evidence.submissionDigest !== state.submissionDigest
      || evidence.reviewedBy !== actor.subjectId || evidence.approvalHead !== head) throw new RecoveryFailure('RECOVERY_REJECTED');
    const review = parseManualReview(dossier.review,evidence,state.submission.startedAt);
    validateRecoveryArtifact(dossier.stripeError,evidence);
    validateManualReviewArtifact(dossier.historyReview,review);
    const now = Date.now();
    return parseManualProposal({version:1,purpose:'manual-stripe-recovery-local',operationId:randomUUID(),instanceId:instance,identityDigest,
      scenarioId:state.scenario.id,subjectId:actor.subjectId,branchId:state.scenario.branchId,merchantId:state.scenario.merchantId,accountId:account,
      revision:head,evidenceDigest:await jsonDigest(tx,evidence),reviewDigest:await jsonDigest(tx,review),submissionDigest:state.submissionDigest,
      payloadDigest:successorDigest(account,state.scenario.id),schemaDigest:await manualCatalogDigest(tx),createdAt:new Date(now).toISOString(),
      expiresAt:new Date(now+3600000).toISOString(),sourceCounts:state.sourceCounts,
      effects:{decisions:1,successors:1,historicalUpdates:0,stripeRequests:0},readyForExternalCalls:false,operatorAuthenticationRequired:true},head,now);
  });
}
