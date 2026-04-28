export interface MatchParticipationRepository {
  countParticipantsSV(_matchId: string): Promise<number>;
  userIsParticipantSV(_matchId: string, _userId: string): Promise<boolean>;
  addParticipantSV(_matchId: string, _userId: string): Promise<void>;
}

