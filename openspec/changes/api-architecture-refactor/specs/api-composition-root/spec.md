# Capability: api-composition-root

**Programa:** `api-architecture-refactor`  
**Alcance:** `services/api/src/presentation/composition/` — único composition root por feature

## Purpose

Centralizar inyección de dependencias en `presentation/composition/*.composition.ts` para que controllers permanezcan skinny y no dupliquen wiring Prisma/repos (anti-patrón `bookings.controller.ts`).

## Requirements

### Requirement: Single composition root per HTTP feature

Each feature exposed via HTTP MUST wire dependencies in exactly one file under `src/presentation/composition/{feature}.composition.ts`. Controllers MUST import use case instances or factory exports from that file only (e.g. `confirmTransactionUC`), not construct adapters inline.

#### Scenario: Bookings uses orphan composition file

- GIVEN `bookings.composition.ts` exists but `bookings.controller.ts` re-implements the same wiring (AS-IS)
- WHEN Wave 2 completes for Booking BC
- THEN `bookings.controller.ts` MUST import `*_UC` only from `bookings.composition.ts`
- AND duplicate `PRISMA` / lazy singleton blocks in the controller MUST be removed

#### Scenario: Matches gold pattern

- GIVEN `matches.composition.ts` exporting wired use cases
- WHEN `matches.controller.ts` handles a request
- THEN the controller MUST call `await someMatchUC.execute(dto)` without importing `infrastructure/`

---

### Requirement: Controllers are skinny gateways

Controllers under `presentation/controllers/` MUST: (1) extract/validate input via presentation layer, (2) call one use case, (3) map result to HTTP. They MUST NOT contain repository instantiation, Prisma client creation, or business rules.

#### Scenario: Transaction receipts reference

- GIVEN `transaction_receipts.controller.ts` and `transaction_receipts.composition.ts`
- WHEN auditing a new controller
- THEN its structure SHOULD match receipts: no infra imports, single UC call per action

#### Scenario: Monetization anti-pattern resolved in Wave 1

- GIVEN `monetization.controller.ts` mixing `monetization.service.ts` and use cases (AS-IS)
- WHEN Wave 1 (`payment-domain-refactor`) closes
- THEN controller MUST delegate exclusively to use cases exported from `monetization.composition.ts`
- AND `monetization.service.ts` MUST have zero imports from controllers

---

### Requirement: Composition wires ports to adapters only

Files in `presentation/composition/` MAY import `infrastructure/adapters/`, `infrastructure/persistence/`, and `domain/ports/`. They MUST instantiate concrete adapters and inject them into use case constructors. Application and domain layers MUST NOT be constructed with Prisma inside controllers.

#### Scenario: Confirm payment wiring

- GIVEN `ConfirmManualPaymentUseCase` requiring `TransactionRepository` port
- WHEN `monetization.composition.ts` is built in Wave 1
- THEN composition MUST bind `PrismaTransactionAdapter` (or equivalent) to the port and export `confirmManualPaymentUC`

---

### Requirement: Debt controller inventory closed by wave

The nine controllers listed in exploration §7 MUST migrate to composition-only DI before programme completion:

| Controller | Target wave |
|------------|-------------|
| `bookings.controller.ts` | 2 |
| `reservations.controller.ts` | 2 |
| `venues.controller.ts` | 2 |
| `venue_dashboard.controller.ts` | 1 + 2 |
| `list_venue_matches.controller.ts` | 2 |
| `court_pricing.controller.ts` | 2 |
| `tournaments.controller.ts` | 3 |
| `user_search.controller.ts` | 4 |
| `americano.controller.ts` | 3 |

(`monetization.controller.ts` — Wave 1.)

#### Scenario: Wave 2 gate for booking controllers

- GIVEN Wave 2 marked complete in `tasks.md`
- WHEN grepping `presentation/controllers/bookings.controller.ts` for `infrastructure/`
- THEN zero matches MUST be found

#### Scenario: Programme completion

- GIVEN Wave 6 complete
- WHEN static analysis scans all `presentation/controllers/*.ts`
- THEN no file MUST import from `infrastructure/` except documented exceptions (none allowed at programme end)

---

### Requirement: New endpoints MUST ship with composition file

Any new HTTP endpoint merged after Wave 0 MUST include a corresponding `*.composition.ts` entry; PRs without composition wiring MUST NOT merge.

#### Scenario: New venue feature endpoint

- GIVEN a PR adding `POST /api/v1/venues/:id/foo`
- WHEN review runs
- THEN PR MUST add or extend `venues.composition.ts` (or feature-specific composition) and controller MUST not wire Prisma inline
