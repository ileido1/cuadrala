import type { DatabaseHealthRepository } from '../../domain/ports/database_health_repository.js';

export class CheckDatabaseReadyUseCase {
  constructor(private readonly _databaseHealthRepository: DatabaseHealthRepository) {}

  async executeSV(): Promise<void> {
    await this._databaseHealthRepository.pingSV();
  }
}
