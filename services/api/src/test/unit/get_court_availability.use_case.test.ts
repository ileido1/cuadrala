import { describe, expect, it, vi } from 'vitest';

import { GetCourtAvailabilityUseCase } from '../../application/use_cases/get_court_availability.use_case.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';

const VENUE_ID = '00000000-0000-4000-8000-000000000004';
const COURT_ID = '00000000-0000-4000-8000-000000000003';

function buildRepo(): MatchCourtAvailabilityRepository {
  return {
    listVenueCourtsSV: vi.fn().mockResolvedValue([
      { id: COURT_ID, name: 'Cancha 1', venueId: VENUE_ID },
    ]),
    getCourtVenueIdSV: vi.fn(),
    findPublishedVacantAtCourtScheduledAtSV: vi.fn().mockResolvedValue(null),
    findConflictingActiveMatchIdSV: vi.fn().mockResolvedValue(null),
    hasConfirmedReservationAtCourtScheduledAtSV: vi.fn().mockResolvedValue(false),
  };
}

describe('GetCourtAvailabilityUseCase', () => {
  it('should mark slot unavailable when confirmed reservation exists', async () => {
    const repo = buildRepo();
    vi.mocked(repo.hasConfirmedReservationAtCourtScheduledAtSV).mockResolvedValue(
      true,
    );

    const uc = new GetCourtAvailabilityUseCase(repo);
    const FROM = new Date('2026-06-01T14:00:00.000Z');
    const TO = new Date('2026-06-01T16:00:00.000Z');

    const RESULT = await uc.executeSV({
      venueId: VENUE_ID,
      courtId: COURT_ID,
      from: FROM,
      to: TO,
      durationMinutes: 60,
      stepMinutes: 60,
    });

    const SLOT = RESULT.courts[0]?.slots.find(
      (s) => s.scheduledAt === FROM.toISOString(),
    );
    expect(SLOT).toEqual({
      scheduledAt: FROM.toISOString(),
      isAvailable: false,
      reason: 'OCCUPIED_RESERVATION',
    });
  });
});
