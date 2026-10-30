import { beforeEach, describe, expect, it } from 'vitest';

import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { AssertTournamentViewAccessUseCase } from '../../application/use_cases/assert_tournament_view_access.use_case.js';

const venueStaffRepo = { isUserStaffOfVenueSV: async (_userId: string, _venueId: string) => false };
const registrationRepo = {
  findByTournamentAndUserSV: async (_tournamentId: string, _userId: string) => null as {
    id: string;
    tournamentId: string;
    userId: string | null;
    userName: string | null;
    status: string;
    registrationType: 'AUTHENTICATED' | 'GUEST';
    guestName: string | null;
    guestPhone: string | null;
    guestEmail: string | null;
    registeredByUserId: string | null;
    partnerRegistrationId: string | null;
    createdAt: Date;
  } | null,
};

let staffResult: boolean;
let registrationResult: Awaited<ReturnType<typeof registrationRepo.findByTournamentAndUserSV>>;
let organizerAccessUseCase: AssertTournamentOrganizerAccessUseCase;
let useCase: AssertTournamentViewAccessUseCase;

beforeEach(() => {
  staffResult = false;
  registrationResult = null;
  venueStaffRepo.isUserStaffOfVenueSV = async () => staffResult;
  registrationRepo.findByTournamentAndUserSV = async () => registrationResult;
  organizerAccessUseCase = new AssertTournamentOrganizerAccessUseCase(venueStaffRepo as never);
  useCase = new AssertTournamentViewAccessUseCase(organizerAccessUseCase, registrationRepo as never);
});

function activeRegistration(_status: string) {
  return {
    id: 'registration-1',
    tournamentId: 'tournament-1',
    userId: 'participant-1',
    userName: 'Participante',
    status: _status,
    registrationType: 'AUTHENTICATED' as const,
    guestName: null,
    guestPhone: null,
    guestEmail: null,
    registeredByUserId: null,
    partnerRegistrationId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('AssertTournamentViewAccessUseCase', () => {
  it('should resolve for a PUBLIC tournament without a session', async () => {
    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: undefined,
        visibility: 'PUBLIC',
        organizerUserId: 'organizer-1',
        venueId: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('should resolve for a tournament without a declared visibility, without a session', async () => {
    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: undefined,
        visibility: null,
        organizerUserId: 'organizer-1',
        venueId: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('should reject a PRIVATE tournament with a 401 AppError when there is no session', async () => {
    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: undefined,
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: null,
      }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'NO_AUTORIZADO' });
  });

  it('should resolve a PRIVATE tournament for the organizer', async () => {
    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: 'organizer-1',
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('should resolve a PRIVATE tournament for venue staff', async () => {
    staffResult = true;

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: 'staff-1',
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: 'venue-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('should resolve a PRIVATE tournament for a participant with a CONFIRMED registration', async () => {
    registrationResult = activeRegistration('CONFIRMED');

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: 'participant-1',
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('should resolve a PRIVATE tournament for a participant with a PENDING registration', async () => {
    registrationResult = activeRegistration('PENDING');

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: 'participant-1',
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('should reject a PRIVATE tournament with a 403 AppError for a participant whose registration was WITHDRAWN', async () => {
    registrationResult = activeRegistration('WITHDRAWN');

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: 'participant-1',
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: null,
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' });
  });

  it('should reject a PRIVATE tournament with a 403 AppError for an outsider', async () => {
    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: 'outsider-1',
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: 'venue-1',
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' });
  });
});
