import { AppError } from '../../domain/errors/app_error.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';

export type AssertVenueStaffAccessInput = {
  readonly actorUserId: string;
  readonly venueId: string;
  readonly forbiddenMessage?: string;
};

/**
 * Verifica que el actor sea staff (OWNER o STAFF) de la sede.
 * Solo lectura; idempotente por request.
 */
export class AssertVenueStaffAccessUseCase {
  constructor(private readonly _venueStaffRepository: VenueStaffRepository) {}

  async executeSV(_input: AssertVenueStaffAccessInput): Promise<void> {
    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(
      _input.actorUserId,
      _input.venueId,
    );
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        _input.forbiddenMessage ?? 'No tienes permisos para acceder a esta sede.',
        403,
      );
    }
  }
}
