# Design: Refactor Clean Architecture — `services/api`

| Campo | Valor |
|-------|-------|
| **Change** | `api-architecture-refactor` |
| **Modo** | hybrid (este archivo + Engram `sdd/api-architecture-refactor/design`) |
| **Referencias** | `proposal.md`, `exploration.md`, `payment-domain-refactor/exploration.md` |

---

## 1. Technical Approach

**Estrategia strangler por olas (0–6)** sobre `services/api/src`, sin big-bang ni cambios de stack. Cada ola sigue el mismo micro-ciclo por bounded context:

1. **Domain** — entities/VO por BC, ports nuevos o endurecidos, domain services sin IO.
2. **Infrastructure** — `adapters/prisma_*` + `mappers/*` (Prisma → entity/VO); deprecar funciones en `repositories/`.
3. **Application** — un use case por acción HTTP; orquestador delgado opcional por BC; **cero** imports infra/Prisma.
4. **Presentation** — `composition/*.composition.ts` como único wiring; controllers/routes skinny.
5. **Delete legacy** — solo cuando `rg` reporte **0 imports** del `*.service.ts` o repo función.

**Patrones internos (copiar):**

| Gold | Anti |
|------|------|
| `transaction_receipts.composition.ts` + UC con ports | `bookings.controller.ts` (DI inline, ignora composition) |
| `matches.composition.ts` (singletons + `*_UC` exportados) | `monetization.service.ts` (god service + repos función) |

**Gate producto:** Wave **0** (ESLint + `MoneyAmount` + `ARCHITECTURE.md`) + Wave **1** vía child **`payment-domain-refactor`** → desbloquea **`multi-currency-payments`**. No mergear schema MCP hasta gate verde.

**Verificación por PR/wave:** `npm run typecheck` → `npm run lint` → `npm test` (orden fijo en `openspec/config.yaml`).

```text
Wave 0 ──► estándares + money VO + ESLint ampliado + domain tree
    │
    ▼
Wave 1 ──► payment-domain-refactor (6 PRs) ──► GATE MCP
    │
    ├── Wave 2 Booking/Venue
    ├── Wave 3 Match/Tournament
    ├── Wave 4 Identity
    ├── Wave 5 Social
    └── Wave 6 Platform (ranking, routers huérfanos, delete repos restantes)
```

---

## 2. Architecture Decisions

### Decision 1: `domain/ports/` (hexagonal), no `domain/repositories/`

| | |
|---|---|
| **Choice** | Mantener **`domain/ports/`** como único lugar de contratos de persistencia/externos. **Eliminar** `domain/repositories/` (carpeta vacía con `.gitkeep`). |
| **Alternatives** | Renombrar `ports` → `repositories` (DDD clásico); duplicar ambas carpetas. |
| **Rationale** | ~62 ports ya existen; 0 violaciones domain→infra. Renombrar es churn masivo sin beneficio. La confusión ports vs `infrastructure/repositories/` se resuelve con lint + `ARCHITECTURE.md`, no con duplicar interfaces en domain. |

### Decision 2: Composition root único en `presentation/composition/`

| | |
|---|---|
| **Choice** | Todo DI en `presentation/composition/{feature}.composition.ts`. Controllers importan **solo** `*_UC` exportados (+ errores domain + tipos DTO si aplica). |
| **Alternatives** | DI en controllers (AS-IS bookings); contenedor IoC global (tsyringe). |
| **Rationale** | 27 compositions ya existen; `bookings.composition.ts` demuestra el patrón pero está **huérfano**. IoC global añade dependencia y oculta el grafo por feature. Matches/receipts validan el patrón actual del repo. |

### Decision 3: ESLint flat config — ampliar `no-restricted-imports` por capa (Wave 0)

| | |
|---|---|
| **Choice** | Extender `eslint.config.mjs` con bloques por glob (ver §5). **Error** en CI; overrides temporales por carpeta máximo 1 sprint si bloquea merge paralelo. |
| **Alternatives** | Solo documentación; `dependency-cruiser` / `eslint-plugin-boundaries`. |
| **Rationale** | Ya existe regla parcial en `use_cases/**` y `domain/**`; AS-IS sigue con 10 application→infra y 9 controllers→infra. ESLint es feedback inmediato en IDE y CI sin nueva herramienta. |

### Decision 4: Naming adapters — `Prisma{Aggregate}Adapter` en `infrastructure/adapters/`

