import { AppError } from '../../domain/errors/app_error.js';
import type {
  PlayerSportProfileDTO,
  PlayerSportProfileRepository,
  UpsertPlayerSportProfileDTO,
} from '../../domain/ports/player_sport_profile_repository.js';

export class ReplaceMySportProfilesUseCase {
  public constructor(private readonly _repo: PlayerSportProfileRepository) {}

  async executeSV(_userId: string, _items: UpsertPlayerSportProfileDTO[]): Promise<PlayerSportProfileDTO[]> {
    const SEEN = new Set<string>();
    for (const ITEM of _items) {
      if (SEEN.has(ITEM.sportId)) {
        throw new AppError('VALIDACION_FALLIDA', 'No se puede repetir el mismo deporte.', 400);
      }
      SEEN.add(ITEM.sportId);
      if (ITEM.skillLevel < 1.0 || ITEM.skillLevel > 7.0) {
        throw new AppError('VALIDACION_FALLIDA', 'skillLevel debe estar entre 1.0 y 7.0.', 400);
      }
    }
    return this._repo.replaceForUserSV(_userId, _items);
  }
}
