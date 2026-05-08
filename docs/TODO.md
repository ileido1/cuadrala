## Sprint 3 — E2 MVP (backend-first)

### Objetivo

Dejar de depender de WhatsApp para llenar cupos: **listar partidas abiertas** con filtros/paginación y permitir **unirse** con validación de categoría.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | **US-E2-02** — `GET /api/v1/matches/open` (filtros + paginación) |  |
|  |  | **US-E2-03** — `POST /api/v1/matches/:matchId/join` (validación) |  |
|  |  | OpenAPI + tests de contrato |  |
|  |  | Migraciones Prisma (`maxParticipants`, `UserCategory`) |  |
|  |  | Lint (verde) |  |
|  |  |  | **Tests**: requieren Node 20.19+ (Vitest/Rolldown usa `util.styleText`) |

### Definición de Done (backend)

- [ ] `lint` + `typecheck` + `test` en verde
- [ ] OpenAPI actualizado (`/docs` y `/openapi.json`)
- [ ] Códigos de error estables y mensajes en español
- [ ] No violaciones de Clean Architecture (use cases sin imports de infra)

### Mini-Retro (ciclo actual)

- **Velocity**: buena — slices pequeños, wiring claro por composition.
- **Friction**: entorno — `npm test` falla en Node 18 por dependencia de Vitest/Rolldown.
- **Action**: estandarizar runtime (Node 20.19+) en local/CI y añadir comprobación de versión en bootstrap/docs.

---

## Sprint 4 — E3 motor (Americano) — rotaciones deterministas

### Objetivo

Generar **rondas/rotaciones** para formato **AMERICANO** de forma **determinista** e **idempotente**, con contrato API y tests.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | **US-E3-02** algoritmo rotaciones Americano (dominio) |  |
|  |  | Endpoint(s): `POST/GET /api/v1/tournaments/:tournamentId/americano-schedule...` |  |
|  |  | OpenAPI + tests de contrato |  |
|  |  | Migración Prisma: `TournamentAmericanoSchedule` |  |
|  |  |  | **Tests**: requieren Node 20.19+ (Vitest/Rolldown usa `util.styleText`) |

### Definición de Done (backend)

- [ ] Tests de dominio: determinismo + idempotencia
- [ ] Integración (DB): persistencia/consulta de rondas (si aplica)
- [ ] OpenAPI actualizado
- [ ] `lint` + `typecheck` + `test` en verde

### Mini-Retro (ciclo actual)

- **Velocity**: buena — US-E3-02 quedó acotada, con contrato simple.
- **Friction**: entorno — `npm test` no arranca en Node 18 por Vitest/Rolldown.
- **Action**: estandarizar Node 20.19+ en local/CI antes de cerrar sprint con “verde” real.

---

## Sprint 5 — E3‑03 Scoreboard (posiciones)

### Objetivo

Exponer un **scoreboard** consultable por torneo (posiciones y métricas) y sentar el contrato para “casi real‑time” (MVP: polling).

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | **US-E3-03** endpoint `GET /api/v1/tournaments/:tournamentId/scoreboard` + OpenAPI + tests |  |
|  |  |  | **Tests**: requieren Node 20.19+ (Vitest/Rolldown usa `util.styleText`) |

### Definición de Done (backend)

- [x] Scoreboard devuelve estructura estable (DTO) y ordenada
- [x] OpenAPI actualizado
- [x] Tests de contrato + integración (si `TEST_DATABASE_URL`)
- [ ] `lint` + `typecheck` + `test` en verde (bloqueado por Node 18)

---

## Sprint 20 — Geo/Geocoding (admin/interno)

### Objetivo

Integración de **Maps/Geocoding** para administración: buscar lugares, consultar detalles por `placeId` y persistir `placeId` + dirección normalizada en `Venue`.

### Variables de entorno (API)

- **GEO_DISPATCH_SECRET**: secret (>= 32 chars) para endpoints internos de geo. Header: `x-geo-secret`.
- **MAPS_PROVIDER**: `noop` | `stub` | `mapbox` | `google` (por defecto `noop`).
- **MAPBOX_ACCESS_TOKEN**: requerido si `MAPS_PROVIDER=mapbox`.
- **GOOGLE_MAPS_API_KEY**: reservado si `MAPS_PROVIDER=google` (no usado si no se implementa el adapter).

### Endpoints (internos)

- `GET /api/v1/geo/places/search?q=...&near=lat,lng&limit=...`
- `GET /api/v1/geo/places/{placeId}`
- `POST /api/v1/venues/{venueId}/geocode` body `{ placeId }`


## Sprint 6 — E2 CRUD de partidos

### Objetivo

Completar CRUD de partidos (crear/listar/detalle/actualizar/cancelar) con estados consistentes y contratos OpenAPI.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | `GET /api/v1/matches` (listado general con filtros) |  |
|  |  | `GET /api/v1/matches/:matchId` (detalle) |  |
|  |  | `POST /api/v1/matches` (crear; creator queda como participante) |  |
|  |  | `PATCH /api/v1/matches/:matchId` (editar campos permitidos) |  |
|  |  | `PATCH /api/v1/matches/:matchId/cancel` (cancelación) |  |
|  |  | OpenAPI + tests de contrato |  |
|  |  |  | **Tests**: requieren Node 20.19+ (Vitest/Rolldown usa `util.styleText`) |

