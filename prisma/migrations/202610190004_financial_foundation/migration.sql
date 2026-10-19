BEGIN;
SET search_path TO app, extensions;

CREATE TABLE "ServicePaymentIntent" (
  "id" UUID PRIMARY KEY, "deliveryId" TEXT NOT NULL UNIQUE,
  "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" >= 0), "currency" TEXT NOT NULL CHECK ("currency" = 'MXN'),
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" = 'pending'),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" = 1),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE TABLE "ServicePaymentAttempt" (
  "id" UUID PRIMARY KEY, "intentId" UUID NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'not_submitted' CHECK ("status" = 'not_submitted'),
  "provider" TEXT CHECK ("provider" IS NULL), "providerPaymentId" TEXT CHECK ("providerPaymentId" IS NULL),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" = 1),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY ("intentId") REFERENCES "ServicePaymentIntent"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE TABLE "ServicePaymentCommand" (
  "subjectId" UUID NOT NULL, "idempotencyKeyHash" CHAR(64) NOT NULL CHECK ("idempotencyKeyHash" ~ '^[0-9a-f]{64}$'),
  "requestHash" CHAR(64) NOT NULL CHECK ("requestHash" ~ '^[0-9a-f]{64}$'), "intentId" UUID NOT NULL,
  PRIMARY KEY ("subjectId", "idempotencyKeyHash"),
  FOREIGN KEY ("intentId") REFERENCES "ServicePaymentIntent"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "ServicePaymentCommand_intentId_idx" ON "ServicePaymentCommand"("intentId");

-- Fixtures never reference operational Delivery or Payment; only migration role may provision them.
CREATE TABLE "PaymentEvidenceLabCase" (
  "id" UUID PRIMARY KEY, "branchId" TEXT NOT NULL, "merchantId" TEXT NOT NULL,
  "expectedAmountMinor" INTEGER NOT NULL CHECK ("expectedAmountMinor" >= 0),
  "currency" TEXT NOT NULL CHECK ("currency" = 'MXN'),
  "providerPaymentId" TEXT NOT NULL UNIQUE CHECK ("providerPaymentId" ~ '^fixture_[A-Za-z0-9_-]{1,100}$'),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY ("branchId", "merchantId") REFERENCES "Branch"("id", "merchantId") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "PaymentEvidenceLabCase_branchId_merchantId_idx" ON "PaymentEvidenceLabCase"("branchId", "merchantId");
CREATE TABLE "PaymentEvidenceLabEvent" (
  "id" UUID PRIMARY KEY, "caseId" UUID NOT NULL, "eventId" TEXT NOT NULL UNIQUE CHECK ("eventId" ~ '^fixture_[A-Za-z0-9_-]{1,100}$'),
  "requestHash" CHAR(64) NOT NULL CHECK ("requestHash" ~ '^[0-9a-f]{64}$'),
  "providerPaymentId" TEXT NOT NULL CHECK ("providerPaymentId" ~ '^fixture_[A-Za-z0-9_-]{1,100}$'),
  "source" TEXT NOT NULL CHECK ("source" IN ('synthetic_webhook', 'synthetic_reconciliation')),
  "kind" TEXT NOT NULL CHECK ("kind" IN ('pending','unknown','rejected','authorized','capture_pending','captured','reversed','disputed')),
  "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" >= 0), "currency" TEXT NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  "origin" TEXT NOT NULL CHECK ("origin" IN ('synthetic-fixture', 'rejected')),
  "state" TEXT NOT NULL CHECK ("state" IN ('pending','unknown','rejected','authorized','capture_pending','confirmed','reversed','disputed')),
  "disposition" TEXT NOT NULL CHECK ("disposition" IN ('applied','ignored_stale','mismatch','rejected_origin')),
  "needsReconciliation" BOOLEAN NOT NULL,
  "version" INTEGER NOT NULL CHECK ("version" > 0), "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  UNIQUE ("caseId", "version"),
  FOREIGN KEY ("caseId") REFERENCES "PaymentEvidenceLabCase"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- No mutable projections. Even migration credentials cannot edit evidence silently.
DO $$ DECLARE tab TEXT; BEGIN
  FOREACH tab IN ARRAY ARRAY['ServicePaymentIntent','ServicePaymentAttempt','ServicePaymentCommand','PaymentEvidenceLabCase','PaymentEvidenceLabEvent'] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', tab);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', tab);
    EXECUTE format('CREATE TRIGGER finance_immutable BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.reject_delivery_mutation()', tab);
  END LOOP;
END $$;
GRANT SELECT ON "ServicePaymentIntent", "ServicePaymentAttempt", "ServicePaymentCommand", "PaymentEvidenceLabCase", "PaymentEvidenceLabEvent" TO delivery_api;
GRANT INSERT ("id", "deliveryId", "amountMinor", "currency") ON "ServicePaymentIntent" TO delivery_api;
GRANT INSERT ("id", "intentId") ON "ServicePaymentAttempt" TO delivery_api;
GRANT INSERT ON "ServicePaymentCommand" TO delivery_api;
GRANT INSERT ("id", "caseId", "eventId", "requestHash", "providerPaymentId", "source", "kind", "amountMinor", "currency",
  "occurredAt", "origin", "state", "disposition", "needsReconciliation", "version") ON "PaymentEvidenceLabEvent" TO delivery_api;

CREATE POLICY payment_intent_read ON "ServicePaymentIntent" FOR SELECT TO delivery_api USING (
  EXISTS (SELECT FROM "Delivery" d WHERE d.id = "deliveryId")
);
CREATE POLICY payment_intent_create ON "ServicePaymentIntent" FOR INSERT TO delivery_api WITH CHECK (
  EXISTS (SELECT FROM "Delivery" d WHERE d.id = "deliveryId" AND d."amountMinor" = "ServicePaymentIntent"."amountMinor" AND d.currency = "ServicePaymentIntent".currency)
);
CREATE POLICY payment_attempt_read ON "ServicePaymentAttempt" FOR SELECT TO delivery_api USING (
  EXISTS (SELECT FROM "ServicePaymentIntent" p WHERE p.id = "intentId")
);
CREATE POLICY payment_attempt_create ON "ServicePaymentAttempt" FOR INSERT TO delivery_api WITH CHECK (
  EXISTS (SELECT FROM "ServicePaymentIntent" p WHERE p.id = "intentId")
);
CREATE POLICY payment_command_read ON "ServicePaymentCommand" FOR SELECT TO delivery_api USING (
  "subjectId" = nullif(current_setting('app.subject_id', true), '')::uuid AND EXISTS (SELECT FROM "ServicePaymentIntent" p WHERE p.id = "intentId")
);
CREATE POLICY payment_command_create ON "ServicePaymentCommand" FOR INSERT TO delivery_api WITH CHECK (
  "subjectId" = nullif(current_setting('app.subject_id', true), '')::uuid AND EXISTS (SELECT FROM "ServicePaymentIntent" p WHERE p.id = "intentId")
);
CREATE POLICY payment_lab_case_read ON "PaymentEvidenceLabCase" FOR SELECT TO delivery_api USING (
  current_setting('app.payment_evidence_lab', true) = 'synthetic-v1'
  AND EXISTS (SELECT FROM "Branch" b WHERE b.id = "branchId" AND b."merchantId" = "PaymentEvidenceLabCase"."merchantId")
);
CREATE POLICY payment_lab_event_read ON "PaymentEvidenceLabEvent" FOR SELECT TO delivery_api USING (
  EXISTS (SELECT FROM "PaymentEvidenceLabCase" c WHERE c.id = "caseId")
);
CREATE POLICY payment_lab_event_create ON "PaymentEvidenceLabEvent" FOR INSERT TO delivery_api WITH CHECK (
  EXISTS (SELECT FROM "PaymentEvidenceLabCase" c WHERE c.id = "caseId")
);

CREATE FUNCTION app.validate_payment_preparation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM app."Delivery" d WHERE d.id = NEW."deliveryId" AND d."amountMinor" = NEW."amountMinor" AND d.currency = NEW.currency) THEN
    RAISE EXCEPTION 'Payment amount mismatch' USING ERRCODE = '23514';
  END IF;
  NEW."createdAt" := clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.validate_payment_preparation() FROM PUBLIC;
