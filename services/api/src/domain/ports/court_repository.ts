/**
 * Puerto de repositorio para Court — US-W1-05 CRUD Courts
 * Define el contrato que implementa la capa de infraestructura.
 */
// eslint-disable-next-line no-restricted-imports -- Ports puede importar entidades del mismo nivel (domain)
import type { Court, CourtStatus, CreateCourtInput, UpdateCourtInput } from '../entities/court.entity.js';

/** Repository interface para operaciones CRUD de Court.
 *
 * La implementación vive en infrastructure y es inyectada por composition/DI.
 */
export interface ICourtRepository {
  /** Obtiene una cancha por su id. Null si no existe. */
  findById(_id: string): Promise<Court | null>;

  /** Lista canchas de una sede, opcionalmente filtradas por estado. */
  findByVenue(_venueId: string, _status?: CourtStatus): Promise<Court[]>;

  /** Crea una nueva cancha. Retorna la cancha creada con id y createdAt. */
  create(_data: CreateCourtInput): Promise<Court>;

  /** Actualiza campos de una cancha existente. Retorna la cancha actualizada. */
  update(_id: string, _data: UpdateCourtInput): Promise<Court>;

  /** Cancela una cancha (soft-delete: status = INACTIVE).
   * Idempotente: si ya está INACTIVE retorna 200.
   */
  cancel(_id: string): Promise<Court>;
}