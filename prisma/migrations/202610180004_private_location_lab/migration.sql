-- CreateTable
CREATE TABLE app."PrivateLocationEnvelope" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "merchantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "requestId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "policyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "keyRef" UUID NOT NULL,
    "iv" BYTEA NOT NULL,
    "tag" BYTEA NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "keyDestroyedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PrivateLocationEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivateLocationEnvelope_keyRef_key" ON app."PrivateLocationEnvelope"("keyRef");

-- CreateIndex
CREATE INDEX "PrivateLocationEnvelope_branchId_merchantId_idx" ON app."PrivateLocationEnvelope"("branchId", "merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateLocationEnvelope_subjectId_branchId_requestId_key" ON app."PrivateLocationEnvelope"("subjectId", "branchId", "requestId");

-- AddForeignKey
ALTER TABLE app."PrivateLocationEnvelope" ADD CONSTRAINT "PrivateLocationEnvelope_branchId_merchantId_fkey" FOREIGN KEY ("branchId", "merchantId") REFERENCES app."Branch"("id", "merchantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- This table is an isolated synthetic laboratory; no changes to Quote/Delivery.
ALTER TABLE app."PrivateLocationEnvelope" ADD CONSTRAINT private_location_shape CHECK (
  version = 1 AND "keyRef" = id AND "policyId" ~ '^synthetic-[a-z0-9-]{1,64}$'
  AND octet_length(iv) = 12 AND octet_length(tag) = 16
  AND octet_length(ciphertext) BETWEEN 1 AND 4096 AND "expiresAt" > "createdAt"
  AND (
    (state = 'active' AND "revokedAt" IS NULL AND "keyDestroyedAt" IS NULL)
    OR (state = 'revoked' AND "revokedAt" IS NOT NULL AND "revokedAt" >= "createdAt" AND "keyDestroyedAt" IS NULL)
    OR (state = 'key_destroyed' AND "revokedAt" IS NOT NULL AND "keyDestroyedAt" IS NOT NULL
      AND "revokedAt" >= "createdAt" AND "keyDestroyedAt" >= "revokedAt")
  )
);

ALTER TABLE app."PrivateLocationEnvelope" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app."PrivateLocationEnvelope" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app."PrivateLocationEnvelope" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON app."PrivateLocationEnvelope" TO delivery_api;
GRANT UPDATE (state, "revokedAt", "keyDestroyedAt") ON app."PrivateLocationEnvelope" TO delivery_api;

CREATE POLICY private_location_scope ON app."PrivateLocationEnvelope" FOR SELECT TO delivery_api
USING (
  current_setting('app.private_location_lab', true) = 'synthetic-v1'
  AND EXISTS (SELECT 1 FROM app."Branch" b WHERE b.id = "PrivateLocationEnvelope"."branchId"
    AND b."merchantId" = "PrivateLocationEnvelope"."merchantId")
);
CREATE POLICY private_location_insert ON app."PrivateLocationEnvelope" FOR INSERT TO delivery_api
WITH CHECK (
  current_setting('app.private_location_lab', true) = 'synthetic-v1'
  AND "subjectId" = nullif(current_setting('app.subject_id', true), '')::uuid
  AND state = 'active' AND "expiresAt" > clock_timestamp()
  AND EXISTS (SELECT 1 FROM app."Branch" b WHERE b.id = "PrivateLocationEnvelope"."branchId"
    AND b."merchantId" = "PrivateLocationEnvelope"."merchantId")
);
CREATE POLICY private_location_retire ON app."PrivateLocationEnvelope" FOR UPDATE TO delivery_api
USING (
  current_setting('app.private_location_lab', true) = 'synthetic-v1'
  AND EXISTS (SELECT 1 FROM app."Branch" b WHERE b.id = "PrivateLocationEnvelope"."branchId"
    AND b."merchantId" = "PrivateLocationEnvelope"."merchantId")
) WITH CHECK (
  current_setting('app.private_location_lab', true) = 'synthetic-v1'
  AND state IN ('revoked', 'key_destroyed')
  AND EXISTS (SELECT 1 FROM app."Branch" b WHERE b.id = "PrivateLocationEnvelope"."branchId"
    AND b."merchantId" = "PrivateLocationEnvelope"."merchantId")
);

CREATE FUNCTION app.guard_private_location_lab() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Private location laboratory rows cannot be deleted' USING ERRCODE = '23514';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['state', 'revokedAt', 'keyDestroyedAt'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['state', 'revokedAt', 'keyDestroyedAt'])
    OR NOT (
      (OLD.state = 'active' AND NEW.state = 'revoked' AND NEW."keyDestroyedAt" IS NULL)
      OR (OLD.state = 'revoked' AND NEW.state = 'key_destroyed' AND NEW."revokedAt" = OLD."revokedAt")
    ) THEN
    RAISE EXCEPTION 'Invalid private location transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION app.guard_private_location_lab() FROM PUBLIC;
CREATE TRIGGER private_location_lab_immutable
BEFORE UPDATE OR DELETE ON app."PrivateLocationEnvelope"
FOR EACH ROW EXECUTE FUNCTION app.guard_private_location_lab();
