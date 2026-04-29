-- Add worker fields to NotificationDelivery for retries/backoff.
ALTER TABLE "NotificationDelivery"
ADD COLUMN     "lastErrorCode" TEXT,
ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN     "lastAttemptAt" TIMESTAMP(3);

-- Indexes to fetch due deliveries efficiently.
CREATE INDEX "NotificationDelivery_nextAttemptAt_idx" ON "NotificationDelivery"("nextAttemptAt");
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON "NotificationDelivery"("status", "nextAttemptAt");

