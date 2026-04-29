import type {
  VenueGeocodingDTO,
  VenueGeocodingRepository,
  VenueGeocodingUpdateDTO,
} from '../../domain/ports/venue_geocoding_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaVenueGeocodingRepository implements VenueGeocodingRepository {
  async getByIdSV(_venueId: string): Promise<VenueGeocodingDTO | null> {
    const ROW = await PRISMA.venue.findUnique({
      where: { id: _venueId },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        placeId: true,
        formattedAddress: true,
        addressCountry: true,
        addressState: true,
        addressCity: true,
        addressLine1: true,
        addressPostalCode: true,
        geocodedAt: true,
      },
    });
    return ROW;
  }

  async updateGeocodingSV(_dto: VenueGeocodingUpdateDTO): Promise<VenueGeocodingDTO> {
    const ROW = await PRISMA.venue.update({
      where: { id: _dto.venueId },
      data: {
        placeId: _dto.placeId,
        formattedAddress: _dto.formattedAddress,
        latitude: _dto.latitude,
        longitude: _dto.longitude,
        addressCountry: _dto.addressCountry,
        addressState: _dto.addressState,
        addressCity: _dto.addressCity,
        addressLine1: _dto.addressLine1,
        addressPostalCode: _dto.addressPostalCode,
        geocodedAt: _dto.geocodedAt,
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        placeId: true,
        formattedAddress: true,
        addressCountry: true,
        addressState: true,
        addressCity: true,
        addressLine1: true,
        addressPostalCode: true,
        geocodedAt: true,
      },
    });
    return ROW;
  }
}

