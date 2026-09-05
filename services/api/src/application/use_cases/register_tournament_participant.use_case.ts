import { AppError } from '../../domain/errors/app_error.js';
import { isTournamentRosterOpenSV } from '../../domain/tournament/tournament_registration_window.js';
import type { TournamentRegistrationDTO, TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { CreateTournamentNotificationEventUseCase } from './create_tournament_notification_event.use_case.js';

export class RegisterTournamentParticipantUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _createTournamentNotificationEvent: CreateTournamentNotificationEventUseCase | null = null,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    userId: string;
  }): Promise<{ created: boolean; registration: TournamentRegistrationDTO }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? Misma ventana que la baja y las invitaciones: DRAFT y OPEN.
    if (!isTournamentRosterOpenSV(TOURNAMENT.status)) {
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

    //? Avisar al organizador: sin esto la inscripción queda PENDING esperando
    //? una aprobación que él no sabe que tiene. Solo en el alta real, para que
    //? reintentar la inscripción no vuelva a notificar.
    if (RESULT.created) {
      await this._notifyOrganizerSV(TOURNAMENT, _input.userId);
    }

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

  /** Nunca bloquea la inscripción: fallar el aviso no puede costar el alta. */
  private async _notifyOrganizerSV(
    _tournament: { id: string; name: string; categoryId: string; organizerUserId: string | null },
    _registeredUserId: string,
  ): Promise<void> {
    if (this._createTournamentNotificationEvent === null) return;
    //? Un torneo sin organizador (compatibilidad hacia atrás) no tiene a quién avisarle.
    if (_tournament.organizerUserId === null) return;
    //? El organizador que se anota a su propio torneo no se avisa a sí mismo.
    if (_tournament.organizerUserId === _registeredUserId) return;

    try {
      await this._createTournamentNotificationEvent.executeSV({
        type: 'TOURNAMENT_REGISTRATION_RECEIVED',
        tournamentId: _tournament.id,
        categoryId: _tournament.categoryId,
        payload: { tournamentName: _tournament.name, registeredUserId: _registeredUserId },
        userIds: [_tournament.organizerUserId],
      });
    } catch {
      // No bloquear la inscripción si falla la notificación.
    }
  }
}
