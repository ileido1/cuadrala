ALTER TABLE "QuickMatchSearch" ADD COLUMN "categoryId" TEXT NOT NULL;
ALTER TABLE "QuickMatchSearch" ADD COLUMN "dismissedMatchIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "QuickMatchSearch_sportId_categoryId_status_targetDate_idx" ON "QuickMatchSearch"("sportId", "categoryId", "status", "targetDate");
