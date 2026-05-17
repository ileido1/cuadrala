# Exploration: Refactor Clean Architecture — `services/api` completo

| Campo | Valor |
|-------|-------|
| **Programa** | `api-architecture-refactor` |
| **Alcance** | Todo `services/api/src` (no solo pagos) |
| **Relacionado** | `payment-domain-refactor` → `multi-currency-payments` (cadena) |
| **Estado** | Exploration complete |
| **Postura** | Fintech global — sin atajos MVP |

## Resumen ejecutivo

Cuadrala API tiene **dos arquitecturas en paralelo**:

1. **Target (parcial, ~70% de use cases):** `domain/ports` → `application/use_cases` → `infrastructure/adapters` → `presentation/composition` → controller skinny.
2. **Legacy (sistémico):** `application/*.service.ts` + `infrastructure/repositories/*.ts` (funciones) + controllers que **cablean Prisma a mano** + routers que **saltan application**.

El problema **no es solo monetización**: es deuda estructural en **booking/venue**, **americano/ranking**, **reporting**, y **composition roots muertos**. Un refactor solo de pagos deja el resto del API enseñando el patrón incorrecto.

**Recomendación:** programa **`api-architecture-refactor`** en olas por bounded context, con **Wave 0 (estándares + housekeeping)** y **Wave 1 (Payments + Money)** como gate para `multi-currency-payments`.

---

## 1. Métricas del codebase (AS-IS)

| Métrica | Valor |
|---------|-------|
| Archivos `application/` | ~100 |
| `application/use_cases/` | 89 |
| `application/*.service.ts` (god services) | **9** |
| `domain/ports/` | 62 |
| `infrastructure/adapters/` | 59 |
| `infrastructure/repositories/` (funciones) | **15** |
| `presentation/composition/` | 27 |
| `presentation/controllers/` | 40 |
| Carpetas domain vacías (`.gitkeep`) | `repositories/`, `services/`, `value_objects/`, `presentation/middlewares/` |

### 1.1 Violaciones por capa

| Violación | Conteo | % aprox. |
|-----------|--------|----------|
| `application` importa `infrastructure/` | **10 archivos** | ~10% application (pero incluye god services críticos) |
| `application` importa `generated/prisma` | **8 archivos** | Prisma en application |
| `presentation/controllers` importa `infrastructure/` | **9 controllers** | **22%** controllers |
| `presentation/routes` importa `infrastructure/` (sin UC) | **2 routers** | exchange_rate, venue_payment_method |
| `domain` importa `infrastructure` | **0** | Domain limpio ✓ |

### 1.2 Use cases: puertos vs legacy

| Patrón | ~Archivos |
|--------|-----------|
| Use cases que importan solo `domain/ports` | **~79** (mayoría) |
| Use cases + violación infra/Prisma | **~10** |
| Flujos que usan `*.service.ts` desde controller | **americano, ranking, matchmaking, monetization, catalog, auth, profile, parametrized_tournament** |

**Conclusión:** la capa application **parece** limpia en volumen, pero los **flujos de mayor valor de negocio staff/backoffice** (bookings, venues, payments, dashboard) concentran las violaciones.

---

## 2. Anti-patrones detectados (todo el API)

### 2.1 God services en application (9)

| Archivo | Imports infra | Rol |
|---------|---------------|-----|
| `monetization.service.ts` | 5 repos | Pagos, obligaciones, summaries |
| `americano.service.ts` | 7 repos | Crear americanos vía repos función |
| `matchmaking.service.ts` | 3 repos | Sugerencias |
| `ranking.service.ts` | 2 repos | Ranking |
| `auth.service.ts` | — (ports mezclados) | Auth legacy |
| `catalog.service.ts` | — | Catálogo |
| `profile.service.ts` | — | Perfil |
| `parametrized_tournament.service.ts` | — | Torneos |
| `services/tournament_format_parameters_validator.service.ts` | — | Validación |

**Regla target:** eliminar todos; sustituir por use cases + orchestrators delgados por bounded context.

### 2.2 `infrastructure/repositories/` vs `adapters/` (doble persistencia)

| Estilo | Archivos | Consumidores típicos |
|--------|----------|----------------------|
| **Adapters** (clase, implementa port) | 59 | Use cases modernos, composition |
| **Repos función** (`findXRepo`) | 15 | God services, controllers, routers |

Los 15 repos función **no implementan ports de forma consistente** (algunos duplican ports existentes, ej. `exchange_rate` tiene port + repo función).

