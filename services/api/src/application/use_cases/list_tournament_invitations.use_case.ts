import { AppError } from '../../domain/errors/app_error.js';
import type {
  TournamentInvitationDTO,
  TournamentInvitationRepository,
} from '../../domain/ports/tournament_invitation_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class ListTournamentInvitationsUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _invitationRepository: TournamentInvitationRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    actorUserId: string;
  }): Promise<TournamentInvitationDTO[]> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 2. Solo el organizador puede listar las invitaciones (403 si no)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    return this._invitationRepository.listByTournamentIdSV(_input.tournamentId);
  }
}
