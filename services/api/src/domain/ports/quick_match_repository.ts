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
  playerIds: string[];
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
}
