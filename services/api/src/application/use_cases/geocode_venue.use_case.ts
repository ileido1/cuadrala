import { AppError } from '../../domain/errors/app_error.js';
import type { GeocodingProvider } from '../../domain/ports/geocoding_provider.js';
import type { VenueGeocodingDTO, VenueGeocodingRepository } from '../../domain/ports/venue_geocoding_repository.js';

export class GeocodeVenueUseCase {
  public constructor(
    private readonly _venueGeocodingRepository: VenueGeocodingRepository,
    private readonly _geocodingProvider: GeocodingProvider,
  ) {}

  async executeSV(_dto: { venueId: string; placeId: string }): Promise<VenueGeocodingDTO> {
    const VENUE = await this._venueGeocodingRepository.getByIdSV(_dto.venueId);
    if (VENUE === null) {
      throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
    }

    const DETAILS = await this._geocodingProvider.getPlaceDetailsSV(_dto.placeId);
    const NOW = new Date();

    return this._venueGeocodingRepository.updateGeocodingSV({
      venueId: VENUE.id,
      placeId: DETAILS.placeId,
      formattedAddress: DETAILS.formattedAddress,
      latitude: DETAILS.lat,
      longitude: DETAILS.lng,
      addressCountry: DETAILS.addressCountry,
      addressState: DETAILS.addressState,
      addressCity: DETAILS.addressCity,
      addressLine1: DETAILS.addressLine1,
      addressPostalCode: DETAILS.addressPostalCode,
      geocodedAt: NOW,
    });
  }
}

