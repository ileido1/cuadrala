-- MVP Push Notifications (backend-first)

-- Enums
DO $$
BEGIN
  CREATE TYPE "NotificationEventType" AS ENUM ('MATCH_SLOT_OPENED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "NotificationSubscription" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NULL,
  "nearLat" DOUBLE PRECISION NULL,
  "nearLng" DOUBLE PRECISION NULL,
  "radiusKm" DOUBLE PRECISION NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "type" "NotificationEventType" NOT NULL,
  "matchId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3) NULL,
  CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "error" TEXT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3) NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- FKs
DO $$
BEGIN
  ALTER TABLE "NotificationSubscription"
    ADD CONSTRAINT "NotificationSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NotificationSubscription"
    ADD CONSTRAINT "NotificationSubscription_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NotificationEvent"
    ADD CONSTRAINT "NotificationEvent_matchId_fkey"
    FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NotificationEvent"
    ADD CONSTRAINT "NotificationEvent_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "NotificationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes / constraints
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationDelivery_eventId_userId_key"
  ON "NotificationDelivery"("eventId", "userId");

CREATE INDEX IF NOT EXISTS "NotificationSubscription_userId_idx" ON "NotificationSubscription"("userId");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_enabled_idx" ON "NotificationSubscription"("enabled");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_categoryId_idx" ON "NotificationSubscription"("categoryId");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_near_idx" ON "NotificationSubscription"("nearLat", "nearLng");

CREATE INDEX IF NOT EXISTS "NotificationEvent_matchId_idx" ON "NotificationEvent"("matchId");
CREATE INDEX IF NOT EXISTS "NotificationEvent_categoryId_idx" ON "NotificationEvent"("categoryId");
CREATE INDEX IF NOT EXISTS "NotificationEvent_processedAt_createdAt_idx" ON "NotificationEvent"("processedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "NotificationDelivery_eventId_idx" ON "NotificationDelivery"("eventId");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_idx" ON "NotificationDelivery"("userId");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");

