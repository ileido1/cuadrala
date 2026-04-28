import type { SportDTO, SportRepository } from '../../domain/ports/sport_repository.js';

export class ListSportsUseCase {
  constructor(private readonly _sportRepository: SportRepository) {}

  async executeSV(): Promise<SportDTO[]> {
    return this._sportRepository.listSportsSV();
  }
}

