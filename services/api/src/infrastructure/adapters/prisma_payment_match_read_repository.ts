import type { Prisma } from '../../generated/prisma/client.js';
import type {
  PaymentMatchReadRepository,
  PaymentMatchWithParticipantsDTO,
} from '../../domain/ports/payment_match_read_repository.js';

import { PRISMA } from '../prisma_client.js';

const MATCH_WITH_PARTICIPANTS = {
  participants: { include: { user: true } },
  category: true,
} satisfies Prisma.MatchInclude;

export class PrismaPaymentMatchReadRepository implements PaymentMatchReadRepository {
  async findByIdSV(_matchId: string): Promise<{ id: string } | null> {
    const MATCH = await PRISMA.match.findUnique({ where: { id: _matchId } });
    return MATCH === null ? null : { id: MATCH.id };
  }

  async findWithParticipantsSV(
    _matchId: string,
  ): Promise<PaymentMatchWithParticipantsDTO | null> {
    const MATCH = await PRISMA.match.findUnique({
      where: { id: _matchId },
      include: MATCH_WITH_PARTICIPANTS,
    });
    if (MATCH === null) {
      return null;
    }
    return {
      id: MATCH.id,
      participants: MATCH.participants.map((_participant) => ({
        userId: _participant.userId,
      })),
    };
  }
}
