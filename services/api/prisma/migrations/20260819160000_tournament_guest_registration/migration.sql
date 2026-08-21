-- Slice 1 (tournament-guest-registration): guest identity local to a tournament.
-- Additive/nullable migration: TournamentRegistration.userId and
-- MatchParticipant.userId become nullable; new guest fields + participant ref.
-- Existing rows default registrationType='AUTHENTICATED' (no backfill needed).
-- Existing unique indexes on (tournamentId, userId) / (matchId, userId) stay valid:
-- Postgres allows multiple NULLs in a unique index, so GUEST rows never collide.

CREATE TYPE "RegistrationType" AS ENUM ('AUTHENTICATED', 'GUEST');

-- Tournament: competitiveness flags (Elo eligibility gate).
ALTER TABLE "Tournament"
  ADD COLUMN "isCompetitive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "inscriptionPrice" DECIMAL(10, 2);

-- TournamentRegistration: userId becomes optional; guest identity fields.
ALTER TABLE "TournamentRegistration" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "TournamentRegistration"
  ADD COLUMN "registrationType" "RegistrationType" NOT NULL DEFAULT 'AUTHENTICATED',
  ADD COLUMN "guestName" TEXT,
  ADD COLUMN "guestPhone" TEXT,
  ADD COLUMN "guestEmail" TEXT,
  ADD COLUMN "registeredByUserId" TEXT;

ALTER TABLE "TournamentRegistration"
  ADD CONSTRAINT "TournamentRegistration_registeredByUserId_fkey"
  FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TournamentRegistration_tournamentId_registrationType_idx"
  ON "TournamentRegistration"("tournamentId", "registrationType");

-- MatchParticipant: userId becomes optional; new participant ref to the
-- originating TournamentRegistration (resolves guest vs authenticated identity).
ALTER TABLE "MatchParticipant" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "MatchParticipant"
  ADD COLUMN "tournamentRegistrationId" TEXT;

ALTER TABLE "MatchParticipant"
  ADD CONSTRAINT "MatchParticipant_tournamentRegistrationId_fkey"
  FOREIGN KEY ("tournamentRegistrationId") REFERENCES "TournamentRegistration"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "MatchParticipant_matchId_tournamentRegistrationId_key"
  ON "MatchParticipant"("matchId", "tournamentRegistrationId");
