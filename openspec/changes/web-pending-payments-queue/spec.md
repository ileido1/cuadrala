# Spec: web-pending-payments-queue

## Requirements

### REQ-WPPQ-001 — Cola pendientes staff
Staff autenticado de la sede MUST listar transacciones `PENDING` en `/dashboard/payments` (tab Pendientes).

### REQ-WPPQ-002 — Detalle y comprobante
Al abrir un ítem, MUST mostrar jugador, contexto (cancha/horario), monto obligación y preview del comprobante si existe.

### REQ-WPPQ-003 — Acceso staff a comprobante
`GET /transactions/:id/receipt/:receiptId` MUST permitir lectura a staff de la sede de la transacción.

### REQ-WPPQ-004 — Confirmar con wizard
Confirmación MUST usar wizard multi-moneda (`confirm-manual`), no PATCH vacío.

### REQ-WPPQ-005 — Rechazar
Staff MAY rechazar con `reject-manual` desde el detalle.

## Acceptance
- [x] Pending lista con payer, label, monto, receipt flag
- [x] Preview imagen en drawer
- [ ] Confirm → mobile ve CONFIRMED (QA manual)
- [x] Tests mapper pending shape
- [ ] Contract pending shape (opcional)
