import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { admin, db, identity, recoveryFixture, recoveryHead } from './stripe-audited-recovery-fixtures.ts';
import { required } from './delivery-fixtures.ts';
import { localOnlyFetch } from './stripe-persistence-fixtures.ts';
import { inspectRecovery, prepareSuccessor, recoveryTransaction } from '../src/infrastructure/stripe-test/recovery-store.ts';
import { loadRecoveryPlan, assertRecoveryPlan, recoveryPlanDigest } from '../src/infrastructure/stripe-test/recovery-plan.ts';
import { successorDigest, successorKey, RecoveryFailure } from '../src/infrastructure/stripe-test/recovery-contract.ts';
import { loadStripeTrialPlan } from '../src/infrastructure/stripe-test/trial-service.ts';
const originalFetch = globalThis.fetch;
beforeEach(() => mock.method(globalThis,'fetch',localOnlyFetch(originalFetch)));
afterEach(() => mock.restoreAll());

test('authenticated recovery inserts only immutable decision/successor; every legacy field and event stays intact',async () => {
  const s = await recoveryFixture(), before = await s.original();
  const inspection = await inspectRecovery(db,s.actor,s.instance,s.scenario.id);
  assert.equal(inspection.evidenceRequired,true); assert.equal(inspection.successors,0);
  const result = await prepareSuccessor(db,s.actor,s.instance,s.evidence,recoveryHead);
  const next = await admin.stripeSandboxSuccessor.findUniqueOrThrow({where:{id:result.successorId}});
  assert.equal(next.key,successorKey(s.scenario.accountId,s.scenario.id,next.id));
  assert.notEqual(next.key,before.key); assert.notEqual(next.payloadDigest,before.hash);
  assert.equal(next.payloadDigest,successorDigest(s.scenario.accountId,s.scenario.id));
  assert.equal(next.state,'prepared-offline'); assert.equal(next.amountMinor,4400);
  assert.deepEqual(await s.original(),before);
  assert.equal(await admin.stripeSandboxEvent.count({where:{scenarioId:s.scenario.id}}),0);
  const plan = await loadRecoveryPlan(db,s.actor,s.instance,next.id,recoveryHead,new Date(Date.now()+60000).toISOString());
  assertRecoveryPlan(plan,recoveryHead); assert.equal(plan.version,2); assert.equal(plan.maxRequests,2); assert.equal(plan.maxSessions,1);
  assert.equal(recoveryPlanDigest(plan).length,64); assert.equal(plan.readyForExternalCalls,false);
  await assert.rejects(loadStripeTrialPlan(db,s.actor,s.scenario.id,'create',recoveryHead,new Date(Date.now()+60000).toISOString()),{code:'REQUEST_UNKNOWN'});
});

function worker(s: Awaited<ReturnType<typeof recoveryFixture>>): Promise<boolean> {
  return new Promise((resolve,reject) => {
    let settled = false;
    const child = fork(fileURLToPath(new URL('./stripe-audited-recovery-worker.ts',import.meta.url)),[],{
      execArgv:['--experimental-strip-types'],stdio:['ignore','ignore','ignore','ipc'],env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR} });
    const timer = setTimeout(() => {child.kill();reject(new Error('Recovery worker timeout'));},20000);
    child.once('error',() => {clearTimeout(timer);reject(new Error('Recovery worker failed'));});
    child.once('exit',() => {if(!settled){clearTimeout(timer);reject(new Error('Recovery worker exited'));}});
    child.once('message',(result: {ok:boolean}) => {settled=true;clearTimeout(timer);resolve(result.ok===true);});
    child.send({url:required('DATABASE_URL'),subjectId:s.actor.subjectId,instance:s.instance,evidence:s.evidence,head:recoveryHead});
  });
}
test('two processes and many concurrent connections consume a decision once, without legacy version/lease changes',async () => {
  const s = await recoveryFixture(), before = await s.original();
  assert.equal((await Promise.all([worker(s),worker(s)])).filter(Boolean).length,1);
  const more = await Promise.allSettled(Array.from({length:12},() => prepareSuccessor(db,s.actor,s.instance,s.evidence,recoveryHead)));
  assert.equal(more.filter((value) => value.status==='fulfilled').length,0);
  assert.equal(await admin.stripeSandboxRecoveryDecision.count({where:{scenarioId:s.scenario.id}}),1);
  assert.equal(await admin.stripeSandboxSuccessor.count({where:{scenarioId:s.scenario.id}}),1);
  assert.deepEqual(await s.original(),before);
});

