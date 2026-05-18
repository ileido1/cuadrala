/**
 * Casos de uso para gestión de reservas desde backoffice (US-W1-17).
 * Backoffice Reservations API — creación, listado y cancelación de reservas directas.
 */

import { AppError } from '../../domain/errors/app_error.js';
import type { ReservationRepository } from '../../domain/ports/reservation_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import type { BookingCatalogReadRepository } from '../../domain/ports/booking_catalog_read_repository.js';
import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type { VenueRepository } from '../../domain/ports/venue_repository.js';
import { assertReservationWithinOpeningHoursSV } from '../../domain/services/venue/venue_opening_hours.service.js';
import type {
  CreateReservationInputDTO,
  ListReservationsFiltersDTO,
  PageDTO,
  ReservationDTO,
  ReservationStatus,
} from '../../domain/entities/booking/reservation.entity.js';
import { ReservationType } from '../../domain/entities/booking/reservation.entity.js';
import { calculateReservationTotalCentsSV } from '../../domain/services/booking/pricing.service.js';

// ---------------------------------------------------------------------------
// CreateReservationUseCase
// ---------------------------------------------------------------------------

export type CreateReservationInput = {
  venueId: string;
  courtId: string;
  sportId?: string;
  categoryId?: string;
  type?: 'DIRECT' | 'BLOCKED';
  scheduledAt: Date;
  durationMinutes?: number;
  notes?: string | null;
  responsibleName?: string | null;
  responsiblePhone?: string | null;
};

export type CreateReservationOutput = {
  reservation: ReservationDTO;
};

export class CreateReservationUseCase {
  constructor(
    private readonly _reservationRepository: ReservationRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _courtRepository: ICourtRepository,
    private readonly _catalogReadRepository: BookingCatalogReadRepository,
    private readonly _venueRepository: VenueRepository,
  ) {}

  async executeSV(_input: CreateReservationInput, _actorUserId: string): Promise<CreateReservationOutput> {
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
        'No tienes permisos para crear reservas en esta sede.',
        403,
      );
    }

    const COURT = await this._courtRepository.findById(_input.courtId);
    const DURATION = _input.durationMinutes ?? COURT?.durationMinutes ?? 60;

    const OPENING_HOURS = await this._venueRepository.getOpeningHoursSV(_input.venueId);
    assertReservationWithinOpeningHoursSV(
      _input.scheduledAt,
      DURATION,
      OPENING_HOURS,
    );

    // Verificar que no exista una reserva confirmada para ese court+scheduledAt
    const EXISTING = await this._reservationRepository.findByCourtAndScheduledAtSV(
      _input.courtId,
      _input.scheduledAt,
    );
    if (EXISTING !== null && EXISTING.status === 'CONFIRMED') {
      throw new AppError(
        'CONFLICTO',
        'Ya existe una reserva confirmada para ese horario en esta cancha.',
        409,
      );
    }
    const totalAmountCents =
      COURT != null
        ? calculateReservationTotalCentsSV({
            pricePerHourCents: COURT.pricePerHourCents,
            pricingTiers: COURT.pricingTiers,
            scheduledAt: _input.scheduledAt,
            durationMinutes: DURATION,
          })
        : null;

    const INPUT_DTO: CreateReservationInputDTO = {
      venueId: _input.venueId,
      courtId: _input.courtId,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      ...(_input.type !== undefined
        ? {
            type:
              _input.type === 'DIRECT'
                ? ReservationType.DIRECT
                : ReservationType.BLOCKED,
          }
        : {}),
      scheduledAt: _input.scheduledAt,
      durationMinutes: DURATION,
      ...(_input.notes !== undefined ? { notes: _input.notes } : {}),
      createdByUserId: _actorUserId,
      ...(_input.responsibleName != null ? { responsibleName: _input.responsibleName as string | null } : {}),
      ...(_input.responsiblePhone != null ? { responsiblePhone: _input.responsiblePhone as string | null } : {}),
      totalAmountCents,
    };

    const RESERVATION = await this._reservationRepository.createReservationSV(INPUT_DTO);

    return { reservation: RESERVATION };
  }
}

