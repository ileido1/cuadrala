import { AppError } from '../../domain/errors/app_error.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchReadRepository } from '../../domain/ports/match_read_repository.js';
import type { UserCategoryRepository } from '../../domain/ports/user_category_repository.js';

export class JoinMatchUseCase {
  constructor(
    private readonly _matchReadRepository: MatchReadRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _userCategoryRepository: UserCategoryRepository,
  ) {}

  async executeSV(_matchId: string, _userId: string): Promise<{ matchId: string; userId: string }> {
    const MATCH = await this._matchReadRepository.findByIdSV(_matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    if (MATCH.status !== 'SCHEDULED') {
      throw new AppError('PARTIDO_NO_ABIERTO', 'El partido no está abierto para unirse.', 409);
    }

    const HAS_CATEGORY = await this._userCategoryRepository.userHasCategorySV(_userId, MATCH.categoryId);
    if (!HAS_CATEGORY) {
      throw new AppError(
        'CATEGORIA_NO_COMPATIBLE',
        'Tu categoría no es compatible con la categoría del partido.',
        403,
      );
    }

    const ALREADY = await this._matchParticipationRepository.userIsParticipantSV(_matchId, _userId);
    if (ALREADY) {
      throw new AppError('YA_UNIDO', 'Ya estás unido a este partido.', 409);
    }

    const COUNT = await this._matchParticipationRepository.countParticipantsSV(_matchId);
    if (COUNT >= MATCH.maxParticipants) {
      throw new AppError('PARTIDO_LLENO', 'El partido ya está completo.', 409);
    }

    await this._matchParticipationRepository.addParticipantSV(_matchId, _userId);
    return { matchId: _matchId, userId: _userId };
  }
}

