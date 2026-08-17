import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';

export class WithdrawTournamentRegistrationUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    userId: string;
  }): Promise<void> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? El roster se bloquea desde IN_PROGRESS; retiros solo mientras DRAFT/OPEN
    if (TOURNAMENT.status !== 'DRAFT' && TOURNAMENT.status !== 'OPEN') {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite retiros de inscripción en su estado actual.',
        409,
      );
    }

    await this._registrationRepository.disableByTournamentAndUserSV(
      _input.tournamentId,
      _input.userId,
    );
  }
}
