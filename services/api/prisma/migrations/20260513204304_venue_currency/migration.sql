-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "displayCurrency" TEXT NOT NULL DEFAULT 'BS';

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "rateToBs" DECIMAL(14,4) NOT NULL,
    "source" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_countryCode_currency_key" ON "ExchangeRate"("countryCode", "currency");
