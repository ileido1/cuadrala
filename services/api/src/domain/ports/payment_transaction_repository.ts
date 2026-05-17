import type {
  ConfirmStaffTransactionInput,
  ListPendingStaffTransactionsFilters,
  PendingStaffTransactionRow,
  StaffTransactionRow,
} from './venue_staff_transaction_repository.js';

export type CreatePaymentTransactionInput = {
  matchId?: string;
  reservationId?: string;
  userId: string;
  amountBase: string;
  feeAmount: string;
  amountTotal: string;
};

export type PaymentTransactionRow = {
  id: string;
  matchId: string | null;
  reservationId: string | null;
  userId: string;
  amountBase: { toString(): string };
  feeAmount: { toString(): string };
  amountTotal: { toString(): string };
  status: string;
  paymentMethod: string;
  confirmedAt: Date | null;
  createdAt: Date;
};

export interface PaymentTransactionRepository {
  findPendingOrConfirmedForMatchUserSV(
    _matchId: string,
    _userId: string,
  ): Promise<PaymentTransactionRow | null>;
  findPendingForReservationUserSV(
    _reservationId: string,
    _userId: string,
  ): Promise<PaymentTransactionRow | null>;
  createSV(_input: CreatePaymentTransactionInput): Promise<PaymentTransactionRow>;
  findByIdSV(_id: string): Promise<PaymentTransactionRow | null>;
  listByMatchSV(_matchId: string): Promise<PaymentTransactionRow[]>;
  listByReservationSV(_reservationId: string): Promise<PaymentTransactionRow[]>;
  listByUserSV(_userId: string, _limit: number): Promise<PaymentTransactionRow[]>;
  confirmManualSV(
    _input: ConfirmStaffTransactionInput,
  ): Promise<{ id: string; status: string; confirmedAt: Date }>;
  rejectManualSV(_id: string): Promise<{ id: string; status: string }>;
  syncReservationPaymentSV(_reservationId: string): Promise<{
    totalAmountCents: number | null;
    paidAmountCents: number;
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  }>;
  findForStaffConfirmSV(_transactionId: string): Promise<StaffTransactionRow | null>;
  listPendingByVenueSV(
    _venueId: string,
    _filters?: ListPendingStaffTransactionsFilters,
  ): Promise<PendingStaffTransactionRow[]>;
}
