import { describe, expect, it, vi } from 'vitest';

import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { AssertTournamentViewAccessUseCase } from '../../application/use_cases/assert_tournament_view_access.use_case.js';
import { GetTournamentUseCase } from '../../application/use_cases/get_tournament.use_case.js';

function buildTournamentQueryRepository(_tournament: Record<string, unknown> | null) {
  return {
    listTournamentsSV: vi.fn(),
    getTournamentByIdSV: vi.fn().mockResolvedValue(_tournament),
    listTournamentRegistrationsSV: vi.fn().mockResolvedValue([]),
    listTournamentsByVenueSV: vi.fn(),
    listViewerTournamentsSV: vi.fn(),
  };
}

describe('GetTournamentUseCase', () => {
  it('should reject with a 404 AppError when the tournament does not exist', async () => {
    const tournamentQueryRepository = buildTournamentQueryRepository(null);
    const assertViewAccess = { executeSV: vi.fn() };
    const useCase = new GetTournamentUseCase(
      tournamentQueryRepository as never,
      assertViewAccess as never,
    );

    await expect(
      useCase.executeSV({ tournamentId: 'missing-tournament' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TORNEO_NO_ENCONTRADO' });
    expect(assertViewAccess.executeSV).not.toHaveBeenCalled();
  });

  it('should return the tournament and its registrations when view access resolves', async () => {
    const TOURNAMENT = { id: 'tournament-1', visibility: 'PUBLIC', organizerUserId: 'organizer-1', venueId: null };
    const tournamentQueryRepository = buildTournamentQueryRepository(TOURNAMENT);
    const assertViewAccess = { executeSV: vi.fn().mockResolvedValue(undefined) };
    const useCase = new GetTournamentUseCase(
      tournamentQueryRepository as never,
      assertViewAccess as never,
    );

    const RESULT = await useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'someone' });

    expect(RESULT.tournament).toBe(TOURNAMENT);
    expect(assertViewAccess.executeSV).toHaveBeenCalledWith({
      tournamentId: 'tournament-1',
      actorUserId: 'someone',
      visibility: 'PUBLIC',
      organizerUserId: 'organizer-1',
      venueId: null,
    });
  });

  //? Cierra #74: el detalle de un torneo PRIVATE solo puede verlo organizador,
  //? staff de la sede, o un participante con inscripción activa.
  describe('visibility PRIVATE', () => {
    const venueStaffRepository = { isUserStaffOfVenueSV: vi.fn().mockResolvedValue(false) };
    const registrationRepository = { findByTournamentAndUserSV: vi.fn().mockResolvedValue(null) };
    const assertOrganizerAccess = new AssertTournamentOrganizerAccessUseCase(
      venueStaffRepository as never,
    );
    const assertViewAccess = new AssertTournamentViewAccessUseCase(
      assertOrganizerAccess,
      registrationRepository as never,
    );
    const PRIVATE_TOURNAMENT = {
      id: 'tournament-1',
      visibility: 'PRIVATE',
      organizerUserId: 'organizer-1',
      venueId: null,
    };

    it('should reject with a 401 AppError when there is no session', async () => {
      const tournamentQueryRepository = buildTournamentQueryRepository(PRIVATE_TOURNAMENT);
      const useCase = new GetTournamentUseCase(tournamentQueryRepository as never, assertViewAccess);

      await expect(
        useCase.executeSV({ tournamentId: 'tournament-1' }),
      ).rejects.toMatchObject({ statusCode: 401, code: 'NO_AUTORIZADO' });
      expect(tournamentQueryRepository.listTournamentRegistrationsSV).not.toHaveBeenCalled();
    });

    it('should reject with a 403 AppError for an outsider actor', async () => {
      venueStaffRepository.isUserStaffOfVenueSV.mockResolvedValueOnce(false);
      registrationRepository.findByTournamentAndUserSV.mockResolvedValueOnce(null);
      const tournamentQueryRepository = buildTournamentQueryRepository(PRIVATE_TOURNAMENT);
      const useCase = new GetTournamentUseCase(tournamentQueryRepository as never, assertViewAccess);

      await expect(
        useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'outsider-1' }),
      ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' });
    });

    it('should resolve for the tournament organizer', async () => {
      const tournamentQueryRepository = buildTournamentQueryRepository(PRIVATE_TOURNAMENT);
      const useCase = new GetTournamentUseCase(tournamentQueryRepository as never, assertViewAccess);

      await expect(
        useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1' }),
      ).resolves.toMatchObject({ tournament: PRIVATE_TOURNAMENT, registrations: [] });
    });

    it('should resolve for a participant with an active registration', async () => {
      registrationRepository.findByTournamentAndUserSV.mockResolvedValueOnce({
        id: 'reg-1',
        status: 'PENDING',
      });
      const tournamentQueryRepository = buildTournamentQueryRepository(PRIVATE_TOURNAMENT);
      const useCase = new GetTournamentUseCase(tournamentQueryRepository as never, assertViewAccess);

      await expect(
        useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'participant-1' }),
      ).resolves.toMatchObject({ tournament: PRIVATE_TOURNAMENT, registrations: [] });
    });
  });
});
