# Capability: infrastructure-adapters-only

**Programa:** `api-architecture-refactor`  
**Alcance:** Migración `infrastructure/repositories/` → `infrastructure/adapters/` + `infrastructure/mappers/`

## Purpose

Eliminar la doble persistencia (funciones-repo vs adapters con ports) para que todo acceso a datos implemente contratos en `domain/ports/` y mapee a entidades de dominio.

## Requirements

### Requirement: Adapters implement domain ports

Every persistence access from application use cases MUST go through a class (or module) under `infrastructure/adapters/{bc}/` that implements the corresponding interface in `domain/ports/`. Function-style files under `infrastructure/repositories/` are deprecated.

#### Scenario: Transaction port in Wave 1

- GIVEN `TransactionRepository` port in `domain/ports/`
- WHEN Wave 1 completes
- THEN `PrismaTransactionAdapter` (name per design) MUST be the sole implementation used in `monetization.composition.ts`
- AND `infrastructure/repositories/transaction.repository.ts` function exports MUST have zero importers

#### Scenario: Exchange rate duplicate removed

- GIVEN AS-IS `exchange_rate` port plus `exchange_rate` repository function (exploration §2.2)
- WHEN Wave 1 PR5 or Wave 6 cleanup merges
- THEN only the adapter implementing the port MAY remain

---

### Requirement: Mappers convert Prisma to domain

The system MUST provide mappers under `infrastructure/mappers/` that translate Prisma models to `domain/entities/**` and `domain/money/MoneyAmount`. Adapters MUST NOT return Prisma types to the application layer.

#### Scenario: Adapter findById

- GIVEN `PrismaTransactionAdapter.findById(id)`
- WHEN the row exists
- THEN the method MUST return a domain entity or DTO defined in application/domain, built via mapper

---

### Requirement: Phased deprecation of fifteen repository files

The 15 files under `infrastructure/repositories/*.ts` (AS-IS) MUST reach **zero imports** before deletion. Deletion MUST occur in phased PRs (Wave 1 for payments-related repos; Wave 6 for remainder).

#### Scenario: Deprecation table tracking

- GIVEN programme task list
- WHEN a repository file still has importers
- THEN the file MUST NOT be deleted; strangler MAY keep delegating old function to new adapter temporarily

#### Scenario: Programme complete

- GIVEN Wave 6 marked done
- WHEN listing `src/infrastructure/repositories/`
- THEN the directory MUST NOT exist OR MUST contain zero `.ts` source files

---

### Requirement: External HTTP in infrastructure external adapters

HTTP calls to third parties (e.g. `dolarapi` in `exchange_rate.router.ts` AS-IS) MUST move to `infrastructure/external/` (or adapter dedicated module), invoked only from use cases via ports — not from routers.

#### Scenario: Exchange rate router refactor

- GIVEN `exchange_rate.router.ts` calling infra repo + `fetch` directly
- WHEN Wave 1/6 router refactor completes
- THEN router MUST call controller → use case; fetch MUST live in infrastructure adapter

---

### Requirement: No new repository function files

After Wave 0, the codebase MUST NOT add new files under `infrastructure/repositories/`. New persistence MUST be new adapters + mappers.

#### Scenario: Developer adds findVenueRepo.ts

- GIVEN a PR creating `infrastructure/repositories/venue.repository.ts`
- WHEN CI and review run
- THEN PR MUST be rejected; adapter under `infrastructure/adapters/venue/` MUST be used instead

---

### Requirement: God services eliminated before repository delete

The nine `application/*.service.ts` files MUST have zero imports from controllers/routes before the matching repository functions are removed (coordination with `api-composition-root`).

#### Scenario: Monetization service removed

- GIVEN `monetization.service.ts` had 5 repository imports (AS-IS)
- WHEN Wave 1 closes
- THEN `monetization.service.ts` MUST be deleted or re-export-only with zero consumers
- AND all former consumers MUST use composition-wired use cases
