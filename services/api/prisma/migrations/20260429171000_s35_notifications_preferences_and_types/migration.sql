-- Sprint 35: preferencias por tipo + nuevos NotificationEventType (idempotente)

-- 1) Agregar nuevos valores al enum NotificationEventType
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationEventType' AND e.enumlabel = 'CHAT_MESSAGE'
  ) THEN
    ALTER TYPE "NotificationEventType" ADD VALUE 'CHAT_MESSAGE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationEventType' AND e.enumlabel = 'PAYMENT_PENDING'
  ) THEN
    ALTER TYPE "NotificationEventType" ADD VALUE 'PAYMENT_PENDING';
  END IF;
END $$;

-- 2) Preferencias por tipo en NotificationSubscription
ALTER TABLE "NotificationSubscription"
  ADD COLUMN IF NOT EXISTS "enabledTypes" JSONB;

