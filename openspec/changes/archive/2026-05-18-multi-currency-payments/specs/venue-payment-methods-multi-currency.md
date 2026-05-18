# Capability: venue-payment-methods-multi-currency

**Fase:** 1 (MVP)  
**Schema:** `VenuePaymentMethod` en `services/api/prisma/schema.prisma` (AS-IS líneas ~67–81)

## Propósito

Medios de pago por sede con moneda de **liquidación** explícita; permitir varios medios del mismo `type` en distintas monedas.

## Requirements

### REQ-MCP-012 — settlementCurrency obligatorio

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Cada `VenuePaymentMethod` MUST tener `settlementCurrency: CurrencyCode` indicando la moneda en que el venue recibe fondos por ese medio.

**Given** staff crea método `BANK_TRANSFER`  
**When** `POST` settings de payment methods sin `settlementCurrency`  
**Then** MUST responder `400` con validación Zod.

---

### REQ-MCP-013 — Múltiples medios mismo type

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

El sistema MUST permitir más de un `VenuePaymentMethod` activo con el mismo `type` (ej. dos `BANK_TRANSFER`) si difieren en `name` y/o `settlementCurrency`. NO SHALL existir unique global en `(venueId, type)` solo.

**Given** sede con `BANK_TRANSFER` BS activo  
**When** staff añade `BANK_TRANSFER` USD con otro `name`  
**Then** MUST persistir ambos y listarlos en settings.

---

### REQ-MCP-014 — Backfill settlementCurrency

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Migración MUST setear `settlementCurrency = venue.pricingCurrency` para filas existentes sin valor.

**Given** método legacy sin moneda  
**When** migración completa  
**Then** `settlementCurrency` MUST ser no nulo.

---

### REQ-MCP-015 — Validación en confirmación

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Al confirmar pago manual, `settlementAmount.currencyCode` MUST coincidir con `VenuePaymentMethod.settlementCurrency` del método elegido.

**Given** método con `settlementCurrency = BS`  
**When** staff envía `settlementAmount` en USD  
**Then** MUST responder `422 MONEDA_INCOMPATIBLE` sin confirmar.

---

### REQ-MCP-016 — API CRUD payment methods (web)

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | 1 |

Endpoints de configuración de sede MUST aceptar y devolver `settlementCurrency` en create/update/list.

**Given** staff guarda método en `PaymentMethodsSettings`  
**When** selecciona moneda BS  
**Then** request MUST incluir `settlementCurrency: "BS"` y respuesta MUST reflejarlo.
