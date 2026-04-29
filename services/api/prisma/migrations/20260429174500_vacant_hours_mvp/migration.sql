-- Vacant hours (publicación rápida): slots publicados que generan Match visible

DO $$
BEGIN
  CREATE TYPE "VacantHourStatus" AS ENUM ('PUBLISHED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "VacantHour" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "courtId" TEXT NOT NULL,
  "sportId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER,
  "pricePerPlayerCents" INTEGER NOT NULL DEFAULT 0,
  "maxParticipants" INTEGER NOT NULL DEFAULT 4,
  "status" "VacantHourStatus" NOT NULL DEFAULT 'PUBLISHED',
  "matchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VacantHour_pkey" PRIMARY KEY ("id")
);

-- Un vacante por cancha y horario
CREATE UNIQUE INDEX IF NOT EXISTS "VacantHour_courtId_scheduledAt_key"
  ON "VacantHour"("courtId", "scheduledAt");

-- matchId único cuando exista (Postgres permite múltiples NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "VacantHour_matchId_key"
  ON "VacantHour"("matchId");

CREATE INDEX IF NOT EXISTS "VacantHour_courtId_scheduledAt_idx"
  ON "VacantHour"("courtId", "scheduledAt");

CREATE INDEX IF NOT EXISTS "VacantHour_venueId_idx"
  ON "VacantHour"("venueId");

CREATE INDEX IF NOT EXISTS "VacantHour_status_idx"
  ON "VacantHour"("status");

ALTER TABLE "VacantHour" DROP CONSTRAINT IF EXISTS "VacantHour_venueId_fkey";
ALTER TABLE "VacantHour"
  ADD CONSTRAINT "VacantHour_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VacantHour" DROP CONSTRAINT IF EXISTS "VacantHour_courtId_fkey";
ALTER TABLE "VacantHour"
  ADD CONSTRAINT "VacantHour_courtId_fkey"
  FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VacantHour" DROP CONSTRAINT IF EXISTS "VacantHour_sportId_fkey";
ALTER TABLE "VacantHour"
  ADD CONSTRAINT "VacantHour_sportId_fkey"
  FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VacantHour" DROP CONSTRAINT IF EXISTS "VacantHour_categoryId_fkey";
ALTER TABLE "VacantHour"
  ADD CONSTRAINT "VacantHour_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VacantHour" DROP CONSTRAINT IF EXISTS "VacantHour_matchId_fkey";
ALTER TABLE "VacantHour"
  ADD CONSTRAINT "VacantHour_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

