export type TournamentRegistrationDTO = {
  id: string;
  tournamentId: string;
  /** Nulo para inscripciones GUEST (Slice 1: tournament-guest-registration). */
  userId: string | null;
  status: string;
  /** AUTHENTICATED ⇒ tiene `userId`. GUEST ⇒ `userId` nulo, campos de invitado presentes. */
  registrationType: 'AUTHENTICATED' | 'GUEST';
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  /** Organizador que dio de alta al invitado (solo GUEST). */
  registeredByUserId: string | null;
  createdAt: Date;
};

export type UpsertTournamentRegistrationDTO = {
  tournamentId: string;
  userId: string;
  status?: string;
};

export type CreateGuestTournamentRegistrationDTO = {
  tournamentId: string;
  guestName: string;
  guestPhone?: string | null;
  guestEmail?: string | null;
  registeredByUserId: string;
};

export interface TournamentRegistrationRepository {
  upsertSV(_input: UpsertTournamentRegistrationDTO): Promise<{ created: boolean; registration: TournamentRegistrationDTO }>;

  findByTournamentAndUserSV(_tournamentId: string, _userId: string): Promise<TournamentRegistrationDTO | null>;

  findByIdSV(_id: string): Promise<TournamentRegistrationDTO | null>;

  listByTournamentIdSV(_tournamentId: string): Promise<TournamentRegistrationDTO[]>;

  listByTournamentIdAndStatusSV(_tournamentId: string, _status: string): Promise<TournamentRegistrationDTO[]>;

  countByTournamentIdSV(_tournamentId: string): Promise<number>;

  disableByTournamentAndUserSV(_tournamentId: string, _userId: string): Promise<boolean>;

  /** Crea una inscripción GUEST en estado PENDING (Slice 1: tournament-guest-registration). */
  createGuestSV(_input: CreateGuestTournamentRegistrationDTO): Promise<TournamentRegistrationDTO>;

  /** Actualiza el status de una inscripción por id; retorna null si no existe. */
  updateStatusByIdSV(_id: string, _status: string): Promise<TournamentRegistrationDTO | null>;

  /** Elimina una inscripción por id; cascada elimina sus `MatchParticipant` (Prisma onDelete: Cascade). */
  deleteByIdSV(_id: string): Promise<boolean>;
}
