import { AppError } from '../../domain/errors/app_error.js';
import type { GeocodingProvider, GeocodingPlaceDetailsDTO } from '../../domain/ports/geocoding_provider.js';

export class NoopGeocodingProvider implements GeocodingProvider {
  async searchPlacesSV(): Promise<never> {
    throw new AppError(
      'NO_IMPLEMENTADO',
      'Proveedor de mapas no configurado. Configure MAPS_PROVIDER y su API key.',
      501,
    );
  }

  async getPlaceDetailsSV(): Promise<GeocodingPlaceDetailsDTO> {
    throw new AppError(
      'NO_IMPLEMENTADO',
      'Proveedor de mapas no configurado. Configure MAPS_PROVIDER y su API key.',
      501,
    );
  }
}

