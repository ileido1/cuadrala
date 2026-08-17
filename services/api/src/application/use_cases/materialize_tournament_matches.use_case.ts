import { AppError } from '../../domain/errors/app_error.js';
import { buildMaterializedMatchPlansSV } from '../../domain/tournament/tournament_match_materialization.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import type { TournamentMatchMaterializationRepository } from '../../domain/ports/tournament_match_materialization_repository.js';

export class MaterializeTournamentMatchesUseCase {
  constructor(
    private readonly _tournamentScheduleRepository: TournamentScheduleRepository,
    private readonly _tournamentMatchMaterializationRepository: TournamentMatchMaterializationRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    toStatus: string;
    sportId: string;
    categoryId: string;
    organizerUserId: string;
    startsAt: Date | null;
  }): Promise<{ id: string; name: string; status: string }> {
    //? 1. El calendario debe existir para poder materializar los partidos (spec R3)
    const SCHEDULE = await this._tournamentScheduleRepository.findByTournamentIdSV(_input.tournamentId);
    if (SCHEDULE === null) {
      throw new AppError(
        'CALENDARIO_NO_GENERADO',
        'El torneo no tiene un calendario generado; genera el calendario antes de iniciar el torneo.',
        400,
      );
    }

    //? 2. Mapear el payload del calendario a planes de partido (dominio puro)
    const PLANS = buildMaterializedMatchPlansSV({
      formatCode: SCHEDULE.formatCode,
      payload: SCHEDULE.payload,
    }).map((_plan) => ({
      ..._plan,
      // Sin plan de horario/canchas persistido aún (ver Design §12 open question):
      // se usa el fallback documentado — scheduledAt = Tournament.startsAt, courtId = null.
      scheduledAt: _input.startsAt,
      courtId: null,
    }));

    const MATCH_TYPE: 'AMERICANO' | 'REGULAR' = SCHEDULE.formatCode === 'AMERICANO' ? 'AMERICANO' : 'REGULAR';

    //? 3. Transición de estado + materialización en una sola transacción, idempotente por scheduleKey
    const RESULT = await this._tournamentMatchMaterializationRepository.transitionAndMaterializeSV({
      tournamentId: _input.tournamentId,
      toStatus: _input.toStatus,
      scheduleKey: SCHEDULE.scheduleKey,
      sportId: _input.sportId,
      categoryId: _input.categoryId,
      organizerUserId: _input.organizerUserId,
      matchType: MATCH_TYPE,
      matches: PLANS,
    });

    return RESULT.tournament;
  }
}
