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
  //? Con `finishInProgressMatch`, en la misma transacción pasa la partida (y su
  //? reserva) de IN_PROGRESS a FINISHED: cargar el resultado termina la partida.
  createDraftSV(_input: {
    matchId: string;
    version: number;
    payload: unknown;
    proposedByUserId: string;
    finishInProgressMatch?: boolean;
  }): Promise<MatchResultDraftDTO>;

  updateDraftSV(
    _draftId: string,
    _patch: { payload?: unknown; status?: MatchResultDraftStatusDTO; finishInProgressMatchId?: string },
  ): Promise<void>;
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
    payload?: unknown;
  }): Promise<{ resultId: string }>;
}

