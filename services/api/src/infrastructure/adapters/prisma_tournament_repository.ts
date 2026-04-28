import type {
  TournamentCreatedDTO,
  TournamentRepository,
} from '../../domain/ports/tournament_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaTournamentRepository implements TournamentRepository {
  async findByIdSV(_id: string): Promise<{
    id: string;
    sportId: string;
    categoryId: string;
    formatPresetId: string;
    presetSchemaVersion: number;
    formatParameters: unknown | null;
    status: string;
    startsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const ROW = await PRISMA.tournament.findUnique({ where: { id: _id } });
    if (ROW === null) return null;
    return {
      id: ROW.id,
      sportId: ROW.sportId,
      categoryId: ROW.categoryId,
      formatPresetId: ROW.formatPresetId,
      presetSchemaVersion: ROW.presetSchemaVersion,
      formatParameters: (ROW.formatParameters as unknown) ?? null,
      status: ROW.status,
      startsAt: ROW.startsAt,
      createdAt: ROW.createdAt,
      updatedAt: ROW.updatedAt,
    };
  }

  async createTournamentSV(_data: {
    name: string;
    categoryId: string;
    sportId: string;
    formatPresetId: string;
    formatParameters?: unknown;
    presetSchemaVersion: number;
    startsAt?: Date;
  }): Promise<TournamentCreatedDTO> {
    const CREATED = await PRISMA.tournament.create({
      data: {
        name: _data.name,
        categoryId: _data.categoryId,
        sportId: _data.sportId,
        formatPresetId: _data.formatPresetId,
        presetSchemaVersion: _data.presetSchemaVersion,
        ...(_data.formatParameters !== undefined ? { formatParameters: _data.formatParameters as never } : {}),
        ...(_data.startsAt !== undefined ? { startsAt: _data.startsAt } : {}),
      },
    });

    return {
      id: CREATED.id,
      sportId: CREATED.sportId,
      formatPresetId: CREATED.formatPresetId,
      presetSchemaVersion: CREATED.presetSchemaVersion,
      status: CREATED.status,
    };
  }
}

