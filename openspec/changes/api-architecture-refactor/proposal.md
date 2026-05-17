# Proposal: Refactor Clean Architecture — `services/api` completo

| Campo | Valor |
|-------|-------|
| **Programa** | `api-architecture-refactor` |
| **Alcance** | Todo `services/api/src` |
| **Postura** | Fintech global — sin atajos MVP |
| **Estado** | Propuesta formal SDD |

---

## Intent

Cuadrala API opera con **dos arquitecturas en paralelo**: ~70% de use cases siguen hexagonal (ports → UC → adapters → composition), pero los flujos de mayor valor (bookings, venues, pagos, dashboard) concentran **god services**, **repos función**, **DI inline en controllers** y **routers que saltan application**. Eso impide escalar como fintech (invariantes de dinero, auditoría, multi-moneda) y enseña el patrón incorrecto en cada BC nuevo.

Este programa **refactoriza todo `services/api`** hacia Clean Architecture estricta: domain rico (`entities/`, `value_objects/`, `domain/services/`, `ports/`), application solo use cases, infrastructure solo adapters+mappers, **único composition root** en `presentation/composition/`. Es prerequisito estructural de producto; **`multi-currency-payments` queda bloqueado** hasta cerrar Wave 0 + Wave 1 (gate).

---

## Problem

| Síntoma | Causa raíz |
|---------|------------|
| Prisma y repos en application/controllers | Violación regla de dependencias |
| 9 `*.service.ts` + 15 `infrastructure/repositories/` | Doble persistencia; lógica procedural |
| `bookings.composition.ts` huérfano; wiring duplicado | Sin DI único |
| Carpetas domain vacías (`repositories/`, `value_objects/`, `services/`) | Modelo anémico; sin invariantes |
| MCP sobre AS-IS perpetúa `amountTotal × 100` | Agregación sin `MoneyAmount` ni ports TX |
| 62% application BC pagos importa infra | Gate fintech imposible |

**Métricas AS-IS:** 9 god services · 15 repos función · 10 archivos application→infra · 9 controllers→infra · 2 routers→infra · 0 violaciones domain→infra ✓

---

## Goals

1. **Capas inviolables:** `domain` y `application` MUST NOT import `infrastructure/` ni `generated/prisma`; controllers/routes MUST NOT import repos/adapters.
2. **Domain rico por BC:** poblar `domain/entities/{bc}/`, `domain/value_objects/`, `domain/services/{bc}/`; **eliminar** `domain/repositories/` (vacío).
3. **DI único:** todo wiring en `presentation/composition/*.composition.ts`; controllers solo importan `*_UC` exportados.
4. **Deprecar legacy:** 9 `application/*.service.ts` y 15 `infrastructure/repositories/*.ts` → 0 imports antes de borrar.
5. **Wave 0:** ESLint `no-restricted-imports` + `ARCHITECTURE.md` + `MoneyAmount` base.
6. **Gate MCP:** Wave 0 + Wave 1 verdes → desbloquear `multi-currency-payments`.
7. **Strangler por BC:** endpoints estables; PRs ≤400 líneas; verificación `typecheck → lint → test`.

## Non-goals

- Reescribir mobile/web en este programa (solo contratos HTTP cuando Wave 1 lo exija).
- Big-bang único PR; migrar otros paquetes del monorepo fuera de `services/api`.
- Renombrar `domain/ports/` a `repositories/` (mantener hexagonal).
- Implementar MCP schema/comportamiento multi-moneda (change hijo, post-gate).
- Custodia PSP, wallet, ledger completo (producto SDD Etapa C).
- Refactorizar tests existentes no relacionados salvo regresión en paths tocados.

---

## Capabilities

> Contrato con fase `sdd-spec`. `openspec/specs/` está vacío; capabilities nuevas del programa madre.

### New Capabilities

| Capability | Descripción |
|------------|-------------|
| `api-layer-boundaries` | Reglas ESLint/CI: imports prohibidos por capa; sin `*.service.ts` nuevos |
| `api-composition-root` | DI único en `presentation/composition/`; inventario controllers sin composition |
| `domain-folder-structure` | `entities/{bc}/`, `value_objects/`, `services/{bc}/`, `ports/`; eliminar `domain/repositories/` |
| `money-value-objects` | `MoneyAmount`, `CurrencyCode` en `domain/money/`; suma solo misma moneda |
| `infrastructure-adapters-only` | Deprecación `infrastructure/repositories/` → `adapters/` + mappers |
| `presentation-validation-unified` | Zod solo en `presentation/validation/`; sin `validators/` duplicado |

### Modified Capabilities

| Capability | Cambio |
|------------|--------|
| *(ninguna en `openspec/specs/`)* | Programa estructural; deltas de producto viven en changes hijos (`payment-domain-refactor`, `multi-currency-payments`) |

---

## Approach

