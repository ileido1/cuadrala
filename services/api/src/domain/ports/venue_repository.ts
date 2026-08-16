export type VenuePaymentInfoDTO = {
  paymentHolder: string | null;
  paymentBank: string | null;
  paymentCvu: string | null;
  paymentAlias: string | null;
  paymentNotes: string | null;
};

export type UpdateVenueDataDTO = {
  name?: string | null | undefined;
  address?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  description?: string | null | undefined;
  openingHours?: Record<string, { open: string; close: string }> | null | undefined;
  pricingCurrency?: string | null | undefined;
  displayCurrency?: string | null | undefined;
};

export type VenueSettingsDTO = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  openingHours: unknown | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  pricingCurrency: string;
  displayCurrency: string;
};

export type VenueListItemDTO = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  displayCurrency: string;
  pricingCurrency: string;
  createdAt: Date;
  distanceKm?: number | null;
  imageUrl?: string | null;
  averageRating?: number | null;
  /** Horario de atención por día; `null` si la sede no lo configuró. */
  openingHours: Record<string, { open: string; close: string }> | null;
  /** Deportes ofrecidos (deduplicados desde las canchas activas). */
  sports: string[];
};

export type VenueDetailDTO = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  /** Horarios por día (días cerrados ausentes del objeto). */
  openingHours: Record<string, { open: string; close: string }> | null;
  openingTime: string;
  closingTime: string;
  activeDays: string[];
  courtsCount: number;
  latitude: number | null;
  longitude: number | null;
  paymentHolder: string | null;
  paymentBank: string | null;
  paymentCvu: string | null;
  paymentAlias: string | null;
  paymentNotes: string | null;
  /** IANA timezone de la sede (p. ej. America/Caracas). */
  timezone: string;
  displayCurrency: string;
  pricingCurrency: string;
  countryCode: string;
  imageUrl?: string | null;
  averageRating?: number | null;
  sports: string[];
};

export type VenuePaymentInfoWithNameDTO = VenuePaymentInfoDTO & {
  id: string;
  name: string;
};

export type CreateVenueInputDTO = {
  name: string;
  address?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  paymentHolder?: string | null | undefined;
  paymentBank?: string | null | undefined;
  paymentCvu?: string | null | undefined;
  paymentAlias?: string | null | undefined;
  paymentNotes?: string | null | undefined;
  ownerUserId?: string | null | undefined;
};

export type PageDTO = {
  page: number;
  limit: number;
};

export interface VenueRepository {
  findByIdSV(_venueId: string): Promise<{ id: string; name: string } | null>;
  getOpeningHoursSV(
    _venueId: string,
  ): Promise<Record<string, { open: string; close: string }> | null>;
  updateSV(_venueId: string, _data: UpdateVenueDataDTO): Promise<VenueSettingsDTO>;
  getPaymentInfoSV(_venueId: string): Promise<VenuePaymentInfoDTO | null>;
  listVenuesSV(
    _page: PageDTO & { sportType?: string },
  ): Promise<{ items: VenueListItemDTO[]; total: number }>;
  listVenuesNearSV(
    _input: PageDTO & { lat: number; lng: number; radiusKm: number; sportType?: string },
  ): Promise<{ items: VenueListItemDTO[]; total: number }>;
  listVenuesForUserSV(_userId: string): Promise<VenueListItemDTO[]>;
  createVenueSV(_input: CreateVenueInputDTO): Promise<VenueListItemDTO>;
  getVenueDetailSV(_venueId: string): Promise<VenueDetailDTO | null>;
  getPaymentInfoWithNameSV(_venueId: string): Promise<VenuePaymentInfoWithNameDTO | null>;
}
