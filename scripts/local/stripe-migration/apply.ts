import { randomUUID } from 'node:crypto';
import { approvedSql, migration, approvedDigest, blocked } from './manifest.ts';
import { sql, snapshot, tableExpression, quote, literal, type Target, type Evidence } from './database.ts';

export const addedTables = ['StripeSandboxRecoveryLab','StripeSandboxRecoveryDecision','StripeSandboxSuccessor'];
function assertTable(schema: string, name: string, expected: unknown, excludeMigration = false) {
  const expression = tableExpression(schema, name, excludeMigration ? ` WHERE t.migration_name <> ${literal(migration)}` : '');
  return `IF ${expression} IS DISTINCT FROM ${literal(JSON.stringify(expected))}::jsonb THEN
    RAISE EXCEPTION 'DATABASE_FINGERPRINT_MISMATCH'; END IF;`;
}
export function applicationSql(before: Evidence) {
  const approved = approvedSql();
  if (!approved.startsWith('BEGIN;\n') || !approved.endsWith('COMMIT;\n')) blocked('MIGRATION_BOUNDARY_MISMATCH');
  const body = approved.slice('BEGIN;\n'.length, -'COMMIT;\n'.length);
  const assertions = (after: boolean) => before.tables.map((table) => assertTable(table.schema,table.name,table,
    after && table.schema === 'app' && table.name === '_prisma_migrations')).join('\n');
  const locks = before.tables.map((table) => `${quote(table.schema)}.${quote(table.name)}`).join(',');
  const inventory = (after: boolean) => {
    const expected = before.tables.map((t) => [t.schema,t.name]);
    if (after) expected.push(...addedTables.map((name) => ['app',name]));
    expected.sort((a,b) => (a.join('\u0000') < b.join('\u0000') ? -1 : 1));
    return `IF (SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname) ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C")
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p')
      AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname !~ '^pg_toast')
      IS DISTINCT FROM ${literal(JSON.stringify(expected))}::jsonb THEN RAISE EXCEPTION 'TABLE_INVENTORY_MISMATCH'; END IF;`;
  };
  return `BEGIN;
    SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '90s';
    SELECT pg_advisory_xact_lock(7272641026);
    LOCK TABLE ${locks} IN SHARE MODE;
    LOCK TABLE app._prisma_migrations IN EXCLUSIVE MODE;
    DO $$ BEGIN ${inventory(false)} ${assertions(false)} END $$;
    ${body}
    INSERT INTO app._prisma_migrations (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
      VALUES (${literal(randomUUID())},${literal(approvedDigest)},clock_timestamp(),${literal(migration)},NULL,NULL,current_timestamp,1);
    DO $$ BEGIN ${inventory(true)} ${assertions(true)}
      ${addedTables.map((table) => `IF (SELECT count(*) FROM app.${quote(table)}) <> 0 THEN RAISE EXCEPTION 'RECOVERY_NOT_EMPTY'; END IF;`).join('\n')}
      IF stripe_recovery_private.lab_ready((SELECT "instanceId" FROM local_control."Environment"))
        THEN RAISE EXCEPTION 'MANUAL_RECOVERY_MUST_REMAIN_BLOCKED'; END IF;
    END $$;
    COMMIT;`;
}
export function verifyAfter(before: Evidence, after: Evidence) {
  if (after.roles !== before.roles || after.memberships !== before.memberships || after.blobs !== before.blobs
    || JSON.stringify(after.sequences) !== JSON.stringify(before.sequences)
    || after.tables.length !== before.tables.length + addedTables.length) blocked('POST_MIGRATION_MISMATCH');
  for (const original of before.tables) {
    const row = after.tables.find((t) => t.schema === original.schema && t.name === original.name);
    if (!row || (row.name === '_prisma_migrations' ? row.count !== original.count + 1 : JSON.stringify(row) !== JSON.stringify(original)))
      blocked('POST_MIGRATION_MISMATCH');
  }
  for (const name of addedTables)
    if (after.tables.find((t) => t.schema === 'app' && t.name === name)?.count !== 0) blocked('RECOVERY_NOT_EMPTY');
}
export function applyOnlyApproved(target: Target, before: Evidence) {
  // This function is exercised only on disposable targets in this implementation cut.
  sql(target, applicationSql(before), false);
  const after = snapshot(target);
  verifyAfter(before, after);
  return after;
}
