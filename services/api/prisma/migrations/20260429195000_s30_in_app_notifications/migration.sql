-- Sprint 30 — In-app notifications inbox (read/unread) + expand event types
-- 1) Expand NotificationEventType enum
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'MATCH_CANCELLED';

-- 2) Add readAt to NotificationDelivery (acts as in-app inbox state)
ALTER TABLE "NotificationDelivery" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- 3) Indexes for listing inbox by user + status/createdAt
CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_createdAt_idx"
ON "NotificationDelivery"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_readAt_createdAt_idx"
ON "NotificationDelivery"("userId", "readAt", "createdAt");

