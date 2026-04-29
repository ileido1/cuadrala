import type {
  CreateSystemMatchInputDTO,
  SystemMatchDTO,
  SystemMatchRepository,
} from '../../domain/ports/system_match_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaSystemMatchRepository implements SystemMatchRepository {
  async createScheduledMatchSV(_input: CreateSystemMatchInputDTO): Promise<SystemMatchDTO> {
    const ROW = await PRISMA.match.create({
      data: {
        sportId: _input.sportId,
        categoryId: _input.categoryId,
        organizerUserId: _input.organizerUserId,
        type: _input.type,
        status: 'SCHEDULED',
        scheduledAt: _input.scheduledAt ?? null,
        courtId: _input.courtId ?? null,
        tournamentId: _input.tournamentId ?? null,
        pricePerPlayerCents: _input.pricePerPlayerCents ?? 0,
        maxParticipants: _input.maxParticipants,
      },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
      },
    });

    return ROW;
  }
}

