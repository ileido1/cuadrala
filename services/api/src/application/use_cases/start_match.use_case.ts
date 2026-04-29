import { AppError } from '../../domain/errors/app_error.js';
import type { MatchReadRepository } from '../../domain/ports/match_read_repository.js';
import type { MatchOrganizerRepository } from '../../domain/ports/match_organizer_repository.js';
import type { MatchStatusRepository } from '../../domain/ports/match_status_repository.js';

export class StartMatchUseCase {
  constructor(
    private readonly _matchReadRepository: MatchReadRepository,
    private readonly _matchOrganizerRepository: MatchOrganizerRepository,
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
      throw new AppError('NO_AUTORIZADO', 'No tienes permisos para iniciar este partido.', 403);
    }

    if (MATCH.status !== 'SCHEDULED') {
      throw new AppError('PARTIDO_NO_PROGRAMADO', 'El partido no está en estado programado.', 409);
    }

    const UPDATED = await this._matchStatusRepository.transitionStatusIfCurrentSV({
      matchId: _matchId,
      fromStatus: 'SCHEDULED',
      toStatus: 'IN_PROGRESS',
    });

    if (!UPDATED) {
      throw new AppError('TRANSICION_INVALIDA', 'No se pudo iniciar el partido por su estado actual.', 409);
    }
  }
}

