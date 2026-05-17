# Capability: venue-fee-rules

**Fase:** 1 (MVP)  
**Schema:** `VenueFeeRule` (nuevo), `FeeRule` AS-IS (~774–785) en `services/api/prisma/schema.prisma`

## Propósito

Comisión de servicio negociada **por sede** en la misma moneda que el pricing de la cancha.

## Requirements

### REQ-MCP-029 — VenueFeeRule por venueId

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

El sistema SHALL persistir `VenueFeeRule` con `venueId`, `scope` (`FeeScope`), `type` (`PERCENTAGE` | `FIXED`), `value`, `currencyCode`, `isActive`.

**Given** venue con regla activa `PERCENTAGE` 10%  
**When** se calcula obligación de reserva  
**Then** MUST usar regla del venue antes que `FeeRule` global.

---

### REQ-MCP-030 — currencyCode = pricingCurrency

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`VenueFeeRule.currencyCode` MUST igualar `venue.pricingCurrency` en create/update; mismatch MUST `400 MONEDA_INCOMPATIBLE`.

**Given** venue `pricingCurrency = EUR`  
**When** staff crea fee con `currencyCode = USD`  
**Then** MUST rechazar.

---

### REQ-MCP-031 — Cálculo PERCENTAGE

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Para `type = PERCENTAGE`, `feeMinor = round(totalAmountMinor * value / 100)` en minor de pricing; `obligationTotalMinor = totalAmountMinor + feeMinor`.

**Given** `totalAmountMinor = 850000` USD y fee 10%  
**When** preview de obligación  
**Then** `feeMinor` MUST ser `85000` y total obligación `935000` minor USD.

---

### REQ-MCP-032 — Cálculo FIXED

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | 1 |

Para `type = FIXED`, `value` MUST interpretarse como monto fijo en **minor units** de `currencyCode`.

**Given** fee fijo 500 minor BS  
**When** total reserva 10000 minor BS  
**Then** obligación total MUST ser 10500 minor BS.

---

### REQ-MCP-033 — Fallback FeeRule global

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | 1 |

Si no existe `VenueFeeRule` activa para el `scope`, el sistema MAY aplicar `FeeRule` global existente; conversión de moneda global a pricing MUST documentarse en diseño si aplica.

**Given** venue sin regla y `FeeRule` global 5% MATCH  
**When** se crea obligación  
**Then** MUST aplicar 5% en `pricingCurrency` de la reserva.
