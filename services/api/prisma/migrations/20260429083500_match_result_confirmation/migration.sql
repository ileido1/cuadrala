-- MatchResultDraft + confirmations (4/4) para finalizar MatchResult

DO $$ BEGIN
  CREATE TYPE "MatchResultDraftStatus" AS ENUM ('DRAFT', 'FINALIZED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MatchResultConfirmationStatus" AS ENUM ('CONFIRMED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MatchResultDraft" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "status" "MatchResultDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "payload" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatchResultDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MatchResultDraft_matchId_key" ON "MatchResultDraft"("matchId");
CREATE INDEX IF NOT EXISTS "MatchResultDraft_matchId_idx" ON "MatchResultDraft"("matchId");

ALTER TABLE "MatchResultDraft" DROP CONSTRAINT IF EXISTS "MatchResultDraft_matchId_fkey";
ALTER TABLE "MatchResultDraft" ADD CONSTRAINT "MatchResultDraft_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchResultDraft" DROP CONSTRAINT IF EXISTS "MatchResultDraft_createdByUserId_fkey";
ALTER TABLE "MatchResultDraft" ADD CONSTRAINT "MatchResultDraft_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "MatchResultConfirmation" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "MatchResultConfirmationStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchResultConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MatchResultConfirmation_draftId_userId_key"
ON "MatchResultConfirmation"("draftId", "userId");

CREATE INDEX IF NOT EXISTS "MatchResultConfirmation_userId_idx" ON "MatchResultConfirmation"("userId");
CREATE INDEX IF NOT EXISTS "MatchResultConfirmation_draftId_idx" ON "MatchResultConfirmation"("draftId");

ALTER TABLE "MatchResultConfirmation" DROP CONSTRAINT IF EXISTS "MatchResultConfirmation_draftId_fkey";
ALTER TABLE "MatchResultConfirmation" ADD CONSTRAINT "MatchResultConfirmation_draftId_fkey"
FOREIGN KEY ("draftId") REFERENCES "MatchResultDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchResultConfirmation" DROP CONSTRAINT IF EXISTS "MatchResultConfirmation_userId_fkey";
ALTER TABLE "MatchResultConfirmation" ADD CONSTRAINT "MatchResultConfirmation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

