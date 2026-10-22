import { readFileSync } from 'node:fs';
import { createDatabase } from '../../../apps/api/src/infrastructure/database.ts';
import { assertLocalStripeTerminal } from '../../../apps/api/src/infrastructure/stripe-test/https-policy.ts';
import { RecoveryFailure } from '../../../apps/api/src/infrastructure/stripe-test/recovery-contract.ts';
import { manualInstance } from '../stripe-migration/instance.ts';
import { readPrivateEnv } from '../stripe-manual/files.ts';
import { readProvenance } from '../stripe-manual/identity.ts';
import { readStripeFixtureIdentity } from '../stripe-fixture-store.ts';
import { run } from '../stripe-manual/files.ts';
import { sha, approvedDigest, migration as previousMigration, validateAppliedMigrations, manualRecoveryProfile } from '../stripe-migration/manifest.ts';

export const manualMigration = manualRecoveryProfile.migration;
export const manualMigrationDigest = manualRecoveryProfile.digest;
export function guardManualRecoveryProcess() {
  try { assertLocalStripeTerminal(process.env,!!process.stdin.isTTY && !!process.stdout.isTTY); }
  catch { throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED'); }
}
export async function loadManualRecoveryProfile() {
  guardManualRecoveryProcess();
  const local = await manualInstance(), file = readPrivateEnv('.env.stripe-manual.local'), provenance = readProvenance();
  const admin = createDatabase(file.MIGRATION_DATABASE_URL ?? '');
  try {
    const data = await admin.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const identity = await readStripeFixtureIdentity(tx,'dry-run');
      const rows = await tx.$queryRaw<{migration_name:string;checksum:string;finished_at:Date|null;rolled_back_at:Date|null}[]>`
        SELECT migration_name,checksum,finished_at,rolled_back_at FROM app._prisma_migrations ORDER BY migration_name`;
      const old = rows.filter((r) => r.migration_name === previousMigration), next = rows.filter((r) => r.migration_name === manualMigration);
      const names = validateAppliedMigrations(rows);
      if (names.filter((name) => !rows.some((row) => row.migration_name === name)).join() !== (next.length ? '' : manualMigration))
        throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
      if (old.length !== 1 || old[0]?.checksum !== approvedDigest || !old[0].finished_at || old[0].rolled_back_at
        || rows.some((r) => !r.finished_at || r.rolled_back_at) || next.length > 1
        || (next.length === 1 && next[0]?.checksum !== manualMigrationDigest)) throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
      const [functions] = await tx.$queryRaw<{count:number}[]>`SELECT
        ((to_regprocedure('stripe_recovery_private.manual_ready(uuid,text)') IS NOT NULL)::int
        +(to_regprocedure('stripe_recovery_private.manual_catalog_digest()') IS NOT NULL)::int
        +(to_regprocedure('stripe_recovery_private.manual_prepare(uuid,jsonb,jsonb,text,text)') IS NOT NULL)::int) AS count`;
      if (functions?.count !== (next.length ? 3 : 0)) throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
      if (next.length) {
        const [ready] = await tx.$queryRaw<{safe:boolean}[]>`SELECT stripe_recovery_private.manual_ready(${provenance.instanceId}::uuid,${provenance.accountId}) AS safe`;
        if (!ready?.safe) throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
      }
      const sqlPath = `prisma/migrations/${manualMigration}/migration.sql`;
      const sql = run('git',['show',`HEAD:${sqlPath}`]);
      if (sha(sql) !== manualMigrationDigest || readFileSync(sqlPath,'utf8').replaceAll('\r\n','\n') !== sql)
        throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
      const counts = {scenarios:await tx.stripeSandboxScenario.count(),submissions:await tx.stripeSandboxSubmission.count(),events:await tx.stripeSandboxEvent.count(),
        decisions:await tx.stripeSandboxRecoveryDecision.count(),successors:await tx.stripeSandboxSuccessor.count()};
      if (counts.scenarios !== 1 || counts.submissions !== 1 || await tx.stripeSandboxRecoveryLab.count() !== 0)
        throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
      return {identity,counts,migrationInstalled:next.length===1};
    },{isolationLevel:'RepeatableRead'});
    return { ...data,instanceId:provenance.instanceId,accountId:provenance.accountId,identityDigest:sha(JSON.stringify(local.identity)),
      databaseUrl:file.DATABASE_URL ?? '',publishableKey:file.SUPABASE_PUBLISHABLE_KEY ?? '',password:file.SYNTHETIC_USER_PASSWORD ?? '' };
  } finally { await admin.$disconnect(); }
}
