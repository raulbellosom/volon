-- CreateTable
SET search_path TO app, extensions;
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "subjectId" UUID NOT NULL,
    "merchantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "version" INTEGER NOT NULL DEFAULT 1,
    "amountMinor" INTEGER NOT NULL,
    "baseAmountMinor" INTEGER NOT NULL,
    "distanceAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "rateVersion" TEXT NOT NULL,
    "routeSnapshot" JSONB NOT NULL,
    "idempotencyKeyHash" CHAR(64) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_quoteId_key" ON "Delivery"("quoteId");

-- CreateIndex
CREATE INDEX "Delivery_branchId_merchantId_createdAt_idx" ON "Delivery"("branchId", "merchantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_subjectId_branchId_idempotencyKeyHash_key" ON "Delivery"("subjectId", "branchId", "idempotencyKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_quoteId_branchId_merchantId_key" ON "Delivery"("quoteId", "branchId", "merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingQuote_id_branchId_merchantId_key" ON "PricingQuote"("id", "branchId", "merchantId");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_branchId_merchantId_fkey" FOREIGN KEY ("branchId", "merchantId") REFERENCES "Branch"("id", "merchantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_quoteId_branchId_merchantId_fkey" FOREIGN KEY ("quoteId", "branchId", "merchantId") REFERENCES "PricingQuote"("id", "branchId", "merchantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE app."Delivery" ADD CONSTRAINT delivery_initial_state CHECK ("status" = 'requested' AND "version" = 1);
ALTER TABLE app."Delivery" ADD CONSTRAINT delivery_snapshot_amounts CHECK (
  "amountMinor" >= 0 AND "baseAmountMinor" >= 0 AND "distanceAmountMinor" >= 0
  AND "amountMinor"::bigint = "baseAmountMinor"::bigint + "distanceAmountMinor"::bigint
  AND "currency" = 'MXN' AND length("rateVersion") > 0
);
ALTER TABLE app."Delivery" ADD CONSTRAINT delivery_command_hashes CHECK (
  "idempotencyKeyHash" ~ '^[0-9a-f]{64}$' AND "requestHash" ~ '^[0-9a-f]{64}$'
);

GRANT SELECT, INSERT ON app."Delivery" TO delivery_api;
ALTER TABLE app."Delivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app."Delivery" FORCE ROW LEVEL SECURITY;
CREATE POLICY delivery_read ON app."Delivery" FOR SELECT TO delivery_api USING (
  EXISTS (SELECT 1 FROM app."Branch" b WHERE b."id" = "Delivery"."branchId"
    AND b."merchantId" = "Delivery"."merchantId")
);
CREATE POLICY delivery_create ON app."Delivery" FOR INSERT TO delivery_api WITH CHECK (
  "subjectId" = nullif(current_setting('app.subject_id', true), '')::uuid
  AND EXISTS (SELECT 1 FROM app."PricingQuote" q
    WHERE q."id" = "Delivery"."quoteId" AND q."branchId" = "Delivery"."branchId"
      AND q."merchantId" = "Delivery"."merchantId" AND q."expiresAt" > clock_timestamp()
      AND q."amountMinor" = "Delivery"."amountMinor" AND q."baseAmountMinor" = "Delivery"."baseAmountMinor"
      AND q."distanceAmountMinor" = "Delivery"."distanceAmountMinor" AND q."currency" = "Delivery"."currency"
      AND q."rateVersion" = "Delivery"."rateVersion" AND q."request" = "Delivery"."routeSnapshot")
);

-- INVOKER, private schema. No transition or deletion is supported in this increment.
CREATE FUNCTION app.reject_delivery_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Delivery is immutable in this increment' USING ERRCODE = '23514';
END;
$$;
REVOKE ALL ON FUNCTION app.reject_delivery_mutation() FROM PUBLIC;
CREATE TRIGGER delivery_immutable BEFORE UPDATE OR DELETE ON app."Delivery"
FOR EACH ROW EXECUTE FUNCTION app.reject_delivery_mutation();
