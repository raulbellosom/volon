-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
SET search_path TO app, extensions;

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "subjectId" UUID NOT NULL,
    "merchantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingQuote" (
    "id" TEXT NOT NULL,
    "subjectId" UUID NOT NULL,
    "merchantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "baseAmountMinor" INTEGER NOT NULL,
    "distanceAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "rateVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branch_merchantId_idx" ON "Branch"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_id_merchantId_key" ON "Branch"("id", "merchantId");

-- CreateIndex
CREATE INDEX "Membership_branchId_merchantId_idx" ON "Membership"("branchId", "merchantId");

-- CreateIndex
CREATE INDEX "Membership_merchantId_idx" ON "Membership"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_subjectId_branchId_key" ON "Membership"("subjectId", "branchId");

-- CreateIndex
CREATE INDEX "PricingQuote_branchId_merchantId_createdAt_idx" ON "PricingQuote"("branchId", "merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "PricingQuote_subjectId_idx" ON "PricingQuote"("subjectId");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_branchId_merchantId_fkey" FOREIGN KEY ("branchId", "merchantId") REFERENCES "Branch"("id", "merchantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingQuote" ADD CONSTRAINT "PricingQuote_branchId_merchantId_fkey" FOREIGN KEY ("branchId", "merchantId") REFERENCES "Branch"("id", "merchantId") ON DELETE RESTRICT ON UPDATE CASCADE;
