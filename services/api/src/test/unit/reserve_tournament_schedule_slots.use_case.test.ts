import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReserveTournamentScheduleSlotsUseCase } from '../../application/use_cases/reserve_tournament_schedule_slots.use_case.js';

const courtRepo = {
  listVenueCourtsSV: vi.fn(),
  listLiveReservationSlotsSV: vi.fn(),
};
const holdRepo = { holdSlotsSV: vi.fn() };

const useCase = new ReserveTournamentScheduleSlotsUseCase(
  courtRepo as never,
  holdRepo as never,
);

const START = new Date('2026-10-01T14:00:00.000Z');

const BASE = {
  tournamentId: 't-1',
  venueId: 'venue-1',
  sportId: 'sport-1',
  categoryId: 'cat-1',
  organizerUserId: 'organizer-1',
  startsAt: START,
  plans: [
    { roundNumber: 1, matchNumber: 1 },
    { roundNumber: 1, matchNumber: 2 },
  ],
  now: new Date('2026-09-05T00:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  courtRepo.listVenueCourtsSV.mockResolvedValue([{ id: 'court-a' }, { id: 'court-b' }]);
  courtRepo.listLiveReservationSlotsSV.mockResolvedValue([]);
  holdRepo.holdSlotsSV.mockImplementation(async (_i: { slots: unknown[] }) => ({
    heldSlots: _i.slots,
    lostSlots: [],
  }));
});

describe('ReserveTournamentScheduleSlotsUseCase', () => {
  it('should hold a court and a time for every match', async () => {
    const RESULT = await useCase.executeSV(BASE);

    expect(RESULT.slots).toHaveLength(2);
    expect(RESULT.unplaced).toEqual([]);
    expect(holdRepo.holdSlotsSV).toHaveBeenCalledTimes(1);
  });

  it('should hold the slots with an expiry so they release themselves', async () => {
    await useCase.executeSV(BASE);

    const ARG = holdRepo.holdSlotsSV.mock.calls[0]?.[0];
    expect(ARG.holdExpiresAt.getTime()).toBeGreaterThan(BASE.now.getTime());
  });

  //? La sede vende las mismas canchas: el torneo no puede pisar una reserva.
  it('should plan around the slots the venue already sold', async () => {
    courtRepo.listLiveReservationSlotsSV.mockResolvedValue([
      { courtId: 'court-a', scheduledAt: START },
    ]);

    const RESULT = await useCase.executeSV(BASE);

    const USED = RESULT.slots.map((_s) => `${_s.courtId}|${_s.scheduledAt.toISOString()}`);
    expect(USED).not.toContain(`court-a|${START.toISOString()}`);
  });

  //? Un torneo a medio planificar es informacion util para el organizador; un
  //? error que tira abajo la generacion del cuadro no lo es.
  it('should report matches without a slot instead of failing', async () => {
    courtRepo.listVenueCourtsSV.mockResolvedValue([]);

    const RESULT = await useCase.executeSV(BASE);

    expect(RESULT.slots).toEqual([]);
    expect(RESULT.unplaced).toHaveLength(2);
    expect(holdRepo.holdSlotsSV).not.toHaveBeenCalled();
  });

  it('should not try to plan a tournament with no venue', async () => {
    const RESULT = await useCase.executeSV({ ...BASE, venueId: null });

    expect(RESULT.unplaced).toHaveLength(2);
    expect(courtRepo.listVenueCourtsSV).not.toHaveBeenCalled();
  });

  it('should not try to plan a tournament with no start date', async () => {
    const RESULT = await useCase.executeSV({ ...BASE, startsAt: null });

    expect(RESULT.unplaced).toHaveLength(2);
    expect(courtRepo.listVenueCourtsSV).not.toHaveBeenCalled();
  });

  //? Entre leer la agenda y escribir, otra reserva puede ganar el turno. El
  //? indice parcial de la base es el arbitro, no la lectura previa.
  it('should report the slots it lost to a concurrent booking', async () => {
    holdRepo.holdSlotsSV.mockImplementation(
      async (_i: { slots: Array<Record<string, unknown>> }) => ({
        heldSlots: [_i.slots[0]],
        lostSlots: [_i.slots[1]],
      }),
    );

    const RESULT = await useCase.executeSV(BASE);

    expect(RESULT.slots).toHaveLength(1);
    expect(RESULT.unplaced).toEqual([{ roundNumber: 1, matchNumber: 2 }]);
  });
});
