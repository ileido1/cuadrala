import { describe, expect, it, vi } from 'vitest';

import { GetCourtAvailabilityUseCase } from '../../application/use_cases/get_court_availability.use_case.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';
import type { VenueRepository } from '../../domain/ports/venue_repository.js';

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

function buildVenueRepo(
  _openingHours: Record<string, { open: string; close: string }> | null = null,
): VenueRepository {
  return {
    findByIdSV: vi.fn(),
    getOpeningHoursSV: vi.fn().mockResolvedValue(_openingHours),
    updateSV: vi.fn(),
    getPaymentInfoSV: vi.fn(),
    listVenuesSV: vi.fn(),
    listVenuesNearSV: vi.fn(),
    listVenuesForUserSV: vi.fn(),
    createVenueSV: vi.fn(),
    getVenueDetailSV: vi.fn(),
    getPaymentInfoWithNameSV: vi.fn(),
  };
}

describe('GetCourtAvailabilityUseCase', () => {
  it('should mark slot unavailable when confirmed reservation exists', async () => {
    const repo = buildRepo();
    vi.mocked(repo.hasConfirmedReservationAtCourtScheduledAtSV).mockResolvedValue(
      true,
    );

    const uc = new GetCourtAvailabilityUseCase(repo, buildVenueRepo(null));
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

  it('should mark slot OUT_OF_OPENING_HOURS when outside opening hours (AC13)', async () => {
    const repo = buildRepo();
    const venueRepo = buildVenueRepo({
      wednesday: { open: '10:00', close: '12:00' },
    });

    const uc = new GetCourtAvailabilityUseCase(repo, venueRepo);
    const FROM = new Date('2026-06-10T09:00:00.000Z');
    const TO = new Date('2026-06-10T12:00:00.000Z');

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
      reason: 'OUT_OF_OPENING_HOURS',
    });
  });

  it('should mark closed day (null hours) as OUT_OF_OPENING_HOURS on sunday (AC18)', async () => {
    const repo = buildRepo();
    const uc = new GetCourtAvailabilityUseCase(repo, buildVenueRepo(null));
    const FROM = new Date('2026-06-07T10:00:00.000Z'); // domingo
    const TO = new Date('2026-06-07T12:00:00.000Z');

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
      reason: 'OUT_OF_OPENING_HOURS',
    });
  });

  it('should prefer OUT_OF_RANGE over OUT_OF_OPENING_HOURS (AC15)', async () => {
    const repo = buildRepo();
    const venueRepo = buildVenueRepo({
      wednesday: { open: '10:00', close: '12:00' },
    });

    const uc = new GetCourtAvailabilityUseCase(repo, venueRepo);
    const FROM = new Date('2026-06-10T09:00:00.000Z');
    const TO = new Date('2026-06-10T09:30:00.000Z');

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
    expect(SLOT?.reason).toBe('OUT_OF_RANGE');
  });

  it('should prefer OUT_OF_OPENING_HOURS over occupancy (AC16)', async () => {
    const repo = buildRepo();
    vi.mocked(repo.hasConfirmedReservationAtCourtScheduledAtSV).mockResolvedValue(
      true,
    );
    const venueRepo = buildVenueRepo({
      wednesday: { open: '10:00', close: '12:00' },
    });

    const uc = new GetCourtAvailabilityUseCase(repo, venueRepo);
    const FROM = new Date('2026-06-10T09:00:00.000Z');
    const TO = new Date('2026-06-10T12:00:00.000Z');

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
    expect(SLOT?.reason).toBe('OUT_OF_OPENING_HOURS');
  });

  it('should call getOpeningHoursSV exactly once per request (AC17)', async () => {
    const repo = buildRepo();
    const venueRepo = buildVenueRepo({
      wednesday: { open: '10:00', close: '12:00' },
    });

    const uc = new GetCourtAvailabilityUseCase(repo, venueRepo);

    await uc.executeSV({
      venueId: VENUE_ID,
      courtId: COURT_ID,
      from: new Date('2026-06-10T09:00:00.000Z'),
      to: new Date('2026-06-10T12:00:00.000Z'),
      durationMinutes: 60,
      stepMinutes: 60,
    });

    expect(venueRepo.getOpeningHoursSV).toHaveBeenCalledTimes(1);
    expect(venueRepo.getOpeningHoursSV).toHaveBeenCalledWith(VENUE_ID);
  });
});
