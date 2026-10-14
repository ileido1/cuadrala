# API Cuadrala (Fase 3)

Servicio HTTP (Express) con Prisma 7, PostgreSQL y arquitectura en capas.

## Requisitos

- Node.js compatible con el `package.json` del paquete
- PostgreSQL y variable `DATABASE_URL` (cadena de conexión válida)

## Configuración

Copia variables de entorno (ejemplo):

```bash
export DATABASE_URL="postgresql://usuario:clave@localhost:5432/cuadrala"
export PORT=4000
# Opcional: tuning del pool (útil en HA / múltiples réplicas)
# export PG_POOL_MAX=10
# export PG_POOL_IDLE_TIMEOUT_MS=30000
# export PG_POOL_CONNECTION_TIMEOUT_MS=10000
# Opcional (E1): en producción define secretos distintos de al menos 32 caracteres.
# export JWT_ACCESS_SECRET="..."
# export JWT_REFRESH_SECRET="..."
```

También puedes usar el archivo de ejemplo:

```bash
cp .env.example .env
```

> Nota: este proyecto requiere **Node 20.19+** (por Prisma/Vitest/ESLint).

## Base de datos

Con la base de datos **disponible**, aplica migraciones cuando corresponda:

```bash
npx prisma migrate dev
```

### Seed opcional (FeeRule por defecto)

Si quieres una **comisión de servicio por defecto** (5% sobre `MATCH`) sin crear reglas a mano:

```bash
export DATABASE_URL="postgresql://usuario:clave@localhost:5432/cuadrala"
npm run seed
```

El seed es **idempotente**: crea los cuatro deportes de raqueta, cuatro presets por deporte, categorías ordinales y `FeeRule` MATCH. Incluye sedes de prueba, cuentas `@test.dev` (contraseña `password123`) y tres partidos con UUID estable: repetirlo no reinicia su progreso. Los métodos de pago se crean solo para sedes seed; no modifica usuarios ajenos a las cuentas de prueba.

#### Escenarios QA de torneos

Usar solo una base de desarrollo/QA autorizada, nunca producción. El seed agrega **7 torneos PUBLIC/OPEN**, separados por una semana, desde 14 días después de la primera corrida. No genera cuadros ni partidos de torneo: el organizador recorre el flujo real.

Todas las cuentas usan `password123`: `organizer@test.dev` organiza los siete torneos; `player1@test.dev` a `player8@test.dev` son jugadores. `owner@test.dev` administra **solo Club Cuádrala** (no Canchas del Sur).

| Formato | Modalidad | Sede | Inscripciones iniciales |
|---|---|---|---|
| Americano | Pádel, parejas rotativas | Club Cuádrala | player1–4 confirmados |
| Todos contra todos | Tenis individual | Canchas del Sur | player1–4 confirmados; player5 pendiente |
| Eliminación simple | Tenis individual | Canchas del Sur | player1–4 confirmados; invitación a player6 |
| Grupos + eliminación | Tenis individual | Canchas del Sur | player1–4 confirmados; invitado QA pendiente |
| Todos contra todos | Pádel, parejas fijas | Club Cuádrala | player1–8, duplas 1/2, 3/4, 5/6, 7/8 |
| Eliminación simple | Pádel, parejas fijas | Club Cuádrala | mismas cuatro duplas |
| Grupos + eliminación | Pádel, parejas fijas | Club Cuádrala | mismas cuatro duplas |

Como jugador: `player7` puede autoinscribirse gratis en tenis; `player5` ve su registro pendiente y `player6` responde la invitación. Como organizador: confirmar pendientes/gestionar invitado, generar cuadro, asignar **Cancha Sur 1** para tenis o canchas de Club Cuádrala para pádel, recibir respuestas de horarios, iniciar y cargar resultados. Generar primero sobre los cuatro competidores confirmados permite probar el cuadro base; agregar jugadores cambia ese cuadro. Americano mantiene cupo de 4; los otros torneos tienen 16 plazas.

Repetir el seed conserva fechas, estados, inscripciones, parejas e invitaciones de torneos existentes; cada escenario nuevo se crea en una transacción. Las tasas reales ya existentes para el día no se reemplazan por valores de ejemplo. No recrea torneos terminados para reiniciar QA. La cobertura de datos y generadores **no demuestra** que todos los pasos de UI hayan sido recorridos.

**Cambio de esquema (E0):** si tu base ya tenía filas en `Match`/`Tournament` antes de añadir `sportId` y torneos parametrizables, `prisma db push` puede pedir reset o migración manual. En **desarrollo**, suele bastar base vacía o `npx prisma db push` sobre una BD nueva; luego `npm run seed`.

Si **no** tienes PostgreSQL en marcha, no ejecutes `migrate dev` aquí; puedes validar el esquema con:

