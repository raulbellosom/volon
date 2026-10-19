-- Synthetic migration fixture, inserted ONLY in the disposable empty cluster before migration 7.
INSERT INTO app."Merchant" VALUES ('legacy_merchant', 'Migración sintética', true);
INSERT INTO app."Branch" VALUES ('legacy_branch', 'legacy_merchant', 'Sucursal sintética', true, 0, 0);
INSERT INTO app."PricingQuote" (id, "subjectId", "merchantId", "branchId", request,
  "amountMinor", "baseAmountMinor", "distanceAmountMinor", currency, "expiresAt", "rateVersion")
VALUES ('legacy_quote', '00000000-0000-4000-8000-000000000001', 'legacy_merchant', 'legacy_branch',
  '{"branchId":"legacy_branch","pickup":{"lat":0,"lng":0},"dropoff":{"lat":0.01,"lng":0.01},"serviceType":"local_delivery"}',
  100, 100, 0, 'MXN', '2099-01-01', 'synthetic');
INSERT INTO app."Delivery" (id, "subjectId", "merchantId", "branchId", "quoteId", "amountMinor", "baseAmountMinor",
  "distanceAmountMinor", currency, "rateVersion", "routeSnapshot", "idempotencyKeyHash", "requestHash", "createdAt")
SELECT 'legacy_delivery', "subjectId", "merchantId", "branchId", id, "amountMinor", "baseAmountMinor",
  "distanceAmountMinor", currency, "rateVersion", request, repeat('a',64), repeat('b',64), '2025-12-31T23:59:59Z'
FROM app."PricingQuote" WHERE id = 'legacy_quote';