### Definición de Done (backend)

- [ ] Endpoints CRUD documentados en OpenAPI
- [ ] Códigos de error estables y mensajes en español
- [x] Tests de contrato (sin DB) para endpoints CRUD
- [ ] Integración (DB) para CRUD (si `TEST_DATABASE_URL`)
- [x] `lint` en verde
- [ ] `typecheck` + `test` en verde (requiere Node 20.19+)

### Mini-Retro (ciclo actual)

- **Velocity**: alta — ampliación incremental del módulo `matches` sin romper `/matches/open` ni `/matches/:id/join`.
- **Friction**: entorno — `npm test` sigue bloqueado en Node 18 por `util.styleText`.
- **Action**: actualizar Node a 20.19+ y correr `npm install && npm test && npm run typecheck` para cerrar sprint con “verde” real.

---

## Sprint 7 — E2 hardening + integración (cerrar ciclo)

### Objetivo

Endurecer el CRUD de partidos con **permisos/owner**, **transiciones de estado** coherentes con `MatchStatus` y **tests de integración DB** para cerrar el ciclo end‑to‑end.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
| Definir owner/permisos MVP para editar/cancelar |  |  |  |
| Tests integración DB: create→update→cancel + conflictos |  |  |  |
| Endurecer use cases (403/409) y reglas de estado |  |  |  |
| OpenAPI (seguridad + errores) |  |  |  |
|  |  |  | **Tests**: requieren Node 20.19+ (Vitest/Rolldown usa `util.styleText`) |

### Definición de Done (backend)

- [ ] Permisos/owner definidos e implementados (403/401 consistentes)
- [ ] Integración DB (si `TEST_DATABASE_URL`) cubre: create, update, cancel, conflictos (cupo/estado)
- [ ] OpenAPI actualizado
- [ ] `lint` + `typecheck` + `test` en verde (Node 20.19+)

### Estado actual

- **Implementado**: tests de integración DB para CRUD de matches (condicionales a `TEST_DATABASE_URL`) + hardening por estado/cupo + permisos (participante).
- **Lint**: OK.
- **Bloqueo**: `npm test` requiere Node 20.19+ (Vitest/Rolldown usa `util.styleText`).

---

## Sprint 8 — E0‑03 Presets de formato versionados (cerrar épica E0)

### Objetivo

Completar **presets versionados** para formatos de torneo y dejar reglas claras de “vigente” vs “en uso”, sin romper torneos existentes.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
| Definir contrato: qué significa “preset vigente” (por `effectiveFrom` + `isActive`) |  |  |  |
| Endpoint(s) para crear nueva versión de preset (admin) |  |  |  |
| Resolver preset vigente por `sportId+code` al crear torneo |  |  |  |
| Garantizar inmutabilidad: torneo guarda `formatPresetId` + `presetSchemaVersion` |  |  |  |
| Tests integración DB: torneo en curso no cambia al publicar nueva versión |  |  |  |
| OpenAPI actualizado (presets versionados) |  |  |  |

### Definición de Done (backend)

- [ ] Crear nueva versión no afecta torneos existentes (tests)
- [ ] Torneo nuevo usa versión vigente al momento de creación (tests)
- [ ] Validaciones/errores estables (mensajes en español)
- [ ] OpenAPI actualizado
- [ ] `lint` + `typecheck` + `test` en verde

### Mini-Retro (ciclo actual)

- **Velocity**: buena — se agregó publish version + resolución por código sin romper la creación por `formatPresetId`.
- **Friction**: migraciones — se corrigió una migración duplicada para que sea idempotente en DBs ya inicializadas.
- **Action**: agregar seguridad/rol para el endpoint de publish (hoy es MVP sin auth) y formalizar política de “vigente” por entorno.

---

## Sprint 9 — E4 geo base (venues + near)

### Objetivo

Poder consultar sedes y canchas con filtros por **cercanía** para alimentar discovery.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | `POST /api/v1/venues` + `POST /api/v1/venues/:venueId/courts` |  |
|  |  | `GET /api/v1/venues?near=lat,lng&radiusKm=...` |  |
|  |  | OpenAPI + validaciones |  |
|  |  |  | Integración DB depende de `TEST_DATABASE_URL` |

---

## Sprint 10 — E5 resultados 4/4 + Elo (rating + history)

### Objetivo

Cerrar el ciclo competitivo: **borrador + confirmación cruzada 4/4** y actualizar Elo automáticamente al finalizar.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Draft + confirmaciones 4/4 → `MatchResult`/`MatchResultScore` |  |
|  |  | Elo: `UserRating` + `UserRatingHistory` + `ELO_K_FACTOR` |  |
|  |  | Tests integración condicional (DB) |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 11 — E2 lifecycle (slots-state-machine MVP)

