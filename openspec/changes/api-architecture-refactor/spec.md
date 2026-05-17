# Especificación: Refactor Clean Architecture — `services/api`

| Campo | Valor |
|-------|-------|
| **Change** | `api-architecture-refactor` |
| **Estado** | Spec-ready |
| **Propuesta** | [`proposal.md`](./proposal.md) |
| **Exploración** | [`exploration.md`](./exploration.md) |
| **Alcance** | Estructural / arquitectónico en `services/api/src` |
| **Postura** | Fintech global — sin atajos MVP |

## Propósito

Definir requisitos verificables para migrar todo `services/api` a Clean Architecture estricta: capas inviolables, domain rico, DI único, adapters+mappers, validación Zod unificada y value objects de dinero como fundación Wave 0. **No** incluye comportamiento de producto multi-moneda (change hijo `multi-currency-payments`).

## Capabilities (mapa)

| Capability | Artefacto | Olas |
|------------|-----------|------|
| `api-layer-boundaries` | [`specs/api-layer-boundaries/spec.md`](./specs/api-layer-boundaries/spec.md) | 0+ (CI permanente) |
| `money-value-objects` | [`specs/money-value-objects/spec.md`](./specs/money-value-objects/spec.md) | **0** (fundación) |
| `domain-folder-structure` | [`specs/domain-folder-structure/spec.md`](./specs/domain-folder-structure/spec.md) | 0 → 6 |
| `api-composition-root` | [`specs/api-composition-root/spec.md`](./specs/api-composition-root/spec.md) | 0 inventario → 1–6 |
| `infrastructure-adapters-only` | [`specs/infrastructure-adapters-only/spec.md`](./specs/infrastructure-adapters-only/spec.md) | 1 → 6 |
| `presentation-validation-unified` | [`specs/presentation-validation-unified/spec.md`](./specs/presentation-validation-unified/spec.md) | 0 |

## Wave gates (programa)

| Wave | Foco | Gate verificable |
|------|------|------------------|
| **0** | ESLint, `ARCHITECTURE.md`, `domain/money`, entities scaffold, eliminar `domain/repositories/`, validation unificada | `npm run lint` verde; 0 violaciones capa en `domain/` y `application/` |
| **1** | BC Payments (`payment-domain-refactor`) | **Desbloquea** `multi-currency-payments` |
| **2** | Booking & Venue — composition en 9 controllers deuda | — |
| **3** | Match & Tournament — sin `americano.service` | — |
| **4** | Identity — auth/profile UC | — |
| **5** | Social — audit composition | — |
| **6** | Platform — 15 repos función eliminados; routers sin infra | Programa API completo |

### Gate explícito: `multi-currency-payments`

El change **`multi-currency-payments` MUST remain blocked** hasta que se cumplan **ambos**:

1. **Wave 0** — ESLint `no-restricted-imports` verde en CI; `MoneyAmount` / `CurrencyCode` en `domain/money/`; `domain/repositories/` eliminado.
2. **Wave 1** — `payment-domain-refactor` cerrado: ports TX, adapters, UC confirm/sync, 0 imports `infrastructure/` en application BC pagos.

Merge de MCP PR1 (schema) solo cuando el gate anterior esté verificado en `verify-report.md` o checklist PO equivalente.

## Patrones de referencia

| Tipo | Referencia en codebase |
|------|------------------------|
| **Gold** | `transaction_receipts.controller.ts` + `transaction_receipts.composition.ts`; `matches.composition.ts` + use cases con ports |
| **Anti-patrón** | `bookings.controller.ts` (DI inline Prisma/repos); `monetization.service.ts` (god service + infra) |

## Child changes

| Change | Relación |
|--------|----------|
| [`payment-domain-refactor`](../payment-domain-refactor/exploration.md) | Detalle Wave 1 — BC Payments |
| [`multi-currency-payments`](../multi-currency-payments/proposal.md) | Producto MCP — **bloqueado** hasta Wave 0+1 |

## Criterios de éxito del programa (verificables)

- [ ] ESLint: 0 violaciones `domain/` y `application/` → infra/Prisma; controllers sin infra.
- [ ] `domain/repositories/` eliminado; `entities/`, `value_objects/`, `services/` poblados (≥ payments + booking).
- [ ] 9 `application/*.service.ts` con 0 imports desde controllers/routes.
- [ ] 15 `infrastructure/repositories/*.ts` con 0 imports (carpeta eliminada).
- [ ] 9 controllers deuda (exploration §7) usan solo `*_UC` de composition.
- [ ] `npm run typecheck && npm run lint && npm test` verde en cada wave mergeada.
- [ ] Gate Wave 1 cerrado → `multi-currency-payments` puede iniciar `sdd-apply`.
- [ ] `services/api/ARCHITECTURE.md` publicado y referenciado en `AGENTS.md`.

## Verificación (orden obligatorio)

```bash
cd services/api && npm run typecheck && npm run lint && npm test
```

## Próximo paso SDD

`sdd-design` — grafo de dependencias, reglas ESLint concretas, plantilla `*.composition.ts` — luego `sdd-tasks` (Wave 0).
