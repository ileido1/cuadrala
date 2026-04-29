-- Add organizerUserId to Match
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "organizerUserId" TEXT;

-- Backfill organizerUserId for existing matches:
-- choose earliest participant (creator) as organizer.
UPDATE "Match" m
SET "organizerUserId" = sub."userId"
FROM (
  SELECT DISTINCT ON (mp."matchId") mp."matchId", mp."userId"
  FROM "MatchParticipant" mp
  ORDER BY mp."matchId", mp."createdAt" ASC
) sub
WHERE m."id" = sub."matchId"
  AND m."organizerUserId" IS NULL;

-- If any match had no participants (shouldn't happen), fallback to any existing user to satisfy NOT NULL.
UPDATE "Match"
SET "organizerUserId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "organizerUserId" IS NULL;

ALTER TABLE "Match" ALTER COLUMN "organizerUserId" SET NOT NULL;

-- Add FK + index
ALTER TABLE "Match"
DROP CONSTRAINT IF EXISTS "Match_organizerUserId_fkey";

ALTER TABLE "Match"
ADD CONSTRAINT "Match_organizerUserId_fkey"
FOREIGN KEY ("organizerUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Match_organizerUserId_idx" ON "Match"("organizerUserId");

