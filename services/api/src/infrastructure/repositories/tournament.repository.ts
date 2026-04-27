import type { Prisma, Tournament } from '../../generated/prisma/client.js';

import { PRISMA } from '../prisma_client.js';

export async function findTournamentByIdRepo(_id: string): Promise<Tournament | null> {
  return PRISMA.tournament.findUnique({ where: { id: _id } });
}

export async function createTournamentRepo(_data: {
  name: string;
  categoryId: string;
  sportId: string;
  formatPresetId: string;
  formatParameters?: Prisma.InputJsonValue;
  presetSchemaVersion: number;
  startsAt?: Date;
}) {
  return PRISMA.tournament.create({
    data: {
      name: _data.name,
      categoryId: _data.categoryId,
      sportId: _data.sportId,
      formatPresetId: _data.formatPresetId,
      presetSchemaVersion: _data.presetSchemaVersion,
      ...(_data.formatParameters !== undefined
        ? { formatParameters: _data.formatParameters }
        : {}),
      ...(_data.startsAt !== undefined ? { startsAt: _data.startsAt } : {}),
    },
  });
}

