export type VenueStaffDTO = {
  id: string;
  venueId: string;
  userId: string;
  role: string;
  createdAt: Date;
};

export type UpsertVenueStaffDTO = {
  venueId: string;
  userId: string;
  role?: string;
};

export interface VenueStaffRepository {
  upsertSV(_input: UpsertVenueStaffDTO): Promise<{ created: boolean; staff: VenueStaffDTO }>;

  findByVenueAndUserSV(_venueId: string, _userId: string): Promise<VenueStaffDTO | null>;

  listByVenueIdSV(_venueId: string): Promise<VenueStaffDTO[]>;

  listByUserIdSV(_userId: string): Promise<VenueStaffDTO[]>;

  removeByVenueAndUserSV(_venueId: string, _userId: string): Promise<boolean>;

  /**
   * Verifica si un usuario es staff (OWNER o STAFF) de un venue.
   */
  isUserStaffOfVenueSV(_userId: string, _venueId: string): Promise<boolean>;
}
