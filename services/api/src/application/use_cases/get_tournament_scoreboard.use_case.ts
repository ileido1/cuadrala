import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type {
  TournamentScoreboardRepository,
  TournamentScoreboardRow,
} from '../../domain/ports/tournament_scoreboard_repository.js';

export type TournamentScoreboardItemDTO = Omit<TournamentScoreboardRow, 'headToHeadWins'> & {
  rank: number;
};

export class GetTournamentScoreboardUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _scoreboardRepository: TournamentScoreboardRepository,
  ) {}

  async executeSV(_tournamentId: string): Promise<TournamentScoreboardItemDTO[]> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    const ROWS = await this._scoreboardRepository.listScoreboardByTournamentIdSV(_tournamentId);
    if (ROWS.length === 0) return [];

    const SORTED = [...ROWS].sort((_a, _b) => {
      if (_b.points !== _a.points) return _b.points - _a.points;
      return _b.difference - _a.difference;
    });

    // Compare direct results as a mini-table across each tied group instead
    // of pairwise: head-to-head cycles are non-transitive for Array.sort.
    const IDENTITY = (_row: TournamentScoreboardRow) =>
      _row.tournamentRegistrationId ?? _row.userId ?? '';
    for (let start = 0; start < SORTED.length; ) {
      let end = start + 1;
      while (
        end < SORTED.length &&
        SORTED[end]!.points === SORTED[start]!.points &&
        SORTED[end]!.difference === SORTED[start]!.difference
      ) {
        end += 1;
      }

      const GROUP = SORTED.slice(start, end);
      const GROUP_IDS = new Set(GROUP.map(IDENTITY));
      const MINI_TABLE_WINS = new Map(
        GROUP.map((_row) => {
          return [
            _row,
            Object.entries(_row.headToHeadWins).reduce(
              (TOTAL, [_opponentId, _wins]) =>
                TOTAL + (GROUP_IDS.has(_opponentId) ? _wins : 0),
              0,
            ),
          ] as const;
        }),
      );
      GROUP.sort((_a, _b) => {
        const HEAD_TO_HEAD = MINI_TABLE_WINS.get(_b)! - MINI_TABLE_WINS.get(_a)!;
        if (HEAD_TO_HEAD !== 0) return HEAD_TO_HEAD;
        if (_a.name !== _b.name) return _a.name.localeCompare(_b.name);
        return IDENTITY(_a).localeCompare(IDENTITY(_b));
      });
      SORTED.splice(start, GROUP.length, ...GROUP);
      start = end;
    }

    return SORTED.map((_row, _index) => {
      const { headToHeadWins: _internal, ...ROW } = _row;
      return { ...ROW, rank: _index + 1 };
    });
  }
}
