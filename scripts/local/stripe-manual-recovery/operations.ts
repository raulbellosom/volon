import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createDatabase } from '../../../apps/api/src/infrastructure/database.ts';
import { RecoveryFailure } from '../../../apps/api/src/infrastructure/stripe-test/recovery-contract.ts';
import { proposeManualRecovery } from '../../../apps/api/src/infrastructure/stripe-test/manual-recovery-proposal.ts';
import { inspectManualRecovery, executeManualRecovery, manualRecoveryTransaction } from '../../../apps/api/src/infrastructure/stripe-test/manual-recovery-store.ts';
import { parseManualProposal, manualProposalDigest } from '../../../apps/api/src/infrastructure/stripe-test/manual-recovery-contract.ts';
import { readRecoveryPlan, recoveryPlanDigest } from '../../../apps/api/src/infrastructure/stripe-test/recovery-plan.ts';
import { record } from '../../../apps/api/src/infrastructure/stripe-test/config.ts';
import { loadManualRecoveryProfile, manualMigration, manualMigrationDigest, guardManualRecoveryProcess } from './environment.ts';
import { readDossier, operationDirectory, readLimited, writeJson, saveProposal } from './files.ts';
import { validateManualAuthorization } from './approval.ts';
import { cleanHead } from '../stripe-migration/manifest.ts';
import { authenticateLocalSyntheticUser } from '../stripe-synthetic-auth.ts';
import { readHiddenStripeValue } from '../stripe-hidden-input.ts';

function reject(): never { throw new RecoveryFailure('RECOVERY_REJECTED'); }
export async function manualInspect() {
  const local = await loadManualRecoveryProfile(), db = createDatabase(local.databaseUrl);
  try {
    return {...await inspectManualRecovery(db,{subjectId:local.identity.subjectId},local.accountId),
      migrationInstalled:local.migrationInstalled,requiredMigration:manualMigration,requiredMigrationSha256:manualMigrationDigest,
      globalCounts:local.counts,headApprovalRequired:true};
  } finally { await db.$disconnect(); }
}
export async function manualPropose(dossierDirectory: string) {
  const head = cleanHead(), local = await loadManualRecoveryProfile();
  if (!local.migrationInstalled) throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
  const db = createDatabase(local.databaseUrl);
  try {
    const proposal = await proposeManualRecovery(db,{subjectId:local.identity.subjectId},local.instanceId,local.accountId,
      local.identityDigest,head,readDossier(dossierDirectory));
    if (cleanHead() !== head) reject();
    saveProposal(proposal.operationId,proposal,dossierDirectory);
    return {operationId:proposal.operationId,sha256:manualProposalDigest(proposal),expiresAt:proposal.expiresAt,
      operatorAuthenticationPending:true,localWritesAuthorized:false,financialEligibility:false,stripeRequests:0};
  } finally { await db.$disconnect(); }
}
export async function manualExecute(id: string, expectedDigest: string) {
  guardManualRecoveryProcess();
  if (!/^[a-f0-9]{64}$/.test(expectedDigest)) reject();
  const directory = operationDirectory(id), head = cleanHead();
  const proposal = parseManualProposal(JSON.parse(readLimited(join(directory,'proposal.json'))),head);
  const digest = manualProposalDigest(proposal);
  if (digest !== expectedDigest || proposal.operationId !== id || existsSync(join(directory,'operation-started.json'))) reject();
  const authorization: unknown = JSON.parse(readLimited(join(directory,'authorization.json')));
  validateManualAuthorization(authorization,proposal,digest);
  const reference: unknown = JSON.parse(readLimited(join(directory,'dossier-reference.json')));
  if (!record(reference) || Object.keys(reference).length !== 1 || typeof reference.directory !== 'string') reject();
  const dossierDirectory = String(reference.directory), dossier = readDossier(dossierDirectory);
  const local = await loadManualRecoveryProfile();
  if (!local.migrationInstalled || local.identityDigest !== proposal.identityDigest || local.instanceId !== proposal.instanceId
    || local.accountId !== proposal.accountId || local.identity.subjectId !== proposal.subjectId
    || !local.password || !local.publishableKey) reject();
  // Rebuild and compare the dossier/checkpoint in READ ONLY before asking for authorization.
  const db = createDatabase(local.databaseUrl);
  try {
    const current = await proposeManualRecovery(db,{subjectId:local.identity.subjectId},local.instanceId,local.accountId,local.identityDigest,head,dossier);
    for (const key of ['evidenceDigest','reviewDigest','submissionDigest','payloadDigest','schemaDigest'] as const)
      if (current[key] !== proposal[key]) reject();
    if (await readHiddenStripeValue('AUTORIZO RECUPERACION LOCAL y SHA-256 aprobado') !== 'AUTORIZO RECUPERACION LOCAL '+digest) reject();
    validateManualAuthorization(authorization,parseManualProposal(proposal,cleanHead()),digest);
    const final = await loadManualRecoveryProfile();
    if (final.identityDigest !== proposal.identityDigest || !final.migrationInstalled) reject();
    // Auth itself creates local session records; only after independent approval and never in inspect/propose.
    writeJson(join(directory,'operation-started.json'),{head,sha256:digest,startedAt:new Date().toISOString()});
    const actor = await authenticateLocalSyntheticUser('http://127.0.0.1:57321',final.publishableKey,final.password,proposal.subjectId);
    validateManualAuthorization(authorization,parseManualProposal(proposal,cleanHead()),digest);
    const authenticatedProfile = await loadManualRecoveryProfile();
    if (authenticatedProfile.identityDigest !== proposal.identityDigest || authenticatedProfile.identity.subjectId !== actor.subjectId) reject();
    const result = await executeManualRecovery(db,actor,authenticatedProfile.instanceId,authenticatedProfile.accountId,dossier.evidence,dossier.review,proposal,head,digest);
    writeJson(join(directory,'after.json'),{...result,head,sha256:digest,completedAt:new Date().toISOString()});
    return {historyUnchanged:result.historyUnchanged,counts:result.counts,financialEligibility:false,stripeRequests:0};
  } finally { await db.$disconnect(); }
}
export async function manualPlan(id: string) {
  guardManualRecoveryProcess();
  const directory = operationDirectory(id), head = cleanHead(), local = await loadManualRecoveryProfile();
  if (!local.migrationInstalled) reject();
  const after: unknown = JSON.parse(readLimited(join(directory,'after.json')));
  if (!record(after) || typeof after.successorId !== 'string' || after.head !== head || after.historyUnchanged !== true) reject();
  const db = createDatabase(local.databaseUrl);
  try {
    const plan = await manualRecoveryTransaction(db,{subjectId:local.identity.subjectId},local.instanceId,local.accountId,true,
      (tx) => readRecoveryPlan(tx,{subjectId:local.identity.subjectId},local.instanceId,String(after.successorId),head,new Date(Date.now()+3600000).toISOString()));
    writeJson(join(directory,'plan-v2.json'),plan);
    return {sha256:recoveryPlanDigest(plan),readyForExternalCalls:false,maxRequests:2,maxSessions:1,financialEligibility:false,stripeRequests:0};
  } finally { await db.$disconnect(); }
}
