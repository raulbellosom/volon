BEGIN;
SELECT set_config('app.subject_id','11111111-1111-4111-8111-111111111111',true),
 set_config('app.stripe_sandbox','offline-test-v1',true),set_config('app.stripe_recovery','offline-recovery-v1',true);
SELECT stripe_recovery_private.prepare('33333333-3333-4333-8333-333333333333',
 jsonb_build_object('version',1,'scenarioId',p."scenarioId",'accountId',p."accountId",
 'submissionDigest',encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex'),
 'stripeRequestId','req_offline_fixture','httpStatus',400,'errorType','invalid_request_error','errorParam','payment_method_types',
 'apiVersion','2026-09-30.endive','noSessionConfirmed',true,'noOtherPostConfirmed',true,
 'reviewedBy','11111111-1111-4111-8111-111111111111','reviewedAt',clock_timestamp(),
 'source','stripe-official-error-reviewed','artifactDigest',repeat('a',64),'approvalHead',repeat('b',40)),repeat('b',40))
 FROM app."StripeSandboxSubmission" p WHERE "scenarioId"='22222222-2222-4222-8222-222222222222';
