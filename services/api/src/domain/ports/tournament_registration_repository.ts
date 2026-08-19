export type TournamentRegistrationDTO = {
  id: string;
  tournamentId: string;
  /** Nulo para inscripciones GUEST (Slice 1: tournament-guest-registration). */
  userId: string | null;
  status: string;
  createdAt: Date;
};

export type UpsertTournamentRegistrationDTO = {
  tournamentId: string;
  userId: string;
  status?: string;
};

export interface TournamentRegistrationRepository {
  upsertSV(_input: UpsertTournamentRegistrationDTO): Promise<{ created: boolean; registration: TournamentRegistrationDTO }>;

  findByTournamentAndUserSV(_tournamentId: string, _userId: string): Promise<TournamentRegistrationDTO | null>;

  listByTournamentIdSV(_tournamentId: string): Promise<TournamentRegistrationDTO[]>;

  listByTournamentIdAndStatusSV(_tournamentId: string, _status: string): Promise<TournamentRegistrationDTO[]>;

  countByTournamentIdSV(_tournamentId: string): Promise<number>;

  disableByTournamentAndUserSV(_tournamentId: string, _userId: string): Promise<boolean>;
}
