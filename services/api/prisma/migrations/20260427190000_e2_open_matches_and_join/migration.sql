-- Add maxParticipants to Match and UserCategory relation for join validation (E2 MVP)

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "maxParticipants" INTEGER NOT NULL DEFAULT 4;

CREATE TABLE IF NOT EXISTS "UserCategory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserCategory_userId_categoryId_key" ON "UserCategory"("userId", "categoryId");
CREATE INDEX IF NOT EXISTS "UserCategory_categoryId_idx" ON "UserCategory"("categoryId");

ALTER TABLE "UserCategory"
  ADD CONSTRAINT "UserCategory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCategory"
  ADD CONSTRAINT "UserCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Match_scheduledAt_idx" ON "Match"("scheduledAt");

