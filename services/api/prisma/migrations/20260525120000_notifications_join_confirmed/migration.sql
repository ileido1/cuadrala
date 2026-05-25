-- Notificaciones: unión a partida y pago confirmado
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'MATCH_PLAYER_JOINED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_CONFIRMED';
