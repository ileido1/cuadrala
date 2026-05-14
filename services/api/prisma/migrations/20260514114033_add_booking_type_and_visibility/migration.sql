-- ============================================================
-- Migración: add_booking_type_and_visibility
-- Fecha: 2026-05-14
-- Objetivo: Agregar tipo MATCH a Reservation + columna visibility
--           para unificar Match y VacantHour en Reservation
-- ============================================================

-- Paso 1: Agregar valor MATCH al enum ReservationType
-- PostgreSQL requiere que redefinamos el enum para agregar valores
ALTER TYPE "ReservationType" ADD VALUE IF NOT EXISTS 'MATCH';

-- Paso 2: Crear enum Visibility (no existe previamente)
CREATE TYPE "Visibility" AS ENUM ('PUBLISHED', 'DRAFT', 'PRIVATE');

-- Paso 3: Agregar columnas a Reservation
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "matchId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "organizerUserId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "formatPresetId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "formatParameters" JSONB;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "maxParticipants" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "pricePerPlayerCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "visibility" "Visibility";
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "matchStatus" "MatchStatus";

-- Paso 4: Agregar constraint unique a matchId (1:1 con Match)
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_matchId_unique" UNIQUE ("matchId");

-- Paso 5: AgregarFk a Match (reservationId) — forward reference, nullable
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "reservationId" TEXT;

-- ============================================================
-- Validación: verificar que no haya conflictos de datos
-- antes de copiar Match → Reservation
-- ============================================================
DO $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Buscar matches que tienen scheduledAt pero su courtId+scheduledAt
  -- ya existe en Reservation (violaría el unique constraint)
  SELECT COUNT(*) INTO conflict_count
  FROM "Match" m
  INNER JOIN "Reservation" r
    ON m."courtId" = r."courtId"
    AND m."scheduledAt" = r."scheduledAt"
  WHERE m."scheduledAt" IS NOT NULL
    AND r.status = 'CONFIRMED';

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'CONFLICT: % matches tienen scheduling conflict con reservations existentes. Abortando migracion.', conflict_count;
  END IF;
END $$;

-- ============================================================
-- Copia de datos: Match → Reservation (type=MATCH)
-- Se linkean via matchId = Match.id
-- ============================================================
INSERT INTO "Reservation" (
  "id", "venueId", "courtId", "sportId", "categoryId",
  "type", "organizerUserId", "formatPresetId", "formatParameters",
  "maxParticipants", "pricePerPlayerCents", "visibility", "matchStatus",
  "scheduledAt", "durationMinutes", "status",
  "totalAmountCents", "paidAmountCents", "paymentStatus",
  "createdByUserId", "createdAt", "updatedAt"
)
SELECT
  m.id,
  c."venueId",
  m."courtId",
  m."sportId",
  m."categoryId",
  'MATCH',
  m."organizerUserId",
  m."formatPresetId",
  m."formatParameters",
  m."maxParticipants",
  m."pricePerPlayerCents",
  'DRAFT',  -- visibility por defecto para matches migrados
  m.status, -- matchStatus
  m."scheduledAt",
  COALESCE(
    (SELECT MAX("durationMinutes") FROM "Court" WHERE id = m."courtId"),
    60
  ) AS "durationMinutes",
  'CONFIRMED',
  0, 0, 'UNPAID',
  m."organizerUserId",
  NOW(),
  NOW()
FROM "Match" m
LEFT JOIN "Court" c ON m."courtId" = c.id
WHERE m."scheduledAt" IS NOT NULL
  -- Idempotencia: skip si ya existe
  AND NOT EXISTS (SELECT 1 FROM "Reservation" WHERE id = m.id);

-- ============================================================
-- Copia de datos: VacantHour → Reservation (type=MATCH, visibility=PUBLISHED)
-- Solo VacantHours que NO tienen matchId (los que tienen ya fueron migrados)
-- ============================================================
INSERT INTO "Reservation" (
  "id", "venueId", "courtId", "sportId", "categoryId",
  "type", "organizerUserId", "visibility",
  "scheduledAt", "durationMinutes", "status",
  "createdByUserId", "createdAt", "updatedAt"
)
SELECT
  vh.id,
  vh."venueId",
  vh."courtId",
  vh."sportId",
  vh."categoryId",
  'MATCH',
  NULL,
  'PUBLISHED',
  vh."scheduledAt",
  COALESCE(vh."durationMinutes", 60),
  'CONFIRMED',
  'system@cuadrala.internal',
  NOW(),
  NOW()
FROM "VacantHour" vh
WHERE
  -- Solo los que no tienen matchId asociado (los otros ya se copiaron via Match)
  vh."matchId" IS NULL
  -- Idempotencia: skip si ya existe
  AND NOT EXISTS (SELECT 1 FROM "Reservation" WHERE id = vh.id);

-- ============================================================
-- Crear MatchReservationLink (mapeo 1:1 matchId → reservationId)
-- ============================================================
CREATE TABLE IF NOT EXISTS "MatchReservationLink" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "matchId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "MatchReservationLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MatchReservationLink_matchId_unique" UNIQUE ("matchId"),
  CONSTRAINT "MatchReservationLink_reservationId_unique" UNIQUE ("reservationId"),
  CONSTRAINT "MatchReservationLink_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"(id) ON DELETE CASCADE,
  CONSTRAINT "MatchReservationLink_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "MatchReservationLink_reservationId_idx" ON "MatchReservationLink"("reservationId");

-- Llenar MatchReservationLink para todos los Matches con scheduledAt
INSERT INTO "MatchReservationLink" ("id", "matchId", "reservationId")
SELECT gen_random_uuid(), m.id, m.id
FROM "Match" m
WHERE m."scheduledAt" IS NOT NULL
  -- Idempotencia
  AND NOT EXISTS (SELECT 1 FROM "MatchReservationLink" WHERE "matchId" = m.id);

-- ============================================================
-- Validación final: conteos para verificar integridad
-- ============================================================
DO $$
DECLARE
  match_count INTEGER;
  reservation_match_count INTEGER;
  vacant_hour_count INTEGER;
  vacant_migrated_count INTEGER;
  link_count INTEGER;
BEGIN
  -- Match → Reservation
  SELECT COUNT(*) INTO match_count FROM "Match" WHERE "scheduledAt" IS NOT NULL;
  SELECT COUNT(*) INTO reservation_match_count FROM "Reservation" WHERE type = 'MATCH';
  RAISE NOTICE 'Match → Reservation: % matches scheduled, % reservations type=MATCH', match_count, reservation_match_count;

  IF match_count != reservation_match_count THEN
    RAISE WARNING 'Count mismatch: matches (%) != reservations (%)', match_count, reservation_match_count;
  END IF;

  -- VacantHour → Reservation (PUBLISHED)
  SELECT COUNT(*) INTO vacant_hour_count FROM "VacantHour" WHERE "matchId" IS NULL;
  SELECT COUNT(*) INTO vacant_migrated_count FROM "Reservation" WHERE type = 'MATCH' AND visibility = 'PUBLISHED';
  RAISE NOTICE 'VacantHour → Reservation: % vacant (sin matchId), % migradas como PUBLISHED', vacant_hour_count, vacant_migrated_count;

  -- MatchReservationLink
  SELECT COUNT(*) INTO link_count FROM "MatchReservationLink";
  RAISE NOTICE 'MatchReservationLink: % rows creados', link_count;
END $$;