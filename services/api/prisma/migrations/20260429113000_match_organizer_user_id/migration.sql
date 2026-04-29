-- Match.organizerUserId (owner) para permisos MVP

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "organizerUserId" TEXT;

-- Backfill: si existe, tomar el primer participante (más antiguo) como organizer.
-- Nota: esto es best-effort para data legacy.
UPDATE "Match" m
SET "organizerUserId" = sub."userId"
FROM (
  SELECT DISTINCT ON (mp."matchId") mp."matchId", mp."userId"
  FROM "MatchParticipant" mp
  ORDER BY mp."matchId", mp."createdAt" ASC
) sub
WHERE m."id" = sub."matchId"
  AND m."organizerUserId" IS NULL;

-- Para matches sin participantes por data corrupta, dejamos null y bloqueamos NOT NULL.
-- En producción, lo correcto es arreglar data antes de aplicar la constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Match" WHERE "organizerUserId" IS NULL) THEN
    RAISE NOTICE 'Hay matches sin organizerUserId; no se aplicará NOT NULL automáticamente.';
  ELSE
    ALTER TABLE "Match" ALTER COLUMN "organizerUserId" SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Match_organizerUserId_idx" ON "Match"("organizerUserId");

ALTER TABLE "Match" DROP CONSTRAINT IF EXISTS "Match_organizerUserId_fkey";
ALTER TABLE "Match" ADD CONSTRAINT "Match_organizerUserId_fkey"
FOREIGN KEY ("organizerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

