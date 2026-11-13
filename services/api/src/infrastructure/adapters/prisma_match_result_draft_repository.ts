import type {
  MatchResultConfirmationStatusDTO,
  MatchResultDraftDTO,
  MatchResultDraftRepository,
  MatchResultDraftStatusDTO,
} from '../../domain/ports/match_result_draft_repository.js';

import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../domain/errors/app_error.js';
import { PRISMA } from '../prisma_client.js';

/**
 * Pasa la partida (y su reserva) de IN_PROGRESS a FINISHED dentro de `_tx`.
 * Si otro proceso la terminó primero (worker al vencer el bloque) sigue igual;
 * si quedó en otro estado (cancelada) aborta la transacción.
 */
async function finishInProgressMatchTxSV(_tx: Prisma.TransactionClient, _matchId: string): Promise<void> {
  const UPDATED = await _tx.match.updateMany({
    where: { id: _matchId, status: 'IN_PROGRESS' },
    data: { status: 'FINISHED' },
  });
  if (UPDATED.count === 0) {
    const CURRENT = await _tx.match.findUnique({ where: { id: _matchId }, select: { status: true } });
    if (CURRENT?.status !== 'FINISHED') {
      throw new AppError('TRANSICION_INVALIDA', 'No se pudo terminar la partida por su estado actual.', 409);
    }
  }
  await _tx.reservation.updateMany({
    where: { matchId: _matchId, matchStatus: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
    data: { matchStatus: 'FINISHED' },
  });
}

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
    finishInProgressMatch?: boolean;
  }): Promise<MatchResultDraftDTO> {
    const ROW = await PRISMA.$transaction(async (_tx) => {
      //? 1. Cargar el resultado termina la partida en curso (S2)
      if (_input.finishInProgressMatch === true) {
        await finishInProgressMatchTxSV(_tx, _input.matchId);
      }
      //? 2. Guardar el borrador
      return _tx.matchResultDraft.create({
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
    });
    return toDraftDTO(ROW as unknown as Parameters<typeof toDraftDTO>[0]);
  }

  async updateDraftSV(
    _draftId: string,
    _patch: { payload?: unknown; status?: MatchResultDraftStatusDTO; finishInProgressMatchId?: string },
  ): Promise<void> {
    await PRISMA.$transaction(async (_tx) => {
      if (_patch.finishInProgressMatchId !== undefined) {
        await finishInProgressMatchTxSV(_tx, _patch.finishInProgressMatchId);
      }
      await _tx.matchResultDraft.update({
        where: { id: _draftId },
        data: {
          ...(_patch.payload !== undefined ? { payload: _patch.payload as never } : {}),
          ...(_patch.status !== undefined ? { status: _patch.status } : {}),
        },
        select: { id: true },
      });
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
    payload?: unknown;
  }): Promise<{ resultId: string }> {
    const CREATED = await PRISMA.$transaction(async (_tx) => {
      const RESULT = await _tx.matchResult.create({
        data: {
          matchId: _input.matchId,
          ...(_input.payload !== undefined ? { payload: _input.payload as never } : {}),
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

