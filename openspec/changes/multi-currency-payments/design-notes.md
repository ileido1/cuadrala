# Design notes: Multi-currency financial model

> Complemento técnico de [`proposal.md`](./proposal.md). Texto de producto en español; nombres de entidad/campo en inglés.

## 1. CurrencyCode y MoneyAmount

```typescript
enum CurrencyCode {
  BS = 'BS',
  USD = 'USD',
  EUR = 'EUR',
}

type MoneyAmount = {
  amountMinor: bigint; // integer minor units (centavos, céntimos)
  currencyCode: CurrencyCode;
};
```

**Reglas de minor units (NFR-PAY-04):**

| currencyCode | Decimals | Ejemplo display | minor = |
|--------------|----------|-----------------|---------|
| BS | 2 | Bs 8.500,00 | 850000 |
| USD | 2 | $ 85.00 | 8500 |
| EUR | 2 | € 85.00 | 8500 |

- Operaciones aritméticas solo entre `MoneyAmount` con **misma** `currencyCode`, o vía `MoneyConversionService`.
- API JSON: `amountMinor` como **string** si > MAX_SAFE_INTEGER; MVP puede usar number si todos los montos < 9e15.

---

## 2. Venue y pricing

### Venue (ajustes)

| Campo | Tipo | Notas |
|-------|------|-------|
| `pricingCurrency` | `CurrencyCode` | Renombre lógico de `displayCurrency`; migración mantiene columna física o rename |
| `countryCode` | `String` | Default `VE` para lookup de tasas |

### VenueMonetizationSettings (nuevo, 1:1)

| Campo | Tipo | Notas |
|-------|------|-------|
| `venueId` | FK | PK |
| `timezone` | `String` | Default `America/Caracas` — define “día de reserva” |
| `allowOverpayment` | `Boolean` | Default false |
| `overpaymentToleranceMinor` | `Int?` | Opcional, ej. 1 |
| `createdAt` / `updatedAt` | | |

---

## 3. Court pricing

`Court.pricePerHourCents` y `CourtPricingTier.pricePerHourCents` **no se renombran en Fase 1** (evitar churn masivo); semántica documentada:

> Valor en **minor units** de `venue.pricingCurrency`.

Ejemplo PO: venue USD → `850000` minor = **$8,500.00 USD** (850000 centavos USD).  
Venue BS → `850000` minor = **Bs 8.500,00**.

Cálculo reserva:

```
totalAmountMinor = round(pricePerHourMinor * (durationMinutes / 60))
pricingCurrency = venue.pricingCurrency
```

---

## 4. VenuePaymentMethod

| Campo nuevo | Tipo | Notas |
|-------------|------|-------|
| `settlementCurrency` | `CurrencyCode` | Moneda en que el venue **recibe** por este medio |
| `displayName` | opcional | Ya existe `name`; permitir duplicar `type` |

**Índice sugerido:** `@@index([venueId, type, isActive])` — sin unique en `type` (PO: múltiples BANK_TRANSFER).

Validación: al confirmar, `settlementCurrency` del método debe coincidir con moneda ingresada por staff **o** disparar conversión explícita.

---

## 5. ExchangeRate (histórico diario)

### AS-IS

`@@unique([countryCode, currency])` — una sola fila por moneda, `updatedAt` sobrescribe.

### TO-BE

| Campo | Tipo | Notas |
|-------|------|-------|
| `effectiveDate` | `Date` @db.Date | Día calendario VE |
| `rateToBs` | `Decimal(14,4)` | Unidades: 1 USD = X BS |
| `source` | `String?` | ej. `dolarapi.com` |

`@@unique([countryCode, currency, effectiveDate])`

Lookup:

```text
rate = ExchangeRate WHERE countryCode = venue.countryCode
  AND currency = settlementOrFromCurrency
  AND effectiveDate = localDate(reservation.scheduledAt, venue.timezone)
```

Si no existe → `422 TASA_NO_DISPONIBLE` (no usar tasa de confirmación).

---

## 6. CurrencyConversionRecord (nuevo)

