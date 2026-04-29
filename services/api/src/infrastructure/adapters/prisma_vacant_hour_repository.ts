import type {
  CreateVacantHourInputDTO,
  PageDTO,
  VacantHourDTO,
  VacantHourListFiltersDTO,
  VacantHourRepository,
} from '../../domain/ports/vacant_hour_repository.js';

import { PRISMA } from '../prisma_client.js';

function mapVacantHour(_row: {
  id: string;
  venueId: string;
  courtId: string;
  sportId: string;
  categoryId: string;
  scheduledAt: Date;
  durationMinutes: number | null;
  pricePerPlayerCents: number;
  maxParticipants: number;
  status: 'PUBLISHED' | 'CANCELLED';
  matchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): VacantHourDTO {
  return {
    id: _row.id,
    venueId: _row.venueId,
    courtId: _row.courtId,
    sportId: _row.sportId,
    categoryId: _row.categoryId,
    scheduledAt: _row.scheduledAt,
    durationMinutes: _row.durationMinutes,
    pricePerPlayerCents: _row.pricePerPlayerCents,
    maxParticipants: _row.maxParticipants,
    status: _row.status,
    matchId: _row.matchId,
    createdAt: _row.createdAt,
    updatedAt: _row.updatedAt,
  };
}

const VACANT_HOUR_SELECT = {
  id: true,
  venueId: true,
  courtId: true,
  sportId: true,
  categoryId: true,
  scheduledAt: true,
  durationMinutes: true,
  pricePerPlayerCents: true,
  maxParticipants: true,
  status: true,
  matchId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class PrismaVacantHourRepository implements VacantHourRepository {
  async createVacantHourSV(_input: CreateVacantHourInputDTO): Promise<VacantHourDTO> {
    const ROW = await PRISMA.vacantHour.create({
      data: {
        venueId: _input.venueId,
        courtId: _input.courtId,
        sportId: _input.sportId,
        categoryId: _input.categoryId,
        scheduledAt: _input.scheduledAt,
        durationMinutes: _input.durationMinutes ?? null,
        pricePerPlayerCents: _input.pricePerPlayerCents ?? 0,
        maxParticipants: _input.maxParticipants ?? 4,
        status: 'PUBLISHED',
        matchId: _input.matchId ?? null,
      },
      select: VACANT_HOUR_SELECT,
    });

    return mapVacantHour(ROW);
  }

  async findByIdSV(_id: string): Promise<VacantHourDTO | null> {
    const ROW = await PRISMA.vacantHour.findUnique({ where: { id: _id }, select: VACANT_HOUR_SELECT });
    return ROW === null ? null : mapVacantHour(ROW);
  }

  async findByCourtAndScheduledAtSV(_courtId: string, _scheduledAt: Date): Promise<VacantHourDTO | null> {
    const ROW = await PRISMA.vacantHour.findUnique({
      where: { courtId_scheduledAt: { courtId: _courtId, scheduledAt: _scheduledAt } },
      select: VACANT_HOUR_SELECT,
    });
    return ROW === null ? null : mapVacantHour(ROW);
  }

  async listVacantHoursSV(
    _filters: VacantHourListFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: VacantHourDTO[]; total: number }> {
    const WHERE = {
      ...(_filters.venueId !== undefined ? { venueId: _filters.venueId } : {}),
      ...(_filters.courtId !== undefined ? { courtId: _filters.courtId } : {}),
      ...(_filters.status !== undefined ? { status: _filters.status } : {}),
    };

    const [TOTAL, ROWS] = await PRISMA.$transaction([
      PRISMA.vacantHour.count({ where: WHERE }),
      PRISMA.vacantHour.findMany({
        where: WHERE,
        orderBy: { scheduledAt: 'asc' },
        skip: (_page.page - 1) * _page.limit,
        take: _page.limit,
        select: VACANT_HOUR_SELECT,
      }),
    ]);

    return { items: ROWS.map(mapVacantHour), total: TOTAL };
  }

  async cancelVacantHourSV(_id: string): Promise<VacantHourDTO> {
    const ROW = await PRISMA.vacantHour.update({
      where: { id: _id },
      data: { status: 'CANCELLED' },
      select: VACANT_HOUR_SELECT,
    });
    return mapVacantHour(ROW);
  }
}

