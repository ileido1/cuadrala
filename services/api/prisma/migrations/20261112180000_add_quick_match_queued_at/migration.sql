-- Posición en la cola de Quick Match: se fija al entrar a la cola y se conserva al re-encolar.
ALTER TABLE "QuickMatchSearch" ADD COLUMN "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Las búsquedas existentes conservan su orden de llegada.
UPDATE "QuickMatchSearch" SET "queuedAt" = "createdAt";

CREATE INDEX "QuickMatchSearch_status_queuedAt_idx" ON "QuickMatchSearch"("status", "queuedAt");

-- Invitados por disponibilidad que todavía no aceptaron: al disolverse el ready check salen de la cola.
ALTER TABLE "QuickMatchSearch" ADD COLUMN "invitedByAvailability" BOOLEAN NOT NULL DEFAULT false;
