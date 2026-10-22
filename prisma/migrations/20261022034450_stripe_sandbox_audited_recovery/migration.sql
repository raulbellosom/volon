BEGIN;
CREATE SCHEMA stripe_recovery_private;
REVOKE ALL ON SCHEMA stripe_recovery_private FROM PUBLIC;
GRANT USAGE ON SCHEMA stripe_recovery_private TO delivery_api;

CREATE TABLE app."StripeSandboxRecoveryLab" (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  "instanceId" UUID UNIQUE NOT NULL, purpose TEXT NOT NULL CHECK (purpose = 'disposable-recovery-v1'),
  "systemIdentifier" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE app."StripeSandboxRecoveryDecision" (
  id UUID PRIMARY KEY, "scenarioId" UUID NOT NULL UNIQUE, "accountId" TEXT NOT NULL,
  "subjectId" UUID NOT NULL, "submissionDigest" CHAR(64) NOT NULL CHECK ("submissionDigest" ~ '^[0-9a-f]{64}$'),
  "evidenceDigest" CHAR(64) NOT NULL CHECK ("evidenceDigest" ~ '^[0-9a-f]{64}$'), evidence JSONB NOT NULL,
  "approvalHead" CHAR(40) NOT NULL CHECK ("approvalHead" ~ '^[0-9a-f]{40}$'),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  CHECK (evidence @> '{"version":1,"httpStatus":400,"errorType":"invalid_request_error","errorParam":"payment_method_types","noSessionConfirmed":true,"noOtherPostConfirmed":true,"source":"stripe-official-error-reviewed","apiVersion":"2026-09-30.endive"}'::jsonb),
  UNIQUE(id,"scenarioId","accountId"), UNIQUE("scenarioId","accountId"),
  FOREIGN KEY ("scenarioId","accountId") REFERENCES app."StripeSandboxSubmission"("scenarioId","accountId") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX recovery_request_unique ON app."StripeSandboxRecoveryDecision"("accountId",(evidence->>'stripeRequestId'));
CREATE TABLE app."StripeSandboxSuccessor" (
  id UUID PRIMARY KEY, "decisionId" UUID NOT NULL UNIQUE, "scenarioId" UUID NOT NULL UNIQUE, "accountId" TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE CHECK (key ~ '^stripe-test-session-[0-9a-f]{64}$'),
  "payloadDigest" CHAR(64) NOT NULL CHECK ("payloadDigest" ~ '^[0-9a-f]{64}$'),
  "payloadVersion" TEXT NOT NULL CHECK ("payloadVersion" = 'dynamic-checkout-v1'),
  "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" = 4400), currency TEXT NOT NULL CHECK (currency = 'MXN'),
  state TEXT NOT NULL DEFAULT 'prepared-offline' CHECK (state = 'prepared-offline'),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  UNIQUE("decisionId","scenarioId","accountId"),
  FOREIGN KEY ("decisionId","scenarioId","accountId") REFERENCES app."StripeSandboxRecoveryDecision"(id,"scenarioId","accountId") ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE FUNCTION stripe_recovery_private.immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'IMMUTABLE_RECOVERY_HISTORY' USING ERRCODE = '23514'; END $$;
CREATE FUNCTION stripe_recovery_private.body(sid UUID) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT 'mode=payment&client_reference_id=' || sid || '&metadata%5BintentId%5D=' || sid
    || '&payment_intent_data%5Bmetadata%5D%5BintentId%5D=' || sid
    || '&payment_intent_data%5Bcapture_method%5D=automatic&line_items%5B0%5D%5Bquantity%5D=1'
    || '&line_items%5B0%5D%5Bprice_data%5D%5Bcurrency%5D=mxn&line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=4400'
    || '&line_items%5B0%5D%5Bprice_data%5D%5Bproduct_data%5D%5Bname%5D=Servicio+log%C3%ADstico+de+prueba'
    || '&success_url=http%3A%2F%2F127.0.0.1%3A5173%2Fstripe-test%2Fsuccess&cancel_url=http%3A%2F%2F127.0.0.1%3A5173%2Fstripe-test%2Fcancel'
$$;
CREATE FUNCTION stripe_recovery_private.lab_ready(instance UUID) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT current_database() = 'postgres' AND NOT EXISTS (
    SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'local_control' AND c.relname = 'Environment')
  AND EXISTS (SELECT FROM app."StripeSandboxRecoveryLab" l, pg_control_system() s
    WHERE l."instanceId" = instance AND l.purpose = 'disposable-recovery-v1'
      AND l."systemIdentifier" = s.system_identifier::text)
$$;

DO $$ DECLARE tab TEXT; BEGIN
  FOREACH tab IN ARRAY ARRAY['StripeSandboxRecoveryLab','StripeSandboxRecoveryDecision','StripeSandboxSuccessor'] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',tab);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',tab);
    EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC, anon, authenticated, delivery_api',tab);
    EXECUTE format('GRANT SELECT ON app.%I TO delivery_api',tab);
    EXECUTE format('CREATE TRIGGER immutable_row BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION stripe_recovery_private.immutable()',tab);
    EXECUTE format('CREATE TRIGGER immutable_table BEFORE TRUNCATE ON app.%I FOR EACH STATEMENT EXECUTE FUNCTION stripe_recovery_private.immutable()',tab);
  END LOOP;
END $$;
CREATE POLICY recovery_lab_read ON app."StripeSandboxRecoveryLab" FOR SELECT TO delivery_api USING (true);
CREATE POLICY recovery_decision_read ON app."StripeSandboxRecoveryDecision" FOR SELECT TO delivery_api USING (
  current_setting('app.stripe_recovery',true) = 'offline-recovery-v1'
  AND EXISTS (SELECT FROM app."StripeSandboxScenario" s WHERE s.id = "scenarioId" AND s."accountId" = "StripeSandboxRecoveryDecision"."accountId")
);
CREATE POLICY recovery_successor_read ON app."StripeSandboxSuccessor" FOR SELECT TO delivery_api USING (
  current_setting('app.stripe_recovery',true) = 'offline-recovery-v1'
  AND EXISTS (SELECT FROM app."StripeSandboxScenario" s WHERE s.id = "scenarioId" AND s."accountId" = "StripeSandboxSuccessor"."accountId")
);

CREATE FUNCTION stripe_recovery_private.prepare(instance UUID, e JSONB, head TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE
  s app."StripeSandboxScenario"; p app."StripeSandboxSubmission"; actor UUID;
  decision UUID := gen_random_uuid(); successor UUID := gen_random_uuid(); snapshot TEXT;
  body TEXT; prefix TEXT; digest TEXT; successor_key TEXT;
BEGIN
  IF session_user <> 'delivery_api' OR current_setting('app.stripe_sandbox',true) IS DISTINCT FROM 'offline-test-v1'
    OR current_setting('app.stripe_recovery',true) IS DISTINCT FROM 'offline-recovery-v1'
    OR NOT stripe_recovery_private.lab_ready(instance) THEN
    RAISE EXCEPTION 'RECOVERY_ENVIRONMENT_BLOCKED' USING ERRCODE = '23514';
  END IF;
  actor := nullif(current_setting('app.subject_id',true),'')::uuid;
  IF actor IS NULL OR jsonb_typeof(e) IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(e)) <> 16
    OR NOT e ?& ARRAY['version','scenarioId','accountId','submissionDigest','stripeRequestId','httpStatus','errorType','errorParam',
      'apiVersion','noSessionConfirmed','noOtherPostConfirmed','reviewedBy','reviewedAt','source','artifactDigest','approvalHead']
    OR EXISTS (SELECT FROM unnest(ARRAY['scenarioId','accountId','submissionDigest','stripeRequestId','reviewedBy',
      'reviewedAt','artifactDigest','approvalHead']) k WHERE jsonb_typeof(e->k) IS DISTINCT FROM 'string')
    OR NOT e @> '{"version":1,"httpStatus":400,"errorType":"invalid_request_error","errorParam":"payment_method_types","noSessionConfirmed":true,"noOtherPostConfirmed":true,"source":"stripe-official-error-reviewed","apiVersion":"2026-09-30.endive"}'::jsonb
    OR (e->>'reviewedBy') IS DISTINCT FROM actor::text OR (e->>'approvalHead') IS DISTINCT FROM head
    OR head IS NULL OR head !~ '^[0-9a-f]{40}$' OR (e->>'artifactDigest') !~ '^[0-9a-f]{64}$'
    OR (e->>'stripeRequestId') !~ '^req_[A-Za-z0-9_]{1,100}$'
    OR (e->>'reviewedAt')::timestamptz > clock_timestamp()
    OR (e->>'reviewedAt')::timestamptz < clock_timestamp() - interval '24 hours' THEN
    RAISE EXCEPTION 'RECOVERY_EVIDENCE_REJECTED' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO s FROM app."StripeSandboxScenario" WHERE id = (e->>'scenarioId')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'RECOVERY_REJECTED' USING ERRCODE = '23514'; END IF;
  PERFORM 1 FROM app."Branch" WHERE id = s."branchId" FOR UPDATE;
  SELECT * INTO s FROM app."StripeSandboxScenario" WHERE id = s.id FOR UPDATE;
  PERFORM 1 FROM app."Membership" m JOIN app."Branch" b ON b.id = m."branchId" AND b."merchantId" = m."merchantId"
    JOIN app."Merchant" c ON c.id = b."merchantId"
    WHERE m."subjectId" = actor AND m."branchId" = s."branchId" AND m.enabled AND b.enabled AND c.enabled FOR SHARE OF m,b,c;
  IF NOT FOUND OR s."subjectId" <> actor OR NOT s.enabled OR s.purpose <> 'offline-test'
    OR s."branchId" !~ '^branch_(synthetic_[ab]|recovery_test_[0-9a-f]{32})$'
    OR s."merchantId" <> replace(s."branchId",'branch_','merchant_')
    OR s."amountMinor" <> 4400 OR s.currency <> 'MXN' OR s."accountId" IS DISTINCT FROM e->>'accountId'
    OR (SELECT count(*) FROM app."StripeSandboxScenario" WHERE "branchId" = s."branchId") <> 1 THEN
    RAISE EXCEPTION 'RECOVERY_REJECTED' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO p FROM app."StripeSandboxSubmission" WHERE "scenarioId" = s.id FOR SHARE;
  IF NOT FOUND OR p.key IS NULL OR p.hash IS NULL OR p."startedAt" IS NULL
    OR p.state NOT IN ('unknown','failed') OR p.adverse IS NOT NULL
    OR p."leaseToken" IS NOT NULL OR p."leaseUntil" IS NOT NULL
    OR p."sessionId" IS NOT NULL OR p."paymentId" IS NOT NULL OR p."chargeId" IS NOT NULL
    OR (e->>'reviewedAt')::timestamptz < p."startedAt"
    OR EXISTS (SELECT FROM app."StripeSandboxEvent" WHERE "scenarioId" = s.id) THEN
    RAISE EXCEPTION 'RECOVERY_UNCERTAIN' USING ERRCODE = '23514';
  END IF;
  snapshot := encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex');
  body := stripe_recovery_private.body(s.id); prefix := '2026-09-30.endive:' || s."accountId" || ':';
  digest := encode(sha256(convert_to(prefix || body,'UTF8')),'hex');
  IF snapshot IS DISTINCT FROM e->>'submissionDigest'
    OR p.hash <> encode(sha256(convert_to(prefix || replace(body,'mode=payment&','mode=payment&payment_method_types%5B0%5D=card&'),'UTF8')),'hex')
    OR p.key <> 'stripe-test-session-' || encode(sha256(convert_to(s."accountId" || ':' || s.id,'UTF8')),'hex')
    OR p.hash = digest THEN RAISE EXCEPTION 'RECOVERY_EVIDENCE_CONFLICT' USING ERRCODE = '23514'; END IF;
  successor_key := 'stripe-test-session-' || encode(sha256(convert_to('recovery-v1:' || s."accountId" || ':' || s.id || ':' || successor,'UTF8')),'hex');
  INSERT INTO app."StripeSandboxRecoveryDecision" (id,"scenarioId","accountId","subjectId","submissionDigest","evidenceDigest",evidence,"approvalHead")
    VALUES (decision,s.id,s."accountId",actor,snapshot,encode(sha256(convert_to(e::text,'UTF8')),'hex'),e,head);
  INSERT INTO app."StripeSandboxSuccessor" (id,"decisionId","scenarioId","accountId",key,"payloadDigest","payloadVersion","amountMinor",currency)
    VALUES (successor,decision,s.id,s."accountId",successor_key,digest,'dynamic-checkout-v1',4400,'MXN');
  RETURN successor;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA stripe_recovery_private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION stripe_recovery_private.lab_ready(UUID), stripe_recovery_private.prepare(UUID,JSONB,TEXT) TO delivery_api;
COMMIT;
