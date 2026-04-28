import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type {
  TournamentScoreboardRepository,
  TournamentScoreboardRow,
} from '../../domain/ports/tournament_scoreboard_repository.js';

export type TournamentScoreboardItemDTO = TournamentScoreboardRow & {
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

    // Determinista: points desc, name asc, userId asc
    const SORTED = [...ROWS].sort((_a, _b) => {
      if (_b.points !== _a.points) return _b.points - _a.points;
      if (_a.name !== _b.name) return _a.name.localeCompare(_b.name);
      return _a.userId.localeCompare(_b.userId);
    });

    let rank = 0;
    let lastPoints: number | null = null;

    return SORTED.map((_row) => {
      if (lastPoints === null || _row.points !== lastPoints) {
        rank += 1;
        lastPoints = _row.points;
      }
      return { ..._row, rank };
    });
  }
}

