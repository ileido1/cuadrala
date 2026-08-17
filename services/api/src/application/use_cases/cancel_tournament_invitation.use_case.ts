import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentInvitationRepository } from '../../domain/ports/tournament_invitation_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class CancelTournamentInvitationUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _invitationRepository: TournamentInvitationRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    invitationId: string;
    actorUserId: string;
  }): Promise<void> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 2. Solo el organizador puede cancelar invitaciones (403 si no)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. Cargar la invitación y validar que exista y pertenezca al torneo
    const INVITATION = await this._invitationRepository.findByIdSV(_input.invitationId);
    if (INVITATION === null || INVITATION.tournamentId !== _input.tournamentId) {
      throw new AppError('INVITACION_NO_ENCONTRADA', 'La invitación indicada no existe.', 404);
    }

    //? 4. El roster se bloquea desde IN_PROGRESS; cancelar solo mientras DRAFT/OPEN
    if (TOURNAMENT.status !== 'DRAFT' && TOURNAMENT.status !== 'OPEN') {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite cancelar invitaciones en su estado actual.',
        409,
      );
    }

    await this._invitationRepository.updateStatusSV(_input.invitationId, 'CANCELLED');
  }
}
