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



