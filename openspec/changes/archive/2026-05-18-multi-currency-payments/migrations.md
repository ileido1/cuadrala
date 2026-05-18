# Plan de migraciones Prisma: multi-currency-payments

Complemento de [`design.md`](./design.md). **No ejecutar en producción** sin ventana y backup.

---

## Estrategia general

| Principio | Detalle |
|-----------|---------|
| Forward-only | Migraciones Prisma incrementales; rollback app vía flag, no `migrate down` en prod salvo emergencia |
| Nullable first | Columnas nuevas nullable → backfill → NOT NULL donde aplique |
| Dual-write | Una release con escritura `*Minor` + legacy (`REQ-MCP-NFR-005`) |
| Sin drop en Fase 1 | `totalAmountCents`, `amountBase`, `displayCurrency` se mantienen hasta Fase 2 |

---

## Migración M1 — Enums y columnas nuevas (PR1)

**Nombre sugerido:** `20260516120000_multi_currency_phase1_add`

### 1.1 Crear enum `CurrencyCode`

```sql
CREATE TYPE "CurrencyCode" AS ENUM ('BS', 'USD', 'EUR');
```

### 1.2 `Venue`

```sql
ALTER TABLE "Venue" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'VE';
ALTER TABLE "Venue" ADD COLUMN "pricingCurrency" "CurrencyCode";

-- Backfill inmediato en misma migración (o M2)
UPDATE "Venue" SET "pricingCurrency" = CASE
  WHEN "displayCurrency" IN ('BS','USD','EUR') THEN "displayCurrency"::"CurrencyCode"
  ELSE 'BS'::"CurrencyCode"
END;

ALTER TABLE "Venue" ALTER COLUMN "pricingCurrency" SET NOT NULL;
ALTER TABLE "Venue" ALTER COLUMN "pricingCurrency" SET DEFAULT 'BS';
```

**Nota:** `displayCurrency` se mantiene; opcional `COMMENT` deprecación. Rename físico a `pricingCurrency` y drop `displayCurrency` solo en **Fase 2 cleanup**.

### 1.3 `VenueMonetizationSettings` (tabla nueva)

```sql
CREATE TABLE "VenueMonetizationSettings" (
  "venueId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'America/Caracas',
  "allowOverpayment" BOOLEAN NOT NULL DEFAULT false,
  "overpaymentToleranceMinor" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueMonetizationSettings_pkey" PRIMARY KEY ("venueId"),
  CONSTRAINT "VenueMonetizationSettings_venueId_fkey"
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

Backfill: `INSERT INTO "VenueMonetizationSettings" ("venueId", "updatedAt") SELECT id, NOW() FROM "Venue"`.

### 1.4 `VenuePaymentMethod`

```sql
ALTER TABLE "VenuePaymentMethod" ADD COLUMN "settlementCurrency" "CurrencyCode";
UPDATE "VenuePaymentMethod" vpm
SET "settlementCurrency" = v."pricingCurrency"
FROM "Venue" v WHERE v.id = vpm."venueId";
ALTER TABLE "VenuePaymentMethod" ALTER COLUMN "settlementCurrency" SET NOT NULL;
```

### 1.5 `ExchangeRate` — histórico diario

**Paso A:** añadir columna nullable

```sql
ALTER TABLE "ExchangeRate" ADD COLUMN "effectiveDate" DATE;
```

**Paso B:** backfill filas existentes (una fila por currency → hoy VE)

```sql
UPDATE "ExchangeRate"
SET "effectiveDate" = (NOW() AT TIME ZONE 'America/Caracas')::date
WHERE "effectiveDate" IS NULL;
```

**Paso C:** drop unique viejo, crear nuevo

```sql
ALTER TABLE "ExchangeRate" DROP CONSTRAINT "ExchangeRate_countryCode_currency_key";
ALTER TABLE "ExchangeRate" ALTER COLUMN "effectiveDate" SET NOT NULL;
CREATE UNIQUE INDEX "ExchangeRate_countryCode_currency_effectiveDate_key"
  ON "ExchangeRate"("countryCode", "currency", "effectiveDate");
```

### 1.6 `Reservation`

```sql
ALTER TABLE "Reservation" ADD COLUMN "pricingCurrency" "CurrencyCode";
ALTER TABLE "Reservation" ADD COLUMN "totalAmountMinor" BIGINT;
ALTER TABLE "Reservation" ADD COLUMN "paidAmountMinor" BIGINT NOT NULL DEFAULT 0;
```

Backfill (M2 script o misma migración):

```sql
UPDATE "Reservation" r SET
  "pricingCurrency" = v."pricingCurrency",
  "totalAmountMinor" = r."totalAmountCents",
  "paidAmountMinor" = r."paidAmountCents"
