// Tipos DTO para consulta de torneos (solo lectura).
// El puerto de escritura sigue siendo TournamentRepository.

export type TournamentStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TournamentVisibility = 'PUBLIC' | 'PRIVATE';

export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'WITHDRAWN';

/** Reusa `MatchGender` (schema.prisma). `null` = sin declarar. */
export type TournamentGender = 'MALE' | 'FEMALE' | 'MIXED';

export type TournamentListItemDTO = {
  id: string;
  name: string;
  status: TournamentStatus;
  visibility: TournamentVisibility;
  organizerUserId: string | null;
  /** Nombre del organizador; `null` cuando el torneo no tiene uno asignado. */
  organizerName: string | null;
  sportId: string;
  sportName: string;
  categoryId: string;
  categoryName: string;
  startsAt: string | null;
  registrationCount: number;
  /** Sede del torneo; `null` cuando el organizador no la declaró. */
  venueId: string | null;
  venueName: string | null;
  /** Precio por jugador. `0` es "gratis declarado"; `null` es "sin declarar". */
  inscriptionPrice: number | null;
  /** Cupo máximo declarado. Sin esto el listado no tiene denominador. */
  maxSlots: number | null;
  /** Cierre informativo de la inscripción (ISO 8601). */
  registrationClosesAt: string | null;
  /** Reusa `MatchGender`; `null` = sin declarar. */
  gender: TournamentGender | null;
  /** Distancia a `near` en km. Ausente (nunca `null`) cuando el listado no se filtró por `near`. */
  distanceKm?: number;
};

export type TournamentDetailDTO = TournamentListItemDTO & {
  formatPresetId: string;
  formatPresetName: string;
  presetSchemaVersion: number;
  formatParameters: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type RegistrationDTO = {
  id: string;
  userId: string | null;
  userName: string | null;
  guestName?: string | null;
  status: RegistrationStatus;
  createdAt: string;
};

export type ListTournamentsFiltersDTO = {
  status?: TournamentStatus;
  sportId?: string;
  categoryId?: string;
  venueId?: string;
  startsAtFrom?: string;
  startsAtTo?: string;
  /** Filtra por la sede del torneo dentro de `radiusKm` y habilita `distanceKm` en el DTO. */
  near?: { lat: number; lng: number; radiusKm: number };
};

export type PageDTO = {
  page: number;
  limit: number;
};

/**
 * Un torneo desde el punto de vista del usuario que consulta: en que estado
 * esta su inscripcion (si tiene), si tiene una invitacion pendiente, si es el
 * organizador, y (solo para el organizador) cuantas inscripciones esperan
 * confirmacion.
 */
export type ViewerTournamentItemDTO = {
  tournament: TournamentListItemDTO;
  /** `null` cuando el usuario no tiene inscripcion vigente (PENDING/CONFIRMED) en el torneo. */
  registrationStatus: 'PENDING' | 'CONFIRMED' | null;
  /** Id de la invitacion PENDING del usuario a este torneo; `null` si no hay ninguna. */
  pendingInvitationId: string | null;
  isOrganizer: boolean;
  /** Solo tiene valor cuando `isOrganizer` es true; `null` para cualquier otro rol. */
  pendingRegistrationsCount: number | null;
};

export interface TournamentQueryRepository {
  listTournamentsSV(
    _filters: ListTournamentsFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: TournamentListItemDTO[]; total: number }>;

  getTournamentByIdSV(_tournamentId: string): Promise<TournamentDetailDTO | null>;

  listTournamentRegistrationsSV(
    _tournamentId: string,
  ): Promise<RegistrationDTO[]>;

  listTournamentsByVenueSV(
    _venueId: string,
    _filters: ListTournamentsFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: TournamentListItemDTO[]; total: number }>;

  /**
   * Torneos en los que el usuario esta inscrito, invitado (PENDING), o que
   * organiza. Un torneo puede aparecer una sola vez aunque el usuario cumpla
   * mas de un rol a la vez (p. ej. organizador que tambien se autoinscribio).
   */
  listViewerTournamentsSV(_userId: string): Promise<ViewerTournamentItemDTO[]>;
}
