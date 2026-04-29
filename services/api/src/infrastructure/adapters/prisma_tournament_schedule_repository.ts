import type { TournamentScheduleDTO, TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import { AppError } from '../../domain/errors/app_error.js';
import { PRISMA } from '../prisma_client.js';

function mapRowSV(_row: {
  id: string;
  tournamentId: string;
  formatCode: string;
  scheduleKey: string;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
}): TournamentScheduleDTO {
  return {
    id: _row.id,
    tournamentId: _row.tournamentId,
    formatCode: _row.formatCode,
    scheduleKey: _row.scheduleKey,
    payload: _row.payload,
    createdAt: _row.createdAt,
    updatedAt: _row.updatedAt,
  };
}

export class PrismaTournamentScheduleRepository implements TournamentScheduleRepository {
  async findByTournamentIdSV(_tournamentId: string): Promise<TournamentScheduleDTO | null> {
    const ROW = await PRISMA.tournamentSchedule.findUnique({
      where: { tournamentId: _tournamentId },
      select: {
        id: true,
        tournamentId: true,
        formatCode: true,
        scheduleKey: true,
        payload: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return ROW === null ? null : mapRowSV(ROW);
  }

  async createOrValidateIdempotencySV(_input: {
    tournamentId: string;
    formatCode: string;
    scheduleKey: string;
    payload: unknown;
  }): Promise<{ created: boolean; schedule: TournamentScheduleDTO }> {
    return await PRISMA.$transaction(async (_tx) => {
      const EXISTING = await _tx.tournamentSchedule.findUnique({
        where: { tournamentId: _input.tournamentId },
        select: {
          id: true,
          tournamentId: true,
          formatCode: true,
          scheduleKey: true,
          payload: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (EXISTING !== null) {
        if (EXISTING.scheduleKey !== _input.scheduleKey) {
          throw new AppError(
            'SCHEDULE_CONFLICT',
            'El calendario ya existe con otros parámetros.',
            409,
          );
        }
        return { created: false, schedule: mapRowSV(EXISTING) };
      }

      const CREATED = await _tx.tournamentSchedule.create({
        data: {
          tournamentId: _input.tournamentId,
          formatCode: _input.formatCode,
          scheduleKey: _input.scheduleKey,
          payload: _input.payload as never,
        },
        select: {
          id: true,
          tournamentId: true,
          formatCode: true,
          scheduleKey: true,
          payload: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { created: true, schedule: mapRowSV(CREATED) };
    });
  }
}

