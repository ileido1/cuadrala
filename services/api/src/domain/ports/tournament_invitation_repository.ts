export type TournamentInvitationDTO = {
  id: string;
  tournamentId: string;
  invitedUserId: string;
  createdByUserId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTournamentInvitationDTO = {
  tournamentId: string;
  invitedUserId: string;
  createdByUserId: string;
};

export interface TournamentInvitationRepository {
  createSV(_input: CreateTournamentInvitationDTO): Promise<TournamentInvitationDTO>;

  findByIdSV(_id: string): Promise<TournamentInvitationDTO | null>;

  findByTournamentAndUserSV(
    _tournamentId: string,
    _invitedUserId: string,
  ): Promise<TournamentInvitationDTO | null>;

  listByTournamentIdSV(_tournamentId: string): Promise<TournamentInvitationDTO[]>;

  updateStatusSV(_id: string, _status: string): Promise<TournamentInvitationDTO | null>;
}
