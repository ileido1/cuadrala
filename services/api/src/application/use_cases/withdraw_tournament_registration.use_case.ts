import { AppError } from '../../domain/errors/app_error.js';
import { isTournamentRosterOpenSV } from '../../domain/tournament/tournament_registration_window.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class WithdrawTournamentRegistrationUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    userId: string;
    actorUserId: string;
  }): Promise<void> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 2. El jugador afectado puede darse de baja a si mismo sin chequeo extra;
    //?    dar de baja a otro requiere ser el organizador del torneo o staff de su sede.
    if (_input.actorUserId !== _input.userId) {
      await this._assertTournamentOrganizerAccess.executeSV({
        actorUserId: _input.actorUserId,
        organizerUserId: TOURNAMENT.organizerUserId,
        venueId: TOURNAMENT.venueId,
      });
    }

    //? 3. El roster se bloquea desde IN_PROGRESS; retiros solo mientras DRAFT/OPEN
    if (!isTournamentRosterOpenSV(TOURNAMENT.status)) {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite retiros de inscripción en su estado actual.',
        409,
      );
    }

    //? 4. Deshabilitar la inscripción
    await this._registrationRepository.disableByTournamentAndUserSV(
      _input.tournamentId,
      _input.userId,
    );
  }
}
