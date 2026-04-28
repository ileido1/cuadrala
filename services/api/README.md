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

El seed es **idempotente**: crea/actualiza **deporte PADEL**, presets **AMERICANO** y **ROUND_ROBIN**, y la `FeeRule` MATCH si no existe.

**Cambio de esquema (E0):** si tu base ya tenía filas en `Match`/`Tournament` antes de añadir `sportId` y torneos parametrizables, `prisma db push` puede pedir reset o migración manual. En **desarrollo**, suele bastar base vacía o `npx prisma db push` sobre una BD nueva; luego `npm run seed`.

Si **no** tienes PostgreSQL en marcha, no ejecutes `migrate dev` aquí; puedes validar el esquema con:

```bash
npm run prisma:validate
```

Tras cambiar `prisma/schema.prisma`, regenera el cliente:

```bash
npx prisma generate
```

## Scripts

| Script                    | Descripción              |
| ------------------------- | ------------------------ |
| `npm run dev`             | Servidor en modo watch   |
| `npm run build`           | Compila a `dist/`        |
| `npm run start`           | Ejecuta `dist/main.js`   |
| `npm run typecheck`       | `tsc --noEmit`           |
| `npm run lint`            | ESLint                   |
| `npm run prisma:validate` | Valida el esquema Prisma |
| `npm run seed`            | `prisma db seed` — catálogo PADEL + presets + FeeRule (requiere `DATABASE_URL`) |
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

- `GET /api/v1/health` — estado del servicio
- `GET /api/v1/ready` — readiness (DB)
- `POST /api/v1/americanos` — crea partido (preset AMERICANO por deporte; body opcional `sportId`; hereda formato si hay `tournamentId`)
- `GET /api/v1/matchmaking/:matchId/suggestions` — sugerencias de jugadores por categoría
- `POST /api/v1/ranking/recalculate/:categoryId` — recalcula ranking desde resultados

### Monetización MVP (obligaciones no custodiales)

- `POST /api/v1/matches/:matchId/transactions/create-obligations` — cuerpo: `{ amountBasePerPerson, participantUserIds? }`
- `GET /api/v1/matches/:matchId/transactions/summary` — totales y conteos por estado
- `PATCH /api/v1/transactions/:transactionId/confirm-manual` — confirma pago manual
- `PATCH /api/v1/users/:userId/subscription` — cuerpo: `{ subscriptionType: "FREE" | "PRO" }`
- `GET /api/v1/users/:userId/transactions` — query opcional: `limit` (1–100, default 50)

La comisión de servicio usa la regla activa en `FeeRule` con `scope=MATCH` (si no hay regla activa, fee = 0).

## OpenAPI / Swagger

- `GET /openapi.json` — especificación OpenAPI (JSON)
- `GET /docs` — Swagger UI (cargando assets vía CDN)
