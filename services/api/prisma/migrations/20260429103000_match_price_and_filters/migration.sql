-- Match: precio por jugador (cents) para filtros dinámicos

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "pricePerPlayerCents" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Match_pricePerPlayerCents_idx" ON "Match"("pricePerPlayerCents");

