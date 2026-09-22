CREATE TYPE "QuickMatchSearchStatus" AS ENUM ('SEARCHING', 'PROPOSAL', 'CONFIRMED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "QuickMatchProposalType" AS ENUM ('OPEN_MATCH', 'NEW_GROUP');
CREATE TYPE "QuickMatchProposalStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'DISMISSED');

CREATE TABLE "QuickMatchSearch" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sportId" TEXT NOT NULL,
  "targetDate" DATE NOT NULL,
  "slots" "AvailabilitySlot"[] NOT NULL,
  "widenLevel" BOOLEAN NOT NULL DEFAULT false,
  "zoneKm" INTEGER NOT NULL DEFAULT 10,
  "includeOpenMatches" BOOLEAN NOT NULL DEFAULT true,
  "status" "QuickMatchSearchStatus" NOT NULL DEFAULT 'SEARCHING',
  "noMatchYet" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuickMatchSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuickMatchProposal" (
  "id" TEXT NOT NULL,
  "searchId" TEXT NOT NULL,
  "type" "QuickMatchProposalType" NOT NULL,
  "status" "QuickMatchProposalStatus" NOT NULL DEFAULT 'PENDING',
  "matchId" TEXT,
  "playerIds" TEXT[] NOT NULL,
  "venueOptions" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuickMatchProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuickMatchSearch_userId_key" ON "QuickMatchSearch"("userId");
CREATE INDEX "QuickMatchSearch_sportId_status_targetDate_idx" ON "QuickMatchSearch"("sportId", "status", "targetDate");
CREATE INDEX "QuickMatchSearch_status_updatedAt_idx" ON "QuickMatchSearch"("status", "updatedAt");
CREATE UNIQUE INDEX "QuickMatchProposal_searchId_key" ON "QuickMatchProposal"("searchId");
CREATE INDEX "QuickMatchProposal_status_expiresAt_idx" ON "QuickMatchProposal"("status", "expiresAt");
CREATE INDEX "QuickMatchProposal_matchId_idx" ON "QuickMatchProposal"("matchId");

ALTER TABLE "QuickMatchSearch" ADD CONSTRAINT "QuickMatchSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickMatchSearch" ADD CONSTRAINT "QuickMatchSearch_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickMatchProposal" ADD CONSTRAINT "QuickMatchProposal_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "QuickMatchSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickMatchProposal" ADD CONSTRAINT "QuickMatchProposal_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
