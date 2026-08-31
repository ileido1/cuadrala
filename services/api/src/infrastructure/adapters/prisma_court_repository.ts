import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type {
  Court,
  CourtStatus,
  CreateCourtInput,
  UpdateCourtInput,
} from '../../domain/entities/booking/court.entity.js';

import { PRISMA } from '../prisma_client.js';
import { prismaToCourtEntitySV } from './prisma_court_mapper.js';

export class PrismaCourtRepository implements ICourtRepository {
  async findById(_id: string): Promise<Court | null> {
    const MODEL = await PRISMA.court.findUnique({
      where: { id: _id },
      include: { pricingTiers: true },
    });
    return prismaToCourtEntitySV(MODEL);
  }

  async findByVenue(_venueId: string, _status?: CourtStatus): Promise<Court[]> {
    const WHERE: Record<string, unknown> = { venueId: _venueId };
    if (_status !== undefined) {
      WHERE.status = _status;
    } else {
      WHERE.status = { not: 'INACTIVE' };
    }
    const MODELS = await PRISMA.court.findMany({
      where: WHERE,
      orderBy: { name: 'asc' },
      include: { pricingTiers: true },
    });
    return MODELS.map(prismaToCourtEntitySV).filter((_court): _court is Court => _court !== null);
  }

  async create(_data: CreateCourtInput): Promise<Court> {
    const MODEL = await PRISMA.court.create({
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
      //? Sin el include, la respuesta vuelve con pricingTiers vacío y un cliente
      //? que refresque su estado desde acá borra las tarifas de pantalla.
      include: { pricingTiers: true },
    });
    return prismaToCourtEntitySV(MODEL)!;
  }

  async update(_id: string, _data: UpdateCourtInput): Promise<Court> {
    const DATA: Record<string, unknown> = {};
    if (_data.name !== undefined) DATA.name = _data.name;
    if (_data.sportType !== undefined) DATA.sportType = _data.sportType;
    if (_data.indoor !== undefined) DATA.indoor = _data.indoor;
    if (_data.lighting !== undefined) DATA.lighting = _data.lighting;
    if (_data.surfaceType !== undefined) DATA.surfaceType = _data.surfaceType;
    if (_data.pricePerHourCents !== undefined) DATA.pricePerHourCents = _data.pricePerHourCents;
    if (_data.capacity !== undefined) DATA.capacity = _data.capacity;
    if (_data.durationMinutes !== undefined) DATA.durationMinutes = _data.durationMinutes;
    if (_data.status !== undefined) DATA.status = _data.status;

    const MODEL = await PRISMA.court.update({
      where: { id: _id },
      data: DATA,
      include: { pricingTiers: true },
    });
    return prismaToCourtEntitySV(MODEL)!;
  }

  async cancel(_id: string): Promise<Court> {
    const MODEL = await PRISMA.court.update({
      where: { id: _id },
      data: { status: 'INACTIVE' },
      include: { pricingTiers: true },
    });
    return prismaToCourtEntitySV(MODEL)!;
  }
}
