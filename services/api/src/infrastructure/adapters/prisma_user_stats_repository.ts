import type { UserStatsDTO, UserStatsRepository } from '../../domain/ports/user_stats_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaUserStatsRepository implements UserStatsRepository {
  async getUserStatsSV(_userId: string): Promise<UserStatsDTO | null> {
    const USER = await PRISMA.user.findUnique({ where: { id: _userId }, select: { id: true } });
    if (USER === null) return null;

    const SCORES = await PRISMA.matchResultScore.findMany({
      where: { userId: _userId },
      select: { points: true, result: { select: { matchId: true } } },
    });

    const MATCH_IDS = new Set(SCORES.map((_s) => _s.result.matchId));
    const POINTS = SCORES.reduce((_acc, _s) => _acc + _s.points, 0);

    return { userId: _userId, gamesPlayed: MATCH_IDS.size, points: POINTS };
  }
}

