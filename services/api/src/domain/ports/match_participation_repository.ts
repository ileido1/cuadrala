export type AddParticipantAtomicResult = 'JOINED' | 'ALREADY_JOINED' | 'MATCH_FULL';

export interface MatchParticipationRepository {
  countParticipantsSV(_matchId: string): Promise<number>;
  userIsParticipantSV(_matchId: string, _userId: string): Promise<boolean>;
  addParticipantSV(_matchId: string, _userId: string): Promise<void>;
  addParticipantAtomicallySV(
    _matchId: string,
    _userId: string,
    _maxParticipants: number,
  ): Promise<AddParticipantAtomicResult>;
  removeParticipantSV(_matchId: string, _userId: string): Promise<{ removedCount: number }>;
  listParticipantUserIdsSV(_matchId: string): Promise<string[]>;
}

