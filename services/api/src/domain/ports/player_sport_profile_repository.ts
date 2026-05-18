export type PlayerSportProfileDTO = {
  id: string;
  sportId: string;
  /// Escala 1.0 a 7.0 (autodeclarada).
  skillLevel: number;
  sidePreference: 'RIGHT' | 'LEFT' | 'ANY';
  categoryId?: string;
  categoryName?: string;
  categorySlug?: string;
};

export type UpsertPlayerSportProfileDTO = {
  sportId: string;
  skillLevel: number;
  sidePreference?: PlayerSportProfileDTO['sidePreference'];
  categoryId?: string;
};

export interface PlayerSportProfileRepository {
  listByUserIdSV(_userId: string): Promise<PlayerSportProfileDTO[]>;
  /// Reemplaza todo el set de perfiles deportivos del usuario en una sola transacción.
  replaceForUserSV(_userId: string, _items: UpsertPlayerSportProfileDTO[]): Promise<PlayerSportProfileDTO[]>;
}
