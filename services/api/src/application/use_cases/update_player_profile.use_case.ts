import { AppError } from '../../domain/errors/app_error.js';
import type {
  PlayerProfileRepository,
  UpsertPlayerProfileDTO,
} from '../../domain/ports/player_profile_repository.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export class UpdatePlayerProfileUseCase {
  constructor(
    private readonly _playerProfileRepository: PlayerProfileRepository,
    private readonly _userRepository: UserRepository,
  ) {}

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

    if (_patch.documentNumber !== undefined && _patch.documentNumber !== null) {
      const DUPLICATES = await this._userRepository.findByDocumentNumberSV(_patch.documentNumber);
      const TAKEN_BY_OTHER = DUPLICATES.some((_user) => _user.id !== _userId);
      if (TAKEN_BY_OTHER) {
        throw new AppError(
          'DOCUMENTO_EN_USO',
          'Ese número de documento ya está registrado en otra cuenta.',
          409,
        );
      }
    }

    try {
      return await this._playerProfileRepository.upsertByUserIdSV(_userId, _patch);
    } catch (_error) {
      if (
        typeof _error === 'object' &&
        _error !== null &&
        'code' in _error &&
        _error.code === 'P2002' &&
        'meta' in _error &&
        typeof _error.meta === 'object' &&
        _error.meta !== null &&
        'target' in _error.meta &&
        Array.isArray(_error.meta.target) &&
        _error.meta.target.includes('documentNumber')
      ) {
        throw new AppError(
          'DOCUMENTO_EN_USO',
          'Ese número de documento ya está registrado en otra cuenta.',
          409,
        );
      }
      throw _error;
    }
  }
}
