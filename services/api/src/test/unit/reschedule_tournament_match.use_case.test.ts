import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RescheduleTournamentMatchUseCase } from '../../application/use_cases/reschedule_tournament_match.use_case.js';

const tournamentRepo = { findByIdSV: vi.fn() };
const scheduleRepo = { findByTournamentIdSV: vi.fn(), saveSlotPlanSV: vi.fn() };
const assertOrganizer = { executeSV: vi.fn() };
const holdLifecycle = { confirmHoldSV: vi.fn(), releaseHoldSV: vi.fn() };
const holdRepo = { holdSlotsSV: vi.fn() };
const responseRepo = { upsertSV: vi.fn(), listByMatchSV: vi.fn(), deleteByMatchSV: vi.fn() };

const useCase = new RescheduleTournamentMatchUseCase(
  tournamentRepo as never,
  scheduleRepo as never,
  assertOrganizer as never,
  holdLifecycle as never,
  holdRepo as never,
  responseRepo as never,
);

const OLD_AT = new Date('2026-10-01T14:00:00.000Z');
const NEW_AT = new Date('2026-10-02T18:00:00.000Z');

const BASE = {
  tournamentId: 't-1',
  roundNumber: 1,
  matchNumber: 1,
  courtId: 'court-b',
  scheduledAt: NEW_AT,
  actorUserId: 'organizer-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  tournamentRepo.findByIdSV.mockResolvedValue({
    id: 't-1',
    sportId: 'sport-1',
    categoryId: 'cat-1',
    organizerUserId: 'organizer-1',
    venueId: 'venue-1',
  });
  scheduleRepo.findByTournamentIdSV.mockResolvedValue({
    slotPlan: [
      { roundNumber: 1, matchNumber: 1, courtId: 'court-a', scheduledAt: OLD_AT },
      { roundNumber: 1, matchNumber: 2, courtId: 'court-b', scheduledAt: OLD_AT },
    ],
  });
  scheduleRepo.saveSlotPlanSV.mockResolvedValue(undefined);
  assertOrganizer.executeSV.mockResolvedValue(undefined);
  holdLifecycle.releaseHoldSV.mockResolvedValue(true);
  holdRepo.holdSlotsSV.mockImplementation(async (_i: { slots: unknown[] }) => ({
    heldSlots: _i.slots,
    lostSlots: [],
  }));
  responseRepo.deleteByMatchSV.mockResolvedValue(undefined);
});

describe('RescheduleTournamentMatchUseCase', () => {
  it('should hold the new slot and release the old one', async () => {
    const RESULT = await useCase.executeSV(BASE);

    expect(RESULT.moved).toBe(true);
    expect(holdRepo.holdSlotsSV).toHaveBeenCalled();
    expect(holdLifecycle.releaseHoldSV).toHaveBeenCalledWith({
      courtId: 'court-a',
      scheduledAt: OLD_AT,
    });
  });

  //? Lo que contestaron era sobre el horario viejo: dejar esas respuestas
  //? comprometeria a quien acepto el martes con un partido que ahora es jueves.
  it('should wipe the answers, because they were about the old time', async () => {
    await useCase.executeSV(BASE);

    expect(responseRepo.deleteByMatchSV).toHaveBeenCalledWith({
      tournamentId: 't-1',
      roundNumber: 1,
      matchNumber: 1,
    });
  });

  it('should keep the other matches of the plan untouched', async () => {
    await useCase.executeSV(BASE);

    const SAVED = scheduleRepo.saveSlotPlanSV.mock.calls[0]?.[0];
    expect(SAVED.slotPlan).toHaveLength(2);
    expect(SAVED.slotPlan).toContainEqual({
      roundNumber: 1,
      matchNumber: 2,
      courtId: 'court-b',
      scheduledAt: OLD_AT,
    });
    expect(SAVED.slotPlan).toContainEqual({
      roundNumber: 1,
      matchNumber: 1,
      courtId: 'court-b',
      scheduledAt: NEW_AT,
    });
  });

  //? Si la cancha destino ya estaba tomada, el partido se queda donde estaba en
  //? vez de perder los dos turnos y quedar sin horario.
  it('should not release the old slot when the new one is taken', async () => {
    holdRepo.holdSlotsSV.mockResolvedValue({ heldSlots: [], lostSlots: [{}] });

    await expect(useCase.executeSV(BASE)).rejects.toThrow(
      'Ese horario ya está tomado en esa cancha.',
    );

    expect(holdLifecycle.releaseHoldSV).not.toHaveBeenCalled();
    expect(scheduleRepo.saveSlotPlanSV).not.toHaveBeenCalled();
  });

  it('should refuse anybody who is not the organizer', async () => {
    assertOrganizer.executeSV.mockRejectedValue(new Error('403'));

    await expect(useCase.executeSV(BASE)).rejects.toThrow();
    expect(holdRepo.holdSlotsSV).not.toHaveBeenCalled();
  });

  //? Un partido que nunca tuvo turno (la sede no daba) tambien se puede ubicar.
  it('should place a match that never had a slot', async () => {
    scheduleRepo.findByTournamentIdSV.mockResolvedValue({ slotPlan: [] });

    const RESULT = await useCase.executeSV(BASE);

    expect(RESULT.moved).toBe(true);
    expect(holdLifecycle.releaseHoldSV).not.toHaveBeenCalled();
  });

  it('should refuse a tournament with no venue', async () => {
    tournamentRepo.findByIdSV.mockResolvedValue({
      id: 't-1',
      sportId: 'sport-1',
      categoryId: 'cat-1',
      organizerUserId: 'organizer-1',
      venueId: null,
    });

    await expect(useCase.executeSV(BASE)).rejects.toThrow(
      'El torneo no tiene sede, así que no hay canchas para asignar.',
    );
  });
});
