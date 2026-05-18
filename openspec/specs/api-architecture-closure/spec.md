# Capability: api-architecture-closure

**Programa:** `api-architecture-refactor`  
**Ola:** Wave 7 — Cierre P2–P6  
**Alcance:** Housekeeping transversal en `services/api` — documentación, scaffolds, mappers, migración `application/services`, DI Prisma, verify-report

## Purpose

Cerrar deuda residual del programa madre sin reabrir migraciones masivas de BC. Wave 7 entrega métricas TO-BE verificables: docs alineados al código, cero scaffolds prohibidos, cero `application/services/*.service.ts`, convención mapper aplicada en paths críticos, DI Prisma unificada en compositions referencia, y `verify-report.md` firmado para archive del change.

## Requirements

### Requirement: Documentación AS-IS alineada post olas 0–6 (P2)

`services/api/ARCHITECTURE.md` y artefactos del programa (archivados en `openspec/changes/archive/2026-05-17-api-architecture-refactor/`: `exploration.md`, `proposal.md`, `tasks.md`) MUST describir el estado **actual** del código tras olas 0–7, no el AS-IS inicial (9 god services, 15 repos función, controllers con Prisma inline).

#### Scenario: ARCHITECTURE sin deuda cerrada como vigente

- GIVEN Wave 7 docs PR mergeado
- WHEN un lector busca en `ARCHITECTURE.md` referencias a "9 services" o "15 repositories" como estado presente
- THEN MUST encontrar solo contexto histórico etiquetado (pasado) o cero menciones como AS-IS
- AND MUST documentar patrón vigente: composition roots, adapters, ports, UC

#### Scenario: AGENTS.md coherente si aplica

- GIVEN `AGENTS.md` en raíz del monorepo menciona arquitectura API
- WHEN Wave 7 cierra P2
- THEN referencias a estructura legacy MUST actualizarse o eliminarse

---

### Requirement: Eliminación de carpetas scaffold prohibidas (P3)

Las siguientes rutas bajo `services/api/src/` MUST eliminarse del repositorio (directorio completo, incluido `.gitkeep` si existe):

| # | Ruta exacta |
|---|-------------|
| 1 | `domain/repositories/` |
| 2 | `domain/validation/` |
| 3 | `infrastructure/db/` |
| 4 | `infrastructure/legacy/` |
| 5 | `infrastructure/repositories/` |

`ARCHITECTURE.md` MUST listar estas rutas como **prohibidas** para nuevos archivos. Reintroducir cualquiera MUST fallar en revisión de programa.

#### Scenario: Directorios ausentes tras W7-PR3

- GIVEN merge de W7-PR3
- WHEN `test ! -d src/domain/repositories` (y análogos para las 5 rutas)
- THEN los cinco directorios MUST NOT existir

#### Scenario: Cero imports a rutas eliminadas

- GIVEN scaffolds eliminados
- WHEN `rg "domain/repositories|domain/validation|infrastructure/db|infrastructure/legacy|infrastructure/repositories" services/api/src`
- THEN MUST haber **0** imports activos (salvo mención en comentarios de migración en docs, no en código fuente)

#### Scenario: domain-folder-structure coherente

- GIVEN `domain-folder-structure` spec exige no `domain/repositories/`
- WHEN Wave 7 P3 completa
- THEN eliminación MUST cumplir también `domain/validation/` vacío (no confundir con `presentation/validation/`)

---

### Requirement: Convención mapper documentada y piloto (P4)

Wave 7 MUST adoptar convención **B (default):** funciones de mapeo Prisma → dominio en archivo colindante `*_mapper.ts` junto al adapter bajo `infrastructure/adapters/`. Extracción piloto MUST aplicarse en al menos:

| Adapter / BC | Criterio piloto |
|--------------|-----------------|
| Transacciones / payments | Adapter con mapping >80 LOC o inline denso |
| Reservas / booking | Idem |

`ARCHITECTURE.md` MUST documentar:

- Mappers colocados en adapter (`prisma_*_mapper.ts`) — **patrón default Wave 7**
- Carpeta global `infrastructure/mappers/{bc}/` — **objetivo incremental** post-cierre, no obligatorio para todos los adapters en Wave 7
- `presentation/mappers/` — MUST NOT usarse para persistencia Prisma → domain (solo HTTP DTO si aplica)
- `domain/services/money/` — solo lógica de dominio sin Prisma

#### Scenario: Piloto transaction

- GIVEN adapter de transacción/receipts con mapping inline
- WHEN W7-PR4 mergea
- THEN MUST existir `infrastructure/adapters/prisma_*_mapper.ts` (nombre exacto per design) con funciones puras invocadas por el adapter
- AND adapter MUST NOT retornar tipos Prisma a application

#### Scenario: Piloto reservation/booking

- GIVEN adapter de reserva o ledger con mapping inline sustancial
- WHEN W7-PR4 mergea
- THEN extracción mínima equivalente MUST existir para el segundo piloto

#### Scenario: Sin big-bang

- GIVEN ~77 adapters en codebase
- WHEN se audita Wave 7
- THEN solo los dos pilotos anteriores son obligatorios; el resto MAY permanecer inline hasta change futuro

---

### Requirement: Migración application/services (P5)

Tras Wave 7, `services/api/src/application/services/*.service.ts` MUST ser **0 archivos**.

| Archivo AS-IS | Destino obligatorio | Criterio de decisión |
|---------------|---------------------|----------------------|
| `reservation_ledger.service.ts` | `RecordReservationLedgerEntryUseCase` en `application/use_cases/` (nombre MAY ajustarse en design si equivalente) | Tiene IO vía `ReservationLedgerRepository` — MUST ser UC con port inyectado |
| `tournament_format_parameters_validator.service.ts` | `domain/services/tournament/` (implementación pura del port) **preferido** | Sin IO; validación de reglas de negocio; implementa `TournamentFormatParametersValidator` |

