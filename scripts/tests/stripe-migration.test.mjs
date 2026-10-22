import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { approvedSql, approvedDigest, sha, validateMigrationHistory, migration, manualRecoveryProfile, migrationProfile } from '../local/stripe-migration/manifest.ts';
import { sameEvidence, counts, canonicalSchema } from '../local/stripe-migration/database.ts';
import { validateApproval } from '../local/stripe-migration/procedure.ts';
import { bundlePath, privatePath } from '../local/stripe-migration/private-files.ts';

test('migration SQL is the exact approved Git blob, with a pinned digest', () => {
  assert.equal(sha(approvedSql()), approvedDigest);
  assert.throws(() => validateMigrationHistory([]), /PENDING_MIGRATIONS_MISMATCH/);
  assert.throws(() => validateMigrationHistory([{ migration_name:migration, checksum:'0'.repeat(64), finished_at:null, rolled_back_at:null }]), /MIGRATION_HISTORY_MISMATCH/);
});

test('manual function migration has an independent fixed manifest and cannot reuse the older approval',()=>{
  assert.equal(sha(approvedSql(manualRecoveryProfile)),manualRecoveryProfile.digest);
  assert.notEqual(manualRecoveryProfile.digest,approvedDigest);
  assert.throws(()=>migrationProfile('../../arbitrary.sql'),/MIGRATION_PROFILE_REJECTED/);
  assert.throws(()=>approvedSql({...manualRecoveryProfile,digest:'0'.repeat(64)}),/MIGRATION_PROFILE_REJECTED/);
  const head='a'.repeat(40),digest='b'.repeat(64),now=Date.now();
  const auth={version:1,operation:'apply-single-manual-migration',authorized:true,head,preflightSha256:digest,
    migrationSha256:approvedDigest,expiresAt:new Date(now+60000).toISOString()};
  assert.throws(()=>validateApproval(auth,head,digest,now,manualRecoveryProfile),/APPLICATION_NOT_AUTHORIZED/);
  assert.doesNotThrow(()=>validateApproval({...auth,migrationSha256:manualRecoveryProfile.digest},head,digest,now,manualRecoveryProfile));
});

test('independent approval binds HEAD, preflight, SQL and a maximum one hour window', () => {
  const now = Date.now(), head = 'a'.repeat(40), digest = 'b'.repeat(64);
  const approval = { version:1, operation:'apply-single-manual-migration', authorized:true, head,
    preflightSha256:digest, migrationSha256:approvedDigest, expiresAt:new Date(now + 60000).toISOString() };
  assert.doesNotThrow(() => validateApproval(approval, head, digest, now));
  for (const patch of [{version:2},{authorized:false},{head:'c'.repeat(40)},{preflightSha256:'d'.repeat(64)},
    {migrationSha256:'e'.repeat(64)},{operation:'recover'},{expiresAt:'invalid'},
    {expiresAt:new Date(now).toISOString()},{expiresAt:new Date(now+3600001).toISOString()}])
    assert.throws(() => validateApproval({...approval,...patch},head,digest,now), /APPLICATION_NOT_AUTHORIZED/);
});

test('complete row fingerprints detect changes even when financial counts stay equal', () => {
  const before = {tables:[{schema:'app',name:'StripeSandboxSubmission',count:1,digest:'a'.repeat(64)}],roles:'r',memberships:'m',blobs:'b',sequences:[]};
  assert.doesNotThrow(() => sameEvidence(before,structuredClone(before)));
  assert.throws(() => sameEvidence(before,{...before,tables:[{...before.tables[0],digest:'b'.repeat(64)}]}), /DATABASE_FINGERPRINT_MISMATCH/);
  assert.throws(() => counts(before), /FINANCIAL_TABLE_MISSING/);
});

test('private paths reject traversal and bundle IDs cannot name arbitrary destinations', () => {
  assert.throws(() => bundlePath('../../outside'), /PREFLIGHT_ID_REJECTED/);
  assert.throws(() => privatePath('docs/backup.sql'), /PRIVATE_PATH_REJECTED/);
  assert.throws(() => privatePath('.local/stripe-manual/../../public.sql'), /PRIVATE_PATH_REJECTED/);
});

test('schema comparison ignores only psql nonces and the exact known PostgreSQL CHECK reparse', () => {
  assert.equal(canonicalSchema('\\restrict random\nCREATE TABLE x();\n\\unrestrict random'), 'CREATE TABLE x();');
  const nested = "    CONSTRAINT \"branch_coordinates\" CHECK ((((\"latitude\" >= ('-90'::integer)::double precision) AND (\"latitude\" <= (90)::double precision)) AND ((\"longitude\" >= ('-180'::integer)::double precision) AND (\"longitude\" <= (180)::double precision))))";
  const flat = nested.replace('CHECK ((((','CHECK (((').replace('(90)::double precision)) AND','(90)::double precision) AND');
  assert.equal(canonicalSchema(nested),canonicalSchema(flat));
  assert.notEqual(canonicalSchema(nested.replace('(180)','(181)')),canonicalSchema(flat));
  assert.notEqual(canonicalSchema('GRANT SELECT ON x TO y;'),canonicalSchema('GRANT ALL ON x TO y;'));
});

test('CI/cloud, non-TTY application and invalid commands fail without leaking inherited secrets', () => {
  const canary='rk_test_MIGRATION_CANARY_NEVER_PRINT';
  for (const args of [['--inspect'],['--prepare'],['--apply','11111111-1111-4111-8111-111111111111','a'.repeat(64)],['--deploy']]) {
    const result = spawnSync(process.execPath,['--experimental-strip-types','scripts/local/stripe-migration.ts',...args],
      {encoding:'utf8',env:{...process.env,CI:'true',STRIPE_SANDBOX_API_KEY:canary}});
    assert.equal(result.status,1);
    assert.match(result.stderr,/MIGRATION_PROCEDURE_BLOCKED/);
    assert.doesNotMatch(result.stdout+result.stderr,new RegExp(canary));
    assert.equal(result.stdout,'');
  }
});
