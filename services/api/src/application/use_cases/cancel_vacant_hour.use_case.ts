import { AppError } from '../../domain/errors/app_error.js';
import type { MatchStatusRepository } from '../../domain/ports/match_status_repository.js';
import type { VacantHourDTO, VacantHourRepository } from '../../domain/ports/vacant_hour_repository.js';

export class CancelVacantHourUseCase {
  constructor(
    private readonly _vacantHourRepository: VacantHourRepository,
    private readonly _matchStatusRepository: MatchStatusRepository,
  ) {}

  async executeSV(_vacantHourId: string): Promise<{ vacantHour: VacantHourDTO; matchCancelled: boolean }> {
    const CURRENT = await this._vacantHourRepository.findByIdSV(_vacantHourId);
    if (CURRENT === null) {
      throw new AppError('RECURSO_NO_ENCONTRADO', 'La vacante indicada no existe.', 404);
    }

    let matchCancelled = false;
    if (CURRENT.matchId !== null) {
      matchCancelled = await this._matchStatusRepository.transitionStatusIfCurrentSV({
        matchId: CURRENT.matchId,
        fromStatus: 'SCHEDULED',
        toStatus: 'CANCELLED',
      });
    }

    if (CURRENT.status === 'CANCELLED') {
      return { vacantHour: CURRENT, matchCancelled };
    }

    const UPDATED = await this._vacantHourRepository.cancelVacantHourSV(_vacantHourId);
    return { vacantHour: UPDATED, matchCancelled };
  }
}

