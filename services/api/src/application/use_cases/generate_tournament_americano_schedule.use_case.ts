import { AppError } from '../../domain/errors/app_error.js';
import {
  buildAmericanoScheduleKeySV,
  generateAmericanoScheduleSV,
} from '../../domain/americano/americano_schedule_generator.js';
import type { TournamentAmericanoScheduleRepository } from '../../domain/ports/tournament_americano_schedule_repository.js';

export class GenerateTournamentAmericanoScheduleUseCase {
  constructor(private readonly _scheduleRepository: TournamentAmericanoScheduleRepository) {}

  async executeSV(_input: {
    tournamentId: string;
    participantUserIds: string[];
  }): Promise<{ tournamentId: string; scheduleKey: string; schedule: unknown }> {
    const KEY = buildAmericanoScheduleKeySV(_input.participantUserIds);

    const EXISTING = await this._scheduleRepository.findByTournamentIdSV(_input.tournamentId);
    if (EXISTING !== null) {
      if (EXISTING.scheduleKey === KEY) {
        return {
          tournamentId: EXISTING.tournamentId,
          scheduleKey: EXISTING.scheduleKey,
          schedule: EXISTING.schedule,
        };
      }
      throw new AppError(
        'SCHEDULE_YA_GENERADO',
        'El calendario ya fue generado con un conjunto distinto de participantes.',
        409,
      );
    }

    let SCHEDULE;
    try {
      SCHEDULE = generateAmericanoScheduleSV(_input.participantUserIds);
    } catch (_error) {
      if (_error instanceof Error && /al menos 4/i.test(_error.message)) {
        throw new AppError('PARTICIPANTES_INSUFICIENTES', 'Se requieren al menos 4 participantes.', 400);
      }
      if (_error instanceof Error && /m[úu]ltiplo de 4/i.test(_error.message)) {
        throw new AppError(
          'PARTICIPANTES_INVALIDOS',
          'La cantidad de participantes debe ser múltiplo de 4.',
          400,
        );
      }
      if (_error instanceof Error && /duplicad/i.test(_error.message)) {
        throw new AppError('PARTICIPANTES_INVALIDOS', 'No se permiten IDs duplicados.', 400);
      }
      throw _error;
    }

    const CREATED = await this._scheduleRepository.createForTournamentSV({
      tournamentId: _input.tournamentId,
      scheduleKey: KEY,
      schedule: SCHEDULE,
    });

    return {
      tournamentId: CREATED.tournamentId,
      scheduleKey: CREATED.scheduleKey,
      schedule: CREATED.schedule,
    };
  }
}

