/**
 * Implementación Prisma del repositorio unificado de Booking.
 * Maneja los tres tipos de booking: DIRECT, BLOCKED, MATCH.
 * Design: sdd/unificar-match-reservation (PR3 — Infrastructure Layer)
 */

import type { BookingRepository } from '../../domain/ports/booking_repository.js';
import type {
  BookingFilters,
  CreateBookingInputDTO,
  UpdateBookingInputDTO,
} from '../../domain/ports/booking_repository.js';
import type {
  ReservationDTO,
  ReservationType,
  ReservationStatus,
  Visibility,
  MatchStatus,
} from '../../domain/entities/booking/reservation.entity.js';

// Selector común para todas las queries sobre Reservation
const SELECT = {
  id: true,
  venueId: true,
  courtId: true,
  sportId: true,
  categoryId: true,
  type: true,
  matchId: true,
  organizerUserId: true,
  formatPresetId: true,
  formatParameters: true,
  maxParticipants: true,
  pricePerPlayerCents: true,
  visibility: true,
  matchStatus: true,
  status: true,
  scheduledAt: true,
  durationMinutes: true,
  notes: true,
  responsibleName: true,
  responsiblePhone: true,
  totalAmountCents: true,
  paidAmountCents: true,
  paymentStatus: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  court: { select: { name: true } },
} as const;

function mapRow(_row: {
  id: string;
  venueId: string;
  courtId: string;
  sportId: string;
  categoryId: string;
  type: ReservationType;
  matchId: string | null;
  organizerUserId: string | null;
  formatPresetId: string | null;
  formatParameters: unknown | null;
  maxParticipants: number;
  pricePerPlayerCents: number;
  visibility: Visibility | null;
  matchStatus: MatchStatus | null;
  status: ReservationStatus;
  scheduledAt: Date;
  durationMinutes: number;
  notes: string | null;
  responsibleName: string | null;
  responsiblePhone: string | null;
  totalAmountCents: number | null;
  paidAmountCents: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  court: { name: string } | null;
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
    responsibleName: _row.responsibleName,
    responsiblePhone: _row.responsiblePhone,
    totalAmountCents: _row.totalAmountCents,
    paidAmountCents: _row.paidAmountCents,
    paymentStatus: _row.paymentStatus,
    courtName: _row.court?.name ?? null,
    createdAt: _row.createdAt,
    updatedAt: _row.updatedAt,
    // MATCH-specific
    matchId: _row.matchId,
    organizerUserId: _row.organizerUserId,
    formatPresetId: _row.formatPresetId,
    formatParameters: _row.formatParameters as Record<string, unknown> | null,
    maxParticipants: _row.maxParticipants,
    pricePerPlayerCents: _row.pricePerPlayerCents,
    visibility: _row.visibility as Visibility | null,
    matchStatus: _row.matchStatus as MatchStatus | null,
  };
}

