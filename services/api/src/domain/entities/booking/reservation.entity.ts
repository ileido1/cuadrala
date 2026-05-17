/**
 * Entidad de dominio para Reservation — Backoffice Reservations API
 * Representa una reserva directa creada por staff de sede (no confundir con VacantHour publica).
 */

/** Tipo de reserva: directa (staff), bloqueada (slot cancelado), o match (reservable públicamente). */
export enum ReservationType {
  /** Reserva directa creada por staff para un cliente. */
  DIRECT = 'DIRECT',
  /** Bloque de horario (ej: mantenimiento, evento privado). */
  BLOCKED = 'BLOCKED',
  /** Match abiertos públicamente (reemplaza VacantHour). */
  MATCH = 'MATCH',
}

/** Visibilidad de un match — reemplaza el concepto de VacantHour status. */
export enum Visibility {
  /** Visible públicamente en el calendario (reemplaza VacantHour PUBLISHED). */
  PUBLISHED = 'PUBLISHED',
  /** No visible públicamente — solo staff y organizador ven el slot. */
  DRAFT = 'DRAFT',
  /** Solo por invitación (match privado). */
  PRIVATE = 'PRIVATE',
}

/** Estado de un match (solo significativo cuando type=MATCH). */
export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
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
  readonly responsibleName: string | null;
  readonly responsiblePhone: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Input para crear una nueva reserva (sin id ni createdAt — los genera el repo). */
export interface CreateReservationInput {
  readonly venueId: string;
  readonly courtId: string;
  readonly sportId: string;
  readonly categoryId?: string;
  readonly type?: ReservationType;
  readonly scheduledAt: Date;
  readonly durationMinutes?: number;
  readonly notes?: string | null;
  readonly createdByUserId: string;
  readonly responsibleName?: string | null;
  readonly responsiblePhone?: string | null;
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
  readonly courtName: string | null;
  readonly sportId: string;
  readonly categoryId: string;
  readonly type: ReservationType;
  readonly status: ReservationStatus;
  readonly scheduledAt: Date;
  readonly durationMinutes: number;
  readonly notes: string | null;
  readonly createdByUserId: string;
  readonly responsibleName: string | null;
  readonly responsiblePhone: string | null;
  readonly totalAmountCents: number | null;
  readonly paidAmountCents: number;
  readonly pricingCurrency: string;
  readonly totalAmountMinor: bigint | null;
  readonly paidAmountMinor: bigint;
  readonly paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  readonly createdAt: Date;
  readonly updatedAt: Date;
  // MATCH-specific (nullable para DIRECT/BLOCKED)
  readonly matchId?: string | null;
  readonly organizerUserId?: string | null;
  readonly formatPresetId?: string | null;
  readonly formatParameters?: Record<string, unknown> | null;
  readonly maxParticipants?: number;
  readonly pricePerPlayerCents?: number;
  readonly visibility?: Visibility | null;
  readonly matchStatus?: MatchStatus | null;
};

/** Input DTO para crear una reserva (tipo simplificado para el repo). */
export type CreateReservationInputDTO = {
  readonly venueId: string;
  readonly courtId: string;
  readonly sportId: string;
  readonly categoryId?: string;
  readonly type?: ReservationType;
  readonly scheduledAt: Date;
  readonly durationMinutes?: number;
  readonly notes?: string | null;
  readonly createdByUserId: string;
  readonly responsibleName?: string | null;
  readonly responsiblePhone?: string | null;
  /** Monto total de la reserva en centavos. Calculado desde pricePerHourCents del court. */
  readonly totalAmountCents?: number | null;
};