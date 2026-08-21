-- Slice A (tournament-player-management-scheduling): add organizerUserId + venueId to Tournament.
-- Both columns are nullable FKs (additive, forward-only migration; no backfill required).
ALTER TABLE "Tournament" ADD COLUMN "organizerUserId" TEXT;
ALTER TABLE "Tournament" ADD COLUMN "venueId" TEXT;

ALTER TABLE "Tournament"
ADD CONSTRAINT "Tournament_organizerUserId_fkey"
FOREIGN KEY ("organizerUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Tournament"
ADD CONSTRAINT "Tournament_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Tournament_organizerUserId_idx" ON "Tournament"("organizerUserId");
CREATE INDEX "Tournament_venueId_idx" ON "Tournament"("venueId");
