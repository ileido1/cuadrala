-- Paso 1 de 2. Los valores nuevos del enum se agregan en su propia migracion:
-- Postgres no permite usar un valor recien creado dentro de la misma
-- transaccion, y el indice parcial del paso 2 los referencia.
ALTER TYPE "ReservationStatus" ADD VALUE 'HELD';
ALTER TYPE "ReservationStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "holdExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Reservation_status_holdExpiresAt_idx" ON "Reservation"("status", "holdExpiresAt");
