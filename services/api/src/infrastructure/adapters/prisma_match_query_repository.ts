import type {
  ListMatchesFiltersDTO,
  MatchDetailDTO,
  MatchListItemDTO,
  MatchQueryRepository,
  PageDTO,
} from '../../domain/ports/match_query_repository.js';

import { PRISMA } from '../prisma_client.js';

function toListItemDTO(_row: {
  id: string;
  sportId: string;
  categoryId: string;
  type: 'AMERICANO' | 'REGULAR';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  scheduledAt: Date | null;
  maxParticipants: number;
  _count: { participants: number };
}): MatchListItemDTO {
  const PARTICIPANT_COUNT = _row._count.participants;
  const OPEN_SPOTS = Math.max(0, _row.maxParticipants - PARTICIPANT_COUNT);
  return {
    id: _row.id,
    sportId: _row.sportId,
    categoryId: _row.categoryId,
    type: _row.type,
    status: _row.status,
    scheduledAt: _row.scheduledAt,
    maxParticipants: _row.maxParticipants,
    participantCount: PARTICIPANT_COUNT,
    openSpots: OPEN_SPOTS,
  };
}

export class PrismaMatchQueryRepository implements MatchQueryRepository {
  async listMatchesSV(
    _filters: ListMatchesFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: MatchListItemDTO[]; total: number }> {
    const WHERE = {
      ...(_filters.sportId !== undefined ? { sportId: _filters.sportId } : {}),
      ...(_filters.categoryId !== undefined ? { categoryId: _filters.categoryId } : {}),
      ...(_filters.status !== undefined ? { status: _filters.status } : {}),
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
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        skip: SKIP,
        take: TAKE,
        select: {
          id: true,
          sportId: true,
          categoryId: true,
          type: true,
          status: true,
          scheduledAt: true,
          maxParticipants: true,
          _count: { select: { participants: true } },
        },
      }),
    ]);

    return { items: ROWS.map(toListItemDTO), total: TOTAL };
  }

  async getMatchByIdSV(_matchId: string): Promise<MatchDetailDTO | null> {
    const ROW = await PRISMA.match.findUnique({
      where: { id: _matchId },
      select: {
        id: true,
        sportId: true,
        categoryId: true,
        type: true,
        status: true,
        scheduledAt: true,
        maxParticipants: true,
        courtId: true,
        tournamentId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { participants: true } },
        participants: {
          select: { userId: true, createdAt: true },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });

    if (ROW === null) return null;

    const BASE = toListItemDTO(ROW);
    return {
      ...BASE,
      courtId: ROW.courtId,
      tournamentId: ROW.tournamentId,
      participants: ROW.participants.map((_p) => ({ userId: _p.userId, joinedAt: _p.createdAt })),
      createdAt: ROW.createdAt,
      updatedAt: ROW.updatedAt,
    };
  }
}

