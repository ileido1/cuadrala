import { describe, expect, it, vi } from 'vitest';

import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { AssertTournamentViewAccessUseCase } from '../../application/use_cases/assert_tournament_view_access.use_case.js';
import { GetTournamentScoreboardUseCase } from '../../application/use_cases/get_tournament_scoreboard.use_case.js';

const ALLOW_VIEW_ACCESS = { executeSV: vi.fn().mockResolvedValue(undefined) };

describe('GetTournamentScoreboardUseCase', () => {
  it('uses a mini-table then stable identity order for a cyclic head-to-head tie', async () => {
    const tournamentRepository = { findByIdSV: vi.fn().mockResolvedValue({ id: 'tournament-1' }) };
    const scoreboardRepository = { listScoreboardByTournamentIdSV: vi.fn() };
    const useCase = new GetTournamentScoreboardUseCase(
      tournamentRepository as never,
      scoreboardRepository as never,
      ALLOW_VIEW_ACCESS as never,
    );
    const rows = [
      { userId: 'c', name: 'Carla', points: 10, gamesPlayed: 3, gamesWon: 1, gamesLost: 2, gamesDrawn: 0, pointsFor: 30, pointsAgainst: 20, difference: 10, headToHeadWins: { a: 1 } },
      { userId: 'b', name: 'Bruno', points: 10, gamesPlayed: 3, gamesWon: 1, gamesLost: 2, gamesDrawn: 0, pointsFor: 30, pointsAgainst: 20, difference: 10, headToHeadWins: { c: 1 } },
      { userId: 'a', name: 'Ana', points: 10, gamesPlayed: 3, gamesWon: 1, gamesLost: 2, gamesDrawn: 0, pointsFor: 30, pointsAgainst: 20, difference: 10, headToHeadWins: { b: 1 } },
    ];
    const permutations = [rows, [rows[1]!, rows[2]!, rows[0]!], [rows[2]!, rows[0]!, rows[1]!]];
    const results = [];
    for (const permutation of permutations) {
      scoreboardRepository.listScoreboardByTournamentIdSV.mockResolvedValueOnce(permutation);
      results.push(await useCase.executeSV({ tournamentId: 'tournament-1' }));
    }

    expect(results.map((result) => result.map(({ name, rank }) => [name, rank]))).toEqual(
      Array(3).fill([
        ['Ana', 1],
        ['Bruno', 2],
        ['Carla', 3],
      ]),
    );
    expect(results.flat().every((row) => !('headToHeadWins' in row))).toBe(true);
  });

  //? Cierra #74: el scoreboard de un torneo PRIVATE solo puede verlo
  //? organizador, staff de la sede, o un participante con inscripción activa.
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

    function buildUseCase(_tournament: Record<string, unknown>) {
      const tournamentRepository = { findByIdSV: vi.fn().mockResolvedValue(_tournament) };
      const scoreboardRepository = { listScoreboardByTournamentIdSV: vi.fn().mockResolvedValue([]) };
      return new GetTournamentScoreboardUseCase(
        tournamentRepository as never,
        scoreboardRepository as never,
        assertViewAccess,
      );
    }

    it('should reject with a 401 AppError when there is no session', async () => {
      const useCase = buildUseCase({
        id: 'tournament-1',
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: null,
      });

      await expect(
        useCase.executeSV({ tournamentId: 'tournament-1' }),
      ).rejects.toMatchObject({ statusCode: 401, code: 'NO_AUTORIZADO' });
    });

    it('should reject with a 403 AppError for an outsider actor', async () => {
      venueStaffRepository.isUserStaffOfVenueSV.mockResolvedValueOnce(false);
      registrationRepository.findByTournamentAndUserSV.mockResolvedValueOnce(null);
      const useCase = buildUseCase({
        id: 'tournament-1',
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: null,
      });

      await expect(
        useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'outsider-1' }),
      ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' });
    });

    it('should resolve for the tournament organizer', async () => {
      const useCase = buildUseCase({
        id: 'tournament-1',
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: null,
      });

      await expect(
        useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1' }),
      ).resolves.toEqual([]);
    });

    it('should resolve for a participant with an active registration', async () => {
      registrationRepository.findByTournamentAndUserSV.mockResolvedValueOnce({
        id: 'reg-1',
        status: 'CONFIRMED',
      });
      const useCase = buildUseCase({
        id: 'tournament-1',
        visibility: 'PRIVATE',
        organizerUserId: 'organizer-1',
        venueId: null,
      });

      await expect(
        useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'participant-1' }),
      ).resolves.toEqual([]);
    });
  });
});
