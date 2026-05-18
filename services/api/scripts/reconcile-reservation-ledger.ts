/**
 * Conciliación diaria MCP Fase 2: suma amountBsMinor del ledger vs paidAmountBsMinor.
 * Exit code 1 si hay discrepancias por encima de tolerancia (REQ-MCP-056).
 *
 * Uso: npm run reconcile:reservation-ledger
 * Env: RECONCILE_LEDGER_TOLERANCE_BS_MINOR (default 1)
 */
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { ReconcileReservationLedgerUseCase } from '../src/application/use_cases/reconcile_reservation_ledger.use_case.js';
import { PrismaReservationLedgerRepository } from '../src/infrastructure/adapters/prisma_reservation_ledger_repository.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined || DATABASE_URL === '') {
  throw new Error('DATABASE_URL es obligatoria.');
}

const TOLERANCE_RAW = process.env.RECONCILE_LEDGER_TOLERANCE_BS_MINOR ?? '1';
const TOLERANCE_BS_MINOR = BigInt(TOLERANCE_RAW);

const POOL = new Pool({ connectionString: DATABASE_URL });
const PRISMA = new PrismaClient({ adapter: new PrismaPg(POOL) });

async function mainSV(): Promise<void> {
  const UC = new ReconcileReservationLedgerUseCase(
    new PrismaReservationLedgerRepository(PRISMA),
  );
  const RESULT = await UC.executeSV(TOLERANCE_BS_MINOR);

  console.log(
    `[reconcile-ledger] checkedAt=${RESULT.checkedAt} toleranceBsMinor=${RESULT.toleranceBsMinor} discrepancies=${RESULT.discrepancyCount}`,
  );

  for (const ROW of RESULT.discrepancies) {
    console.log(
      `[reconcile-ledger] reservationId=${ROW.reservationId} ledgerSum=${ROW.ledgerSumBsMinor} paid=${ROW.paidAmountBsMinor} delta=${ROW.deltaBsMinor}`,
    );
  }

  if (RESULT.discrepancyCount > 0) {
    process.exitCode = 1;
  }
}

mainSV()
  .catch((ERROR) => {
    console.error('[reconcile-ledger] Error:', ERROR);
    process.exitCode = 1;
  })
  .finally(async () => {
    await PRISMA.$disconnect();
    await POOL.end();
  });
