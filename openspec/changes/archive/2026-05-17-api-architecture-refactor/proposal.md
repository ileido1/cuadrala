# Proposal: Cierre de deuda arquitectónica — `services/api` (Wave 7)

| Campo | Valor |
|-------|-------|
| **Programa** | `api-architecture-refactor` |
| **Fase** | Wave 7 — Cierre (post olas 0–6) |
| **Alcance** | Deuda residual P1–P7 en `services/api/src` |
| **Estado** | Wave 7 implementada — ver `verify-report.md` |

---

## Intent

Las olas 0–6 del programa **`api-architecture-refactor`** dejaron el API en **cumplimiento medio-alto** de hexagonal/Clean Architecture: `domain/` y `application/` sin imports de `infrastructure/` (ESLint en error), ~78 ports, ~77 adapters, ~37 composition roots, god services y repos función eliminados, controllers principales delgados.

Queda **deuda de consistencia** (autorización en controller, docs desactualizados, scaffolds vacíos, mappers dispersos, servicios application residuales, DI Prisma heterogénea) que erosiona el patrón y bloquea confianza para features fintech (`multi-currency-payments` ya desbloqueable en gate, pero el equipo necesita un **cierre verificable** del programa).

Este change **cierra el programa madre** sin reabrir migraciones masivas de BC: solo endurecer reglas, alinear documentación, unificar patrones transversales y eliminar la última violación P1 de capa presentation.

---

## Problem (why)

| ID | Síntoma | Impacto |
|----|---------|---------|
| **P1** | `venue_dashboard.composition.ts` exporta `VENUE_STAFF_REPOSITORY`; `venue_dashboard.controller.ts` llama `isUserStaffOfVenueSV` en 5 handlers | Controller hace autorización vía port/adaptador; rompe “solo `*_UC`” |
| **P2** | `ARCHITECTURE.md` y `exploration.md` describen AS-IS pre-olas (9 services, 15 repos) | Onboarding incorrecto; MCP/agentes perpetúan deuda ya cerrada |
| **P3** | Scaffolds vacíos: `domain/repositories/`, `domain/validation/`, `infrastructure/db/`, `infrastructure/legacy/`, `infrastructure/repositories/` | Ruido; invita a patrones prohibidos |
| **P4** | Mappers en adapters inline, `presentation/mappers/`, `domain/services/money/`; doc menciona `infrastructure/mappers/` inexistente | Duplicación; sin convención única |
| **P5** | `application/services/reservation_ledger.service.ts`, `tournament_format_parameters_validator.service.ts` | Capa application con “services” fuera de UC |
| **P6** | Adapters/compositions mezclan singleton `PRISMA` global vs `new Adapter(prisma)` por ctor | Tests y composición inconsistentes |
| **P7** | Mobile | Fuera de scope API (mención: contratos HTTP estables) |

**Métricas TO-BE (post Wave 7):** 0 exports de repositorios desde composition a controllers · 0 carpetas scaffold prohibidas · 0 `application/services/*.service.ts` · docs alineados al código · convención mapper documentada y aplicada en paths críticos (payments/booking).

---

## Scope

### In scope

- **P1:** UC de autorización staff de venue; controller dashboard solo `*_UC`
- **P2:** Actualizar `ARCHITECTURE.md`, `exploration.md`, `proposal.md`, `tasks.md` (estado Wave 7), `AGENTS.md` si aplica
- **P3:** Eliminar carpetas vacías o documentar excepción única en ARCHITECTURE
- **P4:** Decidir y aplicar convención mapper (doc + extracción mínima en BC payments/booking)
- **P5:** Migrar 2 servicios application → UC o `domain/services/`
- **P6:** Guía DI Prisma + alinear compositions “gold” (`transaction_receipts`, `matches`)
- **P6b:** ESLint opcional: prohibir export de `*_REPOSITORY` desde `*.composition.ts` a controllers
- Criterios de aceptación + verify-report del programa completo

### Out of scope

- Nuevos endpoints o cambios de contrato HTTP (salvo mensajes de error equivalentes)
- `multi-currency-payments` implementación (change hijo; gate ya cumplido)
- Refactor mobile/web (`apps/mobile`, `apps/web`)
- Reescribir todos los use cases a “1 archivo por acción” (P6 estilo UC agrupados — solo documentar)
- Big-bang extracción de mappers en los 77 adapters

---

