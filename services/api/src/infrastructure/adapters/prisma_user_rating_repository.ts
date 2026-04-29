import type {
  UserRatingDTO,
  UserRatingHistoryDTO,
  UserRatingRepository,
} from '../../domain/ports/user_rating_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaUserRatingRepository implements UserRatingRepository {
  async getRatingsByUserIdsSV(_categoryId: string, _userIds: string[]): Promise<UserRatingDTO[]> {
    if (_userIds.length === 0) return [];
    const ROWS = await PRISMA.userRating.findMany({
      where: { categoryId: _categoryId, userId: { in: _userIds } },
      select: { userId: true, categoryId: true, rating: true },
    });
    return ROWS;
  }

  async upsertRatingsSV(_ratings: UserRatingDTO[]): Promise<void> {
    if (_ratings.length === 0) return;
    await PRISMA.$transaction(
      _ratings.map((_r) =>
        PRISMA.userRating.upsert({
          where: { categoryId_userId: { categoryId: _r.categoryId, userId: _r.userId } },
          create: { categoryId: _r.categoryId, userId: _r.userId, rating: _r.rating },
          update: { rating: _r.rating },
        }),
      ),
    );
  }

  async appendHistorySV(_rows: UserRatingHistoryDTO[]): Promise<void> {
    if (_rows.length === 0) return;
    // Idempotencia: si ya existen (resultId,userId), Prisma lanzará unique violation en createMany.
    // Usamos skipDuplicates para soportar retries.
    await PRISMA.userRatingHistory.createMany({
      data: _rows,
      skipDuplicates: true,
    });
  }

  async countHistoryByUserIdsSV(_categoryId: string, _userIds: string[]): Promise<Record<string, number>> {
    if (_userIds.length === 0) return {};
    const GROUPED = await PRISMA.userRatingHistory.groupBy({
      by: ['userId'],
      where: { categoryId: _categoryId, userId: { in: _userIds } },
      _count: { _all: true },
    });

    const OUT: Record<string, number> = {};
    for (const _g of GROUPED) {
      OUT[_g.userId] = _g._count._all;
    }
    return OUT;
  }
}

