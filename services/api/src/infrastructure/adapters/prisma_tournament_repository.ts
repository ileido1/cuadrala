import type {
  TournamentCreatedDTO,
  TournamentRepository,
  TournamentVisibility,
} from '../../domain/ports/tournament_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaTournamentRepository implements TournamentRepository {
  async findByIdSV(_id: string): Promise<{
    id: string;
    name: string;
    sportId: string;
    categoryId: string;
    formatPresetId: string;
    presetSchemaVersion: number;
    formatParameters: unknown | null;
    status: string;
    visibility: TournamentVisibility | null;
    startsAt: Date | null;
    organizerUserId: string | null;
    venueId: string | null;
    isCompetitive: boolean;
    inscriptionPrice: number | null;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const ROW = await PRISMA.tournament.findUnique({ where: { id: _id } });
    if (ROW === null) return null;
    return {
      id: ROW.id,
      name: ROW.name,
      sportId: ROW.sportId,
      categoryId: ROW.categoryId,
      formatPresetId: ROW.formatPresetId,
      presetSchemaVersion: ROW.presetSchemaVersion,
      formatParameters: (ROW.formatParameters as unknown) ?? null,
      status: ROW.status,
      visibility: ROW.visibility,
      startsAt: ROW.startsAt,
      organizerUserId: ROW.organizerUserId,
      venueId: ROW.venueId,
      isCompetitive: ROW.isCompetitive,
      inscriptionPrice: ROW.inscriptionPrice === null ? null : ROW.inscriptionPrice.toNumber(),
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
    organizerUserId?: string;
    visibility?: TournamentVisibility;
  }): Promise<TournamentCreatedDTO> {
    const CREATED = await PRISMA.tournament.create({
      data: {
        name: _data.name,
        categoryId: _data.categoryId,
        sportId: _data.sportId,
        formatPresetId: _data.formatPresetId,
        presetSchemaVersion: _data.presetSchemaVersion,
        ...(_data.organizerUserId !== undefined ? { organizerUserId: _data.organizerUserId } : {}),
        ...(_data.visibility !== undefined ? { visibility: _data.visibility } : {}),
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

  async updateStatusSV(_id: string, _status: string) {
    const EXISTS = await PRISMA.tournament.findUnique({
      where: { id: _id },
      select: { id: true },
    });
    if (EXISTS === null) {
      return null;
    }

    return PRISMA.tournament.update({
      where: { id: _id },
      data: { status: _status as never },
      select: { id: true, name: true, status: true },
    });
  }

  async updateVisibilitySV(_id: string, _visibility: TournamentVisibility) {
    const EXISTS = await PRISMA.tournament.findUnique({
      where: { id: _id },
      select: { id: true },
    });
    if (EXISTS === null) {
      return null;
    }

    return PRISMA.tournament.update({
      where: { id: _id },
      data: { visibility: _visibility },
      select: { id: true, name: true, visibility: true },
    });
  }
}

