import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmPendingTournamentRegistrationsUseCase } from '../../application/use_cases/confirm_pending_tournament_registrations.use_case.js';

const tournamentRepo = { findByIdSV: vi.fn() };
const registrationRepo = {
  listByTournamentIdAndStatusSV: vi.fn(),
  updateStatusWithPartnerSV: vi.fn(),
};
const assertOrganizer = { executeSV: vi.fn() };
const notificationUc = { executeSV: vi.fn() };

const useCase = new ConfirmPendingTournamentRegistrationsUseCase(
  tournamentRepo as never,
  registrationRepo as never,
  assertOrganizer as never,
  notificationUc as never,
);

const BASE = { tournamentId: 't-1', actorUserId: 'organizer-1' };

beforeEach(() => {
  vi.clearAllMocks();
  tournamentRepo.findByIdSV.mockResolvedValue({
    id: 't-1',
    name: 'Torneo Demo',
    categoryId: 'cat-1',
    status: 'OPEN',
    organizerUserId: 'organizer-1',
    venueId: 'venue-1',
  });
  registrationRepo.listByTournamentIdAndStatusSV.mockResolvedValue([
    { id: 'reg-1', userId: 'user-1' },
    { id: 'reg-2', userId: 'user-2' },
  ]);
  registrationRepo.updateStatusWithPartnerSV.mockImplementation(async (_id: string) => ({
    id: _id,
    userId: `user-${_id.split('-')[1]}`,
  }));
  assertOrganizer.executeSV.mockResolvedValue(undefined);
  notificationUc.executeSV.mockResolvedValue({ eventId: 'e-1', createdDeliveries: 2 });
});

describe('ConfirmPendingTournamentRegistrationsUseCase', () => {
  //? Con dieciseis inscriptos, saltearse uno deja a ese jugador fuera del
  //? cuadro sin que nadie se entere.
  it('should confirm every pending registration at once', async () => {
    const R = await useCase.executeSV(BASE);

    expect(R.confirmed).toBe(2);
    expect(registrationRepo.updateStatusWithPartnerSV).toHaveBeenCalledTimes(2);
  });

  //? Para el jugador confirmado es lo mismo que le confirmen solo o en lote.
  it('should notify everybody it confirmed', async () => {
    await useCase.executeSV(BASE);

    expect(notificationUc.executeSV).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TOURNAMENT_REGISTRATION_CONFIRMED',
        userIds: ['user-1', 'user-2'],
      }),
    );
  });

  it('should do nothing when there is nobody pending', async () => {
    registrationRepo.listByTournamentIdAndStatusSV.mockResolvedValue([]);

    const R = await useCase.executeSV(BASE);

    expect(R.confirmed).toBe(0);
    expect(notificationUc.executeSV).not.toHaveBeenCalled();
  });

  it('should refuse anybody who is not the organizer', async () => {
    assertOrganizer.executeSV.mockRejectedValue(new Error('403'));

    await expect(useCase.executeSV(BASE)).rejects.toThrow();
    expect(registrationRepo.updateStatusWithPartnerSV).not.toHaveBeenCalled();
  });

  it('should refuse once the tournament started', async () => {
    tournamentRepo.findByIdSV.mockResolvedValue({
      id: 't-1',
      name: 'Torneo Demo',
      categoryId: 'cat-1',
      status: 'IN_PROGRESS',
      organizerUserId: 'organizer-1',
      venueId: 'venue-1',
    });

    await expect(useCase.executeSV(BASE)).rejects.toThrow(
      'El torneo no admite cambios de inscripción en su estado actual.',
    );
  });

  //? El invitado sin cuenta se confirma igual, pero no hay donde avisarle.
  it('should confirm a guest without trying to notify them', async () => {
    registrationRepo.listByTournamentIdAndStatusSV.mockResolvedValue([
      { id: 'reg-9', userId: null },
    ]);
    registrationRepo.updateStatusWithPartnerSV.mockResolvedValue({
      id: 'reg-9',
      userId: null,
    });

    const R = await useCase.executeSV(BASE);

    expect(R.confirmed).toBe(1);
    expect(notificationUc.executeSV).not.toHaveBeenCalled();
  });

  //? La cancha del aviso no puede revertir una confirmacion ya escrita.
  it('should still report the confirmations when the notice fails', async () => {
    notificationUc.executeSV.mockRejectedValue(new Error('sin red'));

    const R = await useCase.executeSV(BASE);

    expect(R.confirmed).toBe(2);
  });
});
