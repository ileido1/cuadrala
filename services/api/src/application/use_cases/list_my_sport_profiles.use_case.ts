import { enrichPlayerSportProfilesSV } from '../helpers/enrich_player_sport_profiles.js';
import type {
  PlayerSportProfileDTO,
  PlayerSportProfileRepository,
} from '../../domain/ports/player_sport_profile_repository.js';
import type { UserCategoryRepository } from '../../domain/ports/user_category_repository.js';

export class ListMySportProfilesUseCase {
  public constructor(
    private readonly _repo: PlayerSportProfileRepository,
    private readonly _userCategoryRepository: UserCategoryRepository,
  ) {}

  async executeSV(_userId: string): Promise<PlayerSportProfileDTO[]> {
    const [PROFILES, CATEGORIES] = await Promise.all([
      this._repo.listByUserIdSV(_userId),
      this._userCategoryRepository.listByUserIdSV(_userId),
    ]);
    return enrichPlayerSportProfilesSV(PROFILES, CATEGORIES);
  }
}
