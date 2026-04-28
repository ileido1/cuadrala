import { AppError } from '../../domain/errors/app_error.js';
import type { MatchCrudRepository } from '../../domain/ports/match_crud_repository.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchQueryRepository } from '../../domain/ports/match_query_repository.js';
import type { MatchDetailDTO } from '../../domain/ports/match_crud_repository.js';

export class CancelMatchUseCase {
  constructor(
    private readonly _matchQueryRepository: MatchQueryRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _matchCrudRepository: MatchCrudRepository,
  ) {}

  async executeSV(_matchId: string, _actorUserId: string): Promise<MatchDetailDTO> {
    const MATCH = await this._matchQueryRepository.getMatchByIdSV(_matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    const IS_PARTICIPANT = await this._matchParticipationRepository.userIsParticipantSV(
      _matchId,
      _actorUserId,
    );
    if (!IS_PARTICIPANT) {
      throw new AppError('NO_AUTORIZADO', 'No tienes permisos para cancelar este partido.', 403);
    }

    if (MATCH.status !== 'SCHEDULED') {
      throw new AppError(
        'PARTIDO_NO_CANCELABLE',
        'No se puede cancelar el partido en su estado actual.',
        409,
      );
    }

    return this._matchCrudRepository.cancelMatchSV(_matchId);
  }
}

