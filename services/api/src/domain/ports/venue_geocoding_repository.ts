export type VenueGeocodingUpdateDTO = {
  venueId: string;
  placeId: string;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  addressCountry: string | null;
  addressState: string | null;
  addressCity: string | null;
  addressLine1: string | null;
  addressPostalCode: string | null;
  geocodedAt: Date;
};

export type VenueGeocodingDTO = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  formattedAddress: string | null;
  addressCountry: string | null;
  addressState: string | null;
  addressCity: string | null;
  addressLine1: string | null;
  addressPostalCode: string | null;
  geocodedAt: Date | null;
};

export interface VenueGeocodingRepository {
  getByIdSV(_venueId: string): Promise<VenueGeocodingDTO | null>;
  updateGeocodingSV(_dto: VenueGeocodingUpdateDTO): Promise<VenueGeocodingDTO>;
}

