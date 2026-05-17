/**
 * Casos de uso unificados para gestión de bookings (DIRECT, BLOCKED, MATCH).
 * Design: sdd/unificar-match-reservation (PR2 — Domain + Application Layer)
 *
 * Reemplaza los use cases separados de Reservation y VacantHour.
 */

import { AppError } from '../../domain/errors/app_error.js';
import type { BookingRepository } from '../../domain/ports/booking_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import type { BookingCatalogReadRepository } from '../../domain/ports/booking_catalog_read_repository.js';
import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type {
  BookingFilters,
  CreateBookingInputDTO,
  UpdateBookingInputDTO,
} from '../../domain/ports/booking_repository.js';
import type {
  PageDTO,
  ReservationDTO,
  ReservationStatus,
} from '../../domain/entities/booking/reservation.entity.js';
import {
  ReservationType,
  Visibility as Vis,
  MatchStatus,
} from '../../domain/entities/booking/reservation.entity.js';

// ---------------------------------------------------------------------------
// CreateBookingUseCase — maneja DIRECT, BLOCKED, MATCH
// ---------------------------------------------------------------------------

export type CreateBookingInput = {
  venueId: string;
  courtId: string;
  sportId?: string;
  categoryId?: string;
  type: 'DIRECT' | 'BLOCKED' | 'MATCH';
  scheduledAt: Date;
  durationMinutes?: number;
  notes?: string | null;
  responsibleName?: string | null;
  responsiblePhone?: string | null;
  // MATCH-specific
  organizerUserId?: string;
  formatPresetId?: string;
  formatParameters?: Record<string, unknown> | null;
  maxParticipants?: number;
  pricePerPlayerCents?: number;
  visibility?: 'PUBLISHED' | 'DRAFT' | 'PRIVATE';
};

export type CreateBookingOutput = {
  booking: ReservationDTO;
};

export class CreateBookingUseCase {
  constructor(
    private readonly _bookingRepository: BookingRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _courtRepository: ICourtRepository,
    private readonly _catalogReadRepository: BookingCatalogReadRepository,
  ) {}

  async executeSV(_input: CreateBookingInput, _actorUserId: string): Promise<CreateBookingOutput> {
    const SPORT_ID =
      _input.sportId
      ?? await this._catalogReadRepository.resolveSportIdForCourtSV(_input.courtId);
    const CATEGORY_ID =
      _input.categoryId
      ?? await this._catalogReadRepository.resolveDefaultCategoryIdSV();

    // Validaciones de entrada
    if (_input.durationMinutes !== undefined && _input.durationMinutes <= 0) {
      throw new AppError('VALIDACION_FALLIDA', 'durationMinutes debe ser mayor a 0.', 400);
    }

    // Autorización: el usuario debe ser staff de esta sede
    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(_actorUserId, _input.venueId);
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No tienes permisos para crear bookings en esta sede.',
        403,
      );
    }

    // Validaciones específicas por tipo
    if (_input.type === 'MATCH') {
      if (!_input.organizerUserId) {
        throw new AppError(
          'VALIDACION_FALLIDA',
          'organizerUserId es requerido para type=MATCH.',
          400,
        );
      }
      if (_input.maxParticipants !== undefined && _input.maxParticipants <= 0) {
        throw new AppError(
          'VALIDACION_FALLIDA',
          'maxParticipants debe ser mayor a 0.',
          400,
        );
      }
      if (_input.pricePerPlayerCents !== undefined && _input.pricePerPlayerCents < 0) {
        throw new AppError(
          'VALIDACION_FALLIDA',
          'pricePerPlayerCents no puede ser negativo.',
          400,
        );
      }
    }

    // Verificar disponibilidad del slot (excluye DRAFT matches para disponibilidad pública)
    await this._bookingRepository.assertAvailableSV(
      _input.courtId,
      _input.scheduledAt,
    );

    // Obtener el court para calcular el monto total desde pricePerHourCents
    const COURT = await this._courtRepository.findById(_input.courtId);
    const DURATION = _input.durationMinutes ?? COURT?.durationMinutes ?? 60;
    let totalAmountCents: number | null = null;

    if (COURT?.pricePerHourCents != null) {
      // Calcular: pricePerHourCents * (durationMinutes / 60)
      totalAmountCents = Math.round((COURT.pricePerHourCents * DURATION) / 60);
    }

    // Construir el DTO de input para el repositorio
    const INPUT_DTO: CreateBookingInputDTO = {
      venueId: _input.venueId,
      courtId: _input.courtId,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: _input.type === 'DIRECT'
        ? ReservationType.DIRECT
        : _input.type === 'BLOCKED'
          ? ReservationType.BLOCKED
          : ReservationType.MATCH,
      scheduledAt: _input.scheduledAt,
      durationMinutes: DURATION,
      ...(_input.notes !== undefined ? { notes: _input.notes } : {}),
      createdByUserId: _actorUserId,
      ...(_input.responsibleName != null ? { responsibleName: _input.responsibleName as string | null } : {}),
      ...(_input.responsiblePhone != null ? { responsiblePhone: _input.responsiblePhone as string | null } : {}),
      totalAmountCents,
      // MATCH-specific
      ...(_input.type === 'MATCH' && _input.organizerUserId !== undefined
        ? { organizerUserId: _input.organizerUserId }
        : {}),
      ...(_input.type === 'MATCH' && _input.formatPresetId !== undefined
        ? { formatPresetId: _input.formatPresetId }
        : {}),
      ...(_input.type === 'MATCH' && _input.formatParameters !== undefined
        ? { formatParameters: _input.formatParameters }
        : {}),
      ...(_input.type === 'MATCH' && _input.maxParticipants !== undefined
        ? { maxParticipants: _input.maxParticipants }
        : {}),
      ...(_input.type === 'MATCH' && _input.pricePerPlayerCents !== undefined
        ? { pricePerPlayerCents: _input.pricePerPlayerCents }
        : {}),
      // visibility default DRAFT para MATCH si no se especifica
      ...(_input.type === 'MATCH' && _input.visibility !== undefined
        ? { visibility: _input.visibility === 'PUBLISHED' ? Vis.PUBLISHED : _input.visibility === 'PRIVATE' ? Vis.PRIVATE : Vis.DRAFT }
        : _input.type === 'MATCH'
          ? { visibility: Vis.DRAFT }
          : {}),
    };

    const BOOKING = await this._bookingRepository.createBookingSV(INPUT_DTO);

    return { booking: BOOKING };
  }
}

