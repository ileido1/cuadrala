-- Sprint 33: TournamentSchedule genérico (no destructivo, idempotente)

CREATE TABLE IF NOT EXISTS "TournamentSchedule" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "formatCode" TEXT NOT NULL,
  "scheduleKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TournamentSchedule_pkey" PRIMARY KEY ("id")
);

-- Unique tournamentId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TournamentSchedule_tournamentId_key'
  ) THEN
    ALTER TABLE "TournamentSchedule"
      ADD CONSTRAINT "TournamentSchedule_tournamentId_key" UNIQUE ("tournamentId");
  END IF;
END $$;

-- FK to Tournament
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TournamentSchedule_tournamentId_fkey'
  ) THEN
    ALTER TABLE "TournamentSchedule"
      ADD CONSTRAINT "TournamentSchedule_tournamentId_fkey"
      FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TournamentSchedule_formatCode_idx" ON "TournamentSchedule"("formatCode");

