export type PaymentMatchWithParticipantsDTO = {
  id: string;
  venueId: string | null;
  participants: Array<{ userId: string }>;
};

export interface PaymentMatchReadRepository {
  findByIdSV(_matchId: string): Promise<{ id: string } | null>;
  findWithParticipantsSV(
    _matchId: string,
  ): Promise<PaymentMatchWithParticipantsDTO | null>;
}
