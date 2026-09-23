ALTER TABLE "QuickMatchProposal" ADD COLUMN "groupKey" TEXT;
CREATE INDEX "QuickMatchProposal_groupKey_idx" ON "QuickMatchProposal"("groupKey");
