import { describe, expect, it, vi } from 'vitest';

import { GetTournamentScoreboardUseCase } from '../../application/use_cases/get_tournament_scoreboard.use_case.js';

describe('GetTournamentScoreboardUseCase', () => {
  it('uses a mini-table then stable identity order for a cyclic head-to-head tie', async () => {
    const tournamentRepository = { findByIdSV: vi.fn().mockResolvedValue({ id: 'tournament-1' }) };
    const scoreboardRepository = { listScoreboardByTournamentIdSV: vi.fn() };
    const useCase = new GetTournamentScoreboardUseCase(
      tournamentRepository as never,
      scoreboardRepository as never,
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
      results.push(await useCase.executeSV('tournament-1'));
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
});