### Objetivo

Definir transiciones mínimas de estado para evitar hacks y permitir un flujo correcto: `SCHEDULED → IN_PROGRESS → FINISHED`.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | `POST /api/v1/matches/:matchId/leave` (204 idempotente) |  |
|  |  | `POST /api/v1/matches/:matchId/start` (204) |  |
|  |  | `POST /api/v1/matches/:matchId/finish` (204, requiere 4 participantes) |  |
|  |  | Tests integración condicional (DB) + contrato 401 |  |

---

## Sprint 12 — E2 discovery hardening: filtros dinámicos (geo + precio)

### Objetivo

Mejorar discovery: filtros por **precio** y **geocerca** en partidas abiertas.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | `Match.pricePerPlayerCents` + migración |  |
|  |  | `GET /api/v1/matches/open` con `near/radiusKm` + `min/max pricePerPlayerCents` |  |
|  |  | Test integración condicional (DB) `e12_*` |  |

---

## Sprint 13 — E5 exposición de Elo: endpoints públicos

### Objetivo

Permitir que frontend/clients consulten Elo actual e historial.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | `GET /api/v1/users/:userId/ratings` |  |
|  |  | `GET /api/v1/users/:userId/ratings/history` (paginado) |  |
|  |  | OpenAPI + validaciones + tests (contrato + integración condicional) |  |

---

## Sprint 14 (propuesto) — E2 permisos + hardening de concurrencia

### Objetivo

Hacer el módulo `matches` realmente “producción”: ownership/permisos y consistencia de cupos.

### Backlog sugerido

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
| Definir `organizerUserId` (owner) y políticas de edición/cancelación |  |  |  |
| Join atómico (evitar sobrepasar cupo en carreras) + idempotencia configurable |  |  |  |
| Política de cancelación en `IN_PROGRESS` + efectos en resultados |  |  |  |
| Integración DB completa (activar `TEST_DATABASE_URL` en CI/local) |  |  |  |

---

## Sprint 14 — E2 permisos (owner) + notificaciones MVP

### Objetivo

Cerrar ownership/permisos de matches y dejar un MVP de notificaciones segmentadas (sin proveedor externo obligatorio).

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | `Match.organizerUserId` + permisos organizer (update/cancel/start/finish) |  |
|  |  | Resultados 4/4 + Elo (aplica al finalizar) |  |
|  |  | Notificaciones MVP: subscriptions + event `MATCH_SLOT_OPENED` + dispatch stub |  |
|  |  | OpenAPI + tests (contrato + integración condicional) |  |
|  |  | `npm test` + `npm run lint` (Node 20.19+) |  |

---

## Sprint 15 — E2 hardening: join atómico + cupos

### Objetivo

Garantizar que `POST /api/v1/matches/:matchId/join` sea **atómico** y **nunca** exceda `maxParticipants` bajo concurrencia.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Join atómico (transacción + `SELECT ... FOR UPDATE` en `Match`) |  |
|  |  | Test integración `e15_*` (concurrencia) |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 16 — E2 hardening: cancelación en `IN_PROGRESS`

### Objetivo

Definir política clara de cancelación en `IN_PROGRESS` y efectos sobre resultados/drafts.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Cancel en `SCHEDULED` y `IN_PROGRESS` (solo organizer) |  |
|  |  | Cancel en `FINISHED/CANCELLED` => 409 (`PARTIDO_NO_CANCELABLE`) |  |
|  |  | Cleanup transaccional de drafts/confirmations al cancelar |  |
|  |  | Test integración `e16_*` |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 17 — E7-02 (backend-first): notificaciones como worker real

### Objetivo

Convertir el dispatch de notificaciones en un flujo robusto tipo worker: deliveries PENDING, retries/backoff e invalidación de tokens inválidos.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | `NotificationDelivery` worker fields (`attemptCount`, `nextAttemptAt`, etc.) + migración |  |
|  |  | Dispatch worker: PENDING → SENT/FAILED, retries/backoff |  |
|  |  | Deshabilitar `DevicePushToken` si token inválido |  |
|  |  | Test integración `e17_*` |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 18 — E7-02: worker automático (cron in-process)

### Objetivo

Ejecutar `DispatchNotificationsUseCase` periódicamente sin depender de HTTP, controlado por env y con shutdown limpio.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Worker `notifications.worker.ts` (env gated, no corre en test) |  |
|  |  | Wiring en `main.ts` + shutdown limpio |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 19 — E7-02: observability + hardening del worker

### Objetivo

Mejorar operabilidad del dispatch: **logs estructurados**, **métricas internas**, **rate limiting por tick** y **warnings/alertas mínimas**.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | `GET /api/v1/notifications/metrics` (interno, secret) |  |
|  |  | Logs JSON por tick/batch/delivery + warnings |  |
|  |  | Rate limit por `limitTokens` |  |
|  |  | Test integración `e19_*` (DB condicional) |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 20 — E4: Geo/Geocoding (admin/interno)

### Objetivo

