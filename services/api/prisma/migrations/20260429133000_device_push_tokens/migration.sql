-- Device push tokens for real delivery (FCM-ready)

DO $$
BEGIN
  CREATE TYPE "DevicePushTokenProvider" AS ENUM ('FCM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DevicePushToken" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "provider" "DevicePushTokenProvider" NOT NULL DEFAULT 'FCM',
  "token" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevicePushToken_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "DevicePushToken"
    ADD CONSTRAINT "DevicePushToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "DevicePushToken_provider_token_key"
  ON "DevicePushToken"("provider", "token");

CREATE INDEX IF NOT EXISTS "DevicePushToken_user_enabled_idx"
  ON "DevicePushToken"("userId", "enabled");

CREATE INDEX IF NOT EXISTS "DevicePushToken_provider_enabled_idx"
  ON "DevicePushToken"("provider", "enabled");

