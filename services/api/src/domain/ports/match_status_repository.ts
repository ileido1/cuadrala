export type MatchStatusTransitionInputDTO = {
  matchId: string;
  fromStatus: string;
  toStatus: string;
};

export interface MatchStatusRepository {
  transitionStatusIfCurrentSV(_input: MatchStatusTransitionInputDTO): Promise<boolean>;
}