`application/services/assert_match_court_slot_available.ts` (sin sufijo `.service.ts`) MAY permanecer o moverse a `domain/services/` en el mismo PR si el design lo agrupa; NO cuenta para métrica `*.service.ts`.

#### Scenario: reservation_ledger — UC reemplaza service

- GIVEN `ConfirmTransactionAsVenueStaffUseCase` (u otros) inyectan `ReservationLedgerService`
- WHEN W7-PR2 mergea
- THEN consumidores MUST inyectar el UC (o port + UC) desde composition
- AND `reservation_ledger.service.ts` MUST NOT existir
- AND tests en `reservation_ledger.service.test.ts` MUST migrar a tests del UC

#### Scenario: tournament validator — domain service

- GIVEN `TournamentFormatParametersValidatorService` en application
- WHEN W7-PR2 mergea
- THEN implementación MUST vivir bajo `domain/services/tournament/` (o subpath acordado en design)
- AND `tournaments.composition.ts` y `application/validation/tournament_format_parameters.data_validate.ts` MUST importar desde domain, no desde `application/services/`
- AND domain MUST NOT importar infrastructure

#### Scenario: Métrica cero services

- GIVEN cierre P5
- WHEN `find services/api/src/application/services -name '*.service.ts'`
- THEN MUST retornar vacío

#### Scenario: TDD P5

- GIVEN strict TDD del programa
- WHEN se migra cada archivo
- THEN tests existentes MUST pasar en verde tras refactor (Red-Green en PR2)

---

### Requirement: DI Prisma unificado en composition (P6)

Compositions referencia MUST seguir un único patrón:

1. Obtener cliente: `import { PRISMA } from '../../infrastructure/prisma_client.js'` **o** `const prisma = getPrismaClient()` desde el mismo módulo canónico.
2. Instanciar adapters: `new PrismaXAdapter(PRISMA)` — **MUST** pasar prisma por constructor.
3. **MUST NOT** añadir en compositions nuevos `new PrismaXAdapter()` sin argumentos.

Compositions gold a alinear en Wave 7 (mínimo):

- `presentation/composition/transaction_receipts.composition.ts`
- `presentation/composition/matches.composition.ts`
- `presentation/composition/venue_dashboard.composition.ts`

`ARCHITECTURE.md` MUST incluir sección "DI Prisma" con el patrón anterior.

#### Scenario: transaction_receipts recibe prisma por ctor

- GIVEN `PrismaTransactionReceiptRepository` acepta `PrismaClient` en constructor (per design)
- WHEN `transaction_receipts.composition.ts` se alinea
- THEN instancias de adapters de receipts MUST usar `PRISMA` compartido, no singleton implícito dentro del adapter

#### Scenario: matches composition gold

- GIVEN `matches.composition.ts` con múltiples adapters
- WHEN W7-PR5 mergea
- THEN todos los `new Prisma*Adapter(...)` en ese archivo MUST recibir el mismo cliente prisma explícito

#### Scenario: Prohibición en compositions nuevos

- GIVEN PR posterior a Wave 7 añade composition
- WHEN instancia adapters Prisma
- THEN MUST usar patrón documentado; review MUST rechazar adapter sin prisma en ctor

---

### Requirement: Verify-report y gates de programa (P2 + cierre)

Al completar Wave 7 (PR1–PR6), MUST existir `verify-report.md` en el programa archivado (`openspec/changes/archive/2026-05-17-api-architecture-refactor/verify-report.md`) con checklist firmado alineado a success criteria del proposal.

#### Scenario: Pipeline API verde

- GIVEN Wave 7 completo
- WHEN `cd services/api && npm run typecheck && npm run lint && npm test`
- THEN MUST exit 0 en rama de cierre

#### Scenario: verify-report checklist

- GIVEN `verify-report.md` Wave 7
- WHEN se audita programa
- THEN MUST marcar ✓ cada ítem de success criteria del proposal (P1 export repo, P3 carpetas, P5 services, docs, tests)

## Casos límite

| Caso | Regla |
|------|-------|
| Carpeta scaffold con archivo olvidado | No eliminar hasta mover código; P3 bloqueado si hay `.ts` no migrado |
| `data_validate` instancia validator inline | Tras P5, MUST usar función/clase de domain, no `new ...Service()` en application |
| Adapter legacy sin ctor prisma | Alinear solo gold list; resto documentado como deuda menor en verify-report |
| ESLint export-repo (P6b opcional) | Si se activa, MUST auditar `grep export.*REPOSITORY presentation/composition` antes — `venue_dashboard` es caso obligatorio; otros exports MAY quedar con excepción documentada hasta change futuro |

## Criterios verificables (proposal)

- [ ] `application/services/*.service.ts` → 0
- [ ] 5 carpetas P3 eliminadas y prohibidas en ARCHITECTURE
- [ ] ARCHITECTURE sin AS-IS pre-olas como vigente
- [ ] 2 pilotos mapper + doc convención
- [ ] ≥3 compositions con DI Prisma explícito (receipts, matches, venue_dashboard)
- [ ] `verify-report.md` Wave 7 listo para `sdd-archive`

## Dependencias DAG (referencia)

```text
W7-PR1 (P1) ──┬──► W7-PR6 (docs + verify)
W7-PR2 (P5)  ──┤
W7-PR3 (P3)  ──┼──► W7-PR4 (P4) ──► W7-PR5 (P6)
```
