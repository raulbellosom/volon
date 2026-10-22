BEGIN;
-- Independent manual profile. Existing laboratory functions and marker are unchanged.
CREATE FUNCTION stripe_recovery_private.manual_ready(instance UUID, account TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $ready$
DECLARE valid BOOLEAN;
BEGIN
  IF current_database() <> 'postgres' OR to_regclass('local_control."Environment"') IS NULL
    OR to_regclass('app._prisma_migrations') IS NULL
    OR EXISTS (SELECT FROM app."StripeSandboxRecoveryLab") THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='delivery_api' AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb)
    OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app'
      AND c.relname IN ('StripeSandboxScenario','StripeSandboxSubmission','StripeSandboxEvent','StripeSandboxRecoveryLab','StripeSandboxRecoveryDecision','StripeSandboxSuccessor')
      AND c.relrowsecurity AND c.relforcerowsecurity)<>6
    OR has_table_privilege('delivery_api','app."StripeSandboxRecoveryDecision"','INSERT,UPDATE,DELETE,TRUNCATE')
    OR has_table_privilege('delivery_api','app."StripeSandboxSuccessor"','INSERT,UPDATE,DELETE,TRUNCATE') THEN RETURN false; END IF;
  IF (SELECT count(*) FROM app._prisma_migrations WHERE migration_name='20261022034450_stripe_sandbox_audited_recovery'
    AND checksum='00fa1a5bb12229b2af01a91b53a07fcfdb5694b3bb65647834cfeb31aa5eb073'
    AND finished_at IS NOT NULL AND rolled_back_at IS NULL) <> 1 THEN RETURN false; END IF;
  IF (SELECT count(*) FROM app._prisma_migrations WHERE migration_name='20261022055840_stripe_sandbox_manual_recovery'
    AND finished_at IS NOT NULL AND rolled_back_at IS NULL)<>1 THEN RETURN false; END IF;
  EXECUTE 'SELECT count(*)=1 AND bool_and(e."instanceId"=$1 AND e."accountId"=$2
    AND e.purpose=''manual-stripe-test-v1'' AND e."systemIdentifier"=s.system_identifier::text)
    FROM local_control."Environment" e CROSS JOIN pg_control_system() s' INTO valid USING instance,account;
  RETURN coalesce(valid,false);
END $ready$;

