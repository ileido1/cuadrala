import { CreateCompensatoryLedgerAdjustmentUseCase } from '../../application/use_cases/create_compensatory_ledger_adjustment.use_case.js';
import { ReconcileReservationLedgerUseCase } from '../../application/use_cases/reconcile_reservation_ledger.use_case.js';
import { PrismaPaymentReservationReadRepository } from '../../infrastructure/adapters/prisma_payment_reservation_read_repository.js';
import { PrismaReservationLedgerRepository } from '../../infrastructure/adapters/prisma_reservation_ledger_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const RESERVATION_LEDGER_REPOSITORY = new PrismaReservationLedgerRepository(PRISMA);
const PAYMENT_RESERVATION_READ_REPOSITORY = new PrismaPaymentReservationReadRepository();

export const CREATE_COMPENSATORY_LEDGER_ADJUSTMENT_UC =
  new CreateCompensatoryLedgerAdjustmentUseCase(
    RESERVATION_LEDGER_REPOSITORY,
    PAYMENT_RESERVATION_READ_REPOSITORY,
  );

export const RECONCILE_RESERVATION_LEDGER_UC = new ReconcileReservationLedgerUseCase(
  RESERVATION_LEDGER_REPOSITORY,
);
