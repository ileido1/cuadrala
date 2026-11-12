export type QuickMatchSlot = 'MORNING' | 'AFTERNOON' | 'EVENING';

/** Tiempo para responder un ready check o una invitación por disponibilidad (2 min). */
export const QUICK_MATCH_HOLD_MS = 2 * 60 * 1000;
export type QuickMatchSearchStatus = 'SEARCHING' | 'PROPOSAL' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
export type QuickMatchProposalType = 'OPEN_MATCH' | 'NEW_GROUP';
/** LOBBY: miembro de un lobby que se llena de a uno, todavía sin ready check (S1). */
export type QuickMatchProposalStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'EXPIRED' | 'DISMISSED' | 'LOBBY';

export type QuickMatchVenueSelectionDTO = {
  venueId: string;
  courtId: string;
  scheduledAt: Date;
};

export type QuickMatchProposalDTO = {
  id: string;
  type: QuickMatchProposalType;
  status: QuickMatchProposalStatus;
  matchId: string | null;
  /** Miembros actuales del grupo; menos de 4 mientras se busca reemplazo. */
  playerIds: string[];
  /** Identifica el grupo NEW_GROUP; null en OPEN_MATCH. */
  groupKey?: string | null;
  venueOptions: unknown | null;
  expiresAt: Date;
};

export type QuickMatchSearchDTO = {
  id: string;
  sportId: string;
  categoryId: string;
  targetDate: Date;
  slots: QuickMatchSlot[];
  widenLevel: boolean;
  zoneKm: number;
  includeOpenMatches: boolean;
  status: QuickMatchSearchStatus;
  noMatchYet: boolean;
  dismissedMatchIds: string[];
  proposal: QuickMatchProposalDTO | null;
  /** Miembros del grupo NEW_GROUP que ya aceptaron el ready check; 0 para OPEN_MATCH o sin propuesta. */
  acceptedCount: number;
  /** true mientras la propuesta es una invitación por disponibilidad todavía sin aceptar (S12). */
  invitedByAvailability: boolean;
};

export type StartQuickMatchInput = Omit<QuickMatchSearchDTO, 'id' | 'status' | 'noMatchYet' | 'dismissedMatchIds' | 'proposal' | 'acceptedCount' | 'invitedByAvailability'>;

export type QuickMatchOpenCandidateDTO = {
  matchId: string;
  participantIds: string[];
};

/** Resultado de sumar jugadores a un grupo NEW_GROUP (lobby o ready check). */
export type QuickMatchRefillDTO = {
  groupKey: string;
  categoryId: string;
  /** Fase del grupo después de la operación. */
  phase: 'LOBBY' | 'READY_CHECK';
  /** Jugadores que entraron como miembros en esta operación. */
  addedUserIds: string[];
  /** Jugadores invitados por disponibilidad en esta operación (todavía no son miembros). */
  invitedUserIds: string[];
  /** Miembros actuales del grupo después de la operación. */
  memberUserIds: string[];
  /** true si esta operación llevó el lobby a 4 y arrancó el ready check (S2). */
  readyCheckStarted: boolean;
  /** Búsqueda de un miembro a la que se asocian las notificaciones. */
  notifySearchId: string | null;
};

export interface QuickMatchRepository {
  startForUserSV(_userId: string, _input: StartQuickMatchInput): Promise<QuickMatchSearchDTO>;
  findByUserIdSV(_userId: string): Promise<QuickMatchSearchDTO | null>;
  cancelForUserSV(_userId: string): Promise<void>;
  findOpenCandidateSV(_search: QuickMatchSearchDTO): Promise<QuickMatchOpenCandidateDTO | null>;
  createOpenProposalSV(_searchId: string, _candidate: QuickMatchOpenCandidateDTO, _expiresAt: Date): Promise<QuickMatchSearchDTO | null>;
  /** Junta al buscador con el siguiente buscador solo compatible en un lobby nuevo (S1); null si no hay nadie. */
  formLobbySV(_search: QuickMatchSearchDTO): Promise<QuickMatchRefillDTO | null>;
  markNoMatchYetSV(_searchId: string): Promise<QuickMatchSearchDTO>;
  dismissProposalForUserSV(_userId: string): Promise<QuickMatchSearchDTO>;
  confirmProposalForUserSV(_userId: string, _venueSelection?: QuickMatchVenueSelectionDTO): Promise<QuickMatchSearchDTO>;
  /** Grupo con cupos libres compatible con la búsqueda: primero ready checks, después lobbies (el más antiguo), o null. */
  findOpenGroupKeySV(_search: QuickMatchSearchDTO): Promise<string | null>;
  /**
   * Suma jugadores a los cupos libres: buscadores directo como miembros y, si
   * faltan, invitaciones por disponibilidad (S12). En un lobby, llegar a 4 arranca
   * el ready check con `_expiresAt` (S2). null si no hay cupos o el grupo no existe.
   */
  refillGroupSV(_groupKey: string, _expiresAt: Date): Promise<QuickMatchRefillDTO | null>;
}
