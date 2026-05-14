-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "paymentData" JSONB,
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "venuePaymentMethodId" TEXT;

-- CreateTable
CREATE TABLE "VenuePaymentMethod" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VenuePaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenuePaymentMethod_venueId_idx" ON "VenuePaymentMethod"("venueId");

-- CreateIndex
CREATE INDEX "VenuePaymentMethod_venueId_isActive_idx" ON "VenuePaymentMethod"("venueId", "isActive");

-- CreateIndex
CREATE INDEX "Transaction_venuePaymentMethodId_idx" ON "Transaction"("venuePaymentMethodId");

-- AddForeignKey
ALTER TABLE "VenuePaymentMethod" ADD CONSTRAINT "VenuePaymentMethod_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_venuePaymentMethodId_fkey" FOREIGN KEY ("venuePaymentMethodId") REFERENCES "VenuePaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
