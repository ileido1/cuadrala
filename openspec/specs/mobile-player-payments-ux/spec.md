# Capability: mobile-player-payments-ux

| Campo | Valor |
|-------|-------|
| **Programa** | `mobile-player-alignment` (archivado 2026-05-18); ext. `mobile-match-payments-fx` (2026-05-25) |
| **Fase** | M3 (P0), M3b (P1), MPFX (P0) |
| **Paquetes** | `apps/mobile`, `services/api` (DTOs lectura jugador) |

## Propósito

Flujo de pago del **jugador** con montos `MoneyAmount`, medios de pago activos en lectura, sin confirmación manual en mobile, y pantalla de espera que refleja el estado real de la transacción tras acción staff en web.

## Contrato MoneyAmount (consumo mobile)

```json
{
  "amountMinor": "850000",
  "currencyCode": "USD"
}
```

`currencyCode` ∈ { `BS`, `USD`, `EUR` }. Mobile MUST parsear `amountMinor` como entero (string permitido en JSON).

## Requirements

### REQ-MPPU-001 — Modelo Dart MoneyAmount

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

Mobile MUST definir tipo inmutable (Freezed o equivalente) `MoneyAmount` con `amountMinor` y `currencyCode`, alineado al contrato API.

**Given** JSON de summary con campo monetario  
**When** se deserializa  
**Then** MUST producir `MoneyAmount` válido o error controlado; MUST NOT depender solo de `double` major.

---

### REQ-MPPU-002 — formatMoney y pricingCurrency

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

Pantallas de pago MUST formatear con `formatMoney` / `CurrencyCode.resolve(venue.pricingCurrency)`; MUST NOT asumir Bs fijo ni prefijo `$` hardcoded.

**Given** sede `pricingCurrency = EUR`  
**When** se muestra total de obligación  
**Then** UI MUST mostrar símbolo/formato EUR coherente con util.

**Given** sede `pricingCurrency = BS`  
**When** se muestra total  
**Then** UI MUST mostrar formato BS.

---

### REQ-MPPU-003 — Summary y obligations con moneda explícita

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

DTOs de `GET` summary/obligations de partida MUST mapear totales y líneas a `MoneyAmount`; legacy `totalAmountBase` / strings sin moneda MUST NOT ser la fuente primaria en UI M3+.

**Given** API devuelve obligación con `MoneyAmount`  
**When** mobile renderiza lista de obligaciones  
**Then** cada línea MUST mostrar monto con `currencyCode` correcto.

**Given** dual-read legacy `*Cents` presente  
**When** `currencyCode` del ítem ≠ `pricingCurrency`  
**Then** mobile MUST ignorar legacy y usar solo `MoneyAmount`.

---

### REQ-MPPU-004 — API enriquece respuestas jugador si faltara currency

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

Si el contrato actual de summary carece de `currencyCode` en algún campo, API MUST ampliarse para cumplir REQ-MPPU-003 antes de cerrar M3 mobile.

**Given** test de contrato o integración de summary match  
**When** respuesta 200  
**Then** campos monetarios expuestos al jugador MUST incluir `currencyCode`.

---

### REQ-MPPU-005 — Prohibición suma cross-currency en UI

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

Mobile MUST NOT sumar visualmente `MoneyAmount` de distintas `currencyCode` sin conversión; totales agregados MUST venir del API en una sola moneda (pricing).

**Given** dos obligaciones en distintas monedas (caso anómalo)  
**When** se renderiza resumen  
**Then** MUST mostrar por ítem o error controlado; MUST NOT mostrar un único total mezclado.

---

### REQ-MPPU-006 — Lectura payment-methods

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

Mobile MUST cargar medios con `GET /api/v1/venues/:venueId/payment-methods` filtrando activos; DTO player-safe (tipo, titular/CVU enmascarado si aplica, `settlementCurrency`).

**Given** sede con transferencia BS y USD activas  
**When** jugador ve instrucciones de pago  
**Then** MUST listar ambos medios con moneda de liquidación correcta.

**Given** ningún medio activo  
**When** jugador abre pago  
**Then** MUST mostrar estado vacío en español; MUST NOT crashear.

---

### REQ-MPPU-007 — Deprecación payment-info en flujo feliz

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

El flujo documentado crear obligaciones → instrucciones → comprobante MUST NOT llamar `payment-info` en camino feliz; endpoint legacy MAY permanecer en API para otros clientes.