Inmutable tras `CONFIRMED`. Una fila por conversión aplicada en una transacción.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | |
| `transactionId` | FK | |
| `fromCurrency` | `CurrencyCode` | Moneda liquidación |
| `toCurrency` | `CurrencyCode` | Moneda obligación (pricing) |
| `fromAmountMinor` | `BigInt` | |
| `toAmountMinor` | `BigInt` | Aplicado a obligación |
| `rateToBs` | `Decimal` | Snapshot numérico |
| `rateDate` | `Date` | Día de reserva usado |
| `exchangeRateId` | FK? | Referencia a fila `ExchangeRate` |
| `source` | `String?` | Copia audit |
| `createdAt` | | |

**Snapshot BS (reporting):**

Si `toCurrency !== BS`, además:

- `amountBsMinor` = convert(toAmountMinor, toCurrency → BS, rateToBs del mismo `rateDate`)
- Si `fromCurrency === BS`, `rateToBs` = 1

---

## 7. Reservation

| Campo | Migración desde | Notas |
|-------|-----------------|-------|
| `pricingCurrency` | derivado venue | Congelado al crear reserva |
| `totalAmountMinor` | `totalAmountCents` | Mismo valor numérico si misma semántica |
| `paidAmountMinor` | `paidAmountCents` | Suma en **pricingCurrency** |
| `paidAmountBsMinor` | — | Fase 2; reporting |
| `paymentStatus` | sin cambio | UNPAID / PARTIAL / PAID |

**paymentStatus:** comparar `paidAmountMinor` vs `totalAmountMinor` (misma currency).

---

## 8. VenueFeeRule (nuevo; reemplaza uso global en reservas)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | |
| `venueId` | FK | |
| `scope` | `FeeScope` | `RESERVATION`, `MATCH`, … |
| `type` | `FeeType` | PERCENTAGE / FIXED |
| `value` | `Decimal` | % o monto fijo en minor? FIXED en minor pricing currency |
| `currencyCode` | `CurrencyCode` | = `venue.pricingCurrency` (validación) |
| `isActive` | | |
| `validFrom` / `validTo` | opcional Fase 2 | |

Cálculo fee (PO):

```
feeMinor = round(totalAmountMinor * percent / 100)  // PERCENTAGE
obligationMinor = totalAmountMinor + feeMinor       // en pricingCurrency
```

`FeeRule` global existente: fallback si no hay regla por venue (deprecar gradualmente).

---

## 9. Transaction (obligación + liquidación)

| Campo | Tipo | Notas |
|-------|------|-------|
| `obligationCurrency` | `CurrencyCode` | Moneda de la deuda |
| `obligationAmountMinor` | `BigInt` | |
| `feeAmountMinor` | `BigInt` | En misma currency |
| `obligationTotalMinor` | `BigInt` | base + fee |
| `settlementCurrency` | `CurrencyCode?` | Al confirmar |
| `settlementAmountMinor` | `BigInt?` | Lo que pagó el cliente |
| `pricingCurrency` | `CurrencyCode` | Copia reserva |
| `appliedToObligationMinor` | `BigInt?` | Cuánto cubrió en obligation currency |
| `amountBsMinor` | `BigInt?` | Snapshot reporting |
| `status` | | PENDING → CONFIRMED |
| `venuePaymentMethodId` | FK | |
| `confirmedAt` | | |

**Deprecar:** `amountBase`, `feeAmount`, `amountTotal` (Decimal major) — mantener durante dual-write.

---

## 10. ReservationPaymentLedger (Fase 2)

Libro mayor append-only por reserva.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | |
| `reservationId` | FK | |
| `transactionId` | FK? | |
| `entryType` | enum | `OBLIGATION`, `PAYMENT`, `FEE`, `ADJUSTMENT`, `REVERSAL` |
| `direction` | enum | `DEBIT`, `CREDIT` |
| `amountMinor` | `BigInt` | |
| `currencyCode` | `CurrencyCode` | |
| `amountBsMinor` | `BigInt?` | |
| `actorUserId` | FK | |
| `reason` | `String?` | |
| `createdAt` | | |

