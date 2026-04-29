import { AppError } from '../../domain/errors/app_error.js';
import type { MatchCrudRepository } from '../../domain/ports/match_crud_repository.js';
import type { MatchOrganizerRepository } from '../../domain/ports/match_organizer_repository.js';
import type { MatchQueryRepository } from '../../domain/ports/match_query_repository.js';
import type { MatchDetailDTO, UpdateMatchPatchDTO } from '../../domain/ports/match_crud_repository.js';

export type UpdateMatchUseCaseInput = {
  matchId: string;
  actorUserId: string;
  scheduledAt?: Date | null;
  courtId?: string | null;
  pricePerPlayerCents?: number;
  maxParticipants?: number;
};

export class UpdateMatchUseCase {
  constructor(
    private readonly _matchQueryRepository: MatchQueryRepository,
    private readonly _matchOrganizerRepository: MatchOrganizerRepository,
    private readonly _matchCrudRepository: MatchCrudRepository,
  ) {}

  async executeSV(_input: UpdateMatchUseCaseInput): Promise<MatchDetailDTO> {
    const MATCH = await this._matchQueryRepository.getMatchByIdSV(_input.matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    const ORGANIZER_USER_ID = await this._matchOrganizerRepository.getOrganizerUserIdByMatchIdSV(_input.matchId);
    if (ORGANIZER_USER_ID === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }
    if (ORGANIZER_USER_ID !== _input.actorUserId) {
      throw new AppError('NO_AUTORIZADO', 'No tienes permisos para editar este partido.', 403);
    }

    if (MATCH.status !== 'SCHEDULED') {
      throw new AppError(
        'PARTIDO_NO_EDITABLE',
        'No se puede actualizar el partido en su estado actual.',
        409,
      );
    }

    const PATCH: UpdateMatchPatchDTO = {
      ...(_input.scheduledAt !== undefined ? { scheduledAt: _input.scheduledAt } : {}),
      ...(_input.courtId !== undefined ? { courtId: _input.courtId } : {}),
      ...(_input.pricePerPlayerCents !== undefined ? { pricePerPlayerCents: _input.pricePerPlayerCents } : {}),
      ...(_input.maxParticipants !== undefined ? { maxParticipants: _input.maxParticipants } : {}),
    };

    if (Object.keys(PATCH).length === 0) {
      throw new AppError('VALIDACION_FALLIDA', 'No hay campos para actualizar.', 400);
    }

    if (_input.maxParticipants !== undefined) {
      if (_input.maxParticipants < 2 || _input.maxParticipants > 100) {
        throw new AppError('VALIDACION_FALLIDA', 'maxParticipants debe estar entre 2 y 100.', 400);
      }
      if (_input.maxParticipants < MATCH.participantCount) {
        throw new AppError(
          'CUPO_INVALIDO',
          'No se puede reducir el cupo por debajo de los participantes actuales.',
          409,
        );
      }
    }

    if (_input.pricePerPlayerCents !== undefined) {
      if (_input.pricePerPlayerCents < 0 || _input.pricePerPlayerCents > 1_000_000_00) {
        throw new AppError(
          'VALIDACION_FALLIDA',
          'pricePerPlayerCents debe estar entre 0 y 100000000.',
          400,
        );
      }
    }

    return this._matchCrudRepository.updateMatchSV(_input.matchId, PATCH);
  }
}

