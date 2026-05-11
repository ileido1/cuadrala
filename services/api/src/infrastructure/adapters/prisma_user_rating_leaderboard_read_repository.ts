import type {
  UserRatingLeaderboardDTO,
  UserRatingLeaderboardReadRepository,
} from '../../domain/ports/user_rating_leaderboard_read_repository.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaUserRatingLeaderboardReadRepository implements UserRatingLeaderboardReadRepository {
  async listLeaderboardByCategorySV(_params: {
    categoryId: string;
    limit: number;
  }): Promise<UserRatingLeaderboardDTO> {
    const ROWS = await PRISMA.userRating.findMany({
      where: { categoryId: _params.categoryId },
      include: { user: { select: { name: true } } },
      orderBy: [{ rating: 'desc' }, { updatedAt: 'desc' }, { userId: 'asc' }],
      take: _params.limit,
    });

    return {
      items: ROWS.map((_r, _idx) => ({ userId: _r.userId, rating: _r.rating, updatedAt: _r.updatedAt, displayName: _r.user.name, rank: _idx + 1 })),
    };
  }
}

