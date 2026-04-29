export type MatchResultDraftStatusDTO = 'DRAFT' | 'REJECTED' | 'FINALIZED';
export type MatchResultConfirmationStatusDTO = 'CONFIRMED' | 'REJECTED';

export type MatchResultDraftDTO = {
  id: string;
  matchId: string;
  version: number;
  status: MatchResultDraftStatusDTO;
  payload: unknown;
  proposedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface MatchResultDraftRepository {
  findLatestByMatchIdSV(_matchId: string): Promise<MatchResultDraftDTO | null>;
  createDraftSV(_input: {
    matchId: string;
    version: number;
    payload: unknown;
    proposedByUserId: string;
  }): Promise<MatchResultDraftDTO>;

  updateDraftSV(_draftId: string, _patch: { payload?: unknown; status?: MatchResultDraftStatusDTO }): Promise<void>;
  deleteConfirmationsByDraftIdSV(_draftId: string): Promise<void>;

  upsertConfirmationSV(_input: {
    draftId: string;
    userId: string;
    status: MatchResultConfirmationStatusDTO;
  }): Promise<void>;

  listConfirmationsByDraftIdSV(_draftId: string): Promise<Array<{ userId: string; status: MatchResultConfirmationStatusDTO }>>;

  createMatchResultAndFinalizeDraftSV(_input: {
    matchId: string;
    draftId: string;
    scores: Array<{ userId: string; points: number }>;
  }): Promise<{ resultId: string }>;
}

