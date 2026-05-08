import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRegistrationDTO, TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';

export class ListTournamentRegistrationsUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
  }): Promise<{ items: TournamentRegistrationDTO[]; total: number }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    const ITEMS = await this._registrationRepository.listByTournamentIdSV(_input.tournamentId);
    const TOTAL = await this._registrationRepository.countByTournamentIdSV(_input.tournamentId);

    return { items: ITEMS, total: TOTAL };
  }
}
