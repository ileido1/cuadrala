import { AppError } from '../../domain/errors/app_error.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchQueryRepository } from '../../domain/ports/match_query_repository.js';
import type { VenuePaymentInfoDTO, VenueRepository } from '../../domain/ports/venue_repository.js';

export type MatchPaymentInfoDTO = VenuePaymentInfoDTO;

export class GetMatchPaymentInfoUseCase {
  constructor(
    private readonly _matchQueryRepository: MatchQueryRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _venueRepository: VenueRepository,
  ) {}

  async executeSV(_input: {
    matchId: string;
    userId: string;
  }): Promise<MatchPaymentInfoDTO> {
    const MATCH = await this._matchQueryRepository.getMatchByIdSV(_input.matchId);
    if (MATCH === null) {
      throw new AppError('NO_ENCONTRADO', 'Partido no encontrado.', 404);
    }

    const IS_PARTICIPANT = await this._matchParticipationRepository.userIsParticipantSV(
      _input.matchId,
      _input.userId,
    );
    if (!IS_PARTICIPANT) {
      throw new AppError(
        'NO_AUTORIZADO',
        'Solo los participantes del partido pueden ver la información de pago.',
        403,
      );
    }

    if (MATCH.venueId === null) {
      throw new AppError('SIN_SEDE', 'El partido no tiene una sede asignada.', 404);
    }

    const VENUE = await this._venueRepository.getPaymentInfoSV(MATCH.venueId);
    if (VENUE === null) {
      throw new AppError('NO_ENCONTRADO', 'Sede no encontrada.', 404);
    }

    return VENUE;
  }
}
