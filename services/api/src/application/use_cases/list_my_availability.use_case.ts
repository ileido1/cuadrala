import type {
  UserAvailabilityDTO,
  UserAvailabilityRepository,
} from '../../domain/ports/user_availability_repository.js';

export class ListMyAvailabilityUseCase {
  public constructor(private readonly _repo: UserAvailabilityRepository) {}

  async executeSV(_userId: string): Promise<UserAvailabilityDTO[]> {
    return this._repo.listByUserIdSV(_userId);
  }
}
