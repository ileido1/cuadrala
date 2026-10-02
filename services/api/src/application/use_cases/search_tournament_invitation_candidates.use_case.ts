import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentInvitationCandidateDTO, UserRepository } from '../../domain/ports/user_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class SearchTournamentInvitationCandidatesUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _userRepository: UserRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    actorUserId: string;
    query: string;
  }): Promise<TournamentInvitationCandidateDTO[]> {
    const QUERY = _input.query.trim();
    if (QUERY.length < 2 || QUERY.length > 80) {
      throw new AppError('BUSQUEDA_INVALIDA', 'La búsqueda debe tener entre 2 y 80 caracteres.', 400);
    }
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });
    if (this._userRepository.searchTournamentInvitationCandidatesSV === undefined) {
      throw new AppError('BUSQUEDA_NO_DISPONIBLE', 'La búsqueda no está disponible.', 500);
    }
    return this._userRepository.searchTournamentInvitationCandidatesSV(
      _input.tournamentId,
      QUERY,
      20,
    );
  }
}
