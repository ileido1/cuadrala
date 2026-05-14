import type {
  CourtSummaryDTO,
  MatchCourtAvailabilityRepository,
  PublishedVacantSlotInfoDTO,
} from '../../domain/ports/match_court_availability_repository.js';

import { PRISMA } from '../prisma_client.js';

const DEFAULT_BLOCK_MINUTES = 90;

function intervalEndMs(_start: Date, _durationMinutes: number): number {
  return _start.getTime() + _durationMinutes * 60_000;
}

function intervalsOverlapMs(
  _aStart: Date,
  _aDurationMin: number,
  _bStart: Date,
  _bDurationMin: number,
): boolean {
  const A_END = intervalEndMs(_aStart, _aDurationMin);
  const B_END = intervalEndMs(_bStart, _bDurationMin);
  return _aStart.getTime() < B_END && _bStart.getTime() < A_END;
}

export class PrismaMatchCourtAvailabilityRepository implements MatchCourtAvailabilityRepository {
  async listVenueCourtsSV(_venueId: string): Promise<CourtSummaryDTO[]> {
    const ROWS = await PRISMA.court.findMany({
      where: { venueId: _venueId },
      orderBy: [{ createdAt: 'desc' }],
      select: { id: true, venueId: true, name: true },
    });
    return ROWS;
  }

  async getCourtVenueIdSV(_courtId: string): Promise<string | null> {
    const ROW = await PRISMA.court.findUnique({
      where: { id: _courtId },
      select: { venueId: true },
    });
    return ROW?.venueId ?? null;
  }

  async findPublishedVacantAtCourtScheduledAtSV(
    _courtId: string,
    _scheduledAt: Date,
  ): Promise<PublishedVacantSlotInfoDTO | null> {
    // Busca Reservation tipo MATCH publicada (reemplaza VacantHour)
    const ROW = await PRISMA.reservation.findFirst({
      where: {
        courtId: _courtId,
        scheduledAt: _scheduledAt,
        type: 'MATCH',
        visibility: 'PUBLISHED',
      },
      select: { sportId: true, categoryId: true },
    });
    if (ROW === null) return null;
    return { sportId: ROW.sportId, categoryId: ROW.categoryId };
  }

  async findConflictingActiveMatchIdSV(_params: {
    courtId: string;
    scheduledAt: Date;
    durationMinutes: number;
    excludeMatchId?: string;
  }): Promise<string | null> {
    const SLOT_END = intervalEndMs(_params.scheduledAt, _params.durationMinutes);
    const WINDOW_START = new Date(_params.scheduledAt.getTime() - 24 * 60 * 60_000);
    const WINDOW_END = new Date(SLOT_END);

    const ROWS = await PRISMA.match.findMany({
      where: {
        courtId: _params.courtId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledAt: { not: null, gte: WINDOW_START, lte: WINDOW_END },
        ...(_params.excludeMatchId !== undefined ? { id: { not: _params.excludeMatchId } } : {}),
      },
      select: { id: true, scheduledAt: true },
    });

    for (const R of ROWS) {
      if (R.scheduledAt === null) continue;
      if (
        intervalsOverlapMs(
          _params.scheduledAt,
          _params.durationMinutes,
          R.scheduledAt,
          DEFAULT_BLOCK_MINUTES,
        )
      ) {
        return R.id;
      }
    }

    return null;
  }
}