// ---------------------------------------------------------------------------
// ListReservationsUseCase
// ---------------------------------------------------------------------------

export type ListReservationsInput = {
  venueId: string;
  courtId?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  status?: ReservationStatus;
  page: number;
  limit: number;
};

export type ListReservationsOutput = {
  items: ReservationDTO[];
  pageInfo: { page: number; limit: number; total: number };
};

export class ListReservationsUseCase {
  constructor(
    private readonly _reservationRepository: ReservationRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(_input: ListReservationsInput, _actorUserId: string): Promise<ListReservationsOutput> {
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
        'No tienes permisos para ver las reservas de esta sede.',
        403,
      );
    }

    const FILTERS: ListReservationsFiltersDTO = {
      venueId: _input.venueId,
      ...(_input.courtId !== undefined ? { courtId: _input.courtId } : {}),
      ...(_input.from !== undefined ? { from: _input.from } : {}),
      ...(_input.to !== undefined ? { to: _input.to } : {}),
      ...(_input.status !== undefined ? { status: _input.status } : {}),
    };

    const PAGE: PageDTO = { page: _input.page, limit: _input.limit };

    const { items, total } = await this._reservationRepository.listReservationsSV(FILTERS, PAGE);

    return {
      items,
      pageInfo: { page: _input.page, limit: _input.limit, total },
    };
  }
}

// ---------------------------------------------------------------------------
// CancelReservationUseCase
// ---------------------------------------------------------------------------

export type CancelReservationInput = {
  reservationId: string;
};

export type CancelReservationOutput = {
  reservation: ReservationDTO;
};

export class CancelReservationUseCase {
  constructor(
    private readonly _reservationRepository: ReservationRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(_input: CancelReservationInput, _actorUserId: string): Promise<CancelReservationOutput> {
    // Obtener la reserva para verificar que existe y tomar el venueId
    const RESERVATION = await this._reservationRepository.findByIdSV(_input.reservationId);
    if (RESERVATION === null) {
      throw new AppError('RESERVA_NO_ENCONTRADA', 'La reserva indicada no existe.', 404);
    }

    // Autorización: el usuario debe ser staff de esta sede
    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(_actorUserId, RESERVATION.venueId);
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No tienes permisos para cancelar reservas de esta sede.',
        403,
      );
    }

    // Cancelar la reserva
    const CANCELLED = await this._reservationRepository.cancelReservationSV(_input.reservationId);

    return { reservation: CANCELLED };
  }
}

// ---------------------------------------------------------------------------
// UnblockCourtSlotUseCase — cancelar bloqueo por court + horario
// ---------------------------------------------------------------------------

export type UnblockCourtSlotInput = {
  venueId: string;
  courtId: string;
  scheduledAt: Date;
};

export class UnblockCourtSlotUseCase {
  constructor(
    private readonly _reservationRepository: ReservationRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(
    _input: UnblockCourtSlotInput,
    _actorUserId: string,
  ): Promise<CancelReservationOutput> {
    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(
      _actorUserId,
      _input.venueId,
    );
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No tienes permisos para desbloquear horarios en esta sede.',
        403,
      );
    }

    const RESERVATION = await this._reservationRepository.findByCourtAndScheduledAtSV(
      _input.courtId,
      _input.scheduledAt,
    );
    if (
      RESERVATION === null
      || RESERVATION.venueId !== _input.venueId
      || RESERVATION.type !== ReservationType.BLOCKED
      || RESERVATION.status !== 'CONFIRMED'
    ) {
      throw new AppError('BLOQUEO_NO_ENCONTRADO', 'No existe bloqueo para este horario.', 404);
    }

    const CANCELLED = await this._reservationRepository.cancelReservationSV(RESERVATION.id);
    return { reservation: CANCELLED };
  }
}