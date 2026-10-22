import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { run } from '../stripe-manual/files.ts';

export const migration = '20261022034450_stripe_sandbox_audited_recovery';
export const approvedHead = 'a49226790ffe86d5eedbd2f1d26c616eef7665dd';
export const approvedDigest = '00fa1a5bb12229b2af01a91b53a07fcfdb5694b3bb65647834cfeb31aa5eb073';
export interface MigrationProfile {
  readonly key: 'audited-recovery' | 'manual-recovery'; readonly migration: string; readonly digest: string;
  readonly sourceCommit: string; readonly addedTables: readonly string[];
}
export const auditedProfile: MigrationProfile = Object.freeze({key:'audited-recovery',migration,digest:approvedDigest,sourceCommit:approvedHead,
  addedTables:Object.freeze(['StripeSandboxRecoveryLab','StripeSandboxRecoveryDecision','StripeSandboxSuccessor'])});
export const manualRecoveryProfile: MigrationProfile = Object.freeze({key:'manual-recovery',migration:'20261022055840_stripe_sandbox_manual_recovery',
  digest:'e1005213f757ed166ec075853e85df109ef67f5db0ed049082455257aa22cad4',sourceCommit:'bcef53671adf8f26ccda2a29f07efb1debce4115',addedTables:Object.freeze([])});
export function migrationProfile(key: string): MigrationProfile {
  if (key === auditedProfile.key) return auditedProfile;
  if (key === manualRecoveryProfile.key) return manualRecoveryProfile;
  return blocked('MIGRATION_PROFILE_REJECTED');
}
export const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export class MigrationProcedureFailure extends Error {}
export function blocked(reason: string): never { throw new MigrationProcedureFailure(reason); }
export function approvedSql(profile = auditedProfile) {
  if (migrationProfile(profile.key) !== profile) blocked('MIGRATION_PROFILE_REJECTED');
  const path = `prisma/migrations/${profile.migration}/migration.sql`;
  const sql = run('git', ['show', `HEAD:${path}`]);
  const approved = run('git', ['show', `${profile.sourceCommit}:${path}`]);
  if (sha(sql) !== profile.digest || sql !== approved
    || readFileSync(path, 'utf8').replaceAll('\r\n', '\n') !== sql) blocked('MIGRATION_DIGEST_MISMATCH');
  return sql;
}
export interface AppliedMigration {
  migration_name: string; checksum: string; finished_at: string | Date | null; rolled_back_at: string | Date | null;
}
export function validateAppliedMigrations(applied: readonly AppliedMigration[]) {
  const names = readdirSync('prisma/migrations', { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (new Set(applied.map((row) => row.migration_name)).size !== applied.length) blocked('MIGRATION_HISTORY_MISMATCH');
  for (const row of applied) {
    if (!names.includes(row.migration_name) || !row.finished_at || row.rolled_back_at) blocked('MIGRATION_HISTORY_MISMATCH');
    const path = `prisma/migrations/${row.migration_name}/migration.sql`;
    const git = run('git', ['show', `HEAD:${path}`]);
    const work = readFileSync(path, 'utf8');
    if (work.replaceAll('\r\n', '\n') !== git || ![sha(git), sha(work)].includes(row.checksum)) blocked('MIGRATION_HISTORY_MISMATCH');
  }
  return names;
}
export function validateMigrationHistory(applied: readonly AppliedMigration[], profile = auditedProfile) {
  const names = validateAppliedMigrations(applied);
  if (names.filter((name) => !applied.some((row) => row.migration_name === name)).join() !== profile.migration)
    blocked('PENDING_MIGRATIONS_MISMATCH');
  approvedSql(profile);
}
export function cleanHead() {
  if (run('git', ['status', '--porcelain']).trim()) blocked('DIRTY_CHECKOUT');
  return run('git', ['rev-parse', 'HEAD']).trim();
}
