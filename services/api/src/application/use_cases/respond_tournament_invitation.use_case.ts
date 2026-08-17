import { AppError } from '../../domain/errors/app_error.js';
import type {
  TournamentInvitationDTO,
  TournamentInvitationRepository,
} from '../../domain/ports/tournament_invitation_repository.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';

export class RespondTournamentInvitationUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _invitationRepository: TournamentInvitationRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
  ) {}

  async executeSV(_input: {
    invitationId: string;
    actorUserId: string;
    action: 'ACCEPT' | 'REJECT';
  }): Promise<TournamentInvitationDTO> {
    //? 1. Cargar la invitación y validar que exista
    const INVITATION = await this._invitationRepository.findByIdSV(_input.invitationId);
    if (INVITATION === null) {
      throw new AppError('INVITACION_NO_ENCONTRADA', 'La invitación indicada no existe.', 404);
    }

    //? 2. Solo el usuario invitado puede responder (403 si no)
    if (INVITATION.invitedUserId !== _input.actorUserId) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No tienes permisos para responder esta invitación.',
        403,
      );
    }

    //? 3. Solo se puede responder una invitación en estado PENDING
    if (INVITATION.status !== 'PENDING') {
      throw new AppError('ESTADO_INVALIDO', 'Esta invitación ya fue respondida.', 409);
    }

    //? 4. Cargar el torneo y validar que el roster no esté bloqueado (IN_PROGRESS+)
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(INVITATION.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }
    if (TOURNAMENT.status !== 'DRAFT' && TOURNAMENT.status !== 'OPEN') {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite respuestas a invitaciones en su estado actual.',
        409,
      );
    }

    //? 5. Aplicar la acción: aceptar confirma el registro; rechazar solo actualiza la invitación
    if (_input.action === 'ACCEPT') {
      await this._registrationRepository.upsertSV({
        tournamentId: INVITATION.tournamentId,
        userId: INVITATION.invitedUserId,
        status: 'CONFIRMED',
      });
      const UPDATED = await this._invitationRepository.updateStatusSV(_input.invitationId, 'ACCEPTED');
      if (UPDATED === null) {
        throw new AppError('INVITACION_NO_ENCONTRADA', 'La invitación indicada no existe.', 404);
      }
      return UPDATED;
    }

    const UPDATED = await this._invitationRepository.updateStatusSV(_input.invitationId, 'REJECTED');
    if (UPDATED === null) {
      throw new AppError('INVITACION_NO_ENCONTRADA', 'La invitación indicada no existe.', 404);
    }
    return UPDATED;
  }
}
