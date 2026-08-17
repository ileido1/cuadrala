import { AppError } from '../../domain/errors/app_error.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';

export type AssertTournamentOrganizerAccessInput = {
  readonly actorUserId: string;
  readonly organizerUserId: string | null;
  readonly venueId: string | null;
  readonly forbiddenMessage?: string;
};

/**
 * Verifica que el actor tenga autoridad de organizador sobre el torneo:
 * es el `organizerUserId` del torneo, o (si el torneo tiene `venueId`) es staff de esa sede.
 * Solo lectura; idempotente por request.
 */
export class AssertTournamentOrganizerAccessUseCase {
  constructor(private readonly _venueStaffRepository: VenueStaffRepository) {}

  async executeSV(_input: AssertTournamentOrganizerAccessInput): Promise<void> {
    //? 1. Autoridad directa: el actor es el organizador registrado del torneo
    if (_input.organizerUserId !== null && _input.organizerUserId === _input.actorUserId) {
      return;
    }

    //? 2. Autoridad de respaldo: staff (OWNER o STAFF) de la sede del torneo, si tiene una asignada
    if (_input.venueId !== null) {
      const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(
        _input.actorUserId,
        _input.venueId,
      );
      if (IS_STAFF) {
        return;
      }
    }

    //? 3. Ninguna autoridad válida: rechazar con 403
    throw new AppError(
      'NO_AUTORIZADO',
      _input.forbiddenMessage ?? 'No tienes permisos para administrar este torneo.',
      403,
    );
  }
}