| | |
|---|---|
| **Choice** | Clase `PrismaXxxAdapter` implementa `IXxxRepository` (port). Archivo: `infrastructure/adapters/prisma_xxx_adapter.ts` o `prisma_xxx_repository.ts` **solo si** ya existe convención local (`PrismaMatchRepository`). |
| **Alternatives** | Mantener `findXRepo()` sueltos; sufijo `Repository` solo en domain ports. |
| **Rationale** | 59 adapters existentes usan prefijo `Prisma*`. Repos función (15) migran a clase adapter + mapper; un export por port. Evitar nuevo estilo `*Repo` en infra. |

### Decision 5: `MoneyAmount` en `domain/money/` (global fintech VO)

| | |
|---|---|
| **Choice** | `CurrencyCode`, `MoneyAmount`, `ExchangeRateSnapshot`, `money_errors.ts` bajo **`domain/money/`**. IDs tipados y refs de pago en `domain/value_objects/`. |
| **Alternatives** | Solo `value_objects/money_amount.ts`; usar `decimal.js` en application. |
| **Rationale** | MCP y Wave 1 asumen paquete money explícito. Separar money global de VOs por BC reduce acoplamiento booking↔payments. Suma/multiplicación solo misma moneda — invariante en VO, no en Prisma. |

### Decision 6: Orden de migración — Wave 0 → payment child → MCP; BCs por valor fintech

| | |
|---|---|
| **Choice** | **0** fundaciones → **1** Payments (child) → gate → **2** Booking (precio reserva) → **3** Match/Tournament → **4–6** por tráfico/deuda. |
| **Alternatives** | Booking antes que Payments; refactor horizontal “todos los repos” en Wave 0. |
| **Rationale** | 62% application BC pagos importa infra; bug `amountTotal × 100` bloquea MCP. Booking depende de totales correctos post-money. Wave 0 no toca 15 repos — solo estándares y VO — para PR reviewable. |

### Decision 7: Application sin `*.service.ts` nuevos; strangler hasta 0 imports

| | |
|---|---|
| **Choice** | Prohibir nuevos `application/*.service.ts` (lint + review). Legacy delega a UC nuevo hasta borrado. |
| **Alternatives** | Renombrar services a `*_orchestrator.ts` sin cambiar dependencias. |
| **Rationale** | 9 god services son el síntoma; renombrar perpetúa imports infra. `PaymentOrchestrator` (Wave 1) es facade **sin** Prisma. |

### Decision 8: Validación Zod solo en `presentation/validation/`

| | |
|---|---|
| **Choice** | Unificar `validators/booking.schemas.ts` → `validation/bookings.validation.ts`; no nuevos `presentation/validators/`. |
| **Alternatives** | Zod en application; class-validator. |
| **Rationale** | Alineado con 40+ archivos `*.validation.ts` existentes. Domain validation solo para reglas puras sin IO. |

---

## 3. Layer Dependency Diagram

```mermaid
flowchart TB
  subgraph presentation["presentation"]
    routes["routes"]
    controllers["controllers"]
    composition["composition/*.composition.ts"]
    validation["validation/ Zod"]
  end

  subgraph application["application"]
    uc["use_cases/"]
    orch["*_orchestrator.ts optional"]
    dto["dto/"]
  end

  subgraph domain["domain"]
    entities["entities/{bc}/"]
    vo["value_objects/ + money/"]
    ds["services/{bc}/"]
    ports["ports/"]
    errors["errors/"]
    pure["elo/, americano/, …"]
  end

  subgraph infrastructure["infrastructure"]
    adapters["adapters/"]
    mappers["mappers/"]
    external["external/"]
    prisma["prisma_client + generated"]
  end

  routes --> controllers
  controllers --> composition
  controllers --> uc
  controllers --> errors
  composition --> uc
  composition --> adapters
  composition --> external
  composition --> prisma
  uc --> ports
  uc --> entities
  uc --> vo
  uc --> ds
  uc --> dto
  uc --> errors
  orch --> uc
  adapters --> ports
  adapters --> entities
  adapters --> vo
  adapters --> mappers
  adapters --> prisma
  mappers --> entities
  mappers --> vo

  domain -.-x infrastructure
  domain -.-x presentation
  application -.-x infrastructure
  application -.-x presentation
```

**Regla:** flechas de dependencia solo hacia dentro. `composition` es la **única** capa presentation que importa `infrastructure`.

