BEGIN;
SET search_path TO app, extensions;

CREATE TABLE "StripeSandboxScenario" (
  id UUID PRIMARY KEY, "subjectId" UUID NOT NULL, "branchId" TEXT NOT NULL, "merchantId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL CHECK ("accountId" ~ '^acct_[A-Za-z0-9_]{1,100}$'),
  purpose TEXT NOT NULL DEFAULT 'offline-test' CHECK (purpose = 'offline-test'),
  "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" BETWEEN 1000 AND 99999999),
  currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency = 'MXN'), enabled BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(), UNIQUE(id, "accountId"),
  FOREIGN KEY ("branchId", "merchantId") REFERENCES "Branch"(id,"merchantId") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "StripeSandboxScenario_branchId_merchantId_idx" ON "StripeSandboxScenario"("branchId","merchantId");
CREATE TABLE "StripeSandboxSubmission" (
  "scenarioId" UUID PRIMARY KEY, "accountId" TEXT NOT NULL,
  key TEXT UNIQUE CHECK (key ~ '^stripe-test-session-[0-9a-f]{64}$'),
  hash CHAR(64) CHECK (hash ~ '^[0-9a-f]{64}$'), "startedAt" TIMESTAMPTZ(3),
  "sessionId" TEXT CHECK ("sessionId" ~ '^cs_test_[A-Za-z0-9_]{1,100}$'),
  "paymentId" TEXT CHECK ("paymentId" ~ '^pi_[A-Za-z0-9_]{1,100}$'),
  "chargeId" TEXT CHECK ("chargeId" ~ '^ch_[A-Za-z0-9_]{1,100}$'),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','unknown','failed','capture_pending','captured_test','expired','refunded','disputed')),
  adverse TEXT CHECK (adverse IN ('refunded','disputed')),
  "leaseToken" UUID, "leaseUntil" TIMESTAMPTZ(3), version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  CHECK ((key IS NULL) = (hash IS NULL) AND (key IS NULL) = ("startedAt" IS NULL)),
  CHECK (("leaseToken" IS NULL) = ("leaseUntil" IS NULL)),
  CHECK ("sessionId" IS NULL OR key IS NOT NULL),
  CHECK ("paymentId" IS NULL OR "sessionId" IS NOT NULL),
  CHECK ("chargeId" IS NULL OR "paymentId" IS NOT NULL),
  CHECK (adverse IS NULL OR state = adverse),
  UNIQUE("scenarioId","accountId"), UNIQUE("accountId","sessionId"),
  UNIQUE("accountId","paymentId"), UNIQUE("accountId","chargeId"),
  FOREIGN KEY ("scenarioId","accountId") REFERENCES "StripeSandboxScenario"(id,"accountId") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE TABLE "StripeSandboxEvent" (
  "accountId" TEXT NOT NULL, "eventId" TEXT NOT NULL CHECK ("eventId" ~ '^evt_[A-Za-z0-9_]{1,100}$'),
  "scenarioId" UUID NOT NULL, digest CHAR(64) NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
  state TEXT NOT NULL CHECK (state IN ('pending','unknown','failed','capture_pending','captured_test','expired','refunded','disputed')),
  version INTEGER NOT NULL CHECK (version > 0), "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY("accountId","eventId"),
  FOREIGN KEY ("scenarioId","accountId") REFERENCES "StripeSandboxSubmission"("scenarioId","accountId") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "StripeSandboxEvent_scenarioId_idx" ON "StripeSandboxEvent"("scenarioId");

DO $$ DECLARE tab TEXT; BEGIN
  FOREACH tab IN ARRAY ARRAY['StripeSandboxScenario','StripeSandboxSubmission','StripeSandboxEvent'] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', tab);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', tab);
    EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC, anon, authenticated', tab);
  END LOOP;
END $$;
GRANT SELECT ON "StripeSandboxScenario","StripeSandboxSubmission","StripeSandboxEvent" TO delivery_api;
GRANT INSERT ("scenarioId","accountId") ON "StripeSandboxSubmission" TO delivery_api;
GRANT UPDATE (key,hash,"sessionId","paymentId","chargeId",state,adverse,"leaseToken","leaseUntil") ON "StripeSandboxSubmission" TO delivery_api;
GRANT INSERT ("scenarioId","accountId","eventId",digest,state,version) ON "StripeSandboxEvent" TO delivery_api;

CREATE POLICY stripe_scenario_read ON "StripeSandboxScenario" FOR SELECT TO delivery_api USING (
  current_setting('app.stripe_sandbox',true) = 'offline-test-v1' AND enabled
  AND "subjectId" = nullif(current_setting('app.subject_id',true),'')::uuid
  AND EXISTS (SELECT FROM "Branch" b WHERE b.id = "branchId" AND b."merchantId" = "StripeSandboxScenario"."merchantId")
);
CREATE POLICY stripe_submission_read ON "StripeSandboxSubmission" FOR SELECT TO delivery_api USING (
  EXISTS (SELECT FROM "StripeSandboxScenario" s WHERE s.id = "scenarioId" AND s."accountId" = "StripeSandboxSubmission"."accountId")
);
CREATE POLICY stripe_submission_insert ON "StripeSandboxSubmission" FOR INSERT TO delivery_api WITH CHECK (
  EXISTS (SELECT FROM "StripeSandboxScenario" s WHERE s.id = "scenarioId" AND s."accountId" = "StripeSandboxSubmission"."accountId")
);
CREATE POLICY stripe_submission_update ON "StripeSandboxSubmission" FOR UPDATE TO delivery_api USING (
  EXISTS (SELECT FROM "StripeSandboxScenario" s WHERE s.id = "scenarioId")
) WITH CHECK (EXISTS (SELECT FROM "StripeSandboxScenario" s WHERE s.id = "scenarioId"));
CREATE POLICY stripe_event_read ON "StripeSandboxEvent" FOR SELECT TO delivery_api USING (
  EXISTS (SELECT FROM "StripeSandboxSubmission" s WHERE s."scenarioId" = "StripeSandboxEvent"."scenarioId")
);
CREATE POLICY stripe_event_insert ON "StripeSandboxEvent" FOR INSERT TO delivery_api WITH CHECK (
  EXISTS (SELECT FROM "StripeSandboxSubmission" s WHERE s."scenarioId" = "StripeSandboxEvent"."scenarioId")
);

CREATE FUNCTION app.validate_stripe_scenario() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND (to_jsonb(NEW) - 'enabled') IS DISTINCT FROM (to_jsonb(OLD) - 'enabled')) THEN
    RAISE EXCEPTION 'Immutable sandbox scenario' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.validate_stripe_scenario() FROM PUBLIC;
