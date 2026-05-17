# Tasks: Multi-currency payments (Modelo C)

| Campo | Valor |
|-------|-------|
| **Change** | `multi-currency-payments` |
| **Spec** | [`spec.md`](./spec.md) · [`design.md`](./design.md) · [`migrations.md`](./migrations.md) |
| **Verificación** | `typecheck` → `lint` → `test` |
| **TDD** | `strict_tdd: true` |
| **Feature flag** | `MULTI_CURRENCY_PAYMENTS` (application env) |

---

## DAG (fases)

```text
M1 Schema + dual-write infra ──► M2 Backfill scripts ──► M3 Domain services
        │                              │                        │
        └──────────────────────────────┴──► M4 Confirmación / agregación
                                              │
                                              ▼
                                        M5 API contract + DTOs
                                              │
                                              ▼
                                        M6 Web/mobile UI (Fase 2 parcial)
```

---

## M1 — Schema y escritura mínima [x]

- [x] Enum `CurrencyCode` + tablas `VenueMonetizationSettings`, `VenueFeeRule`, `CurrencyConversionRecord`
- [x] `Venue.countryCode`, `Venue.pricingCurrency` (backfill desde `displayCurrency`)
- [x] `VenuePaymentMethod.settlementCurrency` (backfill desde venue)
- [x] `ExchangeRate.effectiveDate` + unique `(countryCode, currency, effectiveDate)`
- [x] `Reservation.pricingCurrency`, `totalAmountMinor`, `paidAmountMinor`
- [x] `Transaction` columnas obligation/settlement/reporting (nullable)
- [x] Migración `20260516130000_multi_currency_phase1_add`
- [x] Helper `prisma_money_fields.ts` + dual-write en create reserva/medio/tasa
- [x] `npm test` 396/396

---

## M2 — Backfill datos históricos [x]

- [x] Script `scripts/backfill-multi-currency.mjs` (`npm run backfill:multi-currency`)
- [x] Duplicar `ExchangeRate` por `effectiveDate` faltante (últimos 90 días)
- [x] `needsReview` heurística venue USD + monto &gt; 1000 major
- [x] Documentar ejecución en README API

---

## M3 — Domain / application (TDD) [x]

- [x] `MoneyConversionService` + `DefaultMoneyConversionService`
- [x] `ExchangeRateRepository.findByCountryCurrencyAndDateSV`
- [x] `GetRateForReservationDayUseCase` (TZ sede + `scheduledAt`)
- [x] `ExchangeRateNotFoundError` → HTTP 422 en confirmación
- [x] Tests unitarios conversión (`money_conversion.service.test.ts`)

---

## M4 — Confirmación y agregación [x]

- [x] `ConfirmTransactionAsVenueStaffUseCase` con `ENV_CONST.MULTI_CURRENCY_PAYMENTS`
- [x] `prisma_payment_transaction_repository` MCP fields + `CurrencyConversionRecord`
- [x] `syncReservationPaymentSV` suma `appliedToObligationMinor` (flag ON)
- [x] `VenueFeeRule` en `fee_policy` (`findActiveForVenueAndScopeSV` + `computeObligationFeeSV`)
- [x] Tests integración match con flag ON sin `settlementAmount` (`multi_currency_match_confirm.integration.test.ts`)
- [x] Test integración `multi_currency_reservation_confirm.integration.test.ts`

---

## M5 — Contratos API [x]

- [x] Zod `MONEY_AMOUNT_SCHEMA` + `CURRENCY_CODE_SCHEMA` (`money.validation.ts`)
- [x] `CONFIRM_TRANSACTION_BODY_SCHEMA` con `settlementAmount` (obligatorio si flag ON)
- [x] Confirmación devuelve `settlementAmount`, `appliedToObligation`, `reservationPayment`
- [x] GET resumen reserva: `pricingCurrency`, `paidAmount`, `reservationTotalAmount`
- [x] Tests unitarios `money.validation.test.ts` + integración MCP

---

## M6 — UI (Fase 2) [x]

- [x] Web: `format-money.ts` + agenda (`ReservationDetailModal`, `dashboard-stats`)
- [x] API venues/bookings exponen `pricingCurrency` + `*Minor`
- [x] Web: settings/payments pages (`format-money`, moneda de sede)
- [x] Mobile: `CurrencyCode` + `format-money` + booking detail con totales MCP
- [x] Mobile: confirmación manual reserva con `settlementAmount` (`BookingPaymentSheet`)

---

## M7 — Ledger Fase 2 [x]

- [x] Schema `ReservationPaymentLedger` + `paidAmountBsMinor` (migración `20260516140000_multi_currency_phase2_ledger`)
- [x] `ReservationLedgerService` + `PrismaReservationLedgerRepository`
- [x] Flag `RESERVATION_PAYMENT_LEDGER` (escritura en confirmación reserva + sync BS)
- [x] GET resumen reserva expone `paidAmountBs` cuando ledger activo
- [x] Script `npm run backfill:reservation-ledger` (forward-only, idempotente)
- [x] Test integración `multi_currency_ledger.integration.test.ts`
- [ ] Job conciliación diaria ledger vs agregados (REQ-MCP-056)
- [ ] API admin asientos compensatorios (REQ-MCP-057)

---

## Gate de release Fase 1

- [ ] `MULTI_CURRENCY_PAYMENTS=true` en staging ≥ 1 semana
- [ ] Sin incidentes P0 en confirmación manual
- [ ] M2 backfill ejecutado en prod con backup
