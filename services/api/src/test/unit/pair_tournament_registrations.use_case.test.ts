import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PairTournamentRegistrationsUseCase } from '../../application/use_cases/pair_tournament_registrations.use_case.js';

const tournamentRepo = { findByIdSV: vi.fn() };
const registrationRepo = { findByIdSV: vi.fn(), pairSV: vi.fn(), unpairSV: vi.fn() };
const assertOrganizer = { executeSV: vi.fn() };

const useCase = new PairTournamentRegistrationsUseCase(
  tournamentRepo as never,
  registrationRepo as never,
  assertOrganizer as never,
);

const regSV = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  tournamentId: 't-1',
  status: 'PENDING',
  partnerRegistrationId: null,
  ...over,
});

const BASE = {
  tournamentId: 't-1',
  firstRegistrationId: 'reg-1',
  secondRegistrationId: 'reg-2',
  actorUserId: 'organizer-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  tournamentRepo.findByIdSV.mockResolvedValue({
    id: 't-1',
    status: 'OPEN',
    organizerUserId: 'organizer-1',
    venueId: 'venue-1',
    pairedRegistration: true,
  });
  registrationRepo.findByIdSV.mockImplementation(async (_id: string) => regSV(_id));
  registrationRepo.pairSV.mockResolvedValue(undefined);
  registrationRepo.unpairSV.mockResolvedValue(true);
  assertOrganizer.executeSV.mockResolvedValue(undefined);
});

describe('PairTournamentRegistrationsUseCase', () => {
  it('should let the organizer pair two registrations', async () => {
    const RESULT = await useCase.pairSV(BASE);

    expect(RESULT.paired).toBe(true);
    expect(registrationRepo.pairSV).toHaveBeenCalledWith('reg-1', 'reg-2');
  });

  it('should refuse anybody who is not the organizer', async () => {
    assertOrganizer.executeSV.mockRejectedValue(new Error('403'));

    await expect(useCase.pairSV(BASE)).rejects.toThrow();
    expect(registrationRepo.pairSV).not.toHaveBeenCalled();
  });

  //? Con el torneo en curso el cuadro ya esta materializado: mover una dupla
  //? lo invalidaria.
  it('should refuse pairing once the tournament started', async () => {
    tournamentRepo.findByIdSV.mockResolvedValue({
      id: 't-1',
      status: 'IN_PROGRESS',
      organizerUserId: 'organizer-1',
      venueId: 'venue-1',
      pairedRegistration: true,
    });

    await expect(useCase.pairSV(BASE)).rejects.toThrow(
      'El torneo no admite cambios de inscripción en su estado actual.',
    );
  });

  it('should refuse pairing in a tournament that is not played in pairs', async () => {
    tournamentRepo.findByIdSV.mockResolvedValue({
      id: 't-1',
      status: 'OPEN',
      organizerUserId: 'organizer-1',
      venueId: 'venue-1',
      pairedRegistration: false,
    });

    await expect(useCase.pairSV(BASE)).rejects.toThrow(
      'Este torneo no se juega en duplas fijas.',
    );
  });

  it('should let the organizer undo a pair', async () => {
    const RESULT = await useCase.unpairSV({
      tournamentId: 't-1',
      registrationId: 'reg-1',
      actorUserId: 'organizer-1',
    });

    expect(RESULT.unpaired).toBe(true);
    expect(registrationRepo.unpairSV).toHaveBeenCalledWith('reg-1');
  });

  //? Deshacer algo que ya estaba deshecho no es un error.
  it('should report that nothing changed when there was no pair', async () => {
    registrationRepo.unpairSV.mockResolvedValue(false);

    const RESULT = await useCase.unpairSV({
      tournamentId: 't-1',
      registrationId: 'reg-1',
      actorUserId: 'organizer-1',
    });

    expect(RESULT.unpaired).toBe(false);
  });
});
