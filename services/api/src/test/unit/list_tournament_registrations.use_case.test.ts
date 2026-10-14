import { beforeEach, describe, expect, it } from 'vitest';

import { ListTournamentRegistrationsUseCase } from '../../application/use_cases/list_tournament_registrations.use_case.js';

const tournamentRepo = { findByIdSV: async (_id: string): Promise<unknown> => null };
const registrationRepo = {
  listByTournamentIdSV: async (_tournamentId: string) => [] as Array<Record<string, unknown>>,
  countByTournamentIdSV: async (_tournamentId: string) => 0,
};
const assertOrganizer = { hasAccessSV: async (_input: unknown) => false };
const userCategoryRepo = {
  listByUserIdSV: async (_userId: string) => [] as Array<{ sportId: string; categoryName: string }>,
};

let useCase: ListTournamentRegistrationsUseCase;
let hasAccessResult: boolean;

const GUEST_ROW = {
  id: 'reg-guest-1',
  registrationType: 'GUEST',
  status: 'PENDING',
  userId: null,
  guestName: 'Marta Invitada',
  guestPhone: '+584121230000',
  guestEmail: 'marta@example.com',
};
const PLAYER_ROW = {
  id: 'reg-player-1',
  tournamentId: 't-1',
  registrationType: 'AUTHENTICATED',
  status: 'CONFIRMED',
  userId: 'player-1',
  userName: 'Ana Jugadora',
  guestName: null,
  guestPhone: null,
  guestEmail: null,
};

beforeEach(() => {
  hasAccessResult = false;
  tournamentRepo.findByIdSV = async () => ({
    id: 't-1',
    sportId: 'sport-padel',
    organizerUserId: 'organizer-1',
    venueId: 'venue-1',
  });
  registrationRepo.listByTournamentIdSV = async () => [GUEST_ROW];
  registrationRepo.countByTournamentIdSV = async () => 1;
  assertOrganizer.hasAccessSV = async () => hasAccessResult;
  userCategoryRepo.listByUserIdSV = async () => [
    { sportId: 'sport-padel', categoryName: 'Avanzado' },
  ];

  useCase = new ListTournamentRegistrationsUseCase(
    tournamentRepo as never,
    registrationRepo as never,
    assertOrganizer as never,
    userCategoryRepo as never,
  );
});

describe('ListTournamentRegistrationsUseCase — guest PII redaction', () => {
  //? El requirement `tournament-registrations` exige nulear el contacto del
  //? invitado a quien no organiza, sin tocar status ni nombre.
  it('should null guestPhone/guestEmail for a non-organizer, keeping status and guestName', async () => {
    hasAccessResult = false;

    const RESULT = await useCase.executeSV({ tournamentId: 't-1', actorUserId: 'outsider-1' });

    expect(RESULT.items[0]).toMatchObject({
      status: 'PENDING',
      guestName: 'Marta Invitada',
      guestPhone: null,
      guestEmail: null,
    });
  });

  it('should return full guest contact data for the organizer', async () => {
    hasAccessResult = true;

    const RESULT = await useCase.executeSV({ tournamentId: 't-1', actorUserId: 'organizer-1' });

    expect(RESULT.items[0]).toMatchObject({
      guestPhone: '+584121230000',
      guestEmail: 'marta@example.com',
    });
  });

  it('should return full guest contact data for venue staff', async () => {
    hasAccessResult = true;

    const RESULT = await useCase.executeSV({ tournamentId: 't-1', actorUserId: 'staff-1' });

    expect(RESULT.items[0]).toMatchObject({
      guestPhone: '+584121230000',
      guestEmail: 'marta@example.com',
    });
  });

  it('should still report the total unaffected by redaction', async () => {
    hasAccessResult = false;

    const RESULT = await useCase.executeSV({ tournamentId: 't-1', actorUserId: 'outsider-1' });

    expect(RESULT.total).toBe(1);
  });

  it('should include the player category for the tournament sport only for organizers', async () => {
    registrationRepo.listByTournamentIdSV = async () => [PLAYER_ROW];
    hasAccessResult = true;

    const RESULT = await useCase.executeSV({ tournamentId: 't-1', actorUserId: 'organizer-1' });

    expect(RESULT.items[0]).toMatchObject({ sportCategoryName: 'Avanzado' });
  });

  it('should not expose player category to non-organizers', async () => {
    registrationRepo.listByTournamentIdSV = async () => [PLAYER_ROW];
    hasAccessResult = false;

    const RESULT = await useCase.executeSV({ tournamentId: 't-1', actorUserId: 'outsider-1' });

    expect(RESULT.items[0]).not.toHaveProperty('sportCategoryName');
  });

  it('should keep throwing 404 when the tournament does not exist, regardless of access', async () => {
    tournamentRepo.findByIdSV = async () => null;

    await expect(
      useCase.executeSV({ tournamentId: 'missing', actorUserId: 'outsider-1' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TORNEO_NO_ENCONTRADO' });
  });
});
