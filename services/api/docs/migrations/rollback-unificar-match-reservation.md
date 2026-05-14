# Rollback Procedure: unificar-match-reservation

## Cuando hacer rollback

Si la migración causa problemas en producción y se necesita revertir:

1. **Problema crítico обнаружен después de aplicar la migración**
2. **Datos corruptos o pérdida de datos**
3. **Error en la aplicación que no puede esperar fix**

## Pasos de rollback

### 1. Detener tráfico

```bash
# Detener el servicio API
pm2 stop cuadrala-api
# o
kubectl scale deployment cuadrala-api --replicas=0
```

### 2. Backup de datos actuales (CRÍTICO)

```sql
-- Backup de las tablas afectadas
CREATE TABLE "Reservation_backup_before_rollback" AS
SELECT * FROM "Reservation";

CREATE TABLE "MatchReservationLink_backup_before_rollback" AS
SELECT * FROM "MatchReservationLink";

-- Backup de Match y VacantHour originales
CREATE TABLE "Match_backup_before_rollback" AS SELECT * FROM "Match";
CREATE TABLE "VacantHour_backup_before_rollback" AS SELECT * FROM "VacantHour";
```

### 3. Ejecutar SQL de rollback

```sql
-- ============================================================
-- ROLLBACK: unificar-match-reservation
-- ============================================================

-- Paso 1: Eliminar MatchReservationLink (nueva tabla)
DROP TABLE IF EXISTS "MatchReservationLink";

-- Paso 2: Eliminar Reservation rows que fueron creadas desde Match
-- Solo las que tienen type=MATCH y cuyo id original era un Match
DELETE FROM "Reservation"
WHERE type = 'MATCH'
  AND id IN (SELECT id FROM "Match_backup_before_rollback" WHERE "scheduledAt" IS NOT NULL);

-- Paso 3: Eliminar Reservation rows que fueron creadas desde VacantHour
-- (las que tienen visibility=PUBLISHED y no tienen organizerUserId)
DELETE FROM "Reservation"
WHERE type = 'MATCH'
  AND visibility = 'PUBLISHED'
  AND organizerUserId IS NULL
  AND id IN (SELECT id FROM "VacantHour_backup_before_rollback" WHERE "matchId" IS NULL);

-- Paso 4: Restaurar columnas de Reservation (mantener la estructura, solo limpiar datos)
UPDATE "Reservation" SET
  "matchId" = NULL,
  "organizerUserId" = NULL,
  "formatPresetId" = NULL,
  "formatParameters" = NULL,
  "maxParticipants" = 4,
  "pricePerPlayerCents" = 0,
  "visibility" = NULL,
  "matchStatus" = NULL
WHERE type = 'MATCH';

-- Paso 5: Eliminar columna matchId de Match (forward reference)
ALTER TABLE "Match" DROP COLUMN IF EXISTS "reservationId";

-- Paso 6: Restaurar enum Visibility (opcional - si no hay otras columnas usandolo)
-- Solo si no hay otras tablas usando el enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Reservation' AND column_name = 'visibility'
    AND column_default IS NULL
  ) THEN
    DROP TYPE IF EXISTS "Visibility";
  END IF;
END $$;
```

### 4. Verificar integridad

```sql
-- Verificar counts originales
SELECT COUNT(*) as match_count FROM "Match";
SELECT COUNT(*) as vacant_count FROM "VacantHour";
SELECT COUNT(*) as reservation_count FROM "Reservation" WHERE type = 'DIRECT' OR type = 'BLOCKED';

-- Verificar que no haya Reservation con type=MATCH
SELECT COUNT(*) as match_type_reservations FROM "Reservation" WHERE type = 'MATCH';
-- Debe ser 0

-- Verificar que MatchReservationLink no existe
SELECT COUNT(*) as link_count FROM "MatchReservationLink";
-- Debe fallar o ser 0
```

### 5. Recrear aplicación

```bash
# Regenerar Prisma client
npm run prisma:generate

# Reiniciar API
pm2 restart cuadrala-api
# o
kubectl scale deployment cuadrala-api --replicas=1
```

## Qué se mantiene después del rollback

- **Match table**: Sin cambios, intacta
- **VacantHour table**: Sin cambios, intacta
- **Reservation table**: Tiene las nuevas columnas pero vacías (nullable)
- **Match.reservationId**: Columna dropeada

## Qué se pierde con el rollback

- Cualquier Reservation creada/modificada después de la migración
- Nuevas features basadas en `type=MATCH` y `visibility`

## Verificación post-rollback

```bash
# Tests de API
npm run typecheck && npm run lint && npm test

# Verificar que calendar no tiene duplicados (old behavior)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/venues/{venueId}/matches?from=2026-05-01&to=2026-05-31"
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/venues/{venueId}/reservations?from=2026-05-01&to=2026-05-31"
```

Los calendars deberían mostrar slots separados (comportamiento pre-migración).

## Notas importantes

1. **El rollback es destructivo para datos**: Cualquier Reservation creada con `type=MATCH` después de la migración se perderá
2. **Los backups son esenciales**: Crear los backups ANTES de ejecutar cualquier SQL de rollback
3. **Testing en staging primero**: Siempre probar el rollback en staging antes de producción
4. **Downtime esperado**: El proceso completo puede tomar 5-15 minutos dependiendo del volumen de datos