# Capability: monetization-transactions (MODIFIED)

**Fase:** 1 (MVP)  
**Schema:** `Transaction`, `CurrencyConversionRecord` en `services/api/prisma/schema.prisma` (AS-IS `Transaction` ~788–818)

## Propósito

Obligaciones y confirmación manual con monedas explícitas; deprecar suma ciega de `amountBase`/`amountTotal` (Decimal major).

## Requirements

### REQ-MCP-034 — Campos de obligación

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`Transaction` MUST persistir `obligationCurrency`, `obligationAmountMinor`, `feeAmountMinor`, `obligationTotalMinor`, `pricingCurrency` (copia de reserva).

**Given** reserva con total y fee calculados  
**When** se crea `Transaction` PENDING  
**Then** montos MUST estar en `reservation.pricingCurrency`.

---

### REQ-MCP-035 — Campos de liquidación al confirmar

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Al confirmar, MUST setear `settlementCurrency`, `settlementAmountMinor`, `appliedToObligationMinor`, `venuePaymentMethodId`, `confirmedAt`, `status = CONFIRMED`.

**Given** confirmación manual válida  
**When** use case completa  
**Then** `settlementAmountMinor` MUST reflejar lo ingresado por staff en moneda del medio.

---

### REQ-MCP-036 — Deprecar amountTotal para agregación

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`updateReservationPaymentFromTransactionRepo` y equivalentes MUST NOT usar `amountTotal` × 100 como única fuente; MUST usar `appliedToObligationMinor` en moneda de pricing.

**Given** transacción legacy con `amountTotal` major inconsistente  
**When** dual-read activo  
**Then** lectura prioritaria MUST ser campos `*Minor` + currency.

---

### REQ-MCP-037 — Confirmación manual API

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`PATCH /api/v1/transactions/:transactionId/confirm-manual` (y ruta venue staff equivalente) MUST aceptar body:

```json
{
  "venuePaymentMethodId": "uuid",
  "settlementAmount": { "amountMinor": "2750000", "currencyCode": "BS" },
  "referenceNumber": "optional"
}
```

**Given** staff confirma con método y monto válidos  
**When** PATCH exitoso  
**Then** MUST retornar breakdown con `MoneyAmount` y `paymentStatus` actualizado de reserva.

---

### REQ-MCP-038 — Misma moneda sin conversión record opcional

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Si `settlementCurrency === obligationCurrency`, `appliedToObligationMinor = min(settlementAmountMinor, remainingObligation)`; `CurrencyConversionRecord` MAY omitirse si no hay conversión cross-currency; `amountBsMinor` MUST calcularse si `pricingCurrency !== BS` para reporting.

**Given** sede USD, pago USD mismo método  
**When** confirmación  
**Then** MUST actualizar agregados sin error de tasa USD→USD.

---

### REQ-MCP-039 — Cross-currency obligatorio conversión

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Si monedas difieren, MUST invocar `MoneyConversionService`, crear `CurrencyConversionRecord`, y fallar con `CONVERSION_REQUIRED` solo si el flujo no puede resolver tasa (ver `TASA_NO_DISPONIBLE`).

**Given** obligación USD y liquidación BS  
**When** tasa del día de reserva existe  
**Then** MUST persistir record y montos aplicados.

---

### REQ-MCP-040 — Transacción ya confirmada

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Re-confirmación MUST responder `409 TRANSACCION_YA_CONFIRMADA`.

**Given** `Transaction.status = CONFIRMED`  
**When** segundo PATCH confirm  
**Then** MUST 409 sin mutar montos.

---

### REQ-MCP-041 — Summary match con MoneyAmount (jugador)

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 (ext. `mobile-player-alignment`) |
| **Change** | `mobile-player-alignment` (archivado 2026-05-18) |

`GET /api/v1/matches/:matchId/transactions/summary` MUST incluir `pricingCurrency` y campos `*Money` (`totalAmountMoney`, `totalAmountBaseMoney`, `totalFeeAmountMoney`) con `amountMinor` + `currencyCode`. Strings legacy (`totalAmount`, etc.) MAY permanecer para compatibilidad.

**Given** partida con transacciones en moneda de pricing USD  
**When** jugador o cliente consume summary  
**Then** `totalAmountMoney.currencyCode` MUST ser `USD`.

---

### REQ-MCP-042 — Mobile MUST NOT confirm-manual

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 (ext. `mobile-player-alignment`) |

`apps/mobile` MUST NOT invocar `PATCH .../confirm-manual`. Confirmación staff permanece en `apps/web`.

**Given** build mobile post `mobile-player-alignment`  
**When** búsqueda estática en `apps/mobile`  
**Then** MUST NOT existir `confirm-manual` ni `confirmTransactionManual`.
