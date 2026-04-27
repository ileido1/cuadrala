import type { Match, MatchParticipant, Prisma } from '../../generated/prisma/client.js';

import { PRISMA } from '../prisma_client.js';

const MATCH_WITH_PARTICIPANTS = {
  participants: { include: { user: true } },
  category: true,
} satisfies Prisma.MatchInclude;

export async function findMatchByIdRepo(_matchId: string) {
  return PRISMA.match.findUnique({ where: { id: _matchId } });
}

export async function findMatchWithParticipantsRepo(_matchId: string) {
  return PRISMA.match.findUnique({
    where: { id: _matchId },
    include: MATCH_WITH_PARTICIPANTS,
  });
}

export async function createMatchWithParticipantsRepo(_data: {
  categoryId: string;
  sportId: string;
  formatPresetId?: string;
  formatParameters?: Prisma.InputJsonValue;
  courtId?: string;
  tournamentId?: string;
  scheduledAt?: Date;
  participantUserIds: string[];
}): Promise<Match & { participants: MatchParticipant[] }> {
  return PRISMA.$transaction(async (_tx) => {
    const CREATED_MATCH = await _tx.match.create({
      data: {
        categoryId: _data.categoryId,
        sportId: _data.sportId,
        ...(_data.formatPresetId !== undefined ? { formatPresetId: _data.formatPresetId } : {}),
        ...(_data.formatParameters !== undefined
          ? { formatParameters: _data.formatParameters }
          : {}),
        ...(_data.courtId !== undefined ? { courtId: _data.courtId } : {}),
        ...(_data.tournamentId !== undefined ? { tournamentId: _data.tournamentId } : {}),
        ...(_data.scheduledAt !== undefined ? { scheduledAt: _data.scheduledAt } : {}),
        type: 'AMERICANO',
        status: 'SCHEDULED',
      },
    });

    await _tx.matchParticipant.createMany({
      data: _data.participantUserIds.map((_userId, _index) => ({
        matchId: CREATED_MATCH.id,
        userId: _userId,
        teamLabel: _index % 2 === 0 ? 'A' : 'B',
      })),
    });

    const PARTICIPANTS = await _tx.matchParticipant.findMany({
      where: { matchId: CREATED_MATCH.id },
    });

    return { ...CREATED_MATCH, participants: PARTICIPANTS };
  });
}
