-- Recordatorio para cargar el resultado cuando la partida termina por el bloque de cancha.
-- Aditivo: Postgres agrega el valor al final del enum.
ALTER TYPE "NotificationEventType" ADD VALUE 'MATCH_RESULT_REMINDER';
