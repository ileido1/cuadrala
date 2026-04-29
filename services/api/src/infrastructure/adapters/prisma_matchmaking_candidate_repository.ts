import type {
  MatchmakingCandidateRepository,
  MatchmakingDirectoryCandidateDTO,
  MatchmakingEloCandidateDTO,
  MatchmakingRankingCandidateDTO,
} from '../../domain/ports/matchmaking_candidate_repository.js';

import { PRISMA } from '../prisma_client.js';

const MAX_CANDIDATE_POOL = 500;

export class PrismaMatchmakingCandidateRepository implements MatchmakingCandidateRepository {
  async listEloCandidatesSV(_dto: {
    categoryId: string;
    excludeUserIds: string[];
    limit: number;
  }): Promise<MatchmakingEloCandidateDTO[]> {
    const TAKE = Math.min(Math.max(_dto.limit, 0), MAX_CANDIDATE_POOL);
    if (TAKE === 0) return [];

    const ROWS = await PRISMA.userRating.findMany({
      where: {
        categoryId: _dto.categoryId,
        ...(_dto.excludeUserIds.length > 0 ? { userId: { notIn: _dto.excludeUserIds } } : {}),
      },
      orderBy: { rating: 'asc' },
      take: TAKE,
      select: { userId: true, rating: true, user: { select: { name: true } } },
    });

    return ROWS.map((_r) => ({ userId: _r.userId, name: _r.user.name, rating: _r.rating }));
  }

  async listRankingCandidatesSV(_dto: {
    categoryId: string;
    excludeUserIds: string[];
    limit: number;
  }): Promise<MatchmakingRankingCandidateDTO[]> {
    const TAKE = Math.min(Math.max(_dto.limit, 0), MAX_CANDIDATE_POOL);
    if (TAKE === 0) return [];

    const ROWS = await PRISMA.rankingEntry.findMany({
      where: {
        categoryId: _dto.categoryId,
        ...(_dto.excludeUserIds.length > 0 ? { userId: { notIn: _dto.excludeUserIds } } : {}),
      },
      orderBy: { points: 'desc' },
      take: TAKE,
      select: { userId: true, points: true, user: { select: { name: true } } },
    });

    return ROWS.map((_r) => ({ userId: _r.userId, name: _r.user.name, points: _r.points }));
  }

  async listDirectoryCandidatesSV(_dto: {
    categoryId: string;
    excludeUserIds: string[];
    limit: number;
  }): Promise<MatchmakingDirectoryCandidateDTO[]> {
    const TAKE = Math.min(Math.max(_dto.limit, 0), MAX_CANDIDATE_POOL);
    if (TAKE === 0) return [];

    const ROWS = await PRISMA.userCategory.findMany({
      where: {
        categoryId: _dto.categoryId,
        ...(_dto.excludeUserIds.length > 0 ? { userId: { notIn: _dto.excludeUserIds } } : {}),
      },
      orderBy: { user: { name: 'asc' } },
      take: TAKE,
      select: { userId: true, user: { select: { name: true } } },
    });

    // Compat/hardening: si no hay UserCategory (seed incompleto), sugerimos desde User para no devolver vacío.
    if (ROWS.length === 0) {
      const USERS = await PRISMA.user.findMany({
        where: _dto.excludeUserIds.length > 0 ? { id: { notIn: _dto.excludeUserIds } } : {},
        orderBy: { name: 'asc' },
        take: TAKE,
        select: { id: true, name: true },
      });
      return USERS.map((_u) => ({ userId: _u.id, name: _u.name }));
    }

    return ROWS.map((_r) => ({ userId: _r.userId, name: _r.user.name }));
  }

  async getCategoryAverageEloSV(_categoryId: string): Promise<number | null> {
    const RES = await PRISMA.userRating.aggregate({
      where: { categoryId: _categoryId },
      _avg: { rating: true },
    });
    return RES._avg.rating ?? null;
  }

  async getCategoryAveragePointsSV(_categoryId: string): Promise<number | null> {
    const RES = await PRISMA.rankingEntry.aggregate({
      where: { categoryId: _categoryId },
      _avg: { points: true },
    });
    return RES._avg.points ?? null;
  }
}

