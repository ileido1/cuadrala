/**
 * Entidad de dominio para Court — US-W1-05 CRUD Courts
 * Solo atributos core, sin lógica de infraestructura.
 */

/** Estado de una cancha: ACTIVE = disponible, INACTIVE = cancelada (soft-delete). */
export enum CourtStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/** Tipo de deporte soportado por una cancha. */
export enum SportType {
  PADEL = 'PADEL',
  TENNIS = 'TENNIS',
}

/**
 * Entidad CourtPricingTier — representación pura de dominio de franja horaria con precio.
 * US-W1-05 — CRUD Courts — PR2
 */
export interface CourtPricingTier {
  readonly id: string;
  readonly courtId: string;
  readonly label: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly pricePerHourCents: number;
}

/** Entidad Court — representación pura de dominio, sin dependencias externas. */
export interface Court {
  readonly id: string;
  readonly venueId: string;
  readonly name: string;
  readonly sportType: SportType;
  readonly indoor: boolean;
  readonly lighting: boolean;
  readonly surfaceType: string | null;
  readonly status: CourtStatus;
  readonly pricePerHourCents: number | null;
  readonly capacity: string | null;
  readonly durationMinutes: number;
  readonly createdAt: Date;
  readonly pricingTiers: CourtPricingTier[];
}

/** Input para crear una nueva cancha (sin id ni createdAt — los genera el repo). */
export interface CreateCourtInput {
  readonly venueId: string;
  readonly name: string;
  readonly sportType?: SportType;
  readonly indoor?: boolean;
  readonly lighting?: boolean;
  readonly surfaceType?: string | null;
  readonly pricePerHourCents?: number | null;
  readonly capacity?: string | null;
  readonly durationMinutes?: number;
}

/** Input para actualizar una cancha existente (todos opcionales). */
export interface UpdateCourtInput {
  readonly name?: string;
  readonly sportType?: SportType;
  readonly indoor?: boolean;
  readonly lighting?: boolean;
  readonly surfaceType?: string | null;
  readonly pricePerHourCents?: number | null;
  readonly capacity?: string | null;
  readonly durationMinutes?: number;
}