-- Runtime role has no password until the local bootstrap provisions a random one.
CREATE ROLE delivery_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO delivery_api;
GRANT USAGE ON SCHEMA app, extensions TO delivery_api;
GRANT SELECT ON app."Merchant", app."Branch", app."Membership", app."PricingQuote" TO delivery_api;
GRANT INSERT ON app."PricingQuote" TO delivery_api;

ALTER TABLE app."Branch" ADD CONSTRAINT branch_coordinates CHECK (
  "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180
);
ALTER TABLE app."PricingQuote" ADD CONSTRAINT quote_amounts CHECK (
  "amountMinor" >= 0 AND "baseAmountMinor" >= 0 AND "distanceAmountMinor" >= 0
  AND "amountMinor"::bigint = "baseAmountMinor"::bigint + "distanceAmountMinor"::bigint
  AND "currency" = 'MXN' AND length("rateVersion") > 0
);

-- Subject is transaction-local and established only after remote Auth verification.
-- No SECURITY DEFINER functions or permissions on Supabase internal schemas.
ALTER TABLE app."Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app."Membership" FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_self ON app."Membership" FOR SELECT TO delivery_api
USING ("subjectId" = nullif(current_setting('app.subject_id', true), '')::uuid AND "enabled");

ALTER TABLE app."Merchant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app."Merchant" FORCE ROW LEVEL SECURITY;
CREATE POLICY merchant_member ON app."Merchant" FOR SELECT TO delivery_api
USING ("enabled" AND EXISTS (
  SELECT 1 FROM app."Membership" m WHERE m."merchantId" = "Merchant"."id"
));

ALTER TABLE app."Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app."Branch" FORCE ROW LEVEL SECURITY;
CREATE POLICY branch_member ON app."Branch" FOR SELECT TO delivery_api
USING ("enabled" AND EXISTS (
  SELECT 1 FROM app."Membership" m JOIN app."Merchant" t ON t."id" = m."merchantId"
  WHERE m."branchId" = "Branch"."id" AND m."merchantId" = "Branch"."merchantId"
));

ALTER TABLE app."PricingQuote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app."PricingQuote" FORCE ROW LEVEL SECURITY;
CREATE POLICY quote_read ON app."PricingQuote" FOR SELECT TO delivery_api
USING (EXISTS (
  SELECT 1 FROM app."Branch" b WHERE b."id" = "PricingQuote"."branchId"
  AND b."merchantId" = "PricingQuote"."merchantId"
));
CREATE POLICY quote_create ON app."PricingQuote" FOR INSERT TO delivery_api
WITH CHECK (
  "subjectId" = nullif(current_setting('app.subject_id', true), '')::uuid
  AND EXISTS (SELECT 1 FROM app."Branch" b WHERE b."id" = "PricingQuote"."branchId"
    AND b."merchantId" = "PricingQuote"."merchantId")
);
