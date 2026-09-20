import type { MatchStatusRepository } from '../../domain/ports/match_status_repository.js';

export interface UpdateMatchStatusUseCaseResult {
  updatedCount: number;
  cancelledCount: number;
}

/**
 * @name    :UpdateMatchStatusUseCase
 * @version :1.0.0
 * @description :Reconcilia partidas vencidas según sus participantes y pagos.
 */
export class UpdateMatchStatusUseCase {
  constructor(private readonly _matchStatusRepository: MatchStatusRepository) {}

  async execute(): Promise<UpdateMatchStatusUseCaseResult> {
    return this._matchStatusRepository.updateScheduledToInProgressSV();
  }
}