Integración de **Maps/Geocoding** para administración: buscar lugares, consultar detalles por `placeId` y persistir `placeId` + dirección normalizada en `Venue`.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Campos en `Venue`: `placeId`, `formattedAddress`, address normalizada, `geocodedAt` |  |
|  |  | Provider `MAPS_PROVIDER` (`noop/stub/mapbox`) + endpoints internos geo |  |
|  |  | `POST /api/v1/venues/{venueId}/geocode` |  |
|  |  | Test integración `e20_*` (DB condicional) |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 21 — E4/E2: Horas Vacantes (publicación rápida)

### Objetivo

Permitir que un admin/club publique una **hora vacante** en pocos pasos y que se convierta en **oferta visible** en discovery.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Modelo `VacantHour` + migración |  |
|  |  | `POST /api/v1/vacant-hours/publish` (interno) crea `Match` asociado |  |
|  |  | `GET /api/v1/vacant-hours` + `PATCH /api/v1/vacant-hours/:id/cancel` |  |
|  |  | Test integración `e21_*` (DB condicional) |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 22 — E7-02: worker separado (servicio)

### Objetivo

Separar la ejecución del dispatch a un **proceso independiente** para escalar sin acoplarlo a la API.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Entrypoint standalone `src/notifications_worker_main.ts` |  |
|  |  | Lock distribuido (advisory lock) para evitar doble ejecución |  |
|  |  | Scripts `worker:notifications` / `start:worker:notifications` |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 23 — E5: Elo “producto” + leaderboard

### Objetivo

Estabilizar el ranking Elo con políticas de configuración y exponer un leaderboard consumible.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Elo configurable: `ELO_INITIAL_RATING`, clamps, K provisional |  |
|  |  | `GET /api/v1/ratings/leaderboard?categoryId=...` |  |
|  |  | OpenAPI + test contrato |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 24 — E0-03: Presets versionados (cerrar historia)

### Objetivo

Garantizar que **torneos existentes** no cambian ante nuevas versiones y que **torneos nuevos** usan la versión vigente por `sportId+code`.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | `TournamentFormatPreset`: `version`, `effectiveFrom`, `isActive`, `supersedes` |  |
|  |  | Resolución de vigente por `findActiveBySportAndCodeSV(..., now)` |  |
|  |  | Tests integración `e0_03_*` / `e8_*` (DB condicional) |  |
|  |  | `npm test` + `npm run lint` |  |

---

## Sprint 25 — E1: Auth hardening (logout + refresh rotation)

### Objetivo

Endurecer autenticación para producción: **logout**, estrategia consistente para **refresh** (rotación e invalidación), y **tests de integración DB**.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Definir estrategia de logout/invalidación (rotation) |  |
|  |  | Endpoint `POST /api/v1/auth/logout` + OpenAPI |  |
|  |  | Persistencia de refresh tokens (`RefreshToken`) + rotación |  |
|  |  | Tests DB: register → refresh → logout → refresh inválido (`s25_*`) |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 26 — E5: Resultados 4/4 (rechazos + re-propuesta)

### Objetivo

Completar el flujo competitivo: permitir **REJECTED** y **re-propuesta** de resultados con auditoría mínima.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Modelo/estado para re-propuesta (draft versioning) |  |
|  |  | Endpoint re-proponer borrador y reset confirmaciones |  |
|  |  | Tests DB: reject → re-propose → 4/4 confirm → Elo (`s26_*`) |  |
|  |  | OpenAPI actualizado |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 27 — E5-02: Ranking recalculation robusto (idempotente/transaccional)

### Objetivo

Hacer el recálculo de ranking **seguro e idempotente**, con transacciones y pruebas.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Fuente de verdad: `MatchResult/MatchResultScore` |  |
|  |  | Endpoint idempotente/transaccional `POST /api/v1/ranking/recalculate/:categoryId` |  |
|  |  | Tests DB: recalc 2 veces => mismo resultado (`s27_*`) |  |
|  |  | Observability mínima |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 28 — E6-03: Comprobantes (upload)

### Objetivo

Permitir adjuntar comprobantes a obligaciones (sin custodia), con storage seguro.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Storage local seguro + límites MIME/tamaño |  |
|  |  | Endpoints upload + lectura segura |  |
|  |  | Tests DB+FS (`s28_*`) |  |
|  |  | OpenAPI actualizado |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 29 — E2: Matchmaking v2 (similaridad + restricciones)

### Objetivo

Mejorar sugerencias: **similaridad real** (Elo/categoría/geo) y restricciones por disponibilidad.

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Heurística de similaridad (no solo top-N) |  |
|  |  | Restricciones geo (venue/radio) y exclusiones |  |
|  |  | Tests DB: suggestions deterministas (`s29_*`) |  |
|  |  | OpenAPI actualizado |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 30 — E7: Notificaciones in-app (bandeja)

### Objetivo

