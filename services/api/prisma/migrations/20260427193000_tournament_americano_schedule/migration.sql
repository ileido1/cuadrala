-- Tournament Americano schedule persistence (E3)

CREATE TABLE IF NOT EXISTS "TournamentAmericanoSchedule" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "scheduleKey" TEXT NOT NULL,
  "schedule" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TournamentAmericanoSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TournamentAmericanoSchedule_tournamentId_key"
  ON "TournamentAmericanoSchedule"("tournamentId");

ALTER TABLE "TournamentAmericanoSchedule"
  ADD CONSTRAINT "TournamentAmericanoSchedule_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- US-E3-02: Persistencia de schedule Americano por torneo (idempotente)

CREATE TABLE IF NOT EXISTS "TournamentAmericanoSchedule" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "scheduleKey" TEXT NOT NULL,
  "schedule" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TournamentAmericanoSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TournamentAmericanoSchedule_tournamentId_key"
  ON "TournamentAmericanoSchedule"("tournamentId");

CREATE INDEX IF NOT EXISTS "TournamentAmericanoSchedule_tournamentId_idx"
  ON "TournamentAmericanoSchedule"("tournamentId");

ALTER TABLE "TournamentAmericanoSchedule"
  ADD CONSTRAINT "TournamentAmericanoSchedule_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

