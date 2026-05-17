import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';

export class UpdateTournamentStatusUseCase {
  constructor(private readonly _tournamentRepository: TournamentRepository) {}

  async executeSV(_input: {
    tournamentId: string;
    status: string;
  }): Promise<{ id: string; name: string; status: string }> {
    const UPDATED = await this._tournamentRepository.updateStatusSV(
      _input.tournamentId,
      _input.status,
    );

    if (UPDATED === null) {
      throw new AppError('NO_ENCONTRADO', 'Torneo no encontrado.', 404);
    }

    return UPDATED;
  }
}
