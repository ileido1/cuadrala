# Capability: exchange-rate-by-date

**Fase:** 1 (MVP)  
**Schema:** `ExchangeRate`, `CurrencyConversionRecord` en `services/api/prisma/schema.prisma`

## Propósito

Tasas diarias por país/moneda y snapshot inmutable en confirmación, usando la **fecha del día de la reserva**, no la fecha de confirmación.

## Requirements

### REQ-MCP-017 — ExchangeRate por effectiveDate

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`ExchangeRate` MUST incluir `effectiveDate` (@db.Date) y unique `@@unique([countryCode, currency, effectiveDate])`. `rateToBs` SHALL expresar unidades: 1 unidad de `currency` = `rateToBs` BS.

**Given** dos filas USD/VE con `effectiveDate` distintas  
**When** se consulta tasa para cada fecha  
**Then** MUST devolver la fila correspondiente a cada `effectiveDate`.

---

### REQ-MCP-018 — Resolución de fecha de reserva

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

`effectiveDate` para conversión MUST ser `localDate(Reservation.scheduledAt, VenueMonetizationSettings.timezone)` (default `America/Caracas`).

**Given** reserva `scheduledAt` 2026-05-15T23:30:00Z que en Caracas es 2026-05-15  
**When** se resuelve tasa  
**Then** MUST usar `effectiveDate = 2026-05-15`, no la fecha UTC del servidor de confirmación al día siguiente.

---

### REQ-MCP-019 — Error TASA_NO_DISPONIBLE

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Si no existe `ExchangeRate` para `(venue.countryCode, currency, effectiveDate)`, confirmación MUST abortar con HTTP `422` y `code: TASA_NO_DISPONIBLE`. El sistema MUST NOT usar tasa de `updatedAt` ni tasa del día de confirmación como fallback en MVP.

**Given** confirmación cross-currency sin fila de tasa para el día de reserva  
**When** `ConfirmTransactionAsVenueStaffUseCase` ejecuta  
**Then** MUST responder 422 `TASA_NO_DISPONIBLE` en español.

---

### REQ-MCP-020 — CurrencyConversionRecord inmutable

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

Tras confirmación, el sistema MUST crear `CurrencyConversionRecord` con `fromCurrency`, `toCurrency`, `fromAmountMinor`, `toAmountMinor`, `rateToBs`, `rateDate`, `exchangeRateId` (opcional), `source`. Registro MUST NOT actualizarse ni eliminarse.

**Given** transacción confirmada con conversión BS→USD  
**When** admin intenta alterar el record  
**Then** MUST rechazar; historial MUST permanecer para auditoría.

---

### REQ-MCP-021 — Snapshot amountBsMinor

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | 1 |

En confirmación, `Transaction.amountBsMinor` MUST persistir equivalente BS del monto aplicado a obligación, usando la misma `rateDate` y `rateToBs` del record.

**Given** obligación 50 USD aplicada desde pago BS  
**When** confirmación completa  
**Then** `amountBsMinor` MUST ser calculable desde `toAmountMinor` y tasa del día de reserva.

---

### REQ-MCP-022 — Seed y job diario

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | 1 |

El sistema SHOULD poblar `ExchangeRate` vía seed y/o job diario (fuente ej. `dolarapi.com`) para `VE` + `USD`/`EUR` por `effectiveDate`.

**Given** entorno sin tasa del día siguiente  
**When** operaciones del día requieren esa fecha  
**Then** MUST fallar con `TASA_NO_DISPONIBLE` hasta que seed/job cree la fila.
