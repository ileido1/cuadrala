import type { GeocodingPlaceCandidateDTO, GeocodingProvider } from '../../domain/ports/geocoding_provider.js';

export class SearchPlacesUseCase {
  public constructor(private readonly _geocodingProvider: GeocodingProvider) {}

  async executeSV(_dto: {
    query: string;
    nearLat?: number;
    nearLng?: number;
    limit?: number;
  }): Promise<GeocodingPlaceCandidateDTO[]> {
    return this._geocodingProvider.searchPlacesSV(_dto);
  }
}

