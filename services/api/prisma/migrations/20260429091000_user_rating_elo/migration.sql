-- Elo rating (UserRating) + historial (UserRatingHistory)

CREATE TABLE IF NOT EXISTS "UserRating" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 1500,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRating_categoryId_userId_key" ON "UserRating"("categoryId", "userId");
CREATE INDEX IF NOT EXISTS "UserRating_categoryId_rating_idx" ON "UserRating"("categoryId", "rating");
CREATE INDEX IF NOT EXISTS "UserRating_userId_idx" ON "UserRating"("userId");

ALTER TABLE "UserRating" DROP CONSTRAINT IF EXISTS "UserRating_userId_fkey";
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRating" DROP CONSTRAINT IF EXISTS "UserRating_categoryId_fkey";
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "UserRatingHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "resultId" TEXT NOT NULL,
  "previousRating" DOUBLE PRECISION NOT NULL,
  "newRating" DOUBLE PRECISION NOT NULL,
  "kFactor" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRatingHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRatingHistory_resultId_userId_key"
ON "UserRatingHistory"("resultId", "userId");

CREATE INDEX IF NOT EXISTS "UserRatingHistory_categoryId_createdAt_idx"
ON "UserRatingHistory"("categoryId", "createdAt");

CREATE INDEX IF NOT EXISTS "UserRatingHistory_userId_createdAt_idx"
ON "UserRatingHistory"("userId", "createdAt");

ALTER TABLE "UserRatingHistory" DROP CONSTRAINT IF EXISTS "UserRatingHistory_userId_fkey";
ALTER TABLE "UserRatingHistory" ADD CONSTRAINT "UserRatingHistory_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRatingHistory" DROP CONSTRAINT IF EXISTS "UserRatingHistory_categoryId_fkey";
ALTER TABLE "UserRatingHistory" ADD CONSTRAINT "UserRatingHistory_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