**Given** test de integración o widget del flujo de pago  
**When** ejecuta camino feliz M3+  
**Then** MUST mockear/verificar uso de `payment-methods`, no `payment-info`.

---

### REQ-MPPU-008 — Sin confirmTransactionManual

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

`MonetizationRepository` (o equivalente) en mobile MUST NOT exponer `confirmTransactionManual` ni llamar `PATCH .../confirm-manual`.

**Given** `rg confirm-manual apps/mobile`  
**When** M3 mergeado  
**Then** MUST retornar 0 matches.

---

### REQ-MPPU-009 — Waiting screen estados reales

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M3b |

`waiting_confirmation_screen` MUST distinguir `PENDING`, `CONFIRMED`, `REJECTED` según `Transaction.status` del jugador.

**Given** transacción `PENDING` tras subir comprobante  
**When** usuario está en waiting  
**Then** UI MUST indicar espera de revisión por la sede (español).

**Given** poll detecta `CONFIRMED`  
**When** staff confirmó en web  
**Then** UI MUST transicionar a éxito y permitir navegación acorde (detalle partida / home).

**Given** poll detecta `REJECTED`  
**Then** UI MUST mostrar rechazo y acción de reintento si negocio lo permite.

---

### REQ-MPPU-010 — Polling con backoff y cancelación

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M3b |

Poll SHOULD usar intervalo inicial 5 s, backoff hasta 15 s máximo; MUST cancelarse en `dispose` del cubit/pantalla.

**Given** usuario sale de waiting antes de confirmar  
**When** widget se dispone  
**Then** MUST NOT quedar timers activos (test con `FakeAsync` o verificación de cancelación).

---

### REQ-MPPU-011 — Fuente de verdad del poll

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M3b |

Poll MUST usar `GET` de summary de transacciones del usuario o detalle de transacción expuesto al jugador; MUST NOT inferir estado solo por tiempo transcurrido.

**Given** API devuelve status `PENDING`  
**When** pasan 60 s sin acción staff  
**Then** UI MUST seguir en pendiente (no auto-confirmar).

---

### REQ-MPPU-012 — Tests monetización mobile

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

MUST existir `money_format_test` (o equivalente) y tests de cubit/repository para parseo `MoneyAmount` y estados waiting.

**Given** `flutter test test/**/money_format_test.dart`  
**When** CI mobile  
**Then** MUST pasar.

### REQ-MPFX-001 — Efectivo sin comprobante (partida)

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Change** | `mobile-match-payments-fx` (2026-05-25) |

**Given** jugador elige medio `CASH` en partida  
**When** confirma método  
**Then** MUST navegar a `WaitingConfirmationScreen` sin `UploadReceiptScreen`  
**And** API MUST rechazar upload de comprobante con medio CASH (HTTP 400).

---

### REQ-MPFX-002 — Preview FX obligación → liquidación

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Change** | `mobile-match-payments-fx` |

**Given** `pricingCurrency` ≠ `settlementCurrency` del medio y tasas del día del partido  
**When** jugador elige transferencia o pago móvil  
**Then** MUST mostrar monto a liquidar en moneda del medio usando `convertMinorBetweenCurrencies`  
**And** MUST bloquear continuar si falta tasa (`missing_rate`).

---

### REQ-MPFX-003 — Paridad algoritmo con web

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Change** | `mobile-match-payments-fx` |

Mobile MUST usar `pickExchangeRateForDate` sobre `GET /countries/:code/exchange-rates` y misma lógica que `apps/web/src/lib/money-conversion.ts`.

---

### REQ-MPFX-004 — Bootstrap datos de pago partida

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Change** | `mobile-match-payments-fx` |

Flujo de pago MUST recibir `pricingCurrency`, `displayCurrency`, `countryCode`, `scheduledAt` (venue + partida) antes de calcular FX o registrar selección.

---

## Criterios de aceptación verificables (M3)

| ID | Verificación |
|----|----------------|
| AC-MPPU-01 | Pantalla pago muestra EUR/USD/BS según sede (manual o golden) |
| AC-MPPU-02 | `rg confirm-manual apps/mobile` → vacío |
| AC-MPPU-03 | Flujo feliz usa payment-methods (test) |
| AC-MPPU-04 | Waiting → CONFIRMED tras confirm staff web (integración doc o E2E) |
| AC-MPPU-05 | `flutter test` monetización verde |
| AC-MPFX-01 | `pay_flow_widget_test` CASH → waiting sin upload |
| AC-MPFX-02 | `money_conversion_test` USD→BS |