---

## 4. Target Folder Tree — `services/api/src/domain/`

```text
domain/
  errors/
    app_error.ts
  money/                              # Wave 0 — global fintech
    currency_code.ts
    money_amount.ts
    money_amount_ops.ts
    exchange_rate_snapshot.ts
    money_errors.ts
  value_objects/
    identifiers.ts                    # ReservationId, TransactionId, …
    payment_reference.ts              # según Wave 1
  entities/
    shared/                           # enums cross-BC si aplica
    booking/
      reservation.entity.ts           # mover desde entities/reservation.entity.ts
      court.entity.ts                 # mover desde entities/court.entity.ts
    payments/
      payment_obligation.entity.ts    # Wave 1 child
      venue_payment_method.entity.ts  # mover
      exchange_rate.entity.ts         # mover
    catalog/                          # Wave 6 — si se extraen de ports
  services/
    payments/
      fee_policy.service.ts           # migrar fee_calculation desde monetization/
      payment_allocation.service.ts   # Wave 1
    booking/
      pricing.service.ts              # total court + duration, sin IO
  ports/                              # 62+ interfaces — sin cambio de nombre
    transaction_repository.ts         # Wave 1 — nuevo
    …
  elo/                                # lógica pura legacy — mantener
  americano/
  single_elimination/
  round_robin/
  monetization/                       # DEPRECAR → services/payments/ (Wave 1)
    fee_calculation.ts
# ELIMINAR: repositories/ (.gitkeep)
```

**Mappers (infra, no domain):** `infrastructure/mappers/{bc}_*.mapper.ts` — Prisma row → `entities` / `money` VO.

---

## 5. ESLint `no-restricted-imports` — Config Wave 0

Reemplazar/ampliar bloques en `services/api/eslint.config.mjs`. Mantener `ignores` de `src/generated/**`.

```javascript
// --- domain: cero dependencias externas de capa ---
{
  files: ['src/domain/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: '../../infrastructure', message: 'domain MUST NOT import infrastructure' },
        { name: '../../../infrastructure', message: 'domain MUST NOT import infrastructure' },
        { name: '../../generated/prisma', message: 'domain MUST NOT import Prisma generated' },
        { name: '../../../generated/prisma', message: 'domain MUST NOT import Prisma generated' },
        { name: '../../presentation', message: 'domain MUST NOT import presentation' },
      ],
      patterns: [
        { group: ['**/infrastructure/**'], message: 'domain MUST NOT import infrastructure' },
        { group: ['**/generated/prisma', '**/generated/prisma/**'], message: 'domain MUST NOT import Prisma' },
        { group: ['**/presentation/**'], message: 'domain MUST NOT import presentation' },
        { group: ['../application/**', '../../application/**'], message: 'domain MUST NOT import application' },
      ],
    }],
  },
},

// --- application (TODA la carpeta, no solo use_cases) ---
{
  files: ['src/application/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['**/infrastructure/**'], message: 'application MUST NOT import infrastructure — use domain ports' },
        { group: ['**/generated/prisma', '**/generated/prisma/**'], message: 'application MUST NOT import Prisma' },
        { group: ['**/presentation/**'], message: 'application MUST NOT import presentation' },
      ],
    }],
    'no-restricted-syntax': ['error', {
      selector: 'ImportDeclaration[source.value=/\\.service\\.ts$/]',
      message: 'Prohibido nuevo application/*.service.ts — usar use_cases + composition',
    }],
  },
},

// --- presentation controllers ---
{
  files: ['src/presentation/controllers/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['**/infrastructure/**'], message: 'controllers MUST NOT import infrastructure — use composition * _UC' },
        { group: ['**/generated/prisma/**'], message: 'controllers MUST NOT import Prisma' },
      ],
    }],
  },
},

// --- presentation routes ---
{
  files: ['src/presentation/routes/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['**/infrastructure/**'], message: 'routes MUST NOT import infrastructure' },
        { group: ['**/application/**/*.service'], message: 'routes MUST NOT call god services' },
      ],
    }],
  },
},

// --- composition: ÚNICO lugar presentation→infrastructure ---
// (sin regla extra — allowed by design)
```

**Rollout lint:** PR Wave 0a añade reglas con `warn` en archivos violadores listados en exploration §1.1; PR Wave 0b sube a `error` tras fixes o `eslint-disable-next-line` documentado con ticket. Objetivo: **0 violaciones** en `domain/` y `application/` antes de cerrar Wave 0.