FROM "Venue" v
WHERE r."venueId" = v.id;
```

`ALTER COLUMN "pricingCurrency" SET NOT NULL` tras backfill.

### 1.7 `Transaction`

```sql
ALTER TABLE "Transaction" ADD COLUMN "obligationCurrency" "CurrencyCode";
ALTER TABLE "Transaction" ADD COLUMN "obligationAmountMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "feeAmountMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "obligationTotalMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "pricingCurrency" "CurrencyCode";
ALTER TABLE "Transaction" ADD COLUMN "settlementCurrency" "CurrencyCode";
ALTER TABLE "Transaction" ADD COLUMN "settlementAmountMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "appliedToObligationMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "amountBsMinor" BIGINT;
ALTER TABLE "Transaction" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;
```

### 1.8 `VenueFeeRule` (tabla nueva)

```sql
CREATE TABLE "VenueFeeRule" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "scope" "FeeScope" NOT NULL,
  "type" "FeeType" NOT NULL,
  "value" DECIMAL(14,4) NOT NULL,
  "currencyCode" "CurrencyCode" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueFeeRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VenueFeeRule_venueId_fkey"
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE
);
CREATE INDEX "VenueFeeRule_venueId_scope_isActive_idx"
  ON "VenueFeeRule"("venueId", "scope", "isActive");
```

### 1.9 `CurrencyConversionRecord` (tabla nueva)

```sql
CREATE TABLE "CurrencyConversionRecord" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "fromCurrency" "CurrencyCode" NOT NULL,
  "toCurrency" "CurrencyCode" NOT NULL,
  "fromAmountMinor" BIGINT NOT NULL,
  "toAmountMinor" BIGINT NOT NULL,
  "rateToBs" DECIMAL(14,4) NOT NULL,
  "rateDate" DATE NOT NULL,
  "exchangeRateId" TEXT,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CurrencyConversionRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CurrencyConversionRecord_transactionId_key" UNIQUE ("transactionId"),
  CONSTRAINT "CurrencyConversionRecord_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE,
  CONSTRAINT "CurrencyConversionRecord_exchangeRateId_fkey"
    FOREIGN KEY ("exchangeRateId") REFERENCES "ExchangeRate"("id") ON DELETE SET NULL
);
```

---

## Migración M2 — Backfill datos (PR1 o PR2)

Script SQL/TS post-migrate (`scripts/backfill-multi-currency.mjs`):

| Tabla | Regla | Flag |
|-------|-------|------|
| `Transaction` PENDING/CONFIRMED | `obligationCurrency` = `reservation.pricingCurrency`; `obligationAmountMinor` = `round(amountTotal * 100)` si legacy major; venue USD con valores ambiguos → `needsReview = true` | REQ-MCP-036 |
| `Transaction` CONFIRMED | `appliedToObligationMinor` = mismo cálculo legacy cap; `settlementCurrency` = obligation si desconocido | |
| `ExchangeRate` | Duplicar fila actual por cada `effectiveDate` faltante en últimos 90 días (seed) | REQ-MCP-022 |

**Validación post-backfill:**

```sql
SELECT id FROM "Transaction"
WHERE "needsReview" = true;
-- Objetivo: < 5% del total (métrica propuesta)
```

---

## Migración M3 — Fase 2 only (NO en PR1–4)

```sql
-- Reservation.paidAmountBsMinor
ALTER TABLE "Reservation" ADD COLUMN "paidAmountBsMinor" BIGINT;

-- ReservationPaymentLedger + enums EntryType, Direction
-- (ver specs/reservation-payment-ledger.md)
```

---

## Migración M4 — Cleanup (Fase 2, destructiva)

**Advertencia openspec archive:** requiere backup y ventana.

```sql
ALTER TABLE "Reservation" DROP COLUMN "totalAmountCents";
ALTER TABLE "Reservation" DROP COLUMN "paidAmountCents";
ALTER TABLE "Transaction" DROP COLUMN "amountBase";
ALTER TABLE "Transaction" DROP COLUMN "feeAmount";
ALTER TABLE "Transaction" DROP COLUMN "amountTotal";
ALTER TABLE "Venue" DROP COLUMN "displayCurrency";
```

Precondición: `MULTI_CURRENCY_PAYMENTS=true` en prod ≥ 2 semanas sin incidentes P0.

---

## Dual-write matrix (application)

| Operación | Escribir (flag ON) | Escribir legacy |
|-----------|-------------------|-----------------|
| Crear reserva | `totalAmountMinor`, `pricingCurrency` | `totalAmountCents` si pricing=BS legacy path |
| Confirmar TX | `settlement*`, `applied*`, `amountBsMinor` | `amountTotal` major = applied/100 solo si misma semántica |
| Actualizar paid | `paidAmountMinor` | `paidAmountCents` = `Number(paidAmountMinor)` si currency match |

---

## Rollback

| Nivel | Acción |
|-------|--------|
| App | `MULTI_CURRENCY_PAYMENTS=false` → leer/escribir `*Cents` y Decimal legacy |
| DB (sin cleanup) | Columnas nuevas ignoradas; sin pérdida |
| DB (post-cleanup) | Restaurar backup + migración down documentada manualmente |

---

## Orden de ejecución en dev

```bash
cd services/api
npx prisma migrate dev --name multi_currency_phase1_add
npx prisma generate
node scripts/backfill-multi-currency.mjs   # crear en PR2
npm run typecheck && npm run lint && npm test
```

---

## Seed (`prisma/seed.ts`)

- Venue demo: `pricingCurrency: USD`, `countryCode: VE`
- `VenueMonetizationSettings` por venue
- `ExchangeRate`: filas `(VE, USD, effectiveDate)` y `(VE, EUR, effectiveDate)` para hoy y ayer
- `VenuePaymentMethod`: `settlementCurrency` explícito (ej. BANK_TRANSFER USD + PAGO_MOVIL BS)
- `VenueFeeRule` 10% RESERVATION en pricing del venue
