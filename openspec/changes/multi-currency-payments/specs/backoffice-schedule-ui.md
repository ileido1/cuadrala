# Capability: backoffice-schedule-ui (MODIFIED)

**Fase:** 1 (MVP) — web; mobile lectura Fase 1, staff Fase 2  
**Paquetes:** `apps/web`, `apps/mobile` (parcial)

## Propósito

UI de backoffice sin símbolo `$` hardcodeado; formateo y captura según `currencyCode`.

## Requirements

### REQ-MCP-045 — formatMoney compartido

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`apps/web` MUST exponer `formatMoney(amountMinor, currencyCode)` (ej. `apps/web/src/lib/money.ts`) con locale: BS `es-VE` prefijo `Bs `, USD `en-US` `$`, EUR `€`.

**Given** `amountMinor = 850000`, `currencyCode = USD`  
**When** se renderiza en UI  
**Then** MUST mostrar formato USD coherente (no `Bs` ni `$` fijo ignorando código).

---

### REQ-MCP-046 — ReservationDetailModal

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`ReservationDetailModal` MUST leer `totalAmount`, `paidAmount`, `pricingCurrency` del API (`apps/web/src/types/api.ts`) y MUST NOT asumir centavos BS ni prefijo `$` literal en JSX.

**Given** reserva API con `pricingCurrency: "USD"`  
**When** staff abre modal  
**Then** totales y pendiente MUST mostrarse en USD.

---

### REQ-MCP-047 — Confirmación manual UI

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Formulario de confirmación MUST enviar `settlementAmount` con moneda del `VenuePaymentMethod` seleccionado; selector de método MUST mostrar `settlementCurrency`.

**Given** método PAGO_MOVIL BS seleccionado  
**When** staff confirma pago  
**Then** request MUST usar `currencyCode: "BS"`.

---

### REQ-MCP-048 — PaymentMethodsSettings

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`PaymentMethodsSettings` MUST permitir elegir `settlementCurrency` al crear/editar método.

**Given** staff crea transferencia USD  
**When** guarda  
**Then** UI MUST persistir `settlementCurrency: "USD"` vía API client.

---

### REQ-MCP-049 — Tipos api.ts

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`apps/web/src/types/api.ts` MUST definir tipo `MoneyAmount` y campos monetarios de reserva/transacción alineados al contrato API.

**Given** build TypeScript web  
**When** componentes consumen montos  
**Then** MUST typecheck sin casts a `number` ciego para moneda.

---

### REQ-MCP-050 — Tests Vitest web

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | 1 |

`formatMoney` y componentes críticos SHOULD tener tests Vitest para BS/USD/EUR.

**Given** cambio en reglas de display  
**When** `npm test` en apps/web  
**Then** tests de formateo MUST pasar.

---

### REQ-MCP-051 — Mobile lectura (Fase 1)

| Campo | Valor |
|-------|-------|
| **Prioridad** | P2 |
| **Fase** | 1 |

`apps/mobile` SHOULD mostrar montos con `currencyCode` en detalle de reserva (lectura); confirmación staff completa es **Fase 2**.

**Given** jugador ve reserva USD en mobile  
**When** pantalla de detalle  
**Then** MUST mostrar monto con símbolo USD, no hardcode `$` sin contexto.
