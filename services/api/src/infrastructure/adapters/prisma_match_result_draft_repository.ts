import type {
  MatchResultConfirmationStatusDTO,
  MatchResultDraftDTO,
  MatchResultDraftRepository,
  MatchResultDraftStatusDTO,
} from '../../domain/ports/match_result_draft_repository.js';

import { PRISMA } from '../prisma_client.js';

function toDraftDTO(_row: {
  id: string;
  matchId: string;
  version: number;
  status: MatchResultDraftStatusDTO;
  payload: unknown;
  proposedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}): MatchResultDraftDTO {
  return {
    id: _row.id,
    matchId: _row.matchId,
    version: _row.version,
    status: _row.status,
    payload: _row.payload,
    proposedByUserId: _row.proposedByUserId,
    createdAt: _row.createdAt,
    updatedAt: _row.updatedAt,
  };
}

export class PrismaMatchResultDraftRepository implements MatchResultDraftRepository {
  async findLatestByMatchIdSV(_matchId: string): Promise<MatchResultDraftDTO | null> {
    const ROW = await PRISMA.matchResultDraft.findFirst({
      where: { matchId: _matchId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        matchId: true,
        version: true,
        status: true,
        payload: true,
        proposedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return ROW === null ? null : toDraftDTO(ROW as unknown as Parameters<typeof toDraftDTO>[0]);
  }

  async createDraftSV(_input: {
    matchId: string;
    version: number;
    payload: unknown;
    proposedByUserId: string;
  }): Promise<MatchResultDraftDTO> {
    const ROW = await PRISMA.matchResultDraft.create({
      data: {
        matchId: _input.matchId,
        version: _input.version,
        status: 'DRAFT',
        payload: _input.payload as never,
        proposedByUserId: _input.proposedByUserId,
      },
      select: {
        id: true,
        matchId: true,
        version: true,
        status: true,
        payload: true,
        proposedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return toDraftDTO(ROW as unknown as Parameters<typeof toDraftDTO>[0]);
  }

  async updateDraftSV(
    _draftId: string,
    _patch: { payload?: unknown; status?: MatchResultDraftStatusDTO },
  ): Promise<void> {
    await PRISMA.matchResultDraft.update({
      where: { id: _draftId },
      data: {
        ...(_patch.payload !== undefined ? { payload: _patch.payload as never } : {}),
        ...(_patch.status !== undefined ? { status: _patch.status } : {}),
      },
      select: { id: true },
    });
  }

  async deleteConfirmationsByDraftIdSV(_draftId: string): Promise<void> {
    await PRISMA.matchResultConfirmation.deleteMany({ where: { draftId: _draftId } });
  }

  async upsertConfirmationSV(_input: {
    draftId: string;
    userId: string;
    status: MatchResultConfirmationStatusDTO;
  }): Promise<void> {
    await PRISMA.matchResultConfirmation.upsert({
      where: { draftId_userId: { draftId: _input.draftId, userId: _input.userId } },
      create: {
        draftId: _input.draftId,
        userId: _input.userId,
        status: _input.status,
      },
      update: {
        status: _input.status,
      },
      select: { id: true },
    });
  }

  async listConfirmationsByDraftIdSV(
    _draftId: string,
  ): Promise<Array<{ userId: string; status: MatchResultConfirmationStatusDTO }>> {
    const ROWS = await PRISMA.matchResultConfirmation.findMany({
      where: { draftId: _draftId },
      select: { userId: true, status: true },
    });
    return ROWS.map((_r) => ({ userId: _r.userId, status: _r.status as MatchResultConfirmationStatusDTO }));
  }

  async createMatchResultAndFinalizeDraftSV(_input: {
    matchId: string;
    draftId: string;
    scores: Array<{ userId: string; points: number }>;
  }): Promise<{ resultId: string }> {
    const CREATED = await PRISMA.$transaction(async (_tx) => {
      const RESULT = await _tx.matchResult.create({
        data: {
          matchId: _input.matchId,
          scores: {
            create: _input.scores.map((_s) => ({
              userId: _s.userId,
              points: _s.points,
            })),
          },
        },
        select: { id: true, matchId: true },
      });

      await _tx.matchResultDraft.update({
        where: { id: _input.draftId },
        data: { status: 'FINALIZED' },
        select: { id: true },
      });

      return RESULT;
    });

    return { resultId: CREATED.id };
  }
}

