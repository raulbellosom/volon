BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
-- Existing Delivery rows and snapshots are never updated. Serialize this rollout with inserts.
LOCK TABLE app."Delivery" IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE app."DeliveryPublicReference" (
  "deliveryId" TEXT PRIMARY KEY REFERENCES app."Delivery"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  "publicReference" TEXT NOT NULL UNIQUE CHECK (
    "publicReference" ~ '^[A-Z]{2,4}-[0-9]{2}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6,10}$'),
  "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON app."DeliveryPublicReference" FROM PUBLIC, anon, authenticated;
GRANT SELECT ON app."DeliveryPublicReference" TO delivery_api;
GRANT INSERT("deliveryId", "publicReference") ON app."DeliveryPublicReference" TO delivery_api;
ALTER TABLE app."DeliveryPublicReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app."DeliveryPublicReference" FORCE ROW LEVEL SECURITY;
CREATE POLICY delivery_reference_read ON app."DeliveryPublicReference" FOR SELECT TO delivery_api USING (
  EXISTS (SELECT 1 FROM app."Delivery" d WHERE d.id = "deliveryId")
);
CREATE POLICY delivery_reference_insert ON app."DeliveryPublicReference" FOR INSERT TO delivery_api WITH CHECK (
  EXISTS (SELECT 1 FROM app."Delivery" d WHERE d.id = "deliveryId")
);
CREATE FUNCTION app.reject_delivery_reference_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Delivery reference immutable' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER delivery_reference_immutable BEFORE UPDATE OR DELETE ON app."DeliveryPublicReference"
  FOR EACH ROW EXECUTE FUNCTION app.reject_delivery_reference_mutation();

-- Administrative migration/repair only, INVOKER. No grant to runtime or Supabase clients.
CREATE FUNCTION app.backfill_delivery_public_references(prefix TEXT DEFAULT 'VL') RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  delivery_id TEXT;
  candidate TEXT;
  suffix TEXT;
  alphabet CONSTANT TEXT := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  sample INTEGER;
  attempt INTEGER;
  affected INTEGER;
  total INTEGER := 0;
  finished BOOLEAN;
BEGIN
  IF prefix IS NULL OR prefix !~ '^[A-Z]{2,4}$' THEN
    RAISE EXCEPTION 'Invalid reference prefix' USING ERRCODE = '23514';
  END IF;
  LOCK TABLE app."Delivery" IN SHARE ROW EXCLUSIVE MODE;
  FOR delivery_id IN SELECT d.id FROM app."Delivery" d
    LEFT JOIN app."DeliveryPublicReference" r ON r."deliveryId" = d.id WHERE r."deliveryId" IS NULL ORDER BY d.id
  LOOP
    finished := false;
    FOR attempt IN 1..8 LOOP
      suffix := '';
      WHILE length(suffix) < 6 LOOP
        sample := get_byte(extensions.gen_random_bytes(1), 0);
        IF sample < 240 THEN suffix := suffix || substr(alphabet, sample % 30 + 1, 1); END IF;
      END LOOP;
      candidate := prefix || '-' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YY') || '-' || suffix;
      BEGIN
        INSERT INTO app."DeliveryPublicReference"("deliveryId", "publicReference") VALUES (delivery_id, candidate)
          ON CONFLICT ("deliveryId") DO NOTHING;
        GET DIAGNOSTICS affected = ROW_COUNT;
        total := total + affected;
        finished := true;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Only a publicReference collision can reach here; retry with fresh CSPRNG.
      END;
    END LOOP;
    IF NOT finished THEN RAISE EXCEPTION 'Reference generation exhausted' USING ERRCODE = '23514'; END IF;
  END LOOP;
  RETURN total;
END $$;
REVOKE ALL ON FUNCTION app.backfill_delivery_public_references(TEXT) FROM PUBLIC, anon, authenticated, delivery_api;
SELECT app.backfill_delivery_public_references();

CREATE FUNCTION app.require_delivery_public_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app."DeliveryPublicReference" r WHERE r."deliveryId" = NEW.id) THEN
    RAISE EXCEPTION 'Delivery reference required' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER delivery_reference_required AFTER INSERT ON app."Delivery"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.require_delivery_public_reference();
REVOKE ALL ON FUNCTION app.reject_delivery_reference_mutation(), app.require_delivery_public_reference() FROM PUBLIC;
COMMIT;
