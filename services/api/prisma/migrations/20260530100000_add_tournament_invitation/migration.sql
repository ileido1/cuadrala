-- Slice B (tournament-player-management-scheduling): TournamentInvitation model.
-- Additive migration: new enum, new table, new indexes on the existing TournamentRegistration table.

CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

CREATE TABLE "TournamentInvitation" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentInvitation_tournamentId_invitedUserId_key" ON "TournamentInvitation"("tournamentId", "invitedUserId");

CREATE INDEX "TournamentInvitation_invitedUserId_status_idx" ON "TournamentInvitation"("invitedUserId", "status");

ALTER TABLE "TournamentInvitation"
ADD CONSTRAINT "TournamentInvitation_tournamentId_fkey"
FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentInvitation"
ADD CONSTRAINT "TournamentInvitation_invitedUserId_fkey"
FOREIGN KEY ("invitedUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentInvitation"
ADD CONSTRAINT "TournamentInvitation_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "TournamentRegistration_tournamentId_status_idx" ON "TournamentRegistration"("tournamentId", "status");
