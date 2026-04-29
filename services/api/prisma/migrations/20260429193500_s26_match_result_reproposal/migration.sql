-- Sprint 26: Resultados 4/4 con REJECTED + re-propuesta (versionado)
-- Migración idempotente para DBs ya inicializadas.

-- 1) Extender enum de estado del draft: agrega REJECTED
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'MatchResultDraftStatus'
      AND e.enumlabel = 'REJECTED'
  ) THEN
    ALTER TYPE "MatchResultDraftStatus" ADD VALUE 'REJECTED';
  END IF;
END $$;

-- 2) Versionado por match: (matchId, version) único; matchId deja de ser único
ALTER TABLE IF EXISTS "MatchResultDraft"
  ADD COLUMN IF NOT EXISTS "version" INTEGER;

UPDATE "MatchResultDraft"
SET "version" = 1
WHERE "version" IS NULL;

ALTER TABLE "MatchResultDraft"
  ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "MatchResultDraft"
  ALTER COLUMN "version" SET NOT NULL;

DROP INDEX IF EXISTS "MatchResultDraft_matchId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "MatchResultDraft_matchId_version_key"
  ON "MatchResultDraft"("matchId", "version");

CREATE INDEX IF NOT EXISTS "MatchResultDraft_matchId_version_idx"
  ON "MatchResultDraft"("matchId", "version");

-- 3) Auditoría mínima: proposedByUserId (renombre desde createdByUserId)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'MatchResultDraft'
      AND column_name = 'createdByUserId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'MatchResultDraft'
      AND column_name = 'proposedByUserId'
  ) THEN
    ALTER TABLE "MatchResultDraft" RENAME COLUMN "createdByUserId" TO "proposedByUserId";
  END IF;
END $$;

-- FK a User (proposedByUserId)
ALTER TABLE "MatchResultDraft" DROP CONSTRAINT IF EXISTS "MatchResultDraft_createdByUserId_fkey";
ALTER TABLE "MatchResultDraft" DROP CONSTRAINT IF EXISTS "MatchResultDraft_proposedByUserId_fkey";
ALTER TABLE "MatchResultDraft" ADD CONSTRAINT "MatchResultDraft_proposedByUserId_fkey"
FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