export class PrismaBookingRepository implements BookingRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly _prisma: any) {}

  async createBookingSV(_input: CreateBookingInputDTO): Promise<ReservationDTO> {
    const BASE_DATA: Record<string, unknown> = {
      venueId: _input.venueId,
      courtId: _input.courtId,
      sportId: _input.sportId,
      categoryId: _input.categoryId ?? '',
      type: _input.type,
      scheduledAt: _input.scheduledAt,
      durationMinutes: _input.durationMinutes ?? 60,
      status: 'CONFIRMED',
      notes: _input.notes ?? null,
      createdByUserId: _input.createdByUserId,
      responsibleName: _input.responsibleName ?? null,
      responsiblePhone: _input.responsiblePhone ?? null,
      totalAmountCents: _input.totalAmountCents ?? null,
      ...(_input.organizerUserId !== undefined ? { organizerUserId: _input.organizerUserId } : {}),
      ...(_input.formatPresetId !== undefined ? { formatPresetId: _input.formatPresetId } : {}),
      ...(_input.formatParameters !== undefined ? { formatParameters: _input.formatParameters } : {}),
      ...(_input.maxParticipants !== undefined ? { maxParticipants: _input.maxParticipants } : {}),
      ...(_input.pricePerPlayerCents !== undefined ? { pricePerPlayerCents: _input.pricePerPlayerCents } : {}),
      ...(_input.visibility !== undefined ? { visibility: _input.visibility } : {}),
      ...(_input.type === 'MATCH' ? { matchStatus: 'SCHEDULED' } : {}),
    };

    if (_input.type !== 'MATCH') {
      const ROW = await this._prisma.reservation.create({ data: BASE_DATA, select: SELECT });
      return mapRow(ROW);
    }

    const ROW = await this._prisma.$transaction(async (_tx: typeof this._prisma) => {
      const MATCH = await _tx.match.create({
        data: {
          categoryId: _input.categoryId ?? '',
          sportId: _input.sportId,
          organizerUserId: _input.organizerUserId!,
          courtId: _input.courtId,
          scheduledAt: _input.scheduledAt,
          type: 'REGULAR',
          status: 'SCHEDULED',
          maxParticipants: _input.maxParticipants ?? 4,
          pricePerPlayerCents: _input.pricePerPlayerCents ?? 0,
          ...(_input.formatPresetId !== undefined ? { formatPresetId: _input.formatPresetId } : {}),
          ...(_input.formatParameters !== undefined
            ? { formatParameters: _input.formatParameters as never }
            : {}),
        },
      });

      return _tx.reservation.create({
        data: { ...BASE_DATA, matchId: MATCH.id },
        select: SELECT,
      });
    });

    return mapRow(ROW);
  }

  async listBookingsSV(
    _filters: BookingFilters,
    _page: { page: number; limit: number },
  ): Promise<{ items: ReservationDTO[]; total: number }> {
    const WHERE: Record<string, unknown> = {};

    if (_filters.venueId !== undefined) WHERE.venueId = _filters.venueId;
    if (_filters.courtId !== undefined) WHERE.courtId = _filters.courtId;
    if (_filters.status !== undefined) WHERE.status = _filters.status;
    if (_filters.type !== undefined) WHERE.type = _filters.type;
    if (_filters.visibility !== undefined) WHERE.visibility = _filters.visibility;

    if (_filters.from !== undefined || _filters.to !== undefined) {
      WHERE.scheduledAt = {
        ...(_filters.from !== undefined ? { gte: new Date(_filters.from) } : {}),
        ...(_filters.to !== undefined ? { lte: new Date(_filters.to + 'T23:59:59.999Z') } : {}),
      };
    }

    const PAGE = _page.page ?? 1;
    const LIMIT = _page.limit ?? 20;
    const SKIP = (PAGE - 1) * LIMIT;

    const [ROWS, TOTAL] = await this._prisma.$transaction([
      this._prisma.reservation.findMany({
        where: WHERE,
        select: SELECT,
        skip: SKIP,
        take: LIMIT,
        orderBy: { scheduledAt: 'asc' },
      }),
      this._prisma.reservation.count({ where: WHERE }),
    ]);

    return { items: ROWS.map(mapRow), total: TOTAL };
  }

  async findByIdSV(_id: string): Promise<ReservationDTO | null> {
    const ROW = await this._prisma.reservation.findUnique({
      where: { id: _id },
      select: SELECT,
    });
    return ROW === null ? null : mapRow(ROW);
  }

  async assertAvailableSV(_courtId: string, _scheduledAt: Date, _excludeId?: string): Promise<void> {
    // Bloquea DIRECT/BLOCKED y MATCH no-DRAFT; los MATCH en DRAFT no ocupan slot público.
    const WHERE: Record<string, unknown> = {
      courtId: _courtId,
      scheduledAt: _scheduledAt,
      status: 'CONFIRMED',
      NOT: {
        type: 'MATCH',
        visibility: 'DRAFT',
      },
    };
    if (_excludeId !== undefined) {
      WHERE.id = { not: _excludeId };
    }

    const EXISTING = await this._prisma.reservation.findFirst({ where: WHERE });
    if (EXISTING !== null) {
      throw new Error('SLOT_NO_DISPONIBLE');
    }
  }

  async updateBookingSV(_id: string, _patch: UpdateBookingInputDTO): Promise<ReservationDTO> {
    const DATA: Record<string, unknown> = {};

    if (_patch.status !== undefined) DATA.status = _patch.status;
    if (_patch.visibility !== undefined) DATA.visibility = _patch.visibility;
    if (_patch.matchStatus !== undefined) DATA.matchStatus = _patch.matchStatus;
    if (_patch.notes !== undefined) DATA.notes = _patch.notes;
    if (_patch.maxParticipants !== undefined) DATA.maxParticipants = _patch.maxParticipants;
    if (_patch.pricePerPlayerCents !== undefined) DATA.pricePerPlayerCents = _patch.pricePerPlayerCents;
    if (_patch.formatPresetId !== undefined) DATA.formatPresetId = _patch.formatPresetId;
    if (_patch.formatParameters !== undefined) DATA.formatParameters = _patch.formatParameters;

    const ROW = await this._prisma.reservation.update({
      where: { id: _id },
      data: DATA,
      select: SELECT,
    });
    return mapRow(ROW);
  }

  async cancelBookingSV(_id: string): Promise<ReservationDTO> {
    const ROW = await this._prisma.$transaction(async (_tx: typeof this._prisma) => {
      const EXISTING = await _tx.reservation.findUnique({
        where: { id: _id },
        select: { matchId: true, type: true },
      });

      if (EXISTING?.matchId !== null && EXISTING?.matchId !== undefined) {
        await _tx.match.update({
          where: { id: EXISTING.matchId },
          data: { status: 'CANCELLED' },
        });
      }

      return _tx.reservation.update({
        where: { id: _id },
        data: {
          status: 'CANCELLED',
          ...(EXISTING?.type === 'MATCH' ? { matchStatus: 'CANCELLED' } : {}),
        },
        select: SELECT,
      });
    });
    return mapRow(ROW);
  }
}