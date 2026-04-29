import type { RankingEntryReadRepository } from '../../domain/ports/ranking_entry_read_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaRankingEntryReadRepository implements RankingEntryReadRepository {
  async getPointsByUserIdsSV(
    _categoryId: string,
    _userIds: string[],
  ): Promise<{ userId: string; points: number }[]> {
    if (_userIds.length === 0) return [];
    const ROWS = await PRISMA.rankingEntry.findMany({
      where: { categoryId: _categoryId, userId: { in: _userIds } },
      select: { userId: true, points: true },
    });
    return ROWS;
  }
}