Agregar bandeja de notificaciones in-app (read/unread) y expandir tipos (pagos/chat).

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Bandeja in-app con `NotificationDelivery.readAt` |  |
|  |  | Endpoints: list + mark read + read-all |  |
|  |  | Tests DB (`s30_*`) |  |
|  |  | OpenAPI actualizado |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 31 — E0-01: multi-deporte hardening (seed multi-sport)

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Seed multi-sport (PADEL/TENNIS/PICKLEBALL) |  |
|  |  | Presets v1 por deporte (AMERICANO/ROUND_ROBIN) |  |
|  |  | Endpoints catálogo: `GET /sports` + presets por sport |  |
|  |  | Test integración DB `s31_*` |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 32 — E0-02: validación fuerte de `formatParameters` por preset

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Validador por `formatPresetCode`/`schemaVersion` |  |
|  |  | Rechazo de keys extra / tipos inválidos |  |
|  |  | Tests contrato + integración DB `s32_*` |  |
|  |  | OpenAPI documenta `formatParameters` |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 33 — E3-01: schedule genérico de torneos (persistencia + endpoints)

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Modelo `TournamentSchedule` + migración |  |
|  |  | Endpoints genéricos `schedule:generate` y `schedule` |  |
|  |  | AMERICANO soportado; otros => 501 |  |
|  |  | Test integración DB `s33_*` |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 34 — E7-01: Chat MVP por match/torneo

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Modelos `ChatThread`/`ChatMessage` + migración |  |
|  |  | Endpoints: match chat + tournament chat (auth) |  |
|  |  | OpenAPI actualizado |  |
|  |  | Test integración DB `s34_*` |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 35 — E7: notificaciones (tipos pagos/chat + preferencias por tipo)

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Nuevos `NotificationEventType`: `PAYMENT_PENDING`, `CHAT_MESSAGE` |  |
|  |  | Preferencias por tipo: `NotificationSubscription.enabledTypes` |  |
|  |  | Dispatch respeta preferencias |  |
|  |  | Endpoint interno crear eventos pagos/chat |  |
|  |  | Test integración DB `s35_*` |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 36 — E4: performance geo (índices base)

### Done

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
|  |  | Índices para queries críticas (match status/schedule/court) |  |
|  |  | Migración `s36` no destructiva |  |
|  |  | `npm run lint && npm test` en verde |  |

---

## Sprint 37 — E3: ROUND_ROBIN real (motor + schedule)

### Backlog sugerido

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
| Implementar generación ROUND_ROBIN (rondas/emparejamientos) |  |  |  |
| Persistencia en `TournamentSchedule` + `scheduleKey` determinista |  |  |  |
| Tests dominio (determinismo/idempotencia) + integración DB |  |  |  |
| OpenAPI (payload/ejemplos) |  |  |  |

---

## Sprint 38 — E3: Eliminación simple (SINGLE_ELIMINATION) MVP

### Backlog sugerido

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
| Preset por deporte + validación `formatParameters` |  |  |  |
| Generación bracket (byes o política definida) |  |  |  |
| Tests DB + OpenAPI |  |  |  |

---

## Sprint 39 — E3: Inscripciones de torneo (registrations) MVP

### Backlog sugerido

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
| Endpoints inscribir/listar (idempotente, sin duplicados) |  |  |  |
| Reglas por estado del torneo (DRAFT/ACTIVE/etc.) |  |  |  |
| `schedule:generate` toma participantes desde registrations |  |  |  |
| Tests DB + OpenAPI |  |  |  |

---

## Sprint 40 — E4: geo “exacta” + medición formal (EXPLAIN/bench)

### Backlog sugerido

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
| Definir si se devuelve `distanceKm` |  |  |  |
| Medición (EXPLAIN) y límites (radius/limit) |  |  |  |
| Ajustes de queries/índices según findings |  |  |  |

---

## Sprint 41 — E7: notificaciones “full” (payloads/plantillas + observability)

### Backlog sugerido

| Backlog | In Progress | Done | Blocked |
|---|---|---|---|
| Contratos de payload por tipo + plantillas title/body |  |  |  |
| Tests de contrato (no romper shape) |  |  |  |
| Integración con dashboards/alertas externas (runbook) |  |  |  |


---

# Plan de Sprints 2026 — Full-Stack (2 semanas c/u)

> **Generado:** 2026-05-08 | **Modo:** Full-stack paralelo | **Ciclo:** 2 semanas
> **Fuente de verdad:** `docs/BACKLOG_UNIFICADO.md` + validación contra código real (mobile + API)

## Estado real validado (código vs backlog)

### Sprints REALIZADOS (Done) — verificados en código

