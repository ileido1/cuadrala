import type {
  PlayerProfileDTO,
  PlayerProfileRepository,
  UpsertPlayerProfileDTO,
} from '../../domain/ports/player_profile_repository.js';

import { PRISMA } from '../prisma_client.js';

const SELECT = {
  userId: true,
  dominantHand: true,
  sidePreference: true,
  birthYear: true,
  birthDate: true,
  phone: true,
  documentNumber: true,
  avatarUrl: true,
  city: true,
  onboardingCompletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class PrismaPlayerProfileRepository implements PlayerProfileRepository {
  async findByUserIdSV(_userId: string): Promise<PlayerProfileDTO | null> {
    return PRISMA.playerProfile.findUnique({ where: { userId: _userId }, select: SELECT });
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
        birthDate: _patch.birthDate ?? null,
        phone: _patch.phone ?? null,
        documentNumber: _patch.documentNumber ?? null,
        avatarUrl: _patch.avatarUrl ?? null,
        city: _patch.city ?? null,
        onboardingCompletedAt: _patch.onboardingCompletedAt ?? null,
        updatedAt: NOW,
      },
      update: {
        ...(_patch.dominantHand !== undefined ? { dominantHand: _patch.dominantHand } : {}),
        ...(_patch.sidePreference !== undefined ? { sidePreference: _patch.sidePreference } : {}),
        ...(_patch.birthYear !== undefined ? { birthYear: _patch.birthYear } : {}),
        ...(_patch.birthDate !== undefined ? { birthDate: _patch.birthDate } : {}),
        ...(_patch.phone !== undefined ? { phone: _patch.phone } : {}),
        ...(_patch.documentNumber !== undefined ? { documentNumber: _patch.documentNumber } : {}),
        ...(_patch.avatarUrl !== undefined ? { avatarUrl: _patch.avatarUrl } : {}),
        ...(_patch.city !== undefined ? { city: _patch.city } : {}),
        ...(_patch.onboardingCompletedAt !== undefined
          ? { onboardingCompletedAt: _patch.onboardingCompletedAt }
          : {}),
        updatedAt: NOW,
      },
      select: SELECT,
    });
  }
}
