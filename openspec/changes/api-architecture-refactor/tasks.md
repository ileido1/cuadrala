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

---

## DAG global (olas)

```text
Wave 0 (W0-PR1→PR6)
    └── Wave 1 payment-domain-refactor (R1→R6) ── GATE MCP
            ├── Wave 2 Booking/Venue
            ├── Wave 3 Match/Tournament
            ├── Wave 4 Identity
            ├── Wave 5 Social
            └── Wave 6 Platform
```

**Dependencias clave:** W0-PR3 antes W0-PR4 (money antes mappers futuros). W0-PR2 warn antes W0-PR6 error. Wave 1 **bloqueada** hasta W0-PR6 verde. MCP **bloqueado** hasta Wave 0 + Wave 1.

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
| Wave 1 integración | `TEST_DATABASE_URL=... npm test` (monetization + confirm/sync) |
| Post schema MCP | `npx prisma generate` antes de typecheck |

---

## Referencias

| Artefacto | Ruta |
|-----------|------|
| Proposal | `openspec/changes/api-architecture-refactor/proposal.md` |
| Spec | `openspec/changes/api-architecture-refactor/spec.md` |
| Design §7 Wave 0 | `openspec/changes/api-architecture-refactor/design.md` |
| Child Wave 1 | `openspec/changes/payment-domain-refactor/exploration.md` |
| MCP (bloqueado) | `openspec/changes/multi-currency-payments/proposal.md` |

**Next SDD phase:** `sdd-apply` — ejecutar **W0-PR1** (unidad más pequeña, base `main`).
