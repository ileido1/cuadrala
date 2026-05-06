import type {
  UserLocationDTO,
  UserLocationRepository,
} from '../../domain/ports/user_location_repository.js';

export class GetMyLocationUseCase {
  public constructor(private readonly _repo: UserLocationRepository) {}

  async executeSV(_userId: string): Promise<UserLocationDTO | null> {
    return this._repo.findByUserIdSV(_userId);
  }
}
