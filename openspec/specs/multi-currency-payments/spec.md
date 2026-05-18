Especificación: Modelo financiero multi-moneda (multi-currency-payments)

| Campo | Valor |
|-------|-------|
| **Change** | `multi-currency-payments` |
| **Estado** | Review-ready |
| **Propuesta** | [`proposal.md`](./proposal.md) |
| **Notas de diseño** | [`design-notes.md`](./design-notes.md) |
| **Modelo contable (PO)** | **Modelo C híbrido**: obligación en `pricingCurrency`, liquidación en `settlementCurrency`, reporting VE vía `amountBsMinor` + `CurrencyConversionRecord` |
| **Tasa de cambio (PO)** | Día de la reserva: `localDate(scheduledAt, venue.timezone)` con timezone por defecto `America/Caracas` |
| **Monedas MVP** | `BS`, `USD`, `EUR` |

## Propósito

Definir el comportamiento verificable del sistema Cuadrala para operar pagos y obligaciones con **moneda explícita** en sedes venezolanas, eliminando sumas ciegas sin `currencyCode`, alineado con `docs/SDD.md` (FR-070–FR-073, NFR-PAY-03/04) y entregable por fases.

## Alcance por fase

| Fase | Alcance | Capabilities |
|------|---------|--------------|
| **Phase 1 (MVP)** | `CurrencyCode`, `MoneyAmount`, pricing/liquidación, tasa por fecha de reserva, agregación en moneda de pricing, fees por sede, confirmación manual, UI web, migración backfill | Cap. 1–9 (ver tabla inferior) |
| **Phase 2** | `ReservationPaymentLedger`, `paidAmountBsMinor`, conciliación, deprecación `*Cents`, mobile staff paridad | Cap. 10 + extensiones marcadas P1/Fase 2 en caps. 5–9 |

**Fuera de alcance:** custodia/wallet retirable, PSP/webhooks, facturación SENIAT, cripto, revalorización masiva retroactiva de tasas.

## Capabilities y artefactos

| # | Capability | Artefacto | Fase |
|---|------------|-----------|------|
| 1 | `money-types` | [`specs/money-types.md`](./specs/money-types.md) | 1 |
| 2 | `venue-pricing-currency` | [`specs/venue-pricing-currency.md`](./specs/venue-pricing-currency.md) | 1 |
| 3 | `venue-payment-methods-multi-currency` | [`specs/venue-payment-methods-multi-currency.md`](./specs/venue-payment-methods-multi-currency.md) | 1 |
| 4 | `exchange-rate-by-date` | [`specs/exchange-rate-by-date.md`](./specs/exchange-rate-by-date.md) | 1 |
| 5 | `reservation-payment-aggregation` | [`specs/reservation-payment-aggregation.md`](./specs/reservation-payment-aggregation.md) | 1 (+ ext. 2) |
| 6 | `venue-fee-rules` | [`specs/venue-fee-rules.md`](./specs/venue-fee-rules.md) | 1 |
| 7 | `monetization-transactions` | [`specs/monetization-transactions.md`](./specs/monetization-transactions.md) | 1 |
| 8 | `reservation-billing` | [`specs/reservation-billing.md`](./specs/reservation-billing.md) | 1 |
| 9 | `backoffice-schedule-ui` | [`specs/backoffice-schedule-ui.md`](./specs/backoffice-schedule-ui.md) | 1 |
| 10 | `reservation-payment-ledger` | [`specs/reservation-payment-ledger.md`](./specs/reservation-payment-ledger.md) | **2 only** |

## Modelo de datos (referencia Prisma)

Cambios previstos en `services/api/prisma/schema.prisma` (AS-IS → TO-BE resumido):

