/**
 * Puerto de dominio para ReservationRepository.
 * Backoffice Reservations API — fase de creación de reserva directa por staff.
 */

import type {
  CreateReservationInputDTO,
  ListReservationsFiltersDTO,
  PageDTO,
  ReservationDTO,
} from '../entities/booking/reservation.entity.js';

export interface ReservationRepository {
  /** Crea una reserva directa o bloqueada. */
  createReservationSV(_input: CreateReservationInputDTO): Promise<ReservationDTO>;

  /** Obtiene una reserva por su ID. */
  findByIdSV(_id: string): Promise<ReservationDTO | null>;

  /** Verifica si ya existe una reserva para ese court+scheduledAt (excluye canceladas). */
  /**
   * La reserva VIVA (HELD o CONFIRMED) de esa cancha y horario, si la hay.
   *
   * Un mismo turno puede tener varias filas historicas: cancelar no borra, solo
   * cambia el estado. Solo las vivas ocupan la cancha, igual que el indice
   * parcial `Reservation_court_slot_live_uniq`.
   */
  findLiveByCourtAndScheduledAtSV(
    _courtId: string,
    _scheduledAt: Date,
  ): Promise<ReservationDTO | null>;

  /** Lista reservas con filtros y paginación. */
  listReservationsSV(
    _filters: ListReservationsFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: ReservationDTO[]; total: number }>;

  /** Cancela una reserva (soft-delete). */
  cancelReservationSV(_id: string): Promise<ReservationDTO>;

  /** Actualiza el monto total (totalAmountCents) de una reserva. */
  updateTotalAmountCentsSV(_id: string, _totalAmountCents: number): Promise<void>;
}