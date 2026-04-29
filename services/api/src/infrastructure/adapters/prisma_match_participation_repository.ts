import type {
  AddParticipantAtomicResult,
  MatchParticipationRepository,
} from '../../domain/ports/match_participation_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaMatchParticipationRepository implements MatchParticipationRepository {
  async countParticipantsSV(_matchId: string): Promise<number> {
    return PRISMA.matchParticipant.count({ where: { matchId: _matchId } });
  }

  async userIsParticipantSV(_matchId: string, _userId: string): Promise<boolean> {
    const ROW = await PRISMA.matchParticipant.findUnique({
      where: { matchId_userId: { matchId: _matchId, userId: _userId } },
      select: { id: true },
    });
    return ROW !== null;
  }

  async addParticipantSV(_matchId: string, _userId: string): Promise<void> {
    await PRISMA.matchParticipant.create({
      data: { matchId: _matchId, userId: _userId },
      select: { id: true },
    });
  }

  async addParticipantAtomicallySV(
    _matchId: string,
    _userId: string,
    _maxParticipants: number,
  ): Promise<AddParticipantAtomicResult> {
    return PRISMA.$transaction(async (_tx) => {
      // Serializa joins sobre el mismo match (evita sobrepasar maxParticipants en carreras).
      await _tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${_matchId} FOR UPDATE`;

      const EXISTING = await _tx.matchParticipant.findUnique({
        where: { matchId_userId: { matchId: _matchId, userId: _userId } },
        select: { id: true },
      });
      if (EXISTING !== null) {
        return 'ALREADY_JOINED';
      }

      const COUNT = await _tx.matchParticipant.count({ where: { matchId: _matchId } });
      if (COUNT >= _maxParticipants) {
        return 'MATCH_FULL';
      }

      try {
        await _tx.matchParticipant.create({
          data: { matchId: _matchId, userId: _userId },
          select: { id: true },
        });
      } catch (_error) {
        // Fallback defensivo si la FK unique llega a disparar (p. ej. retries inesperados).
        if (
          typeof _error === 'object' &&
          _error !== null &&
          'code' in _error &&
          (_error as { code?: unknown }).code === 'P2002'
        ) {
          return 'ALREADY_JOINED';
        }
        throw _error;
      }
      return 'JOINED';
    });
  }

  async removeParticipantSV(
    _matchId: string,
    _userId: string,
  ): Promise<{ removedCount: number }> {
    const RESULT = await PRISMA.matchParticipant.deleteMany({
      where: { matchId: _matchId, userId: _userId },
    });
    return { removedCount: RESULT.count };
  }

  async listParticipantUserIdsSV(_matchId: string): Promise<string[]> {
    const ROWS = await PRISMA.matchParticipant.findMany({
      where: { matchId: _matchId },
      select: { userId: true },
    });
    return ROWS.map((_r) => _r.userId);
  }
}