---

## 6. Template `*.composition.ts`

Basado en `matches.composition.ts` y `transaction_receipts.composition.ts`:

```typescript
/**
 * Composición — {FeatureName}
 * Único wiring: adapters + use cases exportados como *_UC
 */

import { SomeUseCase } from '../../application/use_cases/some.use_case.js';
import { PrismaSomeAdapter } from '../../infrastructure/adapters/prisma_some_adapter.js';
// import cross-feature UC from './other.composition.js' — evitar ciclos

const SOME_REPOSITORY = new PrismaSomeAdapter(/* PRISMA si ctor lo requiere */);

export const SOME_ACTION_UC = new SomeUseCase(SOME_REPOSITORY);

// Controller importa solo:
// import { SOME_ACTION_UC } from '../composition/some.composition.js';
```

**Reglas composition:**

| Regla | Detalle |
|-------|---------|
| Constantes módulo | `UPPER_SNAKE` para adapters/repos compartidos en el archivo |
| Exports públicos | Solo `*_UC` (y opcionalmente factories para tests) |
| Prisma | Solo aquí o dentro de adapters — **nunca** pasar `PRISMA` a UC (deuda: `GET_MATCH_PAYMENT_INFO_UC` en matches — fix Wave 1/3) |
| Cross-feature | Importar `*_UC` de otra composition (ej. receipts → notifications) |
| Anti-patrón | Duplicar este archivo inline en controller |

---

## 7. Wave 0 — File Change List (actionable)

| # | Archivo / acción | Acción | Descripción |
|---|------------------|--------|-------------|
| W0-1 | `services/api/ARCHITECTURE.md` | Create | Diagrama capas, árbol domain, reglas 1–5, gold/anti ejemplos |
| W0-2 | `services/api/eslint.config.mjs` | Modify | §5 rules + rollout warn→error |
| W0-3 | `domain/money/*.ts` | Create | `CurrencyCode`, `MoneyAmount`, ops, errors, unit tests |
| W0-4 | `domain/value_objects/identifiers.ts` | Create | IDs tipados mínimos (extensible) |
| W0-5 | `domain/entities/booking/*` | Move | `reservation.entity.ts`, `court.entity.ts` desde `entities/` |
| W0-6 | `domain/entities/payments/*` | Move | `exchange_rate`, `venue_payment_method` entities |
| W0-7 | `domain/repositories/` | Delete | Eliminar carpeta vacía |
| W0-8 | `domain/services/payments/fee_policy.service.ts` | Create | Extraer lógica de `monetization/fee_calculation.ts` |
| W0-9 | `presentation/middlewares/` | Delete/Merge | Unificar en `presentation/middleware/` |
| W0-10 | `presentation/validators/booking.schemas.ts` | Move | → `validation/bookings.validation.ts` + actualizar imports |
| W0-11 | `AGENTS.md` | Modify | Link a `ARCHITECTURE.md` |
| W0-12 | `src/test/unit/money_amount.test.ts` | Create | Golden: misma moneda, reject cross-currency sum |
| W0-13 | Violadores lint (10 app + 9 ctrl) | Modify | Fix imports o baseline documentado — ver exploration §1.1, §7 |
| W0-14 | `openspec/changes/api-architecture-refactor/tasks.md` | Create | (sdd-tasks) checklist Wave 0 |

**No en Wave 0:** borrar `*.service.ts`, migrar 15 repos, schema Prisma MCP.

---

## 8. Deprecation Tables

### 8.1 Application `*.service.ts` (9) → destino

| Legacy service | Imports infra | Target (Wave) | Reemplazo |
|----------------|---------------|---------------|-----------|
| `monetization.service.ts` | 5 repos | **1** | `PaymentOrchestrator` + UCs (`confirm_manual_payment`, obligations, summaries) + `monetization.composition.ts` |
| `americano.service.ts` | 7 repos | **3** | `CreateAmericanoUseCase`, … + `americano.composition.ts` |
| `parametrized_tournament.service.ts` | — | **3** | Tournament UCs + composition existente extendida |
| `services/tournament_format_parameters_validator.service.ts` | — | **3** | `domain/services/` o port `TournamentFormatParametersValidator` |
| `ranking.service.ts` | 2 repos | **6** | Ranking UCs + `ranking.composition.ts` |
| `matchmaking.service.ts` | 3 repos | **6** | Matchmaking UCs |
| `auth.service.ts` | — | **4** | Auth UCs (`auth.composition.ts` ya existe — migrar llamadas) |
| `profile.service.ts` | — | **4** | Profile UCs |
| `catalog.service.ts` | — | **6** | Catalog UCs |

