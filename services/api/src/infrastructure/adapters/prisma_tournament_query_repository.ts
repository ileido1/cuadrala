import type {
  ListTournamentsFiltersDTO,
  PageDTO,
  RegistrationDTO,
  TournamentDetailDTO,
  TournamentListItemDTO,
  TournamentQueryRepository,
} from '../../domain/ports/tournament_query_repository.js';

import { PRISMA } from '../prisma_client.js';

function toListItemDTO(_row: {
  id: string;
  name: string;
  status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sportId: string;
  sport: { name: string };
  categoryId: string;
  category: { name: string };
  startsAt: Date | null;
  _count: { registrations: number };
}): TournamentListItemDTO {
  return {
    id: _row.id,
    name: _row.name,
    status: _row.status,
    sportId: _row.sportId,
    sportName: _row.sport.name,
    categoryId: _row.categoryId,
    categoryName: _row.category.name,
    startsAt: _row.startsAt != null ? _row.startsAt.toISOString() : null,
    registrationCount: _row._count.registrations,
  };
}

export class PrismaTournamentQueryRepository implements TournamentQueryRepository {
  async listTournamentsSV(
    _filters: ListTournamentsFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: TournamentListItemDTO[]; total: number }> {
    const WHERE = {
      ...(_filters.status !== undefined ? { status: _filters.status } : {}),
      ...(_filters.sportId !== undefined ? { sportId: _filters.sportId } : {}),
      ...(_filters.categoryId !== undefined ? { categoryId: _filters.categoryId } : {}),
    };

    const SKIP = (_page.page - 1) * _page.limit;
    const TAKE = _page.limit;

    const [TOTAL, ROWS] = await PRISMA.$transaction([
      PRISMA.tournament.count({ where: WHERE }),
      PRISMA.tournament.findMany({
        where: WHERE,
        orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
        skip: SKIP,
        take: TAKE,
        select: {
          id: true,
          name: true,
          status: true,
          sportId: true,
          sport: { select: { name: true } },
          categoryId: true,
          category: { select: { name: true } },
          startsAt: true,
          _count: { select: { registrations: true } },
        },
      }),
    ]);

    return { items: ROWS.map(toListItemDTO), total: TOTAL };
  }

  async getTournamentByIdSV(_tournamentId: string): Promise<TournamentDetailDTO | null> {
    const ROW = await PRISMA.tournament.findUnique({
      where: { id: _tournamentId },
      select: {
        id: true,
        name: true,
        status: true,
        sportId: true,
        sport: { select: { name: true } },
        categoryId: true,
        category: { select: { name: true } },
        startsAt: true,
        formatPresetId: true,
        formatPreset: { select: { name: true } },
        presetSchemaVersion: true,
        formatParameters: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { registrations: true } },
      },
    });

    if (ROW === null) return null;

    const BASE = toListItemDTO(ROW);
    return {
      ...BASE,
      formatPresetId: ROW.formatPresetId,
      formatPresetName: ROW.formatPreset.name,
      presetSchemaVersion: ROW.presetSchemaVersion,
      formatParameters: ROW.formatParameters as Record<string, unknown> | null,
      createdAt: ROW.createdAt.toISOString(),
      updatedAt: ROW.updatedAt.toISOString(),
    };
  }

  async listTournamentRegistrationsSV(_tournamentId: string): Promise<RegistrationDTO[]> {
    const ROWS = await PRISMA.tournamentRegistration.findMany({
      where: { tournamentId: _tournamentId },
      select: {
        id: true,
        userId: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return ROWS.map((_r) => ({
      id: _r.id,
      userId: _r.userId,
      userName: _r.user.name,
      status: _r.status,
      createdAt: _r.createdAt.toISOString(),
    }));
  }

  async listTournamentsByVenueSV(
    _venueId: string,
    _filters: ListTournamentsFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: TournamentListItemDTO[]; total: number }> {
    const WHERE: {
      status?: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
      sportId?: string;
      categoryId?: string;
      matches: { tournament: { court: { venueId: string } } };
    } = {
      matches: {
        some: {
          court: {
            venueId: _venueId,
          },
        },
      },
      ...(_filters.status !== undefined ? { status: _filters.status } : {}),
      ...(_filters.sportId !== undefined ? { sportId: _filters.sportId } : {}),
      ...(_filters.categoryId !== undefined ? { categoryId: _filters.categoryId } : {}),
    };

    const SKIP = (_page.page - 1) * _page.limit;
    const TAKE = _page.limit;

    const [TOTAL, ROWS] = await PRISMA.$transaction([
      PRISMA.tournament.count({ where: WHERE }),
      PRISMA.tournament.findMany({
        where: WHERE,
        orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
        skip: SKIP,
        take: TAKE,
        select: {
          id: true,
          name: true,
          status: true,
          sportId: true,
          sport: { select: { name: true } },
          categoryId: true,
          category: { select: { name: true } },
          startsAt: true,
          _count: { select: { registrations: true } },
        },
      }),
    ]);

    return { items: ROWS.map(toListItemDTO), total: TOTAL };
  }
}