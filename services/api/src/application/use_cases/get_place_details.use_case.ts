import type { GeocodingPlaceDetailsDTO, GeocodingProvider } from '../../domain/ports/geocoding_provider.js';

export class GetPlaceDetailsUseCase {
  public constructor(private readonly _geocodingProvider: GeocodingProvider) {}

  async executeSV(_placeId: string): Promise<GeocodingPlaceDetailsDTO> {
    return this._geocodingProvider.getPlaceDetailsSV(_placeId);
  }
}

