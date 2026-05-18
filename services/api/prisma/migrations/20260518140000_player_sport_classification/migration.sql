-- Clasificación por deporte: Category.sportId + UserSportCategory

CREATE TYPE "CategoryScheme" AS ENUM ('RACKET_ORDINAL', 'TEAM_SKILL');
CREATE TYPE "SkillBand" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');

ALTER TABLE "Category" ADD COLUMN "sportId" TEXT;
ALTER TABLE "Category" ADD COLUMN "scheme" "CategoryScheme";
ALTER TABLE "Category" ADD COLUMN "skillBand" "SkillBand";
ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Category" c
SET
  "sportId" = (SELECT s.id FROM "Sport" s WHERE s.code = 'PADEL' LIMIT 1),
  "scheme" = 'RACKET_ORDINAL',
  "skillBand" = 'INTERMEDIATE',
  "sortOrder" = 4
WHERE c."sportId" IS NULL;

ALTER TABLE "Category" ALTER COLUMN "sportId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "scheme" SET NOT NULL;

DROP INDEX IF EXISTS "Category_slug_key";

CREATE TABLE "UserSportCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSportCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSportCategory_userId_sportId_key" ON "UserSportCategory"("userId", "sportId");
CREATE INDEX "UserSportCategory_categoryId_idx" ON "UserSportCategory"("categoryId");

ALTER TABLE "Category" ADD CONSTRAINT "Category_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Category_sportId_slug_key" ON "Category"("sportId", "slug");
CREATE INDEX "Category_sportId_scheme_idx" ON "Category"("sportId", "scheme");

ALTER TABLE "UserSportCategory" ADD CONSTRAINT "UserSportCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSportCategory" ADD CONSTRAINT "UserSportCategory_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSportCategory" ADD CONSTRAINT "UserSportCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserSportCategory" ("id", "userId", "sportId", "categoryId", "createdAt")
SELECT
  gen_random_uuid()::text,
  uc."userId",
  c."sportId",
  uc."categoryId",
  uc."createdAt"
FROM "UserCategory" uc
INNER JOIN "Category" c ON c.id = uc."categoryId"
ON CONFLICT ("userId", "sportId") DO NOTHING;
