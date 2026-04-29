import { AppError } from '../../domain/errors/app_error.js';
import { applyEloForFreeForAllPerPlayerKSV } from '../../domain/elo/elo_rating.js';
import type { MatchResultReadRepository } from '../../domain/ports/match_result_read_repository.js';
import type { UserRatingRepository } from '../../domain/ports/user_rating_repository.js';

export type ApplyEloAfterMatchResultUseCaseInput = {
  resultId: string;
  kFactor: number;
  initialRating: number;
  minRating: number;
  maxRating: number;
  provisionalGames: number;
  provisionalKMultiplier: number;
};

export class ApplyEloAfterMatchResultUseCase {
  public constructor(
    private readonly _matchResultReadRepository: MatchResultReadRepository,
    private readonly _userRatingRepository: UserRatingRepository,
  ) {}

  async executeSV(_input: ApplyEloAfterMatchResultUseCaseInput): Promise<{ updated: number }> {
    if (_input.kFactor <= 0 || _input.kFactor > 512) {
      throw new AppError('VALIDACION_FALLIDA', 'kFactor debe estar entre 1 y 512.', 400);
    }
    if (_input.initialRating <= 0) {
      throw new AppError('VALIDACION_FALLIDA', 'initialRating debe ser mayor a 0.', 400);
    }
    if (_input.minRating <= 0 || _input.maxRating <= 0 || _input.minRating > _input.maxRating) {
      throw new AppError('VALIDACION_FALLIDA', 'minRating/maxRating inválidos.', 400);
    }
    if (_input.provisionalGames < 0) {
      throw new AppError('VALIDACION_FALLIDA', 'provisionalGames inválido.', 400);
    }
    if (_input.provisionalKMultiplier <= 0 || _input.provisionalKMultiplier > 10) {
      throw new AppError('VALIDACION_FALLIDA', 'provisionalKMultiplier inválido.', 400);
    }

    const RESULT = await this._matchResultReadRepository.findByIdWithMatchSV(_input.resultId);
    if (RESULT === null) {
      throw new AppError('RESULTADO_NO_ENCONTRADO', 'El resultado indicado no existe.', 404);
    }

    const USER_IDS = RESULT.scores.map((_s) => _s.userId);
    const UNIQUE = new Set(USER_IDS);
    if (UNIQUE.size !== USER_IDS.length) {
      throw new AppError('RESULTADO_INVALIDO', 'El resultado tiene userIds duplicados.', 409);
    }
    if (USER_IDS.length !== 4) {
      throw new AppError('RESULTADO_INVALIDO', 'El MVP requiere exactamente 4 jugadores para aplicar Elo.', 409);
    }

    const EXISTING = await this._userRatingRepository.getRatingsByUserIdsSV(RESULT.categoryId, USER_IDS);
    const EXISTING_MAP = new Map(EXISTING.map((_r) => [_r.userId, _r.rating]));

    const PLAYERS = RESULT.scores.map((_s) => ({
      userId: _s.userId,
      rating: EXISTING_MAP.get(_s.userId) ?? _input.initialRating,
      score: _s.points,
    }));

    const GAMES_BY_USER = await this._userRatingRepository.countHistoryByUserIdsSV(
      RESULT.categoryId,
      USER_IDS,
    );
    const K_BY_USER: Record<string, number> = {};
    for (const _userId of USER_IDS) {
      const GAMES = GAMES_BY_USER[_userId] ?? 0;
      const IS_PROVISIONAL = GAMES < _input.provisionalGames;
      K_BY_USER[_userId] = IS_PROVISIONAL ? _input.kFactor * _input.provisionalKMultiplier : _input.kFactor;
    }

    const OUT = applyEloForFreeForAllPerPlayerKSV(PLAYERS, K_BY_USER, {
      min: _input.minRating,
      max: _input.maxRating,
    });

    await this._userRatingRepository.upsertRatingsSV(
      OUT.map((_o) => ({
        userId: _o.userId,
        categoryId: RESULT.categoryId,
        rating: _o.newRating,
      })),
    );

    await this._userRatingRepository.appendHistorySV(
      OUT.map((_o) => ({
        userId: _o.userId,
        categoryId: RESULT.categoryId,
        matchId: RESULT.matchId,
        resultId: RESULT.resultId,
        previousRating: _o.previousRating,
        newRating: _o.newRating,
        kFactor: _input.kFactor,
      })),
    );

    return { updated: OUT.length };
  }
}