`LedgerService` única escritura (SDD FR-070). Fase 1: `CurrencyConversionRecord` + update agregados; Fase 2: mover lógica a asientos.

---

## 11. MoneyConversionService (domain/application port)

```text
convertSV(amount: MoneyAmount, toCurrency: CurrencyCode, rate: ExchangeRateSnapshot): MoneyAmount
toBsMinorSV(amount: MoneyAmount, rate: ExchangeRateSnapshot): bigint
resolveRateSV(countryCode, currency, localDate): ExchangeRateSnapshot
```

**Conversión USD → BS:** `amountMinor_BS = round(amountMinor_USD * rateToBs / 10^decimals_adjustment)`  
Implementación debe usar **decimal** library, no float.

**Conversión USD → EUR:** fuera de MVP salvo que exista `ExchangeRate` EUR; solo pares hacia BS en VE.

Cross: USD obligation, BS settlement:

```
appliedUsdMinor = round(bsPaidMinor / rateToBs * 100) / 100  // con reglas decimal
```

(Detalle exacto en sdd-design con ejemplos numéricos y tests golden.)

---

## 12. Confirm flow (pseudocódigo)

```text
onConfirmManual(transactionId, venuePaymentMethodId, settlementAmount: MoneyAmount):
  tx = load Transaction + Reservation + Venue + Method
  assert Method.settlementCurrency == settlementAmount.currencyCode
  rate = resolveRate(venue.countryCode, settlementCurrency, reservationLocalDate)
  if settlementCurrency == tx.obligationCurrency:
    applied = min(settlementAmount, remainingObligation)
  else:
    applied = convert(settlementAmount, tx.obligationCurrency, rate)
    applied = min(applied, remainingObligation)
  create CurrencyConversionRecord(...)
  update Transaction CONFIRMED + settlement fields + amountBsMinor
  recompute Reservation.paidAmountMinor, paymentStatus
```

---

## 13. API response shape (ejemplo)

```json
{
  "totalAmount": { "amountMinor": "850000", "currencyCode": "USD" },
  "paidAmount": { "amountMinor": "425000", "currencyCode": "USD" },
  "paymentStatus": "PARTIAL",
  "pricingCurrency": "USD"
}
```

---

## 14. UI formatting

| currencyCode | Prefix/suffix | Locale |
|--------------|---------------|--------|
| BS | `Bs ` | `es-VE` |
| USD | `$` | `en-US` |
| EUR | `€` | `es-VE` o `de-DE` |

`formatMoney(minor, code)` en `apps/web/src/lib/money.ts` (y equivalente mobile).

---

## 15. Migration backfill (detalle)

| Tabla | Regla |
|-------|-------|
| Venue | `pricingCurrency = displayCurrency` si ∈ {BS,USD,EUR} else BS |
| Reservation | `pricingCurrency` from venue; `totalAmountMinor = totalAmountCents` |
| Transaction | `obligationCurrency = reservation.pricingCurrency`; map `amountTotal` major → minor (×100) con flag si venue USD y valores ambiguos |
| VenuePaymentMethod | `settlementCurrency = venue.pricingCurrency` default |

Script post-migración: listar transacciones donde `abs(paid recomputed - legacy) > tolerance`.

---

## 16. Chained PR sugerido (400-line guard)

1. **PR1:** Prisma + domain MoneyAmount + ExchangeRate effectiveDate + seed  
2. **PR2:** Reservation/Transaction fields + conversion service + confirm use case  
3. **PR3:** VenuePaymentMethod + VenueFeeRule + settings API  
4. **PR4:** Web UI  
5. **PR5:** Mobile + ledger Fase 2

---

## 17. Alignment con docs/SDD.md

| SDD concept | Este diseño |
|-------------|-------------|
| Ledger inmutable | Fase 2 `ReservationPaymentLedger`; Fase 1 `CurrencyConversionRecord` |
| No custodia | Sin wallet balance |
| Fee parametrizable | `VenueFeeRule` per venue |
| Conciliación | Fase 2 job sobre `amountBsMinor` + settlement |
