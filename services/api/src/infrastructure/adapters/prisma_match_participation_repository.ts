import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';

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
}

