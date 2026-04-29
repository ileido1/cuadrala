-- PlayerProfile (E1): metadata técnica del jugador

DO $$ BEGIN
  CREATE TYPE "DominantHand" AS ENUM ('RIGHT','LEFT','AMBIDEXTROUS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SidePreference" AS ENUM ('RIGHT','LEFT','ANY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PlayerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dominantHand" "DominantHand" NOT NULL DEFAULT 'RIGHT',
  "sidePreference" "SidePreference" NOT NULL DEFAULT 'ANY',
  "birthYear" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlayerProfile_userId_key" ON "PlayerProfile"("userId");
CREATE INDEX IF NOT EXISTS "PlayerProfile_userId_idx" ON "PlayerProfile"("userId");

ALTER TABLE "PlayerProfile"
  DROP CONSTRAINT IF EXISTS "PlayerProfile_userId_fkey";

ALTER TABLE "PlayerProfile"
  ADD CONSTRAINT "PlayerProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
