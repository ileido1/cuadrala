# Capability: money-value-objects

**Programa:** `api-architecture-refactor` (Wave 0 fundación)  
**Relación MCP:** Semántica alineada con [`multi-currency-payments/specs/money-types.md`](../../changes/multi-currency-payments/specs/money-types.md); requisitos de producto/API JSON MUST NOT duplicarse aquí.

## Purpose

Introducir value objects de dinero en `domain/money/` como prerequisito estructural para pagos multi-moneda. Este capability cubre **solo** tipos de dominio, invariantes y prohibiciones de capa — no schema Prisma, endpoints ni UI.

## Requirements

### Requirement: MoneyAmount and CurrencyCode live in domain/money

The system MUST expose `CurrencyCode` and `MoneyAmount` under `services/api/src/domain/money/` with zero imports from `infrastructure/` or `generated/prisma`.

`MoneyAmount` MUST be modeled as an immutable value object with at least:

- `amountMinor: bigint` (or `number` if codebase standard is fixed before implementation — design phase SHALL freeze choice)
- `currencyCode: CurrencyCode`

#### Scenario: Domain file has no Prisma dependency

- GIVEN `domain/money/money_amount.ts`
- WHEN `npm run typecheck` runs
- THEN the module MUST NOT import from `src/generated/prisma`

#### Scenario: Mapper constructs MoneyAmount

- GIVEN an infrastructure mapper reading a persistence row
- WHEN it builds a `MoneyAmount` for application layer
- THEN it MUST use domain constructors/factories, not Prisma enums as domain types in application

---

### Requirement: CurrencyCode enum values for foundation

`CurrencyCode` in domain MUST support exactly `BS`, `USD`, and `EUR` as the allowed codes at Wave 0 (same set MCP will use). Extending to other ISO codes is out of scope for this programme until a future change.

#### Scenario: Invalid code at domain boundary

- GIVEN a factory `MoneyAmount.of('VES', 100n)`
- WHEN domain validation runs
- THEN it MUST reject with a domain error (message MAY be Spanish in API mapping layer)

---

### Requirement: Homogeneous arithmetic only

The system MUST NOT add, subtract, or compare two `MoneyAmount` instances with different `currencyCode` without an explicit conversion port/service (defined in MCP / Wave 1 ports — not implemented in Wave 0).

#### Scenario: Cross-currency add in application

- GIVEN `MoneyAmount` USD 5000 minor and BS 2750000 minor
- WHEN application code calls `add(a, b)` on domain helpers
- THEN MUST throw or return `Err` domain failure; MUST NOT produce a single numeric total

#### Scenario: Same-currency add

- GIVEN two `MoneyAmount` both `currencyCode: 'USD'`
- WHEN `add` is invoked
- THEN `amountMinor` MUST be the sum of minors and `currencyCode` MUST remain `USD`

---

### Requirement: Minor units semantics (structural)

For `BS`, `USD`, and `EUR`, `amountMinor` SHALL represent the minor unit with **2 decimal places** implied (e.g. USD 85.00 → `8500`). Presentation-layer Zod and API JSON rules are specified in MCP `money-types` REQ-MCP-004–006.

#### Scenario: Domain factory from major units

- GIVEN staff-facing input 85.00 USD (handled in presentation before UC)
- WHEN domain receives `amountMinor: 8500n` and `currencyCode: 'USD'`
- THEN `MoneyAmount` invariant checks MUST pass

---

### Requirement: Wave 0 gate for MCP child change

`multi-currency-payments` MUST NOT begin schema migrations or product `sdd-apply` until:

1. This capability is implemented and unit-tested under `src/test/` or `tests/`
2. `api-layer-boundaries` ESLint is green
3. Wave 1 (`payment-domain-refactor`) ports/adapters for transactions are complete

#### Scenario: PO attempts MCP PR1 before gate

- GIVEN Wave 0 ESLint failing or `domain/money/` absent
- WHEN a PR labeled `multi-currency-payments` Phase 1 schema is proposed
- THEN reviewers MUST block merge citing gate in [`spec.md`](../../spec.md)

#### Scenario: Gate satisfied

- GIVEN Wave 0+1 verification checklist complete
- WHEN `multi-currency-payments` spec references `MoneyAmount`
- THEN domain types MUST already exist and MUST match MCP REQ-MCP-002 semantics (`amountMinor` + `currencyCode`)

---

### Requirement: No raw cent aggregation in new payment code post-Wave-0

New or refactored code in payments bounded context MUST represent money as `MoneyAmount` in use cases and domain services. Legacy `amountTotal * 100` patterns MUST NOT be copied into new modules.

#### Scenario: Monetization service strangler

- GIVEN `monetization.service.ts` still present during Wave 1 strangler
- WHEN a new payment code path is added
- THEN it MUST live in a use case using `MoneyAmount`, not extend the god service pattern
