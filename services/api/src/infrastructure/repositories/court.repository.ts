/**
 * Implementación de ICourtRepository usando Prisma.
 *
 * US-W1-05 — CRUD Courts — PR2
 */

import type { Court as CourtModel } from '../../generated/prisma/client.js';

import { PRISMA } from '../prisma_client.js';
import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type { CreateCourtInput, UpdateCourtInput } from '../../domain/entities/court.entity.js';
import type { Court } from '../../domain/entities/court.entity.js';
import { prismaToCourtEntity } from './prisma_court_mapper.js';

/**
 * Repository para operaciones CRUD de Court.
 * Implementa ICourtRepository y vive en la capa de infraestructura.
 */
export class CourtRepository implements ICourtRepository {
  async findById(_id: string): Promise<Court | null> {
    const model = await PRISMA.court.findUnique({ where: { id: _id } });
    return prismaToCourtEntity(model);
  }

  async findByVenue(_venueId: string, _status?: import('../../domain/entities/court.entity.js').CourtStatus): Promise<Court[]> {
    const where: Record<string, unknown> = { venueId: _venueId };
    if (_status !== undefined) {
      // Convertir CourtStatus de dominio a string Prisma
      where.status = _status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }
    const models = await PRISMA.court.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { pricingTiers: true },
    });
    return models.map(prismaToCourtEntity).filter((c): c is Court => c !== null);
  }

  async create(_data: CreateCourtInput): Promise<Court> {
    const model = await PRISMA.court.create({
      data: {
        venueId: _data.venueId,
        name: _data.name,
        sportType: _data.sportType ?? 'PADEL',
        indoor: _data.indoor ?? false,
        lighting: _data.lighting ?? false,
        surfaceType: _data.surfaceType ?? null,
        status: 'ACTIVE',
        pricePerHourCents: _data.pricePerHourCents ?? null,
        capacity: _data.capacity ?? null,
        durationMinutes: _data.durationMinutes ?? 60,
      },
    });
    return prismaToCourtEntity(model)!;
  }

  async update(_id: string, _data: UpdateCourtInput): Promise<Court> {
    const data: Record<string, unknown> = {};
    if (_data.name !== undefined) data.name = _data.name;
    if (_data.sportType !== undefined) data.sportType = _data.sportType;
    if (_data.indoor !== undefined) data.indoor = _data.indoor;
    if (_data.lighting !== undefined) data.lighting = _data.lighting;
    if (_data.surfaceType !== undefined) data.surfaceType = _data.surfaceType;
    if (_data.pricePerHourCents !== undefined) data.pricePerHourCents = _data.pricePerHourCents;
    if (_data.capacity !== undefined) data.capacity = _data.capacity;
    if (_data.durationMinutes !== undefined) data.durationMinutes = _data.durationMinutes;

    const model = await PRISMA.court.update({
      where: { id: _id },
      data,
    });
    return prismaToCourtEntity(model)!;
  }

  async cancel(_id: string): Promise<Court> {
    // Idempotente: soft-delete, establece status = INACTIVE
    const model = await PRISMA.court.update({
      where: { id: _id },
      data: { status: 'INACTIVE' },
    });
    return prismaToCourtEntity(model)!;
  }
}

// ---------------------------------------------------------------------------
// Funciones legacy (para backward-compat con código que ya usa findCourtByIdRepo)
// ---------------------------------------------------------------------------

/** Wrapper legacy — busca una cancha por id. */
export async function findCourtByIdRepo(_id: string): Promise<CourtModel | null> {
  return PRISMA.court.findUnique({ where: { id: _id } });
}
