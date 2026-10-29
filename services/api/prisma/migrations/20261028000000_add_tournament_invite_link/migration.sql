-- AlterTable
ALTER TABLE "TournamentRegistration" ADD COLUMN     "inviteLinkId" TEXT;

-- CreateTable
CREATE TABLE "TournamentInviteLink" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentInviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentInviteLink_tokenHash_key" ON "TournamentInviteLink"("tokenHash");

-- CreateIndex
CREATE INDEX "TournamentInviteLink_tournamentId_idx" ON "TournamentInviteLink"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentInviteLink_expiresAt_idx" ON "TournamentInviteLink"("expiresAt");

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_inviteLinkId_fkey" FOREIGN KEY ("inviteLinkId") REFERENCES "TournamentInviteLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInviteLink" ADD CONSTRAINT "TournamentInviteLink_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInviteLink" ADD CONSTRAINT "TournamentInviteLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
