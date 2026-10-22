import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { parseRecoveryEvidence, successorDigest, successorKey } from '../src/infrastructure/stripe-test/recovery-contract.ts';
import { validateRecoveryArtifact } from '../src/infrastructure/stripe-test/recovery-artifact.ts';
import { recoveryPlanDigest, validateRecoveryPlan, assertRecoveryPlan } from '../src/infrastructure/stripe-test/recovery-plan.ts';
import { validateStripeTrialPlan } from '../src/infrastructure/stripe-test/trial-plan.ts';
import { stripeTestHash, stripeSessionKey } from '../src/infrastructure/stripe-test/checkout-parameters.ts';
import { parseRecoveryLabEnvironment } from '../../../scripts/local/stripe-recovery-environment.ts';

const scenarioId = randomUUID(), subjectId = randomUUID(), successorId = randomUUID(), head = 'a'.repeat(40);
const artifact = JSON.stringify({status:400,accountId:'acct_offline',scenarioId,requestId:'req_offline',apiVersion:'2026-09-30.endive',
  response:{error:{type:'invalid_request_error',param:'payment_method_types',message:'private_provider_message'}}});
const evidence = () => parseRecoveryEvidence({version:1,scenarioId,accountId:'acct_offline',submissionDigest:'b'.repeat(64),stripeRequestId:'req_offline',
  httpStatus:400,errorType:'invalid_request_error',errorParam:'payment_method_types',apiVersion:'2026-09-30.endive',noSessionConfirmed:true,
  noOtherPostConfirmed:true,reviewedBy:subjectId,reviewedAt:new Date(Date.now()-1000).toISOString(),source:'stripe-official-error-reviewed',
  artifactDigest:stripeTestHash(artifact),approvalHead:head});
const plan = () => validateRecoveryPlan({version:2,purpose:'stripe-test-recovery-proposal',operation:'create-successor',instanceId:randomUUID(),
  decisionId:randomUUID(),successorId,scenarioId,subjectId,branchId:'branch_synthetic_a',merchantId:'merchant_synthetic_a',accountId:'acct_offline',
  revision:head,payloadVersion:'dynamic-checkout-v1',payloadDigest:successorDigest('acct_offline',scenarioId),amountMinor:4400,currency:'MXN',
  expiresAt:new Date(Date.now()+60000).toISOString(),maxRequests:2,maxSessions:1,readyForExternalCalls:false});

test('strict reviewed HTTP 400 evidence requires matching private export and rejects contradictions without leaks',() => {
  const valid = evidence(); validateRecoveryArtifact(artifact,valid);
  for (const patch of [{noSessionConfirmed:false},{noOtherPostConfirmed:false},{httpStatus:500},{source:'unverified'},{artifactDigest:null},
    {apiVersion:'2022-11-15'},{reviewedAt:new Date(Date.now()+60000).toISOString()},{token:'private_token'}])
    assert.throws(() => parseRecoveryEvidence({...valid,...patch}),{message:'RECOVERY_REJECTED'});
  for (const source of ['',artifact+' ',artifact.replace('payment_method_types','other')])
    assert.throws(() => validateRecoveryArtifact(source,valid),{message:'RECOVERY_REJECTED'});
  const conflicting = artifact.replace('req_offline','req_other');
  assert.throws(() => validateRecoveryArtifact(conflicting,{...valid,artifactDigest:stripeTestHash(conflicting)}),{message:'RECOVERY_REJECTED'});
});

test('successor key includes a new UUID while canonical payload retains original scenario/amount',() => {
  const key = successorKey('acct_offline',scenarioId,successorId);
  assert.notEqual(key,stripeSessionKey('acct_offline',scenarioId));
  assert.notEqual(key,successorKey('acct_offline',scenarioId,randomUUID()));
  assert.equal(key,successorKey('acct_offline',scenarioId,successorId));
  assert.match(successorDigest('acct_offline',scenarioId),/^[0-9a-f]{64}$/);
});

test('v2 fixes successor/decision/account/HEAD/budget, canonical hash and expiry; old executor cannot accept it',() => {
  const valid = plan(); assertRecoveryPlan(valid,head);
  assert.throws(() => validateStripeTrialPlan(valid));
  assert.equal(recoveryPlanDigest(valid),recoveryPlanDigest(validateRecoveryPlan(Object.fromEntries(Object.entries(valid).reverse()))));
  for (const patch of [{maxRequests:3},{maxSessions:2},{amountMinor:4401},{readyForExternalCalls:true},{key:'private_key'},
    {payloadDigest:'c'.repeat(64)},{decisionId:'invalid'},{payloadVersion:'legacy'}])
    assert.throws(() => validateRecoveryPlan({...valid,...patch}),{message:'RECOVERY_REJECTED'});
  assert.throws(() => assertRecoveryPlan(valid,'b'.repeat(40)),{message:'RECOVERY_REJECTED'});
  for (const expiresAt of [new Date(Date.now()-1).toISOString(),new Date(Date.now()+7200000).toISOString()])
    assert.throws(() => assertRecoveryPlan(validateRecoveryPlan({...valid,expiresAt}),head),{message:'RECOVERY_REJECTED'});
  assert.notEqual(recoveryPlanDigest(valid),recoveryPlanDigest(validateRecoveryPlan({...valid,successorId:randomUUID()})));
  assert.equal(/token|password|private_key/.test(JSON.stringify(valid)),false);
});

test('lab profile refuses manual ports, arbitrary networking, Stripe keys and administrator connections',() => {
  const file = {LOCAL_ENVIRONMENT_KIND:'disposable-recovery-v1',LOCAL_SYNTHETIC_MODE:'true',RECOVERY_LAB_INSTANCE_ID:randomUUID(),
    SUPABASE_URL:'http://127.0.0.1:56321',DATABASE_URL:'postgresql://delivery_api:private@127.0.0.1:56322/postgres?schema=app',
    SUPABASE_PUBLISHABLE_KEY:'offline_key',SYNTHETIC_USER_PASSWORD:'private_password'};
  assert.ok(parseRecoveryLabEnvironment(file));
  for(const patch of [{LOCAL_ENVIRONMENT_KIND:'manual-stripe-test-v1'},{SUPABASE_URL:'http://127.0.0.1:57321'},
    {DATABASE_URL:file.DATABASE_URL.replace('56322','57322')},{DATABASE_URL:file.DATABASE_URL.replace('delivery_api','postgres')},
    {DATABASE_URL:file.DATABASE_URL.replace('127.0.0.1','remote.test')},{STRIPE_SANDBOX_API_KEY:'rk_test_private'},
    {MIGRATION_DATABASE_URL:'private'},{RECOVERY_LAB_INSTANCE_ID:'unknown'}])
    assert.throws(() => parseRecoveryLabEnvironment({...file,...patch}),{message:'RECOVERY_ENVIRONMENT_BLOCKED'});
});

test('official command refuses CI/cloud/non-TTY before reading private files, Auth or SQL',() => {
  for(const flag of ['CI','CODEX_CLOUD']) {
    const result = spawnSync(process.execPath,['--experimental-strip-types','scripts/local/stripe-recovery.ts','--prepare','private.json'],
      {encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,[flag]:'true',STRIPE_SANDBOX_API_KEY:'rk_test_private_sentinel'}});
    assert.equal(result.status,1); assert.match(result.stderr,/RECOVERY_ENVIRONMENT_BLOCKED/);
    assert.equal((result.stdout+result.stderr).includes('private_sentinel'),false);
  }
});