**Regla target:** deprecar `infrastructure/repositories/`; migrar a `adapters/` + mappers; un export por agregado/port.

### 2.3 Composition roots huérfanos o duplicados

**Caso crítico — `bookings.composition.ts` existe pero NO se importa en ningún sitio.**

`bookings.controller.ts` **re-implementa** el mismo wiring inline (PRISMA + repos + lazy singletons).

Lo mismo en espíritu para:
- `reservations.controller.ts` — wiring inline
- `venues.controller.ts` — `court_repository_factory` en controller
- `venue_dashboard.controller.ts` — Prisma + repos en controller
- `list_venue_matches.controller.ts` — repos en controller

**Regla target:** **único** lugar de DI = `presentation/composition/*.composition.ts`; controllers solo importan `*_UC` exportados.

### 2.4 Routers con lógica de aplicación

| Router | Problema |
|--------|----------|
| `exchange_rate.router.ts` | Llama `listByCountrySV` / `upsertManySV` de **infra repo** + `fetch` dolarapi en router |
| `venue_payment_method.router.ts` | CRUD con **PRISMA** y repo función en router |

**Regla target:** router → controller → use case; HTTP externo en infrastructure adapter.

### 2.5 Validación duplicada

| Ubicación | Uso |
|-----------|-----|
| `presentation/validation/*.validation.ts` | Mayoría (Zod) — **correcto** |
| `presentation/validators/booking.schemas.ts` | Solo bookings — **duplicado** |
| `application/validation/` | 1 archivo (tournament format) |
| `domain/validation/` | Vacío |

### 2.6 Entities, value objects y domain services (requerimiento explícito)

| Carpeta | AS-IS | TO-BE (fintech) |
|---------|-------|-----------------|
| `domain/entities/` | 4 archivos planos en raíz | **Por BC** (`entities/booking/`, `entities/payments/`); agregados con invariantes |
| `domain/value_objects/` | Vacío (`.gitkeep`) | **Poblado**: `MoneyAmount`, IDs tipados, `PaymentReference`, etc. |
| `domain/services/` | Vacío (`.gitkeep`) | **Poblado**: servicios de dominio sin IO (fee, pricing, conversión pura si no port) |
| `domain/repositories/` | Vacío (`.gitkeep`) | **Eliminar** — usar solo `domain/ports/` |
| `domain/validation/` | Vacío | Reglas de dominio puras (opcional) o DVAL en `application/validation` |
| `domain/monetization/` | Solo `fee_calculation.ts` | Migrar a `domain/services/payments/` + VO |
| Lógica por feature | `domain/elo/`, `domain/americano/` | Mantener o absorber en `domain/services/{bc}/` |

**Reglas de uso:**

| Tipo | Vive en | Ejemplo |
|------|---------|---------|
| **Value object** | `domain/value_objects/` o `domain/money/` | `MoneyAmount`, `CurrencyCode` |
| **Entity / aggregate** | `domain/entities/{bc}/` | `Reservation`, `PaymentObligation` |
| **Domain service** | `domain/services/{bc}/` | `computeReservationTotalSV(court, duration)` |
| **Port (interface)** | `domain/ports/` | `TransactionRepository` |
| **DTO lectura** | En port o `application/dto/` | `OpenMatchDTO` en port está OK para queries |

**Mappers:** `infrastructure/mappers/` convierten Prisma → `entities` / `value_objects`, nunca al revés en domain.

---

## 3. Bounded contexts (mapa del API)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Wave 0 — Fundaciones                                                    │
│ money (VO), errores, estándar DI, eliminar carpetas vacías, ESLint rule │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│ Wave 1 Payments  │  │ Wave 2 Booking   │  │ Wave 3 Match/Tournament  │
│ + MCP después    │  │ Venue/Court      │  │ Americano, brackets      │
└──────────────────┘  └──────────────────┘  └──────────────────────────┘
         │                      │                        │
         ▼                      ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│ Wave 4 Identity  │  │ Wave 5 Social    │  │ Wave 6 Platform          │
