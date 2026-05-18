import type {
  ListMatchesFiltersDTO,
  ListVenueMatchesFiltersDTO,
  MatchDetailDTO,
  MatchListItemDTO,
  MatchQueryRepository,
  PageDTO,
} from '../../domain/ports/match_query_repository.js';

import type { PrismaClient } from '../../generated/prisma/client.js';
import type { MatchWhereInput } from '../../generated/prisma.js';

function toListItemDTO(_row: {
  id: string;
  sportId: string;
  categoryId: string;
  category: { name: string } | null;
  type: 'AMERICANO' | 'REGULAR';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  scheduledAt: Date | null;
  pricePerPlayerCents: number;
  maxParticipants: number;
  _count: { participants: number };
}): MatchListItemDTO {
  const PARTICIPANT_COUNT = _row._count.participants;
  const OPEN_SPOTS = Math.max(0, _row.maxParticipants - PARTICIPANT_COUNT);
  return {
    id: _row.id,
    sportId: _row.sportId,
    categoryId: _row.categoryId,
    ...(_row.category !== null ? { categoryName: _row.category.name } : {}),
    type: _row.type,
    status: _row.status,
    scheduledAt: _row.scheduledAt,
    pricePerPlayerCents: _row.pricePerPlayerCents,
    maxParticipants: _row.maxParticipants,
    participantCount: PARTICIPANT_COUNT,
    openSpots: OPEN_SPOTS,
  };
}

export class PrismaMatchQueryRepository implements MatchQueryRepository {
  constructor(private readonly _prisma: PrismaClient) {}
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

    const [TOTAL, ROWS] = await this._prisma.$transaction([
      this._prisma.match.count({ where: WHERE }),
      this._prisma.match.findMany({
        where: WHERE,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        skip: SKIP,
        take: TAKE,
        select: {
          id: true,
          sportId: true,
          categoryId: true,
          category: { select: { name: true } },
          type: true,
          status: true,
          scheduledAt: true,
          pricePerPlayerCents: true,
          maxParticipants: true,
          _count: { select: { participants: true } },
        },
      }),
    ]);

    return { items: ROWS.map(toListItemDTO), total: TOTAL };
  }

  async getMatchByIdSV(_matchId: string): Promise<MatchDetailDTO | null> {
    const ROW = await this._prisma.match.findUnique({
      where: { id: _matchId },
      select: {
        id: true,
        sportId: true,
        categoryId: true,
        category: { select: { name: true } },
        type: true,
        status: true,
        scheduledAt: true,
        pricePerPlayerCents: true,
        maxParticipants: true,
        courtId: true,
        court: {
          select: {
            name: true,
            venue: {
              select: {
                id: true,
                name: true,
                addressLine1: true,
                addressCity: true,
                formattedAddress: true,
                address: true,
              },
            },
          },
        },
        tournamentId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { participants: true } },
        participants: {
          select: {
            userId: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });

    if (ROW === null) return null;

    const BASE = toListItemDTO(ROW);
    const CLUB_NAME = ROW.court?.venue.name;
    const COURT_NAME = ROW.court?.name;
    const LOCATION_LABEL =
      ROW.court?.venue.addressLine1 ??
      ROW.court?.venue.formattedAddress ??
      ROW.court?.venue.address ??
      ROW.court?.venue.addressCity ??
      undefined;

    return {
      ...BASE,
      courtId: ROW.courtId,
      venueId: ROW.court?.venue.id ?? null,
      ...(CLUB_NAME !== undefined ? { clubName: CLUB_NAME } : {}),
      ...(COURT_NAME !== undefined ? { courtName: COURT_NAME } : {}),
      ...(LOCATION_LABEL !== undefined ? { locationLabel: LOCATION_LABEL } : {}),
      tournamentId: ROW.tournamentId,
      participants: ROW.participants.map((_p) => ({
        userId: _p.userId,
        displayName: _p.user.name,
        joinedAt: _p.createdAt,
      })),
      createdAt: ROW.createdAt,
      updatedAt: ROW.updatedAt,
    };
  }

  async listMatchesByVenueSV(
    _venueId: string,
    _filters: ListVenueMatchesFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: (MatchListItemDTO & { courtId: string | null; courtName: string | null })[]; total: number }> {
    const { courtId, from, to, date, status } = _filters;

    const WHERE: MatchWhereInput = {
      court: { venueId: _venueId },
      ...(courtId !== undefined ? { courtId } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(date !== undefined
        ? {
            scheduledAt: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lt: new Date(`${date}T23:59:59.999Z`),
            },
          }
        : {}),
      ...(from !== undefined || to !== undefined
        ? {
            scheduledAt: {
              ...(from !== undefined ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
              ...(to !== undefined ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const SKIP = (_page.page - 1) * _page.limit;
    const TAKE = _page.limit;

    const [TOTAL, ROWS] = await this._prisma.$transaction([
      this._prisma.match.count({ where: WHERE }),
      this._prisma.match.findMany({
        where: WHERE,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        skip: SKIP,
        take: TAKE,
        select: {
          id: true,
          sportId: true,
          categoryId: true,
          category: { select: { name: true } },
          type: true,
          status: true,
          scheduledAt: true,
          pricePerPlayerCents: true,
          maxParticipants: true,
          courtId: true,
          court: { select: { name: true } },
          _count: { select: { participants: true } },
        },
      }),
    ]);

    return {
      items: ROWS.map((_row) => ({
        ...toListItemDTO(_row),
        courtId: _row.courtId,
        courtName: _row.court?.name ?? null,
      })),
      total: TOTAL,
    };
  }
}

