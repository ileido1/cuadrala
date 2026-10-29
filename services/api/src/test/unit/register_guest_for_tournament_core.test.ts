import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerGuestForTournamentCoreSV } from '../../application/helpers/register_guest_for_tournament_core.js';

const mockRegistrationRepository = {
  createGuestSV: vi.fn(),
  countByTournamentIdSV: vi.fn(),
};

const BASE_TOURNAMENT = {
  id: 'tournament-1',
  status: 'DRAFT',
  isCompetitive: false,
  inscriptionPrice: null,
  maxSlots: null,
};

const REGISTRATION = {
  id: 'reg-1',
  tournamentId: 'tournament-1',
  userId: null,
  userName: null,
  status: 'PENDING',
  registrationType: 'GUEST',
  guestName: 'Juan Pérez',
  guestPhone: null,
  guestEmail: 'juan@mail.com',
  registeredByUserId: 'organizer-1',
  partnerRegistrationId: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRegistrationRepository.createGuestSV.mockResolvedValue(REGISTRATION);
});

describe('registerGuestForTournamentCoreSV', () => {
  it.each(['IN_PROGRESS', 'COMPLETED', 'CANCELLED'])(
    'should throw TORNEO_CERRADO when the tournament is %s',
    async (_status) => {
      await expect(
        registerGuestForTournamentCoreSV(
          {
            tournament: { ...BASE_TOURNAMENT, status: _status },
            guestName: 'Juan Pérez',
            guestEmail: 'juan@mail.com',
            registeredByUserId: 'organizer-1',
          },
          mockRegistrationRepository as never,
        ),
      ).rejects.toMatchObject({ code: 'TORNEO_CERRADO', statusCode: 409 });

      expect(mockRegistrationRepository.createGuestSV).not.toHaveBeenCalled();
    },
  );

  //? Confirmado con el usuario el 2026-10-28: la restricción "competitivo + pago
  //? no admite invitados" también aplica al registro vía link, no solo al
  //? invitado dado de alta a mano por el organizador.
  it('should throw 403 TORNEO_RESTRINGIDO when the tournament is competitive with a paid registration fee', async () => {
    await expect(
      registerGuestForTournamentCoreSV(
        {
          tournament: { ...BASE_TOURNAMENT, isCompetitive: true, inscriptionPrice: 500 },
          guestName: 'Juan Pérez',
          guestEmail: 'juan@mail.com',
          registeredByUserId: 'organizer-1',
        },
        mockRegistrationRepository as never,
      ),
    ).rejects.toMatchObject({ code: 'TORNEO_RESTRINGIDO', statusCode: 403 });

    expect(mockRegistrationRepository.createGuestSV).not.toHaveBeenCalled();
  });

  it('should throw CUPOS_AGOTADOS when maxSlots is reached', async () => {
    mockRegistrationRepository.countByTournamentIdSV.mockResolvedValue(16);

    await expect(
      registerGuestForTournamentCoreSV(
        {
          tournament: { ...BASE_TOURNAMENT, maxSlots: 16 },
          guestName: 'Juan Pérez',
          guestEmail: 'juan@mail.com',
          registeredByUserId: 'organizer-1',
        },
        mockRegistrationRepository as never,
      ),
    ).rejects.toMatchObject({ code: 'CUPOS_AGOTADOS', statusCode: 409 });

    expect(mockRegistrationRepository.createGuestSV).not.toHaveBeenCalled();
  });

  it('should call createGuestSV with the correct DTO on the happy path, including inviteLinkId when passed', async () => {
    mockRegistrationRepository.countByTournamentIdSV.mockResolvedValue(0);

    const RESULT = await registerGuestForTournamentCoreSV(
      {
        tournament: { ...BASE_TOURNAMENT, maxSlots: 16 },
        guestName: 'Juan Pérez',
        guestPhone: '+5841212345',
        guestEmail: 'JUAN@mail.com',
        registeredByUserId: 'creator-1',
        inviteLinkId: 'link-1',
      },
      mockRegistrationRepository as never,
    );

    expect(mockRegistrationRepository.createGuestSV).toHaveBeenCalledWith({
      tournamentId: 'tournament-1',
      guestName: 'Juan Pérez',
      guestPhone: '+5841212345',
      guestEmail: 'juan@mail.com',
      registeredByUserId: 'creator-1',
      inviteLinkId: 'link-1',
    });
    expect(RESULT.id).toBe('reg-1');
  });

  it('should default guestPhone to null and inviteLinkId to null when not passed', async () => {
    mockRegistrationRepository.countByTournamentIdSV.mockResolvedValue(0);

    await registerGuestForTournamentCoreSV(
      {
        tournament: { ...BASE_TOURNAMENT, maxSlots: null },
        guestName: 'Juan Pérez',
        guestEmail: 'juan@mail.com',
        registeredByUserId: 'organizer-1',
      },
      mockRegistrationRepository as never,
    );

    expect(mockRegistrationRepository.createGuestSV).toHaveBeenCalledWith({
      tournamentId: 'tournament-1',
      guestName: 'Juan Pérez',
      guestPhone: null,
      guestEmail: 'juan@mail.com',
      registeredByUserId: 'organizer-1',
      inviteLinkId: null,
    });
  });
});
