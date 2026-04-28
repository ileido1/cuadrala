import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentAmericanoScheduleRepository } from '../../domain/ports/tournament_americano_schedule_repository.js';

export class GetTournamentAmericanoScheduleUseCase {
  constructor(private readonly _scheduleRepository: TournamentAmericanoScheduleRepository) {}

  async executeSV(_tournamentId: string): Promise<{
    tournamentId: string;
    scheduleKey: string;
    schedule: unknown;
  }> {
    const EXISTING = await this._scheduleRepository.findByTournamentIdSV(_tournamentId);
    if (EXISTING === null) {
      throw new AppError('SCHEDULE_NO_ENCONTRADO', 'El calendario aún no ha sido generado.', 404);
    }
    return {
      tournamentId: EXISTING.tournamentId,
      scheduleKey: EXISTING.scheduleKey,
      schedule: EXISTING.schedule,
    };
  }
}

