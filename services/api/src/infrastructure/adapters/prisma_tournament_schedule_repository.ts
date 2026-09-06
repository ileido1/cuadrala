import type { TournamentScheduleDTO, TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import { AppError } from '../../domain/errors/app_error.js';
import { PRISMA } from '../prisma_client.js';

/**
 * `slotPlan` se guarda como JSON, asi que las fechas vuelven como texto.
 * Se rehidratan aca para que el resto del sistema vea `Date` y no strings.
 */
function mapSlotPlanSV(_raw: unknown): TournamentScheduleDTO['slotPlan'] {
  if (!Array.isArray(_raw)) return null;
  const PLAN: NonNullable<TournamentScheduleDTO['slotPlan']> = [];
  for (const ITEM of _raw) {
    if (typeof ITEM !== 'object' || ITEM === null) continue;
    const I = ITEM as Record<string, unknown>;
    if (
      typeof I.roundNumber !== 'number' ||
      typeof I.matchNumber !== 'number' ||
      typeof I.courtId !== 'string' ||
      typeof I.scheduledAt !== 'string'
    ) {
      continue;
    }
    PLAN.push({
      roundNumber: I.roundNumber,
      matchNumber: I.matchNumber,
      courtId: I.courtId,
      scheduledAt: new Date(I.scheduledAt),
    });
  }
  return PLAN.length === 0 ? null : PLAN;
}

function mapRowSV(_row: {
  id: string;
  tournamentId: string;
  formatCode: string;
  scheduleKey: string;
  payload: unknown;
  slotPlan?: unknown;
  createdAt: Date;
  updatedAt: Date;
}): TournamentScheduleDTO {
  return {
    id: _row.id,
    tournamentId: _row.tournamentId,
    formatCode: _row.formatCode,
    scheduleKey: _row.scheduleKey,
    payload: _row.payload,
    slotPlan: mapSlotPlanSV(_row.slotPlan),
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
        slotPlan: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return ROW === null ? null : mapRowSV(ROW);
  }

  async saveSlotPlanSV(_input: {
    tournamentId: string;
    slotPlan: Array<{
      roundNumber: number;
      matchNumber: number;
      courtId: string;
      scheduledAt: Date;
    }>;
  }): Promise<void> {
    await PRISMA.tournamentSchedule.update({
      where: { tournamentId: _input.tournamentId },
      data: {
        slotPlan: _input.slotPlan.map((_s) => ({
          roundNumber: _s.roundNumber,
          matchNumber: _s.matchNumber,
          courtId: _s.courtId,
          scheduledAt: _s.scheduledAt.toISOString(),
        })),
      },
    });
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

