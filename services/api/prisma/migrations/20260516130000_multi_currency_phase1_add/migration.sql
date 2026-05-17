-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('BS', 'USD', 'EUR');

-- Venue: país y moneda de pricing
ALTER TABLE "Venue" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'VE';
ALTER TABLE "Venue" ADD COLUMN "pricingCurrency" "CurrencyCode";

UPDATE "Venue" SET "pricingCurrency" = CASE
  WHEN "displayCurrency" IN ('BS', 'USD', 'EUR') THEN "displayCurrency"::"CurrencyCode"
  ELSE 'BS'::"CurrencyCode"
END;

ALTER TABLE "Venue" ALTER COLUMN "pricingCurrency" SET NOT NULL;
ALTER TABLE "Venue" ALTER COLUMN "pricingCurrency" SET DEFAULT 'BS';

-- VenueMonetizationSettings
CREATE TABLE "VenueMonetizationSettings" (
    "venueId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Caracas',
    "allowOverpayment" BOOLEAN NOT NULL DEFAULT false,
    "overpaymentToleranceMinor" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueMonetizationSettings_pkey" PRIMARY KEY ("venueId")
);

INSERT INTO "VenueMonetizationSettings" ("venueId", "updatedAt")
SELECT "id", CURRENT_TIMESTAMP FROM "Venue";

-- VenuePaymentMethod: moneda de liquidación
ALTER TABLE "VenuePaymentMethod" ADD COLUMN "settlementCurrency" "CurrencyCode";

UPDATE "VenuePaymentMethod" vpm
SET "settlementCurrency" = v."pricingCurrency"
FROM "Venue" v
WHERE v.id = vpm."venueId";

ALTER TABLE "VenuePaymentMethod" ALTER COLUMN "settlementCurrency" SET NOT NULL;

-- ExchangeRate: histórico por fecha
ALTER TABLE "ExchangeRate" ADD COLUMN "effectiveDate" DATE;

UPDATE "ExchangeRate"
SET "effectiveDate" = (NOW() AT TIME ZONE 'America/Caracas')::date
WHERE "effectiveDate" IS NULL;

DROP INDEX "ExchangeRate_countryCode_currency_key";

ALTER TABLE "ExchangeRate" ALTER COLUMN "effectiveDate" SET NOT NULL;

CREATE UNIQUE INDEX "ExchangeRate_countryCode_currency_effectiveDate_key"
ON "ExchangeRate"("countryCode", "currency", "effectiveDate");

-- Reservation: montos en unidades menores + moneda
ALTER TABLE "Reservation" ADD COLUMN "pricingCurrency" "CurrencyCode";
ALTER TABLE "Reservation" ADD COLUMN "totalAmountMinor" BIGINT;
ALTER TABLE "Reservation" ADD COLUMN "paidAmountMinor" BIGINT NOT NULL DEFAULT 0;

UPDATE "Reservation" r
SET
  "pricingCurrency" = v."pricingCurrency",
  "totalAmountMinor" = r."totalAmountCents",
  "paidAmountMinor" = r."paidAmountCents"
FROM "Venue" v
WHERE r."venueId" = v.id;

ALTER TABLE "Reservation" ALTER COLUMN "pricingCurrency" SET NOT NULL;

-- Transaction: capas comercial / liquidación / reporting (nullable; backfill M2)
ALTER TABLE "Transaction" ADD COLUMN "obligationCurrency" "CurrencyCode";
ALTER TABLE "Transaction" ADD COLUMN "obligationAmountMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "feeAmountMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "obligationTotalMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "pricingCurrency" "CurrencyCode";
ALTER TABLE "Transaction" ADD COLUMN "settlementCurrency" "CurrencyCode";
ALTER TABLE "Transaction" ADD COLUMN "settlementAmountMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "appliedToObligationMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "amountBsMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- VenueFeeRule
CREATE TABLE "VenueFeeRule" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "scope" "FeeScope" NOT NULL,
    "type" "FeeType" NOT NULL,
    "value" DECIMAL(14,4) NOT NULL,
    "currencyCode" "CurrencyCode" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueFeeRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VenueFeeRule_venueId_scope_isActive_idx"
ON "VenueFeeRule"("venueId", "scope", "isActive");

-- CurrencyConversionRecord
CREATE TABLE "CurrencyConversionRecord" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fromCurrency" "CurrencyCode" NOT NULL,
    "toCurrency" "CurrencyCode" NOT NULL,
    "fromAmountMinor" BIGINT NOT NULL,
    "toAmountMinor" BIGINT NOT NULL,
    "rateToBs" DECIMAL(14,4) NOT NULL,
    "rateDate" DATE NOT NULL,
    "exchangeRateId" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyConversionRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurrencyConversionRecord_transactionId_key"
ON "CurrencyConversionRecord"("transactionId");

-- Foreign keys
ALTER TABLE "VenueMonetizationSettings" ADD CONSTRAINT "VenueMonetizationSettings_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VenueFeeRule" ADD CONSTRAINT "VenueFeeRule_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CurrencyConversionRecord" ADD CONSTRAINT "CurrencyConversionRecord_transactionId_fkey"
FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CurrencyConversionRecord" ADD CONSTRAINT "CurrencyConversionRecord_exchangeRateId_fkey"
FOREIGN KEY ("exchangeRateId") REFERENCES "ExchangeRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
