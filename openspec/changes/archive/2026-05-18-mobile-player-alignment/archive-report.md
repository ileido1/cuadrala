# Archive Report — `mobile-player-alignment`

| Campo | Valor |
|-------|-------|
| **Change** | `mobile-player-alignment` |
| **Archivado** | 2026-05-18 |
| **Estado** | ✅ Implementación M1–M4 completa |
| **Verificación** | `verify-report.md` — **PASS** |
| **Tests** | API 452/452 ✅ · Mobile 102/102 ✅ |
| **E2E manual** | Pendiente — [`manual-test-checklist.md`](./manual-test-checklist.md) |

---

## Specs synced → `openspec/specs/`

| Capability | Action |
|------------|--------|
| `mobile-player-alignment` | Created — índice / spec madre |
| `mobile-player-only-surface` | Created |
| `mobile-player-match-reservation` | Created |
| `mobile-player-payments-ux` | Created |
| `mobile-venue-opening-hours-client` | Created |
| `monetization-transactions` | Modified — REQ-MCP-041, REQ-MCP-042 |
| `multi-currency-payments` | Modified — nota alcance mobile jugador |

---

## Archive location

```
openspec/changes/archive/2026-05-18-mobile-player-alignment/
├── archive-report.md
├── verify-report.md
├── manual-test-checklist.md
├── proposal.md
├── exploration.md
├── design.md
├── spec.md
├── tasks.md
└── specs/
    ├── mobile-player-only-surface.md
    ├── mobile-player-match-reservation.md
    ├── mobile-player-payments-ux.md
    └── mobile-venue-opening-hours-client.md
```

**Active changes:** `openspec/changes/mobile-player-alignment/` — **eliminado** (movido a archive).

---

## Referencias actualizadas

| Archivo | Cambio |
|---------|--------|
| `AGENTS.md` | Entrada archive mobile-player-alignment |
| `openspec/specs/mobile-player-alignment/spec.md` | Índice capabilities vigentes |
| `openspec/specs/monetization-transactions/spec.md` | Summary match MoneyAmount + exclusión mobile confirm-manual |
| `openspec/specs/multi-currency-payments/spec.md` | Nota mobile jugador-only |

---

## Entregables implementados (resumen)

| Fase | Entregable |
|------|------------|
| **M1** | Eliminados `backoffice_reservations`, `payments` staff, ruta schedule, DI staff |
| **M2** | `POST /matches` atómico + reserva `MATCH` `PUBLISHED`; mobile `durationMinutes: 90`; test integración |
| **M3** | `payment-methods`, `MoneyAmount` en summary, waiting poll, sin `confirm-manual` mobile |
| **M4** | `core/venue/opening_hours.dart`, `VenueDto.openingHours`, picker acotado |

---

## Deuda documentada (no bloquea archive)

1. Checklist E2E manual humano.
2. REQ-MPMR-008 — test mobile cubit 409 create match (P1).
3. `npm run typecheck` API — mocks preexistentes en tests ajenos.

---

## SDD cycle complete

Change archivado; specs de producto mobile jugador en `openspec/specs/mobile-player-*`. Gate E2E manual sigue siendo operativo (no bloquea archive SDD).
