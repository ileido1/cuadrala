export type UserGeoDTO = {
  userId: string;
  nearLat: number | null;
  nearLng: number | null;
};

export interface UserGeoReadRepository {
  /**
   * Devuelve una "mejor aproximación" de geo por usuario.
   * Si no existe geo para el usuario, el consumidor debe tratarlo como "sin filtro geo".
   */
  getByUserIdsSV(_userIds: string[]): Promise<UserGeoDTO[]>;
}

