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
} from '../../domain/entities/booking/reservation.entity.js';

import { PRISMA } from '../prisma_client.js';
import {
  loadVenuePricingCurrencySV,
  reservationMoneyCreateFieldsSV,
} from '../prisma_money_fields.js';
import {
  mapPrismaReservationRowToDtoSV,
  RESERVATION_LIST_SELECT,
} from './prisma_reservation_mapper.js';

export class PrismaReservationRepository implements ReservationRepository {
  async createReservationSV(_input: CreateReservationInputDTO): Promise<ReservationDTO> {
    const PRICING_CURRENCY = await loadVenuePricingCurrencySV(PRISMA, _input.venueId);
    const ROW = await PRISMA.reservation.create({
      data: {
        venueId: _input.venueId,
        courtId: _input.courtId,
        sportId: _input.sportId,
        categoryId: _input.categoryId ?? '',
        type: _input.type ?? 'DIRECT',
        scheduledAt: _input.scheduledAt,
        durationMinutes: _input.durationMinutes ?? 60,
        notes: _input.notes ?? null,
        createdByUserId: _input.createdByUserId,
        responsibleName: _input.responsibleName ?? null,
        responsiblePhone: _input.responsiblePhone ?? null,
        totalAmountCents: _input.totalAmountCents ?? null,
        ...reservationMoneyCreateFieldsSV(PRICING_CURRENCY, _input.totalAmountCents),
      },
      select: RESERVATION_LIST_SELECT,
    });

    return mapPrismaReservationRowToDtoSV(ROW);
  }

  async findByIdSV(_id: string): Promise<ReservationDTO | null> {
    const ROW = await PRISMA.reservation.findUnique({
      where: { id: _id },
      select: RESERVATION_LIST_SELECT,
    });
    return ROW === null ? null : mapPrismaReservationRowToDtoSV(ROW);
  }

  async findByCourtAndScheduledAtSV(_courtId: string, _scheduledAt: Date): Promise<ReservationDTO | null> {
    const ROW = await PRISMA.reservation.findUnique({
      where: { courtId_scheduledAt: { courtId: _courtId, scheduledAt: _scheduledAt } },
      select: RESERVATION_LIST_SELECT,
    });
    return ROW === null ? null : mapPrismaReservationRowToDtoSV(ROW);
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
        select: RESERVATION_LIST_SELECT,
      }),
    ]);

    return { items: ROWS.map(mapPrismaReservationRowToDtoSV), total: TOTAL };
  }

  async cancelReservationSV(_id: string): Promise<ReservationDTO> {
    const ROW = await PRISMA.reservation.update({
      where: { id: _id },
      data: { status: 'CANCELLED' },
      select: RESERVATION_LIST_SELECT,
    });
    return mapPrismaReservationRowToDtoSV(ROW);
  }

  async updateTotalAmountCentsSV(_id: string, _totalAmountCents: number): Promise<void> {
    await PRISMA.reservation.update({
      where: { id: _id },
      data: { totalAmountCents: _totalAmountCents },
    });
  }
}
