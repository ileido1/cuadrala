/**
 * Use Case para actualizar settings de una sede.
 *
 * PATCH /api/v1/venues/:venueId
 */

import { AppError } from '../../domain/errors/app_error.js';
import type {
  UpdateVenueDataDTO,
  VenueRepository,
  VenueSettingsDTO,
} from '../../domain/ports/venue_repository.js';

export type UpdateVenueInputDTO = UpdateVenueDataDTO;
export type VenueOutputDTO = VenueSettingsDTO;

export class UpdateVenueUseCase {
  constructor(private readonly _venueRepository: VenueRepository) {}

  async executeSV(_venueId: string, _input: UpdateVenueInputDTO): Promise<VenueOutputDTO> {
    const VENUE = await this._venueRepository.findByIdSV(_venueId);
    if (VENUE === null) {
      throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
    }

    return this._venueRepository.updateSV(_venueId, _input);
  }
}
