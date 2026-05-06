export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type AvailabilitySlot = 'MORNING' | 'AFTERNOON' | 'EVENING';

export type UserAvailabilityDTO = {
  dayOfWeek: DayOfWeek;
  slot: AvailabilitySlot;
};

export interface UserAvailabilityRepository {
  listByUserIdSV(_userId: string): Promise<UserAvailabilityDTO[]>;
  /// Reemplaza el set completo de disponibilidad del usuario.
  replaceForUserSV(_userId: string, _items: UserAvailabilityDTO[]): Promise<UserAvailabilityDTO[]>;
}
