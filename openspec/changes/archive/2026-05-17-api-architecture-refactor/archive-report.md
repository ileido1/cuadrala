# Archive Report — `api-architecture-refactor`

| Campo | Valor |
|-------|-------|
| **Change** | `api-architecture-refactor` |
| **Archivado** | 2026-05-17 |
| **Modo** | hybrid (filesystem + Engram) |
| **Estado** | ✅ Cerrado — SDD cycle complete |
| **Verificación** | `verify-report.md` Wave 7 — lint ✅, tests 427/427 ✅ |

---

## Engram traceability (observation IDs)

| Artefacto | topic_key | Observation ID |
|-----------|-----------|----------------|
| proposal | `sdd/api-architecture-refactor/proposal` | #189 |
| design | `sdd/api-architecture-refactor/design` | #190 |
| spec | `sdd/api-architecture-refactor/spec` | #191 |
| tasks | `sdd/api-architecture-refactor/tasks` | #192 |
| verify-report | *(filesystem only)* | — |
| archive-report | `sdd/api-architecture-refactor/archive-report` | #194 |

---

## Specs synced → `openspec/specs/`

| Domain | Action | Detalle |
|--------|--------|---------|
| `api-composition-root` | Created | Spec completo (olas 0–6 + Wave 7 ADDED) |
| `api-layer-boundaries` | Created | Spec completo + Wave 7 export-repo |
| `infrastructure-adapters-only` | Created | Spec completo + mapper colocado |
| `venue-staff-authorization-uc` | Created | Capability Wave 7 P1 |
| `api-architecture-closure` | Created | Cierre P2–P6 Wave 7 |
| `money-value-objects` | Created | Wave 0 fundación |
| `presentation-validation-unified` | Created | Wave 0 validation |
| `domain-folder-structure` | Created | Layout domain |

**Nota:** No existían specs main previas (`openspec/specs/` solo `.gitkeep`). Se copió cada delta como fuente de verdad.

---

## Archive location

```
openspec/changes/archive/2026-05-17-api-architecture-refactor/
├── archive-report.md      ← este archivo
├── proposal.md
├── design.md
├── exploration.md
├── spec.md
├── tasks.md
├── verify-report.md
└── specs/                 ← deltas históricos (copia en archive)
```

**Active changes:** `openspec/changes/api-architecture-refactor/` — **eliminado** (movido a archive).

---

## Referencias actualizadas

| Archivo | Cambio |
|---------|--------|
| `AGENTS.md` | Refactor activo → reglas vigentes + link archive |
| `services/api/ARCHITECTURE.md` | Links a archive + `openspec/specs/` |
| `openspec/specs/money-value-objects/spec.md` | Link MCP corregido tras move |

---

## Programme outcome (Wave 0–7)

- Clean Architecture gates: ESLint capas, composition roots, adapters-only
- Wave 7: `AssertVenueStaffAccessUseCase`, 0× `application/services/*.service.ts`, scaffolds P3 eliminados, mappers piloto, DI Prisma gold compositions
- **Deuda residual documentada** en `verify-report.md` (~70 adapters sin ctor prisma — incremental post-programa)

---

## SDD cycle complete

Listo para iniciar changes hijos sin deuda estructural del programa madre (p. ej. `multi-currency-payments` tras gate Wave 0+1).
