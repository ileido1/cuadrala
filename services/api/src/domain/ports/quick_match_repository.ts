export type QuickMatchSlot = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type QuickMatchSearchStatus = 'SEARCHING' | 'PROPOSAL' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
export type QuickMatchProposalType = 'OPEN_MATCH' | 'NEW_GROUP';
export type QuickMatchProposalStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'EXPIRED' | 'DISMISSED';

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
};

export type StartQuickMatchInput = Omit<QuickMatchSearchDTO, 'id' | 'status' | 'noMatchYet' | 'dismissedMatchIds' | 'proposal'>;

export interface QuickMatchRepository {
  startForUserSV(_userId: string, _input: StartQuickMatchInput): Promise<QuickMatchSearchDTO>;
  findByUserIdSV(_userId: string): Promise<QuickMatchSearchDTO | null>;
  cancelForUserSV(_userId: string): Promise<void>;
  findOpenCandidateSV(_search: QuickMatchSearchDTO): Promise<QuickMatchOpenCandidateDTO | null>;
  createOpenProposalSV(_searchId: string, _candidate: QuickMatchOpenCandidateDTO, _expiresAt: Date): Promise<QuickMatchSearchDTO>;
  markNoMatchYetSV(_searchId: string): Promise<QuickMatchSearchDTO>;
}

export type QuickMatchOpenCandidateDTO = {
  matchId: string;
  participantIds: string[];
};
