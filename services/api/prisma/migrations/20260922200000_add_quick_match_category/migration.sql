-- Las búsquedas creadas antes de la categoría no son matchables de forma segura.
-- Se eliminan en vez de inventar una categoría para el jugador.
ALTER TABLE "QuickMatchSearch" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "QuickMatchSearch" ADD COLUMN "dismissedMatchIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "QuickMatchSearch" AS search
SET "categoryId" = sport_category."categoryId"
FROM "UserSportCategory" AS sport_category
WHERE sport_category."userId" = search."userId"
  AND sport_category."sportId" = search."sportId";

DELETE FROM "QuickMatchSearch" WHERE "categoryId" IS NULL;
ALTER TABLE "QuickMatchSearch" ALTER COLUMN "categoryId" SET NOT NULL;
CREATE INDEX "QuickMatchSearch_sportId_categoryId_status_targetDate_idx" ON "QuickMatchSearch"("sportId", "categoryId", "status", "targetDate");