│ Auth, profile    │  │ Chat, notif.     │  │ Ranking, geo, catalog    │
└──────────────────┘  └──────────────────┘  └──────────────────────────┘
```

| BC | Archivos clave violadores | Prioridad fintech |
|----|---------------------------|-------------------|
| **Payments** | monetization.service, confirm UC, transaction.repo, exchange router, payment method router, dashboard | **P0** |
| **Booking/Venue** | bookings.controller, venues.controller, reservations.controller, court repos | **P0** (precio reserva → MCP) |
| **Reporting** | venue_dashboard, venue_transactions | **P0** |
| **Match core** | matches.composition ✓; get_match_payment_info (Prisma) | P1 |
| **Tournament** | parametrized_tournament.service, tournaments.controller (Prisma) | P1 |
| **Americano** | americano.service + controller | P1 |
| **Ranking/Matchmaking** | ranking.service, matchmaking.service | P2 |
| **Notifications/Chat/Auth** | Mayormente composition ✓ | P2 |
| **Receipts** | **Referencia gold** ✓ | Mantener patrón |

---

## 4. Arquitectura objetivo (todo `services/api`)

### 4.1 Estructura de carpetas target (domain completo — entities + value objects)

**Decisión PO:** poblar y usar **`domain/entities`**, **`domain/value_objects`**, **`domain/services`** (domain services, no application services). No dejar carpetas scaffold vacías. **`domain/ports`** sustituye a `domain/repositories` (interfaces de persistencia); no duplicar ambas.

```text
src/
  domain/
    errors/                     # AppError, errores de dominio por BC
    money/                      # VO globales fintech: MoneyAmount, CurrencyCode, ExchangeRateSnapshot
    value_objects/              # VO compartidos o re-export desde money/ y BCs
      identifiers.ts          # tipos fuertes (ReservationId, TransactionId) — según necesidad
    entities/                   # Entidades y agregados (readonly interfaces + enums)
      shared/                   # enums cross-BC si aplica
      booking/                  # Reservation, Court, CourtPricingTier
      payments/                 # PaymentObligation, VenuePaymentMethod, FeeRule (dominio)
      catalog/                  # Sport, Category (si se extraen de ports)
    services/                   # Domain services (lógica sin estado, sin IO)
      payments/                 # FeePolicyService, PaymentAllocationService
      booking/                  # PricingService (total desde court + duration)
    {bounded-context}/          # Lógica pura legacy migrada (elo, americano, bracket…)
      *.ts                      # o subcarpetas si crece
    ports/                      # Contratos persistencia + externos (NO implementaciones)
      booking_repository.ts
      transaction_repository.ts
      money_conversion_service.ts
      ...

  application/
    {bounded-context}/
      use_cases/
      dto/
      *_orchestrator.ts         # opcional, delgado
    # SIN *.service.ts en raíz

  infrastructure/
    adapters/{bc}/              # Prisma*Adapter implements ports
    mappers/
    external/                   # dolarapi, mapbox, fcm
    persistence/                # prisma_client, UoW helpers
    # SIN repositories/ (deprecado)

  presentation/
    composition/                # ÚNICO composition root por feature
    controllers/                # Solo req/res + llamada UC
    validation/                 # Zod único (sin validators/)
    routes/                     # Solo wiring HTTP → controller
    middleware/                 # Único (sin middlewares/)
```

### 4.2 Reglas inviolables (CI)

1. `application` y `domain` **MUST NOT** import from `infrastructure/` o `generated/prisma`.
2. `presentation/controllers` **MUST NOT** import from `infrastructure/` (solo `composition` + `application` + `domain` errors).
3. `presentation/routes` **MUST NOT** import repositories/adapters.
4. Todo endpoint **MUST** tener use case; prohibido `*.service.ts` nuevo.
5. Suma de dinero **MUST** usar `MoneyAmount` (post Wave 0).

### 4.3 Patrón de referencia interno

Copiar **`transaction_receipts`** + **`matches.composition`** + **`booking.use_cases` (ports)** — no copiar **`bookings.controller` wiring inline**.

---

## 5. Relación con changes existentes

| Change | Rol en el programa |
|--------|-------------------|
| **`api-architecture-refactor`** | Programa madre; olas 0–6 |
| **`payment-domain-refactor`** | Subset = **Wave 1** del programa (detalle en `payment-domain-refactor/exploration.md`) |
| **`multi-currency-payments`** | **Después** de Wave 0 + Wave 1; schema MCP sobre dominio limpio |

```text
api-architecture-refactor (Wave 0–1 mínimo)
    └── payment-domain-refactor (detalle BC Payments)
            └── multi-currency-payments (producto multi-moneda)
