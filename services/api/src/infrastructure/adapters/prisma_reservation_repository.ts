/**
 * Implementación Prisma del repositorio de Reservation.
 * Backoffice Reservations API — infraestructura.
 */

import type { ReservationRepository } from '../../domain/ports/reservation_repository.js';
import type {
  CreateReservationInputDTO,
  ListReservationsFiltersDTO,
  PageDTO,
  ReservationDTO,
  ReservationType,
  ReservationStatus,
} from '../../domain/entities/reservation.entity.js';
import type { ReservationType as PrismaReservationType, ReservationStatus as PrismaReservationStatus } from '../../generated/prisma/client.js';

import { PRISMA } from '../prisma_client.js';

function mapReservation(_row: {
  id: string;
  venueId: string;
  courtId: string;
  sportId: string;
  categoryId: string;
  type: PrismaReservationType;
  status: PrismaReservationStatus;
  scheduledAt: Date;
  durationMinutes: number;
  notes: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}): ReservationDTO {
  return {
    id: _row.id,
    venueId: _row.venueId,
    courtId: _row.courtId,
    sportId: _row.sportId,
    categoryId: _row.categoryId,
    type: _row.type as ReservationType,
    status: _row.status as ReservationStatus,
    scheduledAt: _row.scheduledAt,
    durationMinutes: _row.durationMinutes,
    notes: _row.notes,
    createdByUserId: _row.createdByUserId,
    createdAt: _row.createdAt,
    updatedAt: _row.updatedAt,
  };
}

const RESERVATION_SELECT = {
  id: true,
  venueId: true,
  courtId: true,
  sportId: true,
  categoryId: true,
  type: true,
  status: true,
  scheduledAt: true,
  durationMinutes: true,
  notes: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class PrismaReservationRepository implements ReservationRepository {
  async createReservationSV(_input: CreateReservationInputDTO): Promise<ReservationDTO> {
    const ROW = await PRISMA.reservation.create({
      data: {
        venueId: _input.venueId,
        courtId: _input.courtId,
        sportId: _input.sportId,
        categoryId: _input.categoryId,
        type: _input.type ?? 'DIRECT',
        scheduledAt: _input.scheduledAt,
        durationMinutes: _input.durationMinutes ?? 60,
        notes: _input.notes ?? null,
        createdByUserId: _input.createdByUserId,
      },
      select: RESERVATION_SELECT,
    });

    return mapReservation(ROW);
  }

  async findByIdSV(_id: string): Promise<ReservationDTO | null> {
    const ROW = await PRISMA.reservation.findUnique({
      where: { id: _id },
      select: RESERVATION_SELECT,
    });
    return ROW === null ? null : mapReservation(ROW);
  }

  async findByCourtAndScheduledAtSV(_courtId: string, _scheduledAt: Date): Promise<ReservationDTO | null> {
    const ROW = await PRISMA.reservation.findUnique({
      where: { courtId_scheduledAt: { courtId: _courtId, scheduledAt: _scheduledAt } },
      select: RESERVATION_SELECT,
    });
    return ROW === null ? null : mapReservation(ROW);
  }

  async listReservationsSV(
    _filters: ListReservationsFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: ReservationDTO[]; total: number }> {
    const WHERE: {
      venueId?: string;
      courtId?: string;
      status?: 'CONFIRMED' | 'CANCELLED';
      scheduledAt?: { gte?: Date; lte?: Date };
    } = {};

    if (_filters.venueId !== undefined) {
      WHERE.venueId = _filters.venueId;
    }
    if (_filters.courtId !== undefined) {
      WHERE.courtId = _filters.courtId;
    }
    if (_filters.status !== undefined) {
      WHERE.status = _filters.status;
    }
    if (_filters.from !== undefined || _filters.to !== undefined) {
      WHERE.scheduledAt = {
        ...(_filters.from !== undefined ? { gte: new Date(_filters.from) } : {}),
        ...(_filters.to !== undefined ? { lte: new Date(_filters.to + 'T23:59:59.999Z') } : {}),
      };
    }

    const [TOTAL, ROWS] = await PRISMA.$transaction([
      PRISMA.reservation.count({ where: WHERE }),
      PRISMA.reservation.findMany({
        where: WHERE,
        orderBy: { scheduledAt: 'asc' },
        skip: (_page.page - 1) * _page.limit,
        take: _page.limit,
        select: RESERVATION_SELECT,
      }),
    ]);

    return { items: ROWS.map(mapReservation), total: TOTAL };
  }

  async cancelReservationSV(_id: string): Promise<ReservationDTO> {
    const ROW = await PRISMA.reservation.update({
      where: { id: _id },
      data: { status: 'CANCELLED' },
      select: RESERVATION_SELECT,
    });
    return mapReservation(ROW);
  }
}