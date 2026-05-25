# Verify report: web-pending-payments-queue

**Fecha:** 2026-05-25

## API

| Check | Resultado |
|-------|-----------|
| `npm test` mapper pending row | PASS (2 tests) |
| `npm run typecheck` repo completo | FAIL preexistente (exchange_rates, tournaments, player_profile mocks) — no bloquea este change |

## Web

| Check | Resultado |
|-------|-----------|
| `npm run build` | PASS |
| Lint payments page / list / drawer | Sin errores |

## Criterios spec

- [x] Pending lista con payer, label, monto, receipt flag
- [x] Preview imagen en drawer
- [x] Confirm vía wizard cuando hay reserva
- [x] Test mapper pending shape
- [ ] Contract HTTP pending (opcional)
- [ ] E2E confirm → mobile CONFIRMED (manual QA)

## Notas

Staff sin `reservationId` en la transacción ve aviso en drawer; confirmación completa requiere agenda o mejora futura por `transactionId`.