CREATE FUNCTION stripe_recovery_private.manual_catalog_digest() RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, app AS $catalog$
 SELECT encode(sha256(convert_to(jsonb_build_object(
  'tables',(SELECT jsonb_agg(jsonb_build_array(c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl) ORDER BY c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND c.relname LIKE 'StripeSandbox%'),
  'indexes',(SELECT jsonb_agg(indexdef ORDER BY indexname) FROM pg_indexes WHERE schemaname='app' AND tablename LIKE 'StripeSandbox%'),
  'constraints',(SELECT jsonb_agg(jsonb_build_array(c.relname,k.conname,pg_get_constraintdef(k.oid)) ORDER BY c.relname,k.conname)
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='app' AND c.relname LIKE 'StripeSandbox%'),
  'triggers',(SELECT jsonb_agg(jsonb_build_array(c.relname,t.tgname,pg_get_triggerdef(t.oid),t.tgenabled) ORDER BY c.relname,t.tgname)
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='app' AND c.relname LIKE 'StripeSandbox%' AND NOT t.tgisinternal),
  'runtimeRole',(SELECT jsonb_build_array(rolsuper,rolbypassrls,rolcreaterole,rolcreatedb) FROM pg_roles WHERE rolname='delivery_api'),
  'functions',(SELECT jsonb_agg(jsonb_build_array(p.proname,p.prosrc,p.proacl,p.prosecdef,p.proconfig) ORDER BY p.proname)
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='stripe_recovery_private')
 )::text,'UTF8')),'hex')
$catalog$;

CREATE FUNCTION stripe_recovery_private.manual_prepare(instance UUID, e JSONB, review JSONB, proposal_text TEXT, approval_digest TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $prepare$
DECLARE
 p app."StripeSandboxSubmission"; s app."StripeSandboxScenario"; actor UUID; proposal JSONB;
 decision UUID:=gen_random_uuid(); successor UUID:=gen_random_uuid(); original TEXT; catalog TEXT;
 digest TEXT; prefix TEXT; body TEXT; audit JSONB; successor_key TEXT;
BEGIN
 proposal:=proposal_text::jsonb;
 IF session_user <> 'delivery_api'
   OR current_setting('app.stripe_sandbox',true) IS DISTINCT FROM 'offline-test-v1'
   OR current_setting('app.stripe_recovery',true) IS DISTINCT FROM 'offline-recovery-v1'
   OR current_setting('app.stripe_manual_recovery',true) IS DISTINCT FROM 'manual-stripe-recovery-v1'
   OR NOT stripe_recovery_private.manual_ready(instance,e->>'accountId') THEN
   RAISE EXCEPTION 'MANUAL_RECOVERY_ENVIRONMENT_BLOCKED' USING ERRCODE='23514';
 END IF;
 actor:=nullif(current_setting('app.subject_id',true),'')::uuid;
 IF actor IS NULL OR jsonb_typeof(e) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(e))<>16
   OR NOT e ?& ARRAY['version','scenarioId','accountId','submissionDigest','stripeRequestId','httpStatus','errorType','errorParam',
     'apiVersion','noSessionConfirmed','noOtherPostConfirmed','reviewedBy','reviewedAt','source','artifactDigest','approvalHead']
   OR NOT e @> '{"version":1,"httpStatus":400,"errorType":"invalid_request_error","errorParam":"payment_method_types","noSessionConfirmed":true,"noOtherPostConfirmed":true,"source":"stripe-official-error-reviewed","apiVersion":"2026-09-30.endive"}'::jsonb
   OR EXISTS (SELECT FROM unnest(ARRAY['scenarioId','accountId','submissionDigest','stripeRequestId','reviewedBy','reviewedAt','artifactDigest','approvalHead']) k WHERE jsonb_typeof(e->k) IS DISTINCT FROM 'string')
   OR e->>'reviewedBy' IS DISTINCT FROM actor::text OR e->>'approvalHead' !~ '^[0-9a-f]{40}$'
   OR e->>'artifactDigest' !~ '^[0-9a-f]{64}$' OR e->>'submissionDigest' !~ '^[0-9a-f]{64}$'
   OR e->>'stripeRequestId' !~ '^req_[A-Za-z0-9_]{1,100}$'
   OR (e->>'reviewedAt')::timestamptz > clock_timestamp()
   OR (e->>'reviewedAt')::timestamptz < clock_timestamp()-interval '24 hours' THEN
   RAISE EXCEPTION 'MANUAL_EVIDENCE_REJECTED' USING ERRCODE='23514';
 END IF;
 IF jsonb_typeof(review) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(review))<>14
   OR NOT review ?& ARRAY['version','scenarioId','accountId','stripeRequestId','reviewedBy','reviewedAt','source','originalAttemptConfirmed',
     'noSessionConfirmed','noOtherPostConfirmed','notInferredFromHttp400','windowFrom','windowTo','artifactDigest']
   OR NOT review @> '{"version":1,"source":"stripe-request-and-session-history-reviewed","originalAttemptConfirmed":true,"noSessionConfirmed":true,"noOtherPostConfirmed":true,"notInferredFromHttp400":true}'::jsonb
   OR EXISTS (SELECT FROM unnest(ARRAY['scenarioId','accountId','stripeRequestId','reviewedBy']) k WHERE review->k IS DISTINCT FROM e->k)
   OR EXISTS (SELECT FROM unnest(ARRAY['reviewedAt','windowFrom','windowTo','artifactDigest']) k WHERE jsonb_typeof(review->k) IS DISTINCT FROM 'string')
   OR review->>'artifactDigest' !~ '^[0-9a-f]{64}$' OR review->>'artifactDigest'=e->>'artifactDigest'
   OR (review->>'reviewedAt')::timestamptz > clock_timestamp()
   OR (review->>'windowTo')::timestamptz > (review->>'reviewedAt')::timestamptz
   OR (review->>'windowTo')::timestamptz < clock_timestamp()-interval '1 hour'
   OR (review->>'windowFrom')::timestamptz > (review->>'windowTo')::timestamptz THEN
   RAISE EXCEPTION 'INDEPENDENT_HISTORY_REVIEW_REQUIRED' USING ERRCODE='23514';
 END IF;
 IF jsonb_typeof(proposal) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(proposal))<>22
   OR NOT proposal ?& ARRAY['version','purpose','operationId','instanceId','identityDigest','scenarioId','subjectId','branchId','merchantId',
     'accountId','revision','evidenceDigest','reviewDigest','submissionDigest','payloadDigest','schemaDigest','createdAt','expiresAt',
     'sourceCounts','effects','readyForExternalCalls','operatorAuthenticationRequired']
   OR EXISTS (SELECT FROM unnest(ARRAY['operationId','instanceId','identityDigest','scenarioId','subjectId','branchId','merchantId','accountId',
     'revision','evidenceDigest','reviewDigest','submissionDigest','payloadDigest','schemaDigest','createdAt','expiresAt']) k WHERE jsonb_typeof(proposal->k) IS DISTINCT FROM 'string')
   OR NOT proposal @> '{"version":1,"purpose":"manual-stripe-recovery-local","branchId":"branch_synthetic_a","merchantId":"merchant_synthetic_a","readyForExternalCalls":false,"operatorAuthenticationRequired":true,"sourceCounts":{"scenarios":1,"submissions":1,"events":0,"decisions":0,"successors":0},"effects":{"decisions":1,"successors":1,"historicalUpdates":0,"stripeRequests":0}}'::jsonb
   OR proposal->'sourceCounts' <> '{"scenarios":1,"submissions":1,"events":0,"decisions":0,"successors":0}'::jsonb
   OR proposal->'effects' <> '{"decisions":1,"successors":1,"historicalUpdates":0,"stripeRequests":0}'::jsonb
   OR proposal->>'instanceId' IS DISTINCT FROM instance::text OR proposal->>'subjectId' IS DISTINCT FROM actor::text
   OR proposal->>'accountId' IS DISTINCT FROM e->>'accountId' OR proposal->>'scenarioId' IS DISTINCT FROM e->>'scenarioId'
   OR proposal->>'revision' IS DISTINCT FROM e->>'approvalHead'
   OR (proposal->>'operationId')::uuid IS NULL OR proposal->>'identityDigest' !~ '^[0-9a-f]{64}$'
   OR proposal->>'evidenceDigest' IS DISTINCT FROM encode(sha256(convert_to(e::text,'UTF8')),'hex')
   OR proposal->>'reviewDigest' IS DISTINCT FROM encode(sha256(convert_to(review::text,'UTF8')),'hex')
   OR proposal->>'submissionDigest' IS DISTINCT FROM e->>'submissionDigest'
   OR approval_digest IS DISTINCT FROM encode(sha256(convert_to(proposal_text,'UTF8')),'hex')
   OR (proposal->>'createdAt')::timestamptz > clock_timestamp() OR (proposal->>'expiresAt')::timestamptz <= clock_timestamp()
   OR (proposal->>'expiresAt')::timestamptz <= (proposal->>'createdAt')::timestamptz
   OR (proposal->>'expiresAt')::timestamptz > (proposal->>'createdAt')::timestamptz+interval '1 hour' THEN
   RAISE EXCEPTION 'MANUAL_APPROVAL_REJECTED' USING ERRCODE='23514';
 END IF;
 PERFORM 1 FROM app."Branch" WHERE id='branch_synthetic_a' FOR UPDATE;
 SELECT * INTO s FROM app."StripeSandboxScenario" WHERE id=(e->>'scenarioId')::uuid FOR UPDATE;
 IF NOT FOUND OR NOT s.enabled OR s."subjectId"<>actor OR s."accountId" IS DISTINCT FROM e->>'accountId'
   OR s."branchId"<>'branch_synthetic_a' OR s."merchantId"<>'merchant_synthetic_a' OR s.purpose<>'offline-test'
   OR s."amountMinor"<>4400 OR s.currency<>'MXN' OR (SELECT count(*) FROM app."StripeSandboxScenario")<>1
   OR (SELECT count(*) FROM app."StripeSandboxSubmission")<>1 OR EXISTS(SELECT FROM app."StripeSandboxEvent")
   OR EXISTS(SELECT FROM app."StripeSandboxRecoveryDecision") OR EXISTS(SELECT FROM app."StripeSandboxSuccessor") THEN
   RAISE EXCEPTION 'MANUAL_HISTORY_CONFLICT' USING ERRCODE='23514';
 END IF;
 PERFORM 1 FROM app."Membership" m JOIN app."Branch" b ON b.id=m."branchId" AND b."merchantId"=m."merchantId"
   JOIN app."Merchant" c ON c.id=b."merchantId" JOIN auth.users u ON u.id=m."subjectId"
   WHERE m.id='membership_synthetic_a' AND m."subjectId"=actor AND m."branchId"=s."branchId"
   AND m."merchantId"=s."merchantId" AND m.enabled AND b.enabled AND c.enabled
   AND u.email='merchant-a@example.test' AND u.deleted_at IS NULL FOR SHARE OF m,b,c,u;
 IF NOT FOUND THEN RAISE EXCEPTION 'MANUAL_IDENTITY_REJECTED' USING ERRCODE='23514'; END IF;
 SELECT * INTO p FROM app."StripeSandboxSubmission" WHERE "scenarioId"=s.id FOR SHARE;
 IF NOT FOUND OR p.key IS NULL OR p.hash IS NULL OR p."startedAt" IS NULL OR p.state NOT IN ('unknown','failed')
   OR p.adverse IS NOT NULL OR p."leaseToken" IS NOT NULL OR p."leaseUntil" IS NOT NULL
   OR p."sessionId" IS NOT NULL OR p."paymentId" IS NOT NULL OR p."chargeId" IS NOT NULL
   OR (e->>'reviewedAt')::timestamptz<p."startedAt" OR (review->>'windowFrom')::timestamptz>p."startedAt"
   OR (review->>'windowTo')::timestamptz<p."startedAt" THEN
   RAISE EXCEPTION 'MANUAL_ATTEMPT_UNCERTAIN' USING ERRCODE='23514';
 END IF;
 original:=encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex');
 catalog:=stripe_recovery_private.manual_catalog_digest();
 body:=stripe_recovery_private.body(s.id); prefix:='2026-09-30.endive:'||s."accountId"||':';
 digest:=encode(sha256(convert_to(prefix||body,'UTF8')),'hex');
 IF original IS DISTINCT FROM e->>'submissionDigest' OR catalog IS DISTINCT FROM proposal->>'schemaDigest'
   OR digest IS DISTINCT FROM proposal->>'payloadDigest'
   OR p.hash<>encode(sha256(convert_to(prefix||replace(body,'mode=payment&','mode=payment&payment_method_types%5B0%5D=card&'),'UTF8')),'hex')
   OR p.key<>'stripe-test-session-'||encode(sha256(convert_to(s."accountId"||':'||s.id,'UTF8')),'hex') OR p.hash=digest THEN
   RAISE EXCEPTION 'MANUAL_CHECKPOINT_CONFLICT' USING ERRCODE='23514';
 END IF;
 successor_key:='stripe-test-session-'||encode(sha256(convert_to('recovery-v1:'||s."accountId"||':'||s.id||':'||successor,'UTF8')),'hex');
 audit:=e||jsonb_build_object('manualReview',review,'manualProposal',proposal,'manualOperationSha256',approval_digest);
 INSERT INTO app."StripeSandboxRecoveryDecision"(id,"scenarioId","accountId","subjectId","submissionDigest","evidenceDigest",evidence,"approvalHead")
   VALUES(decision,s.id,s."accountId",actor,original,encode(sha256(convert_to(audit::text,'UTF8')),'hex'),audit,e->>'approvalHead');
 INSERT INTO app."StripeSandboxSuccessor"(id,"decisionId","scenarioId","accountId",key,"payloadDigest","payloadVersion","amountMinor",currency)
   VALUES(successor,decision,s.id,s."accountId",successor_key,digest,'dynamic-checkout-v1',4400,'MXN');
 IF (SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') FROM app."StripeSandboxSubmission" t WHERE "scenarioId"=s.id)<>original
   OR stripe_recovery_private.manual_catalog_digest()<>catalog THEN RAISE EXCEPTION 'MANUAL_HISTORY_CHANGED'; END IF;
 RETURN successor;
END $prepare$;
REVOKE ALL ON FUNCTION stripe_recovery_private.manual_ready(UUID,TEXT), stripe_recovery_private.manual_catalog_digest(),
 stripe_recovery_private.manual_prepare(UUID,JSONB,JSONB,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION stripe_recovery_private.manual_ready(UUID,TEXT), stripe_recovery_private.manual_catalog_digest(),
 stripe_recovery_private.manual_prepare(UUID,JSONB,JSONB,TEXT,TEXT) TO delivery_api;
COMMIT;
