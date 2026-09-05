import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExpireTournamentSlotHoldsUseCase } from '../../application/use_cases/expire_tournament_slot_holds.use_case.js';

const sweepRepo = { listExpiredHoldsSV: vi.fn(), markExpiredSV: vi.fn() };
const notificationUc = { executeSV: vi.fn() };

const useCase = new ExpireTournamentSlotHoldsUseCase(
  sweepRepo as never,
  notificationUc as never,
);

const holdSV = (over: Partial<Record<string, unknown>> = {}) => ({
  reservationId: 'res-1',
  tournamentId: 't-1',
  categoryId: 'cat-1',
  organizerUserId: 'organizer-1',
  tournamentName: 'Torneo Demo',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  sweepRepo.markExpiredSV.mockImplementation(async (_ids: string[]) => _ids.length);
  notificationUc.executeSV.mockResolvedValue({ eventId: 'e-1', createdDeliveries: 1 });
});

describe('ExpireTournamentSlotHoldsUseCase', () => {
  it('should do nothing when no hold expired', async () => {
    sweepRepo.listExpiredHoldsSV.mockResolvedValue([]);

    const RESULT = await useCase.executeSV();

    expect(RESULT).toEqual({ expiredHolds: 0, notifiedTournaments: 0 });
    expect(sweepRepo.markExpiredSV).not.toHaveBeenCalled();
  });

  //? Sin el barrido, un jugador que no contesta le bloquea a la sede una cancha
  //? vendible para siempre: es la contracara obligatoria de apartar.
  it('should release the courts of every expired hold', async () => {
    sweepRepo.listExpiredHoldsSV.mockResolvedValue([
      holdSV({ reservationId: 'res-1' }),
      holdSV({ reservationId: 'res-2' }),
    ]);

    const RESULT = await useCase.executeSV();

    expect(sweepRepo.markExpiredSV).toHaveBeenCalledWith(['res-1', 'res-2']);
    expect(RESULT.expiredHolds).toBe(2);
  });

  //? Si vencieron ocho turnos del mismo cuadro, el organizador tiene un
  //? problema, no ocho notificaciones.
  it('should send one notice per tournament, not one per match', async () => {
    sweepRepo.listExpiredHoldsSV.mockResolvedValue([
      holdSV({ reservationId: 'res-1' }),
      holdSV({ reservationId: 'res-2' }),
      holdSV({ reservationId: 'res-3', tournamentId: 't-2', organizerUserId: 'organizer-2' }),
    ]);

    const RESULT = await useCase.executeSV();

    expect(RESULT.notifiedTournaments).toBe(2);
    expect(notificationUc.executeSV).toHaveBeenCalledTimes(2);
  });

  it('should tell the organizer how many slots were released', async () => {
    sweepRepo.listExpiredHoldsSV.mockResolvedValue([
      holdSV({ reservationId: 'res-1' }),
      holdSV({ reservationId: 'res-2' }),
    ]);

    await useCase.executeSV();

    expect(notificationUc.executeSV).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TOURNAMENT_MATCH_NEEDS_ATTENTION',
        userIds: ['organizer-1'],
        payload: expect.objectContaining({ releasedSlots: 2, reason: 'HOLD_EXPIRED' }),
      }),
    );
  });

  it('should skip the notice for a tournament with no organizer', async () => {
    sweepRepo.listExpiredHoldsSV.mockResolvedValue([holdSV({ organizerUserId: null })]);

    const RESULT = await useCase.executeSV();

    expect(RESULT.expiredHolds).toBe(1);
    expect(notificationUc.executeSV).not.toHaveBeenCalled();
  });

  //? La cancha ya se solto: que falle el aviso no puede revertir eso.
  it('should still count the released courts when the notice fails', async () => {
    sweepRepo.listExpiredHoldsSV.mockResolvedValue([holdSV()]);
    notificationUc.executeSV.mockRejectedValue(new Error('sin red'));

    const RESULT = await useCase.executeSV();

    expect(RESULT.expiredHolds).toBe(1);
    expect(RESULT.notifiedTournaments).toBe(0);
  });
});