// ---------------------------------------------------------------------------
// ListBookingsUseCase — listado unificado con filtros
// ---------------------------------------------------------------------------

export type ListBookingsInput = {
  venueId: string;
  courtId?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  status?: ReservationStatus;
  type?: 'DIRECT' | 'BLOCKED' | 'MATCH';
  visibility?: 'PUBLISHED' | 'DRAFT' | 'PRIVATE';
  page: number;
  limit: number;
};

export type ListBookingsOutput = {
  items: ReservationDTO[];
  pageInfo: { page: number; limit: number; total: number };
};

export class ListBookingsUseCase {
  constructor(
    private readonly _bookingRepository: BookingRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(_input: ListBookingsInput, _actorUserId: string): Promise<ListBookingsOutput> {
    // Validación de paginación
    if (_input.page < 1) {
      throw new AppError('PAGINACION_INVALIDA', 'page debe ser mayor o igual a 1.', 400);
    }
    if (_input.limit < 1 || _input.limit > 100) {
      throw new AppError('PAGINACION_INVALIDA', 'limit debe estar entre 1 y 100.', 400);
    }

    // Validación de formato de fechas (YYYY-MM-DD)
    if (_input.from !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(_input.from)) {
      throw new AppError('VALIDACION_FALLIDA', 'from debe estar en formato YYYY-MM-DD.', 400);
    }
    if (_input.to !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(_input.to)) {
      throw new AppError('VALIDACION_FALLIDA', 'to debe estar en formato YYYY-MM-DD.', 400);
    }

    // Autorización: el usuario debe ser staff de esta sede
    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(_actorUserId, _input.venueId);
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No tienes permisos para ver los bookings de esta sede.',
        403,
      );
    }

    const FILTERS: BookingFilters = {
      venueId: _input.venueId,
      ...(_input.courtId !== undefined ? { courtId: _input.courtId } : {}),
      ...(_input.from !== undefined ? { from: _input.from } : {}),
      ...(_input.to !== undefined ? { to: _input.to } : {}),
      ...(_input.status !== undefined ? { status: _input.status } : {}),
      ...(_input.type !== undefined
        ? {
            type: _input.type === 'DIRECT'
              ? ReservationType.DIRECT
              : _input.type === 'BLOCKED'
                ? ReservationType.BLOCKED
                : ReservationType.MATCH,
          }
        : {}),
      ...(_input.visibility !== undefined
        ? {
            visibility: _input.visibility === 'PUBLISHED'
              ? Vis.PUBLISHED
              : _input.visibility === 'PRIVATE'
                ? Vis.PRIVATE
                : Vis.DRAFT,
          }
        : {}),
    };

    const PAGE: PageDTO = { page: _input.page, limit: _input.limit };

    const { items, total } = await this._bookingRepository.listBookingsSV(FILTERS, PAGE);

    return {
      items,
      pageInfo: { page: _input.page, limit: _input.limit, total },
    };
  }
}

// ---------------------------------------------------------------------------
// CancelBookingUseCase — cancelar cualquier tipo de booking
// ---------------------------------------------------------------------------

export type CancelBookingInput = {
  bookingId: string;
};

export type CancelBookingOutput = {
  booking: ReservationDTO;
};

