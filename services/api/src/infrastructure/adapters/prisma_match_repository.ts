import type {
  MatchListFiltersDTO,
  MatchRepository,
  OpenMatchDTO,
  PageDTO,
} from '../../domain/ports/match_repository.js';

import { PRISMA } from '../prisma_client.js';

function computeOpenMatchDTO(_row: {
  id: string;
  sportId: string;
  categoryId: string;
  status: string;
  scheduledAt: Date | null;
  maxParticipants: number;
  _count: { participants: number };
}): OpenMatchDTO {
  const PARTICIPANT_COUNT = _row._count.participants;
  const OPEN_SPOTS = Math.max(0, _row.maxParticipants - PARTICIPANT_COUNT);
  return {
    id: _row.id,
    sportId: _row.sportId,
    categoryId: _row.categoryId,
    status: _row.status,
    scheduledAt: _row.scheduledAt,
    maxParticipants: _row.maxParticipants,
    participantCount: PARTICIPANT_COUNT,
    openSpots: OPEN_SPOTS,
  };
}

export class PrismaMatchRepository implements MatchRepository {
  async listOpenMatchesSV(
    _filters: MatchListFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: OpenMatchDTO[]; total: number }> {
    const WHERE = {
      sportId: _filters.sportId,
      status: _filters.status ?? 'SCHEDULED',
      ...(_filters.categoryId !== undefined ? { categoryId: _filters.categoryId } : {}),
      ...(_filters.scheduledFrom !== undefined || _filters.scheduledTo !== undefined
        ? {
            scheduledAt: {
              ...(_filters.scheduledFrom !== undefined ? { gte: _filters.scheduledFrom } : {}),
              ...(_filters.scheduledTo !== undefined ? { lte: _filters.scheduledTo } : {}),
            },
          }
        : {}),
    };

    const SKIP = (_page.page - 1) * _page.limit;
    const TAKE = _page.limit;

    const [TOTAL, ROWS] = await PRISMA.$transaction([
      PRISMA.match.count({ where: WHERE }),
      PRISMA.match.findMany({
        where: WHERE,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
        skip: SKIP,
        take: TAKE,
        select: {
          id: true,
          sportId: true,
          categoryId: true,
          status: true,
          scheduledAt: true,
          maxParticipants: true,
          _count: { select: { participants: true } },
        },
      }),
    ]);

    // Solo abiertas con cupos vacíos (openSpots > 0)
    const ITEMS = ROWS.map(computeOpenMatchDTO).filter((_m) => _m.openSpots > 0);

    return { items: ITEMS, total: TOTAL };
  }
}

