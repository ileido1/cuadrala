-- Debe ir en su propia migración: PostgreSQL no permite usar un valor de enum
-- recién añadido en la misma transacción (shadow DB / migrate dev).
ALTER TYPE "ReservationType" ADD VALUE IF NOT EXISTS 'MATCH';
