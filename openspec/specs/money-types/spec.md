# Capability: money-types

**Fase:** 1 (MVP)  
**Schema:** `services/api/prisma/schema.prisma` — enum `CurrencyCode` (nuevo)

## Propósito

Tipos de dominio y contrato API para representar montos con moneda explícita, base de todas las capabilities monetarias.

## Requirements

### REQ-MCP-001 — Enum CurrencyCode

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

El sistema SHALL definir `CurrencyCode` con exactamente los valores `BS`, `USD`, `EUR`. Ninguna otra moneda MUST aceptarse en validación Zod/API en MVP.

**Given** un payload con `currencyCode: "VES"`  
**When** se valida contra el schema de monetización  
**Then** MUST responder `400` con `code: MONEDA_INCOMPATIBLE` o `MONTO_INVALIDO` según capa.

---

### REQ-MCP-002 — Value object MoneyAmount

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

El dominio MUST exponer `MoneyAmount` como `{ amountMinor: bigint; currencyCode: CurrencyCode }` sin dependencias de Prisma en `src/domain/`.

**Given** un mapper de infrastructure que lee `Transaction`  
**When** construye un `MoneyAmount`  
**Then** MUST mapear a tipos de dominio, no tipos generados Prisma en application.

---

### REQ-MCP-003 — Aritmética homogénea

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

El sistema MUST NOT sumar, restar o comparar `MoneyAmount` con distinta `currencyCode` excepto mediante `MoneyConversionService` (port de aplicación/dominio).

**Given** `MoneyAmount` USD 5000 minor y BS 2750000 minor  
**When** se invoca suma directa en application  
**Then** MUST lanzar error de dominio o rechazar en validación; MUST NOT producir un total numérico único.

---

### REQ-MCP-004 — Contrato JSON API

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Toda representación monetaria en respuestas REST nuevas SHALL usar el objeto `MoneyAmount` con claves `amountMinor` y `currencyCode`.

**Given** `GET /api/v1/reservations/:id` con multi-moneda activo  
**When** la reserva tiene `totalAmountMinor`  
**Then** el body MUST incluir `totalAmount: { amountMinor, currencyCode }` y `pricingCurrency`.

---

### REQ-MCP-005 — Minor units y decimales

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Para `BS`, `USD` y `EUR`, `amountMinor` SHALL representar la unidad menor con **2 decimales** implícitos (ej. USD 85.00 → `8500`).

**Given** staff ingresa 85.00 USD en UI  
**When** se serializa al API  
**Then** `amountMinor` MUST ser `8500` y `currencyCode` `USD`.

---

### REQ-MCP-006 — Validación Zod monetización

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`services/api/src/presentation/validation/monetization.validation.ts` MUST validar `amountMinor` como entero ≥ 0 y `currencyCode` enum.

**Given** body de confirmación con `amountMinor: -1`  
**When** `CONFIRM_TRANSACTION_BODY_SCHEMA.parse`  
**Then** MUST fallar con error 400 antes del use case.