| Modelo / enum | Cambio |
|---------------|--------|
| `CurrencyCode` (nuevo enum) | `BS`, `USD`, `EUR` |
| `Venue` | `pricingCurrency` (semántica sobre `displayCurrency`), `countryCode` default `VE` |
| `VenueMonetizationSettings` (nuevo) | `timezone`, `allowOverpayment`, `overpaymentToleranceMinor` |
| `VenuePaymentMethod` | `settlementCurrency` |
| `Court`, `CourtPricingTier` | Sin rename Fase 1; `pricePerHourCents` en minor de `venue.pricingCurrency` |
| `Reservation` | `pricingCurrency`, `totalAmountMinor`, `paidAmountMinor`; Fase 2: `paidAmountBsMinor` |
| `VenueFeeRule` (nuevo) | Fee scoped por `venueId` en `pricingCurrency` |
| `ExchangeRate` | `effectiveDate`; `@@unique([countryCode, currency, effectiveDate])` |
| `CurrencyConversionRecord` (nuevo) | Auditoría inmutable post-confirmación |
| `Transaction` | `obligationCurrency`, `obligationAmountMinor`, `settlementCurrency`, `settlementAmountMinor`, `appliedToObligationMinor`, `amountBsMinor`, … |
| `ReservationPaymentLedger` (nuevo) | Fase 2 — asientos DEBIT/CREDIT |

## Contrato API común: `MoneyAmount`

Todas las respuestas y bodies monetarios nuevos SHALL exponer:

```json
{
  "amountMinor": "850000",
  "currencyCode": "USD"
}
```

- `amountMinor`: entero en **unidades menores** (centavos/céntimos); string en JSON si excede `Number.MAX_SAFE_INTEGER`.
- `currencyCode`: `BS` | `USD` | `EUR`.

**Compatibilidad Phase 1:** campos legacy `totalAmountCents` / `paidAmountCents` MAY rellenarse solo cuando `currencyCode === reservation.pricingCurrency` durante dual-read.

## Códigos de error (API)

| Código HTTP | `code` | Cuándo |
|-------------|--------|--------|
| 422 | `TASA_NO_DISPONIBLE` | No existe `ExchangeRate` para `(countryCode, currency, effectiveDate)` del día de reserva |
| 422 | `MONEDA_INCOMPATIBLE` | `settlementAmount.currencyCode` ≠ `VenuePaymentMethod.settlementCurrency` sin conversión permitida |
| 400 | `MONTO_INVALIDO` | `amountMinor` negativo, no entero, o moneda no soportada |
| 422 | `SOBREPAGO_NO_PERMITIDO` | Pago excede obligación pendiente y `allowOverpayment=false` |
| 422 | `CONVERSION_REQUIRED` | Moneda de liquidación ≠ moneda de obligación y falta flujo de conversión |
| 409 | `TRANSACCION_YA_CONFIRMADA` | Re-confirmación de `Transaction` en `CONFIRMED` |

Mensajes al usuario en **español**; identificadores de campo en inglés.

## Requisitos transversales (NFR)

| ID | Prioridad | Fase | Requisito |
|----|-----------|------|-----------|
| REQ-MCP-NFR-001 | P0 | 1 | El sistema MUST NOT sumar `amountMinor` de distintas `currencyCode` sin pasar por `MoneyConversionService` o agregación documentada en `pricingCurrency`. |
| REQ-MCP-NFR-002 | P0 | 1 | Cálculos monetarios MUST usar aritmética decimal (no `float`) y redondeo **half-up** a entero minor (NFR-PAY-04). |
| REQ-MCP-NFR-003 | P0 | 1 | `BS`, `USD`, `EUR` SHALL usar **2 decimales** (factor 100 entre major y minor). |
| REQ-MCP-NFR-004 | P0 | 1 | Tras `Transaction.status = CONFIRMED`, `CurrencyConversionRecord` y snapshots de tasa MUST NOT actualizarse (inmutabilidad auditoría). |
| REQ-MCP-NFR-005 | P1 | 1 | Dual-write: escritura simultánea a campos `*Minor` y legacy `*Cents` cuando aplique migración. |
| REQ-MCP-NFR-006 | P1 | 2 | `ReservationPaymentLedger` SHALL ser la única vía de escritura de asientos compensatorios (FR-070 / NFR-PAY-03). |
| REQ-MCP-NFR-007 | P0 | 1 | Feature flag `MULTI_CURRENCY_PAYMENTS` MAY desactivar lectura/escritura nueva y volver a legacy (rollback app). |
| REQ-MCP-NFR-008 | P0 | 1 | Verificación API: `typecheck` → `lint` → `test` (Vitest); paths de conversión 100% unit en monetización. |

