# Capability: reservation-billing (MODIFIED)

**Fase:** 1 (MVP)  
**Schema:** `Reservation`, `Court`, `Transaction` en `services/api/prisma/schema.prisma`

## Propósito

Calcular total de reserva desde precio de cancha en moneda de sede y vincular obligación de pago.

## Requirements

### REQ-MCP-041 — Cálculo totalAmountMinor

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Al crear reserva (booking), `totalAmountMinor` MUST calcularse como:

`round(pricePerHourMinor * (durationMinutes / 60))`

usando tier/cancha vigente; moneda = `venue.pricingCurrency`.

**Given** cancha 850000 minor/hora USD y duración 90 min  
**When** POST booking  
**Then** `totalAmountMinor` MUST ser `1275000` minor USD (redondeo half-up).

---

### REQ-MCP-042 — Migración totalAmountCents

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Backfill MUST setear `totalAmountMinor = totalAmountCents` y `pricingCurrency` desde venue cuando semántica sea coherente.

**Given** reserva histórica con `totalAmountCents = 9000`  
**When** migración  
**Then** `totalAmountMinor` MUST ser `9000` con `pricingCurrency` del venue.

---

### REQ-MCP-043 — Obligación Transaction al booking

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | 1 |

Si el flujo crea `Transaction` PENDING al reservar, `obligationTotalMinor` MUST incluir fee de `VenueFeeRule` cuando scope aplique a `RESERVATION`.

**Given** reserva con fee 10%  
**When** se crea transacción pendiente  
**Then** `obligationTotalMinor` MUST ser base + fee en `pricingCurrency`.

---

### REQ-MCP-044 — needsReview flag migración

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | 1 |

Transacciones/reservas con ambigüedad venue USD + montos legacy MAY marcarse `needsReview` para revisión manual (< 5% objetivo).

**Given** backfill detecta `amountTotal` major incompatible con centavos  
**When** script de validación  
**Then** MUST listar fila para revisión sin bloquear MVP en filas no críticas.