## Capabilities

### New capabilities

| Capability | Descripción |
|------------|-------------|
| `venue-staff-authorization-uc` | Autorización staff vía UC; controllers sin ports exportados |
| `api-architecture-closure` | Housekeeping P2–P6, docs, scaffolds, mapper/DI conventions |

### Modified capabilities

| Capability | Cambio |
|------------|--------|
| `api-layer-boundaries` | Regla opcional: no export repository desde composition a controller |
| `api-composition-root` | Patrón DI Prisma unificado documentado + compositions referencia |
| `infrastructure-adapters-only` | Convención mapper: adapters vs `infrastructure/mappers/` |

*(Capabilities madre Wave 0–6 ya especificadas en `openspec/changes/api-architecture-refactor/specs/`.)*

---

## Approach

**Estrategia:** Wave 7 en PRs encadenados ≤400 LOC (`auto-chain`), TDD en P1 y P5, docs en PR paralelo sin código.

### P1 — Autorización staff (decisión requerida)

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A — `AssertVenueStaffAccessUseCase`** (recomendada) | UC delgado: `executeSV(actorId, venueId)` → 403 si no staff. Composition exporta `ASSERT_VENUE_STAFF_UC`; cada handler dashboard lo invoca antes del UC de negocio. | Alineado con Clean Architecture; reutilizable; tests unitarios simples | 1 llamada extra por handler (aceptable) |
| **B — Autorización dentro de cada UC de dashboard** | `GetDashboardStatsUseCase` etc. inyectan `VenueStaffRepository` y validan al inicio | Sin UC extra; una sola entrada HTTP | Duplica 5× la misma lógica; mezcla auth con query |
| **C — Middleware `requireVenueStaffCON`** | Middleware presentation valida staff antes del controller | DRY en HTTP | Lógica de aplicación en middleware; peor testabilidad; no reutilizable fuera HTTP |

**Decisión recomendada: A.** Eliminar `export { VENUE_STAFF_REPOSITORY }` de `venue_dashboard.composition.ts`. Los demás compositions que inyectan staff al UC (bookings, monetization) **no cambian** — ya cumplen.

### P4 — Mappers (decisión)

| Opción | Descripción | Recomendación |
|--------|-------------|---------------|
| **A — Carpeta `infrastructure/mappers/{bc}/`** | Extraer funciones puras Prisma row → entity/VO | Objetivo largo plazo; solo payments + booking en Wave 7 |
| **B — Mappers colocados en adapter** (`prisma_*_mapper.ts` junto al adapter) | Sin carpeta global; ARCHITECTURE actualizado | **Default Wave 7** si presión de tiempo |

**Decisión recomendada: B para cierre rápido + A incremental** en adapters de transacción/reserva (paths con más de 80 LOC de mapping).

### P5 — Servicios application

- `reservation_ledger.service.ts` → `RecordReservationLedgerEntryUseCase` (o mover lógica pura a `domain/services/booking/` si sin IO)
- `tournament_format_parameters_validator.service.ts` → `domain/services/tournament/` o UC de validación invocado desde torneos

### P6 — DI Prisma

- Composition root crea `const prisma = getPrismaClient()` (o import `PRISMA` único desde `infrastructure/prisma_client.ts`)
- Adapters reciben `prisma` por ctor; **prohibido** `new PrismaXAdapter()` sin args en compositions nuevos
- Auditar y corregir compositions gold list (≥ `transaction_receipts`, `matches`, `venue_dashboard`)

---

## Entregables por fase (Wave 7)

| PR | Entregable | Deuda |
|----|------------|-------|
| **W7-PR1** | `AssertVenueStaffAccessUseCase` + tests + refactor `venue_dashboard.controller` | P1 |
| **W7-PR2** | Migrar `reservation_ledger` y `tournament_format_parameters_validator` | P5 |
| **W7-PR3** | Eliminar scaffolds P3; grep 0 referencias | P3 |
| **W7-PR4** | Mapper convention: doc + 2 extracciones piloto (transaction, reservation) | P4 |
| **W7-PR5** | DI Prisma: guía + alinear 3–5 compositions referencia | P6 |
| **W7-PR6** | Docs P2 (`ARCHITECTURE.md`, exploration, verify-report) + ESLint export repo (opcional) | P2, P6b |

**Estimación:** 1 sprint (1 dev), 6 PRs encadenados.

---

