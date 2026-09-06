import { AppError } from '../../domain/errors/app_error.js';
import { isTournamentRosterOpenSV } from '../../domain/tournament/tournament_registration_window.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';
import type { CreateTournamentNotificationEventUseCase } from './create_tournament_notification_event.use_case.js';

/**
 * El organizador confirma de una vez a todos los inscriptos pendientes.
 *
 * Con dieciseis inscriptos, confirmar de a uno son dieciseis toques, y saltearse
 * uno deja a ese jugador fuera del cuadro sin que nadie se entere: el calendario
 * se arma solo con los CONFIRMED. El lote elimina esa clase de error.
 *
 * Emite el mismo aviso que la confirmacion individual — para el jugador es
 * exactamente lo mismo que le pase—, en un solo evento para todos.
 */
export class ConfirmPendingTournamentRegistrationsUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _assertOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    private readonly _createTournamentNotificationEvent: CreateTournamentNotificationEventUseCase | null = null,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    actorUserId: string;
  }): Promise<{ confirmed: number }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    await this._assertOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    if (!isTournamentRosterOpenSV(TOURNAMENT.status)) {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite cambios de inscripción en su estado actual.',
        409,
      );
    }

    const PENDING = await this._registrationRepository.listByTournamentIdAndStatusSV(
      _input.tournamentId,
      'PENDING',
    );
    if (PENDING.length === 0) return { confirmed: 0 };

    //? De a una y no en bloque: cada llamada mueve tambien al companero de
    //? dupla, y esa regla ya vive en el repositorio. Repetirla aca en un
    //? updateMany seria una segunda copia que se desincroniza.
    const CONFIRMED_USER_IDS: string[] = [];
    let confirmed = 0;

    for (const REGISTRATION of PENDING) {
      const UPDATED = await this._registrationRepository.updateStatusWithPartnerSV(
        REGISTRATION.id,
        'CONFIRMED',
      );
      if (UPDATED === null) continue;
      confirmed += 1;
      if (UPDATED.userId !== null) CONFIRMED_USER_IDS.push(UPDATED.userId);
    }

    await this._notifySV(TOURNAMENT, CONFIRMED_USER_IDS);
    return { confirmed };
  }

  /** Nunca bloquea la confirmacion: fallar el aviso no puede costar el alta. */
  private async _notifySV(
    _tournament: { id: string; name: string; categoryId: string },
    _userIds: string[],
  ): Promise<void> {
    if (this._createTournamentNotificationEvent === null) return;
    if (_userIds.length === 0) return;

    try {
      await this._createTournamentNotificationEvent.executeSV({
        type: 'TOURNAMENT_REGISTRATION_CONFIRMED',
        tournamentId: _tournament.id,
        categoryId: _tournament.categoryId,
        payload: { tournamentName: _tournament.name },
        userIds: _userIds,
      });
    } catch {
      // No bloquear la confirmacion si falla la notificacion.
    }
  }
}
