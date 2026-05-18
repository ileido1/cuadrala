export type PaymentMatchWithParticipantsDTO = {
  id: string;
  venueId: string | null;
  participants: Array<{ userId: string }>;
};

export type PaymentMatchSummaryContextDTO = {
  id: string;
  pricingCurrency: string;
};

export interface PaymentMatchReadRepository {
  findByIdSV(_matchId: string): Promise<PaymentMatchSummaryContextDTO | null>;
  findWithParticipantsSV(
    _matchId: string,
  ): Promise<PaymentMatchWithParticipantsDTO | null>;
}
