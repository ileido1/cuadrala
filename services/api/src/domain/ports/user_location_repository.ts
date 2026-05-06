export type UserLocationDTO = {
  label: string | null;
  latitude: number;
  longitude: number;
  radiusKm: number;
};

export type UpsertUserLocationDTO = {
  label?: string | null;
  latitude: number;
  longitude: number;
  radiusKm: number;
};

export interface UserLocationRepository {
  findByUserIdSV(_userId: string): Promise<UserLocationDTO | null>;
  upsertByUserIdSV(_userId: string, _patch: UpsertUserLocationDTO): Promise<UserLocationDTO>;
}
