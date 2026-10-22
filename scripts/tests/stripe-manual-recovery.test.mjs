import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseManualReview,parseManualProposal,manualProposalDigest,validateManualReviewArtifact } from '../../apps/api/src/infrastructure/stripe-test/manual-recovery-contract.ts';
import { parseRecoveryEvidence } from '../../apps/api/src/infrastructure/stripe-test/recovery-contract.ts';
import { stripeTestHash } from '../../apps/api/src/infrastructure/stripe-test/checkout-parameters.ts';
import { validateManualAuthorization } from '../local/stripe-manual-recovery/approval.ts';
import { authenticateLocalSyntheticUser } from '../local/stripe-synthetic-auth.ts';

function fixture() {
  const now=Date.now(),subject='11111111-1111-4111-8111-111111111111',scenario='22222222-2222-4222-8222-222222222222',head='b'.repeat(40);
  const evidence=parseRecoveryEvidence({version:1,scenarioId:scenario,accountId:'acct_offline',submissionDigest:'a'.repeat(64),stripeRequestId:'req_offline',
    httpStatus:400,errorType:'invalid_request_error',errorParam:'payment_method_types',apiVersion:'2026-09-30.endive',noSessionConfirmed:true,noOtherPostConfirmed:true,
    reviewedBy:subject,reviewedAt:new Date(now).toISOString(),source:'stripe-official-error-reviewed',artifactDigest:'c'.repeat(64),approvalHead:head});
  const history='Entirely artificial review, not evidence from Stripe.';
  const review={version:1,scenarioId:scenario,accountId:evidence.accountId,stripeRequestId:evidence.stripeRequestId,reviewedBy:subject,reviewedAt:evidence.reviewedAt,
    source:'stripe-request-and-session-history-reviewed',originalAttemptConfirmed:true,noSessionConfirmed:true,noOtherPostConfirmed:true,notInferredFromHttp400:true,
    windowFrom:new Date(now-60000).toISOString(),windowTo:evidence.reviewedAt,artifactDigest:stripeTestHash(history)};
  const proposal={version:1,purpose:'manual-stripe-recovery-local',operationId:'33333333-3333-4333-8333-333333333333',
    instanceId:'44444444-4444-4444-8444-444444444444',identityDigest:'a'.repeat(64),scenarioId:scenario,subjectId:subject,branchId:'branch_synthetic_a',merchantId:'merchant_synthetic_a',
    accountId:evidence.accountId,revision:head,evidenceDigest:'a'.repeat(64),reviewDigest:'b'.repeat(64),submissionDigest:evidence.submissionDigest,
    payloadDigest:'d'.repeat(64),schemaDigest:'e'.repeat(64),createdAt:evidence.reviewedAt,expiresAt:new Date(now+60000).toISOString(),
    sourceCounts:{scenarios:1,submissions:1,events:0,decisions:0,successors:0},effects:{decisions:1,successors:1,historicalUpdates:0,stripeRequests:0},
    readyForExternalCalls:false,operatorAuthenticationRequired:true};
  return {now,head,evidence,review,proposal,history,startedAt:new Date(now-30000)};
}
test('HTTP 400 and a NULL binding never substitute independent correspondence/session/POST review',()=>{
  const f=fixture();
  const review=parseManualReview(f.review,f.evidence,f.startedAt,f.now);
  assert.doesNotThrow(()=>validateManualReviewArtifact(f.history,review));
  assert.throws(()=>validateManualReviewArtifact('changed',review));
  for(const patch of [{originalAttemptConfirmed:false},{noSessionConfirmed:false},{noOtherPostConfirmed:false},{notInferredFromHttp400:false},
    {source:'http-400-only'},{accountId:'acct_foreign'},{stripeRequestId:'req_other'},{reviewedBy:'55555555-5555-4555-8555-555555555555'},
    {artifactDigest:f.evidence.artifactDigest},{windowFrom:new Date(f.now).toISOString()},{windowTo:new Date(f.now+1000).toISOString()},
    {windowTo:new Date(f.now-3600001).toISOString()},{extra:true}])
    assert.throws(()=>parseManualReview({...f.review,...patch},f.evidence,f.startedAt,f.now));
  assert.throws(()=>parseManualReview(null,f.evidence,f.startedAt,f.now));
});
test('local proposal binds HEAD and limits all writes to one decision and successor with no financial or Stripe effect',()=>{
  const f=fixture(),p=parseManualProposal(f.proposal,f.head,f.now);
  assert.equal(manualProposalDigest(p).length,64);
  for(const patch of [{revision:'c'.repeat(40)},{readyForExternalCalls:true},{operatorAuthenticationRequired:false},
    {effects:{...p.effects,stripeRequests:1}},{effects:{...p.effects,historicalUpdates:1}},{effects:{...p.effects,successors:2}},
    {sourceCounts:{...p.sourceCounts,events:1}},{sourceCounts:{...p.sourceCounts,extra:0}},
    {expiresAt:new Date(f.now+3600001).toISOString()},{expiresAt:new Date(f.now).toISOString()},
    {instanceId:'remote'},{branchId:'branch_synthetic_b'},{payloadDigest:'invalid'},{extra:'hidden'}])
    assert.throws(()=>parseManualProposal({...p,...patch},f.head,f.now));
});
test('no manual execution authorization is inferred from a proposal, HTTP error or an earlier migration approval',()=>{
  const f=fixture(),p=parseManualProposal(f.proposal,f.head,f.now),digest=manualProposalDigest(p);
  const auth={version:1,operation:'manual-recovery-1-decision-1-successor',operationId:p.operationId,authorized:true,
    head:f.head,proposalSha256:digest,expiresAt:p.expiresAt};
  assert.doesNotThrow(()=>validateManualAuthorization(auth,p,digest,f.now));
  for(const patch of [{authorized:false},{operation:'apply-single-manual-migration'},{operationId:p.instanceId},
    {head:'d'.repeat(40)},{proposalSha256:'e'.repeat(64)},{expiresAt:new Date(f.now).toISOString()},{extra:true}])
    assert.throws(()=>validateManualAuthorization({...auth,...patch},p,digest,f.now));
  assert.throws(()=>validateManualAuthorization(null,p,digest,f.now));
});
test('all CLI paths reject CI/non-TTY before loading manual credentials or opening a database',()=>{
  const canary='NEVER_PRINT_MANUAL_RECOVERY_CREDENTIAL';
  for(const args of [['--inspect'],['--propose','.local/stripe-manual/dossier'],['--execute','33333333-3333-4333-8333-333333333333','a'.repeat(64)],['--plan','33333333-3333-4333-8333-333333333333']]){
    const child=spawnSync(process.execPath,['--experimental-strip-types','scripts/local/stripe-manual-recovery.ts',...args],
      {encoding:'utf8',env:{...process.env,CI:'true',STRIPE_SANDBOX_API_KEY:canary,SYNTHETIC_USER_PASSWORD:canary}});
    assert.equal(child.status,1);assert.equal(child.stdout,'');
    assert.match(child.stderr,/RECOVERY_ENVIRONMENT_BLOCKED/);assert.doesNotMatch(child.stderr,new RegExp(canary));
  }
});
test('future approved login only uses local official Auth and rejects wrong identity, invalid tokens, outages and absent credentials',async()=>{
  const f=fixture(),original=globalThis.fetch;
  try {
    for(const mode of ['ok','foreign','invalid','unavailable']){
      const calls=[];
      globalThis.fetch=async(input,init)=>{
        const url=String(input);calls.push(url);
        assert.match(url,/^http:\/\/127\.0\.0\.1:57321\/auth\/v1\/(token\?grant_type=password|user)$/);
        assert.equal(init.redirect,'error');
        if(mode==='unavailable')return new Response('',{status:503});
        if(url.includes('/token'))return Response.json({access_token:'synthetic_memory_token',token_type:'bearer',user:{email:'merchant-a@example.test',id:f.evidence.reviewedBy}});
        if(mode==='invalid')return new Response('',{status:401});
        return Response.json({id:mode==='foreign'?'55555555-5555-4555-8555-555555555555':f.evidence.reviewedBy});
      };
      const login=()=>authenticateLocalSyntheticUser('http://127.0.0.1:57321','local-public','synthetic-password',f.evidence.reviewedBy);
      if(mode==='ok')assert.equal((await login()).subjectId,f.evidence.reviewedBy);else await assert.rejects(login);
      assert.equal(calls.length,mode==='unavailable'?1:2);
    }
    let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected external request');};
    await assert.rejects(authenticateLocalSyntheticUser('http://127.0.0.1:57321','local-public','',f.evidence.reviewedBy));
    await assert.rejects(authenticateLocalSyntheticUser('https://api.stripe.com','local-public','synthetic-password'));
    assert.equal(calls,0);
  } finally {globalThis.fetch=original;}
});
