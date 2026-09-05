import { AppError } from '../../domain/errors/app_error.js';
import { assertPairableSV } from '../../domain/tournament/tournament_pairing.js';
import { isTournamentRosterOpenSV } from '../../domain/tournament/tournament_registration_window.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

/**
 * El organizador arma o deshace una dupla fija.
 *
 * En el MVP las duplas las arma solo el organizador: el jugador se inscribe
 * solo, como en cualquier torneo, y el emparejamiento es trabajo del que lleva
 * el torneo. Eso evita el problema de las dos partes —invitar al companero,
 * esperar su respuesta, vencer la invitacion— que es lo que encarece el
 * auto-emparejamiento.
 */
export class PairTournamentRegistrationsUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _assertOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async pairSV(_input: {
    tournamentId: string;
    firstRegistrationId: string;
    secondRegistrationId: string;
    actorUserId: string;
  }): Promise<{ paired: true }> {
    const TOURNAMENT = await this._assertOrganizerOnOpenRosterSV(
      _input.tournamentId,
      _input.actorUserId,
    );

    const [FIRST, SECOND] = await Promise.all([
      this._registrationRepository.findByIdSV(_input.firstRegistrationId),
      this._registrationRepository.findByIdSV(_input.secondRegistrationId),
    ]);

    assertPairableSV({
      tournamentId: _input.tournamentId,
      pairedRegistration: TOURNAMENT.pairedRegistration,
      first: FIRST,
      second: SECOND,
    });

    await this._registrationRepository.pairSV(
      _input.firstRegistrationId,
      _input.secondRegistrationId,
    );
    return { paired: true };
  }

  async unpairSV(_input: {
    tournamentId: string;
    registrationId: string;
    actorUserId: string;
  }): Promise<{ unpaired: boolean }> {
    await this._assertOrganizerOnOpenRosterSV(_input.tournamentId, _input.actorUserId);

    const REGISTRATION = await this._registrationRepository.findByIdSV(_input.registrationId);
    if (REGISTRATION === null || REGISTRATION.tournamentId !== _input.tournamentId) {
      throw new AppError('INSCRIPCION_NO_ENCONTRADA', 'La inscripción indicada no existe.', 404);
    }

    //? `unpaired: false` cuando no habia dupla. No es un error: el organizador
    //? pidio deshacer algo que ya estaba deshecho.
    const UNPAIRED = await this._registrationRepository.unpairSV(_input.registrationId);
    return { unpaired: UNPAIRED };
  }

  private async _assertOrganizerOnOpenRosterSV(
    _tournamentId: string,
    _actorUserId: string,
  ): Promise<{ pairedRegistration: boolean }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    await this._assertOrganizerAccess.executeSV({
      actorUserId: _actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? Misma ventana que el resto del plantel: con el torneo en curso el cuadro
    //? ya esta materializado y mover una dupla lo invalidaria.
    if (!isTournamentRosterOpenSV(TOURNAMENT.status)) {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite cambios de inscripción en su estado actual.',
        409,
      );
    }

    return { pairedRegistration: TOURNAMENT.pairedRegistration };
  }
}