**Estrategia strangler por olas (0–6)**, un bounded context por wave. Cada wave: (1) ports + entities/VO, (2) adapters + mappers, (3) use cases, (4) composition + controllers skinny, (5) borrar legacy cuando 0 imports.

**Patrones de referencia internos (copiar, no reinventar):**
- `transaction_receipts` + `matches.composition` + use cases con ports
- **Anti-referencia:** `bookings.controller` wiring inline, `monetization.service.ts`

**Estructura domain target:**

```text
domain/
  money/                    # MoneyAmount, CurrencyCode (Wave 0)
  value_objects/            # IDs tipados, PaymentReference, …
  entities/{bc}/            # booking/, payments/, catalog/, …
  services/{bc}/          # FeePolicyService, PricingService, …
  ports/                    # contratos persistencia/externos
  errors/
  {elo,americano,…}/        # lógica pura legacy migrada gradualmente
# SIN repositories/ — ELIMINAR carpeta
```

**Reglas inviolables (CI desde Wave 0):**

| # | Regla |
|---|--------|
| 1 | `application`/`domain` MUST NOT import `infrastructure/` o `generated/prisma` |
| 2 | `presentation/controllers` MUST NOT import `infrastructure/` |
| 3 | `presentation/routes` MUST NOT import repos/adapters |
| 4 | Todo endpoint MUST tener use case; prohibido nuevo `*.service.ts` |
| 5 | Dinero MUST usar `MoneyAmount` (post Wave 0) |

---

## Wave roadmap (0–6)

```text
Wave 0 — Fundaciones (1 sprint)
  ARCHITECTURE.md, ESLint no-restricted-imports, domain/money + VO,
  entities/ por BC, eliminar domain/repositories/, middleware unificado
         │
         ▼
Wave 1 — Payments BC (1–2 sprints)  ← payment-domain-refactor
  Ports TX, adapters, UC confirm/sync, monetization.composition
  GATE: desbloquea multi-currency-payments
         │
         ▼
Wave 2 — Booking & Venue (1–2 sprints)
  bookings/reservations/venues → composition; CourtRepository adapter
         │
         ▼
Wave 3 — Match & Tournament (1–2 sprints)
  americano.service → UC; tournaments sin Prisma en controller
         │
         ▼
Wave 4 — Identity (1 sprint)
  auth.service, profile.service → UC + composition
         │
         ▼
Wave 5 — Social (1 sprint)
  chat, notifications — auditar composition existente
         │
         ▼
Wave 6 — Platform (1–2 sprints)
  ranking, matchmaking, catalog; exchange_rate + venue_payment_method routers → UC;
  borrar 15 repos función restantes
```

| Wave | BC / foco | Entregables clave | Gate |
|------|-----------|-------------------|------|
| **0** | Estándares + money VO | ESLint, `ARCHITECTURE.md`, `domain/entities/*`, eliminar `repositories/` | Lint verde en CI |
| **1** | Payments | Ver child `payment-domain-refactor` (6 PRs) | **MCP desbloqueado** |
| **2** | Booking/Venue | 9 controllers con composition; `CourtRepository` adapter | — |
| **3** | Match/Tournament | Sin `americano.service`; tournaments UC | — |
| **4** | Identity | auth/profile UC | — |
| **5** | Social | chat/notif audit | — |
| **6** | Platform | ranking/matchmaking; routers infra → UC | Programa API completo |

**Estimación:** 4–6 sprints (1–2 devs), sin contar MCP producto.

---

## Child changes

| Change | Rol | Relación | Gate |
|--------|-----|----------|------|
| **`api-architecture-refactor`** | Programa madre (olas 0–6) | Este documento | Wave 0+1 para MCP |
| **`payment-domain-refactor`** | Detalle Wave 1 — BC Payments | [`exploration.md`](../payment-domain-refactor/exploration.md) | Obligatorio antes MCP |
| **`multi-currency-payments`** | Producto multi-moneda | [`proposal.md`](../multi-currency-payments/proposal.md) | **Bloqueado** hasta Wave 0+1 |

```text
api-architecture-refactor (Wave 0–1 mínimo)
    └── payment-domain-refactor (Wave 1)
            └── multi-currency-payments (schema + comportamiento)
```

**No** implementar MCP sobre AS-IS: confirmaría Prisma en UC, repos función y agregación incorrecta.

---

## Dependency on MCP (`multi-currency-payments`)

| Requisito MCP | Proveído por programa |
|---------------|----------------------|
| `MoneyAmount` + `CurrencyCode` | Wave 0 (`domain/money/`) |
| `TransactionRepository` port + adapter | Wave 1 |
| `ConfirmManualPaymentUseCase` sin Prisma | Wave 1 |
| `PaymentOrchestrator` (no `monetization.service`) | Wave 1 |
| Routers exchange_rate / venue_payment_method sin infra | Wave 1 (PR5) + Wave 6 cleanup |
| Tests golden conversión | Wave 1 |

