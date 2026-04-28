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



