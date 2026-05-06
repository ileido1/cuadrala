import { AppError } from '../../domain/errors/app_error.js';
import type {
  PlayerProfileRepository,
  UpsertPlayerProfileDTO,
} from '../../domain/ports/player_profile_repository.js';

export class UpdatePlayerProfileUseCase {
  constructor(private readonly _playerProfileRepository: PlayerProfileRepository) {}

  async executeSV(_userId: string, _patch: UpsertPlayerProfileDTO) {
    if (Object.keys(_patch).length === 0) {
      throw new AppError('VALIDACION_FALLIDA', 'No hay campos para actualizar.', 400);
    }
    if (_patch.birthDate !== undefined && _patch.birthDate !== null) {
      const YEAR = _patch.birthDate.getUTCFullYear();
      const NOW = new Date().getUTCFullYear();
      if (YEAR < 1900 || YEAR > NOW) {
        throw new AppError('VALIDACION_FALLIDA', 'birthDate es inválido.', 400);
      }
      // Mantener consistencia: si llega birthDate, derivamos birthYear.
      _patch.birthYear = YEAR;
    }
    if (_patch.birthYear !== undefined && _patch.birthYear !== null) {
      const YEAR = _patch.birthYear;
      const NOW = new Date().getFullYear();
      if (YEAR < 1900 || YEAR > NOW) {
        throw new AppError('VALIDACION_FALLIDA', 'birthYear es inválido.', 400);
      }
    }
    return this._playerProfileRepository.upsertByUserIdSV(_userId, _patch);
  }
}

