import type {
  TournamentAmericanoScheduleDTO,
  TournamentAmericanoScheduleRepository,
} from '../../domain/ports/tournament_americano_schedule_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaTournamentAmericanoScheduleRepository implements TournamentAmericanoScheduleRepository {
  async findByTournamentIdSV(_tournamentId: string): Promise<TournamentAmericanoScheduleDTO | null> {
    const ROW = await PRISMA.tournamentAmericanoSchedule.findUnique({
      where: { tournamentId: _tournamentId },
      select: { tournamentId: true, scheduleKey: true, schedule: true },
    });
    return ROW;
  }

  async createForTournamentSV(_data: {
    tournamentId: string;
    scheduleKey: string;
    schedule: unknown;
  }): Promise<TournamentAmericanoScheduleDTO> {
    return PRISMA.tournamentAmericanoSchedule.create({
      data: {
        tournamentId: _data.tournamentId,
        scheduleKey: _data.scheduleKey,
        schedule: _data.schedule as never,
      },
      select: { tournamentId: true, scheduleKey: true, schedule: true },
    });
  }
}