| Sprint | Mobile (Flutter) | API (Node.js) | Archivos clave |
|--------|-------------------|---------------|----------------|
| **M1** — Auth | ✅ | ✅ | `features/auth/`, `auth.router.ts`, `auth.controller.ts` |
| **M2** — Home + Discovery | ✅ | ✅ | `features/home/`, `open_matches_screen.dart`, `matches.router.ts` |
| **M3** — Crear/Unirse/Ciclo | ✅ | ✅ | `create_match_screen.dart`, `match_lifecycle_screen.dart` |
| **M4** — Resultados + Pagos MVP | ✅ | ✅ | `result_draft_screen.dart`, `features/monetization/` |
| **M6** — Chat + Notif MVP | ✅ | ✅ | `match_chat_screen.dart`, `notifications_screen.dart`, `chat.router.ts` |
| **M7** — Perfil/Ranking | ✅ | ✅ | `features/profile/`, `ranking.controller.ts`, `elo_leaderboard.controller.ts` |
| **M10** — UI alineada | ✅ | N/A | `AppHeader`, bottom nav blur, design tokens |
| **M11-M13** — Onboarding rich | ✅ | ✅ | `features/onboarding/`, `onboarding.controller.ts` |
| **M19** — Court availability | ✅ | ✅ | `create_match_screen.dart` (L302-374, L450-501), `court_availability.controller.ts` |

### Parcialmente hecho

| Feature | Mobile | API | Gap |
|---------|--------|-----|-----|
| **Torneos (M5)** | ✅ Screens + cubits completos | Parcial | Faltan ROUND_ROBIN, SINGLE_ELIMINATION, inscripciones |
| **E3-04** Schedule genérico | ✅ | Parcial | AMERICANO soportado; otros → 501 |

---

## Sprint 42 — Quick Wins Mobile (backend ya listo)

**Estado:** `DONE` ✅ | **Duración:** 2 semanas | **Enfoque:** Mobile

**Objetivo:** cerrar features donde el API está lista pero falta la pantalla mobile.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---------|-------------|------|---------|
| **US-M3-07** Pantalla matchmaking suggestions | | ✅ | |
| **US-M6-02** Pantalla preferencias notificación | | ✅ | |
| **US-M6-03** Device push tokens (login/logout) | | ✅ | |
| **US-M5-02** Chat por torneo | | ✅ | |

### Definición de Done
- [x] `flutter analyze` en verde (0 issues)
- [x] `flutter test` en verde (61 passed, 2 pre-existing failures)
- [x] Todas las pantallas con estados loading/empty/error/success
- [x] Navegación integrada en shell (tabs/rutas)

### Archivos creados
- `features/chat/presentation/cubit/tournament_chat_state.dart`
- `features/chat/presentation/cubit/tournament_chat_cubit.dart`
- `features/chat/presentation/tournament_chat_screen.dart`
- `features/notifications/data/models/notification_subscription_dto.dart`
- `features/notifications/presentation/cubit/notification_prefs_state.dart`
- `features/notifications/presentation/cubit/notification_prefs_cubit.dart`
- `features/notifications/presentation/notification_prefs_screen.dart`
- `features/matchmaking/data/models/matchmaking_suggestion_dto.dart`
- `features/matchmaking/data/matchmaking_api.dart`
- `features/matchmaking/data/matchmaking_repository.dart`
- `features/matchmaking/presentation/cubit/matchmaking_state.dart`
- `features/matchmaking/presentation/cubit/matchmaking_cubit.dart`
- `features/matchmaking/presentation/matchmaking_screen.dart`
- Extended: `chat_api.dart`, `chat_repository.dart`, `notifications_api.dart`, `notifications_repository.dart`
- Updated: `service_locator.dart`, `routes.dart`, `app_router.dart`

### Dependencias
- Backend: ✅ listo (`matchmaking.controller.ts`, `notification_subscriptions.controller.ts`, `device_push_tokens.controller.ts`, `chat.router.ts`)

### Riesgo: Bajo — endpoints ya existen y están probados.

---

## Sprint 43 — E8 Foundation: Club/Venue Ownership

**Estado:** `BACKLOG` | **Duración:** 2 semanas | **Enfoque:** Backend-first

**Objetivo:** modelo de dueño/staff de venue + instrucciones de cobro. Desbloquea pagos reales y backoffice web.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---------|-------------|------|---------|
| **US-E8-01** Modelo `Venue.ownerUserId` + tabla `VenueStaff` | | | |
| **US-E8-02** Instrucciones de transferencia del venue + endpoint lectura | | | |
| **US-E8-03** `confirm-manual` solo staff del venue del court | | | |
| **US-E8-04** Listado transacciones PENDING por venueId | | | |
| **US-E8-06** OpenAPI + tests contrato para E8 | | | |

### Definición de Done
- [ ] `npm run lint && npm run typecheck && npm test` en verde
- [ ] Migraciones Prisma aplicables sin data loss
- [ ] OpenAPI actualizado (`/docs` y `/openapi.json`)
- [ ] Tests de integración DB para E8-01 a E8-04
- [ ] Códigos de error estables en español

### Dependencias
- Ninguna (es el inicio de la épica E8)

### Riesgo: Medio — cambia modelo de datos de `Venue`, requiere migración cuidadosa.

---

## Sprint 44 — E8 Mobile + Web Backoffice

**Estado:** `BACKLOG` | **Duración:** 2 semanas | **Enfoque:** Full-stack (API + Mobile + Web)

