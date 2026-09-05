-- CreateEnum
CREATE TYPE "TournamentSlotResponseValue" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "TournamentSlotResponse" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "response" "TournamentSlotResponseValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentSlotResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentSlotResponse_tournamentId_roundNumber_matchNumber_idx" ON "TournamentSlotResponse"("tournamentId", "roundNumber", "matchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentSlotResponse_tournamentId_roundNumber_matchNumber_key" ON "TournamentSlotResponse"("tournamentId", "roundNumber", "matchNumber", "userId");

-- AddForeignKey
ALTER TABLE "TournamentSlotResponse" ADD CONSTRAINT "TournamentSlotResponse_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSlotResponse" ADD CONSTRAINT "TournamentSlotResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
