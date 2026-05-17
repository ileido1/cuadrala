export type ObligationCreatedDTO = {
  id: string;
  userId: string;
  amountBase: string;
  feeAmount: string;
  amountTotal: string;
  status: string;
};

export type ObligationSkippedDTO = {
  userId: string;
  reason: 'ALREADY_HAS_ACTIVE_OBLIGATION';
};

export type CreateObligationsResultDTO = {
  created: ObligationCreatedDTO[];
  skipped: ObligationSkippedDTO[];
};
