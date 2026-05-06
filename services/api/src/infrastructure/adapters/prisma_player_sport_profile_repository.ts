import type {
  PlayerSportProfileDTO,
  PlayerSportProfileRepository,
  UpsertPlayerSportProfileDTO,
} from '../../domain/ports/player_sport_profile_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaPlayerSportProfileRepository implements PlayerSportProfileRepository {
  async listByUserIdSV(_userId: string): Promise<PlayerSportProfileDTO[]> {
    const ROWS = await PRISMA.playerSportProfile.findMany({
      where: { playerProfile: { userId: _userId } },
      select: { id: true, sportId: true, skillLevel: true, sidePreference: true },
    });
    return ROWS.map((_r) => ({
      id: _r.id,
      sportId: _r.sportId,
      skillLevel: Number(_r.skillLevel),
      sidePreference: _r.sidePreference,
    }));
  }

  async replaceForUserSV(
    _userId: string,
    _items: UpsertPlayerSportProfileDTO[],
  ): Promise<PlayerSportProfileDTO[]> {
    return PRISMA.$transaction(async (_tx) => {
      // Asegura PlayerProfile existente
      const PROFILE = await _tx.playerProfile.upsert({
        where: { userId: _userId },
        create: { userId: _userId, updatedAt: new Date() },
        update: {},
        select: { id: true },
      });

      await _tx.playerSportProfile.deleteMany({ where: { playerProfileId: PROFILE.id } });

      if (_items.length > 0) {
        await _tx.playerSportProfile.createMany({
          data: _items.map((_i) => ({
            playerProfileId: PROFILE.id,
            sportId: _i.sportId,
            skillLevel: _i.skillLevel,
            sidePreference: _i.sidePreference ?? 'ANY',
            updatedAt: new Date(),
          })),
        });
      }

      const ROWS = await _tx.playerSportProfile.findMany({
        where: { playerProfileId: PROFILE.id },
        select: { id: true, sportId: true, skillLevel: true, sidePreference: true },
      });
      return ROWS.map((_r) => ({
        id: _r.id,
        sportId: _r.sportId,
        skillLevel: Number(_r.skillLevel),
        sidePreference: _r.sidePreference,
      }));
    });
  }
}