**Gate explícito:** merge de MCP PR1 (schema) solo cuando Wave 0 ESLint verde + Wave 1 ports/UC confirm/sync con 0 imports infra en application BC pagos.

---

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api/src/domain/` | Modified/New | `entities/{bc}/`, `value_objects/`, `services/{bc}/`, `money/`; delete `repositories/` |
| `services/api/src/application/` | Modified | Eliminar 9 `*.service.ts`; UC por BC |
| `services/api/src/infrastructure/repositories/` | Removed (phased) | 15 archivos → `adapters/` |
| `services/api/src/infrastructure/adapters/` | New/Modified | Un adapter por port/agregado |
| `services/api/src/infrastructure/mappers/` | New | Prisma → entities/VO |
| `services/api/src/presentation/composition/` | Modified | Único DI; nuevos monetization, exchange_rates, bookings |
| `services/api/src/presentation/controllers/` | Modified | 9 controllers deuda → skinny (ver exploration §7) |
| `services/api/src/presentation/routes/` | Modified | Sin imports infra |
| `services/api/src/presentation/validation/` | Modified | Unificar `validators/booking.schemas.ts` |
| `services/api/.eslintrc*` o `eslint.config.*` | Modified | `no-restricted-imports` Wave 0 |
| `services/api/ARCHITECTURE.md` | New | Convenciones + árbol domain |
| `apps/web`, `apps/mobile` | Indirect | Contratos post Wave 1/MCP; no en scope implementación |

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Big-bang / PR gigante | High | Olas + PR ≤400 LOC; chained PRs |
| Regresiones HTTP | High | Contract tests existentes; ↑ integración Waves 0–1 |
| 9 services + 15 repos huérfanos | Med | Tabla deprecación; borrar solo con 0 imports |
| Scope creep MCP en Wave 1 | Med | Gate documentado; schema solo en change MCP |
| Confusión ports vs repositories | Med | Wave 0 doc + eliminar carpeta vacía |
| Timeline 4–6 sprints | Med | Priorizar P0 BC; Waves 4–6 por tráfico |
| Equipo paraleliza web MCP | Med | Congelar contrato `MoneyAmount` en spec; mock hasta gate |

---

## Rollback Plan

| Nivel | Acción |
|-------|--------|
| **PR individual** | Revert merge; endpoints vuelven a delegar en service/repo legacy si aún existe |
| **Wave incompleta** | Mantener strangler: service delega a UC nuevo o viceversa hasta estabilizar |
| **ESLint Wave 0** | Desactivar regla por carpeta temporal (`overrides`) — máximo 1 sprint, no permanente |
| **Gate MCP** | No mergear MCP hasta revertir decisión PO; Wave 1 puede desplegarse sin MCP |
| **DB** | Este programa no incluye migraciones destructivas; MCP rollback vía flag `MULTI_CURRENCY_PAYMENTS` (child) |

Rollback **no** restaura god services borrados: solo revertir commits antes del delete final (R6 payment-domain-refactor).

---

## Success Criteria

- [ ] ESLint `no-restricted-imports`: 0 violaciones en `domain/` y `application/`; controllers sin infra.
- [ ] `domain/repositories/` eliminado; `entities/`, `value_objects/`, `services/` poblados (≥ payments + booking).
- [ ] 9 `*.service.ts` con 0 imports desde controllers/routes.
- [ ] 15 `infrastructure/repositories/*.ts` con 0 imports (o carpeta eliminada).
- [ ] 9 controllers deuda (exploration §7) usan solo composition exportada.
- [ ] `npm run typecheck && npm run lint && npm test` verde en cada wave mergeada.
- [ ] Gate: `payment-domain-refactor` cerrado → `multi-currency-payments` puede iniciar sdd-spec/apply.
- [ ] `ARCHITECTURE.md` publicado y referenciado en `AGENTS.md`.

---

## Dependencies

- Node 20+, PostgreSQL, Prisma (sin cambio de stack).
- Orden SDD: `sdd-spec` (transversal lint/DI/money) + `sdd-design` (grafo dependencias, ESLint config) en paralelo post-aprobación.
- Child explorations: [`exploration.md`](./exploration.md), [`payment-domain-refactor/exploration.md`](../payment-domain-refactor/exploration.md).
- PO: postura fintech global confirmada; MCP bloqueado hasta gate.

---

## Next steps

1. **sdd-spec** — capabilities transversales (`api-layer-boundaries`, `money-value-objects`, …).
2. **sdd-design** — dependency graph, ESLint rules, template `*.composition.ts`.
3. **sdd-tasks** — Wave 0 task list ejecutable.
4. **sdd-propose** en `payment-domain-refactor` (child Wave 1) si no existe.
5. Ejecutar Wave 0 → Wave 1 → **entonces** retomar `multi-currency-payments`.
