ALTER TABLE "TournamentSlotResponse" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "TournamentSlotResponse" ADD COLUMN "tournamentRegistrationId" TEXT;
ALTER TABLE "TournamentSlotResponse" ADD CONSTRAINT "TournamentSlotResponse_tournamentRegistrationId_fkey" FOREIGN KEY ("tournamentRegistrationId") REFERENCES "TournamentRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "TournamentSlotResponse_tournamentId_roundNumber_matchNumber_tournamentRegistrationId_key" ON "TournamentSlotResponse"("tournamentId", "roundNumber", "matchNumber", "tournamentRegistrationId");
CREATE INDEX "TournamentSlotResponse_tournamentRegistrationId_idx" ON "TournamentSlotResponse"("tournamentRegistrationId");
CREATE TABLE "TournamentGuestScheduleToken" (
  "id" TEXT NOT NULL,
  "tournamentRegistrationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "TournamentGuestScheduleToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TournamentGuestScheduleToken_tournamentRegistrationId_fkey" FOREIGN KEY ("tournamentRegistrationId") REFERENCES "TournamentRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TournamentGuestScheduleToken_tokenHash_key" ON "TournamentGuestScheduleToken"("tokenHash");
CREATE INDEX "TournamentGuestScheduleToken_tournamentRegistrationId_idx" ON "TournamentGuestScheduleToken"("tournamentRegistrationId");
CREATE INDEX "TournamentGuestScheduleToken_expiresAt_idx" ON "TournamentGuestScheduleToken"("expiresAt");
