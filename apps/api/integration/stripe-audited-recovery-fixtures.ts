import { randomUUID } from 'node:crypto';
import { admin, db, identity } from './payment-fixtures.ts';
import { stripeSessionKey, stripeSessionParameters, stripeTestHash } from '../src/infrastructure/stripe-test/checkout-parameters.ts';
import { STRIPE_TEST_API_VERSION } from '../src/infrastructure/stripe-test/config.ts';
import { parseRecoveryEvidence } from '../src/infrastructure/stripe-test/recovery-contract.ts';
export { admin, db, identity };
export const recoveryHead = 'b'.repeat(40);

export async function recoveryFixture(hashOverride?: string) {
  const actor = await identity();
  await admin.$executeRaw`INSERT INTO app."StripeSandboxRecoveryLab"("instanceId",purpose,"systemIdentifier")
    SELECT ${randomUUID()}::uuid,'disposable-recovery-v1',system_identifier::text FROM pg_control_system() ON CONFLICT DO NOTHING`;
  const marker = await admin.stripeSandboxRecoveryLab.findUniqueOrThrow({ where: { singleton:true } });
  const suffix = randomUUID().replaceAll('-',''), merchantId = 'merchant_recovery_test_' + suffix, branchId = 'branch_recovery_test_' + suffix;
  await admin.merchant.create({ data: { id:merchantId, name:'Offline recovery merchant' } });
  await admin.branch.create({ data: { id:branchId, merchantId, name:'Offline recovery branch', latitude:0, longitude:0 } });
  const membership = await admin.membership.create({ data: { id:randomUUID(), subjectId:actor.subjectId, branchId, merchantId } });
  const scenario = await admin.stripeSandboxScenario.create({ data: { id:randomUUID(), subjectId:actor.subjectId, branchId, merchantId, accountId:'acct_offline', amountMinor:4400 } });
  const body = stripeSessionParameters(scenario.id,4400,'http://127.0.0.1:5173').toString()
    .replace('mode=payment&','mode=payment&payment_method_types%5B0%5D=card&');
  await admin.stripeSandboxSubmission.create({ data: { scenarioId:scenario.id, accountId:scenario.accountId } });
  await admin.stripeSandboxSubmission.update({ where:{scenarioId:scenario.id},data:{ key:stripeSessionKey(scenario.accountId,scenario.id),
    hash:hashOverride ?? stripeTestHash(STRIPE_TEST_API_VERSION+':'+scenario.accountId+':'+body), state:'unknown' } });
  const evidence = async () => {
    const [snapshot] = await admin.$queryRaw<{digest:string}[]>`SELECT encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex') AS digest
      FROM app."StripeSandboxSubmission" p WHERE "scenarioId"=${scenario.id}::uuid`;
    return parseRecoveryEvidence({ version:1, scenarioId:scenario.id, accountId:scenario.accountId, submissionDigest:snapshot?.digest,
      stripeRequestId:'req_offline_'+scenario.id.replaceAll('-',''),httpStatus:400,errorType:'invalid_request_error',errorParam:'payment_method_types',
      apiVersion:STRIPE_TEST_API_VERSION,noSessionConfirmed:true,noOtherPostConfirmed:true,reviewedBy:actor.subjectId,
      reviewedAt:new Date().toISOString(),source:'stripe-official-error-reviewed',artifactDigest:'a'.repeat(64),approvalHead:recoveryHead });
  };
  const original = () => admin.stripeSandboxSubmission.findUniqueOrThrow({ where:{scenarioId:scenario.id} });
  return { actor, scenario, instance:marker.instanceId, evidence:await evidence(), refreshEvidence:evidence, original, membership };
}
