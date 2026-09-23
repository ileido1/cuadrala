ALTER TYPE "NotificationEventType" ADD VALUE 'QUICK_MATCH_PROPOSAL';
ALTER TABLE "NotificationEvent" ADD COLUMN "quickMatchSearchId" TEXT;
ALTER TABLE "NotificationEvent" DROP CONSTRAINT "NotificationEvent_subject_exactly_one";
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_subject_exactly_one"
  CHECK (("matchId" IS NOT NULL)::int + ("tournamentId" IS NOT NULL)::int + ("quickMatchSearchId" IS NOT NULL)::int = 1);
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_quickMatchSearchId_fkey"
  FOREIGN KEY ("quickMatchSearchId") REFERENCES "QuickMatchSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "NotificationEvent_quickMatchSearchId_idx" ON "NotificationEvent"("quickMatchSearchId");
