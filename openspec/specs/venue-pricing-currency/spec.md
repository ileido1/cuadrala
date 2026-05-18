# Capability: venue-pricing-currency

**Fase:** 1 (MVP)  
**Schema:** `Venue`, `VenueMonetizationSettings`, `Court`, `CourtPricingTier`, `Reservation` en `services/api/prisma/schema.prisma`

## Propósito

Configurar y propagar la moneda en que la sede **cota** canchas y obligaciones comerciales (`pricingCurrency`).

## Requirements

### REQ-MCP-007 — Venue.pricingCurrency

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Cada `Venue` MUST tener `pricingCurrency: CurrencyCode`. Migración SHALL inicializar desde `displayCurrency` AS-IS (`Venue.displayCurrency` línea ~454) cuando el valor ∈ {BS, USD, EUR}; en caso contrario MUST default `BS`.

**Given** venue existente con `displayCurrency = "USD"`  
**When** se aplica migración  
**Then** `pricingCurrency` MUST ser `USD` sin pérdida de semántica.

---

### REQ-MCP-008 — Venue.countryCode

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`Venue.countryCode` SHALL default `VE` y MUST usarse en lookup de `ExchangeRate`.

**Given** venue sin `countryCode` tras migración  
**When** se confirma un pago  
**Then** lookup de tasa MUST usar `VE`.

---

### REQ-MCP-009 — VenueMonetizationSettings

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

El sistema SHALL persistir `VenueMonetizationSettings` 1:1 con `venueId`, incluyendo `timezone` default `America/Caracas`, `allowOverpayment` default `false`, y `overpaymentToleranceMinor` opcional.

**Given** venue sin fila de settings  
**When** se calcula el día de reserva para tasa  
**Then** MUST usar timezone `America/Caracas`.

---

### REQ-MCP-010 — Semántica Court.pricePerHourCents

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`Court.pricePerHourCents` y `CourtPricingTier.pricePerHourCents` MUST interpretarse como **minor units de `venue.pricingCurrency`** (sin rename de columna en Fase 1).

**Given** venue `pricingCurrency = USD` y `pricePerHourCents = 850000`  
**When** staff ve precio en backoffice  
**Then** UI MUST mostrar equivalente a **$8,500.00 USD** (850000 centavos USD), no Bs.

---

### REQ-MCP-011 — Reservation.pricingCurrency congelado

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Al crear `Reservation`, el sistema MUST copiar `venue.pricingCurrency` a `Reservation.pricingCurrency` y MUST NOT cambiarlo si el venue actualiza su moneda después.

**Given** reserva creada en USD  
**When** el venue cambia `pricingCurrency` a BS  
**Then** la reserva existente MUST conservar `pricingCurrency = USD`.
