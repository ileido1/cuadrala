import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRepository, TournamentVisibility } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class UpdateTournamentVisibilityUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    visibility: TournamentVisibility;
    actorUserId: string;
  }): Promise<{ id: string; name: string; visibility: TournamentVisibility }> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('NO_ENCONTRADO', 'Torneo no encontrado.', 404);
    }

    //? 2. Solo el organizador puede cambiar la visibilidad (403 si no)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. Actualizar visibilidad
    const UPDATED = await this._tournamentRepository.updateVisibilitySV(
      _input.tournamentId,
      _input.visibility,
    );

    if (UPDATED === null) {
      throw new AppError('NO_ENCONTRADO', 'Torneo no encontrado.', 404);
    }

    return UPDATED;
  }
}