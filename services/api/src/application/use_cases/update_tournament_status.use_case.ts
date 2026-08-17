import { AppError } from '../../domain/errors/app_error.js';
import { assertTournamentTransitionSV } from '../../domain/tournament/tournament_status_machine.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';
import type { MaterializeTournamentMatchesUseCase } from './materialize_tournament_matches.use_case.js';

export class UpdateTournamentStatusUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    private readonly _materializeTournamentMatches: MaterializeTournamentMatchesUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    status: string;
    actorUserId: string;
  }): Promise<{ id: string; name: string; status: string }> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('NO_ENCONTRADO', 'Torneo no encontrado.', 404);
    }

    //? 2. Validar que el actor tenga autoridad de organizador (403 si no)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. Validar que la transición de estado sea legal (409 si no)
    assertTournamentTransitionSV(TOURNAMENT.status, _input.status);

    //? 4. OPEN→IN_PROGRESS materializa los partidos del calendario (idempotente, transaccional)
    if (_input.status === 'IN_PROGRESS') {
      return this._materializeTournamentMatches.executeSV({
        tournamentId: _input.tournamentId,
        toStatus: _input.status,
        sportId: TOURNAMENT.sportId,
        categoryId: TOURNAMENT.categoryId,
        // Fallback: torneos sin organizerUserId asignado (venue-staff-only) usan al actor
        // que ejecuta la transición como dueño de los Match creados (Design Decisión 1:
        // Match.organizerUserId es NOT NULL).
        organizerUserId: TOURNAMENT.organizerUserId ?? _input.actorUserId,
        startsAt: TOURNAMENT.startsAt,
      });
    }

    //? 5. Cualquier otra transición legal solo actualiza el estado
    const UPDATED = await this._tournamentRepository.updateStatusSV(
      _input.tournamentId,
      _input.status,
    );

    if (UPDATED === null) {
      throw new AppError('NO_ENCONTRADO', 'Torneo no encontrado.', 404);
    }

    return UPDATED;
  }
}
