/**
 * Backfill MCP Fase 1 (M2): Transaction.*Minor y ExchangeRate histórico.
 * Uso: npm run backfill:multi-currency
 */
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { caracasCalendarDateSV } from '../src/infrastructure/prisma_money_fields.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined || DATABASE_URL === '') {
  throw new Error('DATABASE_URL es obligatoria.');
}

const POOL = new Pool({ connectionString: DATABASE_URL });
const PRISMA = new PrismaClient({ adapter: new PrismaPg(POOL) });

function majorToMinorSV(_major: { toString(): string }): bigint {
  return BigInt(Math.round(Number(_major.toString()) * 100));
}

function needsReviewHeuristicSV(_pricingCurrency: string, _amountTotal: { toString(): string }): boolean {
  const MAJOR = Number(_amountTotal.toString());
  return _pricingCurrency === 'USD' && MAJOR > 1000;
}

async function backfillTransactionsSV(): Promise<{
  updated: number;
  flagged: number;
  total: number;
}> {
  const ROWS = await PRISMA.transaction.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      obligationCurrency: null,
    },
    include: {
      reservation: {
        select: {
          pricingCurrency: true,
          venue: { select: { pricingCurrency: true } },
        },
      },
    },
  });

  let updated = 0;
  let flagged = 0;

  for (const TX of ROWS) {
    const PRICING = TX.reservation?.pricingCurrency
      ?? TX.reservation?.venue?.pricingCurrency
      ?? 'BS';
    const OBLIGATION_MINOR = majorToMinorSV(TX.amountTotal);
    const NEEDS_REVIEW = needsReviewHeuristicSV(PRICING, TX.amountTotal);

    const DATA: Record<string, unknown> = {
      obligationCurrency: PRICING,
      obligationAmountMinor: majorToMinorSV(TX.amountBase),
      feeAmountMinor: majorToMinorSV(TX.feeAmount),
      obligationTotalMinor: OBLIGATION_MINOR,
      pricingCurrency: PRICING,
      settlementCurrency: PRICING,
      settlementAmountMinor: OBLIGATION_MINOR,
      needsReview: NEEDS_REVIEW,
    };

    if (TX.status === 'CONFIRMED') {
      DATA.appliedToObligationMinor = OBLIGATION_MINOR;
      if (PRICING === 'BS') {
        DATA.amountBsMinor = OBLIGATION_MINOR;
      }
    }

    await PRISMA.transaction.update({
      where: { id: TX.id },
      data: DATA,
    });
    updated += 1;
    if (NEEDS_REVIEW) flagged += 1;
  }

  console.log(`[backfill] Transacciones actualizadas: ${updated}, needsReview: ${flagged}`);
  return { updated, flagged, total: ROWS.length };
}

async function backfillExchangeRateHistorySV(): Promise<number> {
  const DISTINCT = await PRISMA.exchangeRate.findMany({
    distinct: ['countryCode', 'currency'],
    select: {
      countryCode: true,
      currency: true,
      rateToBs: true,
      source: true,
    },
  });

  const TODAY = caracasCalendarDateSV();
  let created = 0;

  for (const ROW of DISTINCT) {
    for (let offset = 0; offset < 90; offset += 1) {
      const DATE = new Date(TODAY);
      DATE.setUTCDate(DATE.getUTCDate() - offset);

      const EXISTS = await PRISMA.exchangeRate.findUnique({
        where: {
          countryCode_currency_effectiveDate: {
            countryCode: ROW.countryCode,
            currency: ROW.currency,
            effectiveDate: DATE,
          },
        },
      });

      if (EXISTS !== null) continue;

      await PRISMA.exchangeRate.create({
        data: {
          countryCode: ROW.countryCode,
          currency: ROW.currency,
          rateToBs: ROW.rateToBs,
          source: ROW.source ?? 'backfill',
          effectiveDate: DATE,
        },
      });
      created += 1;
    }
  }

  console.log(`[backfill] Filas ExchangeRate creadas (90d): ${created}`);
  return created;
}

async function mainSV(): Promise<void> {
  const TX_STATS = await backfillTransactionsSV();
  const RATE_CREATED = await backfillExchangeRateHistorySV();

  const REVIEW_COUNT = await PRISMA.transaction.count({
    where: { needsReview: true },
  });
  const TOTAL_TX = await PRISMA.transaction.count();
  const PCT = TOTAL_TX > 0 ? ((REVIEW_COUNT / TOTAL_TX) * 100).toFixed(2) : '0';

  console.log(`[backfill] needsReview total: ${REVIEW_COUNT}/${TOTAL_TX} (${PCT}%)`);
  console.log('[backfill] Completado.', { TX_STATS, RATE_CREATED });
}

mainSV()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await PRISMA.$disconnect();
    await POOL.end();
  });
