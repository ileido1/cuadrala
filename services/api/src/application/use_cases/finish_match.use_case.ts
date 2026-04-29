import { AppError } from '../../domain/errors/app_error.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchReadRepository } from '../../domain/ports/match_read_repository.js';
import type { MatchOrganizerRepository } from '../../domain/ports/match_organizer_repository.js';
import type { MatchStatusRepository } from '../../domain/ports/match_status_repository.js';

const REQUIRED_PARTICIPANTS_COUNT = 4;

export class FinishMatchUseCase {
  constructor(
    private readonly _matchReadRepository: MatchReadRepository,
    private readonly _matchOrganizerRepository: MatchOrganizerRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _matchStatusRepository: MatchStatusRepository,
  ) {}

  async executeSV(_matchId: string, _actorUserId: string): Promise<void> {
    const MATCH = await this._matchReadRepository.findByIdSV(_matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    const ORGANIZER_USER_ID = await this._matchOrganizerRepository.getOrganizerUserIdByMatchIdSV(_matchId);
    if (ORGANIZER_USER_ID === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }
    if (ORGANIZER_USER_ID !== _actorUserId) {
      throw new AppError('NO_AUTORIZADO', 'No tienes permisos para finalizar este partido.', 403);
    }

    if (MATCH.status !== 'IN_PROGRESS') {
      throw new AppError('PARTIDO_NO_EN_CURSO', 'El partido no está en curso.', 409);
    }

    const COUNT = await this._matchParticipationRepository.countParticipantsSV(_matchId);
    if (COUNT !== REQUIRED_PARTICIPANTS_COUNT) {
      throw new AppError(
        'PARTICIPANTES_INVALIDOS',
        'No se puede finalizar el partido si no hay 4 participantes.',
        409,
      );
    }

    const UPDATED = await this._matchStatusRepository.transitionStatusIfCurrentSV({
      matchId: _matchId,
      fromStatus: 'IN_PROGRESS',
      toStatus: 'FINISHED',
    });

    if (!UPDATED) {
      throw new AppError('TRANSICION_INVALIDA', 'No se pudo finalizar el partido por su estado actual.', 409);
    }
  }
}

