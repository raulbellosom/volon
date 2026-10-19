-- Additive, local/synthetic only. No links or privileges to Merchant/Delivery.
CREATE TABLE app."Courier" (
  id TEXT PRIMARY KEY,
  "subjectId" UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT courier_id CHECK (id ~ '^[A-Za-z0-9_-]{1,128}$')
);
CREATE TABLE app."CourierShift" (
  "courierId" TEXT PRIMARY KEY REFERENCES app."Courier"(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'offline',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT courier_availability_status CHECK (status IN ('offline', 'available'))
);
CREATE TABLE app."CourierAvailabilityCommand" (
  "courierId" TEXT NOT NULL REFERENCES app."Courier"(id) ON DELETE RESTRICT,
  "idempotencyKeyHash" CHAR(64) NOT NULL CHECK ("idempotencyKeyHash" ~ '^[0-9a-f]{64}$'),
  "requestHash" CHAR(64) NOT NULL CHECK ("requestHash" ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL CHECK (status IN ('offline', 'available')),
  version INTEGER NOT NULL CHECK (version > 1),
  "changedAt" TIMESTAMPTZ(3) NOT NULL,
  PRIMARY KEY ("courierId", "idempotencyKeyHash")
);

REVOKE ALL ON app."Courier", app."CourierShift", app."CourierAvailabilityCommand" FROM PUBLIC, anon, authenticated;
GRANT SELECT ON app."Courier", app."CourierShift", app."CourierAvailabilityCommand" TO delivery_api;
GRANT UPDATE(status, version) ON app."CourierShift" TO delivery_api;
GRANT INSERT ON app."CourierAvailabilityCommand" TO delivery_api;
ALTER TABLE app."Courier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app."Courier" FORCE ROW LEVEL SECURITY;
ALTER TABLE app."CourierShift" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app."CourierShift" FORCE ROW LEVEL SECURITY;
ALTER TABLE app."CourierAvailabilityCommand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app."CourierAvailabilityCommand" FORCE ROW LEVEL SECURITY;

CREATE POLICY courier_self ON app."Courier" FOR SELECT TO delivery_api USING (
  enabled AND "subjectId" = nullif(current_setting('app.subject_id', true), '')::uuid
);
CREATE POLICY courier_shift_read ON app."CourierShift" FOR SELECT TO delivery_api USING (
  EXISTS (SELECT 1 FROM app."Courier" c WHERE c.id = "courierId")
);
CREATE POLICY courier_shift_update ON app."CourierShift" FOR UPDATE TO delivery_api USING (
  EXISTS (SELECT 1 FROM app."Courier" c WHERE c.id = "courierId")
) WITH CHECK (EXISTS (SELECT 1 FROM app."Courier" c WHERE c.id = "courierId"));
CREATE POLICY courier_command_read ON app."CourierAvailabilityCommand" FOR SELECT TO delivery_api USING (
  EXISTS (SELECT 1 FROM app."Courier" c WHERE c.id = "courierId")
);
CREATE POLICY courier_command_insert ON app."CourierAvailabilityCommand" FOR INSERT TO delivery_api WITH CHECK (
  EXISTS (SELECT 1 FROM app."CourierShift" s WHERE s."courierId" = "CourierAvailabilityCommand"."courierId"
    AND s.status = "CourierAvailabilityCommand".status AND s.version = "CourierAvailabilityCommand".version
    AND s."changedAt" = "CourierAvailabilityCommand"."changedAt")
);

-- Invoker functions, private schema, no new privileged entry points.
-- The SAME lock is used by repository commands and administrative revocation.
CREATE FUNCTION app.guard_courier_profile() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('courier-subject:' || OLD."subjectId"::text, 0));
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Courier deletion unsupported' USING ERRCODE = '23514';
  END IF;
  IF NEW.id <> OLD.id OR NEW."subjectId" <> OLD."subjectId" OR NEW."createdAt" <> OLD."createdAt" THEN
    RAISE EXCEPTION 'Courier identity immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.enabled AND NOT NEW.enabled THEN
    UPDATE app."CourierShift" SET status = 'offline', version = version + 1 WHERE "courierId" = OLD.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER courier_profile_guard BEFORE UPDATE OR DELETE ON app."Courier"
FOR EACH ROW EXECUTE FUNCTION app.guard_courier_profile();

CREATE FUNCTION app.guard_courier_shift() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Courier availability deletion unsupported' USING ERRCODE = '23514';
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'offline' OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'Courier starts offline' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW."courierId" <> OLD."courierId" OR NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'Invalid courier availability version' USING ERRCODE = '23514';
  END IF;
  NEW."changedAt" := clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER courier_shift_guard BEFORE INSERT OR UPDATE OR DELETE ON app."CourierShift"
FOR EACH ROW EXECUTE FUNCTION app.guard_courier_shift();

CREATE FUNCTION app.reject_courier_command_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Courier command immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER courier_command_immutable BEFORE UPDATE OR DELETE ON app."CourierAvailabilityCommand"
FOR EACH ROW EXECUTE FUNCTION app.reject_courier_command_mutation();
REVOKE ALL ON FUNCTION app.guard_courier_profile(), app.guard_courier_shift(), app.reject_courier_command_mutation() FROM PUBLIC;
