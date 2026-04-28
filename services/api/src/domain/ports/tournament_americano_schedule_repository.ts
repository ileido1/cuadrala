export type TournamentAmericanoScheduleDTO = {
  tournamentId: string;
  scheduleKey: string;
  schedule: unknown;
};

export interface TournamentAmericanoScheduleRepository {
  findByTournamentIdSV(_tournamentId: string): Promise<TournamentAmericanoScheduleDTO | null>;
  createForTournamentSV(_data: {
    tournamentId: string;
    scheduleKey: string;
    schedule: unknown;
  }): Promise<TournamentAmericanoScheduleDTO>;
}

