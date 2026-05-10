/**
 * Factory de repository para Court.
 * Provee acceso a las operaciones CRUD sobre canchas.
 *
 * US-W1-05 — CRUD Courts — PR2
 */

import { CourtRepository } from './court.repository.js';
import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type { Court, CourtStatus, CreateCourtInput, UpdateCourtInput } from '../../domain/entities/court.entity.js';

/** Singleton lazy-loaded del repository. */
let _instance: CourtRepository | null = null;

function getCourtRepository(): CourtRepository {
  if (_instance === null) {
    _instance = new CourtRepository();
  }
  return _instance;
}

/**
 * Crea una nueva cancha para una sede.
 * Aplica defaults: sportType=PADEL, indoor=false, lighting=false, status=ACTIVE.
 */
export async function createCourtRepo(_data: CreateCourtInput): Promise<Court> {
  return getCourtRepository().create(_data);
}

/**
 * Obtiene una cancha por su id. Retorna null si no existe.
 */
export async function getCourtByIdRepo(_id: string): Promise<Court | null> {
  return getCourtRepository().findById(_id);
}

/**
 * Lista canchas de una sede, opcionalmente filtradas por estado.
 */
export async function listCourtsByVenueRepo(_venueId: string, _status?: CourtStatus): Promise<Court[]> {
  return getCourtRepository().findByVenue(_venueId, _status);
}

/**
 * Actualiza campos de una cancha existente.
 * Campos permitidos: name, sportType, indoor, lighting, surfaceType.
 */
export async function updateCourtRepo(_id: string, _data: UpdateCourtInput): Promise<Court> {
  return getCourtRepository().update(_id, _data);
}

/**
 * Cancela una cancha (soft-delete: status = INACTIVE).
 * Idempotente: si ya está INACTIVE retorna la misma entidad.
 */
export async function cancelCourtRepo(_id: string): Promise<Court> {
  return getCourtRepository().cancel(_id);
}
