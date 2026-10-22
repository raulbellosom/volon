import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { run } from '../stripe-manual/files.ts';

export const migration = '20261022034450_stripe_sandbox_audited_recovery';
export const approvedHead = 'a49226790ffe86d5eedbd2f1d26c616eef7665dd';
export const approvedDigest = '00fa1a5bb12229b2af01a91b53a07fcfdb5694b3bb65647834cfeb31aa5eb073';
export const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export class MigrationProcedureFailure extends Error {}
export function blocked(reason: string): never { throw new MigrationProcedureFailure(reason); }
export function approvedSql() {
  const path = `prisma/migrations/${migration}/migration.sql`;
  const sql = run('git', ['show', `HEAD:${path}`]);
  const approved = run('git', ['show', `${approvedHead}:${path}`]);
  if (sha(sql) !== approvedDigest || sql !== approved
    || readFileSync(path, 'utf8').replaceAll('\r\n', '\n') !== sql) blocked('MIGRATION_DIGEST_MISMATCH');
  return sql;
}
export interface AppliedMigration {
  migration_name: string; checksum: string; finished_at: string | null; rolled_back_at: string | null;
}
export function validateMigrationHistory(applied: readonly AppliedMigration[]) {
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
  if (names.filter((name) => !applied.some((row) => row.migration_name === name)).join() !== migration)
    blocked('PENDING_MIGRATIONS_MISMATCH');
  approvedSql();
}
export function cleanHead() {
  if (run('git', ['status', '--porcelain']).trim()) blocked('DIRTY_CHECKOUT');
  return run('git', ['rev-parse', 'HEAD']).trim();
}