```bash
npm run prisma:validate
```

Tras cambiar `prisma/schema.prisma`, regenera el cliente:

```bash
npx prisma generate
```

### Multi-moneda (Modelo C, Fase 1)

Tras la migración `20260516130000_multi_currency_phase1_add`:

```bash
# Migración Fase 1 + Fase 2
npx prisma migrate deploy

# Backfill transacciones legacy y tasas diarias (90 días)
npm run backfill:multi-currency

# Backfill asientos PAYMENT en ledger (idempotente, forward-only)
npm run backfill:reservation-ledger

# Activar confirmación/agregación por *Minor (staging/prod cuando corresponda)
export MULTI_CURRENCY_PAYMENTS=true
export RESERVATION_PAYMENT_LEDGER=true   # Fase 2: asientos append-only + paidAmountBsMinor
```

Con el flag activo, `PATCH .../transactions/:id/confirm-manual` exige `settlementAmount: { amountMinor, currencyCode }` en reservas y devuelve montos en `pricingCurrency` de la reserva.

Con `RESERVATION_PAYMENT_LEDGER=true` (junto a MCP), cada confirmación de reserva inserta un asiento `PAYMENT` en `ReservationPaymentLedger` y actualiza `paidAmountBsMinor` para reporting.

## Scripts

| Script                    | Descripción              |
| ------------------------- | ------------------------ |
| `npm run dev`             | Servidor en modo watch   |
| `npm run build`           | Compila a `dist/`        |
| `npm run start`           | Ejecuta `dist/main.js`   |
| `npm run typecheck`       | `tsc --noEmit`           |
| `npm run lint`            | ESLint                   |
| `npm run prisma:validate` | Valida el esquema Prisma |
| `npm run seed`            | `prisma db seed` — catálogo de deportes + presets + fixtures QA (requiere `DATABASE_URL`) |
| `npm run backfill:multi-currency` | Backfill MCP Fase 1 (`*Minor`, tasas 90d) |
| `npm run backfill:reservation-ledger` | Backfill asientos PAYMENT Fase 2 (idempotente) |
| `npm run reconcile:reservation-ledger` | Conciliación ledger vs `paidAmountBsMinor` (exit 1 si hay excepciones) |
| `npm test`                 | Vitest (contrato HTTP/Zod + integración opcional) |

## Tests

Por defecto, `npm test` ejecuta pruebas de **contrato** (validación Zod y respuestas HTTP 400 sin depender de datos reales) y **omite** la suite de integración si no defines base de datos de test.

Para **integración HTTP con PostgreSQL** (misma API, DB real):

1. Crea una base dedicada (por ejemplo `cuadrala_test`) y aplica migraciones: `DATABASE_URL=... npx prisma migrate deploy`
2. Exporta la URL solo para tests: `export TEST_DATABASE_URL="postgresql://usuario:clave@localhost:5432/cuadrala_test"`
3. Ejecuta `npm test`

Sin `TEST_DATABASE_URL`, las pruebas de integración se marcan como omitidas (`describe.skipIf`).

## Endpoints (v1)

### Autenticación y perfil (E1)

- `POST /api/v1/auth/register` — cuerpo: `{ email, password (min 8), name }` — crea usuario y devuelve `accessToken`, `refreshToken`, `expiresIn` (segundos)
- `POST /api/v1/auth/login` — cuerpo: `{ email, password }`
- `POST /api/v1/auth/refresh` — cuerpo: `{ refreshToken }`
- `GET /api/v1/users/me` — requiere cabecera `Authorization: Bearer <accessToken>`
- `PATCH /api/v1/users/me` — cuerpo opcional: `{ name }` — requiere Bearer

### Catálogo multi-deporte (E0)

- `GET /api/v1/sports` — lista deportes configurados (MVP: PADEL)
- `GET /api/v1/sports/:sportId/tournament-format-presets` — formatos parametrizables por deporte (ej. AMERICANO, ROUND_ROBIN)
- `POST /api/v1/tournaments` — crea torneo con `sportId` y **preset** por `formatPresetId` (versión específica) o `formatPresetCode` (servidor resuelve versión vigente), además de `formatParameters?`, `startsAt?`

### Torneos: inscripción, invitaciones y resultados