test('interruption rolls back both inserts; lost acknowledgement cannot create a second successor',async () => {
  const s = await recoveryFixture(), before = await s.original();
  await assert.rejects(recoveryTransaction(db,s.actor,s.instance,false,async (tx) => {
    await tx.$queryRaw`SELECT stripe_recovery_private.prepare(${s.instance}::uuid,${JSON.stringify(s.evidence)}::jsonb,${recoveryHead})`;
    throw new RecoveryFailure('RECOVERY_UNAVAILABLE');
  }));
  assert.equal(await admin.stripeSandboxRecoveryDecision.count({where:{scenarioId:s.scenario.id}}),0);
  const committed = await prepareSuccessor(db,s.actor,s.instance,s.evidence,recoveryHead);
  await assert.rejects(prepareSuccessor(db,s.actor,s.instance,s.evidence,recoveryHead));
  const observed = await inspectRecovery(db,s.actor,s.instance,s.scenario.id);
  assert.equal(observed.successors,1); assert.ok(observed.reasons.includes('DECISION_ALREADY_CONSUMED'));
  assert.ok(await admin.stripeSandboxSuccessor.findUnique({where:{id:committed.successorId}}));
  assert.deepEqual(await s.original(),before);
});

test('wrong account/snapshot, contradictory evidence, missing review and wrong HEAD cannot write',async () => {
  const s = await recoveryFixture(), before = await s.original();
  for (const change of [{accountId:'acct_foreign'},{submissionDigest:'c'.repeat(64)},{httpStatus:500},
    {noSessionConfirmed:false},{noOtherPostConfirmed:false},{artifactDigest:null},{reviewedAt:null},
    {errorParam:'other'},{apiVersion:'2022-11-15'},{source:'unreviewed'},{approvalHead:'c'.repeat(40)}])
    await assert.rejects(prepareSuccessor(db,s.actor,s.instance,{...s.evidence,...change},recoveryHead));
  // Bypass the TypeScript parser: PostgreSQL must reject null claims itself.
  await assert.rejects(recoveryTransaction(db,s.actor,s.instance,false,(tx) => tx.$queryRaw`
    SELECT stripe_recovery_private.prepare(${s.instance}::uuid,${JSON.stringify({...s.evidence,reviewedAt:null})}::jsonb,${recoveryHead})`));
  assert.equal(await admin.stripeSandboxRecoveryDecision.count({where:{scenarioId:s.scenario.id}}),0);
  assert.deepEqual(await s.original(),before);
});

test('SQL failure between decision and successor inserts leaves no consumed decision or partial history',async () => {
  const s = await recoveryFixture(), before = await s.original();
  await admin.$executeRawUnsafe(`CREATE FUNCTION stripe_recovery_private.test_reject_successor() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW."scenarioId" = '${s.scenario.id}'::uuid THEN RAISE EXCEPTION 'offline injected failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $$`);
  await admin.$executeRaw`CREATE TRIGGER test_reject_successor BEFORE INSERT ON app."StripeSandboxSuccessor"
    FOR EACH ROW EXECUTE FUNCTION stripe_recovery_private.test_reject_successor()`;
  try {
    await assert.rejects(prepareSuccessor(db,s.actor,s.instance,s.evidence,recoveryHead));
    assert.equal(await admin.stripeSandboxRecoveryDecision.count({where:{scenarioId:s.scenario.id}}),0);
    assert.equal(await admin.stripeSandboxSuccessor.count({where:{scenarioId:s.scenario.id}}),0);
    assert.deepEqual(await s.original(),before);
  } finally {
    await admin.$executeRaw`DROP TRIGGER test_reject_successor ON app."StripeSandboxSuccessor"`;
    await admin.$executeRaw`DROP FUNCTION stripe_recovery_private.test_reject_successor()`;
  }
  await prepareSuccessor(db,s.actor,s.instance,s.evidence,recoveryHead);
});

