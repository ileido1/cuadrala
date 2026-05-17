export type StaffTransactionRow = {
  id: string;
  status: string;
  matchId: string | null;
  reservationId: string | null;
  confirmedAt: Date | null;
  match?: { court?: { venueId: string } | null } | null;
  reservation?: { venueId: string; court?: { venueId: string } | null } | null;
};

export type ConfirmStaffTransactionInput = {
  transactionId: string;
  venuePaymentMethodId?: string;
  referenceNumber?: string;
  paymentData?: object;
  confirmedBy: string;
};

export type ListPendingStaffTransactionsFilters = {
  from?: string;
  to?: string;
  matchId?: string;
  reservationId?: string;
  type?: 'MATCH' | 'RESERVATION';
};

export type PendingStaffTransactionRow = {
  id: string;
  matchId: string | null;
  reservationId: string | null;
  userId: string;
  amountTotal: { toString(): string };
  status: string;
  createdAt: Date;
};

export interface VenueStaffTransactionRepository {
  findForStaffConfirmSV(_transactionId: string): Promise<StaffTransactionRow | null>;
  confirmManualSV(
    _input: ConfirmStaffTransactionInput,
  ): Promise<{ id: string; status: string; confirmedAt: Date }>;
  syncReservationPaymentSV(_reservationId: string): Promise<void>;
  listPendingByVenueSV(
    _venueId: string,
    _filters?: ListPendingStaffTransactionsFilters,
  ): Promise<PendingStaffTransactionRow[]>;
}
