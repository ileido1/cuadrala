export type StaffTransactionRow = {
  id: string;
  status: string;
  matchId: string | null;
  reservationId: string | null;
  confirmedAt: Date | null;
  amountBase: { toString(): string };
  feeAmount: { toString(): string };
  amountTotal: { toString(): string };
  match?: { court?: { venueId: string } | null } | null;
  reservation?: {
    venueId: string;
    scheduledAt: Date;
    pricingCurrency: string;
    totalAmountMinor: bigint | null;
    paidAmountMinor: bigint;
    court?: { venueId: string } | null;
    venue: {
      countryCode: string;
      pricingCurrency: string;
      monetizationSettings: { timezone: string } | null;
    };
  } | null;
};

export type McpConfirmPayload = {
  obligationCurrency: string;
  obligationAmountMinor: bigint;
  feeAmountMinor: bigint;
  obligationTotalMinor: bigint;
  pricingCurrency: string;
  settlementCurrency: string;
  settlementAmountMinor: bigint;
  appliedToObligationMinor: bigint;
  amountBsMinor: bigint;
  conversionRecord?: {
    fromCurrency: string;
    toCurrency: string;
    fromAmountMinor: bigint;
    toAmountMinor: bigint;
    rateToBs: string;
    rateDate: Date;
    exchangeRateId: string | null;
    source: string | null;
  };
};

export type ConfirmStaffTransactionInput = {
  transactionId: string;
  venuePaymentMethodId?: string;
  referenceNumber?: string;
  paymentData?: object;
  confirmedBy: string;
  mcp?: McpConfirmPayload;
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