CREATE TRIGGER payment_intent_validate BEFORE INSERT ON "ServicePaymentIntent" FOR EACH ROW EXECUTE FUNCTION app.validate_payment_preparation();
CREATE FUNCTION app.require_payment_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM app."ServicePaymentAttempt" a WHERE a."intentId" = NEW.id) THEN
    RAISE EXCEPTION 'Missing prepared payment attempt' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.require_payment_attempt() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER payment_attempt_required AFTER INSERT ON "ServicePaymentIntent"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.require_payment_attempt();

CREATE FUNCTION app.validate_payment_lab_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous_version INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('payment-lab:' || NEW."caseId"::text, 0));
  SELECT coalesce(max(version), 0) INTO previous_version FROM app."PaymentEvidenceLabEvent" WHERE "caseId" = NEW."caseId";
  IF NEW.version <> previous_version + 1 THEN
    RAISE EXCEPTION 'Invalid evidence sequence' USING ERRCODE = '23514';
  END IF;
  IF NEW.state = 'confirmed' AND NEW.disposition = 'applied' AND
      (NEW.origin <> 'synthetic-fixture' OR NEW.source <> 'synthetic_reconciliation' OR NEW.kind <> 'captured') THEN
    RAISE EXCEPTION 'Invalid laboratory confirmation' USING ERRCODE = '23514';
  END IF;
  NEW."receivedAt" := clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.validate_payment_lab_event() FROM PUBLIC;
CREATE TRIGGER payment_lab_event_validate BEFORE INSERT ON "PaymentEvidenceLabEvent" FOR EACH ROW EXECUTE FUNCTION app.validate_payment_lab_event();
COMMIT;