export class CancelBookingUseCase {
  constructor(
    private readonly _bookingRepository: BookingRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(_input: CancelBookingInput, _actorUserId: string): Promise<CancelBookingOutput> {
    // Obtener el booking para verificar que existe y tomar el venueId
    const BOOKING = await this._bookingRepository.findByIdSV(_input.bookingId);
    if (BOOKING === null) {
      throw new AppError('BOOKING_NO_ENCONTRADO', 'El booking indicado no existe.', 404);
    }

    // Autorización: el usuario debe ser staff de esta sede
    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(_actorUserId, BOOKING.venueId);
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No tienes permisos para cancelar bookings de esta sede.',
        403,
      );
    }

    // Cancelar el booking
    const CANCELLED = await this._bookingRepository.cancelBookingSV(_input.bookingId);

    return { booking: CANCELLED };
  }
}

// ---------------------------------------------------------------------------
// UpdateBookingUseCase — actualizar visibilidad, matchStatus, etc.
// ---------------------------------------------------------------------------

export type UpdateBookingInput = {
  bookingId: string;
  status?: ReservationStatus;
  visibility?: 'PUBLISHED' | 'DRAFT' | 'PRIVATE';
  matchStatus?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  notes?: string | null;
  maxParticipants?: number;
  pricePerPlayerCents?: number;
  formatPresetId?: string;
  formatParameters?: Record<string, unknown> | null;
};

export type UpdateBookingOutput = {
  booking: ReservationDTO;
};

export class UpdateBookingUseCase {
  constructor(
    private readonly _bookingRepository: BookingRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(_input: UpdateBookingInput, _actorUserId: string): Promise<UpdateBookingOutput> {
    // Obtener el booking para verificar que existe y tomar el venueId
    const BOOKING = await this._bookingRepository.findByIdSV(_input.bookingId);
    if (BOOKING === null) {
      throw new AppError('BOOKING_NO_ENCONTRADO', 'El booking indicado no existe.', 404);
    }

    // Autorización: el usuario debe ser staff de esta sede
    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(_actorUserId, BOOKING.venueId);
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No tienes permisos para actualizar bookings de esta sede.',
        403,
      );
    }

    // Validaciones
    if (_input.visibility !== undefined && BOOKING.type !== ReservationType.MATCH) {
      throw new AppError(
        'VALIDACION_FALLIDA',
        'visibility solo puede modificarse en bookings de tipo MATCH.',
        400,
      );
    }
    if (_input.matchStatus !== undefined && BOOKING.type !== ReservationType.MATCH) {
      throw new AppError(
        'VALIDACION_FALLIDA',
        'matchStatus solo puede modificarse en bookings de tipo MATCH.',
        400,
      );
    }

    const PATCH: UpdateBookingInputDTO = {
      ...(_input.status !== undefined ? { status: _input.status } : {}),
      ...(_input.visibility !== undefined
        ? {
            visibility: _input.visibility === 'PUBLISHED'
              ? Vis.PUBLISHED
              : _input.visibility === 'PRIVATE'
                ? Vis.PRIVATE
                : Vis.DRAFT,
          }
        : {}),
      ...(_input.matchStatus !== undefined
        ? {
            matchStatus: _input.matchStatus === 'SCHEDULED'
              ? MatchStatus.SCHEDULED
              : _input.matchStatus === 'IN_PROGRESS'
                ? MatchStatus.IN_PROGRESS
                : _input.matchStatus === 'FINISHED'
                  ? MatchStatus.FINISHED
                  : MatchStatus.CANCELLED,
          }
        : {}),
      ...(_input.notes !== undefined ? { notes: _input.notes } : {}),
      ...(_input.maxParticipants !== undefined ? { maxParticipants: _input.maxParticipants } : {}),
      ...(_input.pricePerPlayerCents !== undefined
        ? { pricePerPlayerCents: _input.pricePerPlayerCents }
        : {}),
      ...(_input.formatPresetId !== undefined ? { formatPresetId: _input.formatPresetId } : {}),
      ...(_input.formatParameters !== undefined ? { formatParameters: _input.formatParameters } : {}),
    };

    const UPDATED = await this._bookingRepository.updateBookingSV(_input.bookingId, PATCH);

    return { booking: UPDATED };
  }
}

// ---------------------------------------------------------------------------
// GetBookingUseCase — detalle con autorización staff
// ---------------------------------------------------------------------------

export type GetBookingInput = {
  bookingId: string;
};

export class GetBookingUseCase {
  constructor(
    private readonly _bookingRepository: BookingRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(_input: GetBookingInput, _actorUserId: string): Promise<ReservationDTO> {
    const BOOKING = await this._bookingRepository.findByIdSV(_input.bookingId);
    if (BOOKING === null) {
      throw new AppError('BOOKING_NO_ENCONTRADO', 'Booking no encontrado.', 404);
    }

    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(
      _actorUserId,
      BOOKING.venueId,
    );
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No tienes permisos para ver este booking.',
        403,
      );
    }

    return BOOKING;
  }
}