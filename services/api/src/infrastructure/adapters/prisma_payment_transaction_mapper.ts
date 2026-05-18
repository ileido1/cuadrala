import type { Transaction } from '../../generated/prisma/client.js';
import type { PaymentTransactionRow } from '../../domain/ports/payment_transaction_repository.js';
import type {
  PendingStaffTransactionRow,
  StaffTransactionRow,
} from '../../domain/ports/venue_staff_transaction_repository.js';

/** Fila Prisma de transacción con includes de staff confirm. */
export type StaffTransactionPrismaRow = {
  id: string;
  status: string;
  matchId: string | null;
  reservationId: string | null;
  confirmedAt: Date | null;
  amountBase: { toString(): string };
  feeAmount: { toString(): string };
  amountTotal: { toString(): string };
  match?: StaffTransactionRow['match'];
  reservation?: StaffTransactionRow['reservation'];
};

export function mapPrismaTransactionToPaymentRowSV(
  _row: Transaction,
): PaymentTransactionRow {
  return {
    id: _row.id,
    matchId: _row.matchId,
    reservationId: _row.reservationId,
    userId: _row.userId,
    amountBase: _row.amountBase,
    feeAmount: _row.feeAmount,
    amountTotal: _row.amountTotal,
    status: _row.status,
    paymentMethod: _row.paymentMethod,
    confirmedAt: _row.confirmedAt,
    createdAt: _row.createdAt,
  };
}

export function mapPrismaTransactionToPendingStaffRowSV(
  _row: Transaction,
): PendingStaffTransactionRow {
  return {
    id: _row.id,
    matchId: _row.matchId,
    reservationId: _row.reservationId,
    userId: _row.userId,
    amountTotal: _row.amountTotal,
    status: _row.status,
    createdAt: _row.createdAt,
  };
}

export function mapPrismaTransactionToStaffRowSV(
  _row: StaffTransactionPrismaRow,
): StaffTransactionRow {
  return {
    id: _row.id,
    status: _row.status,
    matchId: _row.matchId,
    reservationId: _row.reservationId,
    confirmedAt: _row.confirmedAt,
    amountBase: _row.amountBase,
    feeAmount: _row.feeAmount,
    amountTotal: _row.amountTotal,
    match: _row.match,
    reservation: _row.reservation,
  };
}
