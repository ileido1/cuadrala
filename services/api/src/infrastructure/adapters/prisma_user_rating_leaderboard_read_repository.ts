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
      select: { userId: true, rating: true, updatedAt: true },
      orderBy: [{ rating: 'desc' }, { updatedAt: 'desc' }, { userId: 'asc' }],
      take: _params.limit,
    });

    return {
      items: ROWS.map((_r, _idx) => ({ ..._r, rank: _idx + 1 })),
    };
  }
}

