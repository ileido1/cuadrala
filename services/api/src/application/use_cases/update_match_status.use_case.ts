import type { MatchStatusRepository } from '../../domain/ports/match_status_repository.js';

export interface UpdateMatchStatusUseCaseResult {
  updatedCount: number;
}

/**
 * @name    :UpdateMatchStatusUseCase
 * @version :1.0.0
 * @description :Actualiza el estado de partidas SCHEDULED → IN_PROGRESS cuando llega la hora
 */
export class UpdateMatchStatusUseCase {
  constructor(private readonly _matchStatusRepository: MatchStatusRepository) {}

  async execute(): Promise<UpdateMatchStatusUseCaseResult> {
    return this._matchStatusRepository.updateScheduledToInProgressSV();
  }
}
