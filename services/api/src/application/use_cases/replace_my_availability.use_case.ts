import type {
  UserAvailabilityDTO,
  UserAvailabilityRepository,
} from '../../domain/ports/user_availability_repository.js';

export class ReplaceMyAvailabilityUseCase {
  public constructor(private readonly _repo: UserAvailabilityRepository) {}

  async executeSV(_userId: string, _items: UserAvailabilityDTO[]): Promise<UserAvailabilityDTO[]> {
    return this._repo.replaceForUserSV(_userId, _items);
  }
}
