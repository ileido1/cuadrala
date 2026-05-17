# Capability: reservation-payment-ledger

**Fase:** 2 ONLY — no implementar en MVP Fase 1  
**Schema:** `ReservationPaymentLedger` (nuevo) en `services/api/prisma/schema.prisma`  
**Alineación SDD:** FR-070, NFR-PAY-03 (ledger inmutable)

## Propósito

Libro mayor append-only por reserva con asientos DEBIT/CREDIT; única puerta de escritura vía `LedgerService` para ajustes compensatorios.

> **Phase 1 sustituto:** `CurrencyConversionRecord` + actualización de agregados en `Reservation` es suficiente para auditoría operativa. Esta capability MUST NOT bloquear release de Fase 1.

## Requirements

### REQ-MCP-052 — Modelo ReservationPaymentLedger

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | **2** |

El sistema SHALL persistir `ReservationPaymentLedger` con: `reservationId`, `transactionId?`, `entryType` (`OBLIGATION` | `PAYMENT` | `FEE` | `ADJUSTMENT` | `REVERSAL`), `direction` (`DEBIT` | `CREDIT`), `amountMinor`, `currencyCode`, `amountBsMinor?`, `actorUserId`, `reason?`, `createdAt`.

**Given** confirmación manual en Fase 2 activa  
**When** pago se confirma  
**Then** MUST insertar asiento `PAYMENT` sin UPDATE sobre filas previas.

---

### REQ-MCP-053 — LedgerService única escritura

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | **2** |

Solo `LedgerService` MUST crear asientos en `ReservationPaymentLedger`; use cases MUST NOT escribir Prisma directo a esta tabla.

**Given** ajuste compensatorio por staff autorizado  
**When** se registra reversión  
**Then** MUST pasar por `LedgerService` con `actorUserId` y `reason`.

---

### REQ-MCP-054 — Inmutabilidad

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | **2** |

Filas de ledger MUST NOT actualizarse ni eliminarse; correcciones MUST ser nuevos asientos `REVERSAL` / `ADJUSTMENT`.

**Given** asiento erróneo  
**When** admin corrige  
**Then** MUST existir par DEBIT/CREDIT compensatorio, no UPDATE del asiento original.

---

### REQ-MCP-055 — Paridad con confirmación Fase 1

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | **2** |

Al activar ledger, confirmación manual MUST seguir produciendo `CurrencyConversionRecord` hasta decisión de diseño de consolidación; asientos MUST ser consistentes con `appliedToObligationMinor`.

**Given** misma reserva confirmada en Fase 1 sin ledger  
**When** migración a Fase 2  
**Then** diseño MUST definir backfill de asientos o corte forward-only (detalle en sdd-design).

---

### REQ-MCP-056 — Conciliación diaria (Fase 2)

| Campo | Valor |
|-------|-------|
| **Prioridad** | P2 |
| **Fase** | **2** |

Job de conciliación SHOULD comparar suma `amountBsMinor` de asientos vs agregados `paidAmountBsMinor` y reportar excepciones (FR-076 / NFR-PAY-05).

**Given** discrepancia > tolerancia  
**When** job nocturno  
**Then** MUST encolar excepción para admin financiero.

---

### REQ-MCP-057 — API interna compensatoria

| Campo | Valor |
|-------|-------|
| **Prioridad** | P2 |
| **Fase** | **2** |

API interna/admin MAY exponer creación de asientos compensatorios; MUST NOT estar en rutas públicas de jugador.

**Given** usuario sin rol financiero  
**When** POST asiento compensatorio  
**Then** MUST 403.
