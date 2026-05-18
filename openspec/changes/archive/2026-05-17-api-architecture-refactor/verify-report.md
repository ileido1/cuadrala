# Verify Report — Wave 7 (Cierre deuda arquitectónica)

| Campo | Valor |
|-------|-------|
| **Programa** | `api-architecture-refactor` |
| **Fase** | Wave 7 |
| **Fecha** | 2026-05-17 |
| **Estado** | ✅ Verificado en código |

---

## Criterios de aceptación

| ID | Criterio | Verificación | Estado |
|----|----------|--------------|--------|
| P1 | `venue_dashboard.controller` sin `VENUE_STAFF_REPOSITORY` | `rg VENUE_STAFF_REPOSITORY presentation/controllers/venue_dashboard` → 0 | ✅ |
| P1 | `AssertVenueStaffAccessUseCase` en 5 handlers dashboard | `assert_venue_staff_access.use_case.ts` + tests | ✅ |
| P1 | Sin `export { VENUE_STAFF_REPOSITORY }` en `venue_dashboard.composition` | `rg "export.*VENUE_STAFF" presentation/composition/venue_dashboard` → 0 | ✅ |
| P3 | 5 carpetas scaffold eliminadas | `domain/repositories`, `domain/validation`, `infrastructure/db`, `infrastructure/legacy`, `infrastructure/repositories` | ✅ |
| P3 | `ARCHITECTURE.md` §3.1 carpetas prohibidas | Documentado | ✅ |
| P5 | 0× `application/services/*.service.ts` | `find ... -name '*.service.ts'` → 0 | ✅ |
| P5 | Ledger → `RecordReservationLedgerEntryUseCase` | UC + composition | ✅ |
| P5 | Validador torneo → `domain/services/tournament/` | `DefaultTournamentFormatParametersValidator` | ✅ |
| P4 | Mappers piloto transaction + reservation | `prisma_payment_transaction_mapper.ts`, `prisma_reservation_mapper.ts` + tests | ✅ |
| P4 | Convención mapper en `ARCHITECTURE.md` §3.4 | Documentado | ✅ |
| P6 | DI Prisma en compositions gold | `PRISMA` en venue_dashboard, transaction_receipts, matches, monetization + ctors adapters | ✅ |
| P6 | `ARCHITECTURE.md` §3.5 DI Prisma | Documentado | ✅ |
| Gate | `npm run lint` | exit 0 | ✅ |
| Gate | `npm test` | **427/427** passed | ✅ |

---

## Comandos de verificación

```bash
cd services/api

# P1
rg "VENUE_STAFF_REPOSITORY" src/presentation/controllers/venue_dashboard.controller.ts
rg "export.*VENUE_STAFF_REPOSITORY" src/presentation/composition/venue_dashboard.composition.ts

# P3
test ! -d src/domain/repositories
test ! -d src/infrastructure/repositories

# P5
find src/application/services -name '*.service.ts' | wc -l   # → 0

# Pipeline
npm run lint && npm test
```

---

## Deuda residual (fuera de Wave 7)

| Item | Notas |
|------|-------|
| Adapters sin ctor `PrismaClient` | ~70 adapters aún importan `PRISMA` internamente; migración incremental post-Wave 7 |
| `application/services/assert_match_court_slot_available.ts` | Helper sin sufijo `.service.ts`; aceptable |
| ESLint `export *_REPOSITORY` | No aplicado (0 exports actuales); opcional en PR6-T04 |

---

## Listo para archive

Wave 7 cumple criterios del programa. Proceder con `sdd-archive` de `api-architecture-refactor` cuando el equipo confirme merge a `main`.
