export type QuickMatchSlot = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type QuickMatchSearchStatus = 'SEARCHING' | 'PROPOSAL' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
export type QuickMatchProposalType = 'OPEN_MATCH' | 'NEW_GROUP';
export type QuickMatchProposalStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'EXPIRED' | 'DISMISSED';

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
};

export type StartQuickMatchInput = Omit<QuickMatchSearchDTO, 'id' | 'status' | 'noMatchYet' | 'dismissedMatchIds' | 'proposal' | 'acceptedCount'>;

export type QuickMatchOpenCandidateDTO = {
  matchId: string;
  participantIds: string[];
};

/** Grupo completo de 4 jugadores listo para el ready check. */
export type QuickMatchGroupCandidateDTO = {
  /** Búsquedas en SEARCHING que entran al grupo (incluye la del buscador). */
  searchIds: string[];
  /** Los 4 jugadores del grupo. */
  userIds: string[];
  /** Jugadores sin búsqueda activa cuya disponibilidad guardada coincide. */
  invitationUserIds: string[];
};

/** Resultado de reponer cupos libres de un grupo NEW_GROUP. */
export type QuickMatchRefillDTO = {
  groupKey: string;
  categoryId: string;
  /** Jugadores que entraron al grupo en esta reposición (PENDING con vencimiento nuevo). */
  addedUserIds: string[];
  /** Búsqueda a la que se asocia la notificación de la reposición. */
  notifySearchId: string | null;
};

export interface QuickMatchRepository {
  startForUserSV(_userId: string, _input: StartQuickMatchInput): Promise<QuickMatchSearchDTO>;
  findByUserIdSV(_userId: string): Promise<QuickMatchSearchDTO | null>;
  cancelForUserSV(_userId: string): Promise<void>;
  findOpenCandidateSV(_search: QuickMatchSearchDTO): Promise<QuickMatchOpenCandidateDTO | null>;
  createOpenProposalSV(_searchId: string, _candidate: QuickMatchOpenCandidateDTO, _expiresAt: Date): Promise<QuickMatchSearchDTO | null>;
  findCompatibleGroupSV(_search: QuickMatchSearchDTO): Promise<QuickMatchGroupCandidateDTO | null>;
  createGroupProposalsSV(_search: QuickMatchSearchDTO, _group: QuickMatchGroupCandidateDTO, _expiresAt: Date): Promise<QuickMatchSearchDTO | null>;
  markNoMatchYetSV(_searchId: string): Promise<QuickMatchSearchDTO>;
  dismissProposalForUserSV(_userId: string): Promise<QuickMatchSearchDTO>;
  confirmProposalForUserSV(_userId: string, _venueSelection?: QuickMatchVenueSelectionDTO): Promise<QuickMatchSearchDTO>;
  /** Grupo con cupos libres compatible con la búsqueda (el más antiguo), o null. */
  findOpenGroupKeySV(_search: QuickMatchSearchDTO): Promise<string | null>;
  /** Repone los cupos libres del grupo con los siguientes jugadores compatibles; null si no hay cupos. */
  refillGroupSV(_groupKey: string, _expiresAt: Date): Promise<QuickMatchRefillDTO | null>;
}
