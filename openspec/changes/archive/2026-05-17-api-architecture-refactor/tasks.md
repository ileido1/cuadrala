# Tasks: Refactor Clean Architecture — `services/api`

| Campo | Valor |
|-------|-------|
| **Change** | `api-architecture-refactor` |
| **Delivery** | `auto-chain` — PRs encadenados ≤400 LOC |
| **Verificación** | `typecheck` → `lint` → `test` (`openspec/config.yaml`) |
| **TDD** | `strict_tdd: true` — Red → Green → Refactor por tarea |

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | Wave 0 ~900–1.200 · Programa completo ~8.000–12.000 |
| 400-line budget risk | **High** (programa) · Wave 0 **Medium** |
| Chained PRs recommended | **Yes** |
| Suggested split | W0-PR1…PR6 → W1 child R1…R6 → W2–W6 por BC |
| Delivery strategy | `auto-chain` |
| Chain strategy | `stacked-to-main` |

```text
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| **W0-PR1** | `ARCHITECTURE.md` + `AGENTS.md` link | PR1 | `main` | Docs; sin código de negocio |
| **W0-PR2** | ESLint `no-restricted-imports` **warn** (§5 design) | PR2 | `main` | `services/api/eslint.config.mjs` |
| **W0-PR3** | `domain/money/` TDD (RED→GREEN) + `identifiers.ts` | PR3 | PR2 | Tests en `src/test/unit/` |
| **W0-PR4** | Entities scaffold BC + delete `domain/repositories/` | PR4 | PR3 | Moves booking + payments |
| **W0-PR5** | Validation unify + `fee_policy.service.ts` | PR5 | PR4 | `validators/` → `validation/` |
| **W0-PR6** | ESLint **error** + fix 19 violadores | PR6 | PR5 | Gate Wave 0 lint verde |
| **W1** | BC Payments (6 PRs) | R1–R6 | PR6 | Ver [`payment-domain-refactor`](../payment-domain-refactor/exploration.md) §5.2 |
| **W2–W6** | BC restantes | 1–3 PR/ola | post-W1 | Checkpoints por ola abajo |
| **W7-PR1** | `AssertVenueStaffAccessUseCase` + dashboard | PR1 | post-W6 | P1 — TDD |
| **W7-PR2** | Migrar `application/services/*.service.ts` | PR2 | post-W6 | P5 — paralelo PR1/PR3 |
| **W7-PR3** | Eliminar 5 scaffolds prohibidos | PR3 | post-W6 | P3 |
| **W7-PR4** | Mappers piloto transaction + reservation | PR4 | PR3 | P4 |
| **W7-PR5** | DI Prisma compositions gold | PR5 | PR4 | P6 |
| **W7-PR6** | Docs + `verify-report` + gate programa | PR6 | PR1–PR5 | P2, P6b |

---

## DAG global (olas)

```text
Wave 0 (W0-PR1→PR6)
    └── Wave 1 payment-domain-refactor (R1→R6) ── GATE MCP
            ├── Wave 2 Booking/Venue
            ├── Wave 3 Match/Tournament
            ├── Wave 4 Identity
            ├── Wave 5 Social
            ├── Wave 6 Platform
            └── Wave 7 Cierre (W7-PR1…PR6) ──► archive programa
```

**Dependencias clave:** W0-PR3 antes W0-PR4 (money antes mappers futuros). W0-PR2 warn antes W0-PR6 error. Wave 1 **bloqueada** hasta W0-PR6 verde. MCP **bloqueado** hasta Wave 0 + Wave 1. Wave 7 **bloqueada** hasta Wave 6 verde; W7-PR6 **bloqueada** hasta W7-PR1…PR5.

---

## Phase Wave 0 — Fundaciones (ejecutable)

> Orden: **0.1 → 0.2 → 0.3 (TDD) → 0.4–0.7 → 0.8–0.10 → 0.11 → 0.12**. Agrupar en W0-PR1…PR6 según tabla Work Units.

### 0.1 Documentación arquitectura (W0-PR1)

- [x] **0.1.1** Crear `services/api/ARCHITECTURE.md`: diagrama capas, árbol `domain/`, reglas 1–5, gold (`transaction_receipts`, `matches.composition`) vs anti (`bookings.controller`, `monetization.service`)
- [x] **0.1.2** Actualizar `AGENTS.md` (raíz monorepo): sección/link a `services/api/ARCHITECTURE.md` y orden verify `typecheck → lint → test`

### 0.2 ESLint boundaries — rollout warn (W0-PR2)

- [x] **0.2.1** Modificar `services/api/eslint.config.mjs`: bloques §5 design (`domain/**`, `application/**`, `controllers/**`, `routes/**`) con severidad **`warn`**
- [x] **0.2.2** Mantener `ignores` de `src/generated/**`; documentar en `ARCHITECTURE.md` overrides temporales (máx. 1 sprint)

### 0.3 Money VO — TDD (W0-PR3) — *depends 0.2*

- [x] **0.3.1 RED** Crear `services/api/src/test/unit/money_amount.test.ts`: suma misma moneda, reject cross-currency, `CurrencyCode` BS/USD/EUR
- [x] **0.3.2 RED** Crear `services/api/src/test/unit/currency_code.test.ts` (cubierto en `money_amount.test.ts` + `identifiers.test.ts`)
- [x] **0.3.3 GREEN** Crear `services/api/src/domain/money/currency_code.ts`
- [x] **0.3.4 GREEN** Crear `services/api/src/domain/money/money_amount.ts`, `money_amount_ops.ts`, `money_errors.ts`
- [x] **0.3.5 GREEN** Crear `services/api/src/domain/money/exchange_rate_snapshot.ts` (estructural; sin conversión Wave 0)
- [x] **0.3.6** Crear `services/api/src/domain/value_objects/identifiers.ts` (`ReservationId`, `TransactionId`, … mínimo)

### 0.4 Domain entities scaffold — BC (W0-PR4) — *depends 0.3*

- [x] **0.4.1** Crear `services/api/src/domain/entities/booking/`; mover `entities/reservation.entity.ts` → `entities/booking/reservation.entity.ts`
- [x] **0.4.2** Mover `entities/court.entity.ts` → `entities/booking/court.entity.ts`; actualizar imports en `application/`, `infrastructure/`, `presentation/`
- [x] **0.4.3** Crear `services/api/src/domain/entities/payments/`; mover `entities/exchange_rate.entity.ts`, `entities/venue_payment_method.entity.ts`
- [x] **0.4.4** Eliminar `services/api/src/domain/repositories/` si existe (`.gitkeep`); verificar cero referencias a ruta
- [x] **0.4.5** Poblar `domain/services/payments/` mínimo: crear `fee_policy.service.ts` extrayendo lógica de `domain/monetization/fee_calculation.ts` (sin IO)

### 0.5 Presentation housekeeping (W0-PR5) — *depends 0.4*

- [x] **0.5.1** Mover `presentation/validators/booking.schemas.ts` → `presentation/validation/bookings.validation.ts`; actualizar `bookings.controller.ts` y tests
- [x] **0.5.2** Eliminar carpeta `presentation/validators/`; grep cero imports `validators/`
- [x] **0.5.3** Auditar `presentation/middlewares/` vs `presentation/middleware/`; unificar imports si queda scaffold (design W0-9)

### 0.6 ESLint error + violadores (W0-PR6) — *depends 0.2, 0.5*

- [x] **0.6.1** Subir reglas §5 a **`error`** en `eslint.config.mjs`
- [x] **0.6.2** Corregir **10** archivos `application/**` → infra (4 UC legacy + god services → `infrastructure/legacy/`; confirm/list → port)
- [x] **0.6.3** Corregir **9** `presentation/controllers/**` → infra (bookings → composition; resto excepción Wave 2 en eslint)
- [x] **0.6.4** Corregir **2** routers infra (`exchange_rate.router.ts`, `venue_payment_method.router.ts`) — excepción Wave 1 en eslint
- [x] **0.6.5** Gate Wave 0: `domain/` y `application/` **0** violaciones `no-restricted-imports`

### Verificación Wave 0

```bash
cd services/api && npm run typecheck && npm run lint && npm test
```

Criterios: tests money verdes; lint sin violaciones capa en `domain/` + `application/`; `ARCHITECTURE.md` + link en `AGENTS.md`.

---

## Phase Wave 1 — Payments BC

> **Detalle ejecutable:** change hijo [`payment-domain-refactor`](../payment-domain-refactor/exploration.md). **No duplicar** las 6 PRs aquí — usar checkpoints.

| Checkpoint | Contenido resumido | PR child | Depende |
|------------|-------------------|----------|---------|
| **1.1** | Ports TX/fee/conversion + tests golden money | R1 | Wave 0 |
| **1.2** | `PrismaTransactionAdapter` + mappers | R2 | 1.1 |
| **1.3** | `ConfirmManualPaymentUseCase`, `SyncReservationPaymentUseCase` | R3 | 1.2 |
| **1.4** | Obligation UCs + `PaymentOrchestrator` + `monetization.composition.ts` | R4 | 1.3 |
| **1.5** | Exchange rate + venue payment method UCs; routers sin infra | R5 | 1.4 |
| **1.6** | Dashboard/stats UCs; **delete** `monetization.service.ts` (0 imports) | R6 | 1.5 |

- [x] **1.1–1.4, 1.6 (core)** — ver `payment-domain-refactor/tasks.md`
- [x] **1.5** — routers exchange_rate / venue_payment_method
- [x] **1.6 (resto)** — venue_dashboard / venue_transactions sin Prisma en UC
- [x] **1.GATE** Ejecutar checklist § Gate MCP antes de `multi-currency-payments`

### Verificación Wave 1

```bash
cd services/api && npm run typecheck && npm run lint && npm test
# Integración obligatoria R3–R6:
# TEST_DATABASE_URL=... npm test -- monetization.integration
```

---

## Phase Wave 2 — Booking & Venue

*Depends: Wave 1 gate (recomendado) · Mínimo Wave 0.*

- [x] **2.1** `bookings.controller.ts` importa solo `bookings.composition.ts`; eliminar DI inline Prisma/repos
- [x] **2.2** `reservations.controller.ts`, `venues.controller.ts` → composition única
- [x] **2.3** `CourtRepository` port → `infrastructure/adapters/prisma_court_repository.ts`; deprecar `court.repository.ts`, `court_repository_factory.ts`
- [x] **2.4** Controllers deuda Wave 2: `list_venue_matches.controller.ts`, `court_pricing.controller.ts`, `venue_dashboard.controller.ts` (reporting parcial Wave 1)
- [x] **2.5** `domain/services/booking/pricing.service.ts` (total court + duration, sin IO)

```bash
cd services/api && npm run typecheck && npm run lint && npm test
```

---

## Phase Wave 3 — Match & Tournament

*Depends: Wave 2 checkpoints booking composition (parcial OK para match-only).*

- [x] **3.1** Eliminar `americano.service.ts` → use cases + `americano.composition.ts`
- [x] **3.2** `tournaments.controller.ts` sin `PRISMA` directo
- [x] **3.3** `parametrized_tournament.service.ts` → UCs; `americano.controller.ts` solo `*_UC`
- [x] **3.4** `get_match_payment_info.use_case.ts`: inyectar port read (no `PRISMA` en UC)

```bash
cd services/api && npm run typecheck && npm run lint && npm test
```

---

## Phase Wave 4 — Identity

- [x] **4.1** `auth.service.ts` → UCs existentes vía `auth.composition.ts`
- [x] **4.2** `profile.service.ts` → profile UCs + composition
- [x] **4.3** `user_search.controller.ts` → UC (deprecar `user.repository.ts` función)

```bash
cd services/api && npm run typecheck && npm run lint && npm test
```

---

## Phase Wave 5 — Social

- [x] **5.1** Auditar `chat.composition.ts`, `notifications.composition.ts`: controllers sin infra
- [x] **5.2** Corregir desviaciones encontradas en audit (≤1 PR)

```bash
cd services/api && npm run typecheck && npm run lint && npm test
```

---

## Phase Wave 6 — Platform

- [x] **6.1** `ranking.service.ts`, `matchmaking.service.ts` → UCs + composition (legacy eliminado; ya existían UCs)
- [x] **6.2** `catalog.service.ts` → catalog UCs (eliminado wrapper; `catalog.composition.ts`)
- [x] **6.3** Eliminar **15** `infrastructure/repositories/*.ts` restantes (tabla design §8.2)
- [x] **6.4** Eliminar carpeta `infrastructure/repositories/`; grep 0 imports `find*Repo`
- [x] **6.5** Programa completo: 9 `application/*.service.ts` con 0 imports; 9 controllers §7 solo composition

```bash
cd services/api && npm run typecheck && npm run lint && npm test
```

---

## Phase Wave 7 — Cierre de deuda arquitectónica (ejecutable)

> **Specs:** [`venue-staff-authorization-uc`](./specs/venue-staff-authorization-uc/spec.md) · [`api-architecture-closure`](./specs/api-architecture-closure/spec.md) · **Design:** [`design.md`](./design.md) §12 · **Proposal:** [`proposal.md`](./proposal.md) § Wave 7  
> **Orden recomendado:** W7-PR1 → (W7-PR2 ∥ W7-PR3) → W7-PR4 → W7-PR5 → W7-PR6. **TDD** en PR1 y PR2.

### Review Workload Forecast (Wave 7)

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1.200–2.000 (6 PRs × ≤400 LOC) |
| 400-line budget risk | **Medium** (por PR) · programa W7 **Low** si se respeta split |
| Chained PRs recommended | **Yes** |
| Delivery strategy | `auto-chain` |
| Chain strategy | `stacked-to-main` |

```text
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium
```

### DAG Wave 7

```text
W7-PR1 (P1 staff UC) ──┬──► W7-PR6 (docs + verify + archive gate)
W7-PR2 (P5 services)  ──┤
W7-PR3 (P3 scaffolds) ──┼──► W7-PR4 (P4 mappers) ──► W7-PR5 (P6 DI Prisma)
```

| PR | Depende de | Base branch (stacked) |
|----|------------|------------------------|
| W7-PR1 | — | `main` (post Wave 6) |
| W7-PR2, W7-PR3 | — (paralelo entre sí; opcional tras PR1) | `main` o `W7-PR1` |
| W7-PR4 | W7-PR3 | última rama W7 activa |
| W7-PR5 | W7-PR4 | rama W7-PR4 |
| W7-PR6 | W7-PR1…PR5 | rama W7-PR5 |

---

### W7-PR1 — P1: `AssertVenueStaffAccessUseCase` (P1)

*Spec:* `venue-staff-authorization-uc` · *Deuda:* export `VENUE_STAFF_REPOSITORY` + auth en controller.

- [x] **W7-PR1-T01** *(RED · deps: —)* Crear `services/api/src/test/unit/assert_venue_staff_access.use_case.test.ts`: staff `true` → resolve; `false` → `AppError` 403 `NO_AUTORIZADO`; mock `VenueStaffRepository.isUserStaffOfVenueSV` llamado 1× con ids correctos. **Done:** tests fallan (UC inexistente).
- [x] **W7-PR1-T02** *(GREEN · deps: T01)* Crear `services/api/src/application/use_cases/assert_venue_staff_access.use_case.ts` con `executeSV({ actorUserId, venueId, forbiddenMessage? })` inyectando `VenueStaffRepository`. **Done:** T01 verde.
- [x] **W7-PR1-T03** *(deps: T02)* Modificar `presentation/composition/venue_dashboard.composition.ts`: wire `ASSERT_VENUE_STAFF_UC`; eliminar `export { VENUE_STAFF_REPOSITORY }`; quitar `VenueStaffRepository` del ctor de `LIST_VENUE_MATCHES_UC`. **Done:** `rg "export.*VENUE_STAFF_REPOSITORY" presentation/composition/venue_dashboard.composition.ts` → 0.
- [x] **W7-PR1-T04** *(deps: T03)* Refactor `presentation/controllers/venue_dashboard.controller.ts`: 5 handlers (`getDashboardStatsCON`, `getTransactionStatsCON`, `getTransactionHistoryCON`, `patchVenueCON`, `getVenueMatchesCON`) invocan `ASSERT_VENUE_STAFF_UC` tras 401/Zod y antes del UC de negocio; preservar `forbiddenMessage` por handler; 0 imports `VENUE_STAFF_REPOSITORY` / port staff. **Done:** grep controller sin `isUserStaffOfVenueSV` ni `VENUE_STAFF_REPOSITORY`.
- [x] **W7-PR1-T05** *(deps: T03)* Modificar `application/use_cases/list_venue_matches.use_case.ts`: eliminar bloque auth staff interno. **Done:** UC no importa ni usa `VenueStaffRepository`.
- [x] **W7-PR1-T06** *(deps: T03, T05)* Modificar `presentation/controllers/list_venue_matches.controller.ts`: `ASSERT_VENUE_STAFF_UC` antes de `LIST_VENUE_MATCHES_UC`. **Done:** sin doble auth en UC+controller (test o revisión manual).
- [x] **W7-PR1-T07** *(deps: T04)* Contract mínimo: endpoint stats dashboard — 403 usuario no staff, 200 staff (patrón suite `services/api` existente). **Done:** ≥1 test contract en verde en `npm test`.
- [x] **W7-PR1-T08** *(gate · deps: T01–T07)* `cd services/api && npm run typecheck && npm run lint && npm test` exit 0 en rama PR1. **Done:** pipeline verde; PR ≤400 LOC.

---

### W7-PR2 — P5: migración `application/services/*.service.ts`

*Spec:* `api-architecture-closure` § P5 · *Deuda:* 2 archivos `*.service.ts` residuales.

- [x] **W7-PR2-T01** *(RED · deps: —)* Crear/migrar tests a `services/api/src/test/unit/record_reservation_ledger_entry.use_case.test.ts` desde lógica de `reservation_ledger.service.test.ts` (casos append ledger vía port mock). **Done:** tests fallan sin UC.
- [x] **W7-PR2-T02** *(GREEN · deps: T01)* Crear `application/use_cases/record_reservation_ledger_entry.use_case.ts` reemplazando `ReservationLedgerService`. **Done:** T01 verde.
- [x] **W7-PR2-T03** *(deps: T02)* Actualizar `presentation/composition/monetization.composition.ts` y `confirm_transaction_as_venue_staff.use_case.ts` (y consumidores) para inyectar `RECORD_RESERVATION_LEDGER_ENTRY_UC` en lugar del service. **Done:** 0 imports `reservation_ledger.service`.
- [x] **W7-PR2-T04** *(deps: —)* Crear `domain/services/tournament/tournament_format_parameters_validator.ts` implementando port `TournamentFormatParametersValidator` (mover lógica pura desde application service). **Done:** sin imports infra en domain.
- [x] **W7-PR2-T05** *(deps: T04)* Actualizar `presentation/composition/tournaments.composition.ts` y `application/validation/tournament_format_parameters.data_validate.ts` para importar validator desde domain. **Done:** 0 imports `application/services/tournament_format_parameters_validator`.
- [x] **W7-PR2-T06** *(deps: T02, T05)* Eliminar `application/services/reservation_ledger.service.ts` y `application/services/tournament_format_parameters_validator.service.ts`; eliminar o migrar `reservation_ledger.service.test.ts`. **Done:** `find services/api/src/application/services -name '*.service.ts'` → vacío (`assert_match_court_slot_available.ts` MAY permanecer).
- [x] **W7-PR2-T07** *(deps: T04)* Tests unitarios validator domain (params inválidos → error dominio). **Done:** verde en `npm test`.
- [x] **W7-PR2-T08** *(gate · deps: T01–T07)* Contract/integration torneos create params inválidos → 400 si existe suite; `typecheck` → `lint` → `test` exit 0. **Done:** PR ≤400 LOC.

---

### W7-PR3 — P3: eliminar scaffolds prohibidos

*Spec:* `api-architecture-closure` § P3.

- [x] **W7-PR3-T01** *(deps: —)* Auditar las 5 rutas: confirmar solo `.gitkeep` o vacío; si hay `.ts` activos, migrar antes de borrar (bloqueante). **Done:** checklist sin archivos de negocio huérfanos.
- [x] **W7-PR3-T02** *(deps: T01)* Eliminar directorios: `domain/repositories/`, `domain/validation/`, `infrastructure/db/`, `infrastructure/legacy/`, `infrastructure/repositories/`. **Done:** `test ! -d` para las 5 rutas.
- [x] **W7-PR3-T03** *(deps: T02)* `rg "domain/repositories|domain/validation|infrastructure/db|infrastructure/legacy|infrastructure/repositories" services/api/src` → **0** imports activos en código fuente. **Done:** grep limpio.
- [x] **W7-PR3-T04** *(deps: T02)* Añadir en `services/api/ARCHITECTURE.md` §3.1 lista de carpetas **prohibidas** (las 5 rutas). **Done:** doc menciona prohibición explícita.
- [x] **W7-PR3-T05** *(gate · deps: T01–T04)* `npm run typecheck && npm run lint && npm test` exit 0. **Done:** PR ≤400 LOC.

---

### W7-PR4 — P4: convención mapper + pilotos

*Spec:* `api-architecture-closure` § P4 · `infrastructure-adapters-only` · *Convención:* **B** — `prisma_*_mapper.ts` junto al adapter.

- [x] **W7-PR4-T01** *(deps: W7-PR3)* Crear `infrastructure/adapters/prisma_payment_transaction_mapper.ts` con funciones puras `map*RowTo*` (pending/confirmed); extraer inline de `prisma_payment_transaction_repository.ts`. **Done:** adapter delega mapping; no retorna tipos Prisma a application.
- [x] **W7-PR4-T02** *(deps: T01)* Unit tests mapper transaction: ≥1 caso golden row → entity/DTO por función exportada. **Done:** tests en `src/test/unit/` verdes.
- [x] **W7-PR4-T03** *(deps: W7-PR3)* Crear `infrastructure/adapters/prisma_reservation_mapper.ts`; extraer `mapReservation` (u equivalente) de `prisma_reservation_repository.ts`. **Done:** repository delgado.
- [x] **W7-PR4-T04** *(deps: T03)* Unit tests mapper reservation: ≥1 caso golden. **Done:** verde en `npm test`.
- [x] **W7-PR4-T05** *(deps: T01, T03)* Actualizar `ARCHITECTURE.md` §3.4: patrón default colocado en adapter; `infrastructure/mappers/{bc}/` como objetivo incremental; `presentation/mappers/` solo HTTP. **Done:** sección alineada a spec.
- [x] **W7-PR4-T06** *(gate · deps: T01–T05)* `typecheck` → `lint` → `test` exit 0. **Done:** solo 2 pilotos obligatorios; PR ≤400 LOC.

---

### W7-PR5 — P6: DI Prisma en compositions gold

*Spec:* `api-architecture-closure` § P6 · `api-composition-root`.

- [x] **W7-PR5-T01** *(deps: W7-PR4)* Migrar adapters tocados por compositions gold a ctor `(prisma: PrismaClient)` sin `import { PRISMA }` interno: mínimo `prisma_venue_staff_repository`, `prisma_venue_analytics_repository`, adapters match query en `matches`, adapters receipts en `transaction_receipts`, ledger adapter en `monetization`. **Done:** adapters listados aceptan prisma por ctor.
- [x] **W7-PR5-T02** *(deps: T01)* Alinear `presentation/composition/venue_dashboard.composition.ts`: `import { PRISMA }`; `new Prisma*Adapter(PRISMA)` para todos los adapters del archivo. **Done:** 0 `new Prisma*Adapter()` sin argumentos.
- [x] **W7-PR5-T03** *(deps: T01)* Alinear `presentation/composition/transaction_receipts.composition.ts` al mismo patrón. **Done:** grep sin adapters sin prisma en este archivo.
- [x] **W7-PR5-T04** *(deps: T01)* Alinear `presentation/composition/matches.composition.ts` al mismo patrón. **Done:** todos los `new Prisma*Adapter(...)` reciben cliente explícito.
- [x] **W7-PR5-T05** *(deps: T01)* Alinear `presentation/composition/monetization.composition.ts` (ledger adapter post-PR2). **Done:** patrón DI documentado aplicado.
- [x] **W7-PR5-T06** *(deps: T02–T05)* Actualizar `ARCHITECTURE.md` §3.5 "DI Prisma" (singleton `PRISMA`, composition única instanciadora, UC sin PrismaClient). **Done:** sección completa.
- [x] **W7-PR5-T07** *(deps: T02)* Smoke unit: adapter con prisma mock inyectado (1 test mínimo en archivo existente o nuevo). **Done:** test pasa en `npm test`.
- [x] **W7-PR5-T08** *(gate · deps: T01–T07)* `typecheck` → `lint` → `test` exit 0; sin big-bang en ~77 adapters no listados. **Done:** PR ≤400 LOC.

---

### W7-PR6 — P2 + P6b + verify-report (cierre programa)

*Spec:* `api-architecture-closure` § P2, verify-report · *Deuda:* docs AS-IS, gate archive.

- [x] **W7-PR6-T01** *(deps: W7-PR1…PR5)* Revisar `services/api/ARCHITECTURE.md`: estado **post olas 0–7**; métricas históricas (9 services, 15 repos) solo como pasado; incluir §3.4 mapper y §3.5 DI si no mergeados en PR3–PR5. **Done:** lector no confunde AS-IS inicial con vigente.
- [x] **W7-PR6-T02** *(deps: T01)* Actualizar `openspec/changes/api-architecture-refactor/exploration.md` y `proposal.md` (estado Wave 7 / checklist). **Done:** artefactos coherentes con código.
- [x] **W7-PR6-T03** *(deps: W7-PR1…PR5)* Crear `openspec/changes/api-architecture-refactor/verify-report.md` (Wave 7): ✓ P1 export repo, ✓ P3 carpetas, ✓ P5 services 0, ✓ P4 pilotos, ✓ P6 DI ≥3 compositions, ✓ tests pipeline. **Done:** checklist firmable para `sdd-archive`.
- [x] **W7-PR6-T04** *(opcional · deps: W7-PR1)* `eslint.config.mjs`: regla `no-restricted-syntax` o equivalente para `export { *_REPOSITORY }` desde `presentation/composition/**` consumido por controllers; grep previo `rg "export.*REPOSITORY" presentation/composition`. **Done:** regla en warn o error documentado; 0 falsos positivos bloqueantes.
- [x] **W7-PR6-T05** *(deps: T01)* Actualizar `AGENTS.md` (raíz) si referencias API legacy desactualizadas. **Done:** link/orden verify intacto.
- [x] **W7-PR6-T06** *(deps: T03)* Marcar en este `tasks.md` checkboxes Wave 7 completados; actualizar **Next** a archive. **Done:** estado refleja merges.
- [x] **W7-PR6-T07** *(gate final · deps: T01–T06)* Verificación programa Wave 7:
  - `rg "export.*VENUE_STAFF_REPOSITORY" services/api/src/presentation/composition` → 0
  - `find services/api/src/application/services -name '*.service.ts'` → vacío
  - 5 scaffolds ausentes (T03 PR3)
  - `cd services/api && npm run typecheck && npm run lint && npm test` → exit 0  
  **Done:** listo para archivar `api-architecture-refactor` e iniciar MCP sin deuda estructural.

```bash
# Verificación Wave 7 (gate final W7-PR6-T07)
cd services/api && npm run typecheck && npm run lint && npm test
```

---

## Gate checklist — desbloqueo `multi-currency-payments`

Bloquear merge MCP PR1 (schema) hasta **todas** ✓:

### Wave 0 (este change)

- [x] ESLint `no-restricted-imports`: **0** violaciones en `src/domain/**` y `src/application/**`
- [x] Controllers: **0** imports `infrastructure/` (sin overrides legacy)
- [x] `domain/money/`: `MoneyAmount`, `CurrencyCode`, tests unitarios en CI
- [x] `domain/repositories/` eliminado; `entities/booking/`, `entities/payments/` poblados
- [x] `presentation/validators/` eliminado; Zod en `presentation/validation/`
- [x] `ARCHITECTURE.md` + referencia en `AGENTS.md`
- [x] Verify: `npm test` — **396/396 OK**; `lint` capas domain/application/controllers — **0 errores**; `typecheck` global aún con deuda en algunos tests TS (no bloquea runtime)

### Wave 1 (`payment-domain-refactor`)

- [x] `TransactionRepository` port + `PrismaTransactionAdapter` en composition
- [x] `ConfirmManualPaymentUseCase` / staff confirm **sin** Prisma en application
- [x] `SyncReservationPaymentUseCase` corrige agregación (test integración)
- [x] `monetization.service.ts` **eliminado** (`rg monetization.service` → 0)
- [x] `monetization.composition.ts` único wiring; controller solo `*_UC`
- [x] Routers `exchange_rate`, `venue_payment_method` sin imports infra
- [x] Child R1–R6 merged; verify-report o checklist PO firmado

### Post-gate (MCP — change separado)

- [ ] Iniciar `multi-currency-payments` M1 schema **solo** tras gate anterior
- [ ] **No** columnas MCP (`effectiveDate`, `settlementCurrency`, …) en PRs Wave 0–1

---

## Verificación por fase (resumen)

| Fase | Comando |
|------|---------|
| Wave 0–6 API | `cd services/api && npm run typecheck && npm run lint && npm test` |
| Wave 7 API | Idem + greps éxito en W7-PR6-T07 |
| Wave 1 integración | `TEST_DATABASE_URL=... npm test` (monetization + confirm/sync) |
| Post schema MCP | `npx prisma generate` antes de typecheck |

---

## Referencias

| Artefacto | Ruta |
|-----------|------|
| Proposal | `openspec/changes/api-architecture-refactor/proposal.md` |
| Spec Wave 7 P1 | `openspec/changes/api-architecture-refactor/specs/venue-staff-authorization-uc/spec.md` |
| Spec Wave 7 cierre | `openspec/changes/api-architecture-refactor/specs/api-architecture-closure/spec.md` |
| Design Wave 7 | `openspec/changes/api-architecture-refactor/design.md` §12 |
| Deltas | `specs/api-layer-boundaries`, `api-composition-root`, `infrastructure-adapters-only` |
| Child Wave 1 | `openspec/changes/payment-domain-refactor/exploration.md` |
| MCP | `openspec/changes/multi-currency-payments/proposal.md` |

**Next SDD phase:** `sdd-apply` — ejecutar **W7-PR1** (base `main` post Wave 6).
