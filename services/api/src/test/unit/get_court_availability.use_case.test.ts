import { describe, expect, it, vi } from 'vitest';

import { GetCourtAvailabilityUseCase } from '../../application/use_cases/get_court_availability.use_case.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';
import type { VenueRepository } from '../../domain/ports/venue_repository.js';

const VENUE_ID = '00000000-0000-4000-8000-000000000004';
//? Reloj fijo anterior a las fechas de los casos: sin el, estos tests
//? dependen del reloj de la maquina y se vuelven rojos con el tiempo.
const BEFORE_CASES = new Date('2026-01-01T00:00:00.000Z');
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
  _timezone: string | null = null,
): VenueRepository {
  return {
    findByIdSV: vi.fn(),
    getOpeningHoursSV: vi.fn().mockResolvedValue(_openingHours),
    getVenueTimezoneSV: vi.fn().mockResolvedValue(_timezone),
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

    const uc = new GetCourtAvailabilityUseCase(repo, buildVenueRepo(null), () => BEFORE_CASES);
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

    const uc = new GetCourtAvailabilityUseCase(repo, venueRepo, () => BEFORE_CASES);
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
    const uc = new GetCourtAvailabilityUseCase(repo, buildVenueRepo(null), () => BEFORE_CASES);
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

    const uc = new GetCourtAvailabilityUseCase(repo, venueRepo, () => BEFORE_CASES);
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

    const uc = new GetCourtAvailabilityUseCase(repo, venueRepo, () => BEFORE_CASES);
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

    const uc = new GetCourtAvailabilityUseCase(repo, venueRepo, () => BEFORE_CASES);

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

  //? Un slot que ya pasó no es reservable. Quién decide "ya pasó" es el
  //? servidor, porque es el único que conoce la zona horaria de la sede: el
  //? cliente solo sabe la hora del dispositivo, que puede estar en otro huso.
  describe('slots pasados (PAST)', () => {
    const THURSDAY_HOURS = { thursday: { open: '06:00', close: '23:00' } };
    // 01:32Z del 4 de septiembre = 21:32 del 3 en Caracas.
    const NOW = new Date('2026-09-04T01:32:00.000Z');
    const FROM = new Date('2026-09-03T20:00:00.000Z');
    const TO = new Date('2026-09-03T23:00:00.000Z');

    async function runSV(_timezone: string | null) {
      const REPO = buildRepo();
      const VENUE_REPO = buildVenueRepo(THURSDAY_HOURS, _timezone);
      const UC = new GetCourtAvailabilityUseCase(REPO, VENUE_REPO, () => NOW);
      const RESULT = await UC.executeSV({
        venueId: VENUE_ID,
        courtId: COURT_ID,
        from: FROM,
        to: TO,
        durationMinutes: 60,
        stepMinutes: 60,
      });
      return RESULT.courts[0]?.slots ?? [];
    }

    it('marca PAST los slots anteriores a la hora de la sede', async () => {
      const SLOTS = await runSV('America/Caracas');

      // 20:00 y 21:00 ya pasaron a las 21:32; 22:00 todavía no.
      expect(SLOTS.find((s) => s.scheduledAt === '2026-09-03T20:00:00.000Z')).toEqual({
        scheduledAt: '2026-09-03T20:00:00.000Z',
        isAvailable: false,
        reason: 'PAST',
      });
      expect(SLOTS.find((s) => s.scheduledAt === '2026-09-03T21:00:00.000Z')).toEqual({
        scheduledAt: '2026-09-03T21:00:00.000Z',
        isAvailable: false,
        reason: 'PAST',
      });
      expect(SLOTS.find((s) => s.scheduledAt === '2026-09-03T22:00:00.000Z')).toEqual({
        scheduledAt: '2026-09-03T22:00:00.000Z',
        isAvailable: true,
      });
    });

    it('usa la zona de la sede, no la del servidor', async () => {
      // En Tokio (UTC+9) el mismo instante es las 10:32 del 4: para esa sede
      // los slots del 3 a la noche pasaron hace rato, pero el corte cae en
      // otro lado. Basta con que el resultado difiera del de Caracas.
      const TOKYO = await runSV('Asia/Tokyo');

      expect(TOKYO.find((s) => s.scheduledAt === '2026-09-03T22:00:00.000Z')).toEqual({
        scheduledAt: '2026-09-03T22:00:00.000Z',
        isAvailable: false,
        reason: 'PAST',
      });
    });

    it('cae en America/Caracas cuando la sede no configuró zona', async () => {
      const SLOTS = await runSV(null);

      expect(SLOTS.find((s) => s.scheduledAt === '2026-09-03T22:00:00.000Z')).toEqual({
        scheduledAt: '2026-09-03T22:00:00.000Z',
        isAvailable: true,
      });
    });

    it('PAST gana sobre la ocupación: ya pasó, da igual quién lo tenía', async () => {
      const REPO = buildRepo();
      vi.mocked(REPO.hasConfirmedReservationAtCourtScheduledAtSV).mockResolvedValue(true);
      const UC = new GetCourtAvailabilityUseCase(
        REPO,
        buildVenueRepo(THURSDAY_HOURS, 'America/Caracas'),
        () => NOW,
      );

      const RESULT = await UC.executeSV({
        venueId: VENUE_ID,
        courtId: COURT_ID,
        from: FROM,
        to: TO,
        durationMinutes: 60,
        stepMinutes: 60,
      });

      const SLOT = RESULT.courts[0]?.slots.find(
        (s) => s.scheduledAt === '2026-09-03T20:00:00.000Z',
      );
      expect(SLOT?.reason).toBe('PAST');
    });

    it('consulta la zona una sola vez por request', async () => {
      const REPO = buildRepo();
      const VENUE_REPO = buildVenueRepo(THURSDAY_HOURS, 'America/Caracas');
      const UC = new GetCourtAvailabilityUseCase(REPO, VENUE_REPO, () => NOW);

      await UC.executeSV({
        venueId: VENUE_ID,
        courtId: COURT_ID,
        from: FROM,
        to: TO,
        durationMinutes: 60,
        stepMinutes: 60,
      });

      expect(VENUE_REPO.getVenueTimezoneSV).toHaveBeenCalledTimes(1);
      expect(VENUE_REPO.getVenueTimezoneSV).toHaveBeenCalledWith(VENUE_ID);
    });
  });
});
