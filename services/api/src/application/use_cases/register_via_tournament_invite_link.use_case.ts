import { AppError } from '../../domain/errors/app_error.js';
import { assertTournamentInviteLinkUsableSV } from '../../domain/tournament/tournament_invite_link_validity.js';
import { registerGuestForTournamentCoreSV } from '../helpers/register_guest_for_tournament_core.js';
import type { TournamentInviteLinkRepository } from '../../domain/ports/tournament_invite_link_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { RegisterTournamentParticipantUseCase } from './register_tournament_participant.use_case.js';

export class RegisterViaTournamentInviteLinkUseCase {
  constructor(
    private readonly _inviteLinkRepository: TournamentInviteLinkRepository,
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    //? Reuso directo, sin tocarlo (design.md, decisión #1): roster-open,
    //? cupos y el upsert idempotente ya viven ahí.
    private readonly _registerTournamentParticipant: RegisterTournamentParticipantUseCase,
  ) {}

  async executeSV(_input: {
    token: string;
    actorUserId: string | null;
    guestInput?: { name: string; phone?: string | null; email: string } | null;
  }): Promise<{
    registrationId: string;
    registrationType: 'AUTHENTICATED' | 'GUEST';
    tournamentId: string;
    status: string;
  }> {
    //? 1. Buscar por hash: sin match, mismo código que un link inválido (fail-closed)
    const LINK = await this._inviteLinkRepository.findByTokenHashSV(_input.token);
    if (LINK === null) {
      throw new AppError('ENLACE_INVALIDO', 'El enlace de invitación no es válido.', 410);
    }

    //? 2. Expirado / revocado / agotado (REQ-TIL-003/004/005), antes de cualquier alta
    assertTournamentInviteLinkUsableSV(LINK);

    if (_input.actorUserId !== null) {
      return this._registerAuthenticatedSV(LINK.id, LINK.tournamentId, _input.actorUserId);
    }

    if (_input.guestInput == null) {
      throw new AppError(
        'DATOS_INVITADO_REQUERIDOS',
        'Se requieren los datos del invitado para registrarse sin una sesión activa.',
        400,
      );
    }

    return this._registerGuestSV(LINK.id, LINK.tournamentId, LINK.createdByUserId, _input.guestInput);
  }

  /** REQ-TIL-007: delega en RegisterTournamentParticipantUseCase sin tocarlo. */
  private async _registerAuthenticatedSV(
    _linkId: string,
    _tournamentId: string,
    _actorUserId: string,
  ): Promise<{
    registrationId: string;
    registrationType: 'AUTHENTICATED' | 'GUEST';
    tournamentId: string;
    status: string;
  }> {
    const RESULT = await this._registerTournamentParticipant.executeSV({
      tournamentId: _tournamentId,
      userId: _actorUserId,
    });

    //? Reintento idempotente: usesCount y la atribución del link solo se
    //? escriben en el alta real, nunca en una reinscripción ya existente.
    if (RESULT.created) {
      await this._inviteLinkRepository.incrementUsesCountSV(_linkId);
      await this._registrationRepository.setInviteLinkIdSV(RESULT.registration.id, _linkId);
    }

    return {
      registrationId: RESULT.registration.id,
      registrationType: 'AUTHENTICATED',
      tournamentId: _tournamentId,
      status: RESULT.registration.status,
    };
  }

  /**
   * REQ-TIL-008: llama directo a `registerGuestForTournamentCoreSV`, nunca a
   * `InviteGuestTournamentParticipantUseCase` (design.md, decisión #1) —
   * evita re-chequear la autoridad del creador del link en el momento del
   * registro, en vez de en el momento en que generó el link.
   */
  private async _registerGuestSV(
    _linkId: string,
    _tournamentId: string,
    _createdByUserId: string,
    _guestInput: { name: string; phone?: string | null; email: string },
  ): Promise<{
    registrationId: string;
    registrationType: 'AUTHENTICATED' | 'GUEST';
    tournamentId: string;
    status: string;
  }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    const REGISTRATION = await registerGuestForTournamentCoreSV(
      {
        tournament: {
          id: TOURNAMENT.id,
          status: TOURNAMENT.status,
          isCompetitive: TOURNAMENT.isCompetitive,
          inscriptionPrice: TOURNAMENT.inscriptionPrice,
          maxSlots: TOURNAMENT.maxSlots,
        },
        guestName: _guestInput.name,
        guestPhone: _guestInput.phone ?? null,
        guestEmail: _guestInput.email,
        registeredByUserId: _createdByUserId,
        inviteLinkId: _linkId,
      },
      this._registrationRepository,
    );

    //? GUEST siempre incrementa: cada alta es una fila nueva, sin idempotencia
    //? (a diferencia de AUTHENTICATED, que reusa el mismo registro en un reintento).
    await this._inviteLinkRepository.incrementUsesCountSV(_linkId);

    return {
      registrationId: REGISTRATION.id,
      registrationType: 'GUEST',
      tournamentId: _tournamentId,
      status: REGISTRATION.status,
    };
  }
}
