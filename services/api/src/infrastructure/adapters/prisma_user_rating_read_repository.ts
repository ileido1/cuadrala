import type {
  PaginatedUserRatingHistoryDTO,
  UserRatingReadRepository,
  UserRatingReadRowDTO,
} from '../../domain/ports/user_rating_read_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaUserRatingReadRepository implements UserRatingReadRepository {
  async getUserRatingsSV(_userId: string, _categoryId?: string): Promise<UserRatingReadRowDTO[] | null> {
    const USER = await PRISMA.user.findUnique({ where: { id: _userId }, select: { id: true } });
    if (USER === null) return null;

    return await PRISMA.userRating.findMany({
      where: { userId: _userId, ...(typeof _categoryId === 'string' ? { categoryId: _categoryId } : {}) },
      select: { categoryId: true, rating: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getUserRatingHistorySV(_params: {
    userId: string;
    categoryId?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedUserRatingHistoryDTO | null> {
    const USER = await PRISMA.user.findUnique({ where: { id: _params.userId }, select: { id: true } });
    if (USER === null) return null;

    const WHERE = {
      userId: _params.userId,
      ...(typeof _params.categoryId === 'string' ? { categoryId: _params.categoryId } : {}),
    };

    const TOTAL = await PRISMA.userRatingHistory.count({ where: WHERE });
    const ITEMS = await PRISMA.userRatingHistory.findMany({
      where: WHERE,
      select: {
        matchId: true,
        resultId: true,
        previousRating: true,
        newRating: true,
        kFactor: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (_params.page - 1) * _params.limit,
      take: _params.limit,
    });

    return { items: ITEMS, pageInfo: { page: _params.page, limit: _params.limit, total: TOTAL } };
  }
}

