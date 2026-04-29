-- Add latitude/longitude to Venue
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "Venue_latitude_longitude_idx" ON "Venue"("latitude", "longitude");
