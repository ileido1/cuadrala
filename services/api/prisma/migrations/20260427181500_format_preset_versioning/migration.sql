-- US-E0-03: presets de formato versionados
-- Permite múltiples versiones por (sportId, code) y define elegibilidad por effectiveFrom + isActive.

-- Drop old uniqueness constraint (sportId, code)
DROP INDEX IF EXISTS "TournamentFormatPreset_sportId_code_key";

-- Drop old index (sportId, isActive) (reemplazado por índice más específico)
DROP INDEX IF EXISTS "TournamentFormatPreset_sportId_isActive_idx";

-- Add versioning columns
ALTER TABLE "TournamentFormatPreset"
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "supersedesId" TEXT;

-- New indexes/constraints
CREATE UNIQUE INDEX IF NOT EXISTS "TournamentFormatPreset_sportId_code_version_key"
ON "TournamentFormatPreset"("sportId", "code", "version");

CREATE INDEX IF NOT EXISTS "TournamentFormatPreset_sportId_code_isActive_effectiveFrom_version_idx"
ON "TournamentFormatPreset"("sportId", "code", "isActive", "effectiveFrom", "version");

-- Self-relation for supersedes
ALTER TABLE "TournamentFormatPreset"
ADD CONSTRAINT "TournamentFormatPreset_supersedesId_fkey"
FOREIGN KEY ("supersedesId") REFERENCES "TournamentFormatPreset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

