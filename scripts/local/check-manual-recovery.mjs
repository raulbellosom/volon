import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { docker,systemEnvironment } from './stripe-manual/files.ts';
import { disposableCluster,backupDatabase,testRestore } from './stripe-migration/backup.ts';
import { sql,pgArgs,snapshot,sameEvidence,schemaDigest,migrations } from './stripe-migration/database.ts';
import { applyOnlyApproved,applicationSql } from './stripe-migration/apply.ts';
import { manualRecoveryProfile,validateMigrationHistory } from './stripe-migration/manifest.ts';
import { bundlePath,protectDirectory } from './stripe-migration/private-files.ts';
import { initializeManualRecoveryFixture,operationFixture,invocation,fixtureIdentity as f } from './fixtures/manual-recovery.mjs';

let stage='isolated-cluster';
function compete(target,body) {
  return new Promise((resolve,reject)=>{
    const child=execFile('docker',pgArgs({...target,user:'delivery_api'},'psql',['-X','-qAt','-d','postgres','-v','ON_ERROR_STOP=1'],false),
      {env:systemEnvironment(),timeout:20000},(error)=>error?reject(Error('REJECTED')):resolve(true));
    child.stdin?.end(body);
  });
}
try {
  const image=docker(['image','inspect','public.ecr.aws/supabase/postgres:17.11.0.004','--format','{{.Id}}']).trim();
  await disposableCluster(image,async(bootstrap)=>{
    stage='fixture-source';
    const target=initializeManualRecoveryFixture(bootstrap,false), runtime={...target,user:'delivery_api'};
    stage='single-new-migration-and-backup-restore';
    const beforeDDL=snapshot(target);
    validateMigrationHistory(migrations(target),manualRecoveryProfile);
    const directory=bundlePath(randomUUID(),'test');protectDirectory(directory);
    backupDatabase(target,directory);
    await testRestore(image,directory,beforeDDL,schemaDigest(target),manualRecoveryProfile);
    const interrupted=applicationSql(beforeDDL,manualRecoveryProfile).replace(/COMMIT;\s*$/,"DO $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_DDL_INTERRUPTION'; END $$; COMMIT;");
    assert.throws(()=>sql(target,interrupted,false));sameEvidence(beforeDDL,snapshot(target));
    applyOnlyApproved(target,beforeDDL,manualRecoveryProfile);
    assert.throws(()=>applyOnlyApproved(target,beforeDDL,manualRecoveryProfile));
    stage='fixture-operation';
    const before=snapshot(target), operation=operationFixture(target);
    const reject=(body,reason)=>{
      assert.throws(()=>sql(target,'BEGIN;'+body+'ROLLBACK;',false),(error)=>{
        const actual=String(error.stderr).match(/ERROR:\s+([A-Z_]{6,})\b/)?.[1] ?? 'DATABASE_ERROR';
        if(!actual.includes(reason)) throw Error('EXPECTED_'+reason+'_GOT_'+actual);
        return true;
      });
      sameEvidence(before,snapshot(target));
    };
    stage='manual-ready';
    assert.equal(sql(target,`SELECT stripe_recovery_private.manual_ready('${f.instance}','${f.account}')`),'t');
    assert.equal(sql(target,`SELECT stripe_recovery_private.lab_ready('${f.instance}')`),'f');
    stage='profile-and-authorization-rejections';
    for(const [patch,reason] of [
      [{evidence:{...operation.evidence,accountId:'acct_foreign'}},'ENVIRONMENT_BLOCKED'],
      [{evidence:{...operation.evidence,scenarioId:'44444444-4444-4444-8444-444444444444'}},'HISTORY_REVIEW_REQUIRED'],
      [{proposal:{...operation.proposal,revision:'c'.repeat(40)}},'APPROVAL_REJECTED'],
      [{proposal:{...operation.proposal,expiresAt:new Date(0).toISOString()}},'APPROVAL_REJECTED'],
      [{review:{...operation.review,noSessionConfirmed:false}},'HISTORY_REVIEW_REQUIRED'],
      [{review:{...operation.review,notInferredFromHttp400:false}},'HISTORY_REVIEW_REQUIRED']]) {
      // The database independently rejects even a direct invocation bypassing TS parsing.
      reject('SET SESSION AUTHORIZATION delivery_api;'+invocation({...operation,...patch}),reason);
    }
    reject('SET SESSION AUTHORIZATION delivery_api;'+invocation(operation,'44444444-4444-4444-8444-444444444444'),'EVIDENCE_REJECTED');
    stage='binding-event-lease-state-and-provenance';
    const prefix='SET SESSION AUTHORIZATION delivery_api;';
    reject('UPDATE local_control."Environment" SET "systemIdentifier"=\'0\';'+prefix+invocation(operation),'ENVIRONMENT_BLOCKED');
    reject('UPDATE local_control."Environment" SET purpose=\'historical-offline\';'+prefix+invocation(operation),'ENVIRONMENT_BLOCKED');
    reject('DELETE FROM local_control."Environment";'+prefix+invocation(operation),'ENVIRONMENT_BLOCKED');
    reject('GRANT INSERT ON app."StripeSandboxSuccessor" TO delivery_api;'+prefix+invocation(operation),'ENVIRONMENT_BLOCKED');
    reject(`UPDATE app."StripeSandboxSubmission" SET "sessionId"='cs_test_synthetic';`+prefix+invocation(operation),'ATTEMPT_UNCERTAIN');
    reject(`UPDATE app."StripeSandboxSubmission" SET "sessionId"='cs_test_synthetic';
      INSERT INTO app."StripeSandboxEvent"("accountId","scenarioId","eventId",digest,state,version)
      SELECT "accountId","scenarioId",'evt_synthetic',repeat('a',64),state,version FROM app."StripeSandboxSubmission";`+prefix+invocation(operation),'HISTORY_CONFLICT');
    reject(`UPDATE app."StripeSandboxSubmission" SET "leaseToken"='55555555-5555-4555-8555-555555555555',"leaseUntil"=clock_timestamp()+interval '30 seconds';`+prefix+invocation(operation),'ATTEMPT_UNCERTAIN');
    reject(`UPDATE app."StripeSandboxSubmission" SET state='pending';`+prefix+invocation(operation),'ATTEMPT_UNCERTAIN');
    stage='partial-insert-rollback';
    sql(target,`CREATE FUNCTION public.fail_successor() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_INTERRUPTION'; END $$;
      CREATE TRIGGER synthetic_failure BEFORE INSERT ON app."StripeSandboxSuccessor" FOR EACH ROW EXECUTE FUNCTION public.fail_successor();`,false);
    const fault=operationFixture(target);
    assert.throws(()=>sql(runtime,'BEGIN;'+invocation(fault)+'COMMIT;',false));
    sameEvidence(before,snapshot(target));
    sql(target,'DROP TRIGGER synthetic_failure ON app."StripeSandboxSuccessor"; DROP FUNCTION public.fail_successor();',false);
    stage='rollback-without-commit';
    sql(runtime,'BEGIN;'+invocation(operation)+'ROLLBACK;',false);
    sameEvidence(before,snapshot(target));
    stage='two-processes-and-lost-acknowledgement';
    const results=await Promise.allSettled([compete(target,'BEGIN;'+invocation(operation)+'COMMIT;'),compete(target,'BEGIN;'+invocation(operation)+'COMMIT;')]);
    assert.equal(results.filter((r)=>r.status==='fulfilled').length,1);
    assert.throws(()=>sql(runtime,'BEGIN;'+invocation(operation)+'COMMIT;',false));
    assert.equal(sql(target,'SELECT count(*) FROM app."StripeSandboxRecoveryDecision"'),'1');
    assert.equal(sql(target,'SELECT count(*) FROM app."StripeSandboxSuccessor"'),'1');
    const after=snapshot(target);
    for(const name of ['StripeSandboxScenario','StripeSandboxSubmission','StripeSandboxEvent'])
      assert.deepEqual(after.tables.find((t)=>t.name===name),before.tables.find((t)=>t.name===name));
    assert.equal(sql(target,`SELECT count(*) FROM app."StripeSandboxSuccessor" n JOIN app."StripeSandboxSubmission" p ON n."scenarioId"=p."scenarioId"
      WHERE n.key<>p.key AND n."payloadDigest"<>p.hash AND n."amountMinor"=4400 AND n.currency='MXN' AND n.state='prepared-offline'`),'1');
    assert.equal(sql(target,'SELECT count(*) FROM app."StripeSandboxRecoveryLab"'),'0');
    assert.equal(sql(runtime,'SELECT count(*) FROM app."StripeSandboxRecoveryDecision"'),'0');
    assert.throws(()=>sql(target,'UPDATE app."StripeSandboxRecoveryDecision" SET "approvalHead"=repeat(\'a\',40)',false));
    assert.throws(()=>sql(target,'DELETE FROM app."StripeSandboxSuccessor"',false));
    console.log('Recuperación manual sintética: perfiles/identidad/RLS/evidencia/HEAD/plazo/bindings/eventos/leases/rollback/concurrencia/repetición e historial exacto correctos. Stripe requests=0.');
  },'migration_fixture_owner');
} catch (error) {
  const reason=error instanceof Error && /^[A-Z_]+$/.test(error.message)?error.message:'DATABASE_OR_ASSERTION_FAILED';
  console.error(`MANUAL_RECOVERY_DISPOSABLE_TEST_FAILED (${stage}/${reason}); SQL y expedientes no se imprimen.`);
  process.exitCode=1;
}
