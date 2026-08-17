import { AppError } from '../../domain/errors/app_error.js';
import type {
  TournamentInvitationDTO,
  TournamentInvitationRepository,
} from '../../domain/ports/tournament_invitation_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class InviteTournamentParticipantUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _invitationRepository: TournamentInvitationRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    invitedUserId: string;
    actorUserId: string;
  }): Promise<TournamentInvitationDTO> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 2. Validar que el actor tenga autoridad de organizador (403 si no)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. El roster se bloquea desde IN_PROGRESS; invitaciones solo mientras DRAFT/OPEN
    if (TOURNAMENT.status !== 'DRAFT' && TOURNAMENT.status !== 'OPEN') {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite nuevas invitaciones en su estado actual.',
        409,
      );
    }

    //? 4. Rechazar invitación duplicada (invitación activa ya existente para este usuario)
    const EXISTING = await this._invitationRepository.findByTournamentAndUserSV(
      _input.tournamentId,
      _input.invitedUserId,
    );
    if (EXISTING !== null && (EXISTING.status === 'PENDING' || EXISTING.status === 'ACCEPTED')) {
      throw new AppError(
        'INSCRIPCION_DUPLICADA',
        'Este usuario ya tiene una invitación activa para este torneo.',
        409,
      );
    }

    //? 5. Crear la invitación PENDING
    return this._invitationRepository.createSV({
      tournamentId: _input.tournamentId,
      invitedUserId: _input.invitedUserId,
      createdByUserId: _input.actorUserId,
    });
  }
}
