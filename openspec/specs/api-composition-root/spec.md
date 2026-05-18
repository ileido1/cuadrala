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

---

## Wave 7 — ADDED Requirements

### Requirement: Unified Prisma client injection in composition (P6)

Every `presentation/composition/*.composition.ts` file that instantiates Prisma-backed adapters MUST obtain a single Prisma client from the canonical module `infrastructure/prisma_client.ts` (`PRISMA` export or `getPrismaClient()`). Adapters MUST receive that client via constructor argument. Compositions MUST NOT rely on adapters that construct their own hidden `PrismaClient` singleton when a shared client is available.

(Previously: mixed patterns — some compositions used `new PrismaXAdapter()` without args, others passed `PRISMA` explicitly.)

#### Scenario: Gold composition transaction_receipts

- GIVEN `transaction_receipts.composition.ts` as reference implementation
- WHEN Wave 7 PR5 completes
- THEN all Prisma adapters in that file MUST be constructed as `new Prisma*(PRISMA)`
- AND `PRISMA` MUST be imported once from `infrastructure/prisma_client.js`

#### Scenario: Gold composition matches

- GIVEN `matches.composition.ts` with multiple Prisma adapters
- WHEN Wave 7 PR5 completes
- THEN every `new Prisma*Adapter` in that composition MUST receive the same `PRISMA` instance

#### Scenario: Gold composition venue_dashboard

- GIVEN `venue_dashboard.composition.ts` after PR1 and PR5
- WHEN adapters for analytics, venue, and staff are wired
- THEN staff adapter used by `ASSERT_VENUE_STAFF_UC` MUST use explicit `PRISMA` injection per unified pattern

#### Scenario: New composition after Wave 7

- GIVEN a new `*.composition.ts` added post-programme
- WHEN it wires Prisma persistence
- THEN review MUST reject `new PrismaFooAdapter()` with zero constructor args unless adapter is documented as non-Prisma

---

### Requirement: Assert venue staff UC exported from dashboard composition (P1)

`venue_dashboard.composition.ts` MUST export `ASSERT_VENUE_STAFF_UC` as the sole staff-authorization entry point for dashboard controllers, wired with `VenueStaffRepository` adapter internally.

#### Scenario: Dashboard controller wiring

- GIVEN `venue_dashboard.controller.ts` handlers
- WHEN they enforce staff access
- THEN they MUST call `ASSERT_VENUE_STAFF_UC.executeSV(actorUserId, venueId)` before business use cases
- AND composition MUST NOT export the staff repository to the controller
