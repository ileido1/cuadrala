# Capability: domain-folder-structure

**Programa:** `api-architecture-refactor`  
**Alcance:** `services/api/src/domain/`

## Purpose

Poblar un domain rico por bounded context (entities, value objects, domain services, ports) y eliminar carpetas scaffold vacías que perpetúan un modelo anémico incompatible con fintech.

## Requirements

### Requirement: Target folder layout

The domain layer MUST follow this layout (paths relative to `src/domain/`):

```text
money/                 # MoneyAmount, CurrencyCode (Wave 0)
value_objects/         # shared VOs, typed IDs as needed
entities/{bc}/         # booking/, payments/, catalog/, …
services/{bc}/         # domain services without IO
ports/                 # persistence and external contracts
errors/
{elo,americano,…}/     # legacy pure logic migrated gradually
```

The folder `domain/repositories/` MUST NOT exist after Wave 0 (delete empty scaffold). Persistence contracts MUST live only under `domain/ports/`.

#### Scenario: Wave 0 removes repositories folder

- GIVEN `domain/repositories/` contains only `.gitkeep` (AS-IS)
- WHEN Wave 0 merges
- THEN the directory `src/domain/repositories/` MUST be deleted from the repository
- AND no new `domain/repositories/` path MAY be reintroduced

#### Scenario: Ports naming unchanged

- GIVEN hexagonal convention `domain/ports/transaction_repository.ts`
- WHEN documentation or code refers to persistence interfaces
- THEN they MUST remain under `ports/`; renaming to `repositories/` is prohibited

---

### Requirement: Entities organized by bounded context

Domain entities and aggregate types MUST reside under `domain/entities/{bc}/` (e.g. `entities/booking/`, `entities/payments/`). Flat files at `domain/entities/*.ts` root MUST be moved into BC subfolders during Wave 0.

#### Scenario: Reorganize existing four entity files

- GIVEN ~4 entity files at `domain/entities/` root (AS-IS exploration)
- WHEN Wave 0 entity migration completes
- THEN each file MUST live under the correct `{bc}/` subfolder
- AND imports from application/adapters MUST be updated without changing HTTP contracts

#### Scenario: Minimum population gate

- GIVEN Wave 0 complete
- WHEN counting entity modules under `entities/payments/` and `entities/booking/`
- THEN each BC MUST contain at least one non-test entity or aggregate type file (not only `.gitkeep`)

---

### Requirement: Value objects folder populated

`domain/value_objects/` MUST contain shared value objects (typed identifiers, `PaymentReference`, etc.) or re-exports from `domain/money/`. The folder MUST NOT remain empty after Wave 0.

#### Scenario: Empty value_objects after Wave 0

- GIVEN only `.gitkeep` in `value_objects/` before Wave 0
- WHEN Wave 0 verification runs
- THEN at least `MoneyAmount`-related shared types or identifier VOs MUST exist in `value_objects/` or `money/`

---

### Requirement: Domain services by bounded context

Pure domain logic without IO MUST live in `domain/services/{bc}/` (e.g. `services/payments/FeePolicyService.ts`, `services/booking/PricingService.ts`). Application-layer `*.service.ts` god objects MUST NOT hold domain rules long-term.

#### Scenario: Fee calculation migration

- GIVEN `domain/monetization/fee_calculation.ts` (AS-IS)
- WHEN payments domain services are introduced (Wave 0–1)
- THEN fee logic SHOULD migrate to `domain/services/payments/` without importing infrastructure

---

### Requirement: Mappers stay in infrastructure

Prisma models MUST be mapped to domain entities/value objects only in `infrastructure/mappers/`. Domain and application MUST NOT depend on Prisma-generated types.

#### Scenario: Adapter returns domain type

- GIVEN `PrismaTransactionAdapter` implementing `TransactionRepository`
- WHEN `findById` executes
- THEN the adapter MUST use a mapper to return domain types, not raw Prisma `Transaction` to application layer

---

### Requirement: ARCHITECTURE.md documents tree

`services/api/ARCHITECTURE.md` MUST document the domain tree, layer rules, gold/anti references, and wave gates. `AGENTS.md` MUST link to it after Wave 0.

#### Scenario: Onboarding developer reads AGENTS.md

- GIVEN Wave 0 merged
- WHEN a developer opens root `AGENTS.md`
- THEN they MUST find a link or section pointing to `services/api/ARCHITECTURE.md` describing `entities/{bc}/` and `ports/` conventions
