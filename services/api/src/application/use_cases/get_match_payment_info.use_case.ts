import type { PrismaClient } from '../../generated/prisma/client.js';

import { AppError } from '../../domain/errors/app_error.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchQueryRepository } from '../../domain/ports/match_query_repository.js';

export type MatchPaymentInfoDTO = {
  paymentHolder: string | null;
  paymentBank: string | null;
  paymentCvu: string | null;
  paymentAlias: string | null;
  paymentNotes: string | null;
};

export class GetMatchPaymentInfoUseCase {
  constructor(
    private readonly _matchQueryRepository: MatchQueryRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _prisma: PrismaClient,
  ) {}

  async executeSV(_input: {
    matchId: string;
    userId: string;
  }): Promise<MatchPaymentInfoDTO> {
    // Verificar que el partido existe
    const MATCH = await this._matchQueryRepository.getMatchByIdSV(_input.matchId);
    if (MATCH === null) {
      throw new AppError('NO_ENCONTRADO', 'Partido no encontrado.', 404);
    }

    // Verificar que el usuario sea participante
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

    // Verificar que el partido tenga sede
    if (MATCH.venueId === null) {
      throw new AppError('SIN_SEDE', 'El partido no tiene una sede asignada.', 404);
    }

    // Obtener información de pago de la sede
    const VENUE = await this._prisma.venue.findUnique({
      where: { id: MATCH.venueId },
      select: {
        paymentHolder: true,
        paymentBank: true,
        paymentCvu: true,
        paymentAlias: true,
        paymentNotes: true,
      },
    });

    if (VENUE === null) {
      throw new AppError('NO_ENCONTRADO', 'Sede no encontrada.', 404);
    }

    return {
      paymentHolder: VENUE.paymentHolder,
      paymentBank: VENUE.paymentBank,
      paymentCvu: VENUE.paymentCvu,
      paymentAlias: VENUE.paymentAlias,
      paymentNotes: VENUE.paymentNotes,
    };
  }
}
