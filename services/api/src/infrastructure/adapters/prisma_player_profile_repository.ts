import type {
  PlayerProfileDTO,
  PlayerProfileRepository,
  UpsertPlayerProfileDTO,
} from '../../domain/ports/player_profile_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaPlayerProfileRepository implements PlayerProfileRepository {
  async findByUserIdSV(_userId: string): Promise<PlayerProfileDTO | null> {
    const ROW = await PRISMA.playerProfile.findUnique({
      where: { userId: _userId },
      select: {
        userId: true,
        dominantHand: true,
        sidePreference: true,
        birthYear: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return ROW;
  }

  async upsertByUserIdSV(_userId: string, _patch: UpsertPlayerProfileDTO): Promise<PlayerProfileDTO> {
    const NOW = new Date();
    return PRISMA.playerProfile.upsert({
      where: { userId: _userId },
      create: {
        userId: _userId,
        dominantHand: _patch.dominantHand ?? 'RIGHT',
        sidePreference: _patch.sidePreference ?? 'ANY',
        birthYear: _patch.birthYear ?? null,
        updatedAt: NOW,
      },
      update: {
        ...(_patch.dominantHand !== undefined ? { dominantHand: _patch.dominantHand } : {}),
        ...(_patch.sidePreference !== undefined ? { sidePreference: _patch.sidePreference } : {}),
        ...(_patch.birthYear !== undefined ? { birthYear: _patch.birthYear } : {}),
        updatedAt: NOW,
      },
      select: {
        userId: true,
        dominantHand: true,
        sidePreference: true,
        birthYear: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