**Objetivo:** flujo de pago con datos del venue en mobile + panel web mínimo para conciliación.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---------|-------------|------|---------|
| **US-M8-03** Instrucciones de cobro del venue en flujo pago (mobile) | | | |
| **US-E8-05** Notificaciones a staff del venue | | | |
| **US-W1-01** Scaffold Next.js + cliente API + login | | | |
| **US-W1-02** Shell backoffice (sidebar, selector sede) | | | |
| **US-W1-03** Lista pagos PENDING por mis canchas | | | |
| **US-W1-04** Detalle: ver comprobante + Confirmar pago | | | |

### Definición de Done
- [ ] Mobile: `flutter analyze` + `flutter test` en verde
- [ ] Web: build + lint en verde
- [ ] API: tests E8-05 en verde
- [ ] Flujo end-to-end: jugador sube comprobante → club confirma desde web

### Dependencias
- **Requiere Sprint 43 completo** (E8-01 a E8-04)

### Riesgo: Alto — primer sprint con 3 layers (API + Mobile + Web).

---

## Sprint 45 — Torneos: formatos + inscripciones

**Estado:** `DONE` ✅ | **Duración:** 2 semanas | **Enfoque:** Full-stack

**Objetivo:** cerrar la épica E3 con ROUND_ROBIN real, SINGLE_ELIMINATION MVP e inscripciones.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---------|-------------|------|---------|
| **US-E3-05** Motor ROUND_ROBIN (rondas/pairings) | | ✅ | |
| **US-E3-06** Preset SINGLE_ELIMINATION + bracket | | ✅ | |
| **US-E3-07** Inscripciones (`POST/GET /registrations`) | | ✅ | |
| **US-M4-01** Catálogo deportes + presets (validar integración) | | ✅ | |
| **US-M4-02** Crear torneo con UI dinámica de formatParameters | | ✅ | |

### Definición de Done
- [x] Tests de dominio: determinismo + idempotencia para ROUND_ROBIN y SINGLE_ELIMINATION
- [x] Tests integración DB para inscripciones (idempotente, sin duplicados)
- [x] Mobile: `flutter analyze` + `flutter test` en verde
- [x] OpenAPI actualizado con nuevos formatos

### Archivos creados (Backend)
- `src/domain/round_robin/round_robin_schedule_generator.ts` — Algoritmo circle method
- `src/domain/single_elimination/bracket_generator.ts` — Bracket con byes + seeding estándar
- `src/domain/ports/tournament_registration_repository.ts` — Port de registrations
- `src/infrastructure/adapters/prisma_tournament_registration_repository.ts` — Adapter Prisma
- `src/application/use_cases/register_tournament_participant.use_case.ts`
- `src/application/use_cases/list_tournament_registrations.use_case.ts`
- `src/application/use_cases/withdraw_tournament_registration.use_case.ts`
- `src/presentation/validation/tournament_registration.validation.ts`
- `src/presentation/controllers/tournament_registration.controller.ts`
- `src/presentation/routes/tournament_registration.router.ts`
- `src/presentation/composition/tournament_registration.composition.ts`

### Archivos modificados (Backend)
- `src/application/use_cases/generate_tournament_schedule.use_case.ts` — +ROUND_ROBIN, +SINGLE_ELIMINATION
- `src/application/services/tournament_format_parameters_validator.service.ts` — +SINGLE_ELIMINATION
- `src/presentation/validation/tournament_schedule.validation.ts` — +doubleRound, +thirdPlaceMatch, min 2 participants
- `src/presentation/controllers/tournament_schedule.controller.ts` — +params forwarding
- `src/presentation/routes/api.v1.router.ts` — +registration router
- `prisma/seed.ts` — +SINGLE_ELIMINATION preset

### Archivos creados (Mobile)
- `features/tournaments/data/models/tournament_registration_dto.dart`
- `features/tournaments/presentation/cubit/tournament_registrations_state.dart`
- `features/tournaments/presentation/cubit/tournament_registrations_cubit.dart`

### Archivos modificados (Mobile)
- `features/tournaments/data/tournaments_api.dart` — +registration methods, +body in generate
- `features/tournaments/data/tournaments_repository.dart` — +registration methods, +params in generate
- `features/tournaments/presentation/tournament_detail_screen.dart` — +Inscripciones tab, +chat nav, +generate with participants
- `features/tournaments/presentation/create_tournament_screen.dart` — +SINGLE_ELIMINATION params
- `features/tournaments/presentation/cubit/tournament_schedule_cubit.dart` — +participantUserIds param
- `core/di/service_locator.dart` — +TournamentRegistrationsCubit

### Dependencias
- US-E3-04 (schedule genérico) — ✅ parcial (AMERICANO soportado)
- US-E0-02 (validación formatParameters) — ✅ done

### Riesgo: Medio — algoritmos de brackets son complejos pero acotados.

### Paralelización
- Puede ejecutarse **en paralelo** con Sprint 43-44 (no depende de E8).

---

## Sprint 46 — Geo/Venues: búsqueda + vacant hours

**Estado:** `BACKLOG` | **Duración:** 2 semanas | **Enfoque:** Full-stack