```

**No** implementar MCP sobre AS-IS: confirmaría Prisma en UC, repos función y agregación `amountTotal × 100`.

---

## 6. Plan de migración (strangler, todo el API)

### Wave 0 — Fundaciones (1 sprint)

- [ ] Documento `ARCHITECTURE.md` en `services/api/` (convenciones + diagrama + árbol domain)
- [ ] ESLint `no-restricted-imports` (application→infra, controllers→infra)
- [ ] `domain/money/` + `domain/value_objects/` (MoneyAmount, CurrencyCode) + tests
- [ ] **Eliminar** `domain/repositories/` (vacío); **poblar** `domain/services/` según BC (empezar payments/booking)
- [ ] Reorganizar `domain/entities/` → `entities/booking/`, `entities/payments/` (mover 4 archivos actuales)
- [ ] Eliminar `presentation/middlewares/`; unificar `presentation/middleware/`
- [ ] Mover `validators/booking.schemas.ts` → `validation/bookings.validation.ts`
- [ ] Inventario endpoints sin composition (9 controllers)

### Wave 1 — Payments BC (1–2 sprints)

Ver `payment-domain-refactor/exploration.md` §6 (6 PRs).
Gate MCP al cerrar Wave 1.

### Wave 2 — Booking & Venue (1–2 sprints)

- [ ] `bookings.controller` usa **solo** `bookings.composition.ts` (borrar wiring duplicado)
- [ ] `reservations.controller`, `venues.controller` → composition
- [ ] `CourtRepository` → adapter implementando port (unificar con `court_repository_factory`)
- [ ] Entities reservation/court enriquecidas o agregados

### Wave 3 — Match & Tournament (1–2 sprints)

- [ ] Eliminar `americano.service.ts` → use cases
- [ ] `tournaments.controller` sin PRISMA directo
- [ ] `parametrized_tournament.service` → use cases

### Wave 4–6 — Resto (priorizar por tráfico)

- [ ] `ranking.service`, `matchmaking.service`
- [ ] `exchange_rate.router`, `venue_payment_method.router` → UC + composition
- [ ] `user_search.controller` → UC
- [ ] Deprecar 15 archivos `infrastructure/repositories/`

**Estimación programa completo API:** 4–6 sprints (equipo 1–2 devs), sin contar mobile/web contract updates.

---

## 7. Manifest de deuda (controllers que requieren refactor)

| Controller | Problema | Acción Wave |
|------------|----------|-------------|
| `bookings.controller.ts` | DI inline; ignora composition | 2 |
| `reservations.controller.ts` | DI inline | 2 |
| `venues.controller.ts` | court factory en controller | 2 |
| `venue_dashboard.controller.ts` | Prisma + repos | 1 (reporting) + 2 |
| `list_venue_matches.controller.ts` | repos en controller | 2 |
| `court_pricing.controller.ts` | PRISMA | 2 |
| `tournaments.controller.ts` | PRISMA | 3 |
| `user_search.controller.ts` | user.repository | 4 |
| `americano.controller.ts` | llama service | 3 |
| `monetization.controller.ts` | service + UC mixto | 1 |

Controllers que **ya** usan composition (~31): mantener; auditar que no importen infra.

---

## 8. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Refactor “big bang” | Olás + strangler; endpoints estables |
| Regresiones | Contrato HTTP tests existentes + aumentar integración en Waves 0–1 |
| 9 services + 15 repos | Tabla de deprecación; borrar solo cuando 0 imports |
| Scope creep | MCP bloqueado hasta gate Wave 1 |
| Equipo confundido con dos carpetas ports/repos | Wave 0 doc + lint |

---

## 9. Decisión recomendada

| Pregunta | Respuesta |
|----------|-----------|
| ¿Solo refactor pagos? | **No** — es síntoma de patrón global |
| ¿Refactor todo el API antes de cualquier feature? | **No** — olas; gate MCP tras Payments + Money |
| ¿Renombrar `ports` a `repositories`? | **No** — mantener hexagonal |
| ¿Cuándo MCP? | Tras Wave 0 + Wave 1 verdes |

**Ready for Proposal:** `sdd-propose` en **`api-architecture-refactor`** (programa) + actualizar **`payment-domain-refactor`** como Wave 1 child.

---

## 10. Próximos pasos SDD

1. `sdd-propose` — `api-architecture-refactor` (programa + olas)
2. `sdd-spec` — requisitos transversales (lint rules, DI, Money)
3. `sdd-design` — dependency graph, ESLint config, template composition
4. `sdd-tasks` — Wave 0 task list
5. Ejecutar Wave 0 → Wave 1 → **entonces** `multi-currency-payments`
