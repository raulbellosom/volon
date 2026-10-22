import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { sql, literal } from '../stripe-migration/database.ts';
import { sha,manualRecoveryProfile } from '../stripe-migration/manifest.ts';
import { parseRecoveryEvidence } from '../../../apps/api/src/infrastructure/stripe-test/recovery-contract.ts';
import { parseManualReview, parseManualProposal } from '../../../apps/api/src/infrastructure/stripe-test/manual-recovery-contract.ts';
import { stripeTestHash } from '../../../apps/api/src/infrastructure/stripe-test/checkout-parameters.ts';

export const fixtureIdentity = {subject:'11111111-1111-4111-8111-111111111111',scenario:'22222222-2222-4222-8222-222222222222',
  instance:'33333333-3333-4333-8333-333333333333',account:'acct_offline_manual_fixture',head:'b'.repeat(40)};
export function initializeManualRecoveryFixture(bootstrap, includeManualMigration=true) {
  sql(bootstrap,'CREATE ROLE postgres SUPERUSER LOGIN; CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA extensions;',false);
  const target={...bootstrap,user:'postgres'};
  sql(target,`CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,deleted_at TIMESTAMPTZ);
    INSERT INTO auth.users VALUES (${literal(fixtureIdentity.subject)},'merchant-a@example.test',NULL);`,false);
  const names=readdirSync('prisma/migrations',{withFileTypes:true}).filter((e)=>e.isDirectory()).map((e)=>e.name)
    .filter((name)=>includeManualMigration || name!==manualRecoveryProfile.migration).sort();
  for(const name of names) sql(target,readFileSync('prisma/migrations/'+name+'/migration.sql','utf8'),false);
  sql(target,`CREATE TABLE app._prisma_migrations(id VARCHAR(36) PRIMARY KEY,checksum VARCHAR(64) NOT NULL,finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL,logs TEXT,rolled_back_at TIMESTAMPTZ,started_at TIMESTAMPTZ NOT NULL DEFAULT now(),applied_steps_count INTEGER NOT NULL DEFAULT 0);`,false);
  for(const name of names) sql(target,`INSERT INTO app._prisma_migrations(id,checksum,finished_at,migration_name)
    VALUES(${literal(randomUUID())},${literal(sha(readFileSync('prisma/migrations/'+name+'/migration.sql','utf8').replaceAll('\r\n','\n')))},now(),${literal(name)})`,false);
  const f=fixtureIdentity;
  sql(target,`CREATE SCHEMA local_control;
    CREATE TABLE local_control."Environment"(singleton BOOLEAN PRIMARY KEY DEFAULT true,"instanceId" UUID,purpose TEXT,"accountId" TEXT,"systemIdentifier" TEXT);
    INSERT INTO local_control."Environment" SELECT true,${literal(f.instance)},'manual-stripe-test-v1',${literal(f.account)},system_identifier::text FROM pg_control_system();
    ALTER TABLE local_control."Environment" ENABLE ROW LEVEL SECURITY; ALTER TABLE local_control."Environment" FORCE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA local_control TO delivery_api; GRANT SELECT ON local_control."Environment" TO delivery_api;
    CREATE POLICY marker_read ON local_control."Environment" FOR SELECT TO delivery_api USING(true);
    INSERT INTO app."Merchant"(id,name) VALUES('merchant_synthetic_a','Synthetic disposable merchant');
    INSERT INTO app."Branch"(id,"merchantId",name,latitude,longitude) VALUES('branch_synthetic_a','merchant_synthetic_a','Synthetic disposable branch',0,0);
    INSERT INTO app."Membership"(id,"subjectId","branchId","merchantId") VALUES('membership_synthetic_a',${literal(f.subject)},'branch_synthetic_a','merchant_synthetic_a');
    INSERT INTO app."StripeSandboxScenario"(id,"subjectId","branchId","merchantId","accountId","amountMinor")
      VALUES(${literal(f.scenario)},${literal(f.subject)},'branch_synthetic_a','merchant_synthetic_a',${literal(f.account)},4400);
    INSERT INTO app."StripeSandboxSubmission"("scenarioId","accountId") VALUES(${literal(f.scenario)},${literal(f.account)});
    UPDATE app."StripeSandboxSubmission" SET state='unknown',key='stripe-test-session-'||encode(sha256(convert_to("accountId"||':'||"scenarioId",'UTF8')),'hex'),
      hash=encode(sha256(convert_to('2026-09-30.endive:'||"accountId"||':'||replace(stripe_recovery_private.body("scenarioId"),
      'mode=payment&','mode=payment&payment_method_types%5B0%5D=card&'),'UTF8')),'hex');`,false);
  return target;
}
export function operationFixture(target) {
  const f=fixtureIdentity;
  const old=JSON.parse(sql(target,'SELECT to_jsonb(p)::text FROM app."StripeSandboxSubmission" p'));
  const digest=(value)=>sql(target,`SELECT encode(sha256(convert_to(${literal(JSON.stringify(value))}::jsonb::text,'UTF8')),'hex')`);
  const nowMs=Date.now(),now=new Date(nowMs).toISOString();
  // Entirely artificial evidence, used only in new networkless fixture databases.
  const error=JSON.stringify({status:400,accountId:f.account,scenarioId:f.scenario,requestId:'req_offline_manual_fixture',apiVersion:'2026-09-30.endive',
    response:{error:{type:'invalid_request_error',param:'payment_method_types'}}});
  const history='Synthetic test fixture; never evidence from Stripe.';
  const evidence=parseRecoveryEvidence({version:1,scenarioId:f.scenario,accountId:f.account,
    submissionDigest:sql(target,'SELECT encode(sha256(convert_to(to_jsonb(p)::text,\'UTF8\')),\'hex\') FROM app."StripeSandboxSubmission" p'),
    stripeRequestId:'req_offline_manual_fixture',httpStatus:400,errorType:'invalid_request_error',errorParam:'payment_method_types',apiVersion:'2026-09-30.endive',
    noSessionConfirmed:true,noOtherPostConfirmed:true,reviewedBy:f.subject,reviewedAt:now,source:'stripe-official-error-reviewed',artifactDigest:stripeTestHash(error),approvalHead:f.head});
  const review=parseManualReview({version:1,scenarioId:f.scenario,accountId:f.account,stripeRequestId:evidence.stripeRequestId,reviewedBy:f.subject,reviewedAt:now,
    source:'stripe-request-and-session-history-reviewed',originalAttemptConfirmed:true,noSessionConfirmed:true,noOtherPostConfirmed:true,notInferredFromHttp400:true,
    windowFrom:new Date(old.startedAt).toISOString(),windowTo:now,artifactDigest:stripeTestHash(history)},evidence,new Date(old.startedAt));
  const proposal=parseManualProposal({version:1,purpose:'manual-stripe-recovery-local',operationId:randomUUID(),instanceId:f.instance,identityDigest:'d'.repeat(64),
    scenarioId:f.scenario,subjectId:f.subject,branchId:'branch_synthetic_a',merchantId:'merchant_synthetic_a',accountId:f.account,revision:f.head,
    evidenceDigest:digest(evidence),reviewDigest:digest(review),submissionDigest:evidence.submissionDigest,
    payloadDigest:sql(target,`SELECT encode(sha256(convert_to('2026-09-30.endive:'||${literal(f.account)}||':'||stripe_recovery_private.body(${literal(f.scenario)}),'UTF8')),'hex')`),
    schemaDigest:sql(target,'SELECT stripe_recovery_private.manual_catalog_digest()'),createdAt:now,expiresAt:new Date(nowMs+3600000).toISOString(),
    sourceCounts:{scenarios:1,submissions:1,events:0,decisions:0,successors:0},effects:{decisions:1,successors:1,historicalUpdates:0,stripeRequests:0},
    readyForExternalCalls:false,operatorAuthenticationRequired:true},f.head);
  return {evidence,review,proposal,error,history};
}
export function invocation(operation, subject=fixtureIdentity.subject) {
  const {evidence,review,proposal}=operation, text=JSON.stringify(proposal);
  return `SELECT set_config('app.subject_id',${literal(subject)},true),set_config('app.stripe_sandbox','offline-test-v1',true),
    set_config('app.stripe_recovery','offline-recovery-v1',true),set_config('app.stripe_manual_recovery','manual-stripe-recovery-v1',true);
    SELECT stripe_recovery_private.manual_prepare(${literal(fixtureIdentity.instance)},${literal(JSON.stringify(evidence))}::jsonb,
      ${literal(JSON.stringify(review))}::jsonb,${literal(text)},${literal(stripeTestHash(text))});`;
}
