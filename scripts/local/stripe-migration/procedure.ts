import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { manualInstance } from './instance.ts';
import { snapshot, sameEvidence, migrations, counts, schemaDigest, type Evidence } from './database.ts';
import { auditedProfile, validateMigrationHistory, cleanHead, blocked } from './manifest.ts';
import { backupRoot, bundlePath, privatePath, protectDirectory, writeJson, fileDigest } from './private-files.ts';
import { backupDatabase, testRestore } from './backup.ts';
import { applyOnlyApproved } from './apply.ts';
import { readHiddenStripeValue } from '../stripe-hidden-input.ts';
import { guardManualProcess } from '../stripe-manual/files.ts';
import { migrationStep, migrationTask } from './stages.ts';

interface Preflight {
  profile?: string;
  version: number; id: string; head: string; createdAt: string; migration: string; migrationSha256: string;
  identity: Awaited<ReturnType<typeof manualInstance>>['identity']; before: Evidence; schema: string;
  archive: { database: string; globals: string };
  restore: { restored: boolean; isolated: boolean; migrationTested: boolean };
  sourceUnchanged: boolean; manualRecoveryEnabled: boolean; stripeRequests: number;
}

export async function inspect(profile = auditedProfile) {
  const instance = await migrationTask('INSTANCE', () => manualInstance());
  migrationStep('MIGRATION_HISTORY', () => validateMigrationHistory(migrations(instance.target),profile));
  const before = migrationStep('SOURCE_SNAPSHOT', () => snapshot(instance.target));
  const financial = counts(before);
  if (financial.scenarios !== 1 || financial.submissions !== 1 || financial.events !== 0) blocked('MANUAL_HISTORY_MISMATCH');
  return { ...instance, before, schema: migrationStep('SOURCE_SCHEMA', () => schemaDigest(instance.target)) };
}
export function sanitized(before: ReturnType<typeof snapshot>, profile = auditedProfile) {
  return { counts: counts(before), pendingMigration: profile.migration, migrationSha256: profile.digest,
    instanceVerified: true, migrationApplied: false, manualRecoveryEnabled: false, stripeRequests: 0 };
}
export async function prepare(profile = auditedProfile) {
  const head = migrationStep('CHECKOUT', () => cleanHead()), initial = await inspect(profile), id = randomUUID();
  const directory = migrationStep('PRIVATE_DIRECTORY', () => {
    protectDirectory(backupRoot);
    const path = bundlePath(id);
    if (existsSync(path)) blocked('BACKUP_ALREADY_EXISTS');
    protectDirectory(path);
    return path;
  });
  const archive = backupDatabase(initial.target, directory);
  migrationStep('SOURCE_RECHECK', () => sameEvidence(initial.before, snapshot(initial.target)));
  const restore = await testRestore(initial.identity.image, directory, initial.before, initial.schema,profile);
  await migrationTask('FINAL_RECHECK', async () => {
    const final = await inspect(profile);
    if (JSON.stringify(initial.identity) !== JSON.stringify(final.identity) || initial.schema !== final.schema || cleanHead() !== head) blocked('INSTANCE_OR_HEAD_CHANGED');
    sameEvidence(initial.before, final.before);
  });
  const preflight = { version: 1, profile:profile.key, id, head, createdAt: new Date().toISOString(), migration:profile.migration, migrationSha256:profile.digest,
    identity: initial.identity, before: initial.before, schema: initial.schema, archive, restore, sourceUnchanged: true, manualRecoveryEnabled: false, stripeRequests: 0 };
  const path = join(directory, 'preflight.json');
  const digest = migrationStep('PREFLIGHT_WRITE', () => { writeJson(path, preflight); return fileDigest(path); });
  return { ...sanitized(initial.before,profile), preflightId: id, preflightSha256: digest, backupRestored: true,
    sourceUnchanged: true, disposableMigrationTested: true };
}
export interface Approval {
  version: number; operation: string; authorized: boolean; head: string; preflightSha256: string;
  migrationSha256: string; expiresAt: string;
}
export async function verifyBackup(id: string, digest: string, profile = auditedProfile) {
  guardManualProcess();
  if (!/^[a-f0-9]{64}$/.test(digest)) blocked('PREFLIGHT_DIGEST_MISMATCH');
  const directory = bundlePath(id), path = join(directory,'preflight.json');
  if (fileDigest(path) !== digest) blocked('PREFLIGHT_DIGEST_MISMATCH');
  const plan = JSON.parse(readFileSync(path,'utf8')) as Preflight;
  if (plan.version !== 1 || plan.id !== id || plan.migration !== profile.migration || plan.migrationSha256 !== profile.digest
    || (plan.profile ?? auditedProfile.key) !== profile.key
    || fileDigest(join(directory,'postgres.dump')) !== plan.archive.database
    || fileDigest(join(directory,'globals.sql')) !== plan.archive.globals) blocked('BACKUP_DIGEST_MISMATCH');
  await testRestore(plan.identity.image,directory,plan.before,plan.schema,profile);
  return { backupRestored: true, isolated: true, manualDatabaseAccessed: false, stripeRequests: 0 };
}
export function validateApproval(approval: Approval, head: string, digest: string, now = Date.now(), profile = auditedProfile) {
  const expiry = Date.parse(approval.expiresAt);
  if (approval.version !== 1 || approval.operation !== 'apply-single-manual-migration' || approval.authorized !== true
    || approval.head !== head || approval.preflightSha256 !== digest || approval.migrationSha256 !== profile.digest
    || !Number.isFinite(expiry) || expiry <= now || expiry > now + 3600000) blocked('APPLICATION_NOT_AUTHORIZED');
}
export async function apply(id: string, digest: string, profile = auditedProfile) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !/^[a-f0-9]{64}$/.test(digest)) blocked('APPLICATION_NOT_AUTHORIZED');
  guardManualProcess();
  const directory = bundlePath(id), path = join(directory,'preflight.json');
  if (fileDigest(path) !== digest) blocked('PREFLIGHT_DIGEST_MISMATCH');
  const plan = JSON.parse(readFileSync(path,'utf8')) as Preflight;
  const head = cleanHead();
  const approval = JSON.parse(readFileSync(privatePath(join(directory,'approval.json')),'utf8')) as Approval;
  validateApproval(approval, head, digest,Date.now(),profile);
  if (plan.version !== 1 || plan.id !== id || plan.head !== head || plan.migration !== profile.migration
    || (plan.profile ?? auditedProfile.key) !== profile.key
    || plan.migrationSha256 !== profile.digest || !plan.restore.restored || !plan.restore.migrationTested || !plan.restore.isolated
    || !plan.sourceUnchanged || plan.manualRecoveryEnabled !== false || plan.stripeRequests !== 0
    || Date.now() - Date.parse(plan.createdAt) > 86400000 || Date.parse(plan.createdAt) > Date.now()
    || !Number.isFinite(Date.parse(plan.createdAt)) || existsSync(join(directory,'application-started.json')))
    blocked('PREFLIGHT_REJECTED');
  if (fileDigest(join(directory,'postgres.dump')) !== plan.archive.database
    || fileDigest(join(directory,'globals.sql')) !== plan.archive.globals) blocked('BACKUP_DIGEST_MISMATCH');
  const current = await inspect(profile);
  if (JSON.stringify(plan.identity) !== JSON.stringify(current.identity) || plan.schema !== current.schema) blocked('INSTANCE_IDENTITY_CHANGED');
  sameEvidence(plan.before, current.before);
  if (await readHiddenStripeValue('Autorización de migración local (sin eco): ') !== `AUTORIZO MIGRACION LOCAL ${digest}`)
    blocked('APPLICATION_NOT_AUTHORIZED');
  // Revalidate after human input; no data is written before all checks pass.
  validateApproval(approval, cleanHead(), digest,Date.now(),profile);
  const final = await inspect(profile);
  if (JSON.stringify(plan.identity) !== JSON.stringify(final.identity) || plan.schema !== final.schema) blocked('INSTANCE_IDENTITY_CHANGED');
  sameEvidence(plan.before, final.before);
  writeJson(join(directory,'application-started.json'), { head, preflightSha256: digest, startedAt: new Date().toISOString() });
  const after = applyOnlyApproved(final.target, plan.before,profile);
  writeJson(join(directory,'after.json'), { after, completedAt: new Date().toISOString(), manualRecoveryEnabled: false, stripeRequests: 0 });
  return { counts: counts(after), migrationApplied: true, historyUnchanged: true, manualRecoveryEnabled: false, stripeRequests: 0 };
}
