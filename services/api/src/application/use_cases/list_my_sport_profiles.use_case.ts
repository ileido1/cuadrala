import type {
  PlayerSportProfileDTO,
  PlayerSportProfileRepository,
} from '../../domain/ports/player_sport_profile_repository.js';

export class ListMySportProfilesUseCase {
  public constructor(private readonly _repo: PlayerSportProfileRepository) {}

  async executeSV(_userId: string): Promise<PlayerSportProfileDTO[]> {
    return this._repo.listByUserIdSV(_userId);
  }
}