**Criterio borrado:** `rg "monetization.service"` → 0 hits; luego delete file.

### 8.2 `infrastructure/repositories/` (15) → adapter / wave

| Repo función | Consumidores típicos | Target adapter / mapper | Wave |
|--------------|---------------------|-------------------------|------|
| `transaction.repository.ts` | monetization, confirm UC | `adapters/prisma_transaction_repository.ts` | **1** |
| `fee_rule.repository.ts` | monetization | `adapters/prisma_venue_fee_rule_repository.ts` | **1** |
| `exchange_rate.repository.ts` | router, monetization | `adapters/prisma_exchange_rate_repository.ts` | **1** |
| `venue_payment_method.repository.ts` | router | `adapters/prisma_venue_payment_method_repository.ts` | **1** |
| `court.repository.ts` | bookings, venues | `adapters/prisma_court_repository.ts` implements `CourtRepository` port | **2** |
| `court_repository_factory.ts` | venues controller | Inline en `venues.composition.ts` | **2** |
| `prisma_court_mapper.ts` | court repo | `mappers/court.mapper.ts` | **2** |
| `reservation.repository.ts` | monetization, booking | `prisma_reservation_repository` adapter (exists) — unify | **2** |
| `match.repository.ts` | americano, monetization | Consolidar en match adapters existentes | **3** |
| `tournament.repository.ts` | tournaments | `prisma_tournament_repository` adapter | **3** |
| `user.repository.ts` | user_search controller | `prisma_user_repository` adapter | **4** |
| `ranking.repository.ts` | ranking.service | `prisma_ranking_repository` adapter | **6** |
| `category.repository.ts` | americano | `prisma_category_repository` adapter | **6** |
| `sport.repository.ts` | catalog | `prisma_sport_repository` adapter | **6** |
| `format_preset.repository.ts` | tournaments | `prisma_format_preset_repository` adapter | **6** |

**Post Wave 6:** eliminar carpeta `infrastructure/repositories/` completa.

---

## 9. Integration — Child Changes & MCP Gate

```text
api-architecture-refactor
├── Wave 0 (este design §7) ─────────────────────────────┐
│                                                          │
└── Wave 1 = payment-domain-refactor (6 PRs R1–R6) ◄──────┘
         │
         │ GATE (todas obligatorias):
         │  • ESLint 0 violaciones domain + application
         │  • MoneyAmount + tests golden en CI
         │  • TransactionRepository port + PrismaTransactionAdapter
         │  • ConfirmManualPaymentUseCase sin Prisma
         │  • monetization.service.ts eliminado (0 imports)
         │  • exchange_rate + venue_payment_method routers → UC
         │
         ▼
multi-currency-payments
    M1 schema (effectiveDate, settlementCurrency, …)
    M2+ comportamiento cross-currency, web UI, flag
```

| Requisito MCP | Proveedor |
|---------------|-----------|
| `MoneyAmount`, `CurrencyCode` | Wave **0** |
| Ports TX, fee, conversion | Wave **1** R1–R2 |
| Confirm/sync sin Prisma | Wave **1** R3 |
| `PaymentOrchestrator` | Wave **1** R4 |
| Routers sin infra | Wave **1** R5 |
| Tests golden conversión | Wave **1** R1 + MCP M2 |
| Schema Prisma MCP | **Solo** en `multi-currency-payments` M1 post-gate |

**Scope firewall Wave 1:** child **no** incluye columnas MCP ni `MULTI_CURRENCY_PAYMENTS` behavior — solo arquitectura y paridad funcional AS-IS corregida (agregación en pricing currency).

**Contrato con web/mobile:** congelar shape JSON de `MoneyAmount` en spec MCP; clients mockean hasta gate. Cambios HTTP breaking solo en olas que toquen endpoints (Wave 1 confirm/summary).

---

## 10. Testing Strategy per Wave

