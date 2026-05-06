import { AppError } from '../../domain/errors/app_error.js';
import type {
  UpsertUserLocationDTO,
  UserLocationDTO,
  UserLocationRepository,
} from '../../domain/ports/user_location_repository.js';

export class UpsertMyLocationUseCase {
  public constructor(private readonly _repo: UserLocationRepository) {}

  async executeSV(_userId: string, _patch: UpsertUserLocationDTO): Promise<UserLocationDTO> {
    if (_patch.latitude < -90 || _patch.latitude > 90) {
      throw new AppError('VALIDACION_FALLIDA', 'latitude fuera de rango.', 400);
    }
    if (_patch.longitude < -180 || _patch.longitude > 180) {
      throw new AppError('VALIDACION_FALLIDA', 'longitude fuera de rango.', 400);
    }
    if (_patch.radiusKm < 1 || _patch.radiusKm > 100) {
      throw new AppError('VALIDACION_FALLIDA', 'radiusKm debe estar entre 1 y 100.', 400);
    }
    return this._repo.upsertByUserIdSV(_userId, _patch);
  }
}