### REQ-MCP-NFR-001 — Prohibición de suma cross-currency

**Given** dos `MoneyAmount` con `currencyCode` distintas  
**When** el código de agregación de pagos ejecuta una suma directa  
**Then** MUST fallar en compilación/tests o rechazar en runtime con error de dominio; CI SHOULD detectar patrones prohibidos en capa application.

### REQ-MCP-NFR-004 — Inmutabilidad post-confirmación

**Given** una `Transaction` confirmada con `CurrencyConversionRecord`  
**When** un cliente intenta PATCH que altere montos o tasa  
**Then** el sistema MUST responder `409` o `403` sin modificar el registro de conversión.

## Trazabilidad: criterios de éxito de la propuesta

| Criterio propuesta | Reqs / escenarios |
|--------------------|-------------------|
| Reserva USD muestra totales/pagos en USD sin `$` fijo | REQ-MCP-045, REQ-MCP-046, REQ-MCP-007, REQ-MCP-023 |
| Confirmación BS en sede USD + `CurrencyConversionRecord` + tasa `scheduledAt` | REQ-MCP-018, REQ-MCP-019, REQ-MCP-025, REQ-MCP-037, REQ-MCP-039 |
| Dos `BANK_TRANSFER` (BS y USD) en misma sede | REQ-MCP-013 |
| Fee % por sede en `pricingCurrency` | REQ-MCP-029, REQ-MCP-031, REQ-MCP-034 |
| Tests: conversión, agregación, 422 sin tasa, contract JSON | REQ-MCP-018, REQ-MCP-004, REQ-MCP-NFR-008 |
| Cero sumas sin `currencyCode` | REQ-MCP-NFR-001, REQ-MCP-026 |
| Spec Given/When/Then por capability | Este change + `specs/*.md` |

## Inventario de requisitos

| Rango REQ-MCP | Capability | # Reqs |
|---------------|------------|--------|
| 001–006 | money-types | 6 |
| 007–011 | venue-pricing-currency | 5 |
| 012–016 | venue-payment-methods-multi-currency | 5 |
| 017–022 | exchange-rate-by-date | 6 |
| 023–028 | reservation-payment-aggregation | 6 |
| 029–033 | venue-fee-rules | 5 |
| 034–040 | monetization-transactions | 7 |
| 041–044 | reservation-billing | 4 |
| 045–051 | backoffice-schedule-ui | 7 |
| 052–057 | reservation-payment-ledger (Fase 2) | 6 |
| NFR-001–008 | Transversales | 8 |
| **Total** | | **65** requisitos, **≥65** escenarios G/W/T |

## Métricas de éxito (post-release)

| Métrica | Objetivo |
|---------|----------|
| Defectos P0 unidad de moneda (30 días) | 0 |
| Reservas `needsReview` post-migración | < 5% |
| Cobertura unit paths conversión | 100% |
| Tiempo confirmación staff | Sin regresión > 10% vs baseline |

## Decisiones PO bloqueadas (no reabrir en spec)

1. Precio de cancha en `venue.pricingCurrency`, minor units.  
2. Modelo C híbrido (obligación / liquidación / BS derivado).  
3. Tasa = día de `scheduledAt` en timezone sede (`America/Caracas` por defecto).  
4. Múltiples medios mismo `type` con distinto `settlementCurrency`.  
5. `VenueFeeRule` % en moneda de pricing por sede.  
6. `ReservationPaymentLedger` solo Fase 2.

## Relacionado: `mobile-player-alignment` (archivado 2026-05-18)

- Mobile **jugador-only**: lectura/formateo `MoneyAmount`, `payment-methods`, sin confirmación manual en app.
- Phase 2 «mobile staff paridad» **descartada**; staff monetización/agenda en `apps/web`.
- Índice: [`openspec/specs/mobile-player-alignment/spec.md`](../mobile-player-alignment/spec.md)
- Archive: [`openspec/changes/archive/2026-05-18-mobile-player-alignment/`](../changes/archive/2026-05-18-mobile-player-alignment/)

## Próximo paso SDD

Programa MCP cerrado en archive. Nuevos cambios mobile jugador: extender capabilities `mobile-player-*` en `openspec/specs/`.
