/**
 * Entidad de dominio para Court — US-W1-05 CRUD Courts
 * Solo atributos core, sin lógica de infraestructura.
 */
import { AppError } from '../../errors/app_error.js';

/** Estado de una cancha: ACTIVE, MAINTENANCE (temporal), INACTIVE (eliminada). */
export enum CourtStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}

/** Tipo de deporte soportado por una cancha. */
export enum SportType {
  PADEL = 'PADEL',
  TENNIS = 'TENNIS',
  PICKLEBALL = 'PICKLEBALL',
  BEACH_TENNIS = 'BEACH_TENNIS',
}

/** Códigos válidos de `SportType`, para derivar contratos sin repetir la lista. */
export const SPORT_TYPE_CODES = Object.values(SportType);

/**
 * @name    :sportTypeFromStringSV
 * @version :1.0.0
 * @description :Convierte un string al `SportType` correspondiente. Falla ante
 * un valor desconocido en vez de caer a PADEL: un default silencioso convertía
 * una cancha de otro deporte en una de pádel, sin error ni log.
 * @param {string} _value - Código del deporte
 * @return {SportType}
 * @throws {AppError} 400 si el código no pertenece al enum
 */
export function sportTypeFromStringSV(_value: string): SportType {
  const MATCH = SPORT_TYPE_CODES.find((_code) => _code === _value);
  if (MATCH === undefined) {
    throw new AppError('DEPORTE_INVALIDO', `Tipo de deporte no soportado: ${_value}`, 400);
  }
  return MATCH;
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
  readonly status?: CourtStatus;
}

/** Códigos válidos de `CourtStatus`, para derivar contratos sin repetir la lista. */
export const COURT_STATUS_CODES = Object.values(CourtStatus);

/**
 * @name    :courtStatusFromStringSV
 * @version :1.0.0
 * @description :Convierte un string al `CourtStatus` correspondiente. Falla ante
 * un valor desconocido en vez de caer a ACTIVE: una cancha en un estado que no
 * reconocemos se mostraría como reservable.
 * @param {string} _value - Código del estado
 * @return {CourtStatus}
 * @throws {AppError} 400 si el código no pertenece al enum
 */
export function courtStatusFromStringSV(_value: string): CourtStatus {
  const MATCH = COURT_STATUS_CODES.find((_code) => _code === _value);
  if (MATCH === undefined) {
    throw new AppError('ESTADO_CANCHA_INVALIDO', `Estado de cancha no soportado: ${_value}`, 400);
  }
  return MATCH;
}