| Wave | Unit (Vitest) | Contract (Zod/HTTP 400) | Integration (TEST_DATABASE_URL) |
|------|---------------|---------------------------|----------------------------------|
| **0** | `money_amount.test.ts`, `currency_code.test.ts` | — | — |
| **1** (child) | `money_conversion.golden.test.ts`, `payment_obligation.test.ts`, `sync_reservation_payment.test.ts` | `monetization.validation.test.ts` (existente) | Confirm manual + sync reserva + obligations (ampliar `monetization.integration.test.ts`) |
| **2** | Pricing domain service | `bookings.validation` tras move | Booking create/cancel con totales |
| **3** | Americano schedule (domain puro) | Tournament routes | Match flows sin service |
| **4–5** | Auth/profile helpers | Auth validation | Login/refresh smoke |
| **6** | Ranking aggregation | — | Exchange rate UC + geo si aplica |

**CI gate por PR:** `typecheck` → `lint` (incl. boundaries) → `npm test`. Integration opcional en PRs que no tocan persistencia; **obligatoria** Wave 1 R3–R6 y MCP M1.

**TDD (openspec `strict_tdd: true`):** Red tests en mismo PR que introduce port/UC; no mergear adapter sin test de mapper o UC con fake port.

---

## 11. Risks & Mitigations (technical expansion)

| Risk | L | Mitigación técnica |
|------|---|-------------------|
| PR >400 LOC rompe review | H | Olas por BC; child payment = 6 PRs; usar chained PRs (`work-unit-commits` skill) |
| ESLint Wave 0 bloquea 19 archivos violadores | H | PR 0a `warn` + lista explícita; 0b fixes; override máx. 1 sprint con issue |
| `bookings.composition` huérfano perpetúa duplicación | M | Wave 2 PR1: controller solo importa composition; delete inline DI |
| Regresión `amountTotal × 100` | H | Wave 1 `SyncReservationPaymentUseCase` + integration test antes delete `transaction.repository.ts` |
| Dual `repositories/` vs `adapters/` durante migración | M | Tabla §8.2; no nuevo repo función; grep en CI opcional |
| `GET_MATCH_PAYMENT_INFO_UC` recibe PRISMA | M | Inyectar port read en Wave 1/3; composition solo adapters |
| Scope creep MCP en Wave 1 | M | Gate checklist §9; schema solo en change MCP |
| Equipo web adelanta UI MCP | M | Feature flag MCP; API mock `MoneyAmount`; spec congelada |
| Delete service antes de 0 imports | H | CI script: `rg` + fallo si importa `monetization.service` |
| Timeline 4–6 sprints | M | Waves 4–6 paralelizables por tráfico; P0 = 0+1+2 |
| Rollback ESLint | L | Revert commit eslint.config; no revertir deletes sin tag previo |

---

## Data Flow — Confirm payment (Wave 1 reference)

```mermaid
sequenceDiagram
  participant R as monetization.router
  participant C as monetization.controller
  participant UC as ConfirmManualPaymentUseCase
  participant TX as TransactionRepository port
  participant AD as PrismaTransactionAdapter
  participant DB as PostgreSQL

  R->>C: PATCH confirm (validated Zod)
  C->>UC: execute(dto)
  UC->>TX: confirmInUnitOfWork(...)
  TX->>AD: adapter maps MoneyAmount
  AD->>DB: prisma.$transaction
  AD-->>UC: ConfirmPaymentResult DTO
  UC-->>C: result
  C-->>R: JSON response
```

---

## Open Questions

- [ ] ¿`eslint-plugin-import` para resolver paths absolutos `@/` en futuro, o mantener relativos?
- [ ] ¿Extraer `PRISMA` de `matches.composition` en Wave 1 o Wave 3?
- [ ] ¿Baselining temporal con `eslint-disable` por archivo vs fix inmediato en Wave 0b?

---

## File Changes (program summary)

| Área | New | Modified | Deleted (phased) |
|------|-----|----------|------------------|
| `domain/` | money/, entities/{bc}/, services/{bc}/ | ports Wave 1 | `repositories/` |
| `application/` | payment UCs (child) | 10 violadores lint | 9 `*.service.ts` |
| `infrastructure/` | adapters, mappers | — | 15 `repositories/*.ts` |
| `presentation/` | monetization.composition (W1) | 9 controllers §7 | `validators/`, `middlewares/` |
| Tooling | `ARCHITECTURE.md` | `eslint.config.mjs`, `AGENTS.md` | — |

**Next:** `sdd-tasks` — desglosar Wave 0 en tareas con DAG; ejecutar child `payment-domain-refactor` tras Wave 0 verde.
