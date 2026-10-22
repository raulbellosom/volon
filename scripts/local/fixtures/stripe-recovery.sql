INSERT INTO app."Merchant"(id,name) VALUES ('merchant_recovery_test_11111111111141118111111111111111','Offline recovery');
INSERT INTO app."Branch"(id,"merchantId",name,latitude,longitude) VALUES
 ('branch_recovery_test_11111111111141118111111111111111','merchant_recovery_test_11111111111141118111111111111111','Offline recovery',0,0);
INSERT INTO app."Membership"(id,"subjectId","branchId","merchantId") VALUES
 ('recovery_member','11111111-1111-4111-8111-111111111111','branch_recovery_test_11111111111141118111111111111111','merchant_recovery_test_11111111111141118111111111111111');
INSERT INTO app."StripeSandboxScenario"(id,"subjectId","branchId","merchantId","accountId","amountMinor") VALUES
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','branch_recovery_test_11111111111141118111111111111111',
 'merchant_recovery_test_11111111111141118111111111111111','acct_offline',4400);
INSERT INTO app."StripeSandboxSubmission"("scenarioId","accountId") VALUES ('22222222-2222-4222-8222-222222222222','acct_offline');
UPDATE app."StripeSandboxSubmission" SET state='unknown',
 key='stripe-test-session-'||encode(sha256(convert_to('acct_offline:22222222-2222-4222-8222-222222222222','UTF8')),'hex'),
 hash=encode(sha256(convert_to('2026-09-30.endive:acct_offline:'||replace(stripe_recovery_private.body('22222222-2222-4222-8222-222222222222'),
 'mode=payment&','mode=payment&payment_method_types%5B0%5D=card&'),'UTF8')),'hex')
 WHERE "scenarioId"='22222222-2222-4222-8222-222222222222';
INSERT INTO app."StripeSandboxRecoveryLab"("instanceId",purpose,"systemIdentifier")
 SELECT '33333333-3333-4333-8333-333333333333','disposable-recovery-v1',system_identifier::text FROM pg_control_system();