test('bindings, leases, other scenarios and incompatible original digest remain blocked',async () => {
  for (const kind of ['binding','lease','other','digest'] as const) {
    const s = await recoveryFixture(kind==='digest' ? 'c'.repeat(64):undefined);
    if(kind==='binding') await admin.stripeSandboxSubmission.update({where:{scenarioId:s.scenario.id},data:{sessionId:'cs_test_'+randomUUID().replaceAll('-','')}});
    if(kind==='lease') await admin.stripeSandboxSubmission.update({where:{scenarioId:s.scenario.id},data:{leaseToken:randomUUID(),leaseUntil:new Date(Date.now()+30000)}});
    if(kind==='other') await admin.stripeSandboxScenario.create({data:{...s.scenario,id:randomUUID()}});
    const before = await s.original();
    await assert.rejects(prepareSuccessor(db,s.actor,s.instance,await s.refreshEvidence(),recoveryHead));
    assert.deepEqual(await s.original(),before);
  }
});

test('RLS denies foreign/revoked subjects, unscoped reads, administrative runtime and direct ledger mutations',async () => {
  const s = await recoveryFixture(), foreign = await identity('b');
  await assert.rejects(prepareSuccessor(admin,s.actor,s.instance,s.evidence,recoveryHead));
  await assert.rejects(prepareSuccessor(db,foreign,s.instance,{...s.evidence,reviewedBy:foreign.subjectId},recoveryHead));
  const next = await prepareSuccessor(db,s.actor,s.instance,s.evidence,recoveryHead);
  assert.equal(await db.stripeSandboxSuccessor.count(),0);
  await assert.rejects(inspectRecovery(db,foreign,s.instance,s.scenario.id));
  for(const table of ['StripeSandboxRecoveryDecision','StripeSandboxSuccessor']) {
    await assert.rejects(admin.$executeRawUnsafe(`UPDATE app."${table}" SET "createdAt"=clock_timestamp()`));
    await assert.rejects(admin.$executeRawUnsafe(`DELETE FROM app."${table}"`));
    await assert.rejects(admin.$executeRawUnsafe(`TRUNCATE app."${table}" CASCADE`));
    await assert.rejects(db.$executeRawUnsafe(`DELETE FROM app."${table}"`));
  }
  await admin.membership.update({where:{id:s.membership.id},data:{enabled:false}});
  await assert.rejects(loadRecoveryPlan(db,s.actor,s.instance,next.successorId,recoveryHead,new Date(Date.now()+60000).toISOString()));
});

test('manual provenance marker and wrong instance fail closed; inspection never mutates',async () => {
  const s = await recoveryFixture(), before = await s.original();
  await assert.rejects(inspectRecovery(db,s.actor,randomUUID(),s.scenario.id));
  await admin.$transaction(async (tx) => {
    await tx.$executeRaw`CREATE SCHEMA local_control`;
    await tx.$executeRaw`CREATE TABLE local_control."Environment" (id INTEGER)`;
    const [row] = await tx.$queryRaw<{safe:boolean}[]>`SELECT stripe_recovery_private.lab_ready(${s.instance}::uuid) AS safe`;
    assert.equal(row?.safe,false);
    throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
  }).catch((error:unknown) => {assert.ok(error instanceof RecoveryFailure);});
  await inspectRecovery(db,s.actor,s.instance,s.scenario.id);
  assert.deepEqual(await s.original(),before);
});
