import type {
  AmericanoMatchWriteRepository,
  CreateAmericanoMatchInput,
} from '../../domain/ports/americano_match_write_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaAmericanoMatchWriteRepository implements AmericanoMatchWriteRepository {
  async createAmericanoMatchSV(_data: CreateAmericanoMatchInput) {
    const ORGANIZER_USER_ID = _data.participantUserIds[0];
    if (ORGANIZER_USER_ID === undefined) {
      throw new Error('participantUserIds requerido');
    }

    const CREATED = await PRISMA.$transaction(async (_tx) => {
      const CREATED_MATCH = await _tx.match.create({
        data: {
          categoryId: _data.categoryId,
          sportId: _data.sportId,
          organizerUserId: ORGANIZER_USER_ID,
          formatPresetId: _data.formatPresetId,
          ...(_data.formatParameters !== undefined
            ? { formatParameters: _data.formatParameters as never }
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

    return {
      id: CREATED.id,
      status: CREATED.status,
      type: CREATED.type,
      sportId: CREATED.sportId,
      formatPresetId: CREATED.formatPresetId,
      participantCount: CREATED.participants.length,
    };
  }
}
