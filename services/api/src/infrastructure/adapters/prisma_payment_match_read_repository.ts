import type { Prisma } from '../../generated/prisma/client.js';
import type {
  PaymentMatchReadRepository,
  PaymentMatchWithParticipantsDTO,
} from '../../domain/ports/payment_match_read_repository.js';

import { PRISMA } from '../prisma_client.js';

const MATCH_WITH_PARTICIPANTS = {
  participants: { include: { user: true } },
  category: true,
  court: { select: { venueId: true } },
} satisfies Prisma.MatchInclude;

export class PrismaPaymentMatchReadRepository implements PaymentMatchReadRepository {
  async findByIdSV(_matchId: string) {
    const MATCH = await PRISMA.match.findUnique({
      where: { id: _matchId },
      select: {
        id: true,
        reservation: { select: { pricingCurrency: true } },
        court: { select: { venue: { select: { pricingCurrency: true } } } },
      },
    });
    if (MATCH === null) {
      return null;
    }
    const PRICING =
      MATCH.reservation?.pricingCurrency
      ?? MATCH.court?.venue?.pricingCurrency
      ?? 'BS';
    return { id: MATCH.id, pricingCurrency: PRICING };
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
      venueId: MATCH.court?.venueId ?? null,
      participants: MATCH.participants.map((_participant) => ({
        userId: _participant.userId,
      })),
    };
  }
}
