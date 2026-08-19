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

    //? Autoinscripción solo permitida mientras el torneo está en DRAFT (MVP).
    if (TOURNAMENT.status !== 'DRAFT') {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite nuevas inscripciones en su estado actual.',
        409,
      );
    }

    const RESULT = await this._registrationRepository.upsertSV({
      tournamentId: _input.tournamentId,
      userId: _input.userId,
    });

    //? Autoinscripción siempre es AUTHENTICATED (upsertSV escribe `_input.userId`, nunca una fila
    //? GUEST); `userId` no puede ser nulo aquí aunque el DTO lo tipe nullable (Slice 1: guests).
    const REGISTRATION_USER_ID = RESULT.registration.userId ?? _input.userId;

    return {
      created: RESULT.created,
      registration: {
        id: RESULT.registration.id,
        tournamentId: RESULT.registration.tournamentId,
        userId: REGISTRATION_USER_ID,
        status: RESULT.registration.status,
      },
    };
  }
}
