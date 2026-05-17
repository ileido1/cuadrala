/**
 * Puerto de dominio unificado para BookingRepository.
 * Reemplaza ReservationRepository para consulta/creación/cancelación
 * de bookings de cualquier tipo (DIRECT, BLOCKED, MATCH).
 *
 * Design: sdd/unificar-match-reservation (PR2 — Domain + Application Layer)
 */

import type {
  PageDTO,
  ReservationDTO,
  ReservationType,
  Visibility,
  ReservationStatus,
} from '../entities/booking/reservation.entity.js';

// -----------------------------------------------------------------------------
// Filtros para listar bookings (unificados)
// -----------------------------------------------------------------------------

export interface BookingFilters {
  readonly venueId?: string;
  readonly courtId?: string;
  readonly from?: string; // YYYY-MM-DD
  readonly to?: string;   // YYYY-MM-DD
  readonly status?: ReservationStatus;
  readonly type?: ReservationType;
  readonly visibility?: Visibility;
  readonly page?: number;
  readonly limit?: number;
}

// -----------------------------------------------------------------------------
// DTOs para operaciones de booking
// -----------------------------------------------------------------------------

/** Input para crear un booking de cualquier tipo (DIRECT, BLOCKED, MATCH). */
export interface CreateBookingInputDTO {
  readonly venueId: string;
  readonly courtId: string;
  readonly sportId: string;
  readonly categoryId?: string;
  readonly type: ReservationType;
  readonly scheduledAt: Date;
  readonly durationMinutes?: number;
  readonly notes?: string | null;
  readonly createdByUserId: string;
  readonly responsibleName?: string | null;
  readonly responsiblePhone?: string | null;
  /** Monto total en centavos. Calculado desde pricePerHourCents del court. */
  readonly totalAmountCents?: number | null;
  // MATCH-specific (opcionales para type=MATCH)
  readonly organizerUserId?: string;
  readonly formatPresetId?: string;
  readonly formatParameters?: Record<string, unknown> | null;
  readonly maxParticipants?: number;
  readonly pricePerPlayerCents?: number;
  readonly visibility?: Visibility;
}

/** Input para actualizar un booking existente (parcial). */
export interface UpdateBookingInputDTO {
  readonly status?: ReservationStatus;
  readonly visibility?: Visibility;
  readonly matchStatus?: import('../entities/booking/reservation.entity.js').MatchStatus;
  readonly notes?: string | null;
  readonly maxParticipants?: number;
  readonly pricePerPlayerCents?: number;
  // Solo para type=MATCH
  readonly formatPresetId?: string;
  readonly formatParameters?: Record<string, unknown> | null;
}

// -----------------------------------------------------------------------------
// BookingRepository — puerto unificado
// -----------------------------------------------------------------------------

export interface BookingRepository {
  /**
   * Crea un booking de cualquier tipo (DIRECT, BLOCKED, MATCH).
   * Para type=MATCH: requiere organizerUserId; visibility default DRAFT.
   */
  createBookingSV(_input: CreateBookingInputDTO): Promise<ReservationDTO>;

  /**
   * Lista bookings con filtros y paginación.
   * Filtra por type, visibility, status, venueId, courtId, rango de fechas.
   */
  listBookingsSV(
    _filters: BookingFilters,
    _page: PageDTO,
  ): Promise<{ items: ReservationDTO[]; total: number }>;

  /** Obtiene un booking por su ID. Null si no existe. */
  findByIdSV(_id: string): Promise<ReservationDTO | null>;

  /**
   * Verifica disponibilidad del slot en una cancha.
   * Para type=MATCH con visibility=DRAFT, el slot no bloquea disponibilidad pública.
   * @throws AppError(CONFLICTO) si el slot está ocupado por un booking confirmado.
   */
  assertAvailableSV(_courtId: string, _scheduledAt: Date, _excludeId?: string): Promise<void>;

  /** Actualiza un booking existente (parcial). */
  updateBookingSV(_id: string, _patch: UpdateBookingInputDTO): Promise<ReservationDTO>;

  /** Cancela un booking (soft-delete: status = CANCELLED). */
  cancelBookingSV(_id: string): Promise<ReservationDTO>;
}