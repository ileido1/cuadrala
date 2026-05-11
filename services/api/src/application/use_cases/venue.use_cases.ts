/**
 * Use Case para actualizar settings de una sede.
 *
 * PATCH /api/v1/venues/:venueId
 */

import { AppError } from '../../domain/errors/app_error.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

export interface UpdateVenueInputDTO {
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  openingHours?: Record<string, { open: string; close: string }> | null;
}

export interface VenueOutputDTO {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  openingHours: unknown | null;
  address: string | null;
}

export class UpdateVenueUseCase {
  async executeSV(_venueId: string, _input: UpdateVenueInputDTO): Promise<VenueOutputDTO> {
    // Verificar que la sede existe
    const venue = await PRISMA.venue.findUnique({
      where: { id: _venueId },
      select: { id: true, name: true },
    });

    if (venue === null) {
      throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
    }

    const updated = await PRISMA.venue.update({
      where: { id: _venueId },
      data: {
        ...(_input.phone !== undefined ? { phone: _input.phone } : {}),
        ...(_input.email !== undefined ? { email: _input.email } : {}),
        ...(_input.description !== undefined ? { description: _input.description } : {}),
        ...(_input.openingHours !== undefined ? { openingHours: _input.openingHours as object } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        description: true,
        openingHours: true,
        address: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      description: updated.description,
      openingHours: updated.openingHours as VenueOutputDTO['openingHours'],
      address: updated.address,
    };
  }
}
