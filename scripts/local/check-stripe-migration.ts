import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { docker, systemEnvironment } from './stripe-manual/files.ts';
import { disposableCluster, backupDatabase, testRestore, restoreDatabase } from './stripe-migration/backup.ts';
import { sql, snapshot, schemaDigest, sameEvidence, migrations, literal, pgArgs, type Target } from './stripe-migration/database.ts';
import { protectDirectory, bundlePath } from './stripe-migration/private-files.ts';
import { migration, sha, validateMigrationHistory } from './stripe-migration/manifest.ts';
import { applyOnlyApproved, applicationSql } from './stripe-migration/apply.ts';
import { migrationFailureMessage } from './stripe-migration/stages.ts';

// Entirely synthetic clusters. Never calls manualInstance(), loads private env or publishes ports.
let stage = 'disposable-cluster';
function compete(target: Target, body: string) {
  return new Promise<void>((resolve,reject) => {
    const child = execFile('docker', pgArgs(target,'psql',['-X','-qAt','-d','postgres','-v','ON_ERROR_STOP=1'],false),
      {env:systemEnvironment(),timeout:120000}, (error) => error ? reject(new Error('COMPETING_APPLICATION_REJECTED')) : resolve());
    child.stdin?.end(body);
  });
}
try {
  const image = docker(['image','inspect','public.ecr.aws/supabase/postgres:17.11.0.004','--format','{{.Id}}']).trim();
  await disposableCluster(image, async (source) => {
    sql(source, 'CREATE ROLE postgres SUPERUSER LOGIN; CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA extensions;', false);
    sql(source, `CREATE TABLE public.restore_canary(id INTEGER PRIMARY KEY, value TEXT);
      INSERT INTO public.restore_canary VALUES (1,'entire database');
      CREATE SEQUENCE public.restore_sequence; SELECT nextval('public.restore_sequence');
      CREATE SCHEMA auth; CREATE TABLE auth.synthetic_canary(id INTEGER PRIMARY KEY, value TEXT);
      INSERT INTO auth.synthetic_canary VALUES (1,'synthetic only');`, false);
    const names = readdirSync('prisma/migrations',{withFileTypes:true}).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    for (const name of names.filter((n) => n < migration)) sql(source, readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8'), false);
    sql(source, `CREATE TABLE app._prisma_migrations(id VARCHAR(36) PRIMARY KEY,checksum VARCHAR(64) NOT NULL,
      finished_at TIMESTAMPTZ,migration_name VARCHAR(255) NOT NULL,logs TEXT,rolled_back_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),applied_steps_count INTEGER NOT NULL DEFAULT 0);`, false);
    for (const name of names.filter((n) => n < migration))
      sql(source, `INSERT INTO app._prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count)
        VALUES(${literal(randomUUID())},${literal(sha(readFileSync(`prisma/migrations/${name}/migration.sql`)))},now(),${literal(name)},1)`, false);
    const fixture = readFileSync('scripts/local/fixtures/stripe-recovery.sql','utf8').split('UPDATE app.')[0];
    if (!fixture) throw Error('Fixture missing');
    sql(source, fixture + `
      CREATE SCHEMA local_control;
      CREATE TABLE local_control."Environment"("instanceId" UUID,purpose TEXT,"accountId" TEXT,"systemIdentifier" TEXT);
      INSERT INTO local_control."Environment" SELECT '11111111-1111-4111-8111-111111111111','manual-stripe-test-v1','acct_offline',system_identifier::text FROM pg_control_system();`, false);
    // The old command must now reject the additional, independently reviewed manual migration.
    assert.throws(() => validateMigrationHistory(migrations(source)),/PENDING_MIGRATIONS_MISMATCH/);
    const before = snapshot(source), schema = schemaDigest(source);
    const directory = bundlePath(randomUUID(),'test'); protectDirectory(directory);
    stage = 'private-backup-and-restore';
    backupDatabase(source, directory);
    const restored = await testRestore(image,directory,before,schema);
    assert.equal(restored.restored,true);
    sameEvidence(before,snapshot(source));
    stage = 'sanitized-restore-failures';
    // Corrupt only new synthetic bundles. Existing backups and the source stay intact.
    const broken = bundlePath(randomUUID(),'test'); protectDirectory(broken);
    writeFileSync(`${broken}/globals.sql`, 'SYNTHETIC_INVALID_SQL_PRIVATE_CANARY;', {flag:'wx',mode:0o600});
    await assert.rejects(() => testRestore(image,broken,before,schema), (error: unknown) => {
      const message = migrationFailureMessage(error);
      assert.match(message,/STAGE=RESTORE_GLOBALS; LOCAL_STEP_FAILED/);
      assert.doesNotMatch(message,/PRIVATE_CANARY|\.sql|postgres:|psql/);
      return true;
    });
    const changed = structuredClone(before);
    const first = changed.tables[0];
    if (!first) throw Error('SYNTHETIC_TABLE_MISSING');
    first.digest = '0'.repeat(64);
    await assert.rejects(() => testRestore(image,directory,changed,schema), (error: unknown) => {
      assert.match(migrationFailureMessage(error),/STAGE=RESTORE_FINGERPRINT; DATABASE_FINGERPRINT_MISMATCH_TABLES/);
      return true;
    });
    stage = 'rollback-and-history-guard';
    await disposableCluster(image, async (copy) => {
      restoreDatabase(copy,directory);
      const body = applicationSql(before);
      // Failure after DDL/bookkeeping, before commit: everything rolls back.
      assert.throws(() => sql(copy,body.replace(/COMMIT;\s*$/, "DO $$ BEGIN RAISE EXCEPTION 'synthetic interruption'; END $$; COMMIT;"),false));
      sameEvidence(before,snapshot(copy));
      // A changed row with identical counts is rejected inside the transaction.
      sql(copy, `UPDATE public.restore_canary SET value='changed' WHERE id=1`,false);
      assert.throws(() => applyOnlyApproved(copy,before));
      assert.equal(sql(copy, `SELECT to_regclass('app."StripeSandboxSuccessor"') IS NULL`),'t');
      sql(copy, `UPDATE public.restore_canary SET value='entire database' WHERE id=1`,false);
      const outcomes = await Promise.allSettled([compete(copy,applicationSql(before)),compete(copy,applicationSql(before))]);
      assert.equal(outcomes.filter((o) => o.status === 'fulfilled').length,1);
      assert.throws(() => applyOnlyApproved(copy,before));
      assert.equal(sql(copy, `SELECT count(*) FROM app._prisma_migrations WHERE migration_name=${literal(migration)}`),'1');
      assert.equal(sql(copy, `SELECT stripe_recovery_private.lab_ready('11111111-1111-4111-8111-111111111111')`),'f');
    });
    sameEvidence(before,snapshot(source));
    assert.equal(schemaDigest(source),schema);
    console.log('Backup completo, roles/ACL/RLS/funciones/Auth/secuencias, restauración aislada, migración única, rollback, duplicación y conservación histórica: correctos. Stripe requests=0.');
    // Synthetic backups remain private, just like a real operational bundle; no CI upload.
  }, 'migration_fixture_owner');
} catch (error) {
  const reason = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'DATABASE_STEP_FAILED';
  console.error(`DISPOSABLE_MIGRATION_TEST_FAILED (${stage}/${reason}); no se imprime SQL ni contenido privado.`);
  process.exitCode = 1;
}