**Objetivo:** habilitar descubrimiento de sedes y gestión de horas vacantes desde mobile.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---------|-------------|------|---------|
| **US-E4-05** Geo exacta: `distanceKm` + medición EXPLAIN/bench | | | |
| **US-M9-01** Búsqueda de lugares + detalle | | | |
| **US-M9-02** Vacant hours: publicar, listar, cancelar | | | |

### Definición de Done
- [ ] API: benchmarks documentados (EXPLAIN, p95/p99)
- [ ] Mobile: `flutter analyze` + `flutter test` en verde
- [ ] Pantallas con loading/empty/error/success
- [ ] OpenAPI actualizado

### Dependencias
- Backend geo: ✅ parcial (`geo.router.ts`, `vacant_hours.router.ts` ya existen)

### Riesgo: Bajo-Medio — endpoints ya existen, mobile necesita pantallas.

### Paralelización
- Puede ejecutarse **en paralelo** con Sprint 44-45.

---

## Sprint 47 — Hardening + Post-MVP

**Estado:** `BACKLOG` | **Duración:** 2 semanas | **Enfoque:** Full-stack

**Objetivo:** cerrar cabos sueltos, mejorar calidad, preparar para producción.

### Tablero (Scrum/Kanban)

| Backlog | In Progress | Done | Blocked |
|---------|-------------|------|---------|
| **US-E7-04** Plantillas/payloads estables por tipo de notif | | | |
| **US-E5-04** Elo por deporte + leaderboard por sportId | | | |
| **US-M3-09** UX conflictos de reserva (mejorar mensajes + CTA) | | | |
| **US-W1-05** Formulario datos de cobro del venue (CRUD) | | | |
| **US-W1-06** Auditoría mínima: quién confirmó, timestamp | | | |
| Caching offline-lite, analytics, performance tuning | | | |

### Definición de Done
- [ ] Todo verde (lint + typecheck + test en API y mobile)
- [ ] Métricas de performance documentadas
- [ ] No features sin tests
- [ ] OpenAPI 100% actualizado

### Dependencias
- **Requiere todos los sprints anteriores completos**

### Riesgo: Bajo — es hardening, no features nuevas.

---

## Dependency Graph

```
Sprint 42 (Quick Wins)     → ✅ DONE
                              ↓
Sprint 43 (E8 Foundation)  → Desbloquea Sprint 44
                              ↓
Sprint 44 (E8 Mobile+Web)  → Primer valor de pagos reales
                              ↓
Sprint 45 (Torneos)        → ✅ DONE
                              ↓
Sprint 46 (Geo/Venues)     → Independiente, paralelizable con 44-45
                              ↓
Sprint 47 (Hardening)      → Todo lo anterior debe estar done
```

## Paralelización recomendada

| Semana | Carril A | Carril B |
|--------|----------|----------|
| 1-2 | **Sprint 42** ✅ DONE | — |
| 3-4 | **Sprint 43** (E8 Backend) | **Sprint 45** ✅ DONE |
| 5-6 | **Sprint 44** (E8 Mobile + Web) | **Sprint 46** (Geo/Venues) |
| 7-8 | **Sprint 47** (Hardening) | — |

## WIP Limit
- Máximo **2 sprints en progreso simultáneo** para evitar contexto-switching.
- **Definition of Ready**: cada US debe tener criterios de aceptación claros, contrato API definido (si aplica), y dependencias resueltas.
- **Definition of Done**: tests pasan, lint/typecheck verde, OpenAPI actualizado, código reviewado.

---

## Mini-Retro (planificación inicial)

- **Velocity**: plan conservador — sprints de 2 semanas con scope acotado.
- **Friction**: Sprint 44 tiene 3 layers (API + Mobile + Web) — es el mayor riesgo de delivery.
- **Action**: si Sprint 44 se atrasa, mover US-W1-* a Sprint 47 y cerrar solo mobile + API en 44.

---

## Mini-Retro — Sprint 42

- **Velocity**: Alta — 4 US completadas en un solo pass. Patrones de código bien establecidos facilitaron el desarrollo.
- **Friction**: Rutas de imports relativas — error común al crear features nuevas (`../../data/` vs `../data/`). Los tests pre-existing de torneos fallan por modelos desactualizados (no relacionado con Sprint 42).
- **Action**: Considerar agregar tests para los nuevos features (tournament_chat, notification_prefs, matchmaking) en el siguiente sprint de hardening.

---

## Mini-Retro — Sprint 45

- **Velocity**: Alta — 3 US de backend + 2 de mobile completadas. El patrón clean-architecture del proyecto facilitó agregar registrations sin fricción.
- **Friction**: El typecheck de TypeScript con `exactOptionalPropertyTypes` requiere manejo cuidadoso de `undefined` vs optional. Los tests pre-existing de torneos siguen fallando por modelos desactualizados.
- **Action**: Actualizar los tests de torneos existentes para usar los nuevos modelos (sin `bracketSize`, con `tournamentId` en vez de `id`). Agregar tests para ROUND_ROBIN y SINGLE_ELIMINATION.

