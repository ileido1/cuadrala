# Archive Report — `multi-currency-payments`

| Campo | Valor |
|-------|-------|
| **Change** | `multi-currency-payments` |
| **Archivado** | 2026-05-18 |
| **Estado** | ✅ Implementación código completa (M1–M7) |
| **Verificación** | `verify-report.md` — tests 433/433 ✅ |
| **Gate operativo Fase 1** | Pendiente (staging, backfill prod, flags) — ver `tasks.md` § Gate |

---

## Specs synced → `openspec/specs/`

| Capability | Action |
|------------|--------|
| `multi-currency-payments` | Created — índice / spec madre |
| `money-types` | Created |
| `venue-pricing-currency` | Created |
| `venue-payment-methods-multi-currency` | Created |
| `exchange-rate-by-date` | Created |
| `reservation-payment-aggregation` | Created |
| `venue-fee-rules` | Created |
| `monetization-transactions` | Created |
| `reservation-billing` | Created |
| `backoffice-schedule-ui` | Created |
| `reservation-payment-ledger` | Created |

---

## Archive location

```
openspec/changes/archive/2026-05-18-multi-currency-payments/
├── archive-report.md
├── verify-report.md
├── proposal.md
├── design.md
├── design-notes.md
├── migrations.md
├── spec.md
├── tasks.md
└── specs/
```

**Active changes:** `openspec/changes/multi-currency-payments/` — **eliminado** (movido a archive).

---

## Referencias actualizadas

| Archivo | Cambio |
|---------|--------|
| `services/api/ARCHITECTURE.md` | MCP archivado + link `openspec/specs/` |
| `openspec/specs/money-value-objects/spec.md` | Link a `money-types` vigente |
| `openspec/specs/api-layer-boundaries/spec.md` | Link MCP → specs vigentes |
| `AGENTS.md` | Entrada archive MCP |

---

## Entregables implementados (resumen)

- **Fase 1:** schema MCP, backfill, dominio conversión, confirmación staff, API `MoneyAmount`, UI web/mobile parcial.
- **Fase 2:** `ReservationPaymentLedger`, backfill ledger, conciliación (`npm run reconcile:reservation-ledger`), API ajustes compensatorios staff.
- **Flags:** `MULTI_CURRENCY_PAYMENTS`, `RESERVATION_PAYMENT_LEDGER`.

---

## SDD cycle complete

Change archivado; specs de producto en `openspec/specs/`. Gate de release Fase 1 sigue siendo operativo (no bloquea archive de SDD).
