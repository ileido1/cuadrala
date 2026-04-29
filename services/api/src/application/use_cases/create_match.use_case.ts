import { AppError } from '../../domain/errors/app_error.js';
import type { MatchCrudRepository } from '../../domain/ports/match_crud_repository.js';
import type { CreateMatchInputDTO, MatchDetailDTO } from '../../domain/ports/match_crud_repository.js';

export type CreateMatchUseCaseInput = {
  creatorUserId: string;
  sportId: string;
  categoryId: string;
  type?: 'AMERICANO' | 'REGULAR';
  scheduledAt?: Date;
  courtId?: string;
  tournamentId?: string;
  maxParticipants?: number;
  pricePerPlayerCents?: number;
};

export class CreateMatchUseCase {
  constructor(private readonly _matchCrudRepository: MatchCrudRepository) {}

  async executeSV(_input: CreateMatchUseCaseInput): Promise<MatchDetailDTO> {
    const MAX_PARTICIPANTS = _input.maxParticipants ?? 4;
    if (MAX_PARTICIPANTS < 2 || MAX_PARTICIPANTS > 100) {
      throw new AppError('VALIDACION_FALLIDA', 'maxParticipants debe estar entre 2 y 100.', 400);
    }

    const CREATE_INPUT: CreateMatchInputDTO = {
      sportId: _input.sportId,
      categoryId: _input.categoryId,
      type: _input.type ?? 'REGULAR',
      maxParticipants: MAX_PARTICIPANTS,
      ...(_input.pricePerPlayerCents !== undefined ? { pricePerPlayerCents: _input.pricePerPlayerCents } : {}),
      ...(_input.scheduledAt !== undefined ? { scheduledAt: _input.scheduledAt } : {}),
      ...(_input.courtId !== undefined ? { courtId: _input.courtId } : {}),
      ...(_input.tournamentId !== undefined ? { tournamentId: _input.tournamentId } : {}),
    };

    return this._matchCrudRepository.createMatchSV(CREATE_INPUT, _input.creatorUserId);
  }
}

