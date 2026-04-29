import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';

export class GetTournamentScheduleUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _tournamentScheduleRepository: TournamentScheduleRepository,
  ) {}

  async executeSV(_tournamentId: string): Promise<{
    tournamentId: string;
    formatCode: string;
    scheduleKey: string;
    payload: unknown;
  }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    const SCHEDULE = await this._tournamentScheduleRepository.findByTournamentIdSV(_tournamentId);
    if (SCHEDULE === null) {
      throw new AppError('SCHEDULE_NO_ENCONTRADO', 'El calendario aún no ha sido generado.', 404);
    }

    return {
      tournamentId: SCHEDULE.tournamentId,
      formatCode: SCHEDULE.formatCode,
      scheduleKey: SCHEDULE.scheduleKey,
      payload: SCHEDULE.payload,
    };
  }
}

