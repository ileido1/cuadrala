import { AppError } from '../../domain/errors/app_error.js';
import type { MatchCrudRepository } from '../../domain/ports/match_crud_repository.js';
import type { MatchOrganizerRepository } from '../../domain/ports/match_organizer_repository.js';
import type { MatchQueryRepository } from '../../domain/ports/match_query_repository.js';
import type { MatchDetailDTO } from '../../domain/ports/match_crud_repository.js';

export class CancelMatchUseCase {
  constructor(
    private readonly _matchQueryRepository: MatchQueryRepository,
    private readonly _matchOrganizerRepository: MatchOrganizerRepository,
    private readonly _matchCrudRepository: MatchCrudRepository,
  ) {}

  async executeSV(_matchId: string, _actorUserId: string): Promise<MatchDetailDTO> {
    const MATCH = await this._matchQueryRepository.getMatchByIdSV(_matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    const ORGANIZER_USER_ID = await this._matchOrganizerRepository.getOrganizerUserIdByMatchIdSV(_matchId);
    if (ORGANIZER_USER_ID === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }
    if (ORGANIZER_USER_ID !== _actorUserId) {
      throw new AppError('NO_AUTORIZADO', 'No tienes permisos para cancelar este partido.', 403);
    }

    if (MATCH.status !== 'SCHEDULED' && MATCH.status !== 'IN_PROGRESS') {
      throw new AppError(
        'PARTIDO_NO_CANCELABLE',
        'No se puede cancelar el partido en su estado actual.',
        409,
      );
    }

    return this._matchCrudRepository.cancelMatchSV(_matchId);
  }
}

