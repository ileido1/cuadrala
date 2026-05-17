# Capability: presentation-validation-unified

**Programa:** `api-architecture-refactor` (Wave 0)  
**Alcance:** `services/api/src/presentation/validation/`

## Purpose

Unificar validación HTTP en Zod bajo `presentation/validation/`, eliminar carpetas duplicadas (`validators/`) y evitar schemas de request/response en application salvo DTO de dominio puro.

## Requirements

### Requirement: Zod schemas only under presentation/validation

All request/response Zod schemas for HTTP endpoints MUST live in `src/presentation/validation/{feature}.validation.ts` (naming per existing convention `*.validation.ts`). No parallel `presentation/validators/` tree MAY exist after Wave 0.

#### Scenario: Booking schemas migration

- GIVEN `presentation/validators/booking.schemas.ts` (AS-IS duplicate)
- WHEN Wave 0 housekeeping merges
- THEN schemas MUST exist in `presentation/validation/bookings.validation.ts` (or equivalent)
- AND `presentation/validators/` directory MUST be deleted

#### Scenario: Monetization validation location

- GIVEN `monetization.validation.ts` already under `presentation/validation/`
- WHEN a new payment endpoint is added
- THEN its Zod schema MUST be added to the same validation module or sibling `*.validation.ts` in that folder

---

### Requirement: Controllers parse with presentation schemas

Controllers MUST invoke `*.parse` / safeParse on schemas from `presentation/validation/` before calling use cases. Invalid input MUST return HTTP 400 with Spanish user-facing messages per project convention.

#### Scenario: Invalid body before use case

- GIVEN `CONFIRM_TRANSACTION_BODY_SCHEMA` in `monetization.validation.ts`
- WHEN body contains invalid `amountMinor`
- THEN controller MUST respond 400 before invoking use case
- AND error payload MUST use Spanish message for staff users

#### Scenario: Use case not reached on validation failure

- GIVEN malformed JSON body
- WHEN Zod parse fails in controller
- THEN application use case MUST NOT execute

---

### Requirement: Application validation limited to domain rules

`application/validation/` MAY contain only business validation not tied to HTTP shape (e.g. tournament format rules). HTTP field formats (strings, enums, positive integers) MUST NOT be duplicated in application if already in presentation Zod.

#### Scenario: Duplicate booking validation removed

- GIVEN the same field constraints in both `validators/booking.schemas.ts` and `validation/bookings.validation.ts`
- WHEN Wave 0 completes
- THEN only presentation Zod MUST enforce HTTP shape; application receives typed DTO

---

### Requirement: Domain validation folder optional and pure

`domain/validation/` MAY hold pure domain rule functions without Zod or Express dependencies. It MUST NOT import `presentation/` or `infrastructure/`.

#### Scenario: Domain rule without Zod

- GIVEN a pure function `assertReservationWindow()` in `domain/validation/`
- WHEN imported from a use case
- THEN the module MUST have no `zod` import if the rule is not HTTP-specific

---

### Requirement: Middleware folder unified

`presentation/middlewares/` (empty scaffold) MUST be removed; all middleware MUST live under `presentation/middleware/` per Wave 0 exploration checklist.

#### Scenario: Single middleware import path

- GIVEN a route importing auth middleware
- WHEN Wave 0 completes
- THEN import path MUST be `presentation/middleware/...` only
