import { AppError } from '../../domain/errors/app_error.js';
import type {
  TournamentInviteLinkRepository,
  TournamentInviteLinkWithRegistrantsDTO,
} from '../../domain/ports/tournament_invite_link_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class ListTournamentInviteLinksUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _inviteLinkRepository: TournamentInviteLinkRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    actorUserId: string;
  }): Promise<TournamentInviteLinkWithRegistrantsDTO[]> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 2. Solo el organizador o staff de su sede puede listar los links (REQ-TIL-006)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. El repositorio ya devuelve el DTO sin token/tokenHash (REQ-TIL-002)
    return this._inviteLinkRepository.listByTournamentIdWithRegistrantsSV(TOURNAMENT.id);
  }
}
