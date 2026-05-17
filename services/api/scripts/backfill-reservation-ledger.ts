/**
 * Backfill MCP Fase 2: asientos PAYMENT en ReservationPaymentLedger (forward-only).
 * Idempotente: no duplica si ya existe asiento PAYMENT para la misma transactionId.
 *
 * Uso: npm run backfill:reservation-ledger
 * Requiere migración phase2 aplicada y transacciones CONFIRMED con reservationId.
 */
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '../src/generated/prisma/client.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined || DATABASE_URL === '') {
  throw new Error('DATABASE_URL es obligatoria.');
}

const POOL = new Pool({ connectionString: DATABASE_URL });
const PRISMA = new PrismaClient({ adapter: new PrismaPg(POOL) });

const BACKFILL_ACTOR_ID = '00000000-0000-4000-8000-000000000001';

function majorToMinorSV(_major: { toString(): string }): bigint {
  return BigInt(Math.round(Number(_major.toString()) * 100));
}

async function backfillLedgerEntriesSV(): Promise<{
  created: number;
  skipped: number;
  total: number;
}> {
  const EXISTING_LEDGER_TX_IDS = new Set(
    (
      await PRISMA.reservationPaymentLedger.findMany({
        where: { entryType: 'PAYMENT', transactionId: { not: null } },
        select: { transactionId: true },
      })
    )
      .map((ROW) => ROW.transactionId)
      .filter((ID): ID is string => ID !== null),
  );

  const TXS = await PRISMA.transaction.findMany({
    where: {
      status: 'CONFIRMED',
      reservationId: { not: null },
    },
    select: {
      id: true,
      reservationId: true,
      userId: true,
      confirmedBy: true,
      appliedToObligationMinor: true,
      amountBsMinor: true,
      pricingCurrency: true,
      amountTotal: true,
      reservation: {
        select: { pricingCurrency: true },
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const TX of TXS) {
    if (EXISTING_LEDGER_TX_IDS.has(TX.id)) {
      skipped += 1;
      continue;
    }

    const RESERVATION_ID = TX.reservationId;
    if (RESERVATION_ID === null) continue;

    const PRICING = TX.pricingCurrency
      ?? TX.reservation?.pricingCurrency
      ?? 'BS';
    const APPLIED = TX.appliedToObligationMinor ?? majorToMinorSV(TX.amountTotal);
    const BS_MINOR = TX.amountBsMinor
      ?? (PRICING === 'BS' ? APPLIED : null);
    const ACTOR = TX.confirmedBy ?? TX.userId ?? BACKFILL_ACTOR_ID;

    await PRISMA.reservationPaymentLedger.create({
      data: {
        reservationId: RESERVATION_ID,
        transactionId: TX.id,
        entryType: 'PAYMENT',
        direction: 'CREDIT',
        amountMinor: APPLIED,
        currencyCode: PRICING,
        amountBsMinor: BS_MINOR,
        actorUserId: ACTOR,
        reason: 'backfill-reservation-ledger',
      },
    });
    created += 1;
  }

  console.log(
    `[backfill-ledger] Asientos PAYMENT creados: ${created}, omitidos (ya existían): ${skipped}, TX revisadas: ${TXS.length}`,
  );
  return { created, skipped, total: TXS.length };
}

async function syncPaidAmountBsMinorSV(): Promise<number> {
  const RESERVATION_IDS = await PRISMA.reservation.findMany({
    where: {
      transactions: {
        some: { status: 'CONFIRMED', amountBsMinor: { not: null } },
      },
    },
    select: { id: true },
  });

  let updated = 0;

  for (const { id: RESERVATION_ID } of RESERVATION_IDS) {
    const TXS = await PRISMA.transaction.findMany({
      where: {
        reservationId: RESERVATION_ID,
        status: 'CONFIRMED',
        amountBsMinor: { not: null },
      },
      select: { amountBsMinor: true },
    });

    const PAID_BS = TXS.reduce(
      (sum, TX) => sum + (TX.amountBsMinor ?? 0n),
      0n,
    );

    await PRISMA.reservation.update({
      where: { id: RESERVATION_ID },
      data: { paidAmountBsMinor: PAID_BS },
    });
    updated += 1;
  }

  console.log(`[backfill-ledger] Reservas con paidAmountBsMinor actualizado: ${updated}`);
  return updated;
}

async function mainSV(): Promise<void> {
  const LEDGER_STATS = await backfillLedgerEntriesSV();
  const RESERVATIONS_UPDATED = await syncPaidAmountBsMinorSV();

  console.log('[backfill-ledger] Completado.', {
    LEDGER_STATS,
    RESERVATIONS_UPDATED,
  });
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