- `GET /api/v1/sports/:sportId/tournament-format-presets` devuelve presets activos; `description` es nullable y solo contiene texto persistido. Para publicar una versión: `POST /api/v1/sports/:sportId/tournament-format-presets/:code/versions`, con `x-admin-secret` y `{ name, description?, schemaVersion, defaultParameters, effectiveFrom? }`.
- `POST /api/v1/tournaments/:tournamentId/registrations` requiere Bearer y objeto JSON vacío. El jugador inscrito es el usuario autenticado; no se acepta `userId` en el body.
- `GET /api/v1/tournaments/:tournamentId/invitations/candidates?q=...` requiere Bearer y acceso de organizador o staff de sede. Busca nombres parciales sin distinguir mayúsculas; `q` debe tener entre 2 y 80 caracteres. Devuelve hasta 20 candidatos con solo `id` y `name`, excluyendo usuarios ya inscritos o invitados.
- `POST /api/v1/tournaments/:tournamentId/invitations/:invitationId/respond` recibe `{ action: "ACCEPT" | "REJECT" }`. Solo responde el usuario invitado. Aceptar deja la inscripción en `PENDING` y la invitación en `ACCEPTED`; el organizador confirma aparte con `PATCH /api/v1/tournaments/:tournamentId/registrations/:registrationId` (`{ status: "CONFIRMED" }`) o confirma pendientes en lote con `POST /api/v1/tournaments/:tournamentId/registrations/confirm-pending`.
- `GET /api/v1/tournaments/:tournamentId/registrations` requiere Bearer. `sportCategoryName` solo se agrega cuando quien consulta tiene acceso de organizador/staff; es informativo y no condiciona la inscripción. Invitados sin cuenta y categorías inexistentes devuelven `null`/sin valor.
- `POST /api/v1/tournaments/:tournamentId/matches/:matchId/results` requiere Bearer y permisos de organizador/staff; cada score identifica al jugador con `userId` o `tournamentRegistrationId` y lleva `points` no negativo. Se rechaza el empate comparando el total de cada lado, también en dobles. Resultados históricos empatados se conservan y cuentan como partidos empatados.
- `GET /api/v1/tournaments/:tournamentId/scoreboard` devuelve `rows` con `userId`, `tournamentRegistrationId?`, `name`, `points`, `gamesPlayed`, `gamesWon`, `gamesLost`, `gamesDrawn`, `pointsFor`, `pointsAgainst`, `difference` y `rank`. Los partidos empatados históricos cuentan en `gamesDrawn`; los nuevos empates no se aceptan. El ranking ordena por puntos, diferencia, victorias en la mini-tabla directa del grupo empatado y, finalmente, nombre e identidad. Los datos internos de enfrentamientos directos no forman parte de la respuesta.

- `GET /api/v1/health` — estado del servicio
- `GET /api/v1/ready` — readiness (DB)
- `POST /api/v1/americanos` — crea partido (preset AMERICANO por deporte; body opcional `sportId`; hereda formato si hay `tournamentId`)
- `GET /api/v1/matchmaking/:matchId/suggestions` — sugerencias de jugadores por categoría
- `POST /api/v1/ranking/recalculate/:categoryId` — recalcula ranking desde resultados

### Monetización MVP (obligaciones no custodiales)

- `POST /api/v1/matches/:matchId/transactions/create-obligations` — cuerpo: `{ amountBasePerPerson, participantUserIds? }`
- `GET /api/v1/matches/:matchId/transactions/summary` — totales y conteos por estado
- `PATCH /api/v1/transactions/:transactionId/player-payment-selection` — jugador registra el medio de pago elegido antes de subir comprobante — requiere Bearer
- `PATCH /api/v1/transactions/:transactionId/confirm-manual` — confirma pago manual (solo staff de la sede) — requiere Bearer
- `PATCH /api/v1/transactions/:transactionId/reject-manual` — rechaza pago manual, cuerpo: `{ reason }` (solo staff de la sede) — requiere Bearer
- `POST /api/v1/transactions/:transactionId/receipt` — adjunta comprobante (imagen jpeg/png/webp) a la transacción — requiere Bearer
- `GET /api/v1/transactions/:transactionId/receipt/:receiptId` — descarga el comprobante — requiere Bearer
- `PATCH /api/v1/users/:userId/subscription` — cuerpo: `{ subscriptionType: "FREE" | "PRO" }`
- `GET /api/v1/users/:userId/transactions` — query opcional: `limit` (1–100, default 50)

La comisión de servicio usa la regla activa en `FeeRule` con `scope=MATCH` (si no hay regla activa, fee = 0).

### Venue-staff (E8)

- `POST /api/v1/venues/:venueId/staff` — registra/actualiza un miembro de staff de la sede — requiere Bearer
- `GET /api/v1/venues/:venueId/staff` — lista el staff de la sede
- `GET /api/v1/venues/:venueId/transactions/pending` — lista transacciones pendientes de la sede (obligaciones de partido y reserva) — requiere Bearer, solo staff de la sede

## OpenAPI / Swagger

- `GET /openapi.json` — especificación OpenAPI (JSON)
- `GET /docs` — Swagger UI (cargando assets vía CDN)