## DAG de alto nivel (Wave 7)

```text
W7-PR1 (P1 staff UC) ──┬──► W7-PR6 (docs + verify)
W7-PR2 (P5 services)  ──┤
W7-PR3 (P3 scaffolds) ──┼──► W7-PR4 (P4 mappers) ──► W7-PR5 (P6 DI)
                        └──► (W7-PR4 puede paralelizar con PR2/PR3 tras PR1)
```

| Tarea | Depende de |
|-------|------------|
| W7-PR1 | — |
| W7-PR2, W7-PR3 | — (paralelo con PR1) |
| W7-PR4 | W7-PR3 (rutas estables) |
| W7-PR5 | W7-PR4 (convención definida) |
| W7-PR6 | W7-PR1…PR5 |

**Gate programa:** Wave 7 merge + `verify-report.md` → archivar `api-architecture-refactor` → iniciar `multi-currency-payments` sin deuda estructural pendiente.

---

## Affected areas

| Area | Impact | Description |
|------|--------|-------------|
| `presentation/controllers/venue_dashboard.controller.ts` | Modified | Solo `*_UC`; sin `VENUE_STAFF_REPOSITORY` |
| `presentation/composition/venue_dashboard.composition.ts` | Modified | Export `ASSERT_VENUE_STAFF_UC`; sin export repo |
| `application/use_cases/assert_venue_staff_access.use_case.ts` | New | P1 |
| `application/services/*` | Removed/Moved | P5 → UC o domain |
| `infrastructure/adapters/*_mapper.ts` | New/Modified | Piloto P4 |
| `domain/validation/`, `infrastructure/db/`, etc. | Removed | P3 |
| `services/api/ARCHITECTURE.md` | Modified | P2, P4, P6 |
| `openspec/changes/api-architecture-refactor/*.md` | Modified | Estado post-olas |

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Regresión 403/200 en dashboard | Med | Tests unitarios UC + contract tests venues |
| Scope creep mapper total | High | Solo 2 adapters piloto; resto documentado |
| ESLint export-repo rompe otros controllers | Low | Auditar grep `export.*REPOSITORY` antes de regla |
| P5 rompe torneos/reservas | Med | TDD Red-Green en PR2 |

---

## Rollback plan

| Nivel | Acción |
|-------|--------|
| PR individual | Revert merge; restaurar export `VENUE_STAFF_REPOSITORY` si PR1 |
| Wave 7 incompleta | Mantener PR1 (P1) aunque se pospongan P4–P6 |
| Docs | Revert commit docs sin impacto runtime |
| DB | Sin migraciones en Wave 7 |

---

## Dependencies

- Olas 0–6 completadas (`tasks.md` checkpoints ✓)
- Gate MCP Wave 0+1 cumplido para producto hijo
- Orden SDD: **`sdd-spec`** + **`sdd-design`** en paralelo → `sdd-tasks` → `sdd-apply`

---

## Success criteria (verificables)

- [ ] `venue_dashboard.controller.ts`: 0 imports de `VENUE_STAFF_REPOSITORY` / ports; 5 handlers usan `ASSERT_VENUE_STAFF_UC` (o UC de negocio con auth integrada si se elige B con spec explícita)
- [ ] `rg "export.*VENUE_STAFF_REPOSITORY" presentation/composition` → 0 en `venue_dashboard.composition.ts`
- [ ] `application/services/*.service.ts` → 0 archivos
- [ ] Carpetas P3 eliminadas o listadas como prohibidas en ARCHITECTURE
- [ ] ARCHITECTURE.md: sin referencia a 9 god services / 15 repos función como AS-IS
- [ ] `npm run typecheck && npm run lint && npm test` verde en `services/api`
- [ ] `verify-report.md` Wave 7 firmado; programa listo para archive

---

## Child changes (sin cambio)

| Change | Relación |
|--------|----------|
| `payment-domain-refactor` | Wave 1 — cerrado |
| `multi-currency-payments` | Desbloqueado post gate; no parte de Wave 7 |

---

## Next steps SDD

1. **`sdd-spec`** — deltas `venue-staff-authorization-uc`, `api-architecture-closure`
2. **`sdd-design`** — secuencia PR1, firma UC, convención mapper/DI
3. **`sdd-tasks`** — W7-PR1…PR6
4. **`sdd-apply`** → **`sdd-verify`** → **`sdd-archive`**
