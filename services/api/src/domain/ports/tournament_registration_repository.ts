export type TournamentRegistrationDTO = {
  id: string;
  tournamentId: string;
  /** Nulo para inscripciones GUEST (Slice 1: tournament-guest-registration). */
  userId: string | null;
  /** Nombre del usuario autenticado (null para GUEST). */
  userName: string | null;
  status: string;
  /** AUTHENTICATED ⇒ tiene `userId`. GUEST ⇒ `userId` nulo, campos de invitado presentes. */
  registrationType: 'AUTHENTICATED' | 'GUEST';
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  /** Organizador que dio de alta al invitado (solo GUEST). */
  registeredByUserId: string | null;
  /** La otra mitad de la dupla, en torneos de parejas fijas. */
  partnerRegistrationId: string | null;
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

  /**
   * Enlaza dos inscripciones como dupla, en una sola transaccion.
   *
   * El enlace es simetrico: dejar una sola fila apuntando seria media dupla,
   * que es justo el estado que rompe la generacion del cuadro.
   */
  pairSV(_firstId: string, _secondId: string): Promise<void>;

  /** Deshace la dupla de una inscripcion y la de su companero. */
  unpairSV(_registrationId: string): Promise<boolean>;

  /** Cambia el estado de una inscripcion y el de su companero a la vez. */
  updateStatusWithPartnerSV(_id: string, _status: string): Promise<TournamentRegistrationDTO | null>;
}
