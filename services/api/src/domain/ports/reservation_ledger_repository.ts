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

export interface ReservationLedgerRepository {
  appendEntrySV(_input: AppendReservationLedgerEntryInput): Promise<{ id: string }>;
}
