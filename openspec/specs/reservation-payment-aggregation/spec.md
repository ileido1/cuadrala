# Capability: reservation-payment-aggregation

**Fase:** 1 (MVP) + extensiones Fase 2  
**Schema:** `Reservation` en `services/api/prisma/schema.prisma` (AS-IS: `paidAmountCents`, `paymentStatus` ~668–672)

## Propósito

Agregar pagos confirmados en la **moneda de pricing** de la reserva y derivar `paymentStatus` sin mezclar monedas.

## Requirements

### REQ-MCP-023 — paidAmountMinor en pricingCurrency

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`Reservation.paidAmountMinor` MUST representar el total pagado acumulado en `Reservation.pricingCurrency` (minor units). MUST reemplazar semántica de `paidAmountCents` sin moneda implícita.

**Given** sede USD, pago confirmado equivalente a 25 USD  
**When** se recalcula agregado  
**Then** `paidAmountMinor` MUST incrementar en minor USD, no en BS.

---

### REQ-MCP-024 — paymentStatus

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`paymentStatus` MUST derivarse comparando `paidAmountMinor` vs `totalAmountMinor` en la misma moneda: `UNPAID` (0), `PARTIAL` (0 < paid < total), `PAID` (paid ≥ total).

**Given** `totalAmountMinor = 10000`, `paidAmountMinor = 5000`, misma currency  
**When** se persiste reserva  
**Then** `paymentStatus` MUST ser `PARTIAL`.

---

### REQ-MCP-025 — Agregación tras conversión

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Al confirmar liquidación en moneda distinta a `pricingCurrency`, el incremento a `paidAmountMinor` MUST ser `Transaction.appliedToObligationMinor` (en moneda de obligación), no el monto bruto de liquidación.

**Given** obligación pendiente 50 USD y pago 2.750.000 BS con tasa del día de reserva  
**When** confirmación exitosa  
**Then** `paidAmountMinor` MUST aumentar en USD convertido (cap al pendiente), y MUST existir `CurrencyConversionRecord`.

---

### REQ-MCP-026 — Prohibición suma ciega

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Repositorios y servicios MUST NOT sumar `Transaction.amountTotal` (Decimal major AS-IS) ni `settlementAmountMinor` cross-currency para actualizar `paidAmountMinor`.

**Given** dos transacciones confirmadas USD y BS sin conversión  
**When** job de agregación legacy ejecuta suma numérica  
**Then** MUST estar deshabilitado o sustituido por lógica con moneda explícita.

---

### REQ-MCP-027 — Sobrepago

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | 1 |

Si `allowOverpayment = false`, pago que exceda obligación pendiente MUST rechazarse con `422 SOBREPAGO_NO_PERMITIDO` salvo tolerancia `overpaymentToleranceMinor`.

**Given** pendiente 10 USD minor, pago aplicable 15 USD  
**When** `allowOverpayment = false`  
**Then** MUST 422 sin actualizar `paidAmountMinor`.

---

### REQ-MCP-028 — paidAmountBsMinor (Fase 2)

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | **2** |

`Reservation.paidAmountBsMinor` MAY persistir suma derivada en BS solo para reporting platform; MUST NOT usarse como fuente para `paymentStatus` en Fase 1.

**Given** Fase 2 activa y reserva con pagos mixtos  
**When** dashboard platform agrega revenue  
**Then** MAY sumar `paidAmountBsMinor` entre reservas; MUST NOT sumar `paidAmountMinor` cross-currency.
