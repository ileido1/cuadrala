import { PRISMA } from '../prisma_client.js';
import type { VenuePaymentMethodDTO, VenuePaymentMethodType } from '../../domain/entities/venue_payment_method.entity.js';

function mapVenuePaymentMethod(row: {
  id: string;
  venueId: string;
  type: string;
  name: string;
  config: unknown;
  isActive: boolean;
  position: number;
}): VenuePaymentMethodDTO {
  return {
    id: row.id,
    venueId: row.venueId,
    type: row.type as VenuePaymentMethodType,
    name: row.name,
    config: row.config as VenuePaymentMethodDTO['config'],
    isActive: row.isActive,
    position: row.position,
  };
}

export async function listActiveByVenueSV(_venueId: string): Promise<VenuePaymentMethodDTO[]> {
  const ROWS = await PRISMA.venuePaymentMethod.findMany({
    where: { venueId: _venueId, isActive: true },
    orderBy: { position: 'asc' },
  });
  return ROWS.map(mapVenuePaymentMethod);
}

export async function listByVenueSV(_venueId: string): Promise<VenuePaymentMethodDTO[]> {
  const ROWS = await PRISMA.venuePaymentMethod.findMany({
    where: { venueId: _venueId },
    orderBy: { position: 'asc' },
  });
  return ROWS.map(mapVenuePaymentMethod);
}

export async function findByIdSV(_id: string): Promise<VenuePaymentMethodDTO | null> {
  const ROW = await PRISMA.venuePaymentMethod.findUnique({ where: { id: _id } });
  return ROW ? mapVenuePaymentMethod(ROW) : null;
}

export async function createSV(_data: {
  venueId: string;
  type: VenuePaymentMethodType;
  name: string;
  config: VenuePaymentMethodDTO['config'];
  position: number;
}): Promise<VenuePaymentMethodDTO> {
  const ROW = await PRISMA.venuePaymentMethod.create({
    data: {
      venueId: _data.venueId,
      type: _data.type,
      name: _data.name,
      config: _data.config as object,
      position: _data.position,
      isActive: true,
    },
  });
  return mapVenuePaymentMethod(ROW);
}

export async function updateSV(_id: string, _data: {
  type?: VenuePaymentMethodType;
  name?: string;
  config?: VenuePaymentMethodDTO['config'];
  isActive?: boolean;
  position?: number;
}): Promise<VenuePaymentMethodDTO> {
  const ROW = await PRISMA.venuePaymentMethod.update({
    where: { id: _id },
    data: {
      ...(_data.type !== undefined && { type: _data.type }),
      ...(_data.name !== undefined && { name: _data.name }),
      ...(_data.config !== undefined && { config: _data.config as object }),
      ...(_data.isActive !== undefined && { isActive: _data.isActive }),
      ...(_data.position !== undefined && { position: _data.position }),
    },
  });
  return mapVenuePaymentMethod(ROW);
}

export async function deleteSV(_id: string): Promise<void> {
  await PRISMA.venuePaymentMethod.delete({ where: { id: _id } });
}

export async function getNextPositionSV(_venueId: string): Promise<number> {
  const MAX = await PRISMA.venuePaymentMethod.aggregate({
    where: { venueId: _venueId },
    _max: { position: true },
  });
  return (MAX._max.position ?? -1) + 1;
}
