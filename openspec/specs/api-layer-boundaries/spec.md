# Capability: api-layer-boundaries

**Programa:** `api-architecture-refactor`  
**Alcance:** `services/api/src` — reglas de importación por capa (ESLint + CI)

## Purpose

Garantizar la regla de dependencias de Clean Architecture mediante reglas automáticas que fallen el build en violación, evitando regresiones mientras el strangler migra BC por BC.

## Requirements

### Requirement: Domain and application MUST NOT import infrastructure or Prisma

The packages `src/domain/**` and `src/application/**` MUST NOT import from `src/infrastructure/**` or `src/generated/prisma/**`.

#### Scenario: Application file imports Prisma client

- GIVEN a file under `services/api/src/application/`
- WHEN the file contains `import ... from '../../generated/prisma'` or any path under `infrastructure/`
- THEN `npm run lint` in `services/api` MUST exit with non-zero status
- AND CI MUST fail the pull request merge check

#### Scenario: Domain remains pure

- GIVEN a file under `services/api/src/domain/`
- WHEN ESLint analyzes import graph
- THEN zero files MUST resolve imports to `infrastructure/` or `generated/prisma`

---

### Requirement: Presentation controllers MUST NOT import infrastructure

Files under `src/presentation/controllers/**` MUST NOT import `infrastructure/`, repository functions, or `generated/prisma`. They MAY import `presentation/composition/`, `application/`, and `domain/errors`.

#### Scenario: Controller imports repository function

- GIVEN `bookings.controller.ts` (anti-pattern) wiring `PRISMA` or `findBookingRepo` inline
- WHEN a developer adds `import { findXRepo } from '../../infrastructure/repositories/...'`
- THEN ESLint MUST report a violation and `npm run lint` MUST fail

#### Scenario: Gold controller pattern passes lint

- GIVEN `transaction_receipts.controller.ts` importing only `*_UC` from `transaction_receipts.composition.ts`
- WHEN `npm run lint` runs
- THEN no `no-restricted-imports` violation MUST be reported for that file

---

### Requirement: Presentation routes MUST NOT import repositories or adapters

Files under `src/presentation/routes/**` MUST NOT import `infrastructure/repositories/`, `infrastructure/adapters/`, or invoke persistence directly.

#### Scenario: Router calls infra service function

- GIVEN `exchange_rate.router.ts` or `venue_payment_method.router.ts` (AS-IS anti-pattern)
- WHEN refactored, the route file MUST only wire HTTP verb → controller method
- AND `npm run lint` MUST fail if the route imports `infrastructure/`

---

### Requirement: No new application god services

The codebase MUST NOT add new files matching `src/application/*.service.ts` at the application root (excluding existing files until deprecated). New business flows MUST use `application/{bc}/use_cases/`.

#### Scenario: Developer adds monetization-style service

- GIVEN a pull request introducing `src/application/reporting.service.ts`
- WHEN ESLint rule `no-restricted-paths` or project convention check runs (Wave 0+)
- THEN lint or CODEOWNERS review MUST block merge unless classified as temporary strangler with ticket and sunset date

---

### Requirement: ESLint rules active from Wave 0 in CI

From Wave 0 merge onward, `services/api` ESLint configuration MUST include `no-restricted-imports` (or equivalent `eslint-plugin-import` rules) encoding rules 1–4 above. `npm run lint` is a required gate before `npm test` per `AGENTS.md`.

#### Scenario: CI pipeline on clean branch post-Wave-0

- GIVEN Wave 0 merged with ESLint config
- WHEN CI runs `cd services/api && npm run typecheck && npm run lint`
- THEN the job MUST succeed on `main` with zero layer-boundary violations in `domain/` and `application/`

#### Scenario: Temporary override is time-boxed

- GIVEN a team needs `eslint` override for one folder during strangler
- WHEN override is added under `eslint.config` `overrides`
- THEN override MUST include comment with wave ticket and MUST be removed within one sprint (SHOULD NOT exceed 2 weeks calendar)

---

### Requirement: Money operations MUST use MoneyAmount after Wave 0

After Wave 0, any new or touched code in `application/` or `domain/` that represents monetary amounts MUST use `MoneyAmount` from `domain/money/` instead of raw `number` cents fields for business logic (structural rule; JSON/API contract details live in `openspec/specs/multi-currency-payments/`).

#### Scenario: New use case sums payment totals

- GIVEN a new use case in payments BC post-Wave-0
- WHEN it aggregates transaction amounts
- THEN it MUST NOT use `amountTotal * 100` on untyped numbers; it MUST use `MoneyAmount` operations per `money-value-objects` spec

---

## Wave 7 — ADDED Requirements

### Requirement: Composition MUST NOT export repository symbols to controllers (P1 / P6b)

Files under `presentation/composition/*.composition.ts` MUST wire repositories and adapters internally and export only use case instances (or factory functions returning use cases). Controllers MUST NOT import `*_REPOSITORY`, `*_ADAPTER`, or port implementations exported from composition files.

Wave 7 MUST eliminate the anti-pattern in `venue_dashboard.composition.ts` exporting `VENUE_STAFF_REPOSITORY`. An optional ESLint rule MAY enforce `no-restricted-exports` or custom grep in CI for `export { *_REPOSITORY }` / `export const *_REPOSITORY` consumed from `presentation/controllers/`.

(Previously: controllers could import repositories if composition exported them — only forbidden for direct `infrastructure/` imports.)

#### Scenario: Venue dashboard composition post-P1

- GIVEN `venue_dashboard.composition.ts` after Wave 7 PR1
- WHEN `venue_dashboard.controller.ts` imports from composition
- THEN imports MUST be limited to `*_UC` symbols
- AND `VENUE_STAFF_REPOSITORY` MUST NOT be exported from composition

#### Scenario: Optional ESLint blocks new repository exports

- GIVEN Wave 7 enables ESLint rule P6b
- WHEN a PR adds `export { BOOKING_REPOSITORY }` in a composition file for controller use
- THEN `npm run lint` MUST fail
- AND PR MUST refactor to export only `RECORD_BOOKING_UC` (or equivalent)

#### Scenario: Staff check stays in application layer

- GIVEN authorization requires `VenueStaffRepository`
- WHEN dashboard handlers need staff validation
- THEN validation MUST occur via `AssertVenueStaffAccessUseCase` (see `venue-staff-authorization-uc`)
- AND NOT via controller calling `isUserStaffOfVenueSV` on an exported repository
