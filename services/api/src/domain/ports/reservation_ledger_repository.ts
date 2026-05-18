import type { CurrencyCode } from '../money/currency_code.js';

export type LedgerEntryType =
  | 'OBLIGATION'
  | 'PAYMENT'
  | 'FEE'
  | 'ADJUSTMENT'
  | 'REVERSAL';

export type LedgerDirection = 'DEBIT' | 'CREDIT';

export type AppendReservationLedgerEntryInput = {
  reservationId: string;
  transactionId?: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amountMinor: bigint;
  currencyCode: CurrencyCode;
  amountBsMinor?: bigint;
  actorUserId: string;
  reason?: string;
};

export type ReservationLedgerBsDiscrepancyDTO = {
  reservationId: string;
  ledgerSumBsMinor: bigint;
  paidAmountBsMinor: bigint;
  deltaBsMinor: bigint;
};

export interface ReservationLedgerRepository {
  appendEntrySV(_input: AppendReservationLedgerEntryInput): Promise<{ id: string }>;

  /** Suma amountBsMinor de todos los asientos de la reserva (nulls como 0). */
  sumAmountBsMinorByReservationSV(_reservationId: string): Promise<bigint>;

  /** Reservas donde |ledgerSum - paidAmountBsMinor| > tolerancia. */
  listBsDiscrepanciesSV(_toleranceBsMinor: bigint): Promise<ReservationLedgerBsDiscrepancyDTO[]>;
}
