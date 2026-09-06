import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettleTournamentSlotAsOrganizerUseCase } from '../../application/use_cases/settle_tournament_slot_as_organizer.use_case.js';

const tournamentRepo = { findByIdSV: vi.fn() };
const scheduleRepo = { findByTournamentIdSV: vi.fn() };
const assertOrganizer = { executeSV: vi.fn() };
const holdRepo = { confirmHoldSV: vi.fn(), releaseHoldSV: vi.fn() };

const useCase = new SettleTournamentSlotAsOrganizerUseCase(
  tournamentRepo as never,
  scheduleRepo as never,
  assertOrganizer as never,
  holdRepo as never,
);

const SLOT_AT = new Date('2026-10-01T14:00:00.000Z');

const BASE = {
  tournamentId: 't-1',
  roundNumber: 1,
  matchNumber: 1,
  actorUserId: 'organizer-1',
  decision: 'CONFIRM' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  tournamentRepo.findByIdSV.mockResolvedValue({
    id: 't-1',
    organizerUserId: 'organizer-1',
    venueId: 'venue-1',
  });
  scheduleRepo.findByTournamentIdSV.mockResolvedValue({
    slotPlan: [{ roundNumber: 1, matchNumber: 1, courtId: 'court-a', scheduledAt: SLOT_AT }],
  });
  assertOrganizer.executeSV.mockResolvedValue(undefined);
  holdRepo.confirmHoldSV.mockResolvedValue(true);
  holdRepo.releaseHoldSV.mockResolvedValue(true);
});

describe('SettleTournamentSlotAsOrganizerUseCase', () => {
  //? En americano el organizador lleva el proceso: esperar cuatro respuestas
  //? por partido para una cancha que el club ya asigno no le sirve a nadie.
  it('should let the organizer confirm the court without waiting for the players', async () => {
    const RESULT = await useCase.executeSV(BASE);

    expect(RESULT.applied).toBe(true);
    expect(holdRepo.confirmHoldSV).toHaveBeenCalledWith({
      courtId: 'court-a',
      scheduledAt: SLOT_AT,
    });
  });

  it('should let the organizer release a court to reschedule the match', async () => {
    const RESULT = await useCase.executeSV({ ...BASE, decision: 'RELEASE' });

    expect(RESULT.applied).toBe(true);
    expect(holdRepo.releaseHoldSV).toHaveBeenCalled();
    expect(holdRepo.confirmHoldSV).not.toHaveBeenCalled();
  });

  it('should refuse anybody who is not the organizer', async () => {
    assertOrganizer.executeSV.mockRejectedValue(new Error('403'));

    await expect(useCase.executeSV(BASE)).rejects.toThrow();
    expect(holdRepo.confirmHoldSV).not.toHaveBeenCalled();
  });

  it('should fail when the match has no court held', async () => {
    scheduleRepo.findByTournamentIdSV.mockResolvedValue({ slotPlan: null });

    await expect(useCase.executeSV(BASE)).rejects.toThrow(
      'Ese partido no tiene una cancha apartada.',
    );
  });

  //? Que el turno ya no estuviera apartado no es un error: alguien lo confirmo
  //? o vencio antes, y no habia nada que hacer.
  it('should report that nothing changed when the hold was already gone', async () => {
    holdRepo.confirmHoldSV.mockResolvedValue(false);

    const RESULT = await useCase.executeSV(BASE);

    expect(RESULT.applied).toBe(false);
  });
});