CREATE TRIGGER stripe_scenario_validate BEFORE UPDATE OR DELETE ON "StripeSandboxScenario"
  FOR EACH ROW EXECUTE FUNCTION app.validate_stripe_scenario();
CREATE FUNCTION app.validate_stripe_submission() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Immutable sandbox history' USING ERRCODE = '23514'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW."scenarioId" <> OLD."scenarioId" OR NEW."accountId" <> OLD."accountId"
      OR (OLD.key IS NOT NULL AND (NEW.key IS DISTINCT FROM OLD.key OR NEW.hash IS DISTINCT FROM OLD.hash))
      OR (OLD."sessionId" IS NOT NULL AND NEW."sessionId" IS DISTINCT FROM OLD."sessionId")
      OR (OLD."paymentId" IS NOT NULL AND NEW."paymentId" IS DISTINCT FROM OLD."paymentId")
      OR (OLD."chargeId" IS NOT NULL AND NEW."chargeId" IS DISTINCT FROM OLD."chargeId")
      OR (OLD.adverse = 'disputed' AND NEW.adverse IS DISTINCT FROM 'disputed')
      OR (OLD.adverse = 'refunded' AND (NEW.adverse IS NULL OR NEW.adverse NOT IN ('refunded','disputed'))) THEN
      RAISE EXCEPTION 'Invalid sandbox transition' USING ERRCODE = '23514';
    END IF;
    IF OLD."leaseUntil" > clock_timestamp() AND NEW."leaseToken" IS DISTINCT FROM OLD."leaseToken" AND NEW."leaseToken" IS NOT NULL THEN
      RAISE EXCEPTION 'Active reservation' USING ERRCODE = '23514';
    END IF;
    NEW.version := OLD.version + 1;
    NEW."startedAt" := CASE WHEN OLD.key IS NULL AND NEW.key IS NOT NULL THEN clock_timestamp() ELSE OLD."startedAt" END;
  ELSE
    NEW.version := 1;
    NEW."startedAt" := NULL;
  END IF;
  IF NEW."leaseUntil" > clock_timestamp() + interval '60 seconds' THEN
    RAISE EXCEPTION 'Unbounded lease' USING ERRCODE = '23514';
  END IF;
  NEW."changedAt" := clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.validate_stripe_submission() FROM PUBLIC;
CREATE TRIGGER stripe_submission_validate BEFORE INSERT OR UPDATE OR DELETE ON "StripeSandboxSubmission"
  FOR EACH ROW EXECUTE FUNCTION app.validate_stripe_submission();
CREATE FUNCTION app.validate_stripe_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE submission app."StripeSandboxSubmission";
BEGIN
  SELECT * INTO submission FROM app."StripeSandboxSubmission" WHERE "scenarioId" = NEW."scenarioId";
  IF submission."sessionId" IS NULL OR NEW.version <> submission.version OR NEW.state <> submission.state
    OR (SELECT count(*) FROM app."StripeSandboxEvent" WHERE "scenarioId" = NEW."scenarioId") >= 1000 THEN
    RAISE EXCEPTION 'Invalid sandbox event' USING ERRCODE = '23514';
  END IF;
  NEW."receivedAt" := clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.validate_stripe_event() FROM PUBLIC;
CREATE TRIGGER stripe_event_validate BEFORE INSERT ON "StripeSandboxEvent" FOR EACH ROW EXECUTE FUNCTION app.validate_stripe_event();
CREATE TRIGGER stripe_event_immutable BEFORE UPDATE OR DELETE ON "StripeSandboxEvent"
  FOR EACH ROW EXECUTE FUNCTION app.reject_delivery_mutation();
COMMIT;
