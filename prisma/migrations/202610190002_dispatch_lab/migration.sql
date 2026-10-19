-- Isolated synthetic aggregate. No mutation, FK or new grants on Delivery.
CREATE TABLE app."DispatchLabScenario" (
  id UUID PRIMARY KEY,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE app."DispatchLabOffer" (
  id UUID PRIMARY KEY,
  "syntheticDeliveryRef" UUID NOT NULL REFERENCES app."DispatchLabScenario"(id) ON DELETE RESTRICT,
  "courierId" TEXT NOT NULL REFERENCES app."Courier"(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','accepted','declined','withdrawn','expired')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (id, "syntheticDeliveryRef", "courierId")
);
CREATE INDEX dispatch_lab_offer_courier ON app."DispatchLabOffer"("courierId");
CREATE TABLE app."DispatchLabAssignment" (
  id UUID PRIMARY KEY,
  "offerId" UUID NOT NULL UNIQUE,
  "syntheticDeliveryRef" UUID NOT NULL,
  "courierId" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  UNIQUE ("offerId", "syntheticDeliveryRef", "courierId"),
  FOREIGN KEY ("offerId", "syntheticDeliveryRef", "courierId")
    REFERENCES app."DispatchLabOffer"(id, "syntheticDeliveryRef", "courierId") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX dispatch_lab_active_delivery ON app."DispatchLabAssignment"("syntheticDeliveryRef") WHERE status = 'active';
CREATE UNIQUE INDEX dispatch_lab_active_courier ON app."DispatchLabAssignment"("courierId") WHERE status = 'active';
CREATE TABLE app."DispatchLabCommand" (
  "courierId" TEXT NOT NULL REFERENCES app."Courier"(id) ON DELETE RESTRICT,
  "idempotencyKeyHash" CHAR(64) NOT NULL CHECK ("idempotencyKeyHash" ~ '^[0-9a-f]{64}$'),
  "requestHash" CHAR(64) NOT NULL CHECK ("requestHash" ~ '^[0-9a-f]{64}$'),
  receipt JSONB NOT NULL CHECK (jsonb_typeof(receipt) = 'object'),
  PRIMARY KEY ("courierId", "idempotencyKeyHash")
);
CREATE TABLE app."DispatchLabOutbox" (
  id UUID PRIMARY KEY,
  "courierId" TEXT NOT NULL REFERENCES app."Courier"(id) ON DELETE RESTRICT,
  "syntheticDeliveryRef" UUID NOT NULL REFERENCES app."DispatchLabScenario"(id) ON DELETE RESTRICT,
  "aggregateKind" TEXT NOT NULL CHECK ("aggregateKind" IN ('offer','assignment')),
  "aggregateId" UUID NOT NULL,
  "aggregateVersion" INTEGER NOT NULL CHECK ("aggregateVersion" > 0),
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  UNIQUE ("aggregateKind", "aggregateId", "aggregateVersion")
);
CREATE INDEX dispatch_lab_outbox_courier ON app."DispatchLabOutbox"("courierId");

DO $$ DECLARE table_name TEXT; BEGIN
  FOREACH table_name IN ARRAY ARRAY['DispatchLabScenario','DispatchLabOffer','DispatchLabAssignment','DispatchLabCommand','DispatchLabOutbox'] LOOP
    EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC, anon, authenticated, delivery_api', table_name);
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', table_name);
    IF table_name <> 'DispatchLabScenario' THEN
      EXECUTE format('GRANT SELECT, INSERT ON app.%I TO delivery_api', table_name);
      EXECUTE format('CREATE POLICY dispatch_lab_self ON app.%I TO delivery_api USING (
        current_setting(''app.dispatch_lab'', true) = ''synthetic-v1'' AND EXISTS
        (SELECT 1 FROM app."Courier" c WHERE c.id = "courierId")) WITH CHECK (
        current_setting(''app.dispatch_lab'', true) = ''synthetic-v1'' AND EXISTS
        (SELECT 1 FROM app."Courier" c WHERE c.id = "courierId"))', table_name);
    END IF;
  END LOOP;
END $$;
GRANT UPDATE(status, version) ON app."DispatchLabOffer", app."DispatchLabAssignment" TO delivery_api;

CREATE FUNCTION app.guard_dispatch_lab_offer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Laboratory history immutable' USING ERRCODE = '23514';
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'offered' OR NEW.version <> 1 OR NEW."expiresAt" <= clock_timestamp()
      OR NEW."expiresAt" > clock_timestamp() + interval '300 seconds' THEN
      RAISE EXCEPTION 'Invalid laboratory offer' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.id <> OLD.id OR NEW."syntheticDeliveryRef" <> OLD."syntheticDeliveryRef"
      OR NEW."courierId" <> OLD."courierId" OR NEW."expiresAt" <> OLD."expiresAt"
      OR OLD.status <> 'offered' OR NEW.status = 'offered' OR NEW.version <> OLD.version + 1 THEN
      RAISE EXCEPTION 'Invalid laboratory transition' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'accepted' AND OLD."expiresAt" <= clock_timestamp() THEN
      RAISE EXCEPTION 'Laboratory offer expired' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'expired' AND OLD."expiresAt" > clock_timestamp() THEN
      RAISE EXCEPTION 'Laboratory offer not expired' USING ERRCODE = '23514';
    END IF;
  END IF;
  NEW."changedAt" := clock_timestamp();
  RETURN NEW;
END $$;
CREATE TRIGGER dispatch_lab_offer_guard BEFORE INSERT OR UPDATE OR DELETE ON app."DispatchLabOffer"
  FOR EACH ROW EXECUTE FUNCTION app.guard_dispatch_lab_offer();

CREATE FUNCTION app.guard_dispatch_lab_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Laboratory history immutable' USING ERRCODE = '23514';
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'active' OR NEW.version <> 1 OR NOT EXISTS (
      SELECT 1 FROM app."DispatchLabOffer" o JOIN app."CourierShift" s ON s."courierId" = o."courierId"
      JOIN app."Courier" c ON c.id = s."courierId"
      WHERE o.id = NEW."offerId" AND o.status = 'accepted' AND o."expiresAt" > clock_timestamp()
        AND s.status = 'available' AND c.enabled
    ) THEN
      RAISE EXCEPTION 'Invalid laboratory assignment' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.id <> OLD.id OR NEW."offerId" <> OLD."offerId"
    OR NEW."syntheticDeliveryRef" <> OLD."syntheticDeliveryRef" OR NEW."courierId" <> OLD."courierId"
    OR OLD.status <> 'active' OR NEW.status <> 'revoked' OR NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'Invalid laboratory transition' USING ERRCODE = '23514';
  END IF;
  NEW."changedAt" := clock_timestamp();
  RETURN NEW;
END $$;
CREATE TRIGGER dispatch_lab_assignment_guard BEFORE INSERT OR UPDATE OR DELETE ON app."DispatchLabAssignment"
  FOR EACH ROW EXECUTE FUNCTION app.guard_dispatch_lab_assignment();

CREATE FUNCTION app.guard_dispatch_lab_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT 'offer'::text kind, id, "courierId", "syntheticDeliveryRef", version, status, "changedAt" FROM app."DispatchLabOffer"
      UNION ALL
      SELECT 'assignment', id, "courierId", "syntheticDeliveryRef", version, status, "changedAt" FROM app."DispatchLabAssignment"
    ) a WHERE a.kind = NEW."aggregateKind" AND a.id = NEW."aggregateId" AND a.version = NEW."aggregateVersion"
      AND a."courierId" = NEW."courierId" AND a."syntheticDeliveryRef" = NEW."syntheticDeliveryRef"
      AND NEW."eventType" = a.kind || '.' || a.status || '.v1' AND NEW."occurredAt" = a."changedAt"
  ) THEN
    RAISE EXCEPTION 'Invalid laboratory event' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER dispatch_lab_event_guard BEFORE INSERT ON app."DispatchLabOutbox"
  FOR EACH ROW EXECUTE FUNCTION app.guard_dispatch_lab_event();

-- Deferred: missing outbox also prevents committing a direct SQL transition.
CREATE FUNCTION app.require_dispatch_lab_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app."DispatchLabOutbox" e
    WHERE e."aggregateKind" = TG_ARGV[0] AND e."aggregateId" = NEW.id AND e."aggregateVersion" = NEW.version) THEN
    RAISE EXCEPTION 'Laboratory event required' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER dispatch_lab_offer_event AFTER INSERT OR UPDATE ON app."DispatchLabOffer"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.require_dispatch_lab_event('offer');
CREATE CONSTRAINT TRIGGER dispatch_lab_assignment_event AFTER INSERT OR UPDATE ON app."DispatchLabAssignment"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.require_dispatch_lab_event('assignment');

CREATE TRIGGER dispatch_lab_command_immutable BEFORE UPDATE OR DELETE ON app."DispatchLabCommand"
  FOR EACH ROW EXECUTE FUNCTION app.reject_courier_command_mutation();
CREATE TRIGGER dispatch_lab_outbox_immutable BEFORE UPDATE OR DELETE ON app."DispatchLabOutbox"
  FOR EACH ROW EXECUTE FUNCTION app.reject_courier_command_mutation();
CREATE TRIGGER dispatch_lab_scenario_immutable BEFORE UPDATE OR DELETE ON app."DispatchLabScenario"
  FOR EACH ROW EXECUTE FUNCTION app.reject_courier_command_mutation();
REVOKE ALL ON FUNCTION app.guard_dispatch_lab_offer(), app.guard_dispatch_lab_assignment(),
  app.guard_dispatch_lab_event(), app.require_dispatch_lab_event() FROM PUBLIC;
