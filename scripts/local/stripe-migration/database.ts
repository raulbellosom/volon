import { execFileSync } from 'node:child_process';
import { docker, systemEnvironment } from '../stripe-manual/files.ts';
import { blocked, sha, type AppliedMigration } from './manifest.ts';

export interface Target { readonly container: string; readonly user: string; readonly socket?: '/tmp' }
export function pgArgs(target: Target, command: string, args: string[] = [], readOnly = true) {
  return ['exec', '-i', ...(readOnly ? ['-e', 'PGOPTIONS=-c default_transaction_read_only=on'] : []), target.container,
    command, ...(target.socket ? ['-h', target.socket] : []), '-U', target.user, ...args];
}
export function sql(target: Target, body: string, readOnly = true): string {
  return execFileSync('docker', pgArgs(target, 'psql', ['-X', '-qAt', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], readOnly),
    { input: body, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], env: systemEnvironment(), timeout: 120000, maxBuffer: 32 * 1024 * 1024 }).trim();
}
export const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
export const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'";
export interface TableEvidence { schema: string; name: string; count: number; digest: string }
export interface Evidence { tables: TableEvidence[]; roles: string; memberships: string; blobs: string; sequences: unknown[] }
export function schemaDigest(target: Target) {
  const body = execFileSync('docker', pgArgs(target,'pg_dump',['-d','postgres','--schema-only','--create','--quote-all-identifiers']),
    { encoding:'utf8', stdio:['ignore','pipe','pipe'], env:systemEnvironment(), timeout:120000, maxBuffer:32 * 1024 * 1024 });
  return sha(canonicalSchema(body));
}
export function canonicalSchema(body: string) {
  // Only PostgreSQL's known, lossless reparse of this legacy CHECK is canonicalized.
  // Every operand, type and bound remains literal; other schema differences fail closed.
  const nested = "    CONSTRAINT \"branch_coordinates\" CHECK ((((\"latitude\" >= ('-90'::integer)::double precision) AND (\"latitude\" <= (90)::double precision)) AND ((\"longitude\" >= ('-180'::integer)::double precision) AND (\"longitude\" <= (180)::double precision))))";
  const flat = "    CONSTRAINT \"branch_coordinates\" CHECK (((\"latitude\" >= ('-90'::integer)::double precision) AND (\"latitude\" <= (90)::double precision) AND ((\"longitude\" >= ('-180'::integer)::double precision) AND (\"longitude\" <= (180)::double precision))))";
  // The psql restriction nonce is generated per dump, not a schema object.
  return body.split('\n').filter((line) => !/^\\(?:un)?restrict /.test(line))
    .map((line) => line === nested ? flat : line).join('\n');
}
export function tableExpression(schema: string, name: string, filter = '') {
  return `(SELECT jsonb_build_object('schema',${literal(schema)},'name',${literal(name)},'count',count(*),
    'digest',encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex'),'' ORDER BY
    encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')),''),'UTF8')),'hex')) FROM ${quote(schema)}.${quote(name)} t${filter})`;
}
export function snapshot(target: Target): Evidence {
  const tables = JSON.parse(sql(target, `SELECT coalesce(json_agg(json_build_object('schema',n.nspname,'name',c.relname)
    ORDER BY n.nspname,c.relname),'[]') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname !~ '^pg_toast'`)) as {schema: string; name: string}[];
  const fingerprint = (query: string) => `encode(sha256(convert_to((${query}), 'UTF8')),'hex')`;
  const sequences = JSON.parse(sql(target, `SELECT coalesce(json_agg(json_build_object('schema',schemaname,'name',sequencename)
    ORDER BY schemaname,sequencename),'[]') FROM pg_sequences`)) as {schema:string;name:string}[];
  return JSON.parse(sql(target, `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
    SELECT jsonb_build_object('tables',jsonb_build_array(${tables.map((t) => tableExpression(t.schema,t.name)).join(',')}),
    'roles',${fingerprint(`SELECT coalesce(jsonb_agg(to_jsonb(r) - 'oid' ORDER BY rolname)::text,'[]') FROM pg_authid r WHERE rolname <> 'migration_restore'`)},
    'memberships',${fingerprint(`SELECT coalesce(jsonb_agg(jsonb_build_array(a.rolname,b.rolname,
      CASE WHEN m.grantor=10 AND a.rolname ~ '^pg_' AND b.rolname ~ '^pg_' THEN '@initdb' ELSE g.rolname END,
      m.admin_option,m.inherit_option,m.set_option) ORDER BY a.rolname,b.rolname,g.rolname)::text,'[]')
      FROM pg_auth_members m JOIN pg_roles a ON a.oid=m.roleid JOIN pg_roles b ON b.oid=m.member JOIN pg_roles g ON g.oid=m.grantor`)},
    'blobs',${fingerprint(`SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY loid,pageno)::text,'[]') FROM pg_largeobject b`)},
    'sequences',jsonb_build_array(${sequences.map((s) => `(SELECT jsonb_build_array(${literal(s.schema)},${literal(s.name)},last_value,is_called) FROM ${quote(s.schema)}.${quote(s.name)})`).join(',')}));
    COMMIT;`)) as Evidence;
}
export function sameEvidence(left: Evidence, right: Evidence) {
  for (const key of ['tables','roles','memberships','blobs','sequences'] as const)
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) blocked('DATABASE_FINGERPRINT_MISMATCH_' + key.toUpperCase());
}
export function counts(evidence: Evidence) {
  const count = (name: string) => evidence.tables.find((table) => table.schema === 'app' && table.name === name)?.count ?? blocked('FINANCIAL_TABLE_MISSING');
  return { scenarios: count('StripeSandboxScenario'), submissions: count('StripeSandboxSubmission'), events: count('StripeSandboxEvent') };
}
export function migrations(target: Target): AppliedMigration[] {
  return JSON.parse(sql(target, `SELECT coalesce(json_agg(row_to_json(m) ORDER BY migration_name),'[]') FROM app._prisma_migrations m`));
}
export function imageOf(container: string): string {
  return docker(['inspect', '--format', '{{.Image}}', container]).trim();
}
