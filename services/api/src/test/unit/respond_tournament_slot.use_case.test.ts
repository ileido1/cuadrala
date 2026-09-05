import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RespondTournamentSlotUseCase } from '../../application/use_cases/respond_tournament_slot.use_case.js';

const scheduleRepo = { findByTournamentIdSV: vi.fn() };
const registrationRepo = { listByTournamentIdSV: vi.fn() };
const responseRepo = { upsertSV: vi.fn(), listByMatchSV: vi.fn() };
const holdRepo = { confirmHoldSV: vi.fn(), releaseHoldSV: vi.fn() };

const useCase = new RespondTournamentSlotUseCase(
  scheduleRepo as never,
  registrationRepo as never,
  responseRepo as never,
  holdRepo as never,
);

const SLOT_AT = new Date('2026-10-01T14:00:00.000Z');

const SCHEDULE = {
  formatCode: 'AMERICANO',
  payload: {
    rounds: [
      {
        roundNumber: 1,
        courts: [{ courtNumber: 1, teamA: ['reg-1', 'reg-2'], teamB: ['reg-3', 'reg-4'] }],
      },
    ],
  },
  slotPlan: [
    { roundNumber: 1, matchNumber: 1, courtId: 'court-a', scheduledAt: SLOT_AT },
  ],
};

const REGISTRATIONS = [
  { id: 'reg-1', userId: 'user-1' },
  { id: 'reg-2', userId: 'user-2' },
  { id: 'reg-3', userId: 'user-3' },
  { id: 'reg-4', userId: null },
];

const BASE = {
  tournamentId: 't-1',
  roundNumber: 1,
  matchNumber: 1,
  actorUserId: 'user-1',
  response: 'ACCEPTED' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  scheduleRepo.findByTournamentIdSV.mockResolvedValue(SCHEDULE);
  registrationRepo.listByTournamentIdSV.mockResolvedValue(REGISTRATIONS);
  responseRepo.upsertSV.mockResolvedValue(undefined);
  responseRepo.listByMatchSV.mockResolvedValue([]);
  holdRepo.confirmHoldSV.mockResolvedValue(true);
  holdRepo.releaseHoldSV.mockResolvedValue(true);
});

describe('RespondTournamentSlotUseCase', () => {
  it('should keep the court held while somebody has not answered', async () => {
    responseRepo.listByMatchSV.mockResolvedValue([
      { userId: 'user-1', response: 'ACCEPTED' },
    ]);

    const RESULT = await useCase.executeSV(BASE);

    expect(RESULT.decision).toBe('PENDING');
    expect(holdRepo.confirmHoldSV).not.toHaveBeenCalled();
    expect(holdRepo.releaseHoldSV).not.toHaveBeenCalled();
  });

  //? El invitado sin cuenta (reg-4) juega pero no puede aceptar: esperarlo
  //? dejaria el turno colgado hasta que venza, siempre.
  it('should confirm the court once every player with an account accepted', async () => {
    responseRepo.listByMatchSV.mockResolvedValue([
      { userId: 'user-1', response: 'ACCEPTED' },
      { userId: 'user-2', response: 'ACCEPTED' },
      { userId: 'user-3', response: 'ACCEPTED' },
    ]);

    const RESULT = await useCase.executeSV(BASE);

    expect(RESULT.decision).toBe('ACCEPTED');
    expect(holdRepo.confirmHoldSV).toHaveBeenCalledWith({
      courtId: 'court-a',
      scheduledAt: SLOT_AT,
    });
  });

  //? Quedarse la cancha sabiendo que ese horario no va se la quita a la sede
  //? para nada: el organizador tiene que reubicar el partido igual.
  it('should release the court as soon as one player rejects', async () => {
    responseRepo.listByMatchSV.mockResolvedValue([
      { userId: 'user-1', response: 'REJECTED' },
    ]);

    const RESULT = await useCase.executeSV({ ...BASE, response: 'REJECTED' });

    expect(RESULT.decision).toBe('REJECTED');
    expect(holdRepo.releaseHoldSV).toHaveBeenCalledWith({
      courtId: 'court-a',
      scheduledAt: SLOT_AT,
    });
    expect(holdRepo.confirmHoldSV).not.toHaveBeenCalled();
  });

  it('should refuse an answer from somebody who does not play that match', async () => {
    await expect(
      useCase.executeSV({ ...BASE, actorUserId: 'user-9' }),
    ).rejects.toThrow('No juegas ese partido, así que no podés responder por su horario.');

    expect(responseRepo.upsertSV).not.toHaveBeenCalled();
  });

  //? Sin turno apartado (la sede no daba, o se perdio la carrera) la respuesta
  //? igual se registra: le sirve al organizador cuando reubique el partido.
  it('should record the answer even when the match has no court held', async () => {
    scheduleRepo.findByTournamentIdSV.mockResolvedValue({ ...SCHEDULE, slotPlan: null });
    responseRepo.listByMatchSV.mockResolvedValue([
      { userId: 'user-1', response: 'ACCEPTED' },
      { userId: 'user-2', response: 'ACCEPTED' },
      { userId: 'user-3', response: 'ACCEPTED' },
    ]);

    const RESULT = await useCase.executeSV(BASE);

    expect(RESULT.decision).toBe('ACCEPTED');
    expect(responseRepo.upsertSV).toHaveBeenCalled();
    expect(holdRepo.confirmHoldSV).not.toHaveBeenCalled();
  });

  it('should fail when the tournament has no schedule yet', async () => {
    scheduleRepo.findByTournamentIdSV.mockResolvedValue(null);

    await expect(useCase.executeSV(BASE)).rejects.toThrow(
      'El torneo todavía no tiene calendario.',
    );
  });
});
