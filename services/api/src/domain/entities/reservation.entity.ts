/**
 * Entidad de dominio para Reservation — Backoffice Reservations API
 * Representa una reserva directa creada por staff de sede (no confundir con VacantHour publica).
 */

/** Tipo de reserva: directa (staff) o bloqueada (slot cancelado). */
export enum ReservationType {
  /** Reserva directa creada por staff para un cliente. */
  DIRECT = 'DIRECT',
  /** Bloque de horario (ej: mantenimiento, evento privado). */
  BLOCKED = 'BLOCKED',
}

/** Estado de una reserva. */
export enum ReservationStatus {
  /** Reserva confirmada. */
  CONFIRMED = 'CONFIRMED',
  /** Reserva cancelada (soft-delete). */
  CANCELLED = 'CANCELLED',
}

/** Entidad Reservation — representación pura de dominio, sin dependencias externas. */
export interface Reservation {
  readonly id: string;
  readonly venueId: string;
  readonly courtId: string;
  readonly sportId: string;
  readonly categoryId: string;
  readonly type: ReservationType;
  readonly status: ReservationStatus;
  readonly scheduledAt: Date;
  readonly durationMinutes: number;
  readonly notes: string | null;
  readonly createdByUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Input para crear una nueva reserva (sin id ni createdAt — los genera el repo). */
export interface CreateReservationInput {
  readonly venueId: string;
  readonly courtId: string;
  readonly sportId: string;
  readonly categoryId: string;
  readonly type?: ReservationType;
  readonly scheduledAt: Date;
  readonly durationMinutes?: number;
  readonly notes?: string | null;
  readonly createdByUserId: string;
}

/** Input para listar reservas con filtros. */
export interface ListReservationsFiltersDTO {
  readonly venueId?: string;
  readonly courtId?: string;
  readonly from?: string; // YYYY-MM-DD
  readonly to?: string;   // YYYY-MM-DD
  readonly status?: ReservationStatus;
}

/** DTO de paginación. */
export type PageDTO = {
  readonly page: number;
  readonly limit: number;
};

/** DTO de reserva para consumo por capas superiores. */
export type ReservationDTO = {
  readonly id: string;
  readonly venueId: string;
  readonly courtId: string;
  readonly sportId: string;
  readonly categoryId: string;
  readonly type: ReservationType;
  readonly status: ReservationStatus;
  readonly scheduledAt: Date;
  readonly durationMinutes: number;
  readonly notes: string | null;
  readonly createdByUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/** Input DTO para crear una reserva (tipo simplificado para el repo). */
export type CreateReservationInputDTO = {
  readonly venueId: string;
  readonly courtId: string;
  readonly sportId: string;
  readonly categoryId: string;
  readonly type?: ReservationType;
  readonly scheduledAt: Date;
  readonly durationMinutes?: number;
  readonly notes?: string | null;
  readonly createdByUserId: string;
};