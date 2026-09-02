import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRegistrationDTO, TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';

export class RegisterTournamentParticipantUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    userId: string;
  }): Promise<{ created: boolean; registration: TournamentRegistrationDTO }> {
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

    //? La autoinscripcion entra PENDING y la confirma el organizador con
    //? PATCH /tournaments/:id/registrations/:registrationId. Escribir CONFIRMED
    //? aca saltea esa aprobacion, y contradice el @default(PENDING) del schema.
    const RESULT = await this._registrationRepository.upsertSV({
      tournamentId: _input.tournamentId,
      userId: _input.userId,
      status: 'PENDING',
    });

    //? Autoinscripción siempre es AUTHENTICATED (upsertSV escribe `_input.userId`, nunca una fila
    //? GUEST); `userId` no puede ser nulo aquí aunque el DTO lo tipe nullable (Slice 1: guests).
    //? Se devuelve el DTO completo (con `createdAt`, `registrationType`, etc.) porque el cliente
    //? mobile lo parsea con `TournamentRegistrationDto.fromJson`, que exige esos campos.
    return {
      created: RESULT.created,
      registration: {
        ...RESULT.registration,
        userId: RESULT.registration.userId ?? _input.userId,
      },
    };
  }
}
