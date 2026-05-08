import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';

export class RegisterTournamentParticipantUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    userId: string;
  }): Promise<{ created: boolean; registration: { id: string; tournamentId: string; userId: string; status: string } }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    const RESULT = await this._registrationRepository.upsertSV({
      tournamentId: _input.tournamentId,
      userId: _input.userId,
    });

    return {
      created: RESULT.created,
      registration: {
        id: RESULT.registration.id,
        tournamentId: RESULT.registration.tournamentId,
        userId: RESULT.registration.userId,
        status: RESULT.registration.status,
      },
    };
  }
}
