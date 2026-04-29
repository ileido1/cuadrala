-- Extender Venue con datos de geocoding (placeId, dirección normalizada)
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "placeId" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "formattedAddress" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "addressCountry" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "addressState" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "addressCity" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "addressLine1" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "addressPostalCode" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "geocodedAt" TIMESTAMP(3);

-- placeId único (Postgres permite múltiples NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "Venue_placeId_key" ON "Venue"("placeId");

